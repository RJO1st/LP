import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { markSitting } from '@/lib/markingEngine'

/**
 * POST /api/exam-sittings/[sittingId]/mark
 *
 * Mark a completed exam sitting using the marking engine (3-tier architecture).
 *
 * Authentication: Required. Scholar can only mark their own sittings.
 * Prerequisite: sitting.is_complete must be true
 *
 * Query params: None
 * Body: Empty (POST only)
 *
 * Returns:
 *   - total_score: Integer marks awarded
 *   - max_possible: Integer marks possible
 *   - percentage: Float 0-100
 *   - results_count: Number of questions marked
 *   - marked_at: ISO timestamp
 *   - errors: Array of error messages (if any)
 *   - warnings: Array of warnings (e.g., low confidence AI markings)
 *
 * Errors:
 *   - 401: Unauthorized (not authenticated)
 *   - 403: Forbidden (sitting belongs to different scholar)
 *   - 404: Sitting not found or not complete
 *   - 500: Marking engine failure (may partially mark)
 *
 * Note: Marking can take 30-60s if AI marking is required.
 * Some questions may fail to mark if AI tier is unreachable.
 * Check errors array and consider human review for low-confidence markings.
 */
export async function POST(req, { params }) {
  const startTime = Date.now()
  const TIMEOUT_WARNING_MS = 30000 // 30 seconds

  try {
    const { sittingId } = await params

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll: () => cookieStore.getAll()
        }
      }
    )

    // Verify authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch the sitting
    const { data: sitting, error: sittingError } = await supabase
      .from('exam_sittings')
      .select('id, scholar_id, exam_paper_id, status, total_score, total_marks_available, percentage')
      .eq('id', sittingId)
      .maybeSingle()

    if (sittingError) {
      console.error(`Error fetching sitting ${sittingId}:`, sittingError)
      return NextResponse.json({ error: 'Failed to fetch sitting' }, { status: 500 })
    }

    if (!sitting) {
      return NextResponse.json({ error: 'Sitting not found' }, { status: 404 })
    }

    // Verify scholar belongs to this parent (auth user = parent)
    const { data: scholar, error: scholarError } = await supabase
      .from('scholars')
      .select('id')
      .eq('id', sitting.scholar_id)
      .eq('parent_id', user.id)
      .maybeSingle()

    if (scholarError || !scholar) {
      return NextResponse.json(
        { error: 'Forbidden: sitting belongs to another scholar' },
        { status: 403 }
      )
    }

    // Verify sitting is complete
    if (sitting.status !== 'completed') {
      return NextResponse.json(
        { error: 'Sitting is not complete' },
        { status: 400 }
      )
    }

    // Check if already marked (idempotent safety — if total_score is set, it was already marked)
    if (sitting.total_score !== null) {
      return NextResponse.json({
        message: 'Sitting already marked',
        total_score: sitting.total_score,
        max_possible: sitting.total_marks_available,
        percentage: sitting.percentage,
        results_count: 0
      })
    }

    // Call marking engine
    const markingResult = await markSitting(sittingId, {
      supabase,
      openaiApiKey: process.env.OPENAI_API_KEY
    })

    const elapsedMs = Date.now() - startTime

    // Build response
    const response = {
      total_score: markingResult.total_score,
      max_possible: markingResult.max_possible,
      percentage: markingResult.percentage,
      results_count: markingResult.results.length,
      marked_at: markingResult.marked_at,
      elapsed_ms: elapsedMs
    }

    // Include errors if any
    if (markingResult.errors.length > 0) {
      response.errors = markingResult.errors
    }

    // Build warnings array (low confidence AI markings)
    const lowConfidenceResults = markingResult.results.filter(
      r => r.ai_confidence && r.ai_confidence < 0.7 && r.marking_tier === 'ai_marking'
    )
    if (lowConfidenceResults.length > 0) {
      response.warnings = [
        `${lowConfidenceResults.length} questions marked by AI with confidence < 0.7. Please review.`
      ]
    }

    // Add timeout warning if marking took a long time
    if (elapsedMs > TIMEOUT_WARNING_MS) {
      if (!response.warnings) response.warnings = []
      response.warnings.push(
        `Marking took ${(elapsedMs / 1000).toFixed(1)}s. AI marking tier may have caused delay.`
      )
    }

    return NextResponse.json(response)
  } catch (err) {
    console.error('POST /api/exam-sittings/[sittingId]/mark error:', err)
    return NextResponse.json(
      { error: 'Internal server error during marking' },
      { status: 500 }
    )
  }
}
