import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * GET /api/exam-sittings
 * List authenticated scholar's own exam sittings with pagination.
 * Returns sitting records with joined paper metadata.
 * Order by started_at DESC (newest first).
 * Query params: page (1-indexed), limit (default 20)
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

    // Get query params
    const url = new URL(req.url)
    const scholarIdParam = url.searchParams.get('scholar_id')

    if (!scholarIdParam) {
      return NextResponse.json({ error: 'scholar_id query param required' }, { status: 400 })
    }

    // Verify scholar belongs to this parent (auth user = parent)
    const { data: scholar, error: scholarError } = await supabase
      .from('scholars')
      .select('id')
      .eq('id', scholarIdParam)
      .eq('parent_id', user.id)
      .maybeSingle()

    if (scholarError || !scholar) {
      return NextResponse.json({ error: 'Scholar profile not found' }, { status: 404 })
    }

    const scholarId = scholar.id
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20')))

    // Fetch sittings with paper data
    const from = (page - 1) * limit
    const to = from + limit - 1

    const { data: sittings, error: sittingsError, count } = await supabase
      .from('exam_sittings')
      .select(`
        id, scholar_id, exam_paper_id, mode, started_at, finished_at, time_used_seconds,
        total_score, total_marks_available, percentage, predicted_grade, status, flagged_questions,
        exam_papers(id, exam_board, exam_type, subject, component_code, tier, year, session, paper_number, total_marks, duration_minutes, display_title)
      `, { count: 'exact' })
      .eq('scholar_id', scholarId)
      .order('started_at', { ascending: false })
      .range(from, to)

    if (sittingsError) {
      console.error('exam_sittings fetch error:', sittingsError)
      return NextResponse.json({ error: 'Failed to fetch sittings' }, { status: 500 })
    }

    return NextResponse.json({
      sittings: sittings || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: count ? Math.ceil(count / limit) : 0
      }
    })
  } catch (err) {
    console.error('GET /api/exam-sittings error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/exam-sittings
 * Start a new exam sitting.
 * Body: { exam_paper_id, mode }
 * Modes: "timed", "practice", "topic_focus", "review"
 * Returns sitting_id + questions (answers stripped).
 */
export async function POST(req) {
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

    // Parse request
    const { exam_paper_id, mode, scholar_id: scholarIdBody } = await req.json()
    if (!exam_paper_id || !mode || !scholarIdBody) {
      return NextResponse.json({ error: 'exam_paper_id, mode, and scholar_id required' }, { status: 400 })
    }

    // Verify scholar belongs to this parent (auth user = parent)
    const { data: scholar, error: scholarError } = await supabase
      .from('scholars')
      .select('id')
      .eq('id', scholarIdBody)
      .eq('parent_id', user.id)
      .maybeSingle()

    if (scholarError || !scholar) {
      return NextResponse.json({ error: 'Scholar profile not found' }, { status: 404 })
    }

    const scholarId = scholar.id

    const validModes = ['timed', 'practice', 'topic_focus', 'review']
    if (!validModes.includes(mode)) {
      return NextResponse.json({ error: 'Invalid mode' }, { status: 400 })
    }

    // Fetch the exam paper
    const { data: paper, error: paperError } = await supabase
      .from('exam_papers')
      .select('id, duration_minutes, total_marks, is_published')
      .eq('id', exam_paper_id)
      .maybeSingle()

    if (paperError || !paper || !paper.is_published) {
      return NextResponse.json({ error: 'Exam paper not found or not published' }, { status: 404 })
    }

    // Create sitting record
    const { data: sitting, error: sittingError } = await supabase
      .from('exam_sittings')
      .insert({
        scholar_id: scholarId,
        exam_paper_id,
        mode,
        total_marks_available: paper.total_marks,
        status: 'in_progress'
      })
      .select()
      .single()

    if (sittingError) {
      console.error('sitting insert error:', sittingError)
      return NextResponse.json({ error: 'Failed to create sitting' }, { status: 500 })
    }

    // Fetch questions for the paper
    const { data: questions, error: questionsError } = await supabase
      .from('exam_questions')
      .select('id, exam_paper_id, question_number, parent_question_number, question_text, question_type, marks, mark_breakdown, band_descriptors, follow_through, correct_answer_only, diagram_asset_url, diagram_description, answer_input_type, mcq_options, correct_mcq_index, topic_slug, standard_codes, marking_difficulty, display_order, page_number')
      .eq('exam_paper_id', exam_paper_id)
      .order('display_order', { ascending: true })

    if (questionsError) {
      console.error('questions fetch error:', questionsError)
      return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 })
    }

    // Strip acceptable_answers from questions
    const safeQuestions = (questions || []).map(q => {
      const { acceptable_answers, ...rest } = q
      return rest
    })

    return NextResponse.json({
      sitting,
      questions: safeQuestions,
      paper: {
        id: paper.id,
        duration_minutes: paper.duration_minutes,
        total_marks: paper.total_marks
      }
    }, { status: 201 })
  } catch (err) {
    console.error('POST /api/exam-sittings error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
