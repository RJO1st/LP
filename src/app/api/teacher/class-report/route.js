/**
 * GET /api/teacher/class-report?classId=
 *
 * Returns a self-contained, LaunchPard-branded HTML class progress report.
 * Download as .html — printable to PDF via browser print dialog.
 * Zero external PDF dependencies.
 *
 * Auth: teacher assigned to class OR school proprietor/admin.
 */

import { readFileSync } from "fs";
import { join } from "path";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getServiceRoleClient } from "@/lib/security/serviceRole";
import { supabaseKeys } from "@/lib/env";
import { computeClassReadiness } from "@/lib/analyticsEngine";

// ─── Logo (embedded so the downloaded HTML is self-contained) ─────────────────
function getLogoDataUri() {
  try {
    const buf = readFileSync(join(process.cwd(), "public", "logo192.png"));
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    return ""; // graceful fallback — img will just be broken
  }
}

// ─── Brand tokens ────────────────────────────────────────────────────────────
const BRAND = {
  indigo:      "#6366f1",
  indigoDark:  "#4338ca",
  nebula:      "#a855f7",
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
  return GRADE_BANDS.find((b) => score >= b.min) ?? GRADE_BANDS[3];
}

function progressBar(pct, color, h = "8px") {
  const w = Math.min(100, Math.max(0, pct));
  return `
    <div style="height:${h};background:#e2e8f0;border-radius:99px;overflow:hidden;position:relative;">
      <div style="position:absolute;inset:0;width:${w}%;background:${color};border-radius:99px;"></div>
    </div>`;
}

