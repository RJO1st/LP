/**
 * POST /api/teacher/notify-parent
 *
 * Sends a parent claim link (if unclaimed) or a progress update email (if claimed).
 * Called from the Teacher Dashboard → Notify Parent button.
 *
 * Body: { scholarId, classId, teacherNote? }
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const APP_URL = process.env.APP_URL || "https://launchpard.com";
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = "LaunchPard <notifications@launchpard.com>";

async function sendEmail({ to, subject, html }) {
  if (!RESEND_API_KEY) {
    console.warn("[notify-parent] RESEND_API_KEY not set — email skipped in dev");
    return { ok: true, skipped: true };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });
  return res;
}

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { cookies: { getAll: () => cookieStore.getAll() } }
    );

    // Auth check — must be a signed-in teacher
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const body = await request.json();
    const { scholarId, classId, teacherNote = "" } = body;

    if (!scholarId) {
      return NextResponse.json({ error: "scholarId required" }, { status: 400 });
    }

    // Verify teacher has access to this class
    const { data: assignment } = await supabase
      .from("teacher_assignments")
      .select("id")
      .eq("teacher_id", session.user.id)
      .eq("class_id", classId)
      .single();

    // Also allow proprietors / admins in the school
    const { data: schoolRole } = await supabase
      .from("school_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .single();

    if (!assignment && !["proprietor", "admin"].includes(schoolRole?.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Load scholar profile
    const { data: scholar, error: scholarErr } = await supabase
      .from("scholars")
      .select("id, name, year_level, curriculum, school_id")
      .eq("id", scholarId)
      .single();

    if (scholarErr || !scholar) {
      return NextResponse.json({ error: "Scholar not found" }, { status: 404 });
    }

    // Check for existing invitation (unclaimed)
    const { data: invitation } = await supabase
      .from("scholar_invitations")
      .select("validation_code, parent_email, status, expires_at")
      .eq("scholar_id", scholarId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const hasValidInvite =
      invitation &&
      invitation.status === "pending" &&
      new Date(invitation.expires_at) > new Date();

    // Check for an already-linked parent
    const { data: parentLink } = await supabase
      .from("parents")
      .select("id, email:users(email)")
      .eq("id",
        // Find via scholars — there's no direct foreign key, find via claim
        // We check scholar_school_consent for an existing parent link
        scholarId
      )
      .limit(1)
      .maybeSingle();

    // Look up linked parent via scholar_school_consent table
    const { data: consent } = await supabase
      .from("scholar_school_consent")
      .select("parent_id, parents(id, subscription_tier)")
      .eq("scholar_id", scholarId)
      .eq("revoked_at", null) // not revoked
      .limit(1)
      .maybeSingle();

    const linkedParentId = consent?.parent_id;

    // -------------------------------------------------------------------
    // CASE A: Scholar has a linked parent — send progress nudge
    // -------------------------------------------------------------------
    if (linkedParentId) {
      const { data: parentUser } = await supabase
        .from("parents")
        .select("email:auth_users_email")
        .eq("id", linkedParentId)
        .single()
        .catch(() => ({ data: null }));

      // Try auth.users for the email
      const { data: authUser } = await supabase.auth.admin.getUserById(linkedParentId);
      const parentEmail = authUser?.user?.email;

      if (!parentEmail) {
        return NextResponse.json({ error: "Parent email not found" }, { status: 404 });
      }

      // Fetch latest readiness score
      const { data: readiness } = await supabase
        .from("scholar_readiness_snapshot")
        .select("overall_score, snapshot_date")
        .eq("scholar_id", scholarId)
        .order("snapshot_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      const score = readiness?.overall_score ? `${Math.round(readiness.overall_score)}%` : "being tracked";

      const teacherNoteHtml = teacherNote
        ? `<div style="background:#f0fdf4;border-left:4px solid #10b981;padding:12px 16px;border-radius:6px;margin-top:16px;">
            <strong style="color:#065f46;">Note from your child's teacher:</strong><br/>
            <span style="color:#1e3a2f;">${teacherNote.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</span>
           </div>`
        : "";

      await sendEmail({
        to: parentEmail,
        subject: `📊 Update on ${scholar.name}'s learning — from their teacher`,
        html: `<!DOCTYPE html>
<html><body style="font-family:system-ui,sans-serif;background:#f8fafc;margin:0;padding:0;">
<div style="max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
  <div style="background:linear-gradient(135deg,#080c15,#1e293b);padding:32px;text-align:center;">
    <p style="color:#6366f1;font-size:28px;font-weight:800;margin:0;">🚀 LaunchPard</p>
  </div>
  <div style="padding:32px;">
    <h2 style="color:#0f172a;margin-top:0;">Your child's teacher has sent an update</h2>
    <p style="color:#475569;">Hi there,</p>
    <p style="color:#475569;">${scholar.name}'s teacher wanted to let you know how they are progressing on LaunchPard.</p>
    <div style="background:#f8fafc;border-radius:8px;padding:20px;margin:20px 0;text-align:center;">
      <p style="color:#64748b;font-size:14px;margin:0 0 8px;">Current Readiness Score</p>
      <p style="color:#6366f1;font-size:42px;font-weight:800;margin:0;">${score}</p>
    </div>
    ${teacherNoteHtml}
    <p style="color:#475569;margin-top:24px;">Log in to see their full topic-by-topic breakdown and this week's recommended study plan.</p>
    <a href="${APP_URL}/dashboard/parent" style="display:inline-block;margin-top:16px;padding:14px 28px;background:#6366f1;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">
      View ${scholar.name}'s Dashboard →
    </a>
  </div>
  <div style="padding:20px 32px;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:12px;">
    LaunchPard · AI-Powered Learning for Every Scholar<br/>
    <a href="${APP_URL}/privacy-policy" style="color:#94a3b8;">Privacy Policy</a>
  </div>
</div>
</body></html>`,
      });

      return NextResponse.json({ success: true, type: "progress_update", email: parentEmail });
    }

    // -------------------------------------------------------------------
    // CASE B: No linked parent — resend or create claim invitation
    // -------------------------------------------------------------------
    const targetEmail = invitation?.parent_email;
    if (!targetEmail) {
      return NextResponse.json(
        { error: "No parent email on file for this scholar. Use the CSV import to add one." },
        { status: 422 }
      );
    }

    const claimCode = hasValidInvite
      ? invitation.validation_code
      : (() => {
          const code = Array.from({ length: 8 }, () =>
            "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]
          ).join("");
          // Refresh the invitation
          supabase.from("scholar_invitations").upsert({
            scholar_id: scholarId,
            parent_email: targetEmail,
            validation_code: code,
            status: "pending",
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          });
          return code;
        })();

    const claimUrl = `${APP_URL}/parent/claim?code=${claimCode}`;

    await sendEmail({
      to: targetEmail,
      subject: `🎓 Your child ${scholar.name} is on LaunchPard — claim their profile`,
      html: `<!DOCTYPE html>
<html><body style="font-family:system-ui,sans-serif;background:#f8fafc;margin:0;padding:0;">
<div style="max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
  <div style="background:linear-gradient(135deg,#080c15,#1e293b);padding:32px;text-align:center;">
    <p style="color:#6366f1;font-size:28px;font-weight:800;margin:0;">🚀 LaunchPard</p>
  </div>
  <div style="padding:32px;">
    <h2 style="color:#0f172a;margin-top:0;">Your child's school has added them to LaunchPard</h2>
    <p style="color:#475569;">Hi there,</p>
    <p style="color:#475569;">${scholar.name}'s school has set up a LaunchPard profile so they can access AI-powered learning and track their exam readiness.</p>
    <p style="color:#475569;">Their teacher would like you to claim their profile so you can:</p>
    <ul style="color:#475569;line-height:1.8;">
      <li>See their weekly progress and topic mastery</li>
      <li>Get their AI tutor's personalised study plan</li>
      <li>Track their readiness for upcoming exams</li>
    </ul>
    <div style="background:#f0fdf4;border-radius:8px;padding:20px;margin:20px 0;text-align:center;">
      <p style="color:#065f46;font-size:13px;margin:0 0 8px;">Your claim code (valid 7 days)</p>
      <p style="color:#059669;font-size:32px;font-weight:800;letter-spacing:4px;margin:0;">${claimCode}</p>
    </div>
    <a href="${claimUrl}" style="display:inline-block;margin-top:8px;padding:14px 28px;background:#6366f1;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;width:100%;text-align:center;box-sizing:border-box;">
      Claim ${scholar.name}'s Profile →
    </a>
    <p style="color:#94a3b8;font-size:13px;margin-top:24px;">This link was sent at the request of ${scholar.name}'s school. If you weren't expecting this email, you can safely ignore it.</p>
  </div>
  <div style="padding:20px 32px;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:12px;">
    LaunchPard · <a href="${APP_URL}/privacy-policy" style="color:#94a3b8;">Privacy Policy</a>
  </div>
</div>
</body></html>`,
    });

    return NextResponse.json({ success: true, type: "claim_invite", email: targetEmail });
  } catch (err) {
    console.error("[notify-parent]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
