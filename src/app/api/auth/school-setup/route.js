// ─── GET /api/auth/school-setup ──────────────────────────────────────────────
// One-time redirect endpoint for school provisioning emails.
//
// Proprietors receive a LaunchPard-branded URL (not a raw Supabase auth URL).
// On click this endpoint:
//   1. Validates the setup token against the schools table
//   2. Checks the token hasn't expired (7-day TTL)
//   3. Clears the token immediately (one-time use)
//   4. Generates a fresh Supabase auth link for the proprietor's email
//   5. 302 redirects to the Supabase action_link (which then redirects to /onboarding/school)
//
// Query params: ?t=SETUP_TOKEN&s=SCHOOL_ID
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const token    = searchParams.get("t");
  const schoolId = searchParams.get("s");

  const appUrl = process.env.APP_URL || "https://launchpard.com";
  const loginUrl = `${appUrl}/school-login`;

  if (!token || !schoolId) {
    return NextResponse.redirect(`${loginUrl}?error=invalid_link`);
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  // ── 1. Look up and validate the token ─────────────────────────────────────
  const { data: school, error } = await admin
    .from("schools")
    .select("id, name, setup_token, setup_token_email, setup_token_expires_at")
    .eq("id", schoolId)
    .eq("setup_token", token)
    .single();

  if (error || !school) {
    console.warn("[school-setup] invalid token for school", schoolId);
    return NextResponse.redirect(`${loginUrl}?error=invalid_link`);
  }

  // ── 2. Check expiry ────────────────────────────────────────────────────────
  if (school.setup_token_expires_at && new Date(school.setup_token_expires_at) < new Date()) {
    return NextResponse.redirect(`${loginUrl}?error=link_expired`);
  }

  const email = school.setup_token_email;
  if (!email) {
    console.error("[school-setup] no email on token for school", schoolId);
    return NextResponse.redirect(`${loginUrl}?error=invalid_link`);
  }

  // ── 3. Clear the token immediately (single use) ────────────────────────────
  await admin
    .from("schools")
    .update({
      setup_token:            null,
      setup_token_email:      null,
      setup_token_expires_at: null,
    })
    .eq("id", schoolId);

  const redirectTo = `${appUrl}/onboarding/school?schoolId=${schoolId}`;

  // ── 4. Generate a fresh Supabase auth link ─────────────────────────────────
  // Try invite first (user may already exist from the provisioning step,
  // in which case Supabase will return an error and we fall through to magiclink).
  let actionLink;

  const { data: inviteData, error: inviteErr } = await admin.auth.admin.generateLink({
    type:    "invite",
    email,
    options: { redirectTo },
  });

  if (!inviteErr && inviteData?.properties?.action_link) {
    actionLink = inviteData.properties.action_link;
  } else {
    // Existing user — send magic link
    const { data: magicData, error: magicErr } = await admin.auth.admin.generateLink({
      type:    "magiclink",
      email,
      options: { redirectTo },
    });

    if (magicErr || !magicData?.properties?.action_link) {
      console.error("[school-setup] link generation failed:", magicErr);
      return NextResponse.redirect(`${loginUrl}?error=auth_failed`);
    }

    actionLink = magicData.properties.action_link;
  }

  // ── 5. Redirect to Supabase action link ────────────────────────────────────
  return NextResponse.redirect(actionLink);
}
