// ─── Deploy to: src/app/api/cron/reminders/route.js ─────────────────────────
// Vercel Cron: runs every 15 minutes, checks scholar_reminders for due
// reminders, sends email via Resend/SMTP, logs results, tracks ignores.
//
// Add to vercel.json:
//   { "crons": [{ "path": "/api/cron/reminders", "schedule": "*/15 * * * *" }] }
//
// Requires env vars:
//   CRON_SECRET          — shared secret to verify Vercel cron calls
//   SUPABASE_URL         — Supabase project URL
//   SUPABASE_SERVICE_KEY — service role key (bypasses RLS)
//   RESEND_API_KEY       — Resend.com API key for email sending
//   NEXT_PUBLIC_APP_URL  — e.g. https://launchpard.com

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "edge"; // fast cold starts
export const maxDuration = 30; // 30s max

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://launchpard.com";

export async function GET(req) {
  // ── 1. Verify cron secret ──────────────────────────────────────────────
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  // ── 2. Find due reminders ──────────────────────────────────────────────
  // Check which reminders are due RIGHT NOW based on their timezone + day + time
  // We look for reminders where:
  //   - is_active = true
  //   - current day (in their timezone) is in days_of_week
  //   - current time (in their timezone) is within 15 min of reminder_time
  //   - last_sent_at is NULL or more than 20 hours ago (prevent double-send)
  const now = new Date();

  const { data: reminders, error: fetchErr } = await supabase
    .from("scholar_reminders")
    .select(`
      id, scholar_id, parent_id, days_of_week, reminder_time, timezone, method,
      last_sent_at, total_sent, total_ignored,
      scholars(name, access_code, curriculum, year_level)
    `)
    .eq("is_active", true);

  if (fetchErr) {
    console.error("[cron/reminders] fetch error:", fetchErr.message);
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }

  if (!reminders?.length) {
    return NextResponse.json({ sent: 0, message: "No active reminders" });
  }

  let sent = 0;
  let skipped = 0;

  for (const reminder of reminders) {
    try {
      // ── Check if due ─────────────────────────────────────────────────
      const isDue = isReminderDue(reminder, now);
      if (!isDue) { skipped++; continue; }

      // ── Check not already sent today ─────────────────────────────────
      if (reminder.last_sent_at) {
        const lastSent = new Date(reminder.last_sent_at);
        const hoursSince = (now - lastSent) / (1000 * 60 * 60);
        if (hoursSince < 20) { skipped++; continue; } // already sent today
      }

      // ── Get parent email ─────────────────────────────────────────────
      const { data: parentUser } = await supabase.auth.admin.getUserById(reminder.parent_id);
      const parentEmail = parentUser?.user?.email;
      if (!parentEmail) { skipped++; continue; }

      const scholarName = reminder.scholars?.name || "Your scholar";
      const accessCode = reminder.scholars?.access_code || "";

      // ── Send email ───────────────────────────────────────────────────
      if (reminder.method === "email" || reminder.method === "both") {
        await sendReminderEmail(parentEmail, scholarName, accessCode);
      }

      // ── Log the reminder ─────────────────────────────────────────────
      await supabase.from("reminder_log").insert({
        scholar_id: reminder.scholar_id,
        reminder_id: reminder.id,
        method: reminder.method === "both" ? "email" : reminder.method,
        sent_at: now.toISOString(),
      });

      // ── Update reminder stats ────────────────────────────────────────
      await supabase
        .from("scholar_reminders")
        .update({
          last_sent_at: now.toISOString(),
          total_sent: (reminder.total_sent || 0) + 1,
        })
        .eq("id", reminder.id);

      sent++;
    } catch (err) {
      console.error(`[cron/reminders] Error for reminder ${reminder.id}:`, err.message);
    }
  }

  // ── 3. Check for ignored reminders (sent >2hr ago, scholar didn't log in) ─
  await markIgnoredReminders(supabase);

  return NextResponse.json({ sent, skipped, total: reminders.length });
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if a reminder is due right now based on timezone, day, and time.
 */
function isReminderDue(reminder, now) {
  try {
    // Get current time in the reminder's timezone
    const tz = reminder.timezone || "Europe/London";
    const localStr = now.toLocaleString("en-GB", { timeZone: tz });
    
    // Parse local time: "20/03/2026, 16:30:00"
    const [datePart, timePart] = localStr.split(", ");
    const [hours, minutes] = timePart.split(":").map(Number);
    
    // Get local day of week
    const localDate = new Date(now.toLocaleString("en-US", { timeZone: tz }));
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const localDay = dayNames[localDate.getDay()];
    
    // Check if today is a reminder day
    if (!reminder.days_of_week.includes(localDay)) return false;
    
    // Check if current time is within 15 min of reminder_time
    const [reminderHour, reminderMin] = (reminder.reminder_time || "16:00").split(":").map(Number);
    const reminderMinutes = reminderHour * 60 + reminderMin;
    const currentMinutes = hours * 60 + minutes;
    const diff = Math.abs(currentMinutes - reminderMinutes);
    
    // Due if within 15-minute window (cron runs every 15 min)
    return diff <= 15;
  } catch (err) {
    console.error("[isReminderDue] error:", err.message);
    return false;
  }
}

/**
 * Send a practice reminder email via Resend.
 */
async function sendReminderEmail(toEmail, scholarName, accessCode) {
  const RESEND_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_KEY) {
    console.warn("[sendReminderEmail] RESEND_API_KEY not set, skipping");
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_KEY}`,
    },
    body: JSON.stringify({
      from: "LaunchPard <reminders@launchpard.com>",
      to: [toEmail],
      subject: `🚀 Time for ${scholarName}'s daily mission!`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:480px;margin:0 auto;padding:32px 16px">
    <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);border-radius:20px;padding:32px;text-align:center;color:white">
      <div style="font-size:48px;margin-bottom:12px">🚀</div>
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:800">Mission time!</h1>
      <p style="margin:0;font-size:14px;opacity:0.9">${scholarName}'s daily practice is waiting</p>
    </div>
    
    <div style="background:white;border-radius:16px;padding:24px;margin-top:16px;border:1px solid #e2e8f0">
      <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 16px">
        A quick 10-minute session makes a huge difference. Scholars who practice 
        3+ times per week improve 2x faster.
      </p>
      
      ${accessCode ? `
      <div style="background:#f1f5f9;border-radius:12px;padding:16px;text-align:center;margin-bottom:16px">
        <p style="color:#94a3b8;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px">Access code</p>
        <p style="color:#4f46e5;font-size:24px;font-weight:900;letter-spacing:3px;margin:0">${accessCode}</p>
      </div>
      ` : ""}
      
      <a href="${APP_URL}/login" 
         style="display:block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:white;text-decoration:none;
                text-align:center;padding:14px;border-radius:12px;font-weight:800;font-size:15px">
        Launch Mission →
      </a>
    </div>
    
    <p style="text-align:center;color:#94a3b8;font-size:11px;margin-top:16px">
      You're receiving this because you set up practice reminders for ${scholarName} on 
      <a href="${APP_URL}/dashboard/parent" style="color:#6366f1">LaunchPard</a>.
      <br>Manage reminders in your Parent Portal.
    </p>
  </div>
