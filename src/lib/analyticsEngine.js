/**
 * analyticsEngine.js
 * ─────────────────────────────────────────────────────────────────────────────
 * LaunchPard — Progress Analytics Engine
 *
 * Computes all analytics data used in:
 *   - Scholar dashboard (ProgressDashboard.jsx)
 *   - Parent insights (ParentInsights.jsx)
 *   - Weekly mission debrief email
 *   - Predicted exam readiness
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { masteryColour, masteryEmoji, masteryToTier } from './masteryEngine.js';
import { estimateExamReadiness, computeExamReadinessIndex, predictGrade, fetchExamBoardData } from './learningPathEngine.js';

// ─── WEEKLY SUMMARY ───────────────────────────────────────────────────────────
/**
 * Compute weekly summary stats from session_answers.
 *
 * @param {array} sessionAnswers  - rows from session_answers for last 7 days
 * @param {array} masteryRecords  - all mastery rows for this scholar
 * @param {object} scholar        - scholar DB row
 * @returns {object}              - weekly summary
 */
export function computeWeeklySummary(sessionAnswers, masteryRecords, scholar) {
  const now  = new Date();
  const week = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const thisWeek = sessionAnswers.filter(a => new Date(a.answered_at) >= week);

  if (!thisWeek.length) {
    return {
      totalQuestions: 0,
      correctAnswers: 0,
      accuracy:       0,
      sessionsCount:  0,
      minutesLearned: 0,
      topicsAttempted: [],
      topicBreakdown:  [],
      strongestTopic:  null,
      weakestTopic:    null,
      masteredThisWeek: 0,
      streakDays:      0,
      isEmpty:         true,
    };
  }

  const totalQuestions  = thisWeek.length;
  const correctAnswers  = thisWeek.filter(a => a.answered_correctly).length;
  const accuracy        = Math.round((correctAnswers / totalQuestions) * 100);
  const sessions        = new Set(thisWeek.map(a => a.session_id));
  const sessionsCount   = sessions.size;
  // Only sum rows with a real time measurement — exclude nulls to avoid skewing totals
  const timedAnswers   = thisWeek.filter(a => a.time_taken_ms != null);
  const minutesLearned = timedAnswers.length > 0
    ? Math.round(timedAnswers.reduce((sum, a) => sum + a.time_taken_ms, 0) / 60000)
    : 0;

  // Per-topic breakdown
  const topicMap = {};
  for (const a of thisWeek) {
    const key = a.topic;
    if (!topicMap[key]) topicMap[key] = { topic: key, subject: a.subject, correct: 0, total: 0 };
    topicMap[key].total  += 1;
    topicMap[key].correct += a.answered_correctly ? 1 : 0;
  }

  const topicBreakdown = Object.values(topicMap).map(t => ({
    ...t,
    accuracy:      Math.round((t.correct / t.total) * 100),
    displayName:   t.topic.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
  })).sort((a, b) => b.accuracy - a.accuracy);

  const strongestTopic = topicBreakdown[0] ?? null;
  const weakestTopic   = topicBreakdown[topicBreakdown.length - 1] ?? null;

  // Topics mastered this week (crossed 0.80 threshold)
  const masteredThisWeek = masteryRecords.filter(r => {
    const updatedAt = r.updated_at ? new Date(r.updated_at) : null;
    return updatedAt && updatedAt >= week && r.mastery_score >= 0.80;
  }).length;

  // Streak days (consecutive days with at least 1 answer)
  const streakDays = computeStreakDays(sessionAnswers);

  return {
    totalQuestions,
    correctAnswers,
    accuracy,
    sessionsCount,
    minutesLearned,
    topicsAttempted: topicBreakdown.map(t => t.topic),
    topicBreakdown,
    strongestTopic,
    weakestTopic,
    masteredThisWeek,
    streakDays,
    isEmpty: false,
    scholarName: scholar?.name ?? 'your child',
  };
}

