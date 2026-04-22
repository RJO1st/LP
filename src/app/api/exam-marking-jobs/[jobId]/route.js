import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getServiceRoleClient } from '@/lib/security/serviceRole'
import { supabaseKeys } from '@/lib/env'

/**
 * GET /api/exam-marking-jobs/[jobId]
 *
 * Fetch marking job status and progress. Scholar can only view their own job.
 *
 * Authentication: Required. Scholar must own the associated sitting.
 *
 * Query params: None
 * Body: None (GET only)
 *
 * Returns:
 *   - id: Job UUID
 *   - status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
 *   - progress: { questionsTotal, questionsMarked }
 *   - error: null | { code, message }
 *   - tier3_results?: { total_score, max_possible, completed_at } (if completed)
 *
 * Errors:
 *   - 401: Unauthorized (not authenticated)
 *   - 403: Forbidden (job belongs to different scholar)
 *   - 404: Job not found
 *   - 500: Database error
 *
 * Flow:
 *   1. Verify authenticated
 *   2. Fetch job metadata
 *   3. Fetch associated sitting
 *   4. Verify scholar owns sitting (parent check via auth user)
 *   5. Return job status + progress
 */
export async function GET(req, { params }) {
  try {
    const { jobId } = await params

    // Auth client for user verification, service client for DB operations (bypasses RLS)
    const cookieStore = await cookies()
    const authClient = createServerClient(
      supabaseKeys.url(),
      supabaseKeys.publishable(),
      {
        cookies: {
          getAll: () => cookieStore.getAll()
        }
      }
    )
    const supabase = getServiceRoleClient()

    // Verify authenticated
    const { data: { user }, error: authError } = await authClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate jobId format
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!UUID_RE.test(jobId)) {
      return NextResponse.json(
        { error: 'Invalid jobId format' },
        { status: 400 }
      )
    }

    // Fetch marking job
    const { data: job, error: jobError } = await supabase
      .from('exam_marking_jobs')
      .select('id, sitting_id, status, progress, error')
      .eq('id', jobId)
      .maybeSingle()

    if (jobError) {
      console.error(`Error fetching job ${jobId}:`, jobError)
      return NextResponse.json(
        { error: 'Failed to fetch job' },
        { status: 500 }
      )
    }

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    // Fetch sitting to verify scholar ownership
    const { data: sitting, error: sittingError } = await supabase
      .from('exam_sittings')
      .select('scholar_id')
      .eq('id', job.sitting_id)
      .maybeSingle()

    if (sittingError) {
      console.error(`Error fetching sitting ${job.sitting_id}:`, sittingError)
      return NextResponse.json(
        { error: 'Failed to fetch sitting' },
        { status: 500 }
      )
    }

    if (!sitting) {
      return NextResponse.json(
        { error: 'Associated sitting not found' },
        { status: 404 }
      )
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
        { error: 'Forbidden: job belongs to another scholar' },
        { status: 403 }
      )
    }

    // Build response
    const response = {
      id: job.id,
      status: job.status,
      progress: job.progress || { questionsTotal: 0, questionsMarked: 0 },
      error: job.error
    }

    // TODO: If status === 'completed', fetch tier3_results from exam_answers aggregate
    // tier3_results: { total_score, max_possible, completed_at }
    // For now, omit tier3_results

    return NextResponse.json(response)
  } catch (err) {
    console.error('GET /api/exam-marking-jobs/[jobId] error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
