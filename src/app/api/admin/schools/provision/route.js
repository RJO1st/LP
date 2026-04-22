// ─── POST /api/admin/schools/provision ────────────────────────────────────────
// Internal admin route: create a school + invite the proprietor.
//
// Body: { schoolName, schoolType, state, country, proprietorEmail }
//
// Flow:
//   1. Verify caller is a LaunchPard admin via requireAdmin()
//   2. Create schools row
//   3. Generate Supabase invite/magic-link for the proprietor email
//      → new account  : generateLink type=invite  (sets password on first login)
//      → existing user: generateLink type=magiclink (one-click login)
//   4. Create school_roles (proprietor) using the returned user.id
//   5. Send branded invite email via Brevo with the action_link
//
// NOTE (April 22 2026 security audit): previous version carried a hard-coded
// ADMIN_EMAILS array that leaked a personal gmail address. Admin identity now
// lives in ADMIN_EMAILS env var with `rotimi@launchpard.com` as the canonical
// default (see src/lib/security/admin.js). The service-role Supabase client
// is lazily constructed via getServiceRoleClient() to avoid instantiating it
// at module scope on routes that might short-circuit before needing it.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse }        from "next/server";
import { sendEmail }           from "@/lib/email";
import { EMAIL_TEMPLATES }     from "@/lib/emailTemplates";
import { requireAdmin }        from "@/lib/security/admin";
import { getServiceRoleClient } from "@/lib/security/serviceRole";
import crypto                  from "crypto";

export async function POST(request) {
  try {
    const { schoolName, schoolType, state, country, proprietorEmail } = await request.json();

    if (!schoolName?.trim() || !proprietorEmail?.trim()) {
      return NextResponse.json({ error: "schoolName and proprietorEmail are required." }, { status: 400 });
    }

    // ── 1. Verify admin ────────────────────────────────────────────────────────
    const { error: adminError } = await requireAdmin(request);
    if (adminError) return adminError;

    const admin = getServiceRoleClient();

    const appUrl = process.env.APP_URL || "https://launchpard.com";

    // ── 2. Create school ───────────────────────────────────────────────────────
    const { data: school, error: schoolErr } = await admin
      .from("schools")
      .insert({
        name:        schoolName.trim(),
        school_type: schoolType || null,
        region:      state || null,
        country:     country || "Nigeria",
      })
      .select("id, name")
      .single();

    if (schoolErr || !school) {
      console.error("[provision] school insert:", schoolErr);
      return NextResponse.json({ error: "Could not create school." }, { status: 500 });
    }

    const redirectTo = `${appUrl}/onboarding/school?schoolId=${school.id}`;

    // ── 3. Generate invite / magic link ────────────────────────────────────────
    let actionLink, proprietorUserId;

    // Try invite first (works for new users)
    const { data: inviteData, error: inviteErr } = await admin.auth.admin.generateLink({
      type:    "invite",
      email:   proprietorEmail.trim(),
      options: { redirectTo },
    });

    if (!inviteErr && inviteData?.user) {
      actionLink       = inviteData.properties?.action_link;
      proprietorUserId = inviteData.user.id;
    } else {
      // User already exists — send a magic link instead
      const { data: magicData, error: magicErr } = await admin.auth.admin.generateLink({
        type:    "magiclink",
        email:   proprietorEmail.trim(),
        options: { redirectTo },
      });

      if (magicErr || !magicData?.user) {
        // Roll back school creation
        await admin.from("schools").delete().eq("id", school.id);
        console.error("[provision] link generation failed:", magicErr);
        return NextResponse.json({ error: "Could not generate invite link." }, { status: 500 });
      }

      actionLink       = magicData.properties?.action_link;
      proprietorUserId = magicData.user.id;
    }

    // ── 4. Create school_roles (proprietor) ───────────────────────────────────
    // Upsert: if this user is already linked to a different school, we still
    // want them linked to this one (they can have multiple roles).
    const { error: roleErr } = await admin
      .from("school_roles")
      .upsert({
        user_id:   proprietorUserId,
        school_id: school.id,
        role:      "proprietor",
      }, { onConflict: "user_id,school_id" });

    if (roleErr) {
      console.error("[provision] role insert:", roleErr);
      // Non-fatal — school is created, just notify admin
    }

    // ── 5. Generate one-time LaunchPard setup token ────────────────────────────
    // We store a UUID token in the schools row so the proprietor receives a
    // launchpard.com URL rather than a raw Supabase auth URL (which looks like spam).
    // /api/auth/school-setup validates the token then generates a fresh Supabase
    // auth link and redirects the user transparently.
    const isNewUser  = !inviteErr; // true = invite (new user), false = magic link (existing)
    const setupToken = crypto.randomUUID();
    const setupTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

    const { error: tokenErr } = await admin
      .from("schools")
      .update({
        setup_token:            setupToken,
        setup_token_email:      proprietorEmail.trim(),
        setup_token_expires_at: setupTokenExpiresAt,
      })
      .eq("id", school.id);

    if (tokenErr) {
      console.error("[provision] setup_token update:", tokenErr);
      // Non-fatal — admin can still copy the raw link returned in the response
    }

    const setupUrl = `${appUrl}/api/auth/school-setup?t=${setupToken}&s=${school.id}`;

    // ── 6. Send branded invite email via Brevo ─────────────────────────────────
    const { subject: emailSubject, htmlContent } = EMAIL_TEMPLATES.schoolProvisioned(
      school.name,
      setupUrl,
      isNewUser,
    );

    await sendEmail({
      to: proprietorEmail.trim(),
      subject: emailSubject,
      htmlContent,
    });

    return NextResponse.json({
      ok:         true,
      schoolId:   school.id,
      schoolName: school.name,
      isNewUser,
      // Return the setup URL so the admin can copy/paste if email fails
      inviteLink: setupUrl,
    });

  } catch (err) {
    console.error("[provision] error:", err);
    return NextResponse.json({ error: err.message || "Internal error." }, { status: 500 });
  }
}
