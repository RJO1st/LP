import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * GET /api/exam-analytics
 *
 * Fetch comprehensive exam analytics for authenticated scholar.
 * Returns individual exam results + aggregate statistics.
 *
 * Authentication: Required
 *
 * Query params:
 *   - subject: Optional filter (e.g., 'mathematics', 'english', 'science')
 *   - exam_type: Optional filter (e.g., 'gcse', 'igcse', 'a_level')
 *   - limit: Maximum results per page (default 10, max 100)
 *   - page: Page number (1-indexed, default 1)
 *
 * Returns:
 *   {
 *     sittings: [
 *       {
 *         sitting_id, date, mode, score, max_possible, percentage, predicted_grade,
 *         paper: { board, subject, year, session, tier, component_code },
 *         topic_scores: [ { topic_slug, score, max, percentage } ],
 *         marking_stats: { tier_distribution, needs_human_review, avg_ai_confidence }
 *       }
 *     ],
 *     pagination: { page, limit, total, totalPages },
 *     aggregate: {
 *       total_exams_taken: Number,
 *       total_by_subject: { subject: count, ... },
 *       avg_percentage_overall: Float,
 *       avg_percentage_by_subject: { subject: Float, ... },
 *       grade_trajectory: [ { date, percentage, grade }, ... ],
 *       most_improved_topic: { topic_slug, improvement_percent },
 *       weakest_topic: { topic_slug, avg_percentage }
 *     }
 *   }
 *
 * Errors:
 *   - 401: Unauthorized
 *   - 404: Scholar not found
 *   - 500: Database error
 *
 * Note: grade_trajectory is calculated by sorting sittings by date and
 * computing grade progression. Topics are sourced from exam_analytics.topic_scores JSONB.
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

    // Parse query params
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
    const subject = url.searchParams.get('subject')
    const exam_type = url.searchParams.get('exam_type')
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '10')))

    // Build query
    let query = supabase
      .from('exam_sittings')
      .select(`
        id, scholar_id, exam_paper_id, mode, started_at, finished_at,
        total_score, total_marks_available, percentage, predicted_grade, status,
        exam_papers(id, exam_board, exam_type, subject, year, session, tier, component_code),
        exam_analytics(
          id, sitting_id, subject, topic_scores, marking_stats, percentage
        )
      `, { count: 'exact' })
      .eq('scholar_id', scholarId)
      .or('status.eq.completed,status.eq.marked')

    // Apply filters
    if (subject) {
      query = query.eq('exam_papers.subject', subject)
    }
    if (exam_type) {
      query = query.eq('exam_papers.exam_type', exam_type)
    }

    // Order and paginate
    const from = (page - 1) * limit
    const to = from + limit - 1

    const { data: sittings, error: sittingsError, count } = await query
      .order('started_at', { ascending: false })
      .range(from, to)

    if (sittingsError) {
      console.error('exam_sittings fetch error:', sittingsError)
      return NextResponse.json({ error: 'Failed to fetch exam analytics' }, { status: 500 })
    }

    // Transform sittings into response format
    const sittingsData = (sittings || []).map(sitting => {
      const analyticsRecord = sitting.exam_analytics?.[0] || {}
      return {
        sitting_id: sitting.id,
        date: sitting.started_at,
        mode: sitting.mode,
        score: sitting.total_score,
        max_possible: sitting.total_marks_available,
        percentage: sitting.percentage,
        predicted_grade: sitting.predicted_grade,
        paper: {
          board: sitting.exam_papers?.exam_board,
          subject: sitting.exam_papers?.subject,
          year: sitting.exam_papers?.year,
          session: sitting.exam_papers?.session,
          tier: sitting.exam_papers?.tier,
          component_code: sitting.exam_papers?.component_code
        },
        topic_scores: analyticsRecord.topic_scores || [],
        marking_stats: analyticsRecord.marking_stats || {}
      }
    })

    // Compute aggregate stats from all sittings (all pages, not just this page)
    // Fetch ALL sittings for aggregate computation
    const { data: allSittings, error: allSittingsError } = await supabase
      .from('exam_sittings')
      .select(`
        id, started_at, percentage, predicted_grade, status,
        exam_papers(subject),
        exam_analytics(topic_scores)
      `)
      .eq('scholar_id', scholarId)
      .or('status.eq.completed,status.eq.marked')

    if (allSittingsError) {
      console.error('allSittings fetch error:', allSittingsError)
      // Continue without aggregate stats rather than failing
      const pagination = {
        page,
        limit,
        total: count || 0,
        totalPages: count ? Math.ceil(count / limit) : 0
      }
      return NextResponse.json({
        sittings: sittingsData,
        pagination
      })
    }

    // Filter sittings that have been marked/completed (must have valid status)
    const markedSittings = (allSittings || []).filter(s => s.status === 'completed' || s.status === 'marked')
    const allSittingsArray = markedSittings

    // Total exams by subject
    const totalBySubject = {}
    allSittingsArray.forEach(sitting => {
      const subject = sitting.exam_papers?.subject || 'unknown'
      totalBySubject[subject] = (totalBySubject[subject] || 0) + 1
    })

    // Average percentage by subject
    const percentageBySubject = {}
    const countBySubject = {}
    allSittingsArray.forEach(sitting => {
      const subject = sitting.exam_papers?.subject || 'unknown'
      percentageBySubject[subject] = (percentageBySubject[subject] || 0) + (sitting.percentage || 0)
      countBySubject[subject] = (countBySubject[subject] || 0) + 1
    })
    const avgPercentageBySubject = {}
    Object.keys(percentageBySubject).forEach(subject => {
      avgPercentageBySubject[subject] = percentageBySubject[subject] / countBySubject[subject]
    })

    // Overall average percentage
    const totalPercentage = allSittingsArray.reduce((sum, s) => sum + (s.percentage || 0), 0)
    const avgPercentageOverall =
      allSittingsArray.length > 0 ? totalPercentage / allSittingsArray.length : 0

    // Grade trajectory (sorted by date)
    const gradeTrajectory = allSittingsArray
      .map(sitting => ({
        date: sitting.started_at,
        percentage: sitting.percentage,
        grade: sitting.predicted_grade || mapPercentageToGrade(sitting.percentage)
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date))

    // Topic analysis (aggregate across all exams)
    const topicMetrics = {} // { topic_slug: { sum: 0, count: 0, percentages: [] } }
    allSittingsArray.forEach(sitting => {
      const topicScores = sitting.exam_analytics?.[0]?.topic_scores || sitting.exam_analytics?.topic_scores
      if (Array.isArray(topicScores)) {
        topicScores.forEach(topic => {
          const slug = topic.topic_slug
          if (!topicMetrics[slug]) {
            topicMetrics[slug] = { sum: 0, count: 0, percentages: [] }
          }
          topicMetrics[slug].sum += topic.percentage || 0
          topicMetrics[slug].count += 1
          topicMetrics[slug].percentages.push(topic.percentage || 0)
        })
      }
    })

    // Most improved topic (highest improvement trend)
    let mostImprovedTopic = null
    let maxImprovement = 0
    Object.entries(topicMetrics).forEach(([slug, metrics]) => {
      if (metrics.percentages.length >= 2) {
        const improvement = metrics.percentages[metrics.percentages.length - 1] - metrics.percentages[0]
        if (improvement > maxImprovement) {
          maxImprovement = improvement
          mostImprovedTopic = { topic_slug: slug, improvement_percent: improvement }
        }
      }
    })

    // Weakest topic (lowest average)
    let weakestTopic = null
    let minAvg = 100
    Object.entries(topicMetrics).forEach(([slug, metrics]) => {
      const avg = metrics.sum / metrics.count
      if (avg < minAvg) {
        minAvg = avg
        weakestTopic = { topic_slug: slug, avg_percentage: avg }
      }
    })

    const aggregate = {
      total_exams_taken: allSittingsArray.length,
      total_by_subject: totalBySubject,
      avg_percentage_overall: parseFloat(avgPercentageOverall.toFixed(2)),
      avg_percentage_by_subject: Object.fromEntries(
        Object.entries(avgPercentageBySubject).map(([subject, avg]) => [
          subject,
          parseFloat(avg.toFixed(2))
        ])
      ),
      grade_trajectory: gradeTrajectory,
      most_improved_topic: mostImprovedTopic,
      weakest_topic: weakestTopic
    }

    const pagination = {
      page,
      limit,
      total: count || 0,
      totalPages: count ? Math.ceil(count / limit) : 0
    }

    return NextResponse.json({
      sittings: sittingsData,
      pagination,
      aggregate
    })
  } catch (err) {
    console.error('GET /api/exam-analytics error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Helper: Map percentage to GCSE grade
 * @param {number} percentage 0-100
 * @returns {string} Grade 1-9 or null
 */
function mapPercentageToGrade(percentage) {
  if (!Number.isFinite(percentage)) return null
  if (percentage >= 80) return '9'
  if (percentage >= 70) return '8'
  if (percentage >= 61) return '7'
  if (percentage >= 52) return '6'
  if (percentage >= 43) return '5'
  if (percentage >= 34) return '4'
  if (percentage >= 25) return '3'
  if (percentage >= 16) return '2'
  if (percentage >= 7) return '1'
  return null
}
