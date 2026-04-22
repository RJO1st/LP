import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { submitQuestSchema, parseBody } from '@/lib/validation'
import { getServiceRoleClient } from '@/lib/security/serviceRole'
import { supabaseKeys } from '@/lib/env'


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
      supabaseKeys.publishable(),
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

    // ── Analytics event: quest_completed ─────────────────────────────────
    // Fire-and-forget — never let analytics block the quest result response.
    try {
      // Fetch scholar metadata for denormalised event columns
      const serviceClient = getServiceRoleClient()
      const { data: scholar } = await serviceClient
        .from('scholars')
        .select('curriculum, year_level')
        .eq('id', scholarId)
        .maybeSingle()

      if (scholar) {
        // Derive device_type from User-Agent
        const ua = req.headers.get('user-agent') || ''
        const deviceType = /mobile/i.test(ua) ? 'mobile'
          : /tablet|ipad/i.test(ua) ? 'tablet'
          : 'desktop'

        await serviceClient.from('quest_analytics_events').insert({
          scholar_id:         scholarId,
          curriculum:         scholar.curriculum || 'uk_national',
          year_level:         scholar.year_level  || 1,
          event_type:         'quest_completed',
          subject,
          score:              actualScore,
          total_questions:    answers.length,
          accuracy,
          time_spent_seconds: body.timeSpent ?? null,
          topic_slug:         body.topicSlug   ?? null,
          session_id:         body.sessionId   ?? null,
          device_type:        deviceType,
        })
      }
    } catch (analyticsErr) {
      // Never fail the main request over analytics
      console.warn('[submit-quest] Analytics insert failed:', analyticsErr?.message)
    }

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