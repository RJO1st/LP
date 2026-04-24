// ─── POST /api/paystack/checkout ────────────────────────────────────────────
// Initialises a Paystack transaction for a Nigerian parent and returns an
// authorisation URL the client can redirect to.
//
// Security posture (April 22 2026 audit):
//   1. Rate-limited by IP (20/min) BEFORE body parse — a leaked checkout
//      endpoint on a cheap rate limit is effectively a CPU DoS via the
//      Paystack round-trip. Upstash-backed, falls back to in-memory in dev.
//   2. Service-role access via `getServiceRoleClient()` — lazy, browser-
//      guarded, resolves new `sb_secret_*` key with legacy fallback.
//   3. SSR cookie client via shared `@/lib/supabase/server` — resolves new
//      `sb_publishable_*` key with legacy fallback.
//   4. Region-pinned: 403 if `parents.region !== 'NG'`. Billing region is set
//      at signup from curriculum, NOT from geo-IP, so a GB parent spoofing
//      `__geo_override=NG` can't buy a Nigerian plan at Nigerian prices.
// ────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { getServiceRoleClient } from "@/lib/security/serviceRole";
import { limit } from "@/lib/security/rateLimit";
import { getClientIp } from "@/lib/security/clientIp";
import { env } from "@/lib/env";
import logger from "@/lib/logger";

// ─── Amount table (all amounts in kobo — 1 NGN = 100 kobo) ──────────────────
const PLAN_AMOUNTS = {
  ng_scholar: {
    monthly: 250_000,  // ₦2,500
    annual:  2_500_000, // ₦25,000
  },
};

// Add-on amounts (monthly only — annual pro-rated by webhook)
const ADDON_AMOUNTS = {
  family_child: 100_000, // ₦1,000/mo per scholar
  waec_boost:   100_000, // ₦1,000/mo
  ai_unlimited:  50_000, // ₦500/mo
};

const VALID_ADDONS = new Set(Object.keys(ADDON_AMOUNTS));

/**
 * POST /api/paystack/checkout
 * Body: { plan: "ng_scholar", billing: "monthly"|"annual", addons?: string[] }
 *
 * Returns: { authorization_url, reference, amount_kobo }
 * Errors:  401 (not authenticated), 403 (region mismatch), 400 (bad input),
 *          429 (rate limited), 502 (Paystack error)
 */
