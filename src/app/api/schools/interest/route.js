/**
 * /api/schools/interest
 *
 * Captures school interest leads from the landing page modal.
 * No auth required — public lead-capture form.
 *
 * Security posture (April 22 2026 audit):
 *   1. IP rate limit (5/min) — tight because this endpoint sends TWO emails
 *      (internal + external confirmation) per hit and has no auth. A loose
 *      limit lets an attacker cheaply waste our Brevo quota and DB rows.
 *   2. Recipient-email rate limit (3/hour) — blocks email-bombing via the
 *      confirmation flow. An attacker submitting the victim's address 100x
 *      would otherwise use our sender reputation to spam them. 3/hour on the
 *      same `email` still covers a legitimate typo-and-retry.
 *   3. Field length caps — prevent 10 MB payloads from inflating our Brevo
 *      bill or the DB row.
 *   4. HTML escaping on every user-supplied field that flows into an outbound
 *      email. Without this, an attacker can turn our domain into a phishing
 *      vector (submit a malicious link as `schoolName`, target email in the
 *      `email` field, we deliver it).
 *   5. `getServiceRoleClient()` — lazy, browser-guarded, resolves new
 *      `sb_secret_*` key with legacy JWT fallback.
 */

import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { getServiceRoleClient } from "@/lib/security/serviceRole";
import { limit } from "@/lib/security/rateLimit";
import { getClientIp } from "@/lib/security/clientIp";
import logger from "@/lib/logger";
import { schoolInterestSchema } from "@/lib/validation";

// ── Input caps ─────────────────────────────────────────────────────────────
// These are comfortably above any legitimate value (longest registered school
// name in Nigeria is ~90 chars) but below anything that'd wedge our email
// provider or DB.
const MAX_LEN = {
  schoolName: 200,
  contactName: 120,
  email: 320, // RFC 5321 upper bound
  phone: 40,
  state: 80,
};

/**
 * Minimal HTML escape for fields that land in an outbound HTML email body.
 * Not a general-purpose sanitiser — just blocks tag injection and attribute
 * breakouts. For a full sanitiser reach for DOMPurify; we don't render this
 * HTML in a browser, only email clients, so the risk surface is phishing
 * links and script-capable clients, which this covers.
 */
