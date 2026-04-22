import { NextResponse } from "next/server";
import { getServiceRoleClient } from "@/lib/security/serviceRole";

const supabase = getServiceRoleClient();

/**
 * GET /api/paystack/callback?reference=xxx&trxref=xxx
 *
 * Paystack redirects here after a payment attempt (success or abandoned).
 * We verify the transaction status server-side and redirect accordingly.
 * This is a fallback — the webhook is the canonical handler for DB updates.
 * Here we just redirect the user to the right page.
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const reference = searchParams.get("reference") || searchParams.get("trxref");

  if (!reference) {
    return NextResponse.redirect(
      new URL("/subscribe?error=missing_reference", process.env.APP_URL)
    );
  }

  // Verify with Paystack (belt-and-suspenders — webhook does the DB work)
  let verified = false;
  try {
    const res = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
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
    return NextResponse.redirect(
      new URL("/dashboard/parent?payment=success", process.env.APP_URL)
    );
  }

  // Payment was abandoned or failed — back to subscribe page with error
  return NextResponse.redirect(
    new URL("/subscribe?payment=failed", process.env.APP_URL)
  );
}
