// src/app/api/resend-verification/send-scholar-created-email/route.js
// POST body: { parentEmail, parentName, scholarName, questCode, curriculum, yearLevel }
import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';
import { EMAIL_TEMPLATES } from '@/lib/emailTemplates';
import { legacyScholarCreatedEmailSchema } from '@/lib/validation';

export async function POST(request) {
  const rawBody = await request.json().catch(() => null);
  const parsed  = legacyScholarCreatedEmailSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: 'parentEmail and scholarName are required' }, { status: 400 });
  }
  const { parentEmail, parentName, scholarName, questCode, curriculum, yearLevel } = parsed.data;

  const template = EMAIL_TEMPLATES.scholarCreated(
    parentName,
    scholarName,
    questCode,
    curriculum,
    yearLevel
  );

  try {
    await sendEmail({
      to: [{ email: parentEmail, name: parentName }],
      subject: template.subject,
      htmlContent: template.htmlContent,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending scholar created email:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}