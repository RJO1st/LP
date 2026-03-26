// ─── Deploy to: src/app/api/cron/daily-summary/route.js ──────────────────────
// Vercel Cron: runs at 7pm UTC daily
// Finds scholars who practiced today, sends parents a brief summary email
//
// Add to vercel.json crons array:
//   { "path": "/api/cron/daily-summary", "schedule": "0 19 * * *" }

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "edge";
export const maxDuration = 30;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://launchpard.com";

export async function GET(req) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  // Find all quest sessions completed today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data: sessions } = await supabase
    .from("quest_sessions")
    .select(`
      scholar_id, subject, score, total_questions, xp_earned,
      scholars(id, name, parent_id, curriculum, year_level)
    `)
    .gte("created_at", todayStart.toISOString());

  if (!sessions?.length) {
    return NextResponse.json({ sent: 0, message: "No activity today" });
  }

  // Group by scholar
  const byScholar = {};
  for (const s of sessions) {
    const sid = s.scholar_id;
    if (!byScholar[sid]) {
      byScholar[sid] = {
        scholar: s.scholars,
        sessions: [],
        totalQuestions: 0,
        totalCorrect: 0,
        totalXP: 0,
        subjects: new Set(),
      };
    }
    byScholar[sid].sessions.push(s);
    byScholar[sid].totalQuestions += s.total_questions || 0;
    byScholar[sid].totalCorrect += s.score || 0;
    byScholar[sid].totalXP += s.xp_earned || 0;
    byScholar[sid].subjects.add(s.subject);
  }

  // Group scholars by parent
  const byParent = {};
  for (const [sid, data] of Object.entries(byScholar)) {
    const pid = data.scholar?.parent_id;
    if (!pid) continue;
    if (!byParent[pid]) byParent[pid] = [];
    byParent[pid].push(data);
  }

  let sent = 0;

  for (const [parentId, scholars] of Object.entries(byParent)) {
    try {
      // Get parent email
      const { data: parentUser } = await supabase.auth.admin.getUserById(parentId);
      const email = parentUser?.user?.email;
      if (!email) continue;

      // Get weakest topic for each scholar (from today's sessions)
      const scholarSummaries = [];
      for (const s of scholars) {
        // Find topic with lowest score today
        const { data: topicScores } = await supabase
          .from("scholar_topic_mastery")
          .select("topic, mastery_score")
          .eq("scholar_id", s.scholar.id)
          .order("mastery_score", { ascending: true })
          .limit(1);

        const weakestTopic = topicScores?.[0]?.topic?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) || null;
        const accuracy = s.totalQuestions > 0
          ? Math.round((s.totalCorrect / s.totalQuestions) * 100)
          : 0;

        scholarSummaries.push({
          name: s.scholar.name,
          questions: s.totalQuestions,
          correct: s.totalCorrect,
          accuracy,
          xp: s.totalXP,
          subjects: [...s.subjects].map(sub => sub.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())),
          weakestTopic,
          sessionsCount: s.sessions.length,
        });
      }

      await sendDailySummaryEmail(email, scholarSummaries);
      sent++;
    } catch (err) {
      console.error(`[daily-summary] Error for parent ${parentId}:`, err.message);
    }
  }

  return NextResponse.json({ sent, parents: Object.keys(byParent).length });
}

async function sendDailySummaryEmail(toEmail, scholars) {
  const RESEND_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_KEY) return;

  const scholarBlocks = scholars.map(s => `
    <div style="background:#f8fafc;border-radius:12px;padding:16px;margin-bottom:12px;border:1px solid #e2e8f0">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span style="font-weight:700;font-size:16px;color:#1e293b">${s.name}</span>
        <span style="background:${s.accuracy >= 80 ? '#dcfce7' : s.accuracy >= 60 ? '#fef3c7' : '#fee2e2'};
               color:${s.accuracy >= 80 ? '#166534' : s.accuracy >= 60 ? '#92400e' : '#991b1b'};
               padding:4px 10px;border-radius:8px;font-size:12px;font-weight:700">${s.accuracy}% accuracy</span>
      </div>
      <div style="display:flex;gap:16px;margin-bottom:8px">
        <div style="text-align:center">
          <div style="font-size:20px;font-weight:800;color:#4f46e5">${s.questions}</div>
          <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;font-weight:700">Questions</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:20px;font-weight:800;color:#22c55e">${s.correct}</div>
          <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;font-weight:700">Correct</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:20px;font-weight:800;color:#f59e0b">${s.xp}</div>
          <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;font-weight:700">XP earned</div>
        </div>
      </div>
      <div style="font-size:12px;color:#64748b">
        Practised: ${s.subjects.join(", ")}
        ${s.weakestTopic ? `<br>Focus area: <strong style="color:#dc2626">${s.weakestTopic}</strong>` : ""}
      </div>
    </div>
  `).join("");

  const allNames = scholars.map(s => s.name).join(" & ");

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_KEY}`,
    },
    body: JSON.stringify({
      from: "LaunchPard <updates@launchpard.com>",
      to: [toEmail],
      subject: `Today's mission report: ${allNames}`,
      html: `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<div style="max-width:480px;margin:0 auto;padding:24px 16px">
  <div style="text-align:center;margin-bottom:16px">
    <div style="font-size:32px;margin-bottom:4px">🚀</div>
    <h1 style="font-size:18px;font-weight:800;color:#1e293b;margin:0">Today's mission report</h1>
    <p style="font-size:13px;color:#94a3b8;margin:4px 0 0">${new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</p>
  </div>
  ${scholarBlocks}
  <a href="${APP_URL}/dashboard/parent" style="display:block;background:linear-gradient(135deg,#4f46e5,#7c3aed);
    color:white;text-decoration:none;text-align:center;padding:14px;border-radius:12px;font-weight:800;font-size:14px;margin-top:16px">
    View full progress →
  </a>
  <p style="text-align:center;color:#94a3b8;font-size:11px;margin-top:16px">
    Sent by <a href="${APP_URL}" style="color:#6366f1">LaunchPard</a> · Manage in Parent Portal
  </p>
</div>
</body></html>`,
    }),
  });
}