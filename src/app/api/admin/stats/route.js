import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ── Service-role client — bypasses RLS for admin aggregations ───────────────
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── Admin email whitelist (must match dashboard page) ───────────────────────
const ADMIN_EMAILS = [
  "ogunwede.r@gmail.com",
  "admin@launchpard.com",
];

/**
 * GET /api/admin/stats
 * Returns comprehensive growth analytics for the admin dashboard.
 * Requires an authenticated admin session (checked via auth header).
 */
export async function GET(req) {
  try {
    // ── Auth gate ────────────────────────────────────────────────────────
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Missing auth token" }, { status: 401 });

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user || !ADMIN_EMAILS.includes(user.email)) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    // ── Helper: safe query wrapper ───────────────────────────────────────
    const sq = async (fn, label) => {
      try {
        const r = await fn();
        if (r.error) console.warn(`[admin/stats] ${label}:`, r.error.message);
        return r;
      } catch (e) {
        console.warn(`[admin/stats] ${label} threw:`, e.message);
        return { data: null, count: null, error: e };
      }
    };

    const now = new Date();
    const sevenDaysAgo = new Date(now - 7 * 86400000).toISOString();
    const fourteenDaysAgo = new Date(now - 14 * 86400000).toISOString();
    const thirtyDaysAgo = new Date(now - 30 * 86400000).toISOString();

    // ── Parallel data fetch ──────────────────────────────────────────────
    const [
      parentsRes, scholarsRes, questionsRes, sessionsRes, schoolsRes,
      subsRes, quizRes, newScholars7dRes, prevScholars7dRes,
      newParents7dRes, prevParents7dRes, quizzes7dRes, prevQuizzes7dRes,
      allScholarsRes, allQuizzesRes, topicMasteryRes, questionsActiveRes,
    ] = await Promise.all([
      // Counts
      sq(() => supabaseAdmin.from("parents").select("*", { count: "exact", head: true }), "parents"),
      sq(() => supabaseAdmin.from("scholars").select("*", { count: "exact", head: true }).is("archived_at", null), "scholars"),
      sq(() => supabaseAdmin.from("question_bank").select("*", { count: "exact", head: true }), "questions_all"),
      sq(() => supabaseAdmin.from("scholar_sessions").select("*", { count: "exact", head: true }), "sessions"),
      sq(() => supabaseAdmin.from("schools").select("*", { count: "exact", head: true }), "schools"),
      sq(() => supabaseAdmin.from("subscriptions").select("*", { count: "exact", head: true }), "subs"),
      sq(() => supabaseAdmin.from("quiz_results").select("*", { count: "exact", head: true }), "quizzes"),

      // Growth comparisons: this week vs last week
      sq(() => supabaseAdmin.from("scholars").select("*", { count: "exact", head: true }).gte("created_at", sevenDaysAgo).is("archived_at", null), "new7d"),
      sq(() => supabaseAdmin.from("scholars").select("*", { count: "exact", head: true }).gte("created_at", fourteenDaysAgo).lt("created_at", sevenDaysAgo).is("archived_at", null), "prev7d"),
      sq(() => supabaseAdmin.from("parents").select("*", { count: "exact", head: true }).gte("created_at", sevenDaysAgo), "newParents7d"),
      sq(() => supabaseAdmin.from("parents").select("*", { count: "exact", head: true }).gte("created_at", fourteenDaysAgo).lt("created_at", sevenDaysAgo), "prevParents7d"),
      sq(() => supabaseAdmin.from("quiz_results").select("*", { count: "exact", head: true }).gte("created_at", sevenDaysAgo), "quizzes7d"),
      sq(() => supabaseAdmin.from("quiz_results").select("*", { count: "exact", head: true }).gte("created_at", fourteenDaysAgo).lt("created_at", sevenDaysAgo), "prevQuizzes7d"),

      // Full data for analytics
      sq(() => supabaseAdmin
        .from("scholars")
        .select("id, name, age_band, curriculum, created_at, school_id, year_level, total_xp, coins, current_streak, best_streak, last_active, last_activity_date, country, parent_id, trial_ends_at")
        .is("archived_at", null)
        .order("created_at", { ascending: false })
        .limit(200), "allScholars"),
      sq(() => supabaseAdmin
        .from("quiz_results")
        .select("id, scholar_id, subject, accuracy, questions_correct, questions_total, time_spent_seconds, curriculum, year_level, created_at")
        .order("created_at", { ascending: false })
        .limit(200), "allQuizzes"),
      sq(() => supabaseAdmin
        .from("scholar_topic_mastery")
        .select("scholar_id, subject, topic, mastery_score, times_seen, times_correct, current_tier")
        .limit(500), "topicMastery"),
      sq(() => supabaseAdmin
        .from("question_bank")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true), "questionsActive"),
    ]);

    const scholarsData = allScholarsRes.data || [];
    const quizzesData = allQuizzesRes.data || [];
    const masteryData = topicMasteryRes.data || [];

    // ── Derived metrics ──────────────────────────────────────────────────
    const totalScholars = scholarsRes.count ?? 0;
    const totalParents = parentsRes.count ?? 0;
    const newScholars7d = newScholars7dRes.count ?? 0;
    const prevScholars7d = prevScholars7dRes.count ?? 0;
    const newParents7d = newParents7dRes.count ?? 0;
    const prevParents7d = prevParents7dRes.count ?? 0;
    const quizzes7d = quizzes7dRes.count ?? 0;
    const prevQuizzes7d = prevQuizzes7dRes.count ?? 0;

    // WoW growth %
    const pctChange = (curr, prev) => prev === 0 ? (curr > 0 ? 100 : 0) : Math.round(((curr - prev) / prev) * 100);

    // Activation: scholars who completed at least 1 quiz
    const scholarsWithQuiz = new Set(quizzesData.map(q => q.scholar_id));
    const activatedScholars = scholarsData.filter(s => scholarsWithQuiz.has(s.id)).length;
    const activationRate = totalScholars > 0 ? Math.round((activatedScholars / totalScholars) * 100) : 0;

    // Avg accuracy across all quizzes
    const quizzesWithAccuracy = quizzesData.filter(q => q.accuracy != null);
    const avgAccuracy = quizzesWithAccuracy.length > 0
      ? Math.round(quizzesWithAccuracy.reduce((sum, q) => sum + q.accuracy, 0) / quizzesWithAccuracy.length)
      : 0;

    // Avg time per quiz (minutes)
    const quizzesWithTime = quizzesData.filter(q => q.time_spent_seconds > 0);
    const avgTimeMin = quizzesWithTime.length > 0
      ? (quizzesWithTime.reduce((sum, q) => sum + q.time_spent_seconds, 0) / quizzesWithTime.length / 60).toFixed(1)
      : 0;

    // Scholar-to-parent ratio
    const scholarPerParent = totalParents > 0 ? (totalScholars / totalParents).toFixed(1) : 0;

    // Curriculum distribution (from ALL scholars, not just recent)
    const currDist = {};
    scholarsData.forEach(s => {
      const c = s.curriculum || "unknown";
      currDist[c] = (currDist[c] || 0) + 1;
    });
    const curriculumDistribution = Object.entries(currDist)
      .map(([k, v]) => ({ label: formatCurrLabel(k), value: v, key: k }))
      .sort((a, b) => b.value - a.value);

    // Age band distribution
    const bandDist = {};
    scholarsData.forEach(s => {
      const b = s.age_band || "unknown";
      bandDist[b] = (bandDist[b] || 0) + 1;
    });
    const ageBandDistribution = Object.entries(bandDist)
      .map(([k, v]) => ({ label: k.toUpperCase(), value: v, key: k }))
      .sort((a, b) => b.value - a.value);

    // Country distribution
    const countryDist = {};
    scholarsData.forEach(s => {
      const c = s.country || "Unknown";
      countryDist[c] = (countryDist[c] || 0) + 1;
    });
    const countryDistribution = Object.entries(countryDist)
      .map(([k, v]) => ({ label: k, value: v }))
      .sort((a, b) => b.value - a.value);

    // Subject distribution from quizzes
    const subjectDist = {};
    quizzesData.forEach(q => {
      const s = q.subject || "unknown";
      subjectDist[s] = (subjectDist[s] || 0) + 1;
    });
    const subjectDistribution = Object.entries(subjectDist)
      .map(([k, v]) => ({ label: k.replace(/_/g, " "), value: v }))
      .sort((a, b) => b.value - a.value);

    // Question bank by subject (top 10)
    const { data: qbSubjects } = await sq(
      () => supabaseAdmin.rpc("admin_question_subject_counts").catch(() => ({ data: null })),
      "qbSubjects"
    );
    // Fallback — use data we already know
    const questionBankBySubject = qbSubjects || [];

    // Signup trend (weekly, last 8 weeks)
    const signupTrend = buildWeeklyTrend(scholarsData, 8);
    const parentSignupTrend = buildWeeklyTrend(
      (allScholarsRes.data || []).length > 0
        ? scholarsData.map(s => ({ created_at: s.created_at })) // proxy
        : [],
      8
    );

    // Mastery tier distribution
    const tierDist = {};
    masteryData.forEach(m => {
      const t = m.current_tier || "unranked";
      tierDist[t] = (tierDist[t] || 0) + 1;
    });
    const masteryTierDistribution = Object.entries(tierDist)
      .map(([k, v]) => ({ label: k, value: v }))
      .sort((a, b) => b.value - a.value);

    // Engagement funnel
    const totalSignups = totalScholars;
    const firstQuizCompleted = activatedScholars;
    const multipleQuizzes = scholarsData.filter(s => {
      return quizzesData.filter(q => q.scholar_id === s.id).length >= 3;
    }).length;
    const hasXP = scholarsData.filter(s => s.total_xp > 0).length;

    // Recent scholars (last 20)
    const recentScholars = scholarsData.slice(0, 20).map(s => ({
      ...s,
      quiz_count: quizzesData.filter(q => q.scholar_id === s.id).length,
      topics_mastered: masteryData.filter(m => m.scholar_id === s.id).length,
    }));

    // Top performers
    const topPerformers = scholarsData
      .map(s => ({
        name: s.name,
        age_band: s.age_band,
        curriculum: s.curriculum,
        total_xp: s.total_xp || 0,
        quiz_count: quizzesData.filter(q => q.scholar_id === s.id).length,
        avg_accuracy: (() => {
          const sq = quizzesData.filter(q => q.scholar_id === s.id && q.accuracy != null);
          return sq.length > 0 ? Math.round(sq.reduce((a, q) => a + q.accuracy, 0) / sq.length) : 0;
        })(),
      }))
      .filter(s => s.quiz_count > 0)
      .sort((a, b) => b.total_xp - a.total_xp)
      .slice(0, 10);

    // ── Response ─────────────────────────────────────────────────────────
    return NextResponse.json({
      // Core KPIs
      kpis: {
        totalParents,
        totalScholars,
        totalQuestions: questionsRes.count ?? 0,
        activeQuestions: questionsActiveRes.count ?? 0,
        totalSessions: sessionsRes.count ?? 0,
        totalSchools: schoolsRes.count ?? 0,
        totalSubscriptions: subsRes.count ?? 0,
        totalQuizResults: quizRes.count ?? 0,
        totalTopicMastery: masteryData.length,
      },
      // Growth metrics (WoW)
      growth: {
        newScholars7d,
        prevScholars7d,
        scholarsGrowthPct: pctChange(newScholars7d, prevScholars7d),
        newParents7d,
        prevParents7d,
        parentsGrowthPct: pctChange(newParents7d, prevParents7d),
        quizzes7d,
        prevQuizzes7d,
        quizzesGrowthPct: pctChange(quizzes7d, prevQuizzes7d),
      },
      // Engagement & activation
      engagement: {
        activationRate,
        activatedScholars,
        avgAccuracy,
        avgTimeMin: parseFloat(avgTimeMin),
        scholarPerParent: parseFloat(scholarPerParent),
      },
      // Funnel
      funnel: {
        totalSignups,
        firstQuizCompleted,
        multipleQuizzes,
        hasXP,
      },
      // Distributions
      distributions: {
        curriculum: curriculumDistribution,
        ageBand: ageBandDistribution,
        country: countryDistribution,
        subject: subjectDistribution,
        masteryTier: masteryTierDistribution,
      },
      // Trends
      trends: {
        signupWeekly: signupTrend,
      },
      // Tables
      recentScholars,
      topPerformers,
    });
  } catch (err) {
    console.error("[admin/stats] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatCurrLabel(c) {
  const map = {
    uk_national: "UK National",
    ng_primary: "NG Primary",
    ng_jss: "NG JSS",
    ng_sss: "NG SSS",
    ca_primary: "CA Primary",
    ca_secondary: "CA Secondary",
    au_acara: "AU ACARA",
    us_common_core: "US Common Core",
    ib_pyp: "IB PYP",
    ib_myp: "IB MYP",
    "11_plus": "11+",
  };
  return map[c] || c.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
}

function buildWeeklyTrend(records, weeks) {
  const now = new Date();
  const buckets = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(now - (i + 1) * 7 * 86400000);
    const end = new Date(now - i * 7 * 86400000);
    const count = records.filter(r => {
      const d = new Date(r.created_at);
      return d >= start && d < end;
    }).length;
    const label = start.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    buckets.push({ label, value: count });
  }
  return buckets;
}
