import { NextResponse } from "next/server";
import { env } from "@/lib/env";

/**
 * GET /api/paystack/callback?reference=xxx&trxref=xxx
 *
 * Paystack redirects here after a payment attempt (success or abandoned).
 * We verify the transaction status server-side and redirect accordingly.
 * This is a fallback, the webhook is the canonical handler for DB updates.
 * Here we just redirect the user to the right page.
 */
export const runtime = "nodejs";

export async function GET(request) {
  const appUrl = env.APP_URL || new URL(request.url).origin;
  const { searchParams } = new URL(request.url);
  const reference = searchParams.get("reference") || searchParams.get("trxref");

  if (!reference) {
    return NextResponse.redirect(
      new URL("/subscribe?error=missing_reference", appUrl)
    );
  }

  // Verify with Paystack (belt-and-suspenders, webhook does the DB work)
  let verified = false;
  try {
    const res = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}` },
        cache: "no-store",
      }
    );
    const json = await res.json();
    verified = json.status && json.data?.status === "success";
  } catch (e) {
    console.error("[paystack/callback] Verification fetch failed:", e);
  }

  if (verified) {
    // Webhook will have already updated the DB (or will shortly).
    // Send the user to the parent dashboard with a success banner.
    // `provider=paystack` lets the dashboard branch copy per gateway once
    // Stripe (GB) is wired; a missing provider param falls back to the
    // neutral banner for backwards compat.
    return NextResponse.redirect(
      new URL("/dashboard/parent?payment=success&provider=paystack", appUrl)
    );
  }

  // Payment was abandoned or failed, back to subscribe page with error.
  // Tag provider so the subscribe page can surface gateway-specific guidance
  // (e.g. "try another card" vs "check your bank app") in future.
  return NextResponse.redirect(
    new URL("/subscribe?payment=failed&provider=paystack", appUrl)
  );
}