function topicLabel(slug) {
  return (slug || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function subjectLabel(s) {
  const MAP = {
    mathematics: "Mathematics", english: "English", english_language: "English Language",
    english_literature: "English Literature", science: "Science", basic_science: "Basic Science",
    verbal_reasoning: "Verbal Reasoning", non_verbal_reasoning: "Non-Verbal Reasoning",
    social_studies: "Social Studies", biology: "Biology", chemistry: "Chemistry", physics: "Physics",
  };
  return MAP[s] ?? topicLabel(s);
}

function currentTerm() {
  const m = new Date().getMonth() + 1;
  if (m >= 9) return "Autumn Term";
  if (m >= 5) return "Summer Term";
  return "Spring Term";
}

const CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, -apple-system, 'Segoe UI', Arial, sans-serif;
         color: ${BRAND.slateText}; background: ${BRAND.starlight}; font-size: 13.5px;
         line-height: 1.5; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

  /* ── Page wrapper ── */
  .page { max-width: 920px; margin: 0 auto; background: #fff; }
  @media print {
    body { background: #fff; }
    .page { max-width: 100%; }
    .page-break { page-break-before: always; }
    .no-break { page-break-inside: avoid; }
  }
  @media screen { .page { box-shadow: 0 2px 24px rgba(0,0,0,.09); } }

  /* ── Brand bar ── */
  .brand-bar {
    height: 6px;
    background: linear-gradient(90deg, ${BRAND.indigo} 0%, ${BRAND.nebula} 100%);
  }

  /* ── Header ── */
  .header {
    padding: 30px 36px 26px;
    text-align: center;
    border-bottom: 1.5px solid ${BRAND.border};
  }
  .logo-block { display: inline-flex; align-items: center; gap: 11px; margin-bottom: 14px; }
  .logo-img   { width: 42px; height: 42px; border-radius: 8px; }
  .logo-text  { font-size: 24px; font-weight: 800; letter-spacing: -0.5px;
                background: linear-gradient(135deg, ${BRAND.indigo}, ${BRAND.nebula});
                -webkit-background-clip: text; -webkit-text-fill-color: transparent;
                background-clip: text; color: transparent; }
  .report-title { font-size: 22px; font-weight: 800; color: ${BRAND.slateText}; }
  .report-meta  { font-size: 12px; color: ${BRAND.slateSubtle}; margin-top: 4px; line-height: 1.8; }
  .report-badge {
    display: inline-block; margin-top: 8px;
    padding: 3px 12px; border-radius: 99px; font-size: 11px; font-weight: 700;
    background: ${BRAND.indigo}18; color: ${BRAND.indigo}; border: 1px solid ${BRAND.indigo}40;
  }

  /* ── Content body ── */
  .body { padding: 24px 36px 36px; }

  /* ── Section header ── */
  .section-header {
    display: flex; align-items: center; gap: 8px;
    font-size: 10px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.1em; color: ${BRAND.slateSubtle};
    margin: 24px 0 12px; padding-bottom: 6px;
    border-bottom: 1px solid ${BRAND.border};
  }
  .section-header::before {
    content: '';
    display: inline-block; width: 3px; height: 14px;
    background: ${BRAND.indigo}; border-radius: 2px;
  }

  /* ── KPI Cards ── */
  .kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
  .kpi-card {
    border: 1px solid ${BRAND.border}; border-radius: 10px;
    padding: 16px 18px; background: #fff; position: relative; overflow: hidden;
  }
  .kpi-card::after {
    content: ''; position: absolute; bottom: 0; left: 0; right: 0;
    height: 3px; background: var(--kpi-color);
  }
  .kpi-val { font-size: 34px; font-weight: 800; line-height: 1; color: var(--kpi-color); }
  .kpi-label { font-size: 10px; font-weight: 700; text-transform: uppercase;
               letter-spacing: 0.06em; color: ${BRAND.slateSubtle}; margin-top: 6px; }
  .kpi-sub { font-size: 11px; color: var(--kpi-color); font-weight: 600; margin-top: 3px; }
  .kpi-bar { margin-top: 8px; }

  /* ── Grade distribution ── */
  .dist-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .dist-row { display: flex; align-items: center; gap: 10px; }
  .dist-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .dist-name { font-size: 12px; color: ${BRAND.slateText}; width: 110px; flex-shrink: 0; }
  .dist-bar-wrap { flex: 1; }
  .dist-count { font-size: 12px; font-weight: 700; width: 24px; text-align: right; }
  .dist-pct { font-size: 11px; color: ${BRAND.slateSubtle}; width: 34px; }

  /* ── Placement banner ── */
  .placement-banner {
    border-radius: 10px; padding: 16px 20px; margin: 16px 0;
    display: flex; align-items: center; gap: 18px;
    background: linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%);
    border: 1px solid ${BRAND.indigo}30;
  }
  .placement-pct { font-size: 52px; font-weight: 800; color: ${BRAND.indigo};
                    line-height: 1; flex-shrink: 0; font-variant-numeric: tabular-nums; }
  .placement-label { font-size: 13px; font-weight: 700; color: ${BRAND.indigoDark}; }
  .placement-desc  { font-size: 12px; color: #4338ca99; margin-top: 3px; line-height: 1.5; }

  /* ── Topic weakness chips ── */
  .chip-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(195px, 1fr)); gap: 8px; }
  .chip {
    border: 1px solid #fecaca; border-left: 3px solid #ef4444; border-radius: 7px;
    padding: 9px 11px; background: #fff5f5;
  }
  .chip-name { font-size: 12px; font-weight: 600; color: ${BRAND.slateText};
               display: flex; justify-content: space-between; align-items: center; }
  .chip-pct  { font-size: 14px; font-weight: 800; color: #ef4444; }
  .chip-meta { font-size: 11px; color: ${BRAND.slateSubtle}; margin-top: 3px; }

  /* ── Student table ── */
  .student-table { width: 100%; border-collapse: collapse; font-size: 12px; }
  .student-table thead th {
    text-align: left; font-size: 10px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.06em;
    color: ${BRAND.slateSubtle}; padding: 8px 8px 6px;
    border-bottom: 2px solid ${BRAND.border};
    white-space: nowrap;
  }
  .student-table tbody td {
    padding: 7px 8px; border-bottom: 1px solid #f1f5f9; vertical-align: middle;
  }
  .student-table tbody tr:last-child td { border-bottom: none; }
  .student-table tbody tr:hover td { background: #fafbff; }
  .rank { font-size: 11px; color: ${BRAND.slateSubtle}; font-weight: 500; }
  .student-name { font-weight: 600; color: ${BRAND.slateText}; }
  .band-pill {
    display: inline-flex; align-items: center; padding: 2px 9px;
    border-radius: 99px; font-size: 10px; font-weight: 700;
    white-space: nowrap;
  }
  .subj-score { font-size: 11px; font-weight: 700; }
  .locked { color: #cbd5e1; font-size: 10px; }
  .bar-td { min-width: 90px; }

  /* ── NDPR note ── */
  .ndpr-note {
    margin-top: 10px; padding: 8px 12px; border-radius: 6px;
    background: #f0f9ff; border: 1px solid #bae6fd;
    font-size: 11px; color: #0369a1; display: flex; align-items: flex-start; gap: 6px;
  }

  /* ── Footer ── */
  .footer {
    margin-top: 36px; padding: 16px 36px; border-top: 1px solid ${BRAND.border};
    display: flex; justify-content: space-between; align-items: center;
    font-size: 10.5px; color: ${BRAND.slateSubtle};
  }
  .footer-brand { font-weight: 700; color: ${BRAND.indigo}; }

  .no-break { page-break-inside: avoid; }
`;

export async function GET(request) {
  const logoDataUri = getLogoDataUri();

  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("classId");
    if (!classId) {
      return NextResponse.json({ error: "classId required" }, { status: 400 });
    }

    // ── Auth ──────────────────────────────────────────────────────────────────
    const cookieStore = await cookies();
    const authClient = createServerClient(
      supabaseKeys.url(),
      supabaseKeys.publishable(),
      { cookies: { getAll: () => cookieStore.getAll() } }
    );
    const { data: { user }, error: authErr } = await authClient.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const svc = getServiceRoleClient();

    // ── Authorise ─────────────────────────────────────────────────────────────
    const [{ data: assignment }, { data: schoolRole }] = await Promise.all([
      svc.from("teacher_assignments").select("id").eq("teacher_id", user.id).eq("class_id", classId).maybeSingle(),
      svc.from("school_roles").select("role").eq("user_id", user.id).in("role", ["proprietor", "admin"]).maybeSingle(),
    ]);
    if (!assignment && !schoolRole) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ── Class + school metadata ───────────────────────────────────────────────
    const { data: cls } = await svc
      .from("classes")
      .select("name, year_level, curriculum, school_id, schools(name)")
      .eq("id", classId)
      .maybeSingle();

    const className  = cls?.name ?? "Class";
    const schoolName = cls?.schools?.name ?? "LaunchPard";
    const yearLevel  = cls?.year_level;
    const curriculum = (cls?.curriculum || "").toUpperCase().replace(/_/g, " ");

    // ── Core analytics ─────────────────────────────────────────────────────────
    const readiness = await computeClassReadiness(classId, svc);

    // Consent map
    const scholarIds = readiness.students.map((s) => s.scholarId);
    const { data: consentRows } = await svc
      .from("scholar_school_consent")
      .select("scholar_id, consent_given_at, revoked_at")
      .in("scholar_id", scholarIds);

    const consentMap = {};
    for (const r of consentRows ?? []) {
      if (r.consent_given_at && !r.revoked_at) consentMap[r.scholarId] = true;
    }
    const consentedCount = Object.keys(consentMap).length;

    const reportDate = new Date().toLocaleDateString("en-GB", {
      day: "numeric", month: "long", year: "numeric",
    });
    const term  = currentTerm();
    const total = readiness.students.length;
    const dist  = readiness.gradeDistribution ?? {};
    const classAvg  = readiness.classAverage ?? 0;
    const avgBand   = gradeBand(classAvg);
    const placement = readiness.placementPrediction ?? 0;

    const readyCount     = (dist["Exceptional"] ?? 0) + (dist["Ready"] ?? 0);
    const supportCount   = dist["Needs Support"] ?? 0;
    const readyPct       = total ? Math.round((readyCount / total) * 100) : 0;

    const studentsSorted = [...readiness.students].sort((a, b) => b.overallReadiness - a.overallReadiness);
    const allSubjects    = [...new Set(studentsSorted.flatMap((s) => Object.keys(s.subjectScores ?? {})))];
    const visibleSubjects = allSubjects.slice(0, 4);

    const distOrder = ["Exceptional", "Ready", "Developing", "Needs Support"];

    // Placement narrative
    const placementNarrative = placement >= 75
      ? "This class is performing strongly. The cohort is well positioned for secondary entrance."
      : placement >= 55
        ? "The cohort is developing well. Targeted support in focus areas below should improve placement outcomes."
        : "The cohort would benefit from intensive support in key topics before examinations.";

    // ── HTML ──────────────────────────────────────────────────────────────────
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${className} — Progress Report — ${reportDate}</title>
  <style>${CSS}</style>
</head>
<body>
<div class="page">

  <!-- Brand stripe -->
  <div class="brand-bar"></div>

  <!-- Header -->
  <header class="header">
    <div>
      <div class="logo-block">
        <img class="logo-img" src="${logoDataUri}" alt="LaunchPard" />
        <span class="logo-text">LaunchPard</span>
      </div>
      <div class="report-title">${className}</div>
      <div class="report-meta">
        ${schoolName}<br/>
        ${term} · ${reportDate}
        ${yearLevel ? ` · Year ${yearLevel}` : ""}
        ${curriculum ? ` · ${curriculum}` : ""}
      </div>
      <div class="report-badge">Class Progress Report</div>
    </div>
  </header>

  <!-- Body -->
  <div class="body">

    <!-- KPI Cards -->
    <div class="kpi-row no-break">
      <div class="kpi-card" style="--kpi-color:${avgBand.color};">
        <div class="kpi-val">${classAvg}%</div>
        <div class="kpi-label">Class Average</div>
        <div class="kpi-sub">${avgBand.label}</div>
        <div class="kpi-bar">${progressBar(classAvg, avgBand.color)}</div>
      </div>
      <div class="kpi-card" style="--kpi-color:#10b981;">
        <div class="kpi-val">${readyCount}</div>
        <div class="kpi-label">At / Above Target</div>
        <div class="kpi-sub">${readyPct}% of class</div>
        <div class="kpi-bar">${progressBar(readyPct, "#10b981")}</div>
      </div>
      <div class="kpi-card" style="--kpi-color:#ef4444;">
        <div class="kpi-val">${supportCount}</div>
        <div class="kpi-label">Need Support</div>
        <div class="kpi-sub">${total ? Math.round((supportCount / total) * 100) : 0}% of class</div>
        <div class="kpi-bar">${progressBar(total ? Math.round((supportCount / total) * 100) : 0, "#ef4444")}</div>
      </div>
      <div class="kpi-card" style="--kpi-color:${BRAND.indigo};">
        <div class="kpi-val">${placement}%</div>
        <div class="kpi-label">Placement Probability</div>
        <div class="kpi-sub">${total} students</div>
        <div class="kpi-bar">${progressBar(placement, BRAND.indigo)}</div>
      </div>
    </div>

    <!-- Placement banner -->
    ${placement > 0 ? `
    <div class="placement-banner no-break">
      <div class="placement-pct">${placement}%</div>
      <div>
        <div class="placement-label">Estimated Secondary Placement Rate</div>
        <div class="placement-desc">${placementNarrative}</div>
      </div>
    </div>` : ""}

    <!-- Grade Distribution -->
    <div class="no-break">
      <div class="section-header">Grade Distribution</div>
      <div class="dist-grid">
        ${distOrder.map((g) => {
          const b   = GRADE_BANDS.find((x) => x.label === g) ?? GRADE_BANDS[3];
          const n   = dist[g] ?? 0;
          const pct = total ? Math.round((n / total) * 100) : 0;
          return `
          <div class="dist-row">
            <div class="dist-dot" style="background:${b.color};"></div>
            <div class="dist-name">${g}</div>
            <div class="dist-bar-wrap">${progressBar(pct, b.color, "9px")}</div>
            <div class="dist-count">${n}</div>
            <div class="dist-pct">${pct}%</div>
          </div>`;
        }).join("")}
      </div>
    </div>

    ${readiness.topicWeaknesses?.length ? `
    <!-- Class Focus Areas -->
    <div class="no-break">
      <div class="section-header">Class Focus Areas <span style="font-weight:400;text-transform:none;letter-spacing:0;">(topics where students need most support)</span></div>
      <div class="chip-grid">
        ${readiness.topicWeaknesses.map((t) => `
          <div class="chip">
            <div class="chip-name">
              ${topicLabel(t.displayName || t.topic)}
              <span class="chip-pct">${t.avgMastery}%</span>
            </div>
            <div class="chip-meta">${subjectLabel(t.subject)}${t.pctStruggling ? ` · ${Math.round(t.pctStruggling)}% of class struggling` : ""}</div>
          </div>`).join("")}
      </div>
    </div>` : ""}

    <!-- Student Progress Table -->
    <div class="no-break">
      <div class="section-header">Student Progress — ${total} Students</div>
      <table class="student-table">
        <thead>
          <tr>
            <th style="width:28px;">#</th>
            <th>Student Name</th>
            <th style="width:110px;">Readiness</th>
            <th style="width:52px;">Score</th>
            <th style="width:100px;">Band</th>
            ${visibleSubjects.map((s) => `<th style="width:70px;">${subjectLabel(s)}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${studentsSorted.map((s, i) => {
            const b = gradeBand(s.overallReadiness);
            const hasConsent = consentMap[s.scholarId];
            return `
            <tr>
              <td class="rank">${i + 1}</td>
              <td class="student-name">${s.name ?? "—"}</td>
              <td class="bar-td">${progressBar(s.overallReadiness, b.color, "7px")}</td>
              <td style="font-weight:700;color:${b.color};">${s.overallReadiness}%</td>
              <td>
                <span class="band-pill" style="background:${b.color}18;color:${b.color};">
                  ${s.grade ?? b.label}
                </span>
              </td>
              ${visibleSubjects.map((subj) => {
                if (!hasConsent) return `<td class="locked" title="NDPR consent pending">—</td>`;
                const sc = s.subjectScores?.[subj];
                if (sc == null) return `<td class="locked">N/A</td>`;
                const sb = gradeBand(sc);
                return `<td><span class="subj-score" style="color:${sb.color};">${sc}%</span></td>`;
              }).join("")}
            </tr>`;
          }).join("")}
        </tbody>
      </table>
      ${consentedCount < total ? `
      <div class="ndpr-note">
        <span>ⓘ</span>
        <span>Subject scores are shown only where parents have granted NDPR data-processing consent.
          ${total - consentedCount} student${total - consentedCount !== 1 ? "s" : ""} have consent pending — contact their parents to unlock full subject breakdown.</span>
      </div>` : ""}
    </div>

  </div><!-- /body -->

  <!-- Footer -->
  <footer class="footer">
    <div><span class="footer-brand">LaunchPard</span> · AI-Powered Learning for Every Scholar · launchpard.com</div>
    <div>${term} Report · ${reportDate} · Confidential — for educational use only</div>
  </footer>

</div><!-- /page -->
</body>
</html>`;

    const safeName = className.replace(/\s+/g, "_");
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeName}_Progress_Report.html"`,
      },
    });
  } catch (err) {
    console.error("[class-report]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
