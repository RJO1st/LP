// ─── Deploy to: src/app/api/cron/inactivity-nudge/route.js ──────────────────
// Vercel Cron: runs daily at 10am UTC
// Finds scholars with NO quiz activity in the past N days,
// groups them by parent, sends a nudge email via Resend.
//
// Can also be triggered manually:
//   GET /api/cron/inactivity-nudge?days=5
//   (must include Authorization: Bearer <CRON_SECRET>)
//
// Add to vercel.json crons array:
//   { "path": "/api/cron/inactivity-nudge", "schedule": "0 10 * * *" }
//
// Requires env vars:
//   CRON_SECRET, SUPABASE_URL, SUPABASE_SERVICE_KEY, RESEND_API_KEY

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "edge";
export const maxDuration = 30;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://launchpard.com";
const DEFAULT_INACTIVE_DAYS = 5;

export async function GET(req) {
  // ── 1. Auth ────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const RESEND_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_KEY) {
    return NextResponse.json({ error: "RESEND_API_KEY not set" }, { status: 500 });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  // ── 2. Config ──────────────────────────────────────────────────────────────
  const url = new URL(req.url);
  const inactiveDays = parseInt(url.searchParams.get("days") || DEFAULT_INACTIVE_DAYS, 10);
  const cutoffDate = new Date(Date.now() - inactiveDays * 24 * 60 * 60 * 1000).toISOString();

  // ── 3. Get ALL active scholars with their parent ───────────────────────────
  const { data: allScholars, error: scholarsErr } = await supabase
    .from("scholars")
    .select("id, name, parent_id, access_code, streak, current_streak, curriculum, year_level")
    .not("parent_id", "is", null);

  if (scholarsErr) {
    console.error("[inactivity-nudge] scholars fetch error:", scholarsErr.message);
    return NextResponse.json({ error: scholarsErr.message }, { status: 500 });
  }

  if (!allScholars?.length) {
    return NextResponse.json({ sent: 0, message: "No scholars found" });
  }

  // ── 4. For each scholar, check if they have ANY quiz_results after cutoff ─
  const inactiveScholars = [];

  for (const scholar of allScholars) {
    const { count } = await supabase
      .from("quiz_results")
      .select("id", { count: "exact", head: true })
      .eq("scholar_id", scholar.id)
      .gte("created_at", cutoffDate);

    if (count === 0) {
      // Get their most recent quiz to know "days since" and last subject
      const { data: lastQuiz } = await supabase
        .from("quiz_results")
        .select("created_at, subject")
        .eq("scholar_id", scholar.id)
        .order("created_at", { ascending: false })
        .limit(1);

      const lastActivity = lastQuiz?.[0]?.created_at;
      const daysSince = lastActivity
        ? Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24))
        : null; // null = never did a quiz

      inactiveScholars.push({
        ...scholar,
        daysSince: daysSince ?? inactiveDays,
        lastSubject: lastQuiz?.[0]?.subject
          ? lastQuiz[0].subject.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
          : null,
      });
    }
  }

  if (!inactiveScholars.length) {
    return NextResponse.json({ sent: 0, message: "All scholars active — no nudges needed" });
  }

  // ── 5. Group inactive scholars by parent ───────────────────────────────────
  const byParent = {};
  for (const s of inactiveScholars) {
    if (!byParent[s.parent_id]) byParent[s.parent_id] = [];
    byParent[s.parent_id].push(s);
  }

  // ── 6. Send one email per parent ───────────────────────────────────────────
  let sent = 0;
  let failed = 0;
  const results = [];

  for (const [parentId, scholars] of Object.entries(byParent)) {
    try {
      // Get parent email + name
      const { data: parentUser } = await supabase.auth.admin.getUserById(parentId);
      const parentEmail = parentUser?.user?.email;
      if (!parentEmail) { results.push({ parentId, status: "no_email" }); continue; }

      const parentName = parentUser?.user?.user_metadata?.full_name
        || parentUser?.user?.user_metadata?.name
        || null;

      // Get parent name from parents table as fallback
      let displayName = parentName;
      if (!displayName) {
        const { data: parentRow } = await supabase
          .from("parents")
          .select("full_name")
          .eq("id", parentId)
          .single();
        displayName = parentRow?.full_name || null;
      }

      // Build scholar data for the template
      const scholarData = scholars.map(s => ({
        name:        s.name,
        daysSince:   s.daysSince,
        lastSubject: s.lastSubject,
        streak:      s.current_streak || s.streak || 0,
        accessCode:  s.access_code || null,
      }));

      // Generate email HTML from template
      const { EMAIL_TEMPLATES } = await import("../../../../lib/emailTemplates.js");
      const template = EMAIL_TEMPLATES.inactivityNudge(displayName, scholarData);

      // Send via Resend
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_KEY}`,
        },
        body: JSON.stringify({
          from: "LaunchPard <updates@launchpard.com>",
          to: [parentEmail],
          subject: template.subject,
          html: template.htmlContent,
        }),
      });

      if (res.ok) {
        sent++;
        results.push({
          parentId,
          email: parentEmail,
          scholars: scholars.map(s => s.name),
          status: "sent",
        });
        console.log(`[inactivity-nudge] ✅ Sent to ${parentEmail} for ${scholars.map(s => s.name).join(", ")}`);
      } else {
        const errText = await res.text();
        failed++;
        results.push({ parentId, email: parentEmail, status: "resend_error", error: errText });
        console.error(`[inactivity-nudge] ❌ Resend error for ${parentEmail}:`, errText);
      }
    } catch (err) {
      failed++;
      results.push({ parentId, status: "error", error: err.message });
      console.error(`[inactivity-nudge] Error for parent ${parentId}:`, err.message);
    }
  }

  return NextResponse.json({
    sent,
    failed,
    totalInactiveScholars: inactiveScholars.length,
    totalParents: Object.keys(byParent).length,
    inactiveDays,
    results,
  });
}
