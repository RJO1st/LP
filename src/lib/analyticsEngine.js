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

// ═══════════════════════════════════════════════════════════════════════════════
// SCHOOL DASHBOARD — Class & School-Level Readiness
// ═══════════════════════════════════════════════════════════════════════════════

import { EXAM_CONFIGS } from './examReadiness.js';
import { aggregateClassMastery, getGroupRecommendations } from './learningPathEngine.js';

const ENTRANCE_SUBJECTS = ['mathematics', 'english', 'verbal_reasoning', 'nvr'];
const ENTRANCE_CONFIG   = EXAM_CONFIGS.secondary_entrance;

// In-process cache for exam importance weights (filled on first DB fetch per session)
const _examWeightCache = new Map(); // key: `${subject}::${examType}` → Map<topic, weight>

/**
 * Load topic exam importance weights from DB. Cached in-process.
 * Falls back to uniform weight (0.7) if table not yet populated.
 */
async function _loadExamWeights(supabase, examType = 'secondary_entrance') {
  const cacheKey = `weights::${examType}`;
  if (_examWeightCache.has(cacheKey)) return _examWeightCache.get(cacheKey);

  try {
    const { data, error } = await supabase
      .from('topic_exam_importance')
      .select('topic_slug, subject, weight')
      .eq('exam_type', examType);

    if (error || !data?.length) {
      _examWeightCache.set(cacheKey, null); // signal: use fallback
      return null;
    }

    const weightMap = {};
    for (const row of data) {
      const key = `${row.subject}::${row.topic_slug}`;
      weightMap[key] = row.weight;
    }
    _examWeightCache.set(cacheKey, weightMap);
    return weightMap;
  } catch {
    return null;
  }
}

/**
 * Get exam weight for a topic+subject combination.
 * Falls back gracefully to 0.7 (moderately important) if weights not loaded.
 */
function _topicWeight(weightMap, subject, topic) {
  if (!weightMap) return 0.7;
  return weightMap[`${subject}::${topic}`] ?? 0.7;
}

/**
 * Compute a single scholar's secondary entrance readiness score (0-100)
 * using the full formula:
 *   topic_readiness = p_mastery × stability × recency_factor × exam_weight
 *
 * - p_mastery:     BKT probability of knowing the topic (mastery_score)
 * - stability:     retention strength from spaced repetition (0-1)
 * - recency:       decay factor based on days since last practice
 * - exam_weight:   importance of topic for entrance exam (from topic_exam_importance)
 *
 * Falls back to simpler mastery-only calculation if stability/recency data absent.
 */
function _scholarEntranceScore(masteryRows, weightMap) {
  // Group rows by subject
  const bySubject = {};
  for (const row of masteryRows) {
    const subj = row.subject;
    if (!ENTRANCE_CONFIG.subjects[subj]) continue;
    if (!bySubject[subj]) bySubject[subj] = [];
    bySubject[subj].push(row);
  }

  const NOW_MS = Date.now();

  const subjectScores = {};
  for (const [subj, rows] of Object.entries(bySubject)) {
    if (!rows.length) continue;

    let topicWeightedSum = 0;
    let topicTotalWeight = 0;

    for (const row of rows) {
      const pMastery  = row.mastery_score ?? 0;
      const stability = row.stability ?? 0.5;      // default if no spaced repetition yet

      // Recency decay: 0.97 per day since last practice, floor at 0.3
      let recency = 1.0;
      if (row.updated_at) {
        const daysSince = (NOW_MS - new Date(row.updated_at).getTime()) / (1000 * 60 * 60 * 24);
        recency = Math.max(0.3, Math.pow(0.97, Math.max(0, daysSince - 1)));
      }

      const examWeight = _topicWeight(weightMap, subj, row.topic);
      const topicReadiness = pMastery * stability * recency * examWeight;

      // Weight the contribution by exam_weight so critical topics dominate the average
      topicWeightedSum += topicReadiness * examWeight;
      topicTotalWeight += examWeight;
    }

    subjectScores[subj] = topicTotalWeight > 0
      ? Math.min(1, topicWeightedSum / topicTotalWeight)
      : 0;
  }

  // Subject-level weighted sum using entrance exam subject weights (Maths 30%, etc.)
  let weightedSum = 0;
  let totalWeight = 0;
  for (const [subj, cfg] of Object.entries(ENTRANCE_CONFIG.subjects)) {
    const subjectScore = subjectScores[subj];
    if (subjectScore !== undefined) {
      weightedSum += subjectScore * cfg.weight;
      totalWeight  += cfg.weight;
    }
  }
  return totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) : 0;
}

