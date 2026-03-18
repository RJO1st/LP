/**
 * referralSystem.js
 * Deploy to: src/lib/referralSystem.js
 *
 * Referral programme: parents share a code, both parties earn credit.
 * Credits are tracked in DB and applied when Stripe/Paystack billing goes live.
 *
 * Run the SQL migration below BEFORE deploying this file.
 */

/*
 * ── SQL MIGRATION (run in Supabase) ───────────────────────────────────────────
 
ALTER TABLE parents ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;
ALTER TABLE parents ADD COLUMN IF NOT EXISTS referred_by text;
ALTER TABLE parents ADD COLUMN IF NOT EXISTS referral_credits integer DEFAULT 0;

-- Index for fast lookup when a new parent signs up with a referral code
CREATE INDEX IF NOT EXISTS idx_parents_referral_code ON parents (referral_code) WHERE referral_code IS NOT NULL;

*/

/**
 * Generate a referral code from the parent's name.
 * Format: LP-{FIRST_NAME}-{RANDOM4} e.g. LP-ROTIMI-7X2K
 */
export function generateReferralCode(fullName) {
  const first = (fullName || "USER").trim().split(/\s+/)[0].toUpperCase().slice(0, 8);
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no O/0/I/1 to avoid confusion
  let rand = "";
  for (let i = 0; i < 4; i++) rand += chars[Math.floor(Math.random() * chars.length)];
  return `LP-${first}-${rand}`;
}

/**
 * Ensure a parent has a referral code. Called on dashboard load.
 * Idempotent — skips if code already exists.
 */
export async function ensureReferralCode(supabase, parentId, fullName) {
  const { data: parent } = await supabase
    .from("parents")
    .select("referral_code")
    .eq("id", parentId)
    .single();

  if (parent?.referral_code) return parent.referral_code;

  // Generate and save — retry on collision (unique constraint)
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = generateReferralCode(fullName);
    const { error } = await supabase
      .from("parents")
      .update({ referral_code: code })
      .eq("id", parentId);

    if (!error) return code;
    if (error.code !== "23505") throw error; // 23505 = unique violation, retry
  }

  throw new Error("Failed to generate unique referral code after 3 attempts");
}

/**
 * Apply a referral code during signup.
 * Called after parent record is created.
 *
 * @param {object} supabase
 * @param {string} newParentId — the parent who just signed up
 * @param {string} referralCode — the code they entered (e.g. LP-ROTIMI-7X2K)
 * @returns {{ success: boolean, referrerName?: string, error?: string }}
 */
export async function applyReferralCode(supabase, newParentId, referralCode) {
  if (!referralCode || !referralCode.startsWith("LP-")) {
    return { success: false, error: "Invalid referral code format" };
  }

  // Find the referrer
  const { data: referrer, error: findErr } = await supabase
    .from("parents")
    .select("id, full_name, referral_credits")
    .eq("referral_code", referralCode.toUpperCase())
    .single();

  if (findErr || !referrer) {
    return { success: false, error: "Referral code not found" };
  }

  // Prevent self-referral
  if (referrer.id === newParentId) {
    return { success: false, error: "You cannot refer yourself" };
  }

  // Mark the new parent as referred
  const { error: updateNewErr } = await supabase
    .from("parents")
    .update({ referred_by: referralCode.toUpperCase() })
    .eq("id", newParentId);

  if (updateNewErr) {
    return { success: false, error: "Failed to apply referral" };
  }

  // Credit the referrer (+1 month)
  const { error: creditErr } = await supabase
    .from("parents")
    .update({ referral_credits: (referrer.referral_credits || 0) + 1 })
    .eq("id", referrer.id);

  if (creditErr) {
    console.warn("[referral] Failed to credit referrer:", creditErr.message);
    // Non-fatal — the new parent is still marked as referred
  }

  return {
    success: true,
    referrerName: referrer.full_name?.split(" ")[0] || "a friend",
  };
}

/**
 * Get referral stats for a parent (for dashboard display).
 */
export async function getReferralStats(supabase, parentId) {
  const { data: parent } = await supabase
    .from("parents")
    .select("referral_code, referral_credits, referred_by")
    .eq("id", parentId)
    .single();

  if (!parent) return { code: null, credits: 0, referredBy: null, referralCount: 0 };

  // Count how many people used this parent's code
  const { count } = await supabase
    .from("parents")
    .select("id", { count: "exact", head: true })
    .eq("referred_by", parent.referral_code);

  return {
    code: parent.referral_code,
    credits: parent.referral_credits || 0,
    referredBy: parent.referred_by,
    referralCount: count || 0,
  };
}