import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from "next/server";
import { getServiceRoleClient } from '@/lib/security/serviceRole';
import { supabaseKeys } from '@/lib/env';


export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const scholar_id = searchParams.get("scholar_id");
    const period     = searchParams.get("period") || "month";

    if (!scholar_id) {
      return NextResponse.json({ error: "Missing scholar_id" }, { status: 400 });
    }

    // ── Authentication check ──────────────────────────────────────────────
    const cookieStore = await cookies();
    const authClient = createServerClient(
      supabaseKeys.url(),
      supabaseKeys.publishable(),
      {
        cookies: {
          getAll: () => cookieStore.getAll()
        }
      }
    );
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── Verify scholar belongs to this parent ──────────────────────────────
    const supabaseAdmin = getServiceRoleClient();
    const { data: scholar, error: scholarError } = await supabaseAdmin
      .from('scholars')
      .select('id')
      .eq('id', scholar_id)
      .eq('parent_id', user.id)
      .maybeSingle();

    if (scholarError || !scholar) {
      return NextResponse.json({ error: 'Unauthorized: scholar not found or does not belong to you' }, { status: 403 });
    }

    // Guard against missing env vars — return empty rather than crash
    let supabase;
    try {
      supabase = getServiceRoleClient();
    } catch (err) {
      console.error("[accuracy] Missing Supabase service role key:", err.message);
      return NextResponse.json([], { status: 200 });
    }

  // Calculate start date
  const now = new Date();
  let start;
  if (period === "week")       start = new Date(now.getTime() - 7  * 86_400_000);
  else if (period === "month") start = new Date(now.getTime() - 30 * 86_400_000);
  else                         start = new Date(0);

  // ── Primary: quiz_results ───────────────────────────────────────────────────
  const { data: qrData, error: qrError } = await supabase
    .from("quiz_results")
    .select("created_at, score, questions_total, accuracy")
    .eq("scholar_id", scholar_id)
    .gte("created_at", start.toISOString())
    .order("created_at", { ascending: true });

  if (qrError) {
    console.warn("[accuracy] quiz_results query failed:", qrError.message);
    // Fall through to session_answers fallback below
  }

  if (!qrError && qrData?.length > 0) {
    return NextResponse.json(buildDailyFromQR(qrData));
  }

  // ── Fallback: session_answers ───────────────────────────────────────────────
  // This table may not exist — treat any error as "no data", not a 500.
  const { data: saData, error: saError } = await supabase
    .from("session_answers")
    .select("created_at, answered_correctly")
    .eq("scholar_id", scholar_id)
    .gte("created_at", start.toISOString())
    .order("created_at", { ascending: true });

  if (saError) {
    // Table doesn't exist or query failed — return empty array, not 500
    if (saError.code !== "PGRST116" && !saError.message?.includes("does not exist")) {
      console.warn("[accuracy] session_answers query failed:", saError.message);
    }
    return NextResponse.json([]);
  }

  if (!saData?.length) {
    return NextResponse.json([]);
  }

  const dayMap = new Map();
  for (const row of saData) {
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
  } catch (err) {
    console.error('[accuracy] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── Helper ────────────────────────────────────────────────────────────────────
function buildDailyFromQR(rows) {
  const dayMap = new Map();
  for (const row of rows) {
    const day = new Date(row.created_at).toISOString().split("T")[0];
    const acc = row.accuracy ??
      (row.questions_total > 0 ? Math.round((row.score / row.questions_total) * 100) : 0);
    if (!dayMap.has(day)) dayMap.set(day, { total: 0, count: 0 });
    const entry = dayMap.get(day);
    entry.total += acc;
    entry.count += 1;
  }
  const result = [];
  dayMap.forEach((value, date) => {
    result.push({ date, accuracy: Math.round(value.total / value.count) });
  });
  return result;
}