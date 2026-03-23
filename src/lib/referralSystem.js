/**
 * referralSystem.js
 * Deploy to: src/lib/referralSystem.js
 *
 * Privacy-safe referral system. Codes are random alphanumeric — NO parent names.
 * Format: LP-XXXX-YYYY (e.g. LP-7K2M-9FH3)
 */

/**
 * Generate a random referral code (no PII).
 */
function generateCode() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no I/L/O/0/1 to avoid confusion
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `LP-${seg()}-${seg()}`;
}

/**
 * Ensure a parent has a referral code. If they have an old name-based one (LP-ROTIMI-...),
 * migrate it to anonymous format.
 */
export async function ensureReferralCode(supabase, parentId, parentName) {
  const { data: parent } = await supabase
    .from("parents")
    .select("referral_code")
    .eq("id", parentId)
    .single();

  if (parent?.referral_code) {
    // Check if old format contains a name (3rd segment is 4 chars = new format, longer = old name format)
    const parts = parent.referral_code.split("-");
    const isOldFormat = parts.length === 3 && parts[1].length > 4;

    if (isOldFormat) {
      // Migrate to anonymous code
      const newCode = generateCode();
      await supabase
        .from("parents")
        .update({ referral_code: newCode })
        .eq("id", parentId);

      // Also update any references in referred_by
      await supabase
        .from("parents")
        .update({ referred_by: newCode })
        .eq("referred_by", parent.referral_code);

      return newCode;
    }

    return parent.referral_code;
  }

  // Generate new code
  let code = generateCode();
  let attempts = 0;

  while (attempts < 5) {
    const { error } = await supabase
      .from("parents")
      .update({ referral_code: code })
      .eq("id", parentId);

    if (!error) return code;

    // Collision — regenerate
    code = generateCode();
    attempts++;
  }

  return null;
}

/**
 * Apply a referral code during signup.
 */
export async function applyReferralCode(supabase, newParentId, referralCode) {
  if (!referralCode || !referralCode.startsWith("LP-")) {
    return { success: false, error: "Invalid referral code format" };
  }

  const { data: referrer, error: findErr } = await supabase
    .from("parents")
    .select("id, full_name, referral_credits")
    .eq("referral_code", referralCode.toUpperCase())
    .single();

  if (findErr || !referrer) {
    return { success: false, error: "Referral code not found" };
  }

  if (referrer.id === newParentId) {
    return { success: false, error: "You cannot refer yourself" };
  }

  const { error: updateNewErr } = await supabase
    .from("parents")
    .update({ referred_by: referralCode.toUpperCase() })
    .eq("id", newParentId);

  if (updateNewErr) {
    return { success: false, error: "Failed to apply referral" };
  }

  const { error: creditErr } = await supabase
    .from("parents")
    .update({ referral_credits: (referrer.referral_credits || 0) + 1 })
    .eq("id", referrer.id);

  if (creditErr) {
    console.warn("[referral] Failed to credit referrer:", creditErr.message);
  }

  return { success: true, referrerName: "a friend" }; // Never expose referrer name
}

/**
 * Get referral stats for a parent.
 */
export async function getReferralStats(supabase, parentId) {
  const { data: parent } = await supabase
    .from("parents")
    .select("referral_code, referral_credits, referred_by")
    .eq("id", parentId)
    .single();

  if (!parent) return { code: null, credits: 0, referredBy: null, referralCount: 0 };

  const { count } = await supabase
    .from("parents")
    .select("id", { count: "exact", head: true })
    .eq("referred_by", parent.referral_code);

  return {
    code: parent.referral_code,
    credits: parent.referral_credits || 0,
    referredBy: parent.referred_by ? true : false, // Boolean only — don't expose who
    referralCount: count || 0,
  };
}