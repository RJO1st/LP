// ─── POST /api/paystack/webhook ─────────────────────────────────────────────
// Paystack calls this endpoint after a charge completes, a subscription
// disables, etc. Paystack sends an HMAC-SHA512 signature in the
// `x-paystack-signature` header over the raw request body, keyed with our
// live secret key.
//
// NOTE (April 22 2026 security audit):
//   Previous version had five latent issues addressed here:
//     1. Module-scope service-role client (runs on cold start, no guard).
//     2. Signature comparison used `!==` which leaks timing information.
//     3. No replay protection: a captured valid request could be re-played
//        indefinitely and would re-apply the subscription update each time.
//     4. `plan`, `billing`, and `addons` were taken straight from
//        `data.metadata` with no allow-list, so a caller who could inject
//        metadata could set `subscription_tier` to any string, or stuff the
//        `ng_addons` array with arbitrary codes.
//     5. `x-forwarded-for` fallback took `[0]` (attacker-controlled leftmost
//        entry) instead of `[last]` (the nearest-trusted proxy per Phase 3
//        IP trust rule).
//
//   Fixed via helpers in `@/lib/security/`:
//     - `getServiceRoleClient()`   - lazy, browser-guarded factory
//     - `verifyHmac()`              - `crypto.timingSafeEqual` on equal-length Buffers
//     - `claimWebhookEvent()`       - idempotency via `paystack_events` unique PK
//     - `validateEnumValue()` + `sanitiseAddons()` - strict allow-listing
//
//   The endpoint is also rate-limited by IP (30/min) so a leaked signature
//   can't be brute-force fuzzed, and runs on the Node runtime because
//   `timingSafeEqual` isn't available on Edge.
//
// Event coverage:
//   charge.success          → upgrade parent, mark txn complete
//   charge.failed           → mark pending txn as failed (no parent change)
//   subscription.create     → extend subscription_end from next_payment_date
//   subscription.disable    → downgrade parent to free
//   subscription.not_renew  → flip status to 'cancelling' (still active until expiry)
//   invoice.payment_failed  → flip status to 'past_due' (Paystack will retry)
//
//   Any other event type (invoice.create, invoice.update, etc.) is claimed
//   into paystack_events for audit but not acted on.
//
// subscription_status state transitions (enforced by CHECK constraint in
// 20260422_subscription_status_cancelling.sql):
//   null            → 'active'      (charge.success)
//   'active'        → 'cancelling'  (subscription.not_renew)
//   'active'        → 'past_due'    (invoice.payment_failed)
//   'past_due'      → 'active'      (next charge.success)
//   'cancelling'    → 'cancelled'   (subscription.disable when period ends)
//   'active'        → 'cancelled'   (subscription.disable, hard cancel)
// ────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { verifyHmac, validateEnumValue, sanitiseAddons } from "@/lib/security/webhook";
import { claimWebhookEvent } from "@/lib/security/idempotency";
import { getServiceRoleClient } from "@/lib/security/serviceRole";
import { limit } from "@/lib/security/rateLimit";
import { getClientIp } from "@/lib/security/clientIp";
import { env } from "@/lib/env";
import logger from "@/lib/logger";

export const runtime = "nodejs"; // timingSafeEqual requires Node
export const maxDuration = 20;

// ── Allow-lists (source of truth: src/lib/tierAccess.js) ────────────────────
// Paystack only ever activates Nigerian plans; GB runs through Stripe.
const ALLOWED_PLANS = ["ng_scholar"];
// Legacy reference aliases we still accept at the metadata layer, normalised
// to `ng_scholar` before the DB write. (Historical checkouts that shipped
// these codes in a customer's payment link still need to clear.)
const LEGACY_PLAN_ALIASES = {
  ng_explorer: "ng_scholar",
  ng_waec: "ng_scholar",
  ng_family_2: "ng_scholar",
  ng_family_3: "ng_scholar",
  ng_family_4plus: "ng_scholar",
};
const ALLOWED_BILLING = ["monthly", "annual"];
const ALLOWED_ADDONS = ["waec_boost", "family_child", "ai_unlimited"];

/**
 * Compute subscription_end from billing cycle.
 *   annual  → +1 year
 *   monthly → +30 days
 */
function computeSubscriptionEnd(billing) {
  const d = new Date();
  if (billing === "annual") d.setFullYear(d.getFullYear() + 1);
  else d.setDate(d.getDate() + 30);
  return d.toISOString();
}

// getClientIp moved to @/lib/security/clientIp (shared with the other public
// endpoints that rate-limit by IP). Trust order documented there.

/**
 * Handler dispatch table. Event types not listed here are claimed into
 * `paystack_events` for audit but silently acknowledged without action.
 */
const HANDLERS = {
  "charge.success": handleChargeSuccess,
  "charge.failed": handleChargeFailed,
  "subscription.create": handleSubscriptionCreate,
  "subscription.disable": handleSubscriptionDisable,
  "subscription.not_renew": handleSubscriptionNotRenew,
  "invoice.payment_failed": handleInvoicePaymentFailed,
};

export async function POST(request) {
  // ── 1. Rate limit by IP (protects against signature-fuzzing floods) ─────
  const ip = getClientIp(request);
  const rl = await limit({
    key: `paystack-webhook:${ip}`,
    windowSec: 60,
    max: 30,
  });
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // ── 2. Read raw body for HMAC verification ──────────────────────────────
  const rawBody = await request.text();
  const signatureHeader = request.headers.get("x-paystack-signature");
  const secret = env.PAYSTACK_SECRET_KEY;

  if (!secret) {
    logger.error("paystack_webhook_missing_secret");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  // ── 3. Timing-safe signature verification ───────────────────────────────
  const sigOk = verifyHmac({
    rawBody,
    signatureHeader,
    secret,
    algo: "sha512",
    encoding: "hex",
  });
  if (!sigOk) {
    logger.warn("paystack_webhook_sig_mismatch", { ip });
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // ── 4. Parse verified payload ───────────────────────────────────────────
  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = event?.event;
  const data = event?.data;
  const reference = data?.reference || data?.transaction?.reference || null;
  const eventId = data?.id ? String(data.id) : reference;

  if (!eventType || !eventId) {
    return NextResponse.json({ error: "Malformed event" }, { status: 400 });
  }

  const supabase = getServiceRoleClient();

  // ── 5. Idempotency claim (replay protection) ────────────────────────────
  const claimed = await claimWebhookEvent(supabase, "paystack_events", {
    event_id: eventId,
    event_type: eventType,
    reference: reference,
    payload: event,
  });
  if (!claimed) {
    // Already processed - acknowledge quickly so Paystack stops retrying.
    return NextResponse.json({ received: true, replay: true });
  }

  // ── 6. Dispatch ─────────────────────────────────────────────────────────
  const handler = HANDLERS[eventType];
  if (!handler) {
    // Unknown / unhandled event: claim was recorded for audit, ack with 200.
    logger.info("paystack_webhook_unhandled_event", { eventType, reference });
    return NextResponse.json({ received: true, handled: false });
  }

  try {
    await handler(supabase, data);
  } catch (err) {
    logger.error("paystack_webhook_handler_failed", {
      error: err,
      eventType,
      reference,
    });
    // Paystack retries on non-2xx. Note: the idempotency claim is already
    // in place, so a retry will short-circuit as a replay. Handler failures
    // are effectively one-shot — surface via logs + Sentry for manual fix.
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pull a customer email out of a Paystack event payload. Paystack normally
 * attaches `data.customer.email`, but invoice events may also put it on
 * `data.customer` directly.
 */
function extractCustomerEmail(data) {
  if (!data) return null;
  if (typeof data.customer?.email === "string") return data.customer.email;
  // Fallback for older invoice event shapes.
  if (typeof data.customer === "string") return data.customer;
  return null;
}

/**
 * Resolve a parent UUID from a Paystack customer email.
 *
 * Supabase JS v2 has no `auth.admin.getUserByEmail()` method. Options are:
 *   (a) paginate `auth.admin.listUsers()` — expensive (200 calls at scale).
 *   (b) query `parents.email` directly — single round-trip, uses the
 *       column populated at signup. Chosen here.
 *
 * Stored emails may be mixed-case (signup doesn't normalise), so we match
 * with `ilike`. The `%` and `_` chars are wildcards in `ilike`; they're
 * legal in RFC email local parts, so escape them to block the pathological
 * case where `victim%@x` would match multiple rows and trip `maybeSingle`.
 *
 * Returns null on miss — callers decide whether that's an error or a skip.
 */
async function resolveParentIdByEmail(supabase, email) {
  if (!email) return null;

  // Escape Postgres ilike wildcards (\ must be escaped first).
  const safeEmail = email.trim().replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");

  const { data, error } = await supabase
    .from("parents")
    .select("id")
    .ilike("email", safeEmail)
    .maybeSingle();

  if (error) {
    logger.error("paystack_webhook_parent_email_lookup_failed", { email, error });
    return null;
  }
  if (!data) {
    logger.warn("paystack_webhook_no_parent_for_email", { email });
    return null;
  }
  return data.id;
}

// ─────────────────────────────────────────────────────────────────────────────
// HANDLERS
// ─────────────────────────────────────────────────────────────────────────────

async function handleChargeSuccess(supabase, data) {
  const reference = data.reference;

  // (a) Prefer the transaction row we wrote at checkout (most reliable).
  const { data: txn, error: txnError } = await supabase
    .from("paystack_transactions")
    .select("*")
    .eq("reference", reference)
    .maybeSingle();

  let plan;
  let billing;
  let addons;
  let parentId;

  if (txn && !txnError) {
    plan = txn.plan;
    billing = txn.billing;
    addons = Array.isArray(txn.addons) ? txn.addons : [];
    parentId = txn.parent_id;
  } else {
    // (b) Fall back to Paystack metadata. EVERY field gets allow-listed.
    const meta = data.metadata || {};
    const rawPlan = typeof meta.plan === "string" ? meta.plan : "ng_scholar";
    plan = LEGACY_PLAN_ALIASES[rawPlan] || rawPlan;
    billing = typeof meta.billing === "string" ? meta.billing : "monthly";

    const rawAddons = typeof meta.addons === "string"
      ? meta.addons.split(",").map((s) => s.trim()).filter(Boolean)
      : Array.isArray(meta.addons)
        ? meta.addons
        : [];
    addons = rawAddons;

    parentId = typeof meta.parent_id === "string" ? meta.parent_id : null;
  }

  // ── Validate plan and billing against allow-list. Refuse on failure. ────
  const planCheck = validateEnumValue(plan, ALLOWED_PLANS, "plan");
  if (!planCheck.valid) {
    logger.error("paystack_webhook_invalid_plan", {
      reference,
      plan,
      reason: planCheck.reason,
    });
    throw new Error(`Invalid plan: ${plan}`);
  }
  plan = planCheck.value;

  const billingCheck = validateEnumValue(billing, ALLOWED_BILLING, "billing");
  if (!billingCheck.valid) {
    logger.error("paystack_webhook_invalid_billing", {
      reference,
      billing,
      reason: billingCheck.reason,
    });
    throw new Error(`Invalid billing: ${billing}`);
  }
  billing = billingCheck.value;

  addons = sanitiseAddons(addons, ALLOWED_ADDONS);

  // ── Defense in depth: annual billing must not carry add-ons ─────────────
  // The checkout route already rejects this combo at purchase time (§1b).
  // Enforce the same rule here so a tampered or manually crafted webhook
  // payload can't activate add-ons on an annual subscription.
  if (billing === "annual" && addons.length > 0) {
    logger.warn("paystack_webhook_annual_addon_rejected", {
      reference,
      billing,
      addons,
    });
    addons = [];
  }

  // ── Resolve parent_id if missing ────────────────────────────────────────
  if (!parentId) {
    const customerEmail = extractCustomerEmail(data);
    if (!customerEmail) {
      logger.error("paystack_webhook_no_parent_or_email", { reference });
      return;
    }
    parentId = await resolveParentIdByEmail(supabase, customerEmail);
    if (!parentId) return;
  }

  // ── Anti-arbitrage: Paystack must only activate NG parents ──────────────
  const { data: parentRow, error: parentErr } = await supabase
    .from("parents")
    .select("region")
    .eq("id", parentId)
    .maybeSingle();

  if (parentErr) {
    logger.error("paystack_webhook_parent_lookup_failed", { parentId, error: parentErr });
    throw new Error("Parent lookup failed");
  }
  if (parentRow?.region && parentRow.region !== "NG") {
    logger.warn("paystack_webhook_region_mismatch", {
      parentId,
      region: parentRow.region,
    });
    throw new Error("Paystack activation refused: parent region is not NG");
  }

  const subscriptionEnd = computeSubscriptionEnd(billing);

  // ── Update parent subscription state ────────────────────────────────────
  const { error: updateError } = await supabase
    .from("parents")
    .update({
      subscription_tier: plan,
      subscription_status: "active",
      subscription_end: subscriptionEnd,
      ng_addons: addons,
      billing_cycle: billing,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parentId);

  if (updateError) {
    logger.error("paystack_webhook_parent_update_failed", {
      parentId,
      error: updateError,
    });
    throw new Error("Parent update failed");
  }

  // ── Mark the transaction as completed ───────────────────────────────────
  if (txn) {
    await supabase
      .from("paystack_transactions")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("reference", reference);
  }

  logger.info("paystack_webhook_activated", { parentId, plan, billing, addons });
}

/**
 * `charge.failed` — the initial charge attempt failed. The parent was never
 * upgraded, so no tier change needed. Just mark the pending transaction row
 * as failed so the UI stops showing it as in-flight.
 */
async function handleChargeFailed(supabase, data) {
  const reference = data?.reference;
  if (!reference) {
    logger.warn("paystack_webhook_charge_failed_no_reference", { eventId: data?.id });
    return;
  }

  const { error } = await supabase
    .from("paystack_transactions")
    .update({
      status: "failed",
      completed_at: new Date().toISOString(),
    })
    .eq("reference", reference)
    .eq("status", "pending"); // only move pending → failed, never overwrite completed

  if (error) {
    logger.error("paystack_webhook_charge_failed_update_error", {
      reference,
      error,
    });
    throw error;
  }

  logger.info("paystack_webhook_charge_failed", {
    reference,
    gateway_response: data?.gateway_response,
  });
}

/**
 * `subscription.create` — Paystack created a recurring subscription after a
 * successful first charge. The parent was already activated by
 * `charge.success`; we use this event to extend `subscription_end` to match
 * the real next-payment date rather than the +30d estimate.
 */
async function handleSubscriptionCreate(supabase, data) {
  const customerEmail = extractCustomerEmail(data);
  const nextPaymentDate = data?.next_payment_date;
  const planCode = data?.plan?.plan_code || data?.plan_code;

  if (!customerEmail) {
    logger.warn("paystack_webhook_sub_create_no_email", { eventId: data?.id });
    return;
  }

  const parentId = await resolveParentIdByEmail(supabase, customerEmail);
  if (!parentId) return;

  // Anti-arbitrage guard: same rule as charge.success.
  const { data: parentRow, error: parentErr } = await supabase
    .from("parents")
    .select("region")
    .eq("id", parentId)
    .maybeSingle();

  if (parentErr) {
    logger.error("paystack_webhook_sub_create_parent_lookup_failed", { parentId, error: parentErr });
    throw new Error("Parent lookup failed");
  }
  if (parentRow?.region && parentRow.region !== "NG") {
    logger.warn("paystack_webhook_sub_create_region_mismatch", { parentId, region: parentRow.region });
    return; // don't throw — charge.success already activated; just skip the update.
  }

  const updates = {
    subscription_status: "active",
    updated_at: new Date().toISOString(),
  };

  // Only extend subscription_end if Paystack gave us a real next-payment date.
  if (nextPaymentDate) {
    const d = new Date(nextPaymentDate);
    if (!Number.isNaN(d.getTime())) {
      updates.subscription_end = d.toISOString();
    }
  }

  const { error } = await supabase
    .from("parents")
    .update(updates)
    .eq("id", parentId);

  if (error) {
    logger.error("paystack_webhook_sub_create_update_error", { parentId, error });
    throw error;
  }

  logger.info("paystack_webhook_sub_create", {
    parentId,
    planCode,
    nextPaymentDate,
  });
}

async function handleSubscriptionDisable(supabase, data) {
  const customerEmail = extractCustomerEmail(data);
  if (!customerEmail) return;

  const parentId = await resolveParentIdByEmail(supabase, customerEmail);
  if (!parentId) return;

  await supabase
    .from("parents")
    .update({
      subscription_tier: "free",
      subscription_status: "cancelled",
      subscription_end: new Date().toISOString(),
      ng_addons: [],
      updated_at: new Date().toISOString(),
    })
    .eq("id", parentId);

  logger.info("paystack_webhook_downgraded", { email: customerEmail });
}

/**
 * `subscription.not_renew` — the parent has cancelled but the subscription is
 * still active until the current period end. Flip status to 'cancelling' so
 * the UI can show "will not renew on DD/MM" but keep features enabled. The
 * eventual `subscription.disable` will complete the downgrade.
 */
async function handleSubscriptionNotRenew(supabase, data) {
  const customerEmail = extractCustomerEmail(data);
  if (!customerEmail) {
    logger.warn("paystack_webhook_not_renew_no_email", { eventId: data?.id });
    return;
  }

  const parentId = await resolveParentIdByEmail(supabase, customerEmail);
  if (!parentId) return;

  const updates = {
    subscription_status: "cancelling",
    updated_at: new Date().toISOString(),
  };

  // If Paystack tells us exactly when the subscription ends, use that.
  const nextPaymentDate = data?.next_payment_date;
  if (nextPaymentDate) {
    const d = new Date(nextPaymentDate);
    if (!Number.isNaN(d.getTime())) {
      updates.subscription_end = d.toISOString();
    }
  }

  const { error } = await supabase
    .from("parents")
    .update(updates)
    .eq("id", parentId);

  if (error) {
    logger.error("paystack_webhook_not_renew_update_error", { parentId, error });
    throw error;
  }

  logger.info("paystack_webhook_not_renew", { parentId, nextPaymentDate });
}

/**
 * `invoice.payment_failed` — a recurring charge failed. Paystack will retry
 * a few times before giving up and firing `subscription.disable`. Flip the
 * parent to `past_due` so the UI can prompt them to update their card; keep
 * features enabled for the grace window.
 */
async function handleInvoicePaymentFailed(supabase, data) {
  const customerEmail = extractCustomerEmail(data);
  if (!customerEmail) {
    logger.warn("paystack_webhook_invoice_failed_no_email", { eventId: data?.id });
    return;
  }

  const parentId = await resolveParentIdByEmail(supabase, customerEmail);
  if (!parentId) return;

  const { error } = await supabase
    .from("parents")
    .update({
      subscription_status: "past_due",
      updated_at: new Date().toISOString(),
    })
    .eq("id", parentId);

  if (error) {
    logger.error("paystack_webhook_invoice_failed_update_error", { parentId, error });
    throw error;
  }

  logger.info("paystack_webhook_invoice_payment_failed", {
    parentId,
    transactionRef: data?.transaction?.reference || null,
  });
}
