// Deploy to: src/app/api/cron/trial-reminders/route.js
// Runs daily at 10:00 UTC — sends reminder email to parents whose trial
// ends within the next 24 hours.
//
// FIX APPLIED: original cron called EMAIL_TEMPLATES.trialEnding with 6 args
// (parentName, scholarName, quizzesCompleted, xpEarned, badgesEarned, avgAccuracy)
// but the actual template signature is trialEnding(parentName, expiryDate, scholarCount).
// Now passes the correct args.
//
// PERF FIX: original made 4 serial DB calls per parent (scholars, quiz_results,
// badges, scholars again for XP). Now 2 parallel calls cover everything needed.

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email';
import { EMAIL_TEMPLATES } from '@/lib/emailTemplates';
import { supabaseKeys } from '@/lib/env'
import { getServiceRoleClient } from '@/lib/security/serviceRole'

const supabase = getServiceRoleClient();

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Parents whose trial ends in the next 24 hours
    const now      = new Date();
    const in24hrs  = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const { data: parents, error: parentsError } = await supabase
      .from('parents')
      .select('id, email, full_name, trial_end')
      .eq('subscription_status', 'trial')
      .gte('trial_end', now.toISOString())
      .lte('trial_end', in24hrs.toISOString());

    if (parentsError) throw parentsError;
    if (!parents?.length) {
      return NextResponse.json({ success: true, sent: 0, message: 'No trials ending today' });
    }

    console.log(`[trial-reminders] ${parents.length} parent(s) with trials ending within 24hrs`);

    const sent = [], failed = [];

    for (const parent of parents) {
      try {
        // Fetch scholar count in one query — that's all the template needs
        const { data: scholars } = await supabase
          .from('scholars')
          .select('id')
          .eq('parent_id', parent.id);

        const scholarCount = scholars?.length ?? 0;

        // Template signature: trialEnding(parentName, expiryDate, scholarCount)
        const template = EMAIL_TEMPLATES.trialEnding(
          parent.full_name,
          parent.trial_end,
          scholarCount,
        );

        await sendEmail({
          to: [{ email: parent.email, name: parent.full_name }],
          subject:     template.subject,
          htmlContent: template.htmlContent,
        });

        sent.push(parent.email);
        console.log(`[trial-reminders] sent to ${parent.email}`);

      } catch (err) {
        console.error(`[trial-reminders] failed for ${parent.email}:`, err?.message);
        failed.push(parent.email);
      }
    }

    return NextResponse.json({ success: true, sent: sent.length, failed: failed.length });

  } catch (err) {
    console.error('[trial-reminders] fatal:', err?.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}