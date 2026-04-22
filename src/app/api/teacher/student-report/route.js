/**
 * GET /api/teacher/student-report?scholarId=&classId=
 *
 * Returns a self-contained HTML report for a single student.
 * Download as .html, printable to PDF via browser print dialog.
 * No external PDF dependencies — zero-dep approach.
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { supabaseKeys } from "@/lib/env";

const GRADE_BANDS = [
  { label: "Exceptional", min: 85, color: "#10b981" },
  { label: "Ready",       min: 70, color: "#22c55e" },
  { label: "Developing",  min: 50, color: "#f59e0b" },
  { label: "Needs Support", min: 0, color: "#ef4444" },
];

function gradeBand(score) {
  return GRADE_BANDS.find((b) => score >= b.min) || GRADE_BANDS[3];
}

function bar(pct, color) {
  return `<div style="height:8px;background:#e2e8f0;border-radius:4px;overflow:hidden;margin-top:4px;">
    <div style="height:100%;width:${pct}%;background:${color};border-radius:4px;"></div>
  </div>`;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const scholarId = searchParams.get("scholarId");
    const classId   = searchParams.get("classId");

    if (!scholarId) {
      return NextResponse.json({ error: "scholarId required" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      supabaseKeys.url(),
      supabaseKeys.publishable(),
      { cookies: { getAll: () => cookieStore.getAll() } }
    );

    // Auth
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    // Verify teacher access
    const { data: assignment } = await supabase
      .from("teacher_assignments")
      .select("id")
      .eq("teacher_id", session.user.id)
      .eq("class_id", classId)
      .single()
      .catch(() => ({ data: null }));

    const { data: schoolRole } = await supabase
      .from("school_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .single()
      .catch(() => ({ data: null }));

    if (!assignment && !["proprietor", "admin"].includes(schoolRole?.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch scholar
    const { data: scholar } = await supabase
      .from("scholars")
      .select("id, name, year_level, curriculum")
      .eq("id", scholarId)
      .single();

    if (!scholar) return NextResponse.json({ error: "Scholar not found" }, { status: 404 });

    // Fetch class name
    const { data: cls } = await supabase
      .from("classes")
      .select("name")
      .eq("id", classId)
      .single()
      .catch(() => ({ data: null }));

    // Fetch mastery data
    const { data: masteryRows } = await supabase
      .from("scholar_topic_mastery")
      .select("topic_slug, subject, p_mastery, stability, last_practiced_at")
      .eq("scholar_id", scholarId)
      .order("p_mastery", { ascending: false });

    // Fetch latest readiness snapshot
    const { data: snapshot } = await supabase
      .from("scholar_readiness_snapshot")
      .select("overall_score, maths_score, english_score, snapshot_date")
      .eq("scholar_id", scholarId)
      .order("snapshot_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Aggregate by subject
    const bySubject = {};
    (masteryRows || []).forEach((r) => {
      const subj = r.subject || "other";
      if (!bySubject[subj]) bySubject[subj] = { total: 0, count: 0 };
      bySubject[subj].total += r.p_mastery;
      bySubject[subj].count += 1;
    });

    const subjectRows = Object.entries(bySubject)
      .map(([subj, { total, count }]) => ({ subject: subj, avg: Math.round((total / count) * 100) }))
      .sort((a, b) => b.avg - a.avg);

    // Top strengths & gaps
    const sorted = [...(masteryRows || [])].sort((a, b) => b.p_mastery - a.p_mastery);
    const strengths = sorted.slice(0, 5);
    const gaps = sorted.slice(-5).reverse();

    const overall = snapshot?.overall_score ?? (
      subjectRows.length
        ? Math.round(subjectRows.reduce((s, r) => s + r.avg, 0) / subjectRows.length)
        : 0
    );
    const band = gradeBand(overall);
    const reportDate = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

    function topicLabel(slug) {
      return (slug || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${scholar.name} — LaunchPard Report — ${reportDate}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; color: #1e293b; background: #f8fafc; }
    .page { max-width: 820px; margin: 0 auto; background: #fff; padding: 40px; }
    @media print { body { background: #fff; } .page { padding: 24px; max-width: 100%; } }
    .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 28px; }
    .logo { font-size: 22px; font-weight: 800; color: #6366f1; }
    .meta { font-size: 13px; color: #64748b; text-align: right; line-height: 1.6; }
    .name { font-size: 28px; font-weight: 800; color: #0f172a; }
    .sub-meta { font-size: 14px; color: #64748b; margin-top: 4px; }
    .score-box { display: inline-flex; flex-direction: column; align-items: center; background: #f1f5f9; border-radius: 12px; padding: 20px 32px; margin: 20px 0; }
    .score-num { font-size: 56px; font-weight: 800; line-height: 1; }
    .score-band { font-size: 16px; font-weight: 600; margin-top: 4px; }
    h2 { font-size: 16px; font-weight: 700; color: #334155; margin-bottom: 12px; margin-top: 28px; border-left: 3px solid #6366f1; padding-left: 10px; }
    .subject-row { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
    .subject-name { font-size: 13px; color: #475569; width: 140px; flex-shrink: 0; }
    .bar-wrap { flex: 1; }
    .score-label { font-size: 13px; font-weight: 700; width: 40px; text-align: right; }
    .topic-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .topic-chip { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; font-size: 13px; }
    .topic-chip .pct { font-weight: 700; float: right; }
    .strength { border-left: 3px solid #10b981; }
    .gap { border-left: 3px solid #ef4444; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center; }
    .no-break { page-break-inside: avoid; }
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="logo">🚀 LaunchPard</div>
    <div class="meta">
      <strong>Learner Progress Report</strong><br/>
      ${reportDate}<br/>
      ${cls?.name ? `Class: ${cls.name}` : ""}
    </div>
  </div>

  <div class="name">${scholar.name}</div>
  <div class="sub-meta">
    Year ${scholar.year_level || "—"} &nbsp;·&nbsp;
    ${(scholar.curriculum || "").replace(/_/g, " ").toUpperCase()}
  </div>

  <div class="no-break">
    <h2>Overall Readiness</h2>
    <div class="score-box">
      <div class="score-num" style="color:${band.color};">${overall}%</div>
      <div class="score-band" style="color:${band.color};">${band.label}</div>
    </div>
  </div>

  ${subjectRows.length ? `
  <div class="no-break">
    <h2>Subject Breakdown</h2>
    ${subjectRows.map(({ subject, avg }) => {
      const b = gradeBand(avg);
      return `<div class="subject-row">
        <div class="subject-name">${topicLabel(subject)}</div>
        <div class="bar-wrap">${bar(avg, b.color)}</div>
        <div class="score-label" style="color:${b.color};">${avg}%</div>
      </div>`;
    }).join("")}
  </div>` : ""}

  ${strengths.length ? `
  <div class="no-break">
    <h2>Top Strengths</h2>
    <div class="topic-grid">
      ${strengths.map((r) => `
        <div class="topic-chip strength">
          ${topicLabel(r.topic_slug)}
          <span class="pct" style="color:#10b981;">${Math.round(r.p_mastery * 100)}%</span>
        </div>`).join("")}
    </div>
  </div>` : ""}

  ${gaps.length ? `
  <div class="no-break">
    <h2>Priority Focus Areas</h2>
    <div class="topic-grid">
      ${gaps.map((r) => `
        <div class="topic-chip gap">
          ${topicLabel(r.topic_slug)}
          <span class="pct" style="color:#ef4444;">${Math.round(r.p_mastery * 100)}%</span>
        </div>`).join("")}
    </div>
  </div>` : ""}

  <div class="footer">
    Generated by LaunchPard · AI-Powered Learning for Every Scholar · launchpard.com<br/>
    This report is for educational use. Scores reflect AI-computed mastery estimates.
  </div>
</div>
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="${scholar.name.replace(/\s+/g, "_")}_Report.html"`,
      },
    });
  } catch (err) {
    console.error("[student-report]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
