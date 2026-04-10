import { createServerClient } from '@supabase/ssr';
import { createClient } from "@supabase/supabase-js";
import { cookies } from 'next/headers';
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const scholar_id = searchParams.get("scholar_id");

    if (!scholar_id) {
      return NextResponse.json({ error: "Missing scholar_id" }, { status: 400 });
    }

    // ── Authentication check ──────────────────────────────────────────────
    const cookieStore = await cookies();
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
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
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    const { data: scholar, error: scholarError } = await supabaseAdmin
      .from('scholars')
      .select('id')
      .eq('id', scholar_id)
      .eq('parent_id', user.id)
      .maybeSingle();

    if (scholarError || !scholar) {
      return NextResponse.json({ error: 'Unauthorized: scholar not found or does not belong to you' }, { status: 403 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

  // ── Primary: session_answers table (most granular) ─────────────────────────
  const { data: answerData, error: answerError } = await supabase
    .from("session_answers")
    .select("subject, topic, answered_correctly")
    .eq("scholar_id", scholar_id);

  if (!answerError && answerData && answerData.length > 0) {
    return NextResponse.json(aggregateAnswers(answerData));
  }

  // ── Fallback: scholar_topic_mastery (always available) ─────────────────────
  const { data: masteryData, error: masteryError } = await supabase
    .from("scholar_topic_mastery")
    .select("subject, topic, mastery_score, times_seen, times_correct")
    .eq("scholar_id", scholar_id);

  if (masteryError) {
    return NextResponse.json({ error: masteryError.message }, { status: 500 });
  }

    return NextResponse.json(
      (masteryData ?? []).map((r) => ({
        subject:  r.subject,
        topic:    r.topic || "general",
        score:    Math.round((r.mastery_score ?? 0) * 100),
        attempts: r.times_seen ?? 0,
      }))
    );
  } catch (err) {
    console.error('[skills] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
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
    // session_answers uses answered_correctly (boolean)
    if (row.answered_correctly || row.is_correct) map[key].correct += 1;
  }

  return Object.values(map).map((s) => ({
    subject:  s.subject,
    topic:    s.topic,
    score:    s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
    attempts: s.total,
  }));
}