export async function POST(request) {
  // ── 0. Rate limit by IP ───────────────────────────────────────────────────
  // 20/min is generous for a legitimate flow (a parent picking a plan rarely
  // fires this more than once or twice) but cheap enough to absorb a burst.
  // The real protection is upstream of the Paystack round-trip.
  const ip = getClientIp(request);
  const rl = await limit({
    key: `paystack-checkout:${ip}`,
    windowSec: 60,
    max: 20,
  });
  if (!rl.success) {
    logger.warn("paystack_checkout_rate_limited", { ip, backend: rl.backend });
    return NextResponse.json(
      { error: "Too many requests. Try again in a minute." },
      { status: 429 }
    );
  }

  // ── 1. Parse and validate request body ────────────────────────────────────
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { plan = "ng_scholar", billing = "monthly", addons = [] } = body;

  if (!PLAN_AMOUNTS[plan]) {
    return NextResponse.json({ error: `Unknown plan: ${plan}` }, { status: 400 });
  }
  if (!["monthly", "annual"].includes(billing)) {
    return NextResponse.json({ error: "billing must be 'monthly' or 'annual'" }, { status: 400 });
  }
  if (!Array.isArray(addons) || addons.some((a) => !VALID_ADDONS.has(a))) {
    return NextResponse.json({ error: "Invalid addon(s)" }, { status: 400 });
  }

  // ── 1b. Block add-ons on annual billing (one-time charge model) ───────────
  // Our current checkout is a one-time `transaction/initialize` charge with no
  // stored `authorization_code` and no recurring billing infrastructure.
  // If we accept an annual base plan plus add-ons, the webhook would set
  // `ng_addons` for the full 12-month `subscription_end` with NO further
  // charges. That is a silent revenue leak (₦12,000/yr per WAEC Boost user,
  // ₦6,000/yr per AI Unlimited user, ₦12,000/yr per extra scholar).
  // Fix: force parents to switch to monthly if they want add-ons. Re-enable
  // when Paystack Plans (`plan_code` + `authorization_code` recurring charges)
  // are wired. See tasks/lessons.md "Payments" section.
  if (billing === "annual" && addons.length > 0) {
    return NextResponse.json(
      {
        error:
          "Add-ons are available on monthly billing only. Switch to monthly billing to customise your plan.",
      },
      { status: 400 }
    );
  }

  // ── 2. Authenticate the requesting user ───────────────────────────────────
  // Shared SSR client uses `supabaseKeys.publishable()` (new or legacy).
  const supabase = await createServerSupabase();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  // ── 3. Anti-arbitrage: verify parent is Nigerian ──────────────────────────
  // Billing region is set at signup from curriculum — NOT from geo-IP.
  // This prevents GB users from purchasing NG plans at NG prices.
  const serviceClient = getServiceRoleClient();
  const { data: parent, error: parentError } = await serviceClient
    .from("parents")
    .select("id, email, region, subscription_tier")
    .eq("id", user.id)
    .single();

  if (parentError || !parent) {
    return NextResponse.json({ error: "Parent record not found" }, { status: 404 });
  }
  if (parent.region !== "NG") {
    return NextResponse.json(
      { error: "Paystack checkout is for Nigerian accounts only" },
      { status: 403 }
    );
  }

  // ── 4. Calculate total amount in kobo ─────────────────────────────────────
  // Annual + add-ons is rejected above (§1b), so at this point `addons` is
  // either a non-empty list with `billing === "monthly"`, or an empty list
  // with either billing cycle. Keep the reduce defensive.
  let totalKobo = PLAN_AMOUNTS[plan][billing];
  const addonMonthlyKobo = addons.reduce((sum, a) => sum + ADDON_AMOUNTS[a], 0);
  if (billing === "monthly") {
    totalKobo += addonMonthlyKobo;
  }

  // ── 5. Build Paystack transaction metadata ────────────────────────────────
  const metadata = {
    plan,
    billing,
    addons: addons.join(","),
    parent_id: parent.id,
    cancel_action: `${env.APP_URL}/subscribe`,
  };

  const callbackUrl = `${env.APP_URL}/api/paystack/callback`;

  // ── 6. Initialise Paystack transaction ────────────────────────────────────
  let paystackResponse;
  try {
    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: parent.email || user.email,
        amount: totalKobo,
        currency: "NGN",
        callback_url: callbackUrl,
        metadata,
        // Plan code can be set later when Paystack subscriptions are activated;
        // for now we use one-time charges with metadata-driven renewal logic.
        channels: ["card", "bank", "ussd", "mobile_money"],
      }),
    });

    paystackResponse = await res.json();
  } catch (networkError) {
    logger.error("paystack_checkout_network_error", { error: networkError });
    return NextResponse.json(
      { error: "Could not reach Paystack. Please try again." },
      { status: 502 }
    );
  }

  if (!paystackResponse.status) {
    logger.error("paystack_checkout_init_failed", {
      message: paystackResponse.message,
      parent_id: parent.id,
    });
    return NextResponse.json(
      { error: paystackResponse.message || "Paystack initialisation failed" },
      { status: 502 }
    );
  }

  // ── 7. Store the pending reference so the webhook can match it ────────────
  // We record the reference + metadata in the DB so the webhook can look it up
  // even if the metadata Paystack sends back is truncated.
  await serviceClient.from("paystack_transactions").upsert({
    reference: paystackResponse.data.reference,
    parent_id: parent.id,
    plan,
    billing,
    addons: addons,
    amount_kobo: totalKobo,
    status: "pending",
    created_at: new Date().toISOString(),
  });

  return NextResponse.json({
    authorization_url: paystackResponse.data.authorization_url,
    reference: paystackResponse.data.reference,
    amount_kobo: totalKobo,
  });
}
