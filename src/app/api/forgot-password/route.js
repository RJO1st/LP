/**
 * /api/forgot-password
 *
 * Generates a Supabase password reset link via the admin API and delivers it
 * through Brevo (our custom SMTP path). We always return a generic success
 * message to prevent email enumeration — even on known failures.
 *
 * Security posture (April 22 2026 audit):
 *   1. IP rate limit (10/min) — blocks a single attacker from hammering the
 *      endpoint to scrape valid accounts via timing or log volume.
 *   2. Email rate limit (5/hour) — blocks targeted account harassment: even
 *      if the attacker rotates IPs, they can't trigger more than 5 reset
 *      mails to the same inbox per hour. Both guards run before the admin
 *      API call so they protect the Supabase quota too.
 *   3. `getServiceRoleClient()` — lazy, browser-guarded, resolves new
 *      `sb_secret_*` key with legacy JWT fallback.
 */

import { NextResponse } from "next/server";
import { sendPasswordResetEmail } from "@/lib/email";
import { getServiceRoleClient } from "@/lib/security/serviceRole";
import { limit } from "@/lib/security/rateLimit";
import { getClientIp } from "@/lib/security/clientIp";
import { env } from "@/lib/env";
import logger from "@/lib/logger";
import { forgotPasswordSchema } from "@/lib/validation";

const GENERIC_RESPONSE = {
  message: "If that email is associated with an account, we've sent a reset link.",
};

export async function POST(request) {
  try {
    // ── 0a. IP rate limit ──────────────────────────────────────────────────
    const ip = getClientIp(request);
    const ipRl = await limit({
      key: `forgot-password:ip:${ip}`,
      windowSec: 60,
      max: 10,
    });
    if (!ipRl.success) {
      logger.warn("forgot_password_rate_limited_ip", { ip, backend: ipRl.backend });
      // Still 429 rather than fake-200: a 200 here would waste the attacker's
      // time but also hide the limit from legitimate users debugging a client.
      return NextResponse.json(
        { error: "Too many requests. Try again in a minute." },
        { status: 429 }
      );
    }

    // Validate with Zod but SWALLOW shape errors into GENERIC_RESPONSE.
    // Returning a structured 422 would leak format validity and let an
    // attacker distinguish "no such account" from "bad email format".
    const rawBody = await request.json().catch(() => null);
    const parsed = forgotPasswordSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(GENERIC_RESPONSE);
    }
    const trimmed = parsed.data.email; // already trimmed + lowercased by Zod

    // ── 0b. Email rate limit ───────────────────────────────────────────────
    // Blocks per-account enumeration across rotating IPs. 5/hour is one
    // accidental click plus four real retries; beyond that is harassment.
    const emailRl = await limit({
      key: `forgot-password:email:${trimmed}`,
      windowSec: 3600,
      max: 5,
    });
    if (!emailRl.success) {
      logger.warn("forgot_password_rate_limited_email", {
        emailHash: trimmed.length, // don't log the email itself
        backend: emailRl.backend,
      });
      // Return the generic success message — an attacker probing a specific
      // account should see the same output as a user who asked for 6 resets.
      return NextResponse.json(GENERIC_RESPONSE);
    }

    const supabaseAdmin = getServiceRoleClient();

    // Generate a password reset link using Supabase admin API
    const appUrl = env.NEXT_PUBLIC_APP_URL || env.APP_URL || "https://launchpard.com";
    const redirectTo = `${appUrl}/reset-password`;

    const { data, error: genError } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: trimmed,
      options: { redirectTo },
    });

    // Always return success to avoid leaking whether the email exists
    if (genError) {
      logger.error("forgot_password_link_generation_failed", {
        error: genError.message,
      });
      return NextResponse.json(GENERIC_RESPONSE);
    }

    // The generated link contains the token — extract it or use it directly
    // data.properties.action_link contains the full Supabase confirmation link
    const resetUrl =
      data?.properties?.action_link || `${redirectTo}?error=link_generation_failed`;

    // Look up the parent's name for a nicer email
    let parentName = "there";
    try {
      const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
      const match = users?.find((u) => u.email?.toLowerCase() === trimmed);
      if (match) {
        parentName =
          match.user_metadata?.name || match.user_metadata?.full_name || "there";
      }
    } catch (_) {
      /* non-critical — fall back to "there" */
    }

    // Send via Brevo using the existing template helper
    await sendPasswordResetEmail({
      parentEmail: trimmed,
      parentName,
      resetUrl,
    });

    return NextResponse.json(GENERIC_RESPONSE);
  } catch (err) {
    logger.error("forgot_password_error", { error: err });
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
