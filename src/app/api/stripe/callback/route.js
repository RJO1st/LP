// ─── GET /api/stripe/callback ────────────────────────────────────────────────
// Stripe redirects here after a Checkout Session completes or is abandoned.
//
// success_url: /api/stripe/callback?session_id={CHECKOUT_SESSION_ID}&result=success
// cancel_url:  /subscribe?payment=failed&provider=stripe  (direct, not via this route)
//
// This route is a belt-and-suspenders verification: the webhook
// (`checkout.session.completed`) is the canonical handler for DB updates.
// We verify the session status with Stripe, then route the user to the right
// page. If Stripe is unreachable we still honour `result=success` from the
// query param (Stripe only sets it on a genuine redirect, so it's trustworthy
// enough for the UX redirect — the webhook will update the DB regardless).
//
// `provider=stripe` is passed in the redirect URL so the parent dashboard can
// branch success copy per gateway (matches Paystack's `provider=paystack` param).
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export const runtime = "nodejs";

export async function GET(request) {
  const appUrl = env.APP_URL || new URL(request.url).origin;
  const { searchParams } = new URL(request.url);

  const sessionId = searchParams.get("session_id");
  const result    = searchParams.get("result"); // "success" when coming from success_url

  if (!sessionId) {
    return NextResponse.redirect(
      new URL("/subscribe?error=missing_session&provider=stripe", appUrl)
    );
  }

  // Verify session status with Stripe (belt-and-suspenders)
  let verified = false;
  try {
    const res = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
      {
        headers: {
          Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
        },
        cache: "no-store",
      }
    );
    const json = await res.json();
    // Stripe reports payment_status: 'paid' for one-time, status: 'complete' for sessions
    verified = json.payment_status === "paid" || json.status === "complete";
  } catch (e) {
    console.error("[stripe/callback] Stripe verification fetch failed:", e);
    // Network failure: trust the result param — Stripe only sets result=success
    // on a genuine success redirect (it uses the exact URL we configured).
    if (result === "success") verified = true;
  }

  if (verified) {
    // Webhook will have already updated the DB (or will shortly).
    return NextResponse.redirect(
      new URL("/dashboard/parent?payment=success&provider=stripe", appUrl)
    );
  }

  // Session not completed (abandoned, failed, or tampered session ID)
  return NextResponse.redirect(
    new URL("/subscribe?payment=failed&provider=stripe", appUrl)
  );
}