// ─── STREAK CALCULATION ───────────────────────────────────────────────────────
function computeStreakDays(sessionAnswers) {
  const days = new Set(
    sessionAnswers.map(a => new Date(a.answered_at).toDateString())
  );
  let streak = 0;
  const d = new Date();
  while (days.has(d.toDateString())) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

// ─── SUBJECT MASTERY OVERVIEW ─────────────────────────────────────────────────
/**
 * Group mastery records by subject and compute overview stats.
 *
 * @param {array} masteryRecords
 * @returns {array} - [{subject, avgMastery, topicsTotal, topicsMastered, tier, colour}]
 */
export function computeSubjectOverview(masteryRecords) {
  const subjectMap = {};

  for (const r of masteryRecords) {
    if (!subjectMap[r.subject]) {
      subjectMap[r.subject] = {
        subject:       r.subject,
        displayName:   r.subject.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        scores:        [],
        topicsMastered: 0,
        topicsTotal:   0,
      };
    }
    subjectMap[r.subject].scores.push(r.mastery_score);
    subjectMap[r.subject].topicsTotal++;
    if (r.mastery_score >= 0.80) subjectMap[r.subject].topicsMastered++;
  }

  return Object.values(subjectMap).map(s => {
    const avg = s.scores.reduce((a, b) => a + b, 0) / s.scores.length;
    return {
      ...s,
      avgMastery:   Math.round(avg * 100),
      tier:         masteryToTier(avg),
      colour:       masteryColour(avg),
      emoji:        masteryEmoji(avg),
      completionPct: Math.round((s.topicsMastered / s.topicsTotal) * 100),
    };
  }).sort((a, b) => b.avgMastery - a.avgMastery);
}

// ─── TOPIC HEATMAP DATA ───────────────────────────────────────────────────────
/**
 * Returns mastery data in a format suitable for a heatmap/radar chart.
 *
 * @param {array} masteryRecords - for a single subject
 * @returns {array}              - [{topic, mastery, colour, tier}]
 */
export function computeTopicHeatmap(masteryRecords) {
  return masteryRecords.map(r => ({
    topic:       r.topic,
    displayName: r.topic.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    mastery:     Math.round(r.mastery_score * 100),
    colour:      masteryColour(r.mastery_score),
    tier:        r.current_tier ?? masteryToTier(r.mastery_score),
    emoji:       masteryEmoji(r.mastery_score),
    timeSeen:    r.times_seen,
    nextReview:  r.next_review_at,
  })).sort((a, b) => a.mastery - b.mastery);  // weakest first
}

// ─── PROGRESS OVER TIME ───────────────────────────────────────────────────────
/**
 * Build a 30-day accuracy trend from session_answers.
 *
 * @param {array} sessionAnswers  - all answers (up to 30 days)
 * @returns {array}               - [{date, accuracy, questionsAnswered}]
 */
export function computeProgressTrend(sessionAnswers) {
  const days = {};

  for (const a of sessionAnswers) {
    const date = new Date(a.answered_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    if (!days[date]) days[date] = { date, correct: 0, total: 0 };
    days[date].total  += 1;
    days[date].correct += a.answered_correctly ? 1 : 0;
  }

  return Object.values(days)
    .map(d => ({
      date:              d.date,
      accuracy:          Math.round((d.correct / d.total) * 100),
      questionsAnswered: d.total,
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-30);
}

// ─── WEEKLY REPORT EMAIL DATA ─────────────────────────────────────────────────
/**
 * Compile all data needed for the weekly mission debrief email.
 *
 * @param {object} scholar         - scholar DB row
 * @param {object} parent          - parent DB row
 * @param {array}  sessionAnswers  - last 7 days of answers
 * @param {array}  masteryRecords  - all mastery records
 * @param {object} learningPath    - scholar_learning_path row
 * @returns {object}               - email template data
 */
export function compileWeeklyReportData(scholar, parent, sessionAnswers, masteryRecords, learningPath) {
  const weekly   = computeWeeklySummary(sessionAnswers, masteryRecords, scholar);
  const subjects = computeSubjectOverview(masteryRecords);

  // Exam readiness per subject
  const readiness = {};
  const subjectGroups = {};
  for (const r of masteryRecords) {
    if (!subjectGroups[r.subject]) subjectGroups[r.subject] = [];
    subjectGroups[r.subject].push(r);
  }
  for (const [subject, records] of Object.entries(subjectGroups)) {
    readiness[subject] = estimateExamReadiness(records, subject);
  }

  // Focus topics for parent (2-3 weakest)
  const focusTopics = masteryRecords
    .filter(r => r.mastery_score < 0.55)
    .sort((a, b) => a.mastery_score - b.mastery_score)
    .slice(0, 3)
    .map(r => ({
      topic:    r.topic.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      subject:  r.subject,
      mastery:  Math.round(r.mastery_score * 100),
    }));

  // Due for review
  const dueForReview = masteryRecords
    .filter(r => r.next_review_at && new Date(r.next_review_at) <= new Date())
    .length;

  // Narrative: generate report tone based on performance
  const tone = weekly.accuracy >= 80 ? 'stellar'
             : weekly.accuracy >= 60 ? 'good'
             : weekly.isEmpty        ? 'inactive'
             : 'needs_support';

  const toneMessages = {
    stellar:       `${scholar.name} had a stellar week — ${weekly.accuracy}% accuracy across ${weekly.totalQuestions} questions!`,
    good:          `${scholar.name} made solid progress this week — ${weekly.accuracy}% accuracy and ${weekly.sessionsCount} sessions completed.`,
    needs_support: `${scholar.name} is working hard but could use some extra support this week — ${weekly.accuracy}% accuracy.`,
    inactive:      `${scholar.name} didn't complete any sessions this week. A gentle nudge might help!`,
  };

  return {
    scholarName:     scholar.name,
    parentName:      parent?.full_name?.split(' ')[0] ?? 'there',
    curriculum:      scholar.curriculum,
    weekSummary:     weekly,
    subjectOverview: subjects,
    examReadiness:   readiness,
    focusTopics,
    dueForReview,
    currentMilestone: learningPath?.next_milestone ?? null,
    tone,
    headline:        toneMessages[tone],
    generatedAt:     new Date().toISOString(),
    dashboardUrl:    `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/parent`,
  };
}

// ─── PERCENTILE ESTIMATE ──────────────────────────────────────────────────────
/**
 * Estimate a scholar's percentile rank within their year group.
 * Uses platform-wide anonymised mastery averages (rough estimate).
 *
 * @param {number} masteryScore  - 0-1
 * @param {string} subject
 * @returns {object}             - { percentile, label }
 */
export function estimatePercentile(masteryScore, subject) {
  // Platform average curves (will be replaced with real DB stats as platform grows)
  // Normal distribution approximation: mean 0.55, std 0.15
  const mean = 0.55;
  const std  = 0.15;
  const z    = (masteryScore - mean) / std;

  // Approximate cumulative normal distribution
  const percentile = Math.round(Math.min(99, Math.max(1,
    50 + 50 * erf(z / Math.SQRT2)
  )));

  const label = percentile >= 90 ? 'Top 10%'
              : percentile >= 75 ? 'Top 25%'
              : percentile >= 50 ? 'Above average'
              : percentile >= 25 ? 'Average'
              : 'Below average';

  return { percentile, label };
}

// Simple erf approximation (Abramowitz & Stegun)
function erf(x) {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return x >= 0 ? y : -y;
}

// ─── DYNAMIC EXAM READINESS (uses exam board data when available) ────────────
/**
 * Compute full exam readiness for a scholar across all their subjects.
 * Fetches exam board data from Supabase if scholar has an exam_board_id.
 *
 * @param {array}  masteryRecords  - all mastery rows for this scholar
 * @param {object} scholar         - scholar DB row (needs exam_board_id, curriculum)
 * @param {object} supabase        - Supabase client
 * @param {string} examDate        - ISO date string (optional)
 * @returns {object} - { bySubject: { [subject]: readinessResult }, overall: readinessResult }
 */
export async function computeFullExamReadiness(masteryRecords, scholar, supabase, examDate = null) {
  // Group mastery by subject
  const subjectGroups = {};
  for (const r of masteryRecords) {
    if (!subjectGroups[r.subject]) subjectGroups[r.subject] = [];
    subjectGroups[r.subject].push(r);
  }

  const bySubject = {};
  let totalScore = 0;
  let subjectCount = 0;

  for (const [subject, records] of Object.entries(subjectGroups)) {
    // Fetch exam board data if scholar has a board assigned
    let examBoardData = null;
    if (scholar?.exam_board_id && supabase) {
      examBoardData = await fetchExamBoardData(scholar.exam_board_id, subject, supabase);
    }

    bySubject[subject] = computeExamReadinessIndex(records, subject, {
      examBoardData,
      examDate,
      curriculum: scholar?.curriculum ?? 'uk_gcse',
    });

    totalScore += bySubject[subject].score;
    subjectCount++;
  }

  // Overall readiness is the weighted average
  const overallScore = subjectCount > 0 ? Math.round(totalScore / subjectCount) : 0;
  const overallGrade = predictGrade(
    overallScore,
    null,
    scholar?.curriculum ?? 'uk_gcse'
  );

  return {
    bySubject,
    overall: {
      score: overallScore,
      grade: overallGrade.grade,
      nextGrade: overallGrade.nextGrade,
      pointsToNext: overallGrade.pointsToNext,
      scale: overallGrade.scale,
      label: overallScore >= 80 ? 'Exam Ready' : overallScore >= 60 ? 'On Track' : overallScore >= 40 ? 'Developing' : 'Needs Focus',
      colour: overallScore >= 80 ? '#22c55e' : overallScore >= 60 ? '#f59e0b' : overallScore >= 40 ? '#fb923c' : '#ef4444',
      subjectCount,
    },
  };
}

// Re-export for convenience
export { computeExamReadinessIndex, predictGrade, fetchExamBoardData };

// ─── STREAK HEATMAP (GitHub-style calendar) ───────────────────────────────────
/**
 * Build 52-week activity data for a GitHub-style contribution calendar.
 *
 * @param {array} sessionAnswers
 * @returns {array} - 52 weeks × 7 days of { date, count, intensity }
 */
export function buildActivityCalendar(sessionAnswers) {
  const dayMap = {};
  for (const a of sessionAnswers) {
    const date = new Date(a.answered_at).toISOString().split('T')[0];
    dayMap[date] = (dayMap[date] ?? 0) + 1;
  }

  const calendar = [];
  const today = new Date();

  for (let i = 364; i >= 0; i--) {
    const d   = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    const count = dayMap[key] ?? 0;

    calendar.push({
      date:      key,
      count,
      intensity: count === 0 ? 0 : count <= 5 ? 1 : count <= 15 ? 2 : count <= 30 ? 3 : 4,
    });
  }

  return calendar;
}