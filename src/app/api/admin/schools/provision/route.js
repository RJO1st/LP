// ─── POST /api/admin/schools/provision ────────────────────────────────────────
// Internal admin route: create a school + invite the proprietor.
//
// Body: { schoolName, schoolType, state, country, proprietorEmail }
//
// Flow:
//   1. Verify caller is a LaunchPard admin (email in ADMIN_EMAILS)
//   2. Create schools row
//   3. Generate Supabase invite/magic-link for the proprietor email
//      → new account  : generateLink type=invite  (sets password on first login)
//      → existing user: generateLink type=magiclink (one-click login)
//   4. Create school_roles (proprietor) using the returned user.id
//   5. Send branded invite email via Brevo with the action_link
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse }       from "next/server";
import { createClient }       from "@supabase/supabase-js";
import { cookies }            from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { sendEmail }          from "@/lib/email";

const ADMIN_EMAILS = ["ogunwede.r@gmail.com", "admin@launchpard.com"];

export async function POST(request) {
  try {
    const { schoolName, schoolType, state, country, proprietorEmail } = await request.json();

    if (!schoolName?.trim() || !proprietorEmail?.trim()) {
      return NextResponse.json({ error: "schoolName and proprietorEmail are required." }, { status: 400 });
    }

    // ── 1. Verify admin ────────────────────────────────────────────────────────
    const cookieStore = await cookies();
    const userSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { cookies: { getAll: () => cookieStore.getAll() } },
    );
    const { data: { user } } = await userSupabase.auth.getUser();
    if (!user || !ADMIN_EMAILS.includes(user.email)) {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );

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

    // ── 5. Send branded invite email via Brevo ─────────────────────────────────
    const isNewUser = !inviteErr; // true = invite, false = magic link (existing account)
    const emailSubject = isNewUser
      ? `You've been invited to set up ${school.name} on LaunchPard`
      : `Your LaunchPard school setup link — ${school.name}`;

    await sendEmail({
      to: proprietorEmail.trim(),
      subject: emailSubject,
      htmlContent: `
        <div style="font-family:'DM Sans','Nunito',system-ui,sans-serif;max-width:560px;margin:0 auto;background:#f8fafc;padding:32px 24px;border-radius:16px;">
          <div style="margin-bottom:24px;">
            <span style="display:inline-block;background:#4f46e5;color:#fff;font-weight:900;font-size:13px;padding:4px 10px;border-radius:6px;letter-spacing:0.05em;">LAUNCHPARD SCHOOLS</span>
          </div>
          <h1 style="font-size:24px;font-weight:900;color:#1e293b;margin:0 0 12px;">Your school dashboard is ready.</h1>
          <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 8px;">
            A LaunchPard school account has been created for <strong>${school.name}</strong>.
          </p>
          <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 24px;">
            ${isNewUser
              ? "Click the button below to set your password and complete the 10-minute school setup."
              : "Click the button below to log in and complete your school setup."}
          </p>
          <a href="${actionLink}"
             style="display:inline-block;background:#4f46e5;color:#fff;font-weight:900;font-size:15px;padding:14px 28px;border-radius:12px;text-decoration:none;margin-bottom:24px;">
            ${isNewUser ? "Accept Invitation & Set Up School →" : "Log In & Set Up School →"}
          </a>
          <p style="color:#94a3b8;font-size:12px;margin:0 0 4px;">This link expires in 24 hours. If you didn't expect this email, please ignore it.</p>
          <p style="color:#94a3b8;font-size:12px;margin:0;">Questions? Reply to this email or contact <a href="mailto:hello@launchpard.com" style="color:#4f46e5;">hello@launchpard.com</a></p>
        </div>
      `,
    });

    return NextResponse.json({
      ok:         true,
      schoolId:   school.id,
      schoolName: school.name,
      isNewUser,
      // Return the raw link too so the admin can copy/paste if email fails
      inviteLink: actionLink || null,
    });

  } catch (err) {
    console.error("[provision] error:", err);
    return NextResponse.json({ error: err.message || "Internal error." }, { status: 500 });
  }
}
