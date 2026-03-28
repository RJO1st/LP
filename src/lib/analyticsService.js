/**
 * analyticsService.js — Single source of truth for all dashboard analytics
 *
 * Every dashboard component should call this service instead of querying
 * Supabase directly. This centralises data-fetching, caching, and
 * transformation logic so changes only need to happen in one place.
 */

import { getAgeBand, getBandConfig } from "@/lib/ageBandConfig";
import {
  computeExamReadinessIndex,
  predictGrade,
  fetchExamBoardData,
} from "@/lib/learningPathEngine";
import { safeDivide, calculatePercentage, clamp } from "@/lib/calculationUtils";

// ── In-memory cache with TTL ──────────────────────────────────────────────
const cache = new Map();
const CACHE_TTL = 60_000; // 1 minute

function getCached(key) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  return null;
}

function setCache(key, data) {
  cache.set(key, { data, ts: Date.now() });
}

export function invalidateCache(prefix) {
  for (const key of cache.keys()) {
    if (!prefix || key.startsWith(prefix)) cache.delete(key);
  }
}

// ── Year mapping for Nigerian curricula ────────────────────────────────────
function getEffectiveYear(yearLevel, curriculum) {
  const yr = Number(yearLevel || 1);
  const c = (curriculum || "").toLowerCase();
  if (c === "ng_jss") return yr + 6;
  if (c === "ng_sss") return yr + 9;
  return yr;
}

