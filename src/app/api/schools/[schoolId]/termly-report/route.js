/**
 * GET /api/schools/[schoolId]/termly-report
 *
 * Returns a self-contained, LaunchPard-branded HTML termly progress report
 * for the whole school. Download as .html — printable to PDF via browser
 * print dialog. Zero external PDF dependencies.
 *
 * Auth: school proprietor or admin only.
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { getServiceRoleClient } from "@/lib/security/serviceRole";
import { supabaseKeys } from "@/lib/env";
import { computeSchoolReadiness } from "@/lib/analyticsEngine";

function getLogoDataUri() {
  try {
    const buf = readFileSync(join(process.cwd(), "public", "logo192.png"));
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    return ""; // graceful fallback
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

function getTerm() {
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
  .page { max-width: 960px; margin: 0 auto; background: #fff; }
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
  .logo-block  { display: inline-flex; align-items: center; gap: 11px; margin-bottom: 14px; }
  .logo-img    { width: 42px; height: 42px; border-radius: 8px; }
  .logo-text   { font-size: 24px; font-weight: 800; letter-spacing: -0.5px;
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
  .body { padding: 24px 40px 40px; }

  /* ── Section header ── */
  .section-header {
    display: flex; align-items: center; gap: 8px;
    font-size: 10px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.1em; color: ${BRAND.slateSubtle};
    margin: 26px 0 14px; padding-bottom: 6px;
    border-bottom: 1px solid ${BRAND.border};
  }
  .section-header::before {
    content: '';
    display: inline-block; width: 3px; height: 14px;
    background: ${BRAND.indigo}; border-radius: 2px; flex-shrink: 0;
  }

  /* ── KPI Cards ── */
  .kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
  .kpi-card {
    border: 1px solid ${BRAND.border}; border-radius: 10px;
    padding: 16px 18px; background: #fff; position: relative; overflow: hidden;
  }
  .kpi-card::after {
    content: ''; position: absolute; bottom: 0; left: 0; right: 0;
    height: 3px; background: var(--kpi-color);
  }
  .kpi-val   { font-size: 34px; font-weight: 800; line-height: 1; color: var(--kpi-color); }
  .kpi-label { font-size: 10px; font-weight: 700; text-transform: uppercase;
               letter-spacing: 0.06em; color: ${BRAND.slateSubtle}; margin-top: 6px; }
  .kpi-sub   { font-size: 11px; color: var(--kpi-color); font-weight: 600; margin-top: 3px; }
  .kpi-bar   { margin-top: 8px; }

  /* ── Placement banner ── */
  .placement-banner {
    border-radius: 10px; padding: 18px 24px; margin: 4px 0 6px;
    display: flex; align-items: center; gap: 20px;
    background: linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%);
    border: 1px solid ${BRAND.indigo}30;
  }
  .placement-pct   { font-size: 52px; font-weight: 800; color: ${BRAND.indigo};
                     line-height: 1; flex-shrink: 0; font-variant-numeric: tabular-nums; }
  .placement-label { font-size: 13px; font-weight: 700; color: ${BRAND.indigoDark}; }
  .placement-desc  { font-size: 12px; color: #4338ca99; margin-top: 4px; line-height: 1.55; }

  /* ── Grade distribution ── */
  .dist-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
  .dist-row  { display: flex; align-items: center; gap: 10px; }
  .dist-dot  { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .dist-name { font-size: 12px; color: ${BRAND.slateText}; width: 115px; flex-shrink: 0; }
  .dist-bar-wrap { flex: 1; }
  .dist-count { font-size: 12px; font-weight: 700; width: 24px; text-align: right; }
  .dist-pct   { font-size: 11px; color: ${BRAND.slateSubtle}; width: 34px; }

  /* ── Subject averages ── */
  .subj-row  { display: flex; align-items: center; gap: 12px; margin-bottom: 9px; }
  .subj-name { width: 200px; font-size: 12px; color: ${BRAND.slateText}; flex-shrink: 0; }
  .subj-bar  { flex: 1; }
  .subj-score { font-size: 12px; font-weight: 700; width: 42px; text-align: right; }

  /* ── Classes table ── */
  .class-table { width: 100%; border-collapse: collapse; font-size: 12px; }
  .class-table thead th {
    text-align: left; font-size: 10px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.06em;
    color: ${BRAND.slateSubtle}; padding: 8px 10px 6px;
    border-bottom: 2px solid ${BRAND.border}; white-space: nowrap;
  }
  .class-table tbody td {
    padding: 8px 10px; border-bottom: 1px solid #f1f5f9; vertical-align: middle;
  }
  .class-table tbody tr:last-child td { border-bottom: none; }
  .class-table tbody tr:hover td { background: #fafbff; }
  .class-name-cell { font-weight: 600; color: ${BRAND.slateText}; }
  .band-pill {
    display: inline-flex; align-items: center; padding: 2px 9px;
    border-radius: 99px; font-size: 10px; font-weight: 700; white-space: nowrap;
  }
  .bar-td { min-width: 100px; }
  .num-cell { text-align: center; }

  /* ── Weakness chips ── */
  .chip-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 9px; }
  .chip {
    border: 1px solid #fecaca; border-left: 3px solid #ef4444; border-radius: 7px;
    padding: 10px 12px; background: #fff5f5;
  }
  .chip-name { font-size: 12px; font-weight: 600; color: ${BRAND.slateText};
               display: flex; justify-content: space-between; align-items: center; }
  .chip-pct  { font-size: 14px; font-weight: 800; color: #ef4444; }
  .chip-meta { font-size: 11px; color: ${BRAND.slateSubtle}; margin-top: 3px; }

  /* ── Footer ── */
  .footer {
    margin-top: 36px; padding: 16px 40px; border-top: 1px solid ${BRAND.border};
    display: flex; justify-content: space-between; align-items: center;
    font-size: 10.5px; color: ${BRAND.slateSubtle};
  }
  .footer-brand { font-weight: 700; color: ${BRAND.indigo}; }

  .no-break { page-break-inside: avoid; }
`;

export async function GET(request, { params }) {
  const { schoolId } = await params;

  try {
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

    // ── Authorise: proprietor / admin only ────────────────────────────────────
    const { data: roleRow } = await svc
      .from("school_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("school_id", schoolId)
      .in("role", ["proprietor", "admin"])
      .maybeSingle();

    if (!roleRow) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ── School metadata ───────────────────────────────────────────────────────
    const { data: schoolRow } = await svc
      .from("schools")
      .select("name, address, curriculum")
      .eq("id", schoolId)
      .maybeSingle();

    const schoolName  = schoolRow?.name ?? "Your School";
    const term        = getTerm();
    const reportDate  = new Date().toLocaleDateString("en-GB", {
      day: "numeric", month: "long", year: "numeric",
    });
    const logoDataUri = getLogoDataUri();

    // ── Core analytics ─────────────────────────────────────────────────────────
    const readiness = await computeSchoolReadiness(schoolId, svc);

    const {
      schoolAverage       = 0,
      totalScholars       = 0,
      classes             = [],
      placementPrediction = 0,
      subjectAverages     = {},
    } = readiness;

    const schoolBand    = gradeBand(schoolAverage);
    const classesSorted = [...classes].sort((a, b) => b.avgReadiness - a.avgReadiness);

    // Aggregate grade distribution across all classes
    const totalDist = { Exceptional: 0, Ready: 0, Developing: 0, "Needs Support": 0 };
    for (const cls of classes) {
      const d = cls.gradeDistribution ?? {};
      for (const key of Object.keys(totalDist)) {
        totalDist[key] += d[key] ?? 0;
      }
    }

    const distOrder    = ["Exceptional", "Ready", "Developing", "Needs Support"];
    const subjectEntries = Object.entries(subjectAverages).sort((a, b) => b[1] - a[1]);

    // Collect all weaknesses across classes (deduplicated, worst first)
    const weaknessMap = {};
    for (const cls of classes) {
      for (const w of cls.topicWeaknesses ?? []) {
        const key = `${w.subject}_${w.topic}`;
        if (!weaknessMap[key]) {
          weaknessMap[key] = { ...w, classes: 1 };
        } else {
          if (w.avgMastery < weaknessMap[key].avgMastery) {
            weaknessMap[key] = { ...weaknessMap[key], avgMastery: w.avgMastery };
          }
          weaknessMap[key].classes += 1;
        }
      }
    }
    const allWeaknesses = Object.values(weaknessMap)
      .sort((a, b) => a.avgMastery - b.avgMastery)
      .slice(0, 8);

    const readyCount = (totalDist["Exceptional"] ?? 0) + (totalDist["Ready"] ?? 0);
    const readyPct   = totalScholars > 0 ? Math.round((readyCount / totalScholars) * 100) : 0;

    // Placement narrative
    const placementNarrative = placementPrediction >= 75
      ? `${schoolName} is performing strongly above average. The current cohort is well positioned for secondary entrance examinations.`
      : placementPrediction >= 55
        ? `The cohort is developing well. Targeted support in the identified focus areas should improve placement outcomes before examinations.`
        : `The cohort would benefit from intensive support in key subjects. Prioritise the focus areas below to raise readiness scores before examinations.`;

    // ── HTML ──────────────────────────────────────────────────────────────────
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${schoolName} — ${term} Report — ${reportDate}</title>
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
        ${logoDataUri ? `<img class="logo-img" src="${logoDataUri}" alt="LaunchPard" />` : ""}
        <span class="logo-text">LaunchPard</span>
      </div>
      <div class="report-title">${schoolName}</div>
      <div class="report-meta">
        ${term} · ${reportDate}
        ${schoolRow?.address ? ` · ${schoolRow.address}` : ""}<br/>
        ${totalScholars} scholars · ${classes.length} class${classes.length !== 1 ? "es" : ""}
      </div>
      <div class="report-badge">Termly Progress Report</div>
    </div>
  </header>

  <!-- Body -->
  <div class="body">

    <!-- KPI Cards -->
    <div class="kpi-row no-break">
      <div class="kpi-card" style="--kpi-color:${schoolBand.color};">
        <div class="kpi-val">${schoolAverage}%</div>
        <div class="kpi-label">School Average</div>
        <div class="kpi-sub">${schoolBand.label}</div>
        <div class="kpi-bar">${progressBar(schoolAverage, schoolBand.color)}</div>
      </div>
      <div class="kpi-card" style="--kpi-color:#10b981;">
        <div class="kpi-val">${readyPct}%</div>
        <div class="kpi-label">On / Above Target</div>
        <div class="kpi-sub">${readyCount} of ${totalScholars} scholars</div>
        <div class="kpi-bar">${progressBar(readyPct, "#10b981")}</div>
      </div>
      <div class="kpi-card" style="--kpi-color:${BRAND.indigo};">
        <div class="kpi-val">${totalScholars}</div>
        <div class="kpi-label">Total Scholars</div>
        <div class="kpi-sub">${classes.length} class${classes.length !== 1 ? "es" : ""}</div>
      </div>
      <div class="kpi-card" style="--kpi-color:${BRAND.nebula};">
        <div class="kpi-val">${placementPrediction}%</div>
        <div class="kpi-label">Placement Probability</div>
        <div class="kpi-sub">Est. secondary entry rate</div>
        <div class="kpi-bar">${progressBar(placementPrediction, BRAND.nebula)}</div>
      </div>
    </div>

    <!-- Placement banner -->
    ${placementPrediction > 0 ? `
    <div class="placement-banner no-break">
      <div class="placement-pct">${placementPrediction}%</div>
      <div>
        <div class="placement-label">Estimated Secondary Placement Rate</div>
        <div class="placement-desc">${placementNarrative}</div>
      </div>
    </div>` : ""}

    <!-- Grade Distribution -->
    <div class="no-break">
      <div class="section-header">Grade Distribution — All Classes</div>
      <div class="dist-grid">
        ${distOrder.map((g) => {
          const b   = GRADE_BANDS.find((x) => x.label === g) ?? GRADE_BANDS[3];
          const n   = totalDist[g] ?? 0;
          const pct = totalScholars > 0 ? Math.round((n / totalScholars) * 100) : 0;
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

    ${subjectEntries.length ? `
    <!-- Subject Performance -->
    <div class="no-break">
      <div class="section-header">Subject Performance — School-Wide Averages</div>
      ${subjectEntries.map(([subj, avg]) => {
        const b = gradeBand(avg);
        return `<div class="subj-row">
          <div class="subj-name">${subjectLabel(subj)}</div>
          <div class="subj-bar">${progressBar(avg, b.color, "10px")}</div>
          <div class="subj-score" style="color:${b.color};">${avg}%</div>
        </div>`;
      }).join("")}
    </div>` : ""}

    <!-- Per-class breakdown -->
    <div class="no-break">
      <div class="section-header">Class Breakdown — ${classes.length} Classes</div>
      <table class="class-table">
        <thead>
          <tr>
            <th>Class</th>
            <th>Year</th>
            <th class="num-cell">Scholars</th>
            <th style="min-width:120px;">Readiness</th>
            <th>Score</th>
            <th>Band</th>
            <th class="num-cell">% Ready</th>
            <th class="num-cell">Placement</th>
          </tr>
        </thead>
        <tbody>
          ${classesSorted.map((cls) => {
            const b = gradeBand(cls.avgReadiness);
            return `<tr>
              <td class="class-name-cell">${cls.name}</td>
              <td style="color:${BRAND.slateSubtle};">${cls.year_level ? `Y${cls.year_level}` : "—"}</td>
              <td class="num-cell">${cls.scholarCount}</td>
              <td class="bar-td">${progressBar(cls.avgReadiness, b.color, "7px")}</td>
              <td style="font-weight:700;color:${b.color};">${cls.avgReadiness}%</td>
              <td>
                <span class="band-pill" style="background:${b.color}18;color:${b.color};">${b.label}</span>
              </td>
              <td class="num-cell">${cls.percentReady ?? 0}%</td>
              <td class="num-cell" style="color:${BRAND.nebula};font-weight:700;">${cls.placementPrediction ?? 0}%</td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>

    ${allWeaknesses.length ? `
    <!-- School-Wide Focus Areas -->
    <div class="no-break">
      <div class="section-header">School-Wide Focus Areas <span style="font-weight:400;text-transform:none;letter-spacing:0;">(topics requiring most attention)</span></div>
      <div class="chip-grid">
        ${allWeaknesses.map((w) => `
          <div class="chip">
            <div class="chip-name">
              ${topicLabel(w.displayName || w.topic)}
              <span class="chip-pct">${w.avgMastery}%</span>
            </div>
            <div class="chip-meta">${subjectLabel(w.subject)}${w.classes > 1 ? ` · ${w.classes} classes affected` : ""}</div>
          </div>`).join("")}
      </div>
    </div>` : ""}

  </div><!-- /body -->

  <!-- Footer -->
  <footer class="footer">
    <div><span class="footer-brand">LaunchPard</span> · AI-Powered Learning for Every Scholar · launchpard.com</div>
    <div>${term} · ${reportDate} · Confidential — for educational use only</div>
  </footer>

</div><!-- /page -->
</body>
</html>`;

    const safeName = schoolName.replace(/\s+/g, "_");
    const termSafe = term.replace(/\s+/g, "_");
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeName}_${termSafe}_Report.html"`,
      },
    });
  } catch (err) {
    console.error("[termly-report]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
