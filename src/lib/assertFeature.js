/**
 * assertFeature — API route helper for tier gating.
 *
 * Usage in a Next.js route handler:
 *
 *   import { assertFeature } from '@/lib/assertFeature';
 *
 *   export async function POST(request) {
 *     const { supabase, session } = await getAuth(request);
 *     const { data: parent } = await supabase.from('parents')
 *       .select('id, region, subscription_tier').eq('id', session.user.id).single();
 *
 *     const gate = await assertFeature(parent, 'exam_papers');
 *     if (gate) return gate; // 402 Payment Required response, early-return
 *
 *     // ... proceed with feature-gated work
 *   }
 *
 * For quota-gated features (Tara feedback), use assertQuota instead.
 */
import { hasFeature, checkQuota, getUpgradeReason, getTierLabel } from './tierAccess.js';

/**
 * If parent lacks the feature, return a Response with 402 Payment Required.
 * Otherwise return null so the route handler can proceed.
 */
export function assertFeature(parent, feature) {
  if (hasFeature(parent, feature)) return null;

  const upgrade = getUpgradeReason(parent, feature) || {};
  const tierLabel = upgrade.requiredTier ? getTierLabel(upgrade.requiredTier) : 'a paid plan';

  return new Response(
    JSON.stringify({
      error: 'feature_not_available',
      feature,
      message: `This feature requires ${tierLabel}. Upgrade your plan to continue.`,
      upgrade_url: '/subscribe',
      required_tier: upgrade.requiredTier || null,
      region: upgrade.region || null,
    }),
    {
      status: 402,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Quota-gated check. Caller must fetch the current usage count itself
 * (from tier_feedback_quota or equivalent counter table).
 *
 * If over quota, returns a 429-with-upgrade-context response. Otherwise null.
 */
export function assertQuota(parent, feature, usedThisPeriod) {
  const q = checkQuota(parent, feature, usedThisPeriod);
  if (q.allowed) return null;

  const upgrade = getUpgradeReason(parent, feature) || {};
  const tierLabel = upgrade.requiredTier ? getTierLabel(upgrade.requiredTier) : 'a higher tier';

  return new Response(
    JSON.stringify({
      error: 'quota_exhausted',
      feature,
      message: `You've used all ${q.limit} of your monthly ${feature.replace(/_/g, ' ')} allowance. Upgrade to ${tierLabel} for more.`,
      upgrade_url: '/subscribe',
      used: q.used,
      limit: q.limit,
      remaining: q.remaining,
      required_tier: upgrade.requiredTier || null,
      region: upgrade.region || null,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'X-Quota-Used': String(q.used),
        'X-Quota-Limit': String(q.limit),
      },
    }
  );
}