function esc(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/** Clip a string to a max length; returns null/undefined untouched. */
function clip(str, max) {
  if (str == null) return str;
  const s = String(str);
  return s.length > max ? s.slice(0, max) : s;
}

export async function POST(request) {
  try {
    // ── 0a. IP rate limit ──────────────────────────────────────────────────
    const ip = getClientIp(request);
    const ipRl = await limit({
      key: `schools-interest:ip:${ip}`,
      windowSec: 60,
      max: 5,
    });
    if (!ipRl.success) {
      logger.warn("schools_interest_rate_limited_ip", {
        ip,
        backend: ipRl.backend,
      });
      return NextResponse.json(
        { error: "Too many requests. Try again in a minute." },
        { status: 429 }
      );
    }

    // ── 1. Parse & validate ────────────────────────────────────────────────
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    // Defence-in-depth: clip fields BEFORE Zod so a 10 MB payload can't
    // OOM the validator. Zod still enforces its own caps after, but the
    // clip keeps us safe in the narrow window where a huge string reaches
    // safeParse. If a field exceeds MAX_LEN we just truncate rather than
    // reject — matches the pre-Zod behaviour callers depend on.
    const prepped = {
      schoolName: clip(body.schoolName, MAX_LEN.schoolName),
      contactName: clip(body.contactName, MAX_LEN.contactName),
      email: clip(body.email, MAX_LEN.email),
      phone: clip(body.phone, MAX_LEN.phone),
      state: clip(body.state, MAX_LEN.state),
      studentCount: body.studentCount,
    };

    const parsed = schoolInterestSchema.safeParse(prepped);
    if (!parsed.success) {
      // This is a public endpoint, returning field-level errors is fine here
      // (the form UI relies on them) — no enumeration angle to protect.
      const firstError = parsed.error.issues[0];
      const field = firstError?.path?.[0];
      const msg =
        field === "email"
          ? "Invalid email"
          : field === "schoolName"
            ? "schoolName and email are required"
            : field === "studentCount"
              ? "Invalid student count"
              : "Invalid request";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const {
      schoolName: parsedSchoolName,
      contactName: parsedContactName,
      email,
      phone: parsedPhone,
      state: parsedState,
      studentCount: parsedStudentCount,
    } = parsed.data;

    // ── 0b. Per-recipient email rate limit ────────────────────────────────
    // Blocks using our Brevo sender to email-bomb a stranger. 3/hour per
    // target email is above any real typo-and-retry rate.
    const emailRl = await limit({
      key: `schools-interest:email:${email}`,
      windowSec: 3600,
      max: 3,
    });
    if (!emailRl.success) {
      logger.warn("schools_interest_rate_limited_email", {
        emailLength: email.length,
        backend: emailRl.backend,
      });
      // Fake success. Attacker sees identical output to a real submission so
      // they can't probe which emails have already hit the limit.
      return NextResponse.json({ ok: true });
    }

    // Zod already trimmed/normalised each string and coerced studentCount
    // from the form's string or number. Normalise empties → null here so
    // the DB insert and email builders see a consistent shape.
    const schoolName = parsedSchoolName;
    const contactName = parsedContactName ? parsedContactName : null;
    const phone = parsedPhone ? parsedPhone : null;
    const state = parsedState ? parsedState : null;
    const studentCount =
      typeof parsedStudentCount === "number" ? parsedStudentCount : null;

    // ── 2. Save to Supabase (graceful fail — table may not yet exist) ──────
    try {
      const supabase = getServiceRoleClient();
      await supabase.from("school_interest_leads").insert({
        school_name: schoolName,
        contact_name: contactName,
        contact_email: email,
        contact_phone: phone,
        student_count: studentCount,
        state,
        source: "landing_page",
      });
    } catch (insertError) {
      // Non-fatal: we still want the email notification to go out. The
      // logger call is the operational signal that we need to create or
      // fix the table.
      logger.warn("schools_interest_db_insert_failed", {
        error: insertError?.message || String(insertError),
      });
    }

    // ── 3. Internal notification email ─────────────────────────────────────
    // NOTE: every user-supplied field goes through esc() before hitting HTML.
    // The mailto: link wraps an email address whose local/domain chars can't
    // carry active content, but we still escape for consistency.
    await sendEmail({
      to: "hello@launchpard.com",
      subject: `New School Lead: ${schoolName.slice(0, 80)}`,
      htmlContent: `
        <h2>New School Interest Lead</h2>
        <table cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-family:sans-serif;font-size:14px;">
          <tr><td><strong>School Name</strong></td><td>${esc(schoolName)}</td></tr>
          <tr><td><strong>Contact</strong></td><td>${esc(contactName) || "—"}</td></tr>
          <tr><td><strong>Email</strong></td><td><a href="mailto:${esc(email)}">${esc(email)}</a></td></tr>
          <tr><td><strong>Phone</strong></td><td>${esc(phone) || "—"}</td></tr>
          <tr><td><strong>Students</strong></td><td>${esc(studentCount) || "—"}</td></tr>
          <tr><td><strong>State</strong></td><td>${esc(state) || "—"}</td></tr>
        </table>
        <p style="margin-top:16px;color:#666;font-size:12px;">Submitted via landing page school interest modal.</p>
      `,
    });

    // ── 4. Confirmation email to the school contact ────────────────────────
    try {
      await sendEmail({
        to: email,
        subject: `Thanks for your interest in LaunchPard, ${(contactName || schoolName).slice(0, 60)}`,
        htmlContent: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1e293b;">
            <h2 style="color:#4f46e5;">We got your message!</h2>
            <p>Hi ${esc(contactName) || "there"},</p>
            <p>Thanks for reaching out about <strong>${esc(schoolName)}</strong>. We'll be in touch within 1–2 business days to walk you through how LaunchPard works for schools.</p>
            <p>In the meantime, here's what to expect:</p>
            <ul>
              <li>A short demo call (30 min) — we'll show you the teacher dashboard live</li>
              <li>A tailored onboarding plan for your school size</li>
              <li>A Starter tier for your school with no upfront cost — teacher dashboards, mastery tracking, and gap analysis included from day one</li>
            </ul>
            <p>Got a question right now? Reply to this email and we'll answer quickly.</p>
            <p>— The LaunchPard Team</p>
          </div>
        `,
      });
    } catch (confirmError) {
      // Confirmation email is best-effort; the internal lead already landed.
      logger.warn("schools_interest_confirmation_failed", {
        error: confirmError?.message || String(confirmError),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("schools_interest_error", { error });
    return NextResponse.json(
      { error: "Failed to submit interest" },
      { status: 500 }
    );
  }
}
