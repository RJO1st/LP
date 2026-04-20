import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

// ─── Supabase service client ─────────────────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Compute subscription_end from billing cycle.
 * Monthly: +30 days.  Annual: +365 days.
 */
function computeSubscriptionEnd(billing) {
  const d = new Date();
  if (billing === "annual") {
    d.setFullYear(d.getFullYear() + 1);
  } else {
    d.setDate(d.getDate() + 30);
  }
  return d.toISOString();
}

/**
 * POST /api/paystack/webhook
 *
 * Paystack sends a POST with an X-Paystack-Signature header.
 * We verify HMAC-SHA512 before processing any event.
 *
 * Handled events:
 *   charge.success  — activate subscription, set tier + end date + addons
 *   subscription.disable — (future) downgrade tier on cancellation
 */
export async function POST(request) {
  // ── 1. Read raw body (needed for HMAC verification) ──────────────────────
  // Next.js 13+ App Router: request.text() gives us the raw body string.
  const rawBody = await request.text();

  // ── 2. Verify Paystack signature ─────────────────────────────────────────
  const signature = request.headers.get("x-paystack-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 401 });
  }

  const expectedSig = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
    .update(rawBody)
    .digest("hex");

  if (expectedSig !== signature) {
    console.warn("[paystack/webhook] Signature mismatch");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // ── 3. Parse the verified event ───────────────────────────────────────────
  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { event: eventType, data } = event;
  console.log(`[paystack/webhook] event=${eventType} ref=${data?.reference}`);

  // ── 4. Handle charge.success ──────────────────────────────────────────────
  if (eventType === "charge.success") {
    await handleChargeSuccess(data);
  }

  // ── 5. Handle subscription.disable (cancellation) ─────────────────────────
  // Paystack fires this when a recurring subscription is cancelled or
  // fails to renew.  We downgrade the parent back to "free".
  if (eventType === "subscription.disable") {
    await handleSubscriptionDisable(data);
  }

  // Paystack expects a 200 regardless of whether we acted on the event.
  return NextResponse.json({ received: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

async function handleChargeSuccess(data) {
  const reference = data.reference;

  // ── a. Look up the transaction record we stored at checkout ──────────────
  const { data: txn, error: txnError } = await supabase
    .from("paystack_transactions")
    .select("*")
    .eq("reference", reference)
    .maybeSingle();

  let plan, billing, addons, parentId;

  if (txn && !txnError) {
    // Use the stored record (most reliable)
    ({ plan, billing, addons, parent_id: parentId } = txn);
    addons = Array.isArray(addons) ? addons : [];
  } else {
    // Fall back to Paystack metadata
    const meta = data.metadata || {};
    plan     = meta.plan     || "ng_scholar";
    billing  = meta.billing  || "monthly";
    addons   = meta.addons   ? meta.addons.split(",").filter(Boolean) : [];
    parentId = meta.parent_id;
  }

  // If we still don't have a parent_id, look it up by email
  if (!parentId) {
    const customerEmail = data.customer?.email;
    if (!customerEmail) {
      console.error("[paystack/webhook] No parent_id or email in charge.success", data);
      return;
    }
    // Look up via auth.users — note: this requires service role
    const { data: users } = await supabase.auth.admin.listUsers();
    const matchedUser = users?.users?.find((u) => u.email === customerEmail);
    if (!matchedUser) {
      console.error("[paystack/webhook] No user found for email:", customerEmail);
      return;
    }
    parentId = matchedUser.id;
  }

  const subscriptionEnd = computeSubscriptionEnd(billing);

  // ── b. Update the parent's subscription state ─────────────────────────────
  const { error: updateError } = await supabase
    .from("parents")
    .update({
      subscription_tier:   plan,           // e.g. "ng_scholar"
      subscription_status: "active",
      subscription_end:    subscriptionEnd,
      ng_addons:           addons,          // TEXT[] e.g. ["waec_boost"]
      billing_cycle:       billing,         // "monthly" | "annual"
      updated_at:          new Date().toISOString(),
    })
    .eq("id", parentId);

  if (updateError) {
    console.error("[paystack/webhook] Failed to update parent:", updateError);
    return;
  }

  // ── c. Mark the transaction as completed ──────────────────────────────────
  if (txn) {
    await supabase
      .from("paystack_transactions")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("reference", reference);
  }

  console.log(`[paystack/webhook] Activated ${plan}/${billing} for parent ${parentId}`);
}

async function handleSubscriptionDisable(data) {
  // data.customer.email identifies the subscriber
  const customerEmail = data.customer?.email;
  if (!customerEmail) return;

  // Find auth user by email
  const { data: users } = await supabase.auth.admin.listUsers();
  const matchedUser = users?.users?.find((u) => u.email === customerEmail);
  if (!matchedUser) return;

  await supabase
    .from("parents")
    .update({
      subscription_tier:   "free",
      subscription_status: "cancelled",
      subscription_end:    new Date().toISOString(),
      ng_addons:           [],
      updated_at:          new Date().toISOString(),
    })
    .eq("id", matchedUser.id);

  console.log(`[paystack/webhook] Downgraded to free for ${customerEmail}`);
}
