import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/**
 * GET /api/parent/scholar-readiness?scholar_id=<id>
 *
 * Returns readiness data for a single scholar enrolled at a partner school.
 * Verifies the caller is the parent of that scholar.
 *
 * @query scholar_id — UUID of the scholar
 * @returns {Promise<{
 *   overall_score:      number,
 *   grade_band:         string (Ready/Developing/Needs Support),
 *   subjectScores:      {mathematics, english, verbal_reasoning, nvr},
 *   topicWeaknesses:    [{topic, mastery, ...}],
 *   snapshot_date:      ISO date,
 * }>}
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const scholarId = searchParams.get("scholar_id");

  if (!scholarId) {
    return NextResponse.json(
      { error: "scholar_id query param required" },
      { status: 400 }
    );
  }

  try {
    const cookieStore = await cookies();

    // Auth client — verify session
    const authSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { cookies: { getAll: () => cookieStore.getAll() } }
    );

    const { data: { user }, error: authErr } = await authSupabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    // Service client — for reading scholar + mastery data
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Verify scholar exists and belongs to this parent
    const { data: scholar, error: sErr } = await serviceSupabase
      .from("scholars")
      .select("id, parent_id, name")
      .eq("id", scholarId)
      .single();

    if (sErr || !scholar) {
      return NextResponse.json({ error: "Scholar not found" }, { status: 404 });
    }

    // Verify caller is the parent
    if (scholar.parent_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch latest readiness snapshot for this scholar
    const { data: snapshot, error: snapErr } = await serviceSupabase
      .from("scholar_readiness_snapshot")
      .select("*")
      .eq("scholar_id", scholarId)
      .eq("exam_type", "secondary_entrance")
      .order("snapshot_date", { ascending: false })
      .limit(1)
      .single();

    if (snapErr || !snapshot) {
      // No snapshot yet — compute on-demand from mastery
      return computeReadinessOnDemand(scholarId, serviceSupabase);
    }

    // Enhance snapshot with topic weaknesses (computed from mastery)
    const topicWeaknesses = await getTopicWeaknesses(scholarId, serviceSupabase);

    return NextResponse.json({
      overall_score: snapshot.overall_score,
      grade_band: snapshot.grade_band,
      subjectScores: {
        mathematics: snapshot.maths_score,
        english: snapshot.english_score,
        verbal_reasoning: snapshot.vr_score,
        nvr: snapshot.nvr_score,
      },
      topicWeaknesses,
      snapshot_date: snapshot.snapshot_date,
    });
  } catch (err) {
    console.error("[scholar-readiness API]", err.message);
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 }
    );
  }
}

/**
 * Compute readiness on-demand if no snapshot exists.
 */
async function computeReadinessOnDemand(scholarId, supabase) {
  const { data: mastery } = await supabase
    .from("scholar_topic_mastery")
    .select("scholar_id, subject, mastery_score, stability, updated_at")
    .eq("scholar_id", scholarId);

  if (!mastery || mastery.length === 0) {
    return NextResponse.json({
      overall_score: 0,
      grade_band: "Needs Support",
      subjectScores: { mathematics: 0, english: 0, verbal_reasoning: 0, nvr: 0 },
      topicWeaknesses: [],
      snapshot_date: new Date().toISOString().slice(0, 10),
    });
  }

  // Simple overall average (in production, use the full formula from analyticsEngine)
  const overallScore = Math.round(
    mastery.reduce((sum, m) => sum + m.mastery_score * 100, 0) / mastery.length
  );
  const gradeBand = overallScore >= 70 ? "Ready" : overallScore >= 50 ? "Developing" : "Needs Support";

  // Subject averages
  const subjectMap = {};
  for (const m of mastery) {
    if (!subjectMap[m.subject]) subjectMap[m.subject] = [];
    subjectMap[m.subject].push(m.mastery_score * 100);
  }
  const subjectScores = {
    mathematics: subjectMap.mathematics ? Math.round(subjectMap.mathematics.reduce((a, b) => a + b) / subjectMap.mathematics.length) : 0,
    english: subjectMap.english ? Math.round(subjectMap.english.reduce((a, b) => a + b) / subjectMap.english.length) : 0,
    verbal_reasoning: subjectMap.verbal_reasoning ? Math.round(subjectMap.verbal_reasoning.reduce((a, b) => a + b) / subjectMap.verbal_reasoning.length) : 0,
    nvr: subjectMap.nvr ? Math.round(subjectMap.nvr.reduce((a, b) => a + b) / subjectMap.nvr.length) : 0,
  };

  const topicWeaknesses = await getTopicWeaknesses(scholarId, supabase);

  return NextResponse.json({
    overall_score: overallScore,
    grade_band: gradeBand,
    subjectScores,
    topicWeaknesses,
    snapshot_date: new Date().toISOString().slice(0, 10),
  });
}

/**
 * Get the weakest topics for a scholar.
 */
async function getTopicWeaknesses(scholarId, supabase) {
  const { data: mastery } = await supabase
    .from("scholar_topic_mastery")
    .select("topic, mastery_score, subject")
    .eq("scholar_id", scholarId)
    .order("mastery_score", { ascending: true })
    .limit(5);

  if (!mastery) return [];

  return mastery.map((m) => ({
    topic: m.topic.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    mastery: Math.round(m.mastery_score * 100),
    subject: m.subject,
  }));
}