// ── Safe Supabase query wrapper ───────────────────────────────────────────
async function safeQuery(queryFn, fallback = null) {
  try {
    const result = await queryFn();
    if (result.error) {
      console.warn("[analyticsService] query error:", result.error.message);
      return { data: fallback, error: result.error };
    }
    return { data: result.data ?? fallback, error: null };
  } catch (err) {
    console.warn("[analyticsService] threw:", err.message);
    return { data: fallback, error: err };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch all mastery records for a scholar.
 */
export async function getMasteryData(scholarId, curriculum, supabase) {
  const cacheKey = `mastery:${scholarId}:${curriculum}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const { data } = await safeQuery(
    () =>
      supabase
        .from("scholar_topic_mastery")
        .select("topic, subject, mastery_score, times_seen, updated_at, next_review_at")
        .eq("scholar_id", scholarId)
        .eq("curriculum", curriculum),
    []
  );
  setCache(cacheKey, data);
  return data;
}

/**
 * Fetch quiz results for a scholar (most recent first).
 */
export async function getQuizResults(scholarId, supabase, limit = 100) {
  const cacheKey = `quizResults:${scholarId}:${limit}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const { data } = await safeQuery(
    () =>
      supabase
        .from("quiz_results")
        .select("*")
        .eq("scholar_id", scholarId)
        .order("created_at", { ascending: false })
        .limit(limit),
    []
  );
  setCache(cacheKey, data);
  return data;
}

/**
 * Get weekly summary stats for a scholar.
 */
export async function getWeeklySummary(scholarId, curriculum, supabase) {
  const cacheKey = `weeklySummary:${scholarId}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const [mastery, quizzes, scholarRow] = await Promise.all([
    getMasteryData(scholarId, curriculum, supabase),
    getQuizResults(scholarId, supabase),
    safeQuery(
      () => supabase.from("scholars").select("*").eq("id", scholarId).single(),
      {}
    ),
  ]);

  const scholar = scholarRow.data || {};
  const weekAgo = new Date(Date.now() - 7 * 86400000);
  const getDate = (q) => q.completed_at || q.created_at;
  const weekQuizzes = quizzes.filter(
    (q) => getDate(q) && new Date(getDate(q)) > weekAgo
  );
  const todayQuizzes = quizzes.filter(
    (q) =>
      getDate(q) &&
      new Date(getDate(q)).toDateString() === new Date().toDateString()
  );

  const seenRows = mastery.filter((r) => (r.times_seen ?? 0) > 0);
  const masteryPct = seenRows.length > 0
    ? Math.round(
        calculatePercentage(
          seenRows.reduce((s, r) => s + (r.mastery_score ?? 0), 0),
          seenRows.length
        )
      )
    : 0;

  const totalXp =
    scholar.total_xp ??
    weekQuizzes.reduce((s, q) => s + (q.score ?? 0) * 10, 0);

  const result = {
    xp: totalXp,
    xpToday: todayQuizzes.reduce((s, q) => s + (q.score ?? 0) * 10, 0),
    questsCompleted: quizzes.length,
    streak: scholar.current_streak ?? 0,
    streakBest: scholar.best_streak ?? 0,
    masteryPct,
    topicCount: seenRows.length,
    totalTopics: mastery.length,
    timeMinutes: weekQuizzes.length * 8,
    weeklyQuizCount: weekQuizzes.length,
    todayQuizCount: todayQuizzes.length,
    stickersCollected: Math.floor(totalXp / 10),
  };

  setCache(cacheKey, result);
  return result;
}

/**
 * Get exam readiness data for KS4 scholars.
 */
export async function getExamReadiness(scholar, supabase) {
  if (!scholar?.id) return null;

  const cacheKey = `examReadiness:${scholar.id}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const curriculum = scholar.curriculum || "uk_national";
  const yearLevel = parseInt(scholar.year_level || scholar.year, 10) || 10;
  const band = getAgeBand(yearLevel, curriculum);

  if (band !== "ks4") return null;

  const mastery = await getMasteryData(scholar.id, curriculum, supabase);

  const subjectGroups = {};
  mastery.forEach((r) => {
    if (!subjectGroups[r.subject]) subjectGroups[r.subject] = [];
    subjectGroups[r.subject].push(r);
  });

  const examDate = scholar.exam_date ?? null;
  const daysUntilExam = examDate
    ? Math.max(
        0,
        Math.ceil((new Date(examDate) - new Date()) / 86400000)
      )
    : null;

  // Validate exam date
  if (examDate && isNaN(new Date(examDate).getTime())) {
    console.warn("[analyticsService] Invalid exam_date:", examDate);
  }

  let primaryExamBoardData = null;
  const primarySubject =
    Object.keys(subjectGroups)[0] || "mathematics";
  if (scholar.exam_board_id && supabase) {
    try {
      primaryExamBoardData = await fetchExamBoardData(
        scholar.exam_board_id,
        primarySubject,
        supabase
      );
    } catch {
      /* graceful fallback */
    }
  }

  const primaryRecords = subjectGroups[primarySubject] || mastery;
  const readiness = computeExamReadinessIndex(
    primaryRecords,
    primarySubject,
    { examBoardData: primaryExamBoardData, examDate, curriculum }
  );

  const overallReadiness = computeExamReadinessIndex(mastery, primarySubject, {
    examBoardData: primaryExamBoardData,
    examDate,
    curriculum,
  });

  const mastered = mastery.filter(
    (r) => (r.mastery_score ?? 0) >= 0.7
  ).length;

  const result = {
    predictedGrade: readiness.grade,
    previousGrade: null,
    examName:
      scholar.exam_mode === "gcse"
        ? "GCSE"
        : scholar.exam_mode === "waec"
        ? "WAEC"
        : "Exam",
    daysUntilExam: daysUntilExam !== null && !isNaN(daysUntilExam) ? daysUntilExam : null,
    examDate,
    mastered,
    totalTopics: mastery.length,
    readinessPercent: overallReadiness.readinessPercent ?? 0,
    gradeTrajectory: readiness.gradeTrajectory ?? [],
    subjectReadiness: Object.fromEntries(
      Object.entries(subjectGroups).map(([subj, rows]) => {
        const r = computeExamReadinessIndex(rows, subj, {
          examBoardData: primaryExamBoardData,
          examDate,
          curriculum,
        });
        return [subj, { grade: r.grade, readinessPercent: r.readinessPercent ?? 0 }];
      })
    ),
  };

  setCache(cacheKey, result);
  return result;
}

/**
 * Get per-subject proficiency percentages.
 */
export async function getSubjectProficiency(scholarId, curriculum, supabase) {
  const cacheKey = `subjectProf:${scholarId}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const mastery = await getMasteryData(scholarId, curriculum, supabase);
  const proficiency = {};

  mastery.forEach((r) => {
    if (!proficiency[r.subject]) proficiency[r.subject] = { total: 0, count: 0 };
    proficiency[r.subject].total += r.mastery_score ?? 0;
    proficiency[r.subject].count += 1;
  });

  const result = {};
  Object.entries(proficiency).forEach(([subj, { total, count }]) => {
    result[subj] = Math.round(calculatePercentage(total, count));
  });

  setCache(cacheKey, result);
  return result;
}

/**
 * Get spaced repetition review schedule.
 */
export async function getReviewSchedule(scholarId, curriculum, supabase) {
  const mastery = await getMasteryData(scholarId, curriculum, supabase);
  const now = new Date();

  const due = mastery
    .filter((r) => r.next_review_at && new Date(r.next_review_at) <= now)
    .sort((a, b) => new Date(a.next_review_at) - new Date(b.next_review_at));

  const upcoming = mastery
    .filter((r) => r.next_review_at && new Date(r.next_review_at) > now)
    .sort((a, b) => new Date(a.next_review_at) - new Date(b.next_review_at))
    .slice(0, 20);

  return { dueNow: due, upcoming };
}

/**
 * Get activity calendar data — days with quiz activity in the past N days.
 */
export async function getActivityCalendar(scholarId, supabase, days = 90) {
  const cacheKey = `activityCal:${scholarId}:${days}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const since = new Date(Date.now() - days * 86400000).toISOString();
  const { data: quizzes } = await safeQuery(
    () =>
      supabase
        .from("quiz_results")
        .select("created_at, score")
        .eq("scholar_id", scholarId)
        .gte("created_at", since)
        .order("created_at", { ascending: true }),
    []
  );

  const dayMap = {};
  quizzes.forEach((q) => {
    const d = (q.created_at || "").split("T")[0];
    if (!d) return;
    if (!dayMap[d]) dayMap[d] = { count: 0, totalScore: 0 };
    dayMap[d].count += 1;
    dayMap[d].totalScore += q.score ?? 0;
  });

  const result = Object.entries(dayMap)
    .map(([date, { count, totalScore }]) => ({
      date,
      count,
      totalScore,
      level: count >= 5 ? 4 : count >= 3 ? 3 : count >= 2 ? 2 : 1,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  setCache(cacheKey, result);
  return result;
}

/**
 * Get available subjects for a scholar's curriculum/year.
 */
export async function getAvailableSubjects(scholarId, curriculum, yearLevel, supabase) {
  const effectiveYear = getEffectiveYear(yearLevel, curriculum);
  const cacheKey = `subjects:${curriculum}:${effectiveYear}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const { data: rows } = await safeQuery(
    () =>
      supabase
        .from("question_bank")
        .select("subject")
        .eq("curriculum", curriculum)
        .eq("is_active", true)
        .gte("year_level", Math.max(1, effectiveYear - 1))
        .lte("year_level", effectiveYear + 1),
    []
  );

  const subjects = [...new Set(rows.map((r) => r.subject).filter(Boolean))];
  setCache(cacheKey, subjects);
  return subjects;
}
