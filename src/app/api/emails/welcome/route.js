// src/app/api/emails/welcome/route.js
// POST body: { email, name }
// Called from: signup page after successful signUp (no session exists yet → no auth guard)
import { NextResponse } from 'next/server';
import { sendWelcomeEmail } from '@/lib/email';
import { welcomeEmailSchema } from '@/lib/validation';

export async function POST(request) {
  const rawBody = await request.json().catch(() => null);
  const parsed  = welcomeEmailSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: 'email is required and must be valid' }, { status: 400 });
  }
  const { email, name } = parsed.data;

  try {
    await sendWelcomeEmail({ parentEmail: email, parentName: name });
    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error('[welcome email]', err?.message);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