/**
 * Per-subject scores for a scholar (for the expanded student row in teacher dashboard).
 * Returns { mathematics: 72, english: 58, verbal_reasoning: 65, nvr: 80 } or null per subject.
 */
function _scholarSubjectScores(masteryRows, weightMap) {
  const bySubject = {};
  for (const row of masteryRows) {
    if (!ENTRANCE_CONFIG.subjects[row.subject]) continue;
    if (!bySubject[row.subject]) bySubject[row.subject] = [];
    bySubject[row.subject].push(row);
  }
  const result = {};
  const NOW_MS = Date.now();
  for (const subj of ENTRANCE_SUBJECTS) {
    const rows = bySubject[subj];
    if (!rows?.length) { result[subj] = null; continue; }
    let wSum = 0, wTotal = 0;
    for (const row of rows) {
      const p = row.mastery_score ?? 0;
      const s = row.stability ?? 0.5;
      const daysSince = row.updated_at
        ? (NOW_MS - new Date(row.updated_at).getTime()) / (1000 * 60 * 60 * 24) : 0;
      const r = Math.max(0.3, Math.pow(0.97, Math.max(0, daysSince - 1)));
      const ew = _topicWeight(weightMap, subj, row.topic);
      wSum   += p * s * r * ew * ew;  // weight contribution squared → exam-important topics dominate
      wTotal += ew;
    }
    result[subj] = wTotal > 0 ? Math.round(Math.min(1, wSum / wTotal) * 100) : 0;
  }
  return result;
}

/**
 * Map a readiness score (0-100) to a grade band string.
 */
function _readinessGrade(score) {
  const thresholds = ENTRANCE_CONFIG.gradeThresholds;
  if (score >= thresholds.Exceptional)     return 'Exceptional';
  if (score >= thresholds.Ready)           return 'Ready';
  if (score >= thresholds.Developing)      return 'Developing';
  return 'Needs Support';
}

/**
 * Interpolate the admission probability from the placement curve.
 */
function getPlacementPrediction(averageReadiness) {
  const curve = ENTRANCE_CONFIG.placementCurve;
  for (let i = 0; i < curve.length - 1; i++) {
    const upper = curve[i];
    const lower = curve[i + 1];
    if (averageReadiness >= lower.readiness) {
      const t = (averageReadiness - lower.readiness) / (upper.readiness - lower.readiness);
      return Math.round(lower.admissionPct + t * (upper.admissionPct - lower.admissionPct));
    }
  }
  return curve[curve.length - 1].admissionPct;
}

/**
 * Compute secondary-entrance readiness for every scholar in a class.
 *
 * @param {string}   classId   - UUID of the class
 * @param {object}   supabase  - Supabase client (service role recommended)
 * @returns {Promise<{
 *   classAverage:      number,
 *   students:          Array<{scholarId,name,overallReadiness,grade,subjectScores}>,
 *   gradeDistribution: {Exceptional,Ready,Developing,"Needs Support"},
 *   strugglingList:    Array<…>,
 *   readyList:         Array<…>,
 *   topicWeaknesses:   Array<{subject,topic,avgMastery,displayName}>,
 * }>}
 */
export async function computeClassReadiness(classId, supabase) {
  // 0. Load exam weights (cached; falls back to uniform if table not ready)
  const weightMap = await _loadExamWeights(supabase);

  // 1. All scholars enrolled in this class
  const { data: enrolments, error: enrErr } = await supabase
    .from('enrolments')
    .select('scholar_id, scholar:scholars(id, name, year_level, curriculum)')
    .eq('class_id', classId);
  if (enrErr) throw new Error(`enrolments fetch: ${enrErr.message}`);

  const scholars = (enrolments ?? []).map(e => e.scholar).filter(Boolean);
  if (!scholars.length) {
    return {
      classAverage: 0, students: [], gradeDistribution: {
        Exceptional: 0, Ready: 0, Developing: 0, 'Needs Support': 0,
      },
      strugglingList: [], readyList: [], topicWeaknesses: [],
    };
  }

  const scholarIds = scholars.map(s => s.id);

  // 2. Mastery records — include stability + updated_at for full formula
  const { data: mastery, error: mErr } = await supabase
    .from('scholar_topic_mastery')
    .select('scholar_id, subject, topic, mastery_score, stability, updated_at, spaced_review_count')
    .in('scholar_id', scholarIds)
    .in('subject', ENTRANCE_SUBJECTS);
  if (mErr) throw new Error(`mastery fetch: ${mErr.message}`);

  const masteryByScholar = {};
  for (const row of mastery ?? []) {
    if (!masteryByScholar[row.scholar_id]) masteryByScholar[row.scholar_id] = [];
    masteryByScholar[row.scholar_id].push(row);
  }

  // 3. Per-scholar readiness using enhanced formula (BKT × stability × recency × exam_weight)
  const students = scholars.map(s => {
    const rows         = masteryByScholar[s.id] ?? [];
    const overall      = _scholarEntranceScore(rows, weightMap);
    const grade        = _readinessGrade(overall);
    const subjectScores = _scholarSubjectScores(rows, weightMap);
    return { scholarId: s.id, name: s.name, overallReadiness: overall, grade, subjectScores };
  });

  const classAverage = students.length
    ? Math.round(students.reduce((s, r) => s + r.overallReadiness, 0) / students.length)
    : 0;

  const gradeDistribution = { Exceptional: 0, Ready: 0, Developing: 0, 'Needs Support': 0 };
  students.forEach(s => { gradeDistribution[s.grade] = (gradeDistribution[s.grade] ?? 0) + 1; });

  // 4. Topic weaknesses — aggregate across all mastery rows for this class
  const allMastery = Object.values(masteryByScholar).flat();
  const topicWeaknesses = [];
  for (const subj of ENTRANCE_SUBJECTS) {
    const recs = aggregateClassMastery(allMastery.filter(r => r.subject === subj), subj);
    const weakest = recs
      .filter(r => r.scholar_count > 0 && r.avg_mastery < 0.65)
      .slice(0, 2)
      .map(r => ({
        subject:     subj,
        topic:       r.topic,
        displayName: r.display_name,
        avgMastery:  Math.round(r.avg_mastery * 100),
        pctStruggling: r.pct_struggling,
      }));
    topicWeaknesses.push(...weakest);
  }
  topicWeaknesses.sort((a, b) => a.avgMastery - b.avgMastery);

  return {
    classAverage,
    students,
    gradeDistribution,
    strugglingList: students.filter(s => s.overallReadiness < 50),
    readyList:      students.filter(s => s.overallReadiness >= 70),
    topicWeaknesses: topicWeaknesses.slice(0, 5),
    placementPrediction: getPlacementPrediction(classAverage),
  };
}

/**
 * Aggregate readiness across all classes in a school for the proprietor view.
 *
 * @param {string}   schoolId  - UUID of the school
 * @param {object}   supabase  - Supabase client
 * @returns {Promise<{
 *   schoolAverage:    number,
 *   totalScholars:    number,
 *   classes:          Array<{id,name,year_level,avgReadiness,percentReady,scholarCount}>,
 *   placementPrediction: number,
 *   subjectAverages:  Record<string, number>,
 * }>}
 */
