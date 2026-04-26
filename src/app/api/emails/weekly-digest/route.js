// src/app/api/emails/weekly-digest/route.js
// POST body: { parentEmail, parentName, scholars: [...] }
// Called by the cron job at /api/cron/weekly-digest (internal only — not user-facing)
import { NextResponse } from 'next/server';
import { sendWeeklyDigestEmail } from '@/lib/email';
import { weeklyDigestSchema } from '@/lib/validation';

export async function POST(request) {
  const rawBody = await request.json().catch(() => null);
  const parsed  = weeklyDigestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: 'parentEmail is required and must be valid' }, { status: 400 });
  }
  const { parentEmail, parentName, scholars } = parsed.data;

  try {
    await sendWeeklyDigestEmail({ parentEmail, parentName, scholars });
    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error('[weekly-digest email]', err?.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}