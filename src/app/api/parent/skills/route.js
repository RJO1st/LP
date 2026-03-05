import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const scholar_id = searchParams.get("scholar_id");

  if (!scholar_id) {
    return NextResponse.json({ error: "Missing scholar_id" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // ── Primary: session_answers table (most granular) ─────────────────────────
  const { data: answerData, error: answerError } = await supabase
    .from("session_answers")
    .select("subject, topic, is_correct")
    .eq("scholar_id", scholar_id);

  if (!answerError && answerData && answerData.length > 0) {
    return NextResponse.json(aggregateAnswers(answerData));
  }

  // ── Fallback: parse quiz_results.details JSONB ─────────────────────────────
  const { data: qrData, error: qrError } = await supabase
    .from("quiz_results")
    .select("subject, details")
    .eq("scholar_id", scholar_id);

  if (qrError) {
    return NextResponse.json({ error: qrError.message }, { status: 500 });
  }

  const flatAnswers = [];
  for (const row of qrData ?? []) {
    if (!Array.isArray(row.details)) continue;
    for (const d of row.details) {
      flatAnswers.push({
        subject:    d.subject   || row.subject || "maths",
        topic:      d.topic     || "general",
        is_correct: d.correct   ?? false,
      });
    }
  }

  return NextResponse.json(aggregateAnswers(flatAnswers));
}

// ── Helper: group by subject+topic → score + attempts ───────────────────────
function aggregateAnswers(rows) {
  const map = {};

  for (const row of rows) {
    const key = `${row.subject}__${row.topic || "general"}`;
    if (!map[key]) {
      map[key] = {
        subject:  row.subject,
        topic:    row.topic || "general",
        correct:  0,
        total:    0,
      };
    }
    map[key].total += 1;
    if (row.is_correct) map[key].correct += 1;
  }

  return Object.values(map).map((s) => ({
    subject:  s.subject,
    topic:    s.topic,
    score:    s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
    attempts: s.total,
  }));
}