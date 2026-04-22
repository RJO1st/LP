// src/app/api/admin/fill/route.js
// Thin server-side wrapper so the client never needs CRON_SECRET
//
// NOTE (April 22 2026 security audit): previously carried its own ADMIN_EMAILS
// array. Identity checks now go through requireAdmin() (env-driven).
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/security/admin';

export async function GET(req) {
  // ── Admin auth (401 if not signed in, 403 if email not in allow-list) ──
  const { error: adminError } = await requireAdmin(req);
  if (adminError) return adminError;

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