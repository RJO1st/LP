// app/api/schools/interest/route.js
// Captures school interest leads from the landing page modal.
// Sends an internal notification email via Brevo. No auth required.

import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
  try {
    const { schoolName, contactName, email, phone, studentCount, state } = await request.json();

    if (!schoolName || !email) {
      return NextResponse.json({ error: 'schoolName and email are required' }, { status: 400 });
    }

    // ── Save to Supabase (graceful fail — table may not yet exist) ──────────
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
      );
      await supabase.from('school_interest_leads').insert({
        school_name: schoolName,
        contact_name: contactName || null,
        contact_email: email,
        contact_phone: phone || null,
        student_count: studentCount ? parseInt(studentCount, 10) : null,
        state: state || null,
        source: 'landing_page',
      });
    } catch (_) {
      // table likely doesn't exist yet — continue to email notification
    }

    // ── Internal notification email ─────────────────────────────────────────
    await sendEmail({
      to: 'hello@launchpard.com',
      subject: `🏫 New School Lead: ${schoolName}`,
      htmlContent: `
        <h2>New School Interest Lead</h2>
        <table cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-family:sans-serif;font-size:14px;">
          <tr><td><strong>School Name</strong></td><td>${schoolName}</td></tr>
          <tr><td><strong>Contact</strong></td><td>${contactName || '—'}</td></tr>
          <tr><td><strong>Email</strong></td><td><a href="mailto:${email}">${email}</a></td></tr>
          <tr><td><strong>Phone</strong></td><td>${phone || '—'}</td></tr>
          <tr><td><strong>Students</strong></td><td>${studentCount || '—'}</td></tr>
          <tr><td><strong>State</strong></td><td>${state || '—'}</td></tr>
        </table>
        <p style="margin-top:16px;color:#666;font-size:12px;">Submitted via landing page school interest modal.</p>
      `,
    });

    // ── Confirmation email to the school contact ─────────────────────────────
    try {
      await sendEmail({
        to: email,
        subject: `Thanks for your interest in LaunchPard, ${contactName || schoolName}`,
        htmlContent: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1e293b;">
            <h2 style="color:#4f46e5;">We got your message! 🎉</h2>
            <p>Hi ${contactName || 'there'},</p>
            <p>Thanks for reaching out about <strong>${schoolName}</strong>. We'll be in touch within 1–2 business days to walk you through how LaunchPard works for schools.</p>
            <p>In the meantime, here's what to expect:</p>
            <ul>
              <li>A short demo call (30 min) — we'll show you the teacher dashboard live</li>
              <li>A tailored onboarding plan for your school size</li>
              <li>No cost to the school — parents fund access through optional upgrades</li>
            </ul>
            <p>Got a question right now? Reply to this email and we'll answer quickly.</p>
            <p>— The LaunchPard Team</p>
          </div>
        `,
      });
    } catch (_) {
      // confirmation email is best-effort
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[schools/interest]', error);
    return NextResponse.json({ error: 'Failed to submit interest' }, { status: 500 });
  }
}
