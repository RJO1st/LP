// ─── Deploy to: src/app/api/cron/weekly-digest/route.js ──────────────────────
// Vercel Cron: runs Sunday 09:00 UTC (see vercel.json)
// Sends parents a weekly progress summary with:
//   · Questions answered, accuracy, week-over-week delta
//   · Streak
//   · Strengths + focus areas (mastery topics)
//   · School Readiness block (if scholar is enrolled at a partner school)
//   · One actionable focus topic for the week ahead
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from "@supabase/supabase-js";
import { NextResponse }  from "next/server";
import { sendEmail }     from "@/lib/email";

export const runtime    = "nodejs";   // edge doesn't support supabase admin API
export const maxDuration = 60;

const APP_URL = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://launchpard.com";

const GRADE_BAND_COLOR = {
  Exceptional:    "#22c55e",
  Ready:          "#4ade80",
  Developing:     "#f59e0b",
  "Needs Support": "#ef4444",
};

export async function GET(req) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  const now           = new Date();
  const thisWeekStart = new Date(now); thisWeekStart.setDate(now.getDate() - 7);
  const lastWeekStart = new Date(now); lastWeekStart.setDate(now.getDate() - 14);

  // ── Scholars active this week ─────────────────────────────────────────────
  const { data: thisWeekSessions } = await supabase
    .from("quest_sessions")
    .select("scholar_id, subject, score, total_questions, xp_earned, created_at, scholars(id, name, parent_id, curriculum, year_level, school_id)")
    .gte("created_at", thisWeekStart.toISOString());

  if (!thisWeekSessions?.length) {
    return NextResponse.json({ sent: 0, message: "No activity this week" });
  }

  const scholarIds = [...new Set(thisWeekSessions.map(s => s.scholar_id))];

  // ── Last week sessions ────────────────────────────────────────────────────
  const { data: lastWeekSessions } = await supabase
    .from("quest_sessions")
    .select("scholar_id, subject, score, total_questions, xp_earned")
    .in("scholar_id", scholarIds)
    .gte("created_at", lastWeekStart.toISOString())
    .lt("created_at", thisWeekStart.toISOString());

  // ── School readiness snapshots for enrolled scholars ─────────────────────
  const enrolledIds = thisWeekSessions
    .filter(s => s.scholars?.school_id)
    .map(s => s.scholar_id);

  const readinessByScholar = {};
  if (enrolledIds.length > 0) {
    // Get the most recent snapshot per scholar
    const { data: snapshots } = await supabase
      .from("scholar_readiness_snapshot")
      .select("scholar_id, snapshot_date, overall_score, grade_band, mathematics_score, english_score, verbal_reasoning_score, nvr_score")
      .in("scholar_id", enrolledIds)
      .order("snapshot_date", { ascending: false });

    // Keep only the latest per scholar
    for (const snap of (snapshots || [])) {
      if (!readinessByScholar[snap.scholar_id]) {
        readinessByScholar[snap.scholar_id] = snap;
      }
    }

    // Previous snapshot (7 days ago) for delta
    const snapshotWeekAgo = new Date(now); snapshotWeekAgo.setDate(now.getDate() - 8);
    const { data: prevSnapshots } = await supabase
      .from("scholar_readiness_snapshot")
      .select("scholar_id, overall_score")
      .in("scholar_id", enrolledIds)
      .lte("snapshot_date", snapshotWeekAgo.toISOString().split("T")[0])
      .order("snapshot_date", { ascending: false });

    const prevByScholar = {};
    for (const snap of (prevSnapshots || [])) {
      if (!prevByScholar[snap.scholar_id]) {
        prevByScholar[snap.scholar_id] = snap;
      }
    }

    // Attach delta to current snapshot
    for (const sid of enrolledIds) {
      if (readinessByScholar[sid] && prevByScholar[sid]) {
        readinessByScholar[sid].delta =
          (readinessByScholar[sid].overall_score || 0) - (prevByScholar[sid].overall_score || 0);
      }
    }
  }

  // ── Aggregate sessions ────────────────────────────────────────────────────
  const aggregate = (sessions) => {
    const map = {};
    for (const s of (sessions || [])) {
      if (!map[s.scholar_id]) map[s.scholar_id] = { questions: 0, correct: 0, xp: 0, sessions: 0, subjects: new Set() };
      map[s.scholar_id].questions += s.total_questions || 0;
      map[s.scholar_id].correct   += s.score           || 0;
      map[s.scholar_id].xp        += s.xp_earned       || 0;
      map[s.scholar_id].sessions  += 1;
      map[s.scholar_id].subjects.add(s.subject);
    }
    return map;
  };

  const thisWeekMap = aggregate(thisWeekSessions);
  const lastWeekMap = aggregate(lastWeekSessions);

  // ── Group by parent ───────────────────────────────────────────────────────
  const byParent = {};
  for (const s of thisWeekSessions) {
    const pid = s.scholars?.parent_id;
    if (!pid) continue;
    if (!byParent[pid]) byParent[pid] = {};
    if (!byParent[pid][s.scholar_id]) {
      byParent[pid][s.scholar_id] = {
        scholar:  s.scholars,
        thisWeek: thisWeekMap[s.scholar_id],
        lastWeek: lastWeekMap[s.scholar_id],
      };
    }
  }

  // ── Send per parent ───────────────────────────────────────────────────────
  let sent = 0;

  for (const [parentId, scholars] of Object.entries(byParent)) {
    try {
      const { data: parentUser } = await supabase.auth.admin.getUserById(parentId);
      const email = parentUser?.user?.email;
      if (!email) continue;

      const scholarSummaries = [];

      for (const [sid, data] of Object.entries(scholars)) {
        const tw = data.thisWeek || { questions: 0, correct: 0, xp: 0, sessions: 0, subjects: new Set() };
        const lw = data.lastWeek || { questions: 0, correct: 0, xp: 0, sessions: 0, subjects: new Set() };

        const twAccuracy    = tw.questions > 0 ? Math.round((tw.correct / tw.questions) * 100) : 0;
        const lwAccuracy    = lw.questions > 0 ? Math.round((lw.correct / lw.questions) * 100) : 0;
        const accuracyDelta = twAccuracy - lwAccuracy;

        // Mastery topics
        const { data: mastery } = await supabase
          .from("scholar_topic_mastery")
          .select("topic, mastery_score, subject")
          .eq("scholar_id", sid)
          .order("mastery_score", { ascending: false });

        const strengths  = (mastery || []).slice(0, 3).map(m => ({
          topic: m.topic.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
          score: Math.round((m.mastery_score || 0) * 100),
        }));
        const weaknesses = (mastery || []).filter(m => (m.mastery_score || 0) < 0.7).slice(-3).reverse().map(m => ({
          topic: m.topic.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
          score: Math.round((m.mastery_score || 0) * 100),
        }));

        // Streak
        const { data: streakRow } = await supabase
          .from("scholars")
          .select("streak_days")
          .eq("id", sid)
          .single();

        // School readiness (if enrolled)
        const readiness = readinessByScholar[sid] || null;

        scholarSummaries.push({
          id:            sid,
          name:          data.scholar.name,
          questions:     tw.questions,
          correct:       tw.correct,
          accuracy:      twAccuracy,
          accuracyDelta,
          xp:            tw.xp,
          sessions:      tw.sessions,
          subjects:      [...(tw.subjects || [])].map(s => s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())),
          streak:        streakRow?.streak_days || 0,
          strengths,
          weaknesses,
          prevQuestions: lw.questions,
          readiness,
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

// ─────────────────────────────────────────────────────────────────────────────
function readinessBlock(r) {
  if (!r) return "";
  const color     = GRADE_BAND_COLOR[r.grade_band] || "#94a3b8";
  const deltaText = r.delta != null
    ? (r.delta > 0 ? `<span style="color:#22c55e">↑ +${Math.round(r.delta)} pts</span>`
    : r.delta < 0  ? `<span style="color:#ef4444">↓ ${Math.round(r.delta)} pts</span>`
    :                `<span style="color:#94a3b8">→ no change</span>`)
    : "";

  const subjectRows = [
    { label: "Maths",   score: r.mathematics_score },
    { label: "English", score: r.english_score },
    { label: "VR",      score: r.verbal_reasoning_score },
    { label: "NVR",     score: r.nvr_score },
  ].filter(s => s.score != null).map(s => `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
      <span style="font-size:11px;color:#94a3b8;width:44px">${s.label}</span>
      <div style="flex:1;height:6px;background:#1e293b;border-radius:3px;overflow:hidden">
        <div style="width:${Math.round(s.score)}%;height:100%;background:${color};border-radius:3px;transition:width 0.3s"></div>
      </div>
      <span style="font-size:11px;font-weight:700;color:#e2e8f0;width:32px;text-align:right">${Math.round(s.score)}%</span>
    </div>
  `).join("");

  return `
    <div style="background:#0f172a;border:1px solid rgba(99,102,241,0.2);border-radius:12px;padding:14px;margin-top:12px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <span style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.08em">School Readiness</span>
        <span style="font-size:11px;font-weight:700;color:${color};background:${color}20;padding:2px 8px;border-radius:20px">
          ${r.grade_band || "—"} · ${Math.round(r.overall_score || 0)}/100
        </span>
      </div>
      ${subjectRows}
      ${deltaText ? `<p style="font-size:11px;margin-top:8px;margin-bottom:0">Week-on-week: ${deltaText}</p>` : ""}
    </div>
  `;
}

async function sendWeeklyDigestEmail(toEmail, scholars) {
  const scholarBlocks = scholars.map(s => {
    const deltaIcon  = s.accuracyDelta > 0 ? "📈" : s.accuracyDelta < 0 ? "📉" : "➡️";
    const deltaColor = s.accuracyDelta > 0 ? "#16a34a" : s.accuracyDelta < 0 ? "#dc2626" : "#64748b";
    const deltaText  = s.accuracyDelta > 0 ? `+${s.accuracyDelta}%` : s.accuracyDelta < 0 ? `${s.accuracyDelta}%` : "same";

    const strengthBars = s.strengths.map(t => `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
        <span style="font-size:11px;color:#16a34a;width:14px">✓</span>
        <span style="font-size:12px;color:#334155;flex:1">${t.topic}</span>
        <span style="font-size:11px;font-weight:700;color:#16a34a">${t.score}%</span>
      </div>`).join("");

    const weakBars = s.weaknesses.map(t => `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
        <span style="font-size:11px;color:#f59e0b;width:14px">!</span>
        <span style="font-size:12px;color:#334155;flex:1">${t.topic}</span>
        <span style="font-size:11px;font-weight:700;color:#f59e0b">${t.score}%</span>
      </div>`).join("");

    const focusTopic = s.weaknesses[0]?.topic;

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
            <div style="font-size:22px;font-weight:900;color:${s.accuracy >= 70 ? "#22c55e" : "#f59e0b"}">${s.accuracy}%</div>
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
          </div>` : ""}

        ${weakBars ? `
          <div style="margin-bottom:8px">
            <div style="font-size:10px;font-weight:700;color:#f59e0b;text-transform:uppercase;margin-bottom:6px">Focus areas</div>
            ${weakBars}
          </div>` : ""}

        ${focusTopic ? `
          <div style="background:#fef3c7;border-radius:8px;padding:10px;margin-top:4px">
            <p style="font-size:11px;font-weight:700;color:#92400e;margin:0">
              💡 This week: practise <strong>${focusTopic}</strong> with Tara to move up a grade band.
            </p>
          </div>` : ""}

        ${readinessBlock(s.readiness)}
      </div>
    `;
  }).join("");

  const allNames = scholars.map(s => s.name).join(" & ");

  await sendEmail({
    to:      toEmail,
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
      Week of ${new Date(Date.now() - 7 * 86400000).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}
      – ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
    </p>
  </div>

  ${scholarBlocks}

  <a href="${APP_URL}/dashboard/parent"
    style="display:block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:white;text-decoration:none;
      text-align:center;padding:14px;border-radius:12px;font-weight:800;font-size:14px;margin-top:8px">
    View full analytics →
  </a>

  <p style="text-align:center;color:#94a3b8;font-size:11px;margin-top:16px">
    Sent every Sunday by <a href="${APP_URL}" style="color:#6366f1">LaunchPard</a> ·
    <a href="${APP_URL}/dashboard/parent?tab=settings" style="color:#6366f1">Email preferences</a>
  </p>
</div>
</body></html>`,
  });
}
