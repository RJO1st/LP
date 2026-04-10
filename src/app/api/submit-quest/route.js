import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { submitQuestSchema, parseBody } from '@/lib/validation'

/**
 * Submit Mission API Route
 * Handles anti-cheat logic, calculates scores on the server,
 * updates mission logs, and increments Cadet Stardust.
 */
export async function POST(req) {
  try {
    const cookieStore = cookies()

    // ── Authentication check ──────────────────────────────────────────────
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) { return cookieStore.get(name)?.value },
        },
      }
    )
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const scholarId = session.user.id

    const body = await req.json();

    // ── Zod validation ─────────────────────────────────────────────────────
    const parsed = parseBody(submitQuestSchema, {
      subject: body.subject,
      answers: body.answers,
      timeSpent: body.timeSpent,
    })
    if (!parsed.success) return parsed.error

    const { subject, answers, timeSpent } = parsed.data

    // 1. Anti-Cheat: Validate time spent (e.g., questions can't be done in under 5 seconds)
    if (timeSpent < 5) {
      return NextResponse.json({ error: "Mission too swift. Flight telemetry suggests suspicious activity." }, { status: 400 });
    }

    // 3. Secure Score Calculation
    let actualScore = 0;
    answers.forEach(ans => {
      if (ans.selectedOption === ans.correctOption) {
        actualScore++;
      }
    });

    // REBRAND: XP is now Stardust
    const stardustEarned = actualScore * 50; 
    const accuracy = Math.round((actualScore / answers.length) * 100);

    // 4. Secure Transaction: Log the mission results
    // We maintain 'process_quest_result' to match your current Supabase RPC function name
    const { error: rpcError } = await supabase.rpc('process_quest_result', {
      s_id: scholarId,
      sub: subject,
      sc: actualScore,
      total_q: answers.length,
      acc: accuracy,
      xp: stardustEarned
    });

    if (rpcError) throw rpcError;

    return NextResponse.json({
      success: true,
      score: actualScore,
      stardustEarned: stardustEarned,
      accuracy: accuracy
    });

  } catch (error) {
    console.error("Mission Control Submission Error:", error);
    return NextResponse.json({ error: "Internal Telemetry Error" }, { status: 500 });
  }
}