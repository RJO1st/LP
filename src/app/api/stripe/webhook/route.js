// ─── POST /api/stripe/webhook ────────────────────────────────────────────────
// Stripe calls this endpoint with a `Stripe-Signature` header after payment
// events. We verify the signature, claim idempotency, then dispatch.
//
// Signature format (Stripe-Signature): t=<ts>,v1=<hmac>[,v1=<hmac2>]
//   Signed payload: `${timestamp}.${rawBody}` (HMAC-SHA256, hex).
//   Multiple v1 entries may appear during Stripe secret rotation — we accept
//   any match. Replay window: 300 s (Stripe default; customisable via
//   `toleranceSec` in verifyStripeSignature).
//
// Implemented via `verifyStripeSignature()` in @/lib/security/webhook — the
// same module that handles Paystack HMAC, using crypto.timingSafeEqual.
//
// Event coverage:
//   checkout.session.completed     → activate uk_pro/uk_pro_exam, mark session done
//   customer.subscription.updated  → extend subscription_end on renewal
//   customer.subscription.deleted  → downgrade parent to free
//   invoice.payment_failed         → flip status to past_due (Stripe will retry)
//
//   All other events are claimed for audit but not acted on.
//
// Parent resolution strategy:
//   checkout.session.completed: DB row (stripe_sessions) > session metadata
//   subscription.*/invoice.*:   subscription.metadata.parent_id (set at checkout)
//                               > customer_email ilike lookup (Paystack pattern)
//
// Anti-arbitrage: Stripe only activates GB parents (region === 'GB'). Same
//   DB-authoritative pattern as the Paystack NG guard.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { verifyStripeSignature, validateEnumValue } from "@/lib/security/webhook";
import { claimWebhookEvent } from "@/lib/security/idempotency";
import { getServiceRoleClient } from "@/lib/security/serviceRole";
import { limit } from "@/lib/security/rateLimit";
import { getClientIp } from "@/lib/security/clientIp";
import { env } from "@/lib/env";
import logger from "@/lib/logger";

export const runtime  = "nodejs"; // crypto.timingSafeEqual requires Node
export const maxDuration = 20;

// ── Allow-lists (source of truth: src/lib/tierAccess.js) ────────────────────
const ALLOWED_PLANS   = ["uk_pro", "uk_pro_exam"];
const ALLOWED_BILLING = ["monthly", "annual"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Compute subscription_end.
 * Prefers Stripe's authoritative `current_period_end` Unix timestamp.
 * Falls back to +30d (monthly) / +1y (annual) estimate.
 */
function computeSubscriptionEnd(billing, periodEndUnix) {
  if (periodEndUnix && typeof periodEndUnix === "number") {
    const d = new Date(periodEndUnix * 1000);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  const d = new Date();
  if (billing === "annual") d.setFullYear(d.getFullYear() + 1);
  else d.setDate(d.getDate() + 30);
  return d.toISOString();
}

/**
 * Resolve a parent UUID from a customer email. Mirrors the Paystack webhook
 * helper: escapes ilike wildcards, uses maybeSingle, fail-open on miss.
 */
async function resolveParentByEmail(supabase, email) {
  if (!email || typeof email !== "string") return null;
  const safeEmail = email.trim()
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
  const { data, error } = await supabase
    .from("parents")
    .select("id")
    .ilike("email", safeEmail)
    .maybeSingle();
  if (error) {
    logger.error("stripe_webhook_email_lookup_failed", { email, error });
    return null;
  }
  return data?.id || null;
}

// ─── Handler dispatch table ───────────────────────────────────────────────────
const HANDLERS = {
  "checkout.session.completed":     handleCheckoutSessionCompleted,
  "customer.subscription.updated":  handleSubscriptionUpdated,
  "customer.subscription.deleted":  handleSubscriptionDeleted,
  "invoice.payment_failed":         handleInvoicePaymentFailed,
};

// ─── Main POST handler ────────────────────────────────────────────────────────
export async function POST(request) {
  // ── 1. Rate limit by IP ───────────────────────────────────────────────────
  const ip = getClientIp(request);
  const rl = await limit({ key: `stripe-webhook:${ip}`, windowSec: 60, max: 30 });
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // ── 2. Read raw body for HMAC verification ────────────────────────────────
  const rawBody         = await request.text();
  const signatureHeader = request.headers.get("stripe-signature");
  const secret          = env.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    logger.error("stripe_webhook_missing_secret");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  // ── 3. Timing-safe signature verification (300 s replay window) ───────────
  const sigOk = verifyStripeSignature({ rawBody, signatureHeader, secret });
  if (!sigOk) {
    logger.warn("stripe_webhook_sig_mismatch", { ip });
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // ── 4. Parse verified payload ─────────────────────────────────────────────
  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = event?.type;
  const eventId   = event?.id;
  const data      = event?.data?.object;

  if (!eventType || !eventId) {
    return NextResponse.json({ error: "Malformed event" }, { status: 400 });
  }

  const supabase = getServiceRoleClient();

  // ── 5. Idempotency claim (replay protection) ──────────────────────────────
  const claimed = await claimWebhookEvent(supabase, "stripe_events", {
    event_id:   eventId,
    event_type: eventType,
    reference:  data?.id || null,
    payload:    event,
  });
  if (!claimed) {
    return NextResponse.json({ received: true, replay: true });
  }

  // ── 6. Dispatch ───────────────────────────────────────────────────────────
  const handler = HANDLERS[eventType];
  if (!handler) {
    logger.info("stripe_webhook_unhandled_event", { eventType, eventId });
    return NextResponse.json({ received: true, handled: false });
  }

  try {
    await handler(supabase, data);
  } catch (err) {
    logger.error("stripe_webhook_handler_failed", { error: err, eventType, eventId });
    // Idempotency claim is already inserted — Stripe retries will be rejected
    // as replays. Errors need to be surfaced via logs for manual intervention.
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// HANDLERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * `checkout.session.completed` — payment succeeded, subscription created.
 * This is the primary activation event: upgrades the parent's tier.
 */
async function handleCheckoutSessionCompleted(supabase, session) {
  const sessionId = session?.id;
  if (!sessionId) {
    logger.warn("stripe_webhook_no_session_id");
    return;
  }

  // (a) Prefer the DB row we wrote at checkout time — not metadata-injectable.
  const { data: dbSession } = await supabase
    .from("stripe_sessions")
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();

  let plan, billing, parentId;

  if (dbSession) {
    plan     = dbSession.plan;
    billing  = dbSession.billing;
    parentId = dbSession.parent_id;
  } else {
    // (b) Fall back to session metadata. Every field is allow-listed below.
    const meta = session.metadata || {};
    plan     = typeof meta.plan     === "string" ? meta.plan.trim()     : "";
    billing  = typeof meta.billing  === "string" ? meta.billing.trim()  : "monthly";
    parentId = typeof meta.parent_id === "string" ? meta.parent_id.trim() : null;
  }

  // ── Validate plan and billing against allow-list ──────────────────────────
  const planCheck = validateEnumValue(plan, ALLOWED_PLANS, "plan");
  if (!planCheck.valid) {
    logger.error("stripe_webhook_invalid_plan", { sessionId, plan, reason: planCheck.reason });
    throw new Error(`Invalid plan: ${plan}`);
  }
  plan = planCheck.value;

  const billingCheck = validateEnumValue(billing, ALLOWED_BILLING, "billing");
  if (!billingCheck.valid) {
    logger.error("stripe_webhook_invalid_billing", { sessionId, billing, reason: billingCheck.reason });
    throw new Error(`Invalid billing: ${billing}`);
  }
  billing = billingCheck.value;

  if (!parentId) {
    logger.error("stripe_webhook_no_parent_id", { sessionId });
    throw new Error("No parent_id resolved for session");
  }

  // ── Anti-arbitrage: Stripe must only activate GB parents ──────────────────
  const { data: parentRow, error: parentErr } = await supabase
    .from("parents")
    .select("region")
    .eq("id", parentId)
    .maybeSingle();

  if (parentErr) {
    logger.error("stripe_webhook_parent_lookup_failed", { parentId, error: parentErr });
    throw new Error("Parent lookup failed");
  }
  if (parentRow?.region && parentRow.region !== "GB") {
    logger.warn("stripe_webhook_region_mismatch", { parentId, region: parentRow.region });
    throw new Error("Stripe activation refused: parent region is not GB");
  }

  const subscriptionId  = session.subscription || null;
  const subscriptionEnd = computeSubscriptionEnd(billing, null); // no period_end on session object

  // ── Activate parent ───────────────────────────────────────────────────────
  const { error: updateError } = await supabase
    .from("parents")
    .update({
      subscription_tier:        plan,
      subscription_status:      "active",
      subscription_end:         subscriptionEnd,
      billing_cycle:            billing,
      stripe_subscription_id:   subscriptionId,
      updated_at:               new Date().toISOString(),
    })
    .eq("id", parentId);

  if (updateError) {
    logger.error("stripe_webhook_parent_update_failed", { parentId, error: updateError });
    throw new Error("Parent update failed");
  }

  // ── Mark session complete ─────────────────────────────────────────────────
  await supabase
    .from("stripe_sessions")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("session_id", sessionId);

  logger.info("stripe_webhook_activated", { parentId, plan, billing, subscriptionId });
}

/**
 * `customer.subscription.updated` — recurring renewal or plan change.
 * Extends subscription_end to Stripe's authoritative next period end.
 * Also syncs subscription_status (active / past_due / cancelled).
 */
async function handleSubscriptionUpdated(supabase, subscription) {
  // subscription.metadata was populated via subscription_data.metadata at checkout.
  const meta     = subscription.metadata || {};
  let parentId   = typeof meta.parent_id === "string" ? meta.parent_id.trim() : null;

  // Fallback: resolve via Stripe customer email (stored on parent at signup)
  if (!parentId) {
    const customerEmail = subscription.customer_email || null;
    if (customerEmail) {
      parentId = await resolveParentByEmail(supabase, customerEmail);
    }
  }

  if (!parentId) {
    // Subscription may have been created outside our flow (manual dashboard action).
    // Silently skip — don't throw, as Stripe would retry on 5xx.
    logger.warn("stripe_webhook_sub_updated_no_parent", { subscriptionId: subscription.id });
    return;
  }

  const periodEnd = subscription.current_period_end; // Unix timestamp
  const stripeStatus = subscription.status;

  // Map Stripe subscription status to our internal status
  const ourStatus =
    stripeStatus === "active"    ? "active"
    : stripeStatus === "past_due"  ? "past_due"
    : stripeStatus === "canceled"  ? "cancelled"
    : "active"; // trialing, incomplete, incomplete_expired → treat as active

  const updates = {
    subscription_status:      ourStatus,
    stripe_subscription_id:   subscription.id,
    updated_at:               new Date().toISOString(),
  };

  if (periodEnd && typeof periodEnd === "number") {
    const d = new Date(periodEnd * 1000);
    if (!Number.isNaN(d.getTime())) {
      updates.subscription_end = d.toISOString();
    }
  }

  const { error } = await supabase
    .from("parents")
    .update(updates)
    .eq("id", parentId);

  if (error) {
    logger.error("stripe_webhook_sub_updated_error", { parentId, error });
    throw error;
  }

  logger.info("stripe_webhook_subscription_updated", {
    parentId,
    stripeStatus,
    ourStatus,
    periodEnd,
  });
}

/**
 * `customer.subscription.deleted` — subscription cancelled and expired.
 * Downgrade parent to free tier and clear subscription fields.
 */
async function handleSubscriptionDeleted(supabase, subscription) {
  const meta   = subscription.metadata || {};
  let parentId = typeof meta.parent_id === "string" ? meta.parent_id.trim() : null;

  if (!parentId) {
    // Try matching via subscription ID stored at activation
    const { data: parentRow } = await supabase
      .from("parents")
      .select("id")
      .eq("stripe_subscription_id", subscription.id)
      .maybeSingle();
    if (parentRow) parentId = parentRow.id;
  }

  if (!parentId) {
    logger.warn("stripe_webhook_sub_deleted_no_parent", { subscriptionId: subscription.id });
    return;
  }

  const { error } = await supabase
    .from("parents")
    .update({
      subscription_tier:       "free",
      subscription_status:     "cancelled",
      subscription_end:        new Date().toISOString(),
      stripe_subscription_id:  null,
      updated_at:              new Date().toISOString(),
    })
    .eq("id", parentId);

  if (error) {
    logger.error("stripe_webhook_sub_deleted_error", { parentId, error });
    throw error;
  }

  logger.info("stripe_webhook_downgraded", { parentId, subscriptionId: subscription.id });
}

/**
 * `invoice.payment_failed` — a recurring charge failed.
 * Stripe will retry; flip status to past_due so the UI can prompt to update
 * card details. Features remain enabled during the grace window.
 */
async function handleInvoicePaymentFailed(supabase, invoice) {
  const subscriptionId  = invoice?.subscription;
  const customerEmail   = invoice?.customer_email;

  let parentId = null;

  // (a) Prefer subscription ID stored at activation (single round-trip)
  if (subscriptionId) {
    const { data: parentRow } = await supabase
      .from("parents")
      .select("id")
      .eq("stripe_subscription_id", subscriptionId)
      .maybeSingle();
    if (parentRow) parentId = parentRow.id;
  }

  // (b) Fallback: email lookup (same as Paystack pattern)
  if (!parentId && customerEmail) {
    parentId = await resolveParentByEmail(supabase, customerEmail);
  }

  if (!parentId) {
    logger.warn("stripe_webhook_invoice_failed_no_parent", {
      subscriptionId,
      hasEmail: !!customerEmail,
    });
    return;
  }

  const { error } = await supabase
    .from("parents")
    .update({ subscription_status: "past_due", updated_at: new Date().toISOString() })
    .eq("id", parentId);

  if (error) {
    logger.error("stripe_webhook_invoice_failed_update_error", { parentId, error });
    throw error;
  }

  logger.info("stripe_webhook_invoice_payment_failed", { parentId, subscriptionId });
}