</body>
</html>`,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("[sendReminderEmail] Resend error:", err);
  }
}

/**
 * Mark reminder_log entries as "ignored" if sent >2hr ago and scholar didn't log in.
 */
async function markIgnoredReminders(supabase) {
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

  // Find unresolved reminders sent more than 2 hours ago
  const { data: unresolvedLogs } = await supabase
    .from("reminder_log")
    .select("id, scholar_id, sent_at")
    .eq("scholar_opened", false)
    .eq("ignored", false)
    .lt("sent_at", twoHoursAgo)
    .limit(100);

  if (!unresolvedLogs?.length) return;

  for (const log of unresolvedLogs) {
    // Check if scholar had any activity after the reminder was sent
    const { count } = await supabase
      .from("quest_sessions")
      .select("id", { count: "exact", head: true })
      .eq("scholar_id", log.scholar_id)
      .gte("created_at", log.sent_at);

    if (count > 0) {
      // Scholar DID practice — mark as opened
      await supabase
        .from("reminder_log")
        .update({ scholar_opened: true, opened_at: new Date().toISOString() })
        .eq("id", log.id);
    } else {
      // Scholar ignored the reminder
      await supabase
        .from("reminder_log")
        .update({ ignored: true })
        .eq("id", log.id);

      // Increment ignore counter on the reminder config
      await supabase.rpc("increment_reminder_ignored", { p_scholar_id: log.scholar_id });
    }
  }
}