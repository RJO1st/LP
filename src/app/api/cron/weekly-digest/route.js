// ─── Deploy to: src/app/api/cron/weekly-digest/route.js ──────────────────────
// Vercel Cron: runs Sunday 6pm UTC
// Sends parents a weekly progress summary with week-over-week comparison
//
// Add to vercel.json crons:
//   { "path": "/api/cron/weekly-digest", "schedule": "0 18 * * 0" }

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "edge";
export const maxDuration = 60;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://launchpard.com";

export async function GET(req) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  const now = new Date();
  const thisWeekStart = new Date(now); thisWeekStart.setDate(now.getDate() - 7);
  const lastWeekStart = new Date(now); lastWeekStart.setDate(now.getDate() - 14);

  // Get all scholars with sessions this week
  const { data: thisWeekSessions } = await supabase
    .from("quest_sessions")
    .select("scholar_id, subject, score, total_questions, xp_earned, created_at, scholars(id, name, parent_id, curriculum, year_level)")
    .gte("created_at", thisWeekStart.toISOString());

  if (!thisWeekSessions?.length) {
    return NextResponse.json({ sent: 0, message: "No activity this week" });
  }

  // Get last week's sessions for comparison
  const scholarIds = [...new Set(thisWeekSessions.map(s => s.scholar_id))];
  const { data: lastWeekSessions } = await supabase
    .from("quest_sessions")
    .select("scholar_id, subject, score, total_questions, xp_earned")
    .in("scholar_id", scholarIds)
    .gte("created_at", lastWeekStart.toISOString())
    .lt("created_at", thisWeekStart.toISOString());

  // Aggregate by scholar
  const aggregate = (sessions) => {
    const map = {};
    for (const s of (sessions || [])) {
      if (!map[s.scholar_id]) map[s.scholar_id] = { questions: 0, correct: 0, xp: 0, sessions: 0, subjects: new Set() };
      map[s.scholar_id].questions += s.total_questions || 0;
      map[s.scholar_id].correct += s.score || 0;
      map[s.scholar_id].xp += s.xp_earned || 0;
      map[s.scholar_id].sessions += 1;
      map[s.scholar_id].subjects.add(s.subject);
    }
    return map;
  };

  const thisWeek = aggregate(thisWeekSessions);
  const lastWeek = aggregate(lastWeekSessions);

  // Group by parent
  const byParent = {};
  for (const s of thisWeekSessions) {
    const pid = s.scholars?.parent_id;
    if (!pid) continue;
    if (!byParent[pid]) byParent[pid] = {};
    if (!byParent[pid][s.scholar_id]) {
      byParent[pid][s.scholar_id] = { scholar: s.scholars, thisWeek: thisWeek[s.scholar_id], lastWeek: lastWeek[s.scholar_id] };
    }
  }

  let sent = 0;
  for (const [parentId, scholars] of Object.entries(byParent)) {
    try {
      const { data: parentUser } = await supabase.auth.admin.getUserById(parentId);
      const email = parentUser?.user?.email;
      if (!email) continue;

      // Get top mastery topics per scholar
      const scholarSummaries = [];
      for (const [sid, data] of Object.entries(scholars)) {
        const tw = data.thisWeek || { questions: 0, correct: 0, xp: 0, sessions: 0, subjects: new Set() };
        const lw = data.lastWeek || { questions: 0, correct: 0, xp: 0, sessions: 0, subjects: new Set() };

        const twAccuracy = tw.questions > 0 ? Math.round((tw.correct / tw.questions) * 100) : 0;
        const lwAccuracy = lw.questions > 0 ? Math.round((lw.correct / lw.questions) * 100) : 0;
        const accuracyDelta = twAccuracy - lwAccuracy;

        // Get top 3 strongest and weakest topics
        const { data: mastery } = await supabase
          .from("scholar_topic_mastery")
          .select("topic, mastery_score, subject")
          .eq("scholar_id", sid)
          .order("mastery_score", { ascending: false });

        const strengths = (mastery || []).slice(0, 3).map(m => ({
          topic: m.topic.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
          score: Math.round((m.mastery_score || 0) * 100),
        }));
        const weaknesses = (mastery || []).slice(-3).reverse().map(m => ({
          topic: m.topic.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
          score: Math.round((m.mastery_score || 0) * 100),
        }));

        // Get streak
        const { data: streakData } = await supabase
          .from("scholars")
          .select("streak_days")
          .eq("id", sid)
          .single();

        scholarSummaries.push({
          name: data.scholar.name,
          questions: tw.questions,
          correct: tw.correct,
          accuracy: twAccuracy,
          accuracyDelta,
          xp: tw.xp,
          sessions: tw.sessions,
          subjects: [...(tw.subjects || [])].map(s => s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())),
          streak: streakData?.streak_days || 0,
          strengths,
          weaknesses,
          prevQuestions: lw.questions,
        });
      }

      await sendWeeklyDigestEmail(email, scholarSummaries);
      sent++;
    } catch (err) {
      console.error(`[weekly-digest] Error for parent ${parentId}:`, err.message);
    }
  }

  return NextResponse.json({ sent, parents: Object.keys(byParent).length });
}

