import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

// ─── Supabase service client ─────────────────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Compute subscription_end from billing string.
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
 * POST /api/stripe/webhook
 *
 * Stripe signs all webhook deliveries with a STRIPE_WEBHOOK_SECRET.
 * We verify using stripe.webhooks.constructEvent() before processing.
 *
 * Handled events:
 *   checkout.session.completed   — one-time payment or subscription start
 *   customer.subscription.deleted — subscription cancelled/expired
 *   invoice.payment_failed        — renewal failed (optional: alert parent)
 */
export async function POST(request) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    // Stripe not yet configured — return 200 to avoid Stripe retrying
    console.warn("[stripe/webhook] Stripe env vars not set. Ignoring event.");
    return NextResponse.json({ received: true });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2024-06-20",
  });

  // ── 1. Read raw body and signature ────────────────────────────────────────
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });
  }

  // ── 2. Verify signature ───────────────────────────────────────────────────
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.warn("[stripe/webhook] Signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const { type, data } = event;
  console.log(`[stripe/webhook] event=${type} id=${event.id}`);

  // ── 3. Handle events ──────────────────────────────────────────────────────
  switch (type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(data.object);
      break;

    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(data.object);
      break;

    case "invoice.payment_failed":
      // Future: send an email reminder. For now, just log.
      console.warn("[stripe/webhook] Payment failed for customer:", data.object.customer);
      break;

    default:
      // Unhandled event type — ignore
      break;
  }

  return NextResponse.json({ received: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

async function handleCheckoutCompleted(session) {
  const parentId = session.metadata?.parent_id;
  const plan     = session.metadata?.plan    || "gb_pro";
  const billing  = session.metadata?.billing || "monthly";

  if (!parentId) {
    console.error("[stripe/webhook] No parent_id in session metadata:", session.id);
    return;
  }

  const { error } = await supabase
    .from("parents")
    .update({
      subscription_tier:   plan,
      subscription_status: "active",
      subscription_end:    computeSubscriptionEnd(billing),
      billing_cycle:       billing,
      // Stripe subscription ID — useful for future cancellation/upgrade calls
      stripe_subscription_id: session.subscription ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parentId);

  if (error) {
    console.error("[stripe/webhook] Failed to update parent:", error);
  } else {
    console.log(`[stripe/webhook] Activated ${plan}/${billing} for parent ${parentId}`);
  }
}

async function handleSubscriptionDeleted(subscription) {
  // subscription.metadata.parent_id should be set from checkout
  const parentId = subscription.metadata?.parent_id;
  if (!parentId) {
    // Try to find parent by Stripe customer ID
    const customerId = subscription.customer;
    const { data: parent } = await supabase
      .from("parents")
      .select("id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();
    if (!parent) {
      console.error("[stripe/webhook] Cannot find parent for customer:", customerId);
      return;
    }
    await downgradeParent(parent.id);
  } else {
    await downgradeParent(parentId);
  }
}

async function downgradeParent(parentId) {
  const { error } = await supabase
    .from("parents")
    .update({
      subscription_tier:   "free",
      subscription_status: "cancelled",
      subscription_end:    new Date().toISOString(),
      updated_at:          new Date().toISOString(),
    })
    .eq("id", parentId);

  if (error) {
    console.error("[stripe/webhook] Failed to downgrade parent:", error);
  } else {
    console.log("[stripe/webhook] Downgraded parent to free:", parentId);
  }
}
