import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * GET /api/exam-papers/[paperId]
 * Fetch a single published exam paper with all its questions.
 * Questions are ordered by display_order.
 * Strips acceptable_answers from response (don't leak answers to client).
 */
export async function GET(req, { params }) {
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

    const { paperId } = await params

    // Fetch the exam paper (must be published)
    const { data: paper, error: paperError } = await supabase
      .from('exam_papers')
      .select('id, exam_board, exam_type, subject, component_code, tier, year, session, paper_number, total_marks, duration_minutes, calculator_allowed, total_questions, is_published, display_title, created_at')
      .eq('id', paperId)
      .eq('is_published', true)
      .maybeSingle()

    if (paperError) {
      console.error('exam_papers fetch error:', paperError)
      return NextResponse.json({ error: 'Failed to fetch exam paper' }, { status: 500 })
    }

    if (!paper) {
      return NextResponse.json({ error: 'Exam paper not found' }, { status: 404 })
    }

    // Fetch all questions for this paper
    const { data: questions, error: questionsError } = await supabase
      .from('exam_questions')
      .select('id, exam_paper_id, question_number, parent_question_number, question_text, question_type, marks, mark_breakdown, band_descriptors, follow_through, correct_answer_only, diagram_asset_url, diagram_description, answer_input_type, mcq_options, correct_mcq_index, topic_slug, standard_codes, marking_difficulty, display_order, page_number')
      .eq('exam_paper_id', paperId)
      .order('display_order', { ascending: true })

    if (questionsError) {
      console.error('exam_questions fetch error:', questionsError)
      return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 })
    }

    // Strip acceptable_answers from questions (client shouldn't see model answers)
    const safeQuestions = (questions || []).map(q => {
      const { acceptable_answers, ...rest } = q
      return rest
    })

    return NextResponse.json({
      paper,
      questions: safeQuestions
    })
  } catch (err) {
    console.error('GET /api/exam-papers/[paperId] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