async function sendWeeklyDigestEmail(toEmail, scholars) {
  const RESEND_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_KEY) return;

  const scholarBlocks = scholars.map(s => {
    const deltaIcon = s.accuracyDelta > 0 ? "📈" : s.accuracyDelta < 0 ? "📉" : "➡️";
    const deltaColor = s.accuracyDelta > 0 ? "#16a34a" : s.accuracyDelta < 0 ? "#dc2626" : "#64748b";
    const deltaText = s.accuracyDelta > 0 ? `+${s.accuracyDelta}%` : s.accuracyDelta < 0 ? `${s.accuracyDelta}%` : "same";

    const strengthBars = s.strengths.map(t => `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
        <span style="font-size:11px;color:#16a34a;width:14px">✓</span>
        <span style="font-size:12px;color:#334155;flex:1">${t.topic}</span>
        <span style="font-size:11px;font-weight:700;color:#16a34a">${t.score}%</span>
      </div>
    `).join("");

    const weakBars = s.weaknesses.filter(t => t.score < 70).map(t => `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
        <span style="font-size:11px;color:#f59e0b;width:14px">!</span>
        <span style="font-size:12px;color:#334155;flex:1">${t.topic}</span>
        <span style="font-size:11px;font-weight:700;color:#f59e0b">${t.score}%</span>
      </div>
    `).join("");

    return `
      <div style="background:white;border-radius:16px;padding:20px;margin-bottom:16px;border:1px solid #e2e8f0">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <span style="font-weight:800;font-size:18px;color:#1e293b">${s.name}</span>
          ${s.streak > 0 ? `<span style="font-size:13px;font-weight:700;color:#f59e0b">🔥 ${s.streak} day streak</span>` : ""}
        </div>
        
        <div style="display:flex;gap:12px;margin-bottom:16px">
          <div style="flex:1;text-align:center;background:#f8fafc;border-radius:10px;padding:10px">
            <div style="font-size:22px;font-weight:900;color:#4f46e5">${s.questions}</div>
            <div style="font-size:9px;color:#94a3b8;font-weight:700;text-transform:uppercase">Questions</div>
          </div>
          <div style="flex:1;text-align:center;background:#f8fafc;border-radius:10px;padding:10px">
            <div style="font-size:22px;font-weight:900;color:${s.accuracy >= 70 ? '#22c55e' : '#f59e0b'}">${s.accuracy}%</div>
            <div style="font-size:9px;color:#94a3b8;font-weight:700;text-transform:uppercase">Accuracy</div>
          </div>
          <div style="flex:1;text-align:center;background:#f8fafc;border-radius:10px;padding:10px">
            <div style="font-size:16px;font-weight:900;color:${deltaColor}">${deltaIcon} ${deltaText}</div>
            <div style="font-size:9px;color:#94a3b8;font-weight:700;text-transform:uppercase">vs last week</div>
          </div>
        </div>
        
        ${strengthBars ? `
          <div style="margin-bottom:8px">
            <div style="font-size:10px;font-weight:700;color:#16a34a;text-transform:uppercase;margin-bottom:6px">Strengths</div>
            ${strengthBars}
          </div>
        ` : ""}
        
        ${weakBars ? `
          <div>
            <div style="font-size:10px;font-weight:700;color:#f59e0b;text-transform:uppercase;margin-bottom:6px">Focus areas</div>
            ${weakBars}
          </div>
        ` : ""}
      </div>
    `;
  }).join("");

  const allNames = scholars.map(s => s.name).join(" & ");

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_KEY}` },
    body: JSON.stringify({
      from: "LaunchPard <digest@launchpard.com>",
      to: [toEmail],
      subject: `📊 Weekly progress: ${allNames}`,
      html: `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<div style="max-width:500px;margin:0 auto;padding:24px 16px">
  <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);border-radius:20px;padding:24px;text-align:center;color:white;margin-bottom:16px">
    <div style="font-size:36px;margin-bottom:8px">📊</div>
    <h1 style="font-size:20px;font-weight:800;margin:0 0 4px">Weekly progress report</h1>
    <p style="font-size:13px;opacity:0.9;margin:0">
      Week of ${new Date(Date.now() - 7 * 86400000).toLocaleDateString("en-GB", { day: "numeric", month: "long" })} – ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
    </p>
  </div>
  ${scholarBlocks}
  <a href="${APP_URL}/dashboard/parent" style="display:block;background:linear-gradient(135deg,#4f46e5,#7c3aed);
    color:white;text-decoration:none;text-align:center;padding:14px;border-radius:12px;font-weight:800;font-size:14px;margin-top:8px">
    View detailed analytics →
  </a>
  <p style="text-align:center;color:#94a3b8;font-size:11px;margin-top:16px">
    Sent every Sunday by <a href="${APP_URL}" style="color:#6366f1">LaunchPard</a>
  </p>
</div>
</body></html>`,
    }),
  });
}