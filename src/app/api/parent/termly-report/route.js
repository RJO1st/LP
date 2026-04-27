/**
 * GET /api/parent/termly-report?scholarId=
 *
 * Returns a self-contained, LaunchPard-branded HTML termly progress report
 * for one scholar. Designed for parents to share with family or save as PDF.
 * Zero external dependencies — download as .html, print to PDF in browser.
 *
 * Auth: authenticated parent who owns the scholar.
 */

import { readFileSync } from "fs";
import { join } from "path";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { supabaseKeys } from "@/lib/env";

function getLogoDataUri() {
  try {
    const buf = readFileSync(join(process.cwd(), "public", "logo192.png"));
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch { return ""; }
}

const BRAND = {
  indigo:      "#6366f1",
  indigoDark:  "#4338ca",
  nebula:      "#a855f7",
  emerald:     "#10b981",
  amber:       "#f59e0b",
  rose:        "#ef4444",
  starlight:   "#f8fafc",
  slateText:   "#1e293b",
  slateSubtle: "#64748b",
  border:      "#e2e8f0",
};

const GRADE_BANDS = [
  { label: "Exceptional",   min: 85, color: "#10b981", bg: "#ecfdf5" },
  { label: "Ready",         min: 70, color: "#22c55e", bg: "#f0fdf4" },
  { label: "Developing",    min: 50, color: "#f59e0b", bg: "#fffbeb" },
  { label: "Needs Support", min: 0,  color: "#ef4444", bg: "#fff5f5" },
];

function gradeBand(score) {
  return GRADE_BANDS.find(b => score >= b.min) ?? GRADE_BANDS[3];
}

function progressBar(pct, color, h = "8px") {
  const w = Math.min(100, Math.max(0, pct));
  return `
    <div style="height:${h};background:#e2e8f0;border-radius:99px;overflow:hidden;">
      <div style="height:100%;width:${w}%;background:${color};border-radius:99px;"></div>
    </div>`;
}

function subjectLabel(s) {
  const MAP = { mathematics: "Maths", english: "English", english_language: "English",
    science: "Science", biology: "Biology", chemistry: "Chemistry",
    physics: "Physics", history: "History", geography: "Geography", computing: "Computing" };
  return MAP[s] || (s || "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function topicLabel(slug) {
  return (slug || "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function termFromDate(d) {
  const m = d.getMonth() + 1;
  if (m >= 9 || m <= 1)  return "Autumn Term";
  if (m >= 2 && m <= 4)  return "Spring Term";
  return "Summer Term";
}

// ─── Stats fetcher ────────────────────────────────────────────────────────────
async function fetchScholarReport(supabase, scholarId) {
  const now = new Date();
  const termStartMonths = { 9: 9, 10: 9, 11: 9, 12: 9, 1: 9, 2: 2, 3: 2, 4: 2, 5: 5, 6: 5, 7: 5, 8: 5 };
  const m = now.getMonth() + 1;
  const termStartMonth = termStartMonths[m];
  const year = now.getFullYear() - (termStartMonth > m ? 1 : 0);
  const termStart = new Date(year, termStartMonth - 1, 1).toISOString();

  const [
    scholarRes,
    masteryRes,
    snapshotRes,
    activityRes,
    quizRes,
    streakRes,
  ] = await Promise.all([
    supabase.from("scholars").select("name, year_level, curriculum, avatar").eq("id", scholarId).single(),
    supabase.from("scholar_topic_mastery").select("subject, topic_slug, p_mastery, stability").eq("scholar_id", scholarId),
    supabase.from("scholar_readiness_snapshot").select("overall_score, snapshot_date").eq("scholar_id", scholarId).order("snapshot_date", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("exam_answers").select("created_at").eq("scholar_id", scholarId).gte("created_at", termStart),
    supabase.from("quiz_results").select("score, questions_total, accuracy, subject, topics, created_at").eq("scholar_id", scholarId).gte("created_at", termStart).order("created_at", { ascending: false }),
    supabase.from("quiz_results").select("created_at").eq("scholar_id", scholarId).order("created_at", { ascending: false }).limit(30),
  ]);

  const scholar = scholarRes.data;
  if (!scholar) throw new Error("Scholar not found");

  const topics = masteryRes.data || [];
  const quizzes = quizRes.data || [];
  const sessions = activityRes.data || [];

  // Per-subject mastery
  const bySubject = {};
  topics.forEach(({ subject, p_mastery }) => {
    if (!bySubject[subject]) bySubject[subject] = { sum: 0, count: 0 };
    bySubject[subject].sum += (p_mastery ?? 0);
    bySubject[subject].count++;
  });
  const subjectMastery = Object.entries(bySubject).map(([sub, v]) => ({
    subject: sub, avg: v.sum / v.count,
  })).sort((a, b) => b.avg - a.avg);

  // Overall mastery
  const avgMastery = topics.length
    ? topics.reduce((s, t) => s + (t.p_mastery ?? 0), 0) / topics.length : 0;

  // Topics mastered this term (p_mastery >= 0.8)
  const masteredTopics = topics.filter(t => (t.p_mastery ?? 0) >= 0.8);

  // Topic gaps (p_mastery < 0.4, sorted weakest first)
  const weakTopics = [...topics].filter(t => (t.p_mastery ?? 0) < 0.4)
    .sort((a, b) => (a.p_mastery ?? 0) - (b.p_mastery ?? 0)).slice(0, 6);

  // Streak (consecutive days with activity in the last 30 days)
  const allDates = (streakRes.data || []).map(r => new Date(r.created_at).toISOString().slice(0, 10));
  const dateSet = new Set(allDates);
  let streak = 0;
  for (let i = 0; i < 30; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    if (dateSet.has(d.toISOString().slice(0, 10))) streak++;
    else if (i > 0) break;
  }

  // Questions answered this term
  const questionsAnswered = quizzes.reduce((s, q) => s + (q.questions_total ?? 0), 0);
  const avgAccuracy = quizzes.length
    ? quizzes.reduce((s, q) => s + (q.accuracy ?? 0), 0) / quizzes.length : 0;

  // Study sessions (quiz results this term)
  const studySessions = quizzes.length;

  return {
    scholar,
    avgMastery,
    subjectMastery,
    masteredTopics,
    weakTopics,
    readinessScore: snapshotRes.data?.overall_score ?? null,
    streak,
    questionsAnswered,
    avgAccuracy,
    studySessions,
    termLabel: termFromDate(now),
    year: now.getFullYear(),
  };
}

// ─── HTML builder ─────────────────────────────────────────────────────────────
function buildHTML(data, logoUri) {
  const { scholar, avgMastery, subjectMastery, masteredTopics, weakTopics,
    readinessScore, streak, questionsAnswered, avgAccuracy, studySessions,
    termLabel, year } = data;

  const band = readinessScore != null ? gradeBand(readinessScore) : null;
  const masteryPct = Math.round(avgMastery * 100);
  const accPct = Math.round(avgAccuracy);
  const readScore = readinessScore != null ? Math.round(readinessScore) : "—";

  // Motivational headline
  let headline = "Keep up the great work!";
  if (masteryPct >= 75) headline = "Outstanding progress this term! 🚀";
  else if (masteryPct >= 55) headline = "Solid progress — keep the momentum! ⭐";
  else if (masteryPct >= 35) headline = "Good effort — let's push higher next term! 💪";
  else headline = "Every session counts — consistency is key! 🌟";

  const subjectRows = subjectMastery.map(({ subject, avg }) => {
    const pct = Math.round(avg * 100);
    const col = avg >= 0.8 ? BRAND.emerald : avg >= 0.55 ? BRAND.indigo : avg >= 0.3 ? BRAND.amber : BRAND.rose;
    return `
      <tr>
        <td style="padding:10px 12px;font-weight:700;color:${BRAND.slateText};font-size:13px;">${subjectLabel(subject)}</td>
        <td style="padding:10px 12px;width:55%;">${progressBar(pct, col, "10px")}</td>
        <td style="padding:10px 12px;font-weight:900;font-size:13px;color:${col};text-align:right;">${pct}%</td>
      </tr>`;
  }).join("");

  const weakRows = weakTopics.length
    ? weakTopics.map(({ topic_slug, subject, p_mastery }) => {
        const pct = Math.round((p_mastery ?? 0) * 100);
        return `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid ${BRAND.border};">
          <div>
            <div style="font-weight:700;font-size:13px;color:${BRAND.slateText};">${topicLabel(topic_slug)}</div>
            <div style="font-size:11px;color:${BRAND.slateSubtle};">${subjectLabel(subject)}</div>
          </div>
          <span style="background:#fff5f5;color:${BRAND.rose};font-weight:900;font-size:12px;padding:3px 10px;border-radius:99px;border:1px solid #fecaca;">${pct}%</span>
        </div>`;
      }).join("")
    : `<p style="color:${BRAND.slateSubtle};font-size:13px;font-style:italic;margin:0;">No topic gaps detected — impressive!</p>`;

  const masteredChips = masteredTopics.length
    ? masteredTopics.slice(0, 12).map(t =>
        `<span style="background:#ecfdf5;color:#065f46;font-size:11px;font-weight:700;padding:4px 10px;border-radius:99px;border:1px solid #6ee7b7;">✓ ${topicLabel(t.topic_slug)}</span>`
      ).join(" ")
    : `<span style="color:${BRAND.slateSubtle};font-size:13px;font-style:italic;">Topics mastered this term will appear here.</span>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${scholar.name} — ${termLabel} ${year} Progress Report</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f1f5f9; color: ${BRAND.slateText}; }
  .page { max-width: 800px; margin: 32px auto; padding: 0 16px; }
  table { width: 100%; border-collapse: collapse; }
  @media print {
    body { background: #fff; }
    .page { margin: 0; padding: 0; }
    .no-print { display: none !important; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,${BRAND.indigo},${BRAND.nebula});border-radius:20px;padding:32px;text-align:center;margin-bottom:24px;color:#fff;">
    ${logoUri ? `<img src="${logoUri}" alt="LaunchPard" style="height:48px;width:48px;border-radius:12px;margin-bottom:16px;display:block;margin-left:auto;margin-right:auto;">` : ""}
    <h1 style="font-size:28px;font-weight:900;margin-bottom:4px;">🚀 ${scholar.name}</h1>
    <p style="font-size:16px;font-weight:700;opacity:0.85;margin-bottom:4px;">${termLabel} ${year} Progress Report</p>
    <p style="font-size:13px;opacity:0.7;">${(scholar.curriculum || "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())} · Year ${scholar.year_level || "—"}</p>
  </div>

  <!-- Headline message -->
  <div style="background:#fff;border-radius:16px;padding:20px 24px;margin-bottom:24px;border-left:5px solid ${BRAND.indigo};box-shadow:0 1px 4px rgba(0,0,0,0.06);">
    <p style="font-size:15px;font-weight:700;color:${BRAND.slateText};">${headline}</p>
    <p style="font-size:13px;color:${BRAND.slateSubtle};margin-top:4px;">Generated by LaunchPard · ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
  </div>

  <!-- KPI cards -->
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:24px;">
    ${[
      { label: "Overall Mastery", value: `${masteryPct}%`, color: masteryPct >= 70 ? BRAND.emerald : masteryPct >= 45 ? BRAND.indigo : BRAND.amber },
      { label: "Readiness Score", value: `${readScore}${band ? ` · ${band.label}` : ""}`, color: band?.color ?? BRAND.slateSubtle },
      { label: "Questions Answered", value: questionsAnswered.toLocaleString(), color: BRAND.indigo },
      { label: "Study Sessions", value: studySessions.toLocaleString(), color: BRAND.nebula },
      { label: "Day Streak", value: `${streak} 🔥`, color: "#f59e0b" },
      { label: "Avg. Accuracy", value: `${accPct}%`, color: accPct >= 70 ? BRAND.emerald : BRAND.amber },
    ].map(({ label, value, color }) => `
      <div style="background:#fff;border-radius:16px;padding:16px;text-align:center;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
        <p style="font-size:22px;font-weight:900;color:${color};">${value}</p>
        <p style="font-size:11px;color:${BRAND.slateSubtle};font-weight:700;margin-top:4px;text-transform:uppercase;letter-spacing:0.05em;">${label}</p>
      </div>`).join("")}
  </div>

  <!-- Subject breakdown -->
  ${subjectMastery.length ? `
  <div style="background:#fff;border-radius:16px;padding:24px;margin-bottom:24px;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
    <h2 style="font-size:15px;font-weight:900;color:${BRAND.slateText};margin-bottom:16px;text-transform:uppercase;letter-spacing:0.08em;">📚 Subject Performance</h2>
    <table><tbody>${subjectRows}</tbody></table>
  </div>` : ""}

  <!-- Topics mastered this term -->
  <div style="background:#fff;border-radius:16px;padding:24px;margin-bottom:24px;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
    <h2 style="font-size:15px;font-weight:900;color:${BRAND.slateText};margin-bottom:4px;text-transform:uppercase;letter-spacing:0.08em;">🏆 Topics Mastered</h2>
    <p style="font-size:12px;color:${BRAND.slateSubtle};margin-bottom:14px;">${masteredTopics.length} topic${masteredTopics.length !== 1 ? "s" : ""} at 80%+ mastery</p>
    <div style="display:flex;flex-wrap:wrap;gap:8px;">${masteredChips}</div>
  </div>

  <!-- Focus areas -->
  ${weakTopics.length ? `
  <div style="background:#fff;border-radius:16px;padding:24px;margin-bottom:24px;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
    <h2 style="font-size:15px;font-weight:900;color:${BRAND.slateText};margin-bottom:4px;text-transform:uppercase;letter-spacing:0.08em;">🎯 Focus Areas for Next Term</h2>
    <p style="font-size:12px;color:${BRAND.slateSubtle};margin-bottom:14px;">Topics to practise most</p>
    ${weakRows}
  </div>` : ""}

  <!-- Footer -->
  <div style="text-align:center;padding:24px 0;color:${BRAND.slateSubtle};font-size:12px;">
    <p style="font-weight:700;">LaunchPard · AI-Powered Learning for Every Scholar</p>
    <p style="margin-top:4px;">This report is generated automatically from ${scholar.name}'s learning activity.</p>
    <p style="margin-top:4px;">Questions? Visit <strong>launchpard.com</strong></p>
  </div>

</div>
</body>
</html>`;
}

// ─── Route handler ────────────────────────────────────────────────────────────
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const scholarId = searchParams.get("scholarId");
    if (!scholarId) return NextResponse.json({ error: "scholarId required" }, { status: 400 });

    const cookieStore = await cookies();
    const supabase = createServerClient(
      supabaseKeys.url(), supabaseKeys.publishable(),
      { cookies: { getAll: () => cookieStore.getAll() } }
    );

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    // Confirm caller is the parent of this scholar
    const { data: scholar } = await supabase
      .from("scholars")
      .select("id, name, parent_id")
      .eq("id", scholarId)
      .single();

    if (!scholar) return NextResponse.json({ error: "Scholar not found" }, { status: 404 });

    const { data: parent } = await supabase
      .from("parents")
      .select("id")
      .eq("user_id", session.user.id)
      .single();

    if (!parent || scholar.parent_id !== parent.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const data = await fetchScholarReport(supabase, scholarId);
    const logoUri = getLogoDataUri();
    const html = buildHTML(data, logoUri);

    const safeName = (scholar.name || "Scholar").replace(/[^a-z0-9]/gi, "_");
    const filename = `${safeName}_${data.termLabel.replace(/ /g, "_")}_${data.year}_Report.html`;

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("[parent/termly-report]", e);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
