// src/app/api/emails/scholar-created/route.js
// POST body: { parentEmail, parentName, scholarName, questCode, curriculum, yearLevel }
// Called from: parent dashboard page.jsx handleAddScholar
import { NextResponse } from 'next/server';
import { sendScholarCreatedEmail } from '@/lib/email';
import { scholarCreatedEmailSchema } from '@/lib/validation';

export async function POST(request) {
  const rawBody = await request.json().catch(() => null);
  const parsed  = scholarCreatedEmailSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: 'parentEmail and scholarName are required' }, { status: 400 });
  }
  const { parentEmail, parentName, scholarName, accessCode, curriculum, yearLevel } = parsed.data;

  try {
    await sendScholarCreatedEmail({
      parentEmail,
      parentName,
      scholarName,
      questCode: accessCode,   // field rename: schema uses accessCode, email helper expects questCode
      curriculum,
      yearLevel,
    });
    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error('[scholar-created email]', err?.message);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
