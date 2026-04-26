// src/app/api/emails/first-quiz/route.js
// POST body: { parentEmail, parentName, scholarName, subject, score, totalQuestions, xpEarned }
// Called from: quizUtils.js saveQuizResult after first quiz completion
import { NextResponse } from 'next/server';
import { sendFirstQuizEmail } from '@/lib/email';
import { firstQuizEmailSchema } from '@/lib/validation';

export async function POST(req) {
  const rawBody = await req.json().catch(() => null);
  const parsed  = firstQuizEmailSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: 'parentEmail is required and must be valid' }, { status: 400 });
  }
  const { parentEmail, parentName, scholarName, subject, score, totalQuestions, xpEarned } = parsed.data;

  try {
    await sendFirstQuizEmail({ parentEmail, parentName, scholarName, score, total: totalQuestions, subject, xpEarned });
    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error('[first-quiz email]', err?.message);
    return NextResponse.json({ sent: false, reason: err.message });
  }
}