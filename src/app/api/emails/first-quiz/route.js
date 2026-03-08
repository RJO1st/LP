// Deploy to: src/app/api/emails/first-quiz/route.js
import { NextResponse } from 'next/server';
import { sendFirstQuizEmail } from '@/lib/email';

// POST body: { parentEmail, parentName, scholarName, subject, score, totalQuestions, xpEarned }
// Called from: quizUtils.js saveQuizResult after first quiz completion
export async function POST(req) {
  let body;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const { parentEmail, parentName, scholarName, score, totalQuestions, subject, xpEarned } = body;
  if (!parentEmail || !scholarName) {
    return NextResponse.json({ error: 'parentEmail and scholarName required' }, { status: 400 });
  }

  try {
    await sendFirstQuizEmail({ parentEmail, parentName, scholarName, score, total: totalQuestions, subject, xpEarned });
    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error('[first-quiz email]', err?.message);
    return NextResponse.json({ sent: false, reason: err.message });
  }
}