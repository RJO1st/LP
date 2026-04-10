// src/app/api/admin/fill/route.js
// Thin server-side wrapper so the client never needs CRON_SECRET
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// List of admin email addresses — extend as needed
const ADMIN_EMAILS = [
  'admin@launchpard.com',
  'founder@launchpard.com',
];

export async function GET(req) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {}
        },
      },
    }
  );

  // ── Authentication check ──────────────────────────────────────────────
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── Admin role verification ───────────────────────────────────────────
  const userEmail = session.user.email;
  const isAdmin = ADMIN_EMAILS.includes(userEmail);

  if (!isAdmin) {
    return NextResponse.json(
      { error: 'Access denied. Admin privileges required.' },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(req.url);
  const curriculum = searchParams.get('curriculum') || 'uk_11plus';
  const subject    = searchParams.get('subject')    || null;
  const tier       = searchParams.get('tier')       || null;

  // Build the batch-generate URL (same server, same host)
  const host  = req.headers.get('host') || 'localhost:3000';
  const proto = host.includes('localhost') ? 'http' : 'https';
  const params = new URLSearchParams({ curriculum });
  if (subject) params.set('subject', subject);
  if (tier)    params.set('tier',    tier);

  const url = `${proto}://${host}/api/batch-generate?${params}`;

  try {
    const res  = await fetch(url, {
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}