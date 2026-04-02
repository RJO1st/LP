import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * GET /api/exam-analytics/grade-boundaries
 *
 * Fetch official grade boundaries for a specific exam spec.
 * Returns percentage thresholds for each grade.
 * Falls back to estimated defaults if not found in database.
 *
 * Authentication: Required
 *
 * Query params (all required):
 *   - board: Exam board code (e.g., 'aqa', 'edexcel', 'ocr', 'wjec')
 *   - subject: Subject code (e.g., 'mathematics', 'english_language')
 *   - year: Exam year (e.g., 2024)
 *   - session: Session (e.g., 'summer', 'winter')
 *
 * Returns:
 *   {
 *     board, subject, year, session,
 *     grade_scale: ["9", "8", "7", "6", "5", "4", "3", "2", "1"],
 *     boundaries: {
 *       "9": 80, "8": 70, "7": 61, ...
 *     },
 *     is_provisional: Boolean (true if estimated defaults used),
 *     total_marks: Integer (if available from exam_papers)
 *   }
 *
 * Errors:
 *   - 400: Missing required query params
 *   - 401: Unauthorized
 *   - 404: Scholar not found
 *   - 500: Database error
 *
 * Default boundaries (GCSE):
 *   Grade 9: 80%, Grade 8: 70%, Grade 7: 61%, Grade 6: 52%, Grade 5: 43%,
 *   Grade 4: 34%, Grade 3: 25%, Grade 2: 16%, Grade 1: 7%
 *
 * Note: If boundaries exist in grade_boundaries table, those are returned.
 * Otherwise, defaults are used and is_provisional=true.
 */
export async function GET(req) {
  try {
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

    // Get scholar (for consistency with other routes)
    const { data: scholar, error: scholarError } = await supabase
      .from('scholars')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (scholarError || !scholar) {
      return NextResponse.json({ error: 'Scholar profile not found' }, { status: 404 })
    }

    // Parse query params
    const url = new URL(req.url)
    const board = url.searchParams.get('board')
    const subject = url.searchParams.get('subject')
    const year = url.searchParams.get('year')
    const session = url.searchParams.get('session')

    // Validate all params present
    if (!board || !subject || !year || !session) {
      return NextResponse.json(
        { error: 'Query params required: board, subject, year, session' },
        { status: 400 }
      )
    }

    const yearInt = parseInt(year)
    if (Number.isNaN(yearInt) || yearInt < 2000 || yearInt > 2100) {
      return NextResponse.json({ error: 'Invalid year' }, { status: 400 })
    }

    // Try to fetch from grade_boundaries table
    const { data: boundaryRecord, error: boundaryError } = await supabase
      .from('grade_boundaries')
      .select('id, boundaries, is_provisional, total_marks')
      .eq('exam_board', board)
      .eq('subject', subject)
      .eq('year', yearInt)
      .eq('session', session)
      .maybeSingle()

    if (boundaryError) {
      console.error('grade_boundaries fetch error:', boundaryError)
      // Continue with defaults
    }

    // Determine response
    const gradeScale = ['9', '8', '7', '6', '5', '4', '3', '2', '1']
    let boundaries = boundaryRecord?.boundaries || getDefaultBoundaries()
    let isProvisional = !boundaryRecord || boundaryRecord.is_provisional || false

    // Ensure boundaries is an object with string keys
    if (!boundaries || typeof boundaries !== 'object') {
      boundaries = getDefaultBoundaries()
      isProvisional = true
    }

    const response = {
      board,
      subject,
      year: yearInt,
      session,
      grade_scale: gradeScale,
      boundaries,
      is_provisional: isProvisional
    }

    // Try to fetch total_marks from exam_papers (if available)
    if (!boundaryRecord?.total_marks) {
      const { data: paperData, error: paperError } = await supabase
        .from('exam_papers')
        .select('total_marks')
        .eq('exam_board', board)
        .eq('subject', subject)
        .eq('year', yearInt)
        .eq('session', session)
        .limit(1)
        .maybeSingle()

      if (!paperError && paperData?.total_marks) {
        response.total_marks = paperData.total_marks
      }
    } else {
      response.total_marks = boundaryRecord.total_marks
    }

    return NextResponse.json(response)
  } catch (err) {
    console.error('GET /api/exam-analytics/grade-boundaries error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Helper: Return default GCSE grade boundaries (percentage thresholds).
 * These are typical GCSE boundaries; actual boundaries vary by exam board and year.
 * @returns {Object} { "9": 80, "8": 70, ... }
 */
function getDefaultBoundaries() {
  return {
    '9': 80,
    '8': 70,
    '7': 61,
    '6': 52,
    '5': 43,
    '4': 34,
    '3': 25,
    '2': 16,
    '1': 7
  }
}
