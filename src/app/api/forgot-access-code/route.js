/**
 * /api/forgot-access-code
 * Deploy to: src/app/api/forgot-access-code/route.js
 *
 * Looks up all scholars belonging to a parent (by email),
 * then sends the parent an email with each scholar's access code.
 * Used by the scholar "Forgot access code?" flow on the login page.
 */

import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const { parentEmail } = await request.json();

    if (!parentEmail) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const trimmed = parentEmail.trim().toLowerCase();

    // 1. Find the parent user by email in Supabase auth
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    // Find matching user — fallback to checking profiles table if listUsers is too broad
    let parentId = null;
    let parentName = "Parent";

    if (!listError && users) {
      const match = users.find(u => u.email?.toLowerCase() === trimmed);
      if (match) {
        parentId = match.id;
        parentName = match.user_metadata?.name || match.user_metadata?.full_name || "Parent";
      }
    }

    // If we didn't find via auth, try the profiles table
    if (!parentId) {
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("id, name, full_name, email")
        .ilike("email", trimmed)
        .limit(1);

      if (profiles?.length) {
        parentId = profiles[0].id;
        parentName = profiles[0].name || profiles[0].full_name || "Parent";
      }
    }

    // 2. Look up scholars associated with this parent
    // Try by parent_id first, then by parent_email
    let scholars = [];

    if (parentId) {
      const { data } = await supabaseAdmin
        .from("scholars")
        .select("name, access_code, year_level")
        .eq("parent_id", parentId);
      if (data?.length) scholars = data;
    }

    if (!scholars.length) {
      const { data } = await supabaseAdmin
        .from("scholars")
        .select("name, access_code, year_level")
        .ilike("parent_email", trimmed);
      if (data?.length) scholars = data;
    }

    // Always return success to avoid leaking whether the email exists
    if (!scholars.length) {
      return NextResponse.json({
        message: "If that email is associated with an account, we've sent the access codes."
      });
    }

    // 3. Build & send the email
    const scholarRows = scholars.map(s =>
      `<tr>
        <td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;font-weight:700;color:#1e293b;">${s.name}</td>
        <td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;">Year ${s.year_level || "?"}</td>
        <td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;">
          <span style="background:#f1f5f9;border:2px solid #e2e8f0;border-radius:8px;padding:6px 14px;font-family:monospace;font-size:16px;font-weight:900;letter-spacing:3px;color:#4f46e5;">
            ${s.access_code}
          </span>
        </td>
      </tr>`
    ).join("");

    const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;font-family:'Helvetica Neue',Arial,sans-serif;background:#f1f5f9;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);padding:40px 32px 32px;text-align:center;">
      <h1 style="margin:0 0 4px;color:#ffffff;font-size:26px;font-weight:900;">Access Code Reminder</h1>
      <p style="margin:0;color:#c7d2fe;font-size:14px;font-weight:600;">Your scholar needs help logging in</p>
    </div>
    <div style="padding:32px;">
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">
        Hi ${parentName},
      </p>
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 20px;">
        Your scholar requested their access code. Here ${scholars.length > 1 ? "are the codes" : "is the code"} for your account:
      </p>
      <table style="width:100%;border-collapse:collapse;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
        <thead>
          <tr style="background:#f8fafc;">
            <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;">Scholar</th>
            <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;">Year</th>
            <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;">Access Code</th>
          </tr>
        </thead>
        <tbody>
          ${scholarRows}
        </tbody>
      </table>
      <div style="background:#eff6ff;border-left:4px solid #4f46e5;border-radius:0 10px 10px 0;padding:14px 16px;margin:24px 0;">
        <p style="margin:0;font-size:13px;color:#1e40af;font-weight:600;">
          Your scholar just needs to type the 4 digits after QUEST- on the login page. Keep these codes safe!
        </p>
      </div>
      <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://launchpard.com"}/login?type=scholar"
         style="display:block;background:#4f46e5;color:#ffffff;text-decoration:none;font-weight:900;font-size:15px;text-align:center;padding:16px 24px;border-radius:14px;margin:24px 0;">
        Go to Scholar Login
      </a>
    </div>
    <div style="padding:20px 32px;background:#f8fafc;text-align:center;">
      <p style="margin:0;font-size:12px;color:#94a3b8;">
        If you didn't request this, you can safely ignore this email.
      </p>
    </div>
  </div>
</body>
</html>`;

    await sendEmail({
      to: trimmed,
      subject: `Your Scholar's Access Code${scholars.length > 1 ? "s" : ""} — LaunchPard`,
      htmlContent,
    });

    return NextResponse.json({
      message: "If that email is associated with an account, we've sent the access codes."
    });
  } catch (err) {
    console.error("forgot-access-code error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
