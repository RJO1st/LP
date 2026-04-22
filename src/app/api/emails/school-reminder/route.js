// Deploy to: src/app/api/emails/school-reminder/route.js
// Sends school-missing reminder emails to parents.
// Can be called manually, from admin dashboard, or from a cron/scheduled task.
//
// POST body (single parent):
//   { parentEmail, parentName, scholars: ["name1", "name2"] }
//
// POST body (batch — finds all missing, sends to each parent):
//   { batch: true }

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendSchoolReminderEmail } from '@/lib/email';
import { supabaseKeys } from '@/lib/env'
import { getServiceRoleClient } from '@/lib/security/serviceRole'

const supabaseAdmin = () => createClient(
  supabaseKeys.url(),
  supabaseKeys.secret() // Use from env helpers,
);

export async function POST(request) {
  try {
    const body = await request.json();

    // ── Batch mode: query all scholars missing school_id, group by parent ──
    if (body.batch) {
      const sb = supabaseAdmin();
      const { data, error } = await sb.rpc('get_scholars_missing_school');

      // Fallback if RPC not available — direct query
      let rows = data;
      if (error || !data) {
        const { data: fallback, error: fbErr } = await sb
          .from('scholars')
          .select('id, name, parent_id, parents!inner(email, full_name)')
          .is('school_id', null)
          .is('archived_at', null);
        if (fbErr) return NextResponse.json({ error: fbErr.message }, { status: 500 });
        rows = (fallback || []).map(s => ({
          scholar_name: s.name,
          parent_email: s.parents?.email,
          parent_name: s.parents?.full_name,
        }));
      }

      if (!rows || rows.length === 0) {
        return NextResponse.json({ sent: 0, message: 'No scholars missing school info.' });
      }

      // Group by parent email
      const grouped = {};
      for (const r of rows) {
        const email = r.parent_email;
        if (!email) continue;
        if (!grouped[email]) grouped[email] = { parentName: r.parent_name, scholars: [] };
        grouped[email].scholars.push(r.scholar_name);
      }

      let sent = 0;
      const errors = [];
      for (const [email, info] of Object.entries(grouped)) {
        try {
          await sendSchoolReminderEmail({
            parentEmail: email,
            parentName: info.parentName,
            scholarNames: info.scholars,
          });
          sent++;
        } catch (err) {
          errors.push({ email, error: err.message });
        }
      }

      return NextResponse.json({
        sent,
        totalParents: Object.keys(grouped).length,
        totalScholars: rows.length,
        errors: errors.length > 0 ? errors : undefined,
      });
    }

    // ── Single parent mode ──────────────────────────────────────────────────
    const { parentEmail, parentName, scholars } = body;
    if (!parentEmail || !scholars?.length) {
      return NextResponse.json({ error: 'parentEmail and scholars[] required' }, { status: 400 });
    }
    await sendSchoolReminderEmail({ parentEmail, parentName, scholarNames: scholars });
    return NextResponse.json({ sent: true });

  } catch (err) {
    console.error('[school-reminder email]', err?.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
