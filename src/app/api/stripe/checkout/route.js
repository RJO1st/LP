// ─── POST /api/stripe/checkout ───────────────────────────────────────────────
// Creates a Stripe Checkout Session (mode: subscription) for a GB parent and
// returns a checkout_url the client can redirect to.
//
// Security posture (mirrors /api/paystack/checkout pattern):
//   1. Rate-limited by IP (20/min) BEFORE body parse.
//   2. Service-role access via `getServiceRoleClient()`.
//   3. SSR cookie client via shared `@/lib/supabase/server`.
//   4. Region-pinned: 403 if `parents.region !== 'GB'`. Billing region is set
//      at signup from curriculum, NOT from geo-IP.
//   5. Feature-flagged: 503 if STRIPE_SECRET_KEY env var is absent (UK entity
//      not yet live). Matches `featureFlags.stripeEnabled()` in env.ts.
//   6. Price IDs sourced from env vars (STRIPE_PRICE_UK_PRO_MONTHLY etc.) so
//      no price data is ever hardcoded — set them in Vercel once the Stripe
//      account and products are created.
//
// Stripe session metadata:
//   `metadata.{parent_id,plan,billing}` — available in checkout.session.completed.
//   `subscription_data.metadata.{parent_id,plan,billing}` — Stripe copies these
//   to the subscription object, available in customer.subscription.* events so
//   we can resolve the parent without a secondary lookup.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { getServiceRoleClient } from "@/lib/security/serviceRole";
import { limit } from "@/lib/security/rateLimit";
import { getClientIp } from "@/lib/security/clientIp";
import { env } from "@/lib/env";
import logger from "@/lib/logger";

export const runtime = "nodejs";

// ─── Audit-trail amounts (pence). Stripe prices are authoritative — these are
//     only stored in stripe_sessions for internal reporting.
const PLAN_AMOUNTS_PENCE = {
  uk_pro:      { monthly: 1299,  annual: 12000 }, // £12.99/mo · £120/yr
  uk_pro_exam: { monthly: 1799,  annual: 16800 }, // £17.99/mo · £168/yr
};

const ALLOWED_PLANS   = ["uk_pro", "uk_pro_exam"];
const ALLOWED_BILLING = ["monthly", "annual"];

/**
 * Map (plan, billing) → Stripe price ID from env vars.
 * Returns null if the env var isn't set (UK entity not yet active).
 */
function getPriceId(plan, billing) {
  const map = {
    uk_pro_monthly:       env.STRIPE_PRICE_UK_PRO_MONTHLY,
    uk_pro_annual:        env.STRIPE_PRICE_UK_PRO_ANNUAL,
    uk_pro_exam_monthly:  env.STRIPE_PRICE_UK_PRO_EXAM_MONTHLY,
    uk_pro_exam_annual:   env.STRIPE_PRICE_UK_PRO_EXAM_ANNUAL,
  };
  const key = `${plan}_${billing}`;
  return map[key] || null;
}

/**
 * POST /api/stripe/checkout
 * Body: { plan: "uk_pro" | "uk_pro_exam", billing: "monthly" | "annual" }
 *
 * Returns: { checkout_url, session_id }
 * Errors:  401 (unauth), 403 (region mismatch), 400 (bad input),
 *          429 (rate limited), 503 (Stripe not enabled), 502 (Stripe error)
 */
export async function POST(request) {
  // ── 0. Feature flag: gates on STRIPE_SECRET_KEY being set ────────────────
  if (!env.featureFlags.stripeEnabled()) {
    return NextResponse.json(
      { error: "UK subscriptions are launching soon. We'll email you as soon as they're available." },
      { status: 503 }
    );
  }

  // ── 1. Rate limit by IP ───────────────────────────────────────────────────
  const ip = getClientIp(request);
  const rl = await limit({ key: `stripe-checkout:${ip}`, windowSec: 60, max: 20 });
  if (!rl.success) {
    logger.warn("stripe_checkout_rate_limited", { ip, backend: rl.backend });
    return NextResponse.json(
      { error: "Too many requests. Try again in a minute." },
      { status: 429 }
    );
  }

  // ── 2. Parse and validate request body ────────────────────────────────────
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { plan = "uk_pro", billing = "monthly" } = body;

  if (!ALLOWED_PLANS.includes(plan)) {
    return NextResponse.json({ error: `Unknown plan: ${plan}` }, { status: 400 });
  }
  if (!ALLOWED_BILLING.includes(billing)) {
    return NextResponse.json({ error: "billing must be 'monthly' or 'annual'" }, { status: 400 });
  }

  // ── 3. Authenticate the requesting user ───────────────────────────────────
  const supabase = await createServerSupabase();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  // ── 4. Anti-arbitrage: verify parent is GB ────────────────────────────────
  // Billing region is set at signup from curriculum — NOT from geo-IP.
  // A Nigerian parent with __geo_override=GB cannot buy a UK plan.
  const serviceClient = getServiceRoleClient();
  const { data: parent, error: parentError } = await serviceClient
    .from("parents")
    .select("id, email, region, subscription_tier")
    .eq("id", user.id)
    .single();

  if (parentError || !parent) {
    return NextResponse.json({ error: "Parent record not found" }, { status: 404 });
  }
  if (parent.region !== "GB") {
    return NextResponse.json(
      { error: "Stripe checkout is for UK accounts only" },
      { status: 403 }
    );
  }

  // ── 5. Resolve Stripe price ID ────────────────────────────────────────────
  const priceId = getPriceId(plan, billing);
  if (!priceId) {
    logger.warn("stripe_checkout_no_price_id", { plan, billing, parent_id: parent.id });
    return NextResponse.json(
      { error: "UK subscription pricing is not yet configured. We'll be in touch shortly." },
      { status: 503 }
    );
  }

  // ── 6. Build Stripe Checkout Session ─────────────────────────────────────
  // Stripe's API uses application/x-www-form-urlencoded for v1 endpoints.
  const appUrl = env.APP_URL;
  const successUrl = `${appUrl}/api/stripe/callback?session_id={CHECKOUT_SESSION_ID}&result=success`;
  const cancelUrl  = `${appUrl}/subscribe?payment=failed&provider=stripe`;

  const params = new URLSearchParams();
  params.append("mode",                       "subscription");
  params.append("line_items[0][price]",       priceId);
  params.append("line_items[0][quantity]",    "1");
  params.append("customer_email",             parent.email || user.email || "");
  params.append("success_url",                successUrl);
  params.append("cancel_url",                 cancelUrl);

  // Session metadata — available in checkout.session.completed
  params.append("metadata[parent_id]",        parent.id);
  params.append("metadata[plan]",             plan);
  params.append("metadata[billing]",          billing);

  // Subscription metadata — Stripe copies these to the Subscription object,
  // so they're available in customer.subscription.* events for free resolution
  // without a secondary DB lookup.
  params.append("subscription_data[metadata][parent_id]", parent.id);
  params.append("subscription_data[metadata][plan]",      plan);
  params.append("subscription_data[metadata][billing]",   billing);

  let stripeResponse;
  try {
    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    stripeResponse = await res.json();
  } catch (networkError) {
    logger.error("stripe_checkout_network_error", { error: networkError });
    return NextResponse.json(
      { error: "Could not reach Stripe. Please try again." },
      { status: 502 }
    );
  }

  if (stripeResponse.error) {
    logger.error("stripe_checkout_session_failed", {
      message: stripeResponse.error.message,
      code:    stripeResponse.error.code,
      parent_id: parent.id,
    });
    return NextResponse.json(
      { error: stripeResponse.error.message || "Stripe session creation failed" },
      { status: 502 }
    );
  }

  // ── 7. Store the pending session so the webhook can resolve plan + billing ─
  // This is the trusted source — not Stripe metadata, which was set by us
  // but is technically user-supplied at checkout time. The webhook prefers
  // this row over the session's metadata field.
  const amountPence = PLAN_AMOUNTS_PENCE[plan]?.[billing] ?? 0;
  await serviceClient.from("stripe_sessions").upsert({
    session_id:      stripeResponse.id,
    parent_id:       parent.id,
    plan,
    billing,
    amount_pence:    amountPence,
    stripe_price_id: priceId,
    status:          "pending",
    created_at:      new Date().toISOString(),
  });

  logger.info("stripe_checkout_initiated", {
    parent_id:  parent.id,
    plan,
    billing,
    session_id: stripeResponse.id,
  });

  return NextResponse.json({
    checkout_url: stripeResponse.url,
    session_id:   stripeResponse.id,
  });
}
