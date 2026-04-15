import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * POST /api/parent/consent
 * Parent gives consent to share their child's data with a school.
 *
 * Body: { scholar_id, school_id }
 * Auth: parent must be logged in and own the scholar
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

    const parentId = session.user.id

    // ── Parse request ────────────────────────────────────────────────────
    const body = await request.json()
    const { scholar_id, school_id } = body

    if (!scholar_id || !school_id) {
      return NextResponse.json(
        { error: 'Missing scholar_id or school_id' },
        { status: 400 }
      )
    }

    // ── Verify parent owns scholar ────────────────────────────────────────
    const { data: scholar, error: scholarError } = await supabase
      .from('scholars')
      .select('id, parent_id')
      .eq('id', scholar_id)
      .single()

    if (scholarError || !scholar) {
      return NextResponse.json(
        { error: 'Scholar not found' },
        { status: 404 }
      )
    }

    if (scholar.parent_id !== parentId) {
      return NextResponse.json(
        { error: 'You do not own this scholar' },
        { status: 403 }
      )
    }

    // ── Verify school exists ─────────────────────────────────────────────
    const { data: school, error: schoolError } = await supabase
      .from('schools')
      .select('id')
      .eq('id', school_id)
      .single()

    if (schoolError || !school) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      )
    }

    // ── Get client IP and user agent from headers ────────────────────────
    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      request.headers.get('cf-connecting-ip') ||
      'unknown'

    const userAgent = request.headers.get('user-agent') || null

    // ── Use service role for upsert (to bypass RLS) ──────────────────────
    const serviceSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
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

    // ── Upsert consent record ────────────────────────────────────────────
    const { data: consentRecord, error: consentError } = await serviceSupabase
      .from('scholar_school_consent')
      .upsert(
        {
          scholar_id,
          school_id,
          parent_id: parentId,
          consent_given_at: new Date().toISOString(),
          consent_ip: clientIp,
          consent_user_agent: userAgent,
          revoked_at: null,
          revoke_reason: null,
        },
        {
          onConflict: 'scholar_id,school_id',
        }
      )
      .select()
      .single()

    if (consentError) {
      console.error('Consent upsert error:', consentError)
      return NextResponse.json(
        { error: 'Failed to save consent record' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      consentId: consentRecord.id,
    })
  } catch (err) {
    console.error('POST /api/parent/consent error:', err)
    return NextResponse.json(
      { error: err.message || 'An error occurred' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/parent/consent
 * Parent revokes consent for a school to see their child's data.
 *
 * Body: { scholar_id, school_id, reason? }
 * Auth: parent must be logged in and own the scholar
 */
export async function DELETE(request) {
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

    const parentId = session.user.id

    // ── Parse request ────────────────────────────────────────────────────
    const body = await request.json()
    const { scholar_id, school_id, reason } = body

    if (!scholar_id || !school_id) {
      return NextResponse.json(
        { error: 'Missing scholar_id or school_id' },
        { status: 400 }
      )
    }

    // ── Verify parent owns scholar ────────────────────────────────────────
    const { data: scholar, error: scholarError } = await supabase
      .from('scholars')
      .select('id, parent_id')
      .eq('id', scholar_id)
      .single()

    if (scholarError || !scholar) {
      return NextResponse.json(
        { error: 'Scholar not found' },
        { status: 404 }
      )
    }

    if (scholar.parent_id !== parentId) {
      return NextResponse.json(
        { error: 'You do not own this scholar' },
        { status: 403 }
      )
    }

    // ── Use service role for revocation ──────────────────────────────────
    const serviceSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
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

    // ── Update consent record to mark as revoked ────────────────────────
    const { error: revokeError } = await serviceSupabase
      .from('scholar_school_consent')
      .update({
        revoked_at: new Date().toISOString(),
        revoke_reason: reason || null,
      })
      .eq('scholar_id', scholar_id)
      .eq('school_id', school_id)
      .eq('parent_id', parentId)

    if (revokeError) {
      console.error('Consent revoke error:', revokeError)
      return NextResponse.json(
        { error: 'Failed to revoke consent' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/parent/consent error:', err)
    return NextResponse.json(
      { error: err.message || 'An error occurred' },
      { status: 500 }
    )
  }
}
