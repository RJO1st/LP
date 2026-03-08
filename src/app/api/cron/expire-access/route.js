// Deploy to: src/app/api/cron/expire-access/route.js
// Runs daily at midnight UTC — marks expired trials and subscriptions.
// No changes to logic, just tightened error handling and response shape.

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(req) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date().toISOString();

  // Run both expiry updates in parallel — they touch different rows
  const [trialResult, subResult] = await Promise.all([
    supabase
      .from('parents')
      .update({ subscription_status: 'expired' })
      .lt('trial_end', now)
      .eq('subscription_status', 'trial')
      .select('id'),

    supabase
      .from('parents')
      .update({ subscription_status: 'expired' })
      .lt('subscription_end', now)
      .in('subscription_status', ['active', 'canceled'])
      .select('id'),
  ]);

  if (trialResult.error) console.error('[expire-access] trial update failed:', trialResult.error.message);
  if (subResult.error)   console.error('[expire-access] sub update failed:',   subResult.error.message);

  const trialsExpired        = trialResult.data?.length ?? 0;
  const subscriptionsExpired = subResult.data?.length   ?? 0;

  console.log(`[expire-access] expired ${trialsExpired} trials, ${subscriptionsExpired} subscriptions`);

  return NextResponse.json({
    success: true,
    trialsExpired,
    subscriptionsExpired,
    timestamp: now,
  });
}