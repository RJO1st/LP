import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * GET /api/exam-papers
 * List published exam papers with filtering and pagination.
 * Query params: board, type, subject, tier, year, session, page (1-indexed), limit (default 20)
 * Always filters is_published = true
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

    // Get query params
    const url = new URL(req.url)
    const board = url.searchParams.get('board')
    const type = url.searchParams.get('type')
    const subject = url.searchParams.get('subject')
    const tier = url.searchParams.get('tier')
    const year = url.searchParams.get('year')
    const session = url.searchParams.get('session')
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20')))

    // Build query
    let query = supabase
      .from('exam_papers')
      .select('id, exam_board, exam_type, subject, component_code, tier, year, session, paper_number, total_marks, duration_minutes, calculator_allowed, total_questions, is_published, display_title, created_at', { count: 'exact' })
      .eq('is_published', true)

    // Apply filters
    if (board) query = query.eq('exam_board', board)
    if (type) query = query.eq('exam_type', type)
    if (subject) query = query.eq('subject', subject)
    if (tier) query = query.eq('tier', tier)
    if (year) query = query.eq('year', parseInt(year))
    if (session) query = query.eq('session', session)

    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.order('created_at', { ascending: false }).range(from, to)

    const { data, error, count } = await query

    if (error) {
      console.error('exam_papers query error:', error)
      return NextResponse.json({ error: 'Failed to fetch exam papers' }, { status: 500 })
    }

    return NextResponse.json({
      papers: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: count ? Math.ceil(count / limit) : 0
      }
    })
  } catch (err) {
    console.error('GET /api/exam-papers error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
