// app/api/send-first-quiz-email/route.js
// Legacy path — also covered by /resend-verification/send-first-quiz-email
import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';
import { EMAIL_TEMPLATES } from '@/lib/emailTemplates';
import { firstQuizEmailSchema } from '@/lib/validation';

export async function POST(request) {
  const rawBody = await request.json().catch(() => null);
  const parsed  = firstQuizEmailSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: 'parentEmail is required and must be valid' }, { status: 400 });
  }
  const { parentEmail, parentName, scholarName, subject, score, totalQuestions, xpEarned } = parsed.data;

  const template = EMAIL_TEMPLATES.firstQuiz(
    parentName, scholarName, subject, score, totalQuestions, xpEarned
  );

  try {
    await sendEmail({
      to: { email: parentEmail, name: parentName },
      subject: template.subject,
      htmlContent: template.htmlContent,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending first-quiz email:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}