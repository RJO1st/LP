/**
 * LaunchPard Tier Access Control — src/lib/tierAccess.js
 *
 * ─── Nigerian model (April 2026 simplification) ───────────────────────────────
 * ONE core paid plan — ng_scholar (₦2,500/mo or ₦25,000/yr) — plus optional
 * add-ons stored in parent.ng_addons TEXT[]:
 *
 *   'family_child'      ₦1,000/mo per additional scholar
 *   'waec_boost'        ₦1,000/mo — unlimited Tara AI, full mock exams, paper-level analytics
 *   'ai_unlimited'      ₦500/mo  — removes 50-feedback/mo cap
 *
 * ─── Currency-by-curriculum rule ─────────────────────────────────────────────
 * Billing currency is determined by the SCHOLAR's curriculum, not the parent's
 * geo-IP. A parent who geo-detects as NG but enrols their child in uk_11plus,
 * ib_pyp, or us_common_core is billed in GBP — not NGN.
 * Non-Nigerian curricula set parent.region='GB' at subscription creation.
 * This prevents VPN-based arbitrage even if geo-detection is fooled.
 *
 * ─── Curricula that trigger NGN billing ──────────────────────────────────────
 *   ng_primary, ng_jss, ng_sss
 *
 * ─── All others (including 'Common Entrance' which is ng_jss feeder) ─────────
 *   uk_national, uk_11plus, ca_primary, ca_secondary, us_common_core,
 *   ib_pyp, ib_myp, australian_acara → GB region → GBP billing
 */

// ─────────────────────────────────────────────────────────────────────────────
const INF = Infinity;

// ─── Nigerian add-ons ────────────────────────────────────────────────────────
// Each add-on key matches entries in parent.ng_addons TEXT[].
// Feature resolution: getTierDef() returns the base tier definition; then
// getEffectiveDef() overlays any active add-ons.
const NG_ADDON_DEFS = {
  // +₦1,000/mo per extra child — purchased once per additional scholar
  family_child: {
    scholars_max_increment: 1,   // each purchased adds +1 to scholars_max
  },
  // +₦1,000/mo — WAEC exam cram pack
  waec_boost: {
    feedback_monthly: INF,       // overrides base 50/mo cap
    dashboard_analytics: 'full_paper_level',
    support: 'whatsapp',
  },
  // +₦500/mo — removes feedback cap without the full WAEC pack
  ai_unlimited: {
    feedback_monthly: INF,
  },
};

// ─── Core tier definitions ───────────────────────────────────────────────────
export const TIER_DEFS = {
  // ═══════ GB / CA / US / AU / IE / IB / OTHER ═══════
  GB: {
    free: {
      scholars_max: 1,
      daily_questions: 10,
      feedback_monthly: 0,
      boss_battles: false,
      simulations_3d: false,
      exam_papers: 0,
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
      exam_papers: 0,
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
      offline_mode: true,
      dashboard_analytics: 'full_paper_level',
      support: 'email',
    },
  },

  // ═══════ NG — single core plan + add-ons ═══════
  // Simplified April 2026: Free → Scholar (₦2,500/mo) + optional add-ons.
  // Replaces the previous 6-tier structure (ng_explorer, ng_waec, ng_family_*).
  NG: {
    free: {
      scholars_max: 1,
      daily_questions: 10,
      feedback_monthly: 0,
      boss_battles: false,
      simulations_3d: false,
      exam_papers: 0,
      offline_mode: false,
      dashboard_analytics: 'none',
      support: 'community',
    },
    ng_scholar: {                 // ₦2,500/mo — the only paid NG tier
      scholars_max: 1,           // base: 1 scholar; add family_child add-on per extra
      daily_questions: INF,
      feedback_monthly: 50,      // waec_boost or ai_unlimited add-on raises this to INF
      boss_battles: true,
      simulations_3d: true,
      exam_papers: 20,
      offline_mode: true,
      dashboard_analytics: 'full',
      support: 'email',
    },
    // Legacy aliases — map old tier names to ng_scholar so existing
    // parent records with the old values don't break after migration.
    // These are READ-ONLY fallbacks; no new parents should be assigned them.
    ng_explorer:    null,  // → resolved to ng_scholar in getTierDef
    ng_waec:        null,  // → resolved to ng_scholar + waec_boost in getTierDef
    ng_family_2:    null,  // → resolved to ng_scholar + family_child (×1)
    ng_family_3:    null,  // → resolved to ng_scholar + family_child (×2)
    ng_family_4plus: null, // → resolved to ng_scholar + family_child (×5)
  },
};

// Maps legacy tier names to their equivalent in the new model
const LEGACY_TIER_MAP = {
  ng_explorer:     { tier: 'ng_scholar', addons: [] },
  ng_waec:         { tier: 'ng_scholar', addons: ['waec_boost'] },
  ng_family_2:     { tier: 'ng_scholar', addons: ['family_child'] },
  ng_family_3:     { tier: 'ng_scholar', addons: ['family_child', 'family_child'] },
  ng_family_4plus: { tier: 'ng_scholar', addons: ['family_child', 'family_child', 'family_child', 'family_child', 'family_child'] },
};

// ─────────────────────────────────────────────────────────────────────────────
// Nigerian curricula — determines NGN billing; everything else → GBP
// ─────────────────────────────────────────────────────────────────────────────
export const NG_CURRICULA = new Set(['ng_primary', 'ng_jss', 'ng_sss', 'ng_british', 'ng_hybrid']);

/**
 * Given a curriculum string, return whether it should be billed in NGN.
 * Used at signup to set parent.region and parent.currency.
 */
export function curriculumIsNigerian(curriculum) {
  return NG_CURRICULA.has((curriculum || '').toLowerCase());
}

/**
 * Determine the billing region from a curriculum.
 * Non-Nigerian curricula always return 'GB' (GBP billing), even if the
 * parent geo-detected as NG. This closes the VPN arbitrage gap.
 */
export function regionFromCurriculum(curriculum) {
  return curriculumIsNigerian(curriculum) ? 'NG' : 'GB';
}

// ─────────────────────────────────────────────────────────────────────────────
// Region resolution
// ─────────────────────────────────────────────────────────────────────────────
const REGION_ALIASES = {
  GB: 'GB', NG: 'NG',
  CA: 'GB', US: 'GB', AU: 'GB', IE: 'GB', IB: 'GB', OTHER: 'GB',
};

function resolveRegion(region) {
  if (!region) return 'GB';
  return REGION_ALIASES[String(region).toUpperCase()] || 'GB';
}

// ─────────────────────────────────────────────────────────────────────────────
// Core: resolve a parent's effective feature set
// Handles legacy tier names and applies add-ons on top of the base tier.
// ─────────────────────────────────────────────────────────────────────────────
function resolveBaseTierAndAddons(parent) {
  const region = resolveRegion(parent?.region);
  let tier     = parent?.subscription_tier || 'free';
  let addons   = Array.isArray(parent?.ng_addons) ? [...parent.ng_addons] : [];

  // Translate legacy NG tier names to ng_scholar + equivalent add-ons
  if (region === 'NG' && LEGACY_TIER_MAP[tier]) {
    const mapped = LEGACY_TIER_MAP[tier];
    tier   = mapped.tier;
    addons = [...addons, ...mapped.addons];
  }

  const regionTiers = TIER_DEFS[region] || TIER_DEFS.GB;
  // If tier still maps to null (shouldn't happen post-migration), fall back to free
  const base = (regionTiers[tier] && regionTiers[tier] !== null)
    ? regionTiers[tier]
    : regionTiers.free || TIER_DEFS.GB.free;

  return { base, addons, region };
}

/**
 * Get the full effective feature definition for a parent, with all active
 * add-ons overlaid on the base tier.
 */
export function getTierDef(parent) {
  const { base, addons } = resolveBaseTierAndAddons(parent);
  if (!addons.length) return base;

  // Start from base, then layer add-on overrides
  const merged = { ...base };

  for (const addonKey of addons) {
    const addon = NG_ADDON_DEFS[addonKey];
    if (!addon) continue;
    for (const [k, v] of Object.entries(addon)) {
      if (k === 'scholars_max_increment') {
        // Each family_child addon adds +1 slot
        merged.scholars_max = (merged.scholars_max || 1) + 1;
      } else if (v === true || v === INF) {
        // Addons can only upgrade, never downgrade
        merged[k] = v;
      } else if (typeof v === 'number' && v > (merged[k] ?? 0)) {
        merged[k] = v;
      } else if (typeof v === 'string' && v !== 'none') {
        merged[k] = v;
      }
    }
  }

  return merged;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API — unchanged surface area for all callers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check whether a parent's effective tier (base + add-ons) has a feature.
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
 * Get the raw numeric/string limit for a feature.
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
 * Can this parent add another scholar?
 * scholars_max is the effective max including family_child add-ons.
 */
export function canAddScholar(parent, currentScholarCount) {
  return currentScholarCount < getLimit(parent, 'scholars_max');
}

/**
 * Quota check — how many of a limited feature have been used this period.
 */
export function checkQuota(parent, feature, usedThisPeriod) {
  const limit     = getLimit(parent, feature);
  const unlimited = limit === INF;
  if (unlimited) return { allowed: true, used: usedThisPeriod, limit: INF, remaining: INF, unlimited: true };
  const used      = Math.max(0, Number(usedThisPeriod) || 0);
  const remaining = Math.max(0, limit - used);
  return { allowed: remaining > 0, used, limit, remaining, unlimited: false };
}

/**
 * Return upgrade context: cheapest tier/add-on that unlocks a feature.
 */
export function getUpgradeReason(parent, feature) {
  const { region } = resolveBaseTierAndAddons(parent);
  const def = getTierDef(parent);
  const v = def[feature];
  if ((typeof v === 'boolean' && v) || (typeof v === 'number' && v > 0)) return null;

  // Check which add-on unlocks the feature (for NG)
  if (region === 'NG') {
    for (const [addonKey, addonDef] of Object.entries(NG_ADDON_DEFS)) {
      const val = addonDef[feature];
      if (val === true || val === INF || (typeof val === 'number' && val > 0)) {
        return { requiredTier: 'ng_scholar', requiredAddon: addonKey, region };
      }
    }
    // Feature is in the base scholar tier
    if (TIER_DEFS.NG.ng_scholar?.[feature]) {
      return { requiredTier: 'ng_scholar', requiredAddon: null, region };
    }
  }

  // GB tier ladder
  const gbOrder = ['free', 'uk_pro', 'uk_pro_exam'];
  for (const tierKey of gbOrder) {
    const tier = TIER_DEFS.GB[tierKey];
    if (!tier) continue;
    const val = tier[feature];
    if ((typeof val === 'boolean' && val) || (typeof val === 'number' && val > 0) ||
        (typeof val === 'string' && val.length > 0 && val !== 'none')) {
      return { requiredTier: tierKey, requiredAddon: null, region };
    }
  }
  return { requiredTier: null, requiredAddon: null, region };
}

/**
 * Pretty labels for tier keys.
 */
export const TIER_LABELS = {
  free:         'Free',
  uk_pro:       'Pro',
  uk_pro_exam:  'Pro + Exam Mode',
  ng_scholar:   'Scholar',
  // Legacy labels — keep for any UI that might still reference old keys
  ng_explorer:    'Scholar',
  ng_waec:        'Scholar + WAEC Boost',
  ng_family_2:    'Scholar + Family',
  ng_family_3:    'Scholar + Family',
  ng_family_4plus:'Scholar + Family',
};

export function getTierLabel(tierKey) {
  return TIER_LABELS[tierKey] || 'Free';
}

export const ADDON_LABELS = {
  family_child:   'Family Add-on (₦1,000/mo per child)',
  waec_boost:     'WAEC Intensive Boost (₦1,000/mo)',
  ai_unlimited:   'Unlimited AI Feedback (₦500/mo)',
};

export function getAddonLabel(addonKey) {
  return ADDON_LABELS[addonKey] || addonKey;
}

/**
 * Validate that a tier is allowed for a given region.
 * Nigerian tiers (ng_scholar) require region='NG'.
 */
export function isTierAllowedInRegion(region, tier) {
  if (tier === 'free') return true;
  const resolved = resolveRegion(region);
  const tiers    = TIER_DEFS[resolved] || TIER_DEFS.GB;
  return Object.prototype.hasOwnProperty.call(tiers, tier) && tiers[tier] !== null;
}

/**
 * How many family_child add-ons does a parent have active?
 * Each one gives +1 scholar slot beyond the base.
 */
export function getFamilyChildAddonCount(parent) {
  const addons = Array.isArray(parent?.ng_addons) ? parent.ng_addons : [];
  return addons.filter(a => a === 'family_child').length;
}

/**
 * Does the parent have a specific add-on active?
 */
export function hasAddon(parent, addonKey) {
  const addons = Array.isArray(parent?.ng_addons) ? parent.ng_addons : [];
  return addons.includes(addonKey);
}
