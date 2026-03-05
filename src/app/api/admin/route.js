// src/app/api/admin/fill/route.js
// Thin server-side wrapper so the client never needs CRON_SECRET
import { NextResponse } from 'next/server';

export async function GET(req) {
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