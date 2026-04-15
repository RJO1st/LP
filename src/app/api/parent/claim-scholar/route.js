import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * POST /api/parent/claim-scholar
 * Parent claims a scholar using a validation code from school invitation.
 * Requires: authenticated parent user (via session cookies)
 */
export async function POST(request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    // ── Auth: get session ─────────────────────────────────────────────────
    const { data: { session } } = await supabase.auth.getSession()
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const userEmail = session.user.email

    // ── Parse request ────────────────────────────────────────────────────
    const body = await request.json()
    const { validation_code } = body

    if (!validation_code) {
      return NextResponse.json(
        { error: 'Missing validation_code' },
        { status: 400 }
      )
    }

    // ── Look up invitation ───────────────────────────────────────────────
    const { data: invitation, error: inviteError } = await supabase
      .from('scholar_invitations')
      .select('id, scholar_id, parent_email, parent_phone, status, expires_at')
      .eq('validation_code', validation_code)
      .eq('status', 'pending')
      .gte('expires_at', new Date().toISOString())
      .single()

    if (inviteError || !invitation) {
      return NextResponse.json(
        { error: 'Invalid or expired code' },
        { status: 404 }
      )
    }

    // ── Verify email match (if parent_email is set) ──────────────────────
    if (invitation.parent_email && invitation.parent_email.toLowerCase() !== userEmail.toLowerCase()) {
      return NextResponse.json(
        { error: 'Email mismatch. This code is for a different parent.' },
        { status: 403 }
      )
    }

    // ── Begin transaction: claim scholar ─────────────────────────────────
    // 1. Update scholar.parent_id
    const { error: scholarError } = await supabase
      .from('scholars')
      .update({ parent_id: userId })
      .eq('id', invitation.scholar_id)

    if (scholarError) {
      console.error('Scholar update error:', scholarError)
      return NextResponse.json(
        { error: 'Failed to claim scholar' },
        { status: 500 }
      )
    }

    // 2. Mark invitation as claimed
    const { error: inviteUpdateError } = await supabase
      .from('scholar_invitations')
      .update({ status: 'claimed' })
      .eq('id', invitation.id)

    if (inviteUpdateError) {
      console.error('Invitation update error:', inviteUpdateError)
      return NextResponse.json(
        { error: 'Failed to mark invitation as claimed' },
        { status: 500 }
      )
    }

    // 3. Ensure parent record exists
    const { data: parentData, error: parentFetchError } = await supabase
      .from('parents')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (parentFetchError) {
      // Parent doesn't exist yet, create with defaults
      const { error: parentCreateError } = await supabase
        .from('parents')
        .insert({
          user_id: userId,
          subscription_status: 'active',
          subscription_tier: 'free',
          region: 'GB',
          currency: 'GBP',
        })

      if (parentCreateError) {
        console.error('Parent creation error:', parentCreateError)
        return NextResponse.json(
          { error: 'Failed to create parent record' },
          { status: 500 }
        )
      }
    }

    // ── Fetch scholar details ────────────────────────────────────────────
    const { data: scholar, error: scholarFetchError } = await supabase
      .from('scholars')
      .select('id, name, year_level, curriculum, codename, access_code')
      .eq('id', invitation.scholar_id)
      .single()

    if (scholarFetchError || !scholar) {
      return NextResponse.json(
        { error: 'Failed to fetch scholar details' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      scholar: {
        id: scholar.id,
        name: scholar.name,
        year_level: scholar.year_level,
        curriculum: scholar.curriculum,
        codename: scholar.codename,
        access_code: scholar.access_code,
      },
    })
  } catch (err) {
    console.error('Claim scholar error:', err)
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    )
  }
}
