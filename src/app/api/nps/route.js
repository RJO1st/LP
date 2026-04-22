import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { npsSchema, parseBody } from '@/lib/validation'
import { getServiceRoleClient } from '@/lib/security/serviceRole'
import { supabaseKeys } from '@/lib/env'


/**
 * POST /api/nps
 *
 * Saves an NPS survey response to quest_analytics_events.
 * Called by NPSPrompt.jsx after a scholar rates LaunchPard.
 *
 * Body: { score: 0-10, comment?: string, curriculum?: string }
 */
export async function POST(req) {
  try {
    const cookieStore = cookies()

    // ── Authentication ────────────────────────────────────────────────────────
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

    // ── Zod validation ────────────────────────────────────────────────────────
    const raw = await req.json()
    const parsed = parseBody(npsSchema, raw)
    if (!parsed.success) return parsed.error

    const { score, comment, curriculum: bodycurriculum } = parsed.data

    // ── Fetch scholar metadata (curriculum, year_level) ───────────────────────
    // Use service client so we can always read the scholars row regardless of
    // any restrictive RLS on the scholars table for anon queries.
    const serviceClient = getServiceRoleClient()

    const { data: scholar } = await serviceClient
      .from('scholars')
      .select('curriculum, year_level')
      .eq('id', scholarId)
      .maybeSingle()

    const curriculum = bodycurriculum || scholar?.curriculum || 'uk_national'
    const yearLevel  = scholar?.year_level || 1

    // ── Derive device type from User-Agent ────────────────────────────────────
    const ua         = req.headers.get('user-agent') || ''
    const deviceType = /mobile/i.test(ua)       ? 'mobile'
      : /tablet|ipad/i.test(ua) ? 'tablet'
      : 'desktop'

    // ── Insert NPS event ──────────────────────────────────────────────────────
    const { error: insertErr } = await serviceClient
      .from('quest_analytics_events')
      .insert({
        scholar_id:  scholarId,
        curriculum,
        year_level:  yearLevel,
        event_type:  'nps_response',
        nps_score:   score,
        nps_comment: comment?.trim() || null,
        device_type: deviceType,
      })

    if (insertErr) {
      console.error('[/api/nps] Insert failed:', insertErr?.message)
      // Still return success — NPS failure must never block the scholar
      // (NPSPrompt already handles this gracefully client-side)
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('[/api/nps] Unexpected error:', error)
    // Non-critical endpoint — return 200 so the client doesn't alert the user
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 200 })
  }
}
