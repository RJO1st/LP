/**
 * freeTierGating.js
 * Deploy to: src/lib/freeTierGating.js
 *
 * Determines what a scholar can and can't do based on their parent's subscription tier.
 * Used by student dashboard to gate quest starts, Tara access, and feature visibility.
 *
 * Tier model:
 *   - "trial"  → full Pro access (30 days)
 *   - "active" → paid Pro subscriber
 *   - "free"   → 10 questions/day, no Tara, no parent dashboard, 1 scholar
 *   - other    → treated as Free
 *
 * IMPORTANT: This runs client-side for UX gating only.
 * Server-side enforcement should also exist on API routes.
 */

const FREE_DAILY_LIMIT = 10;

/**
 * Determine the effective tier for a parent.
 * @param {object} parentInfo — parent row from Supabase (subscription_status, trial_end, subscription_end)
 * @returns {"pro" | "free"} — effective tier right now
 */
export function getEffectiveTier(parentInfo) {
  if (!parentInfo) return "free";

  const now = new Date();
  const status = parentInfo.subscription_status;

  // Active paid subscription
  if (status === "active") {
    const subEnd = parentInfo.subscription_end ? new Date(parentInfo.subscription_end) : null;
    if (!subEnd || now <= subEnd) return "pro";
  }

  // Active trial
  if (status === "trial") {
    const trialEnd = parentInfo.trial_end ? new Date(parentInfo.trial_end) : null;
    if (trialEnd && now <= trialEnd) return "pro";
  }

  // Canceled but still within paid period
  if (status === "canceled") {
    const subEnd = parentInfo.subscription_end ? new Date(parentInfo.subscription_end) : null;
    if (subEnd && now <= subEnd) return "pro";
  }

  return "free";
}

/**
 * Count how many questions a scholar has answered today.
 * Uses quiz_results table — counts questions_total for today.
 * @param {object} supabase — Supabase client
 * @param {string} scholarId
 * @returns {Promise<number>} — total questions answered today
 */
export async function getTodayQuestionCount(supabase, scholarId) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("quiz_results")
    .select("questions_total")
    .eq("scholar_id", scholarId)
    .gte("created_at", todayStart.toISOString());

  if (error) {
    console.warn("[freeTierGating] Failed to count today's questions:", error.message);
    return 0;
  }

  return (data || []).reduce((sum, row) => sum + (row.questions_total || 0), 0);
}

/**
 * Full access check — combines tier + daily limit.
 * Call this before starting a quest on the student dashboard.
 *
 * @param {object} supabase
 * @param {object} parentInfo — parent row
 * @param {string} scholarId
 * @returns {Promise<object>} — { canStart, tier, todayCount, dailyLimit, remaining, reason }
 */
export async function checkQuestAccess(supabase, parentInfo, scholarId) {
  const tier = getEffectiveTier(parentInfo);

  // Pro users have unlimited access
  if (tier === "pro") {
    return {
      canStart: true,
      tier: "pro",
      todayCount: null, // don't bother counting
      dailyLimit: null,
      remaining: null,
      reason: null,
    };
  }

  // Free tier — check daily limit
  const todayCount = await getTodayQuestionCount(supabase, scholarId);
  const remaining = Math.max(0, FREE_DAILY_LIMIT - todayCount);

  return {
    canStart: remaining > 0,
    tier: "free",
    todayCount,
    dailyLimit: FREE_DAILY_LIMIT,
    remaining,
    reason: remaining <= 0 ? "daily_limit_reached" : null,
  };
}

/**
 * Feature availability by tier.
 * Use this to show/hide UI elements.
 */
export function getFeatureAccess(tier) {
  if (tier === "pro") {
    return {
      unlimitedQuestions: true,
      taraAI: true,
      parentDashboard: true,
      weeklyMissions: true,
      leaderboards: true,
      certificates: true,
      mockTests: true,
      maxScholars: 3,
    };
  }

  return {
    unlimitedQuestions: false,
    taraAI: false,
    parentDashboard: false,
    weeklyMissions: false,
    leaderboards: true,    // keep visible to motivate upgrade
    certificates: false,
    mockTests: false,
    maxScholars: 1,
  };
}

export { FREE_DAILY_LIMIT };