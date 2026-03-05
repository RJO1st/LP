import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const PERIOD_OFFSETS = {
  week:  (d) => { d.setDate(d.getDate() - 7);         return d; },
  month: (d) => { d.setMonth(d.getMonth() - 1);       return d; },
  year:  (d) => { d.setFullYear(d.getFullYear() - 1); return d; },
  all:   ()  => new Date(0),
};

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const scholar_id = searchParams.get("scholar_id");
  const period     = searchParams.get("period") || "week";

  if (!scholar_id) {
    return NextResponse.json({ error: "Missing scholar_id" }, { status: 400 });
  }

  if (!PERIOD_OFFSETS[period]) {
    return NextResponse.json(
      { error: `Invalid period. Use: ${Object.keys(PERIOD_OFFSETS).join(", ")}` },
      { status: 400 }
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const startDate = PERIOD_OFFSETS[period](new Date());

  const { data, error } = await supabase
    .from("quiz_results")
    .select("completed_at, time_spent_seconds")
    .eq("scholar_id", scholar_id)
    .gte("completed_at", startDate.toISOString())
    .order("completed_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // ── Aggregate seconds → minutes per day ────────────────────────────────────
  const dayMap = new Map();

  for (const row of data ?? []) {
    const day     = row.completed_at.slice(0, 10); // "YYYY-MM-DD"
    const seconds = row.time_spent_seconds ?? 0;
    dayMap.set(day, (dayMap.get(day) ?? 0) + seconds);
  }

  // ── Fill in every day in range (zeros for days with no activity) ───────────
  const result = [];
  const cursor = new Date(startDate);
  const today  = new Date();
  today.setHours(23, 59, 59, 999);

  while (cursor <= today) {
    const key = cursor.toISOString().slice(0, 10);
    result.push({
      date:    key,
      minutes: Math.round((dayMap.get(key) ?? 0) / 60),
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return NextResponse.json(result);
}