import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// ─── Supabase service client (bypasses RLS for plan updates) ────────────────
const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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
 * Errors:  401 (not authenticated), 403 (region mismatch), 400 (bad input), 502 (Paystack error)
 */
export async function POST(request) {
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

  // ── 2. Authenticate the requesting user ───────────────────────────────────
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

  // ── 3. Anti-arbitrage: verify parent is Nigerian ──────────────────────────
  // Billing region is set at signup from curriculum — NOT from geo-IP.
  // This prevents GB users from purchasing NG plans at NG prices.
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
  let totalKobo = PLAN_AMOUNTS[plan][billing];

  // Add-ons are always monthly; on annual billing they are still charged monthly
  // via a separate recurring charge, so we only add them here for monthly billing.
  // For annual we include the first month's add-ons as a line in the metadata so
  // the webhook can set ng_addons correctly — but the base charge is plan only.
  const addonMonthlyKobo = addons.reduce((sum, a) => sum + ADDON_AMOUNTS[a], 0);

  if (billing === "monthly") {
    totalKobo += addonMonthlyKobo;
  }
  // Annual plan: add-ons billed separately each month — not bundled into the
  // one-time annual charge. We still pass addons in metadata for the webhook.

  // ── 5. Build Paystack transaction metadata ────────────────────────────────
  const metadata = {
    plan,
    billing,
    addons: addons.join(","),
    parent_id: parent.id,
    cancel_action: `${process.env.APP_URL}/subscribe`,
  };

  const callbackUrl = `${process.env.APP_URL}/api/paystack/callback`;

  // ── 6. Initialise Paystack transaction ────────────────────────────────────
  let paystackResponse;
  try {
    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
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
    console.error("[paystack/checkout] Network error:", networkError);
    return NextResponse.json(
      { error: "Could not reach Paystack. Please try again." },
      { status: 502 }
    );
  }

  if (!paystackResponse.status) {
    console.error("[paystack/checkout] Paystack error:", paystackResponse.message);
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