export async function computeSchoolReadiness(schoolId, supabase) {
  // Fetch all classes in the school
  const { data: classes, error: clErr } = await supabase
    .from('classes')
    .select('id, name, year_level')
    .eq('school_id', schoolId)
    .order('year_level', { ascending: true });
  if (clErr) throw new Error(`classes fetch: ${clErr.message}`);
  if (!classes?.length) return {
    schoolAverage: 0, totalScholars: 0, classes: [], placementPrediction: 0, subjectAverages: {},
  };

  // Compute readiness for each class (parallelised)
  const classResults = await Promise.all(
    classes.map(async c => {
      const r = await computeClassReadiness(c.id, supabase);
      return {
        id:             c.id,
        name:           c.name,
        year_level:     c.year_level,
        avgReadiness:   r.classAverage,
        percentReady:   r.students.length
          ? Math.round((r.readyList.length / r.students.length) * 100) : 0,
        scholarCount:   r.students.length,
        gradeDistribution: r.gradeDistribution,
        topicWeaknesses:   r.topicWeaknesses.slice(0, 3),
        placementPrediction: r.placementPrediction,
      };
    })
  );

  const totalScholars = classResults.reduce((s, c) => s + c.scholarCount, 0);
  const schoolAverage = totalScholars > 0
    ? Math.round(
        classResults.reduce((s, c) => s + c.avgReadiness * c.scholarCount, 0) / totalScholars
      )
    : 0;

  return {
    schoolAverage,
    totalScholars,
    classes: classResults,
    placementPrediction: getPlacementPrediction(schoolAverage),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SNAPSHOT WRITER — Persists daily readiness scores for trend charts
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Write today's readiness snapshot for a single scholar.
 * Called after each quiz session (from processAnswer hook) and by nightly batch.
 * Upserts: one row per scholar per day per exam_type.
 *
 * @param {string}   scholarId
 * @param {object[]} masteryRows  — from scholar_topic_mastery
 * @param {object}   supabase     — service role client
 * @param {string}   examType     — default 'secondary_entrance'
 */
export async function writeReadinessSnapshot(scholarId, masteryRows, supabase, examType = 'secondary_entrance') {
  try {
    const weightMap = await _loadExamWeights(supabase, examType);
    const overall   = _scholarEntranceScore(masteryRows, weightMap);
    const scores    = _scholarSubjectScores(masteryRows, weightMap);
    const grade     = _readinessGrade(overall);

    const { error } = await supabase
      .from('scholar_readiness_snapshot')
      .upsert({
        scholar_id:    scholarId,
        snapshot_date: new Date().toISOString().slice(0, 10),
        exam_type:     examType,
        overall_score: overall,
        maths_score:   scores.mathematics ?? null,
        english_score: scores.english     ?? null,
        vr_score:      scores.verbal_reasoning ?? null,
        nvr_score:     scores.nvr         ?? null,
        grade_band:    grade,
      }, { onConflict: 'scholar_id,snapshot_date,exam_type' });

    if (error) console.warn('[writeReadinessSnapshot] upsert error:', error.message);
  } catch (err) {
    console.warn('[writeReadinessSnapshot] failed (non-fatal):', err.message);
    // Never throw — snapshot failure must not break the quiz flow
  }
}

/**
 * Fetch the last N days of readiness snapshots for a scholar.
 * Used by parent dashboard progress chart.
 *
 * @param {string}  scholarId
 * @param {object}  supabase
 * @param {number}  days       — history depth (default 90)
 * @returns {Promise<Array<{date, overall_score, grade_band}>>}
 */
export async function getReadinessTrend(scholarId, supabase, days = 90) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from('scholar_readiness_snapshot')
    .select('snapshot_date, overall_score, maths_score, english_score, vr_score, nvr_score, grade_band')
    .eq('scholar_id', scholarId)
    .eq('exam_type', 'secondary_entrance')
    .gte('snapshot_date', since.toISOString().slice(0, 10))
    .order('snapshot_date', { ascending: true });

  if (error) {
    console.warn('[getReadinessTrend] fetch error:', error.message);
    return [];
  }
  return data ?? [];
}

/**
 * Fetch class-level trend (average readiness per week) for the proprietor chart.
 *
 * @param {string[]} scholarIds  — all scholars in the school/class
 * @param {object}   supabase
 * @param {number}   weeks       — weeks of history (default 12)
 * @returns {Promise<Array<{week, avgReadiness}>>}
 */
export async function getClassReadinessTrend(scholarIds, supabase, weeks = 12) {
  if (!scholarIds.length) return [];

  const since = new Date();
  since.setDate(since.getDate() - weeks * 7);

  const { data, error } = await supabase
    .from('scholar_readiness_snapshot')
    .select('snapshot_date, overall_score')
    .in('scholar_id', scholarIds)
    .eq('exam_type', 'secondary_entrance')
    .gte('snapshot_date', since.toISOString().slice(0, 10))
    .order('snapshot_date', { ascending: true });

  if (error || !data?.length) return [];

  // Group into ISO weeks and average
  const byWeek = {};
  for (const row of data) {
    const d    = new Date(row.snapshot_date);
    const week = `${d.getFullYear()}-W${String(Math.ceil(d.getDate() / 7)).padStart(2, '0')}`;
    if (!byWeek[week]) byWeek[week] = [];
    byWeek[week].push(row.overall_score ?? 0);
  }

  return Object.entries(byWeek)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, scores]) => ({
      week,
      avgReadiness: Math.round(scores.reduce((s, v) => s + v, 0) / scores.length),
    }));
}