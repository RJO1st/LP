import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import Stripe from "stripe";

// ─── Supabase service client ─────────────────────────────────────────────────
const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ─── UK pricing in pence (1 GBP = 100p) ─────────────────────────────────────
const PLAN_AMOUNTS_PENCE = {
  gb_pro: {
    monthly: 1299,  // £12.99
    annual:  12000, // £120.00
  },
};

// Stripe price IDs — set these in Vercel env vars once Stripe account is live.
// Format: price_xxx from the Stripe dashboard.
const STRIPE_PRICE_IDS = {
  gb_pro: {
    monthly: process.env.STRIPE_PRICE_GB_PRO_MONTHLY, // e.g. "price_1234"
    annual:  process.env.STRIPE_PRICE_GB_PRO_ANNUAL,
  },
};

/**
 * POST /api/stripe/checkout
 * Body: { plan: "gb_pro", billing: "monthly"|"annual" }
 *
 * Returns: { checkout_url }  (Stripe hosted checkout page)
 * Errors:  401, 403 (NG parents), 400, 503 (Stripe not configured)
 */
export async function POST(request) {
  // ── 1. Parse body ─────────────────────────────────────────────────────────
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { plan = "gb_pro", billing = "monthly" } = body;

  if (!PLAN_AMOUNTS_PENCE[plan]) {
    return NextResponse.json({ error: `Unknown plan: ${plan}` }, { status: 400 });
  }
  if (!["monthly", "annual"].includes(billing)) {
    return NextResponse.json({ error: "billing must be 'monthly' or 'annual'" }, { status: 400 });
  }

  // ── 2. Authenticate ───────────────────────────────────────────────────────
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try {
            toSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  // ── 3. Anti-arbitrage: GB accounts only ───────────────────────────────────
  const { data: parent, error: parentError } = await serviceClient
    .from("parents")
    .select("id, email, region, subscription_tier, stripe_customer_id")
    .eq("id", user.id)
    .single();

  if (parentError || !parent) {
    return NextResponse.json({ error: "Parent record not found" }, { status: 404 });
  }
  if (parent.region === "NG") {
    return NextResponse.json(
      { error: "Stripe checkout is for UK accounts only. Nigerian accounts use Paystack." },
      { status: 403 }
    );
  }

  // ── 4. Guard: Stripe must be configured ───────────────────────────────────
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "UK subscriptions are not yet active. We will notify you when they launch." },
      { status: 503 }
    );
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2024-06-20",
  });

  const priceId = STRIPE_PRICE_IDS[plan][billing];

  // ── 5. Get or create Stripe customer ─────────────────────────────────────
  let customerId = parent.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: parent.email || user.email,
      metadata: { parent_id: parent.id },
    });
    customerId = customer.id;
    // Persist the customer ID for future checkouts
    await serviceClient
      .from("parents")
      .update({ stripe_customer_id: customerId })
      .eq("id", parent.id);
  }

  // ── 6. Create Stripe checkout session ─────────────────────────────────────
  let session;
  try {
    if (priceId) {
      // Use a pre-configured recurring price (preferred for subscriptions)
      session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${process.env.APP_URL}/dashboard/parent?payment=success`,
        cancel_url:  `${process.env.APP_URL}/subscribe?payment=cancelled`,
        metadata: { parent_id: parent.id, plan, billing },
        subscription_data: {
          metadata: { parent_id: parent.id, plan, billing },
        },
        allow_promotion_codes: true,
        billing_address_collection: "auto",
      });
    } else {
      // Fallback: ad-hoc price (useful before Stripe products are created)
      session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "payment",
        line_items: [{
          price_data: {
            currency: "gbp",
            unit_amount: PLAN_AMOUNTS_PENCE[plan][billing],
            product_data: {
              name: `LaunchPard Pro (${billing})`,
              description: billing === "annual"
                ? "Annual plan — one year of full access"
                : "Monthly plan — full access, cancel anytime",
            },
          },
          quantity: 1,
        }],
        success_url: `${process.env.APP_URL}/dashboard/parent?payment=success`,
        cancel_url:  `${process.env.APP_URL}/subscribe?payment=cancelled`,
        metadata: { parent_id: parent.id, plan, billing },
        allow_promotion_codes: true,
      });
    }
  } catch (stripeError) {
    console.error("[stripe/checkout] Error creating session:", stripeError);
    return NextResponse.json(
      { error: "Could not create checkout session. Please try again." },
      { status: 502 }
    );
  }

  return NextResponse.json({ checkout_url: session.url });
}
