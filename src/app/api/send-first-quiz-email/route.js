// app/api/send-first-quiz-email/route.js
import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';
import { EMAIL_TEMPLATES } from '@/lib/emailTemplates';

export async function POST(request) {
  try {
    const {
      parentEmail, parentName,
      scholarName, subject,
      score, totalQuestions, xpEarned,
    } = await request.json();

    if (!parentEmail) {
      return NextResponse.json({ error: 'parentEmail is required' }, { status: 400 });
    }

    const template = EMAIL_TEMPLATES.firstQuiz(
      parentName, scholarName, subject, score, totalQuestions, xpEarned
    );

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