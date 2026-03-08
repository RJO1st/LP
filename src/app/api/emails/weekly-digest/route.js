// Deploy to: src/app/api/emails/weekly-digest/route.js
import { NextResponse } from 'next/server';
import { sendWeeklyDigestEmail } from '@/lib/email';

// POST body: { parentEmail, parentName, scholars: [...] }
// Called directly by the cron job at /api/cron/weekly-digest
export async function POST(request) {
  try {
    const { parentEmail, parentName, scholars } = await request.json();
    if (!parentEmail) return NextResponse.json({ error: 'parentEmail required' }, { status: 400 });

    await sendWeeklyDigestEmail({ parentEmail, parentName, scholars });
    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error('[weekly-digest email]', err?.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}