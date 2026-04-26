// app/api/send-welcome-email/route.js
// Called server-side from /api/auth/callback after OAuth signup — no session exists yet.
import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';
import { EMAIL_TEMPLATES } from '@/lib/emailTemplates';
import { welcomeEmailSchema } from '@/lib/validation';

export async function POST(request) {
  const rawBody = await request.json().catch(() => null);
  const parsed  = welcomeEmailSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: 'email is required and must be valid' }, { status: 400 });
  }
  const { email, name } = parsed.data;

  const template = EMAIL_TEMPLATES.welcome(name);

  try {
    await sendEmail({
      to: email,
      subject: template.subject,
      htmlContent: template.htmlContent,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}