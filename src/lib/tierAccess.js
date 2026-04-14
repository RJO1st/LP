/**
 * LaunchPard Tier Access Control — src/lib/tierAccess.js
 *
 * Single source of truth for every tier × region × feature combination.
 * Used by:
 *   - UI components to conditionally render upgrade prompts
 *   - API route handlers to return 402 on quota/feature gate failures
 *   - Proxy.ts to redirect tier-locked routes
 *
 * Adding a new tier: add the key to TIER_DEFS below AND to the CHECK
 * constraint in supabase/migrations/20260414_tier_gating.sql.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Feature flags — numeric = daily/monthly quota, boolean = binary access.
// Matches the feature matrix in NIGERIAN_PRICING_ANALYSIS.md §4.2.
// ─────────────────────────────────────────────────────────────────────────────
const INF = Infinity;

export const TIER_DEFS = {
  // ═══════ GB / CA / US / AU / IE / IB / OTHER ═══════
  // All non-Nigerian regions use UK-style tiering for now. Future work:
  // add CA-specific, US-specific tiers as those markets localise.
  GB: {
    free: {
      scholars_max: 1,
      daily_questions: 10,
      feedback_monthly: 0,       // 0 = basic-only (no Tara full feedback)
      boss_battles: false,
      simulations_3d: false,
      exam_papers: 0,            // number of papers accessible
      live_qa: false,
      offline_mode: false,
      dashboard_analytics: 'none',
      support: 'community',
    },
    uk_pro: {
      scholars_max: 3,
      daily_questions: INF,
      feedback_monthly: INF,
      boss_battles: true,
      simulations_3d: true,
      exam_papers: 0,            // Exam Mode is separate add-on (uk_pro_exam)
      live_qa: false,
      offline_mode: true,
      dashboard_analytics: 'full',
      support: 'email',
    },
    uk_pro_exam: {
      scholars_max: 3,
      daily_questions: INF,
      feedback_monthly: INF,
      boss_battles: true,
      simulations_3d: true,
      exam_papers: INF,
      live_qa: false,
      offline_mode: true,
      dashboard_analytics: 'full_paper_level',
      support: 'email',
    },
  },

  // ═══════ NG — analysis-backed tiers ═══════
  // See NIGERIAN_PRICING_ANALYSIS.md for prices and rationale.
  NG: {
    free: {
      scholars_max: 1,
      daily_questions: 10,
      feedback_monthly: 0,
      boss_battles: false,
      simulations_3d: false,
      exam_papers: 0,
      live_qa: false,
      offline_mode: false,
      dashboard_analytics: 'none',
      support: 'community',
    },
    ng_explorer: {                // ₦1,200/mo
      scholars_max: 1,
      daily_questions: INF,
      feedback_monthly: 10,
      boss_battles: false,
      simulations_3d: false,
      exam_papers: 0,
      live_qa: false,
      offline_mode: true,
      dashboard_analytics: '30day',
      support: 'email',
    },
    ng_scholar: {                 // ₦2,500/mo (most popular)
      scholars_max: 1,
      daily_questions: INF,
      feedback_monthly: 50,
      boss_battles: true,
      simulations_3d: true,
      exam_papers: 20,
      live_qa: false,
      offline_mode: true,
      dashboard_analytics: 'full',
      support: 'email',
    },
    ng_waec: {                    // ₦4,000/mo (3-month min)
      scholars_max: 1,
      daily_questions: INF,
      feedback_monthly: INF,
      boss_battles: true,
      simulations_3d: true,
      exam_papers: 20,
      live_qa: true,
      offline_mode: true,
      dashboard_analytics: 'full_paper_level',
      support: 'whatsapp',
    },
    ng_family_2: {                // ₦3,500/mo (2 scholars)
      scholars_max: 2,
      daily_questions: INF,
      feedback_monthly: 50,
      boss_battles: true,
      simulations_3d: true,
      exam_papers: 20,
      live_qa: false,
      offline_mode: true,
      dashboard_analytics: 'full',
      support: 'email',
    },
    ng_family_3: {                // ₦4,800/mo (3 scholars)
      scholars_max: 3,
      daily_questions: INF,
      feedback_monthly: 50,
      boss_battles: true,
      simulations_3d: true,
      exam_papers: 20,
      live_qa: false,
      offline_mode: true,
      dashboard_analytics: 'full',
      support: 'email',
    },
    ng_family_4plus: {            // ₦6,000/mo (4+ scholars)
      scholars_max: 6,
      daily_questions: INF,
      feedback_monthly: 50,
      boss_battles: true,
      simulations_3d: true,
      exam_papers: 20,
      live_qa: false,
      offline_mode: true,
      dashboard_analytics: 'full',
      support: 'email',
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Region resolution — regions that don't have their own tier set fall back to GB.
// ─────────────────────────────────────────────────────────────────────────────
const REGION_ALIASES = {
  GB: 'GB',
  NG: 'NG',
  CA: 'GB',   // Canada uses UK tiers for now
  US: 'GB',
  AU: 'GB',
  IE: 'GB',
  IB: 'GB',
  OTHER: 'GB',
};

function resolveRegion(region) {
  if (!region) return 'GB';
  const upper = String(region).toUpperCase();
  return REGION_ALIASES[upper] || 'GB';
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the full feature definition object for a parent's current tier.
 * Returns TIER_DEFS.GB.free as a defensive fallback for unknown combinations.
 */
export function getTierDef(parent) {
  const region = resolveRegion(parent?.region);
  const tier   = parent?.subscription_tier || 'free';
  const regionTiers = TIER_DEFS[region] || TIER_DEFS.GB;
  return regionTiers[tier] || regionTiers.free || TIER_DEFS.GB.free;
}

/**
 * Check whether a parent's tier has a given feature enabled.
 *   - Boolean features: returns the boolean directly.
 *   - Numeric features (quotas): returns true if the limit is > 0.
 *   - String features (e.g., dashboard_analytics='full'): returns true for
 *     any non-empty, non-'none' string.
 *
 * For quota consumption checks use `hasQuotaRemaining()` instead.
 */
export function hasFeature(parent, feature) {
  const def = getTierDef(parent);
  const v = def[feature];
  if (v === undefined || v === null) return false;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number')  return v > 0;
  if (typeof v === 'string')  return v.length > 0 && v !== 'none';
  return false;
}

/**
 * Get the raw numeric/string limit for a feature. Returns 0 for unknown
 * features, Infinity for unlimited tiers.
 *
 * Use for:
 *   - scholars_max check: `currentCount < getLimit(parent, 'scholars_max')`
 *   - quota display:      `getLimit(parent, 'feedback_monthly')`
 */
export function getLimit(parent, feature) {
  const def = getTierDef(parent);
  const v = def[feature];
  if (typeof v === 'number')  return v;
  if (typeof v === 'boolean') return v ? INF : 0;
  if (typeof v === 'string')  return v;
  return 0;
}

/**
 * Can this parent add another scholar? Pure function — caller supplies the
 * current scholar count.
 */
export function canAddScholar(parent, currentScholarCount) {
  const max = getLimit(parent, 'scholars_max');
  return currentScholarCount < max;
}

/**
 * Check daily/monthly quota consumption. Caller supplies how many have been
 * used this period. Returns:
 *   { allowed, used, limit, remaining, unlimited }
 */
export function checkQuota(parent, feature, usedThisPeriod) {
  const limit = getLimit(parent, feature);
  const unlimited = limit === INF;
  if (unlimited) {
    return { allowed: true, used: usedThisPeriod, limit: INF, remaining: INF, unlimited: true };
  }
  const used = Math.max(0, Number(usedThisPeriod) || 0);
  const remaining = Math.max(0, limit - used);
  return { allowed: remaining > 0, used, limit, remaining, unlimited: false };
}

/**
 * Return the reason a feature is gated, suitable for showing the user.
 * Used by upgrade prompts so we can say "Upgrade to Scholar to unlock
 * boss battles" rather than a generic message.
 */
export function getUpgradeReason(parent, feature) {
  const region = resolveRegion(parent?.region);
  const def    = getTierDef(parent);
  const v      = def[feature];
  if (typeof v === 'boolean' && v)  return null;
  if (typeof v === 'number' && v > 0) return null;

  // Find the cheapest tier in this region that DOES have the feature
  const regionTiers = TIER_DEFS[region] || TIER_DEFS.GB;
  const tierOrder = region === 'NG'
    ? ['free', 'ng_explorer', 'ng_scholar', 'ng_family_2', 'ng_family_3', 'ng_family_4plus', 'ng_waec']
    : ['free', 'uk_pro', 'uk_pro_exam'];
  for (const tierKey of tierOrder) {
    const tier = regionTiers[tierKey];
    if (!tier) continue;
    const val = tier[feature];
    if ((typeof val === 'boolean' && val) ||
        (typeof val === 'number'  && val > 0) ||
        (typeof val === 'string'  && val.length > 0 && val !== 'none')) {
      return { requiredTier: tierKey, region };
    }
  }
  return { requiredTier: null, region };
}

/**
 * Pretty-print a tier key for UI display.
 */
export const TIER_LABELS = {
  free: 'Free',
  uk_pro: 'Pro',
  uk_pro_exam: 'Pro + Exam Mode',
  ng_explorer: 'Explorer',
  ng_scholar: 'Scholar',
  ng_waec: 'WAEC Intensive',
  ng_family_2: 'Family (2 scholars)',
  ng_family_3: 'Family (3 scholars)',
  ng_family_4plus: 'Family (4+ scholars)',
};

export function getTierLabel(tierKey) {
  return TIER_LABELS[tierKey] || 'Free';
}

/**
 * Validate a region + tier combination. Used by the subscribe flow to
 * reject Nigerian tiers for GB parents and vice versa.
 */
export function isTierAllowedInRegion(region, tier) {
  if (tier === 'free') return true;
  const resolved = resolveRegion(region);
  const tiers = TIER_DEFS[resolved] || TIER_DEFS.GB;
  return Object.prototype.hasOwnProperty.call(tiers, tier);
}
