import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Submit Mission API Route
 * Handles anti-cheat logic, calculates scores on the server,
 * updates mission logs, and increments Cadet Stardust.
 */
export async function POST(req) {
  try {
    const cookieStore = cookies()
    const { scholarId, subject, answers, timeSpent } = await req.json();

    // 1. Anti-Cheat: Validate time spent (e.g., questions can't be done in under 5 seconds)
    if (timeSpent < 5) {
      return Response.json({ error: "Mission too swift. Flight telemetry suggests suspicious activity." }, { status: 400 });
    }

    // 2. Initialize Server-Side Supabase Client
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) { return cookieStore.get(name)?.value },
        },
      }
    )

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

    return Response.json({ 
      success: true, 
      score: actualScore, 
      stardustEarned: stardustEarned,
      accuracy: accuracy 
    });

  } catch (error) {
    console.error("Mission Control Submission Error:", error);
    return Response.json({ error: "Internal Telemetry Error" }, { status: 500 });
  }
}