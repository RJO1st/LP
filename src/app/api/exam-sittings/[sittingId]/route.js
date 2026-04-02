import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * GET /api/exam-sittings/[sittingId]
 * Fetch a specific sitting with its answers (scholar's own only).
 * Returns sitting details + array of submitted answers + paper + questions.
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

    // Verify authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sittingId = params.sittingId

    // Fetch sitting
    const { data: sitting, error: sittingError } = await supabase
      .from('exam_sittings')
      .select('id, scholar_id, exam_paper_id, mode, started_at, finished_at, time_used_seconds, total_score, total_marks_available, percentage, predicted_grade, status, flagged_questions')
      .eq('id', sittingId)
      .maybeSingle()

    if (sittingError) {
      console.error('sitting fetch error:', sittingError)
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
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch answers for this sitting
    const { data: answers, error: answersError } = await supabase
      .from('exam_answers')
      .select('id, sitting_id, question_id, scholar_answer, scholar_working, marks_awarded, marks_available, mark_breakdown_awarded, marking_tier, ai_confidence, ai_feedback, model_answer, needs_human_review, time_spent_seconds, answered_at')
      .eq('sitting_id', sittingId)
      .order('answered_at', { ascending: true })

    if (answersError) {
      console.error('answers fetch error:', answersError)
      return NextResponse.json({ error: 'Failed to fetch answers' }, { status: 500 })
    }

    // Fetch paper metadata
    const { data: paper } = await supabase
      .from('exam_papers')
      .select('id, exam_board, exam_type, subject, tier, year, paper_number, total_marks, duration_minutes, display_title')
      .eq('id', sitting.exam_paper_id)
      .maybeSingle()

    // Fetch questions — include acceptable_answers only if sitting is marked (results mode)
    const isMarked = sitting.status === 'marked' || sitting.status === 'completed'
    const questionSelect = isMarked
      ? 'id, exam_paper_id, question_number, parent_question_number, question_text, question_type, marks, mark_breakdown, band_descriptors, answer_input_type, mcq_options, correct_mcq_index, acceptable_answers, topic_slug, marking_difficulty, display_order'
      : 'id, exam_paper_id, question_number, parent_question_number, question_text, question_type, marks, mark_breakdown, band_descriptors, answer_input_type, mcq_options, topic_slug, marking_difficulty, display_order'
    const { data: questions } = await supabase
      .from('exam_questions')
      .select(questionSelect)
      .eq('exam_paper_id', sitting.exam_paper_id)
      .order('display_order', { ascending: true })

    return NextResponse.json({
      sitting,
      answers: answers || [],
      paper: paper || null,
      questions: questions || []
    })
  } catch (err) {
    console.error('GET /api/exam-sittings/[sittingId] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/exam-sittings/[sittingId]
 * Update a sitting: submit/upsert answer or finish the exam.
 *
 * Action A: Submit answer
 * Body: {
 *   action: "submit_answer",
 *   question_id,
 *   answer_text,
 *   working (optional string),
 *   marks_available (integer),
 *   time_spent_seconds (optional)
 * }
 *
 * Action B: Finish exam
 * Body: { action: "finish", time_used_seconds (optional) }
 * Sets finished_at = now(), status = 'completed'
 */
export async function PATCH(req, { params }) {
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

    const sittingId = params.sittingId

    // Fetch sitting
    const { data: sitting, error: sittingError } = await supabase
      .from('exam_sittings')
      .select('id, scholar_id, status')
      .eq('id', sittingId)
      .maybeSingle()

    if (sittingError) {
      console.error('sitting fetch error:', sittingError)
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
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { action } = body

    if (!action) {
      return NextResponse.json({ error: 'action required' }, { status: 400 })
    }

    // Handle action: submit_answer — upsert (allows re-answering)
    if (action === 'submit_answer') {
      const { question_id, answer_text, working, marks_available, time_spent_seconds } = body

      if (!question_id) {
        return NextResponse.json({ error: 'question_id required for submit_answer' }, { status: 400 })
      }

      const now = new Date().toISOString()

      // Check if answer already exists for this sitting + question
      const { data: existing } = await supabase
        .from('exam_answers')
        .select('id')
        .eq('sitting_id', sittingId)
        .eq('question_id', question_id)
        .maybeSingle()

      let answer
      if (existing) {
        // Update existing answer
        const { data: updated, error: updateErr } = await supabase
          .from('exam_answers')
          .update({
            scholar_answer: answer_text || null,
            scholar_working: working || null,
            time_spent_seconds: time_spent_seconds || 0,
            answered_at: now
          })
          .eq('id', existing.id)
          .select()
          .single()

        if (updateErr) {
          console.error('answer update error:', updateErr)
          return NextResponse.json({ error: 'Failed to update answer' }, { status: 500 })
        }
        answer = updated
      } else {
        // Insert new answer
        const { data: inserted, error: insertErr } = await supabase
          .from('exam_answers')
          .insert({
            sitting_id: sittingId,
            question_id,
            scholar_answer: answer_text || null,
            scholar_working: working || null,
            marks_available: marks_available || 1,
            time_spent_seconds: time_spent_seconds || 0,
            answered_at: now
          })
          .select()
          .single()

        if (insertErr) {
          console.error('answer insert error:', insertErr)
          return NextResponse.json({ error: 'Failed to submit answer' }, { status: 500 })
        }
        answer = inserted
      }

      return NextResponse.json({ success: true, answer })
    }

    // Handle action: finish
    if (action === 'finish') {
      const now = new Date().toISOString()

      const { data: updatedSitting, error: finishError } = await supabase
        .from('exam_sittings')
        .update({
          finished_at: now,
          status: 'completed',
          time_used_seconds: body.time_used_seconds || null
        })
        .eq('id', sittingId)
        .select()
        .single()

      if (finishError) {
        console.error('finish error:', finishError)
        return NextResponse.json({ error: 'Failed to finish sitting' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        sitting: updatedSitting
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err) {
    console.error('PATCH /api/exam-sittings/[sittingId] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
