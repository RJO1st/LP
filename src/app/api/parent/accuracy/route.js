import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const scholar_id = searchParams.get("scholar_id");
  const period = searchParams.get("period") || "month";

  if (!scholar_id) {
    return NextResponse.json({ error: "Missing scholar_id" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Calculate start date
  const now = new Date();
  let start;
  if (period === "week") start = new Date(now.getTime() - 7 * 86_400_000);
  else if (period === "month") start = new Date(now.getTime() - 30 * 86_400_000);
  else start = new Date(0);

  // ── Primary: quiz_results with score + questions_total (no details needed) ──
  const { data: qrData, error: qrError } = await supabase
    .from("quiz_results")
    .select("created_at, score, questions_total, accuracy")
    .eq("scholar_id", scholar_id)
    .gte("created_at", start.toISOString())
    .order("created_at", { ascending: true });

  if (!qrError && qrData && qrData.length > 0) {
    const dayMap = new Map();
    for (const row of qrData) {
      const day = new Date(row.created_at).toISOString().split("T")[0];
      // Use stored accuracy if available, otherwise compute from score/total
      const acc = row.accuracy ?? (row.questions_total > 0
        ? Math.round((row.score / row.questions_total) * 100) : 0);
      if (!dayMap.has(day)) dayMap.set(day, { total: 0, count: 0 });
      const entry = dayMap.get(day);
      entry.total += acc;
      entry.count += 1;
    }

    const result = [];
    dayMap.forEach((value, date) => {
      result.push({ date, accuracy: Math.round(value.total / value.count) });
    });
    return NextResponse.json(result);
  }

  // ── Fallback: session_answers (per-answer granularity) ─────────────────────
  const { data: saData, error: saError } = await supabase
    .from("session_answers")
    .select("created_at, answered_correctly")
    .eq("scholar_id", scholar_id)
    .gte("created_at", start.toISOString())
    .order("created_at", { ascending: true });

  if (saError) {
    return NextResponse.json({ error: saError.message }, { status: 500 });
  }

  const dayMap = new Map();
  for (const row of (saData ?? [])) {
    const day = new Date(row.created_at).toISOString().split("T")[0];
    if (!dayMap.has(day)) dayMap.set(day, { correct: 0, total: 0 });
    const entry = dayMap.get(day);
    entry.total += 1;
    if (row.answered_correctly) entry.correct += 1;
  }

  const result = [];
  dayMap.forEach((value, date) => {
    result.push({
      date,
      accuracy: value.total > 0 ? Math.round((value.correct / value.total) * 100) : 0,
    });
  });

  return NextResponse.json(result);
}