/**
 * GET /api/parent/value-report?scholarId=
 *
 * Returns monthly learning stats for a scholar, used to render the
 * Parent Dashboard "Value Report" card.
 *
 * Returns: { questionsThisMonth, topicsMasteredThisMonth, readinessDelta, streakDays }
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const scholarId = searchParams.get("scholarId");
    if (!scholarId) return NextResponse.json({ error: "scholarId required" }, { status: 400 });

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { cookies: { getAll: () => cookieStore.getAll() } }
    );

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    // Date range: start of current calendar month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();

    // Questions answered this month
    // We look at exam_answers (most reliable activity signal)
    const { count: questionsThisMonth } = await supabase
      .from("exam_answers")
      .select("id", { count: "exact", head: true })
      .eq("scholar_id", scholarId)
      .gte("created_at", monthStart);

    // Topics mastered this month — mastery crossed 0.8 threshold this month
    // Proxy: count topics where p_mastery >= 0.8 and updated_at >= monthStart
    const { count: topicsMasteredThisMonth } = await supabase
      .from("scholar_topic_mastery")
      .select("id", { count: "exact", head: true })
      .eq("scholar_id", scholarId)
      .gte("p_mastery", 0.8)
      .gte("updated_at", monthStart)
      .catch(() => ({ count: 0 }));

    // Readiness snapshots: compare this month vs last month
    const { data: latestSnapshot } = await supabase
      .from("scholar_readiness_snapshot")
      .select("overall_score, snapshot_date")
      .eq("scholar_id", scholarId)
      .order("snapshot_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: lastMonthSnapshot } = await supabase
      .from("scholar_readiness_snapshot")
      .select("overall_score, snapshot_date")
      .eq("scholar_id", scholarId)
      .gte("snapshot_date", lastMonthStart)
      .lt("snapshot_date", monthStart)
      .order("snapshot_date", { ascending: true })
      .limit(1)
      .maybeSingle();

    const currentScore = latestSnapshot?.overall_score ?? null;
    const prevScore    = lastMonthSnapshot?.overall_score ?? null;
    const readinessDelta = currentScore !== null && prevScore !== null
      ? Math.round(currentScore - prevScore)
      : null;

    // Streak: count distinct days with any exam_answers activity in the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: activityDays } = await supabase
      .from("exam_answers")
      .select("created_at")
      .eq("scholar_id", scholarId)
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: false });

    // Count unique calendar days
    const uniqueDays = new Set(
      (activityDays || []).map((r) => r.created_at?.split("T")[0])
    );

    // Calculate current streak (consecutive days ending today)
    let streakDays = 0;
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      if (uniqueDays.has(key)) { streakDays++; } else { break; }
    }

    // Total topics mastered (all time) for context
    const { count: totalTopicsMastered } = await supabase
      .from("scholar_topic_mastery")
      .select("id", { count: "exact", head: true })
      .eq("scholar_id", scholarId)
      .gte("p_mastery", 0.8);

    return NextResponse.json({
      questionsThisMonth: questionsThisMonth ?? 0,
      topicsMasteredThisMonth: topicsMasteredThisMonth ?? 0,
      totalTopicsMastered: totalTopicsMastered ?? 0,
      readinessDelta,
      currentScore: currentScore ? Math.round(currentScore) : null,
      streakDays,
      month: now.toLocaleString("en-GB", { month: "long" }),
    });
  } catch (err) {
    console.error("[value-report]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
