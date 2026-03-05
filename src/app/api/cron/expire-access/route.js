// app/api/cron/expire-access/route.js
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Cron job to expire trials and subscriptions
 * Run daily at midnight
 * 
 * Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/expire-access",
 *     "schedule": "0 0 * * *"
 *   }]
 * }
 */
export async function GET(req) {
  try {
    // Verify authorization
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date().toISOString();
    let trialsExpired = 0;
    let subscriptionsExpired = 0;

    // Expire trials
    const { data: expiredTrials, error: trialError } = await supabase
      .from('parents')
      .update({ subscription_status: 'expired' })
      .lt('trial_end', now)
      .eq('subscription_status', 'trial')
      .select('id');

    if (trialError) {
      console.error('Error expiring trials:', trialError);
    } else {
      trialsExpired = expiredTrials?.length || 0;
    }

    // Expire subscriptions
    const { data: expiredSubs, error: subError } = await supabase
      .from('parents')
      .update({ subscription_status: 'expired' })
      .lt('subscription_end', now)
      .in('subscription_status', ['active', 'canceled'])
      .select('id');

    if (subError) {
      console.error('Error expiring subscriptions:', subError);
    } else {
      subscriptionsExpired = expiredSubs?.length || 0;
    }

    // Log the results
    console.log(`✅ Expired ${trialsExpired} trials and ${subscriptionsExpired} subscriptions`);

    return NextResponse.json({
      success: true,
      trialsExpired,
      subscriptionsExpired,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in expire-access cron:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
