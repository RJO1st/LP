/**
 * taraQuotaCheck — server-side monthly Tara-feedback quota enforcement.
 *
 * Tara feedback is capped at 10/month on Explorer and 50/month on Scholar/Family
 * (see NIGERIAN_PRICING_ANALYSIS.md §4.2). Free tier gets zero full feedback —
 * only deterministic local fallbacks. Unlimited on uk_pro, uk_pro_exam, and
 * ng_waec.
 *
 * This module is server-only. It uses the Supabase service-role key to read
 * parent tier and increment the counter atomically.
 *
 * Returns one of three states:
 *   { ok: true,  usage: {...} }                           — proceed with AI call
 *   { ok: false, reason: 'quota_exhausted', usage: {...} } — 429 response path
 *   { ok: true,  degraded: 'local_only' }                 — free tier: skip AI,
 *                                                           return local fallback
 */
import { createClient } from '@supabase/supabase-js';
import { getLimit } from './tierAccess.js';

const INF = Infinity;

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}

/**
 * Check + increment Tara feedback quota for a scholar.
 * Caller: POST /api/tara  — pass scholarId from the request body.
 *
 * Returns { ok, reason, usage } where usage = { used, limit, remaining }.
 * If scholarId is missing or invalid, we fail-open (return ok:true) so we
 * never block legitimate learning traffic due to a schema surprise. The
 * proxy layer still rate-limits anonymous traffic separately.
 */
export async function checkAndIncrementTaraQuota(scholarId) {
  if (!scholarId || typeof scholarId !== 'string') {
    return { ok: true, usage: null, degraded: null }; // fail-open
  }

  const supabase = getServiceClient();

  // 1. Resolve scholar → parent → tier
  const { data: scholar, error: scholarErr } = await supabase
    .from('scholars')
    .select('parent_id')
    .eq('id', scholarId)
    .single();

  if (scholarErr || !scholar?.parent_id) {
    return { ok: true, usage: null, degraded: null }; // fail-open on lookup miss
  }

  const { data: parent, error: parentErr } = await supabase
    .from('parents')
    .select('id, region, subscription_tier')
    .eq('id', scholar.parent_id)
    .single();

  if (parentErr || !parent) {
    return { ok: true, usage: null, degraded: null }; // fail-open
  }

  // 2. Get the monthly limit for this tier
  const limit = getLimit(parent, 'feedback_monthly');

  // Unlimited — skip counter entirely
  if (limit === INF) {
    return { ok: true, usage: { used: 0, limit: INF, remaining: INF }, degraded: null };
  }

  // Free tier — no Tara feedback at all; caller should return local fallback
  if (limit === 0) {
    return { ok: true, usage: { used: 0, limit: 0, remaining: 0 }, degraded: 'local_only' };
  }

  // 3. Quota-limited tier — check current month's count
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const { count: usedThisMonth, error: countErr } = await supabase
    .from('tier_feedback_quota')
    .select('*', { count: 'exact', head: true })
    .eq('scholar_id', scholarId)
    .gte('day', monthStart.toISOString().slice(0, 10));

  if (countErr) {
    return { ok: true, usage: null, degraded: null }; // fail-open on DB error
  }

  const used = usedThisMonth ?? 0;

  if (used >= limit) {
    return {
      ok: false,
      reason: 'quota_exhausted',
      usage: { used, limit, remaining: 0 },
      degraded: null,
    };
  }

  // 4. Increment counter (idempotent upsert on (scholar_id, day))
  const today = new Date().toISOString().slice(0, 10);
  await supabase.rpc('increment_tier_feedback_quota', {
    p_scholar_id: scholarId,
    p_day: today,
  }).then(() => {}).catch(async () => {
    // Fallback: if RPC doesn't exist, do an upsert-then-increment via plain SQL
    await supabase.from('tier_feedback_quota').upsert({
      scholar_id: scholarId,
      day: today,
      feedback_count: 1,
    }, { onConflict: 'scholar_id,day', ignoreDuplicates: false });
  });

  return {
    ok: true,
    usage: { used: used + 1, limit, remaining: limit - used - 1 },
    degraded: null,
  };
}
