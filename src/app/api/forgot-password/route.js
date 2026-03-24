/**
 * /api/forgot-password
 * Deploy to: src/app/api/forgot-password/route.js
 *
 * Generates a Supabase password reset link using the admin API,
 * then sends it via Brevo (bypassing Supabase's built-in email which
 * may not be configured with a custom SMTP provider).
 */

import { createClient } from "@supabase/supabase-js";
import { sendPasswordResetEmail } from "@/lib/email";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const trimmed = email.trim().toLowerCase();

    // Generate a password reset link using Supabase admin API
    const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL || "https://launchpard.com"}/reset-password`;

    const { data, error: genError } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: trimmed,
      options: { redirectTo },
    });

    // Always return success to avoid leaking whether the email exists
    if (genError) {
      console.error("Password reset link generation error:", genError.message);
      // Still return success to avoid email enumeration
      return NextResponse.json({
        message: "If that email is associated with an account, we've sent a reset link."
      });
    }

    // The generated link contains the token — extract it or use it directly
    // data.properties.action_link contains the full Supabase confirmation link
    const resetUrl = data?.properties?.action_link || `${redirectTo}?error=link_generation_failed`;

    // Look up the parent's name for a nicer email
    let parentName = "there";
    try {
      const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
      const match = users?.find(u => u.email?.toLowerCase() === trimmed);
      if (match) {
        parentName = match.user_metadata?.name || match.user_metadata?.full_name || "there";
      }
    } catch (_) { /* non-critical */ }

    // Send via Brevo using the existing template helper
    await sendPasswordResetEmail({
      parentEmail: trimmed,
      parentName,
      resetUrl,
    });

    return NextResponse.json({
      message: "If that email is associated with an account, we've sent a reset link."
    });
  } catch (err) {
    console.error("forgot-password error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
