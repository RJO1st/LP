// Deploy to: src/app/api/emails/scholar-created/route.js
import { NextResponse } from 'next/server';
import { sendScholarCreatedEmail } from '@/lib/email';

// POST body: { parentEmail, parentName, scholarName, questCode, curriculum, yearLevel }
// Called from: parent dashboard page.jsx handleAddScholar
export async function POST(request) {
  try {
    const { parentEmail, parentName, scholarName, questCode, curriculum, yearLevel } = await request.json();
    if (!parentEmail || !scholarName) {
      return NextResponse.json({ error: 'parentEmail and scholarName required' }, { status: 400 });
    }
    await sendScholarCreatedEmail({ parentEmail, parentName, scholarName, questCode, curriculum, yearLevel });
    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error('[scholar-created email]', err?.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}