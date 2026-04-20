"use client";
// ─── Admin Growth Dashboard ──────────────────────────────────────────────────
// Comprehensive analytics dashboard for scaling LaunchPard.
// Route: /dashboard/admin
// Tabs: Growth · Engagement · Retention · Revenue · Content · Scholars · Schools
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";

function sb() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

const ADMIN_EMAILS = ["ogunwede.r@gmail.com", "admin@launchpard.com"];

// ── NG pricing constants ─────────────────────────────────────────────────────
const NG_PRICE = { ng_scholar: 2500, waec_boost: 1000, ai_unlimited: 500, family_child: 1000 };

// ── Styles ──────────────────────────────────────────────────────────────────
const S = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(145deg, #080c15 0%, #0f1629 40%, #0d1117 100%)",
    color: "#e2e8f0", fontFamily: "'DM Sans', 'Nunito', system-ui, sans-serif",
  },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)",
    position: "sticky", top: 0, zIndex: 50,
    background: "rgba(8,12,21,0.85)", backdropFilter: "blur(12px)",
  },
  nav: {
    display: "flex", gap: 4, padding: "10px 20px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    overflowX: "auto", WebkitOverflowScrolling: "touch",
  },
  navBtn: (active) => ({
    padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
    background: active ? "rgba(251,191,36,0.12)" : "transparent",
    color: active ? "#fbbf24" : "rgba(255,255,255,0.45)",
    border: active ? "1px solid rgba(251,191,36,0.2)" : "1px solid transparent",
    cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.2s",
  }),
  content: { padding: "16px 20px", maxWidth: 1200, margin: "0 auto" },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  card: {
    background: "rgba(255,255,255,0.025)", borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.06)", padding: "16px 18px",
    transition: "border-color 0.2s",
  },
  label: { fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.35)" },
  value: { fontSize: 26, fontWeight: 900, marginTop: 4, letterSpacing: "-0.02em" },
  sub: { fontSize: 11, marginTop: 4 },
  sectionTitle: { fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.6)", margin: "20px 0 10px" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  th: {
    textAlign: "left", padding: "8px 10px", fontWeight: 700, fontSize: 10,
    textTransform: "uppercase", letterSpacing: "0.1em",
    color: "rgba(255,255,255,0.3)", borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  td: { padding: "8px 10px", borderBottom: "1px solid rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.65)" },
  badge: (color) => ({
    display: "inline-block", padding: "2px 7px", borderRadius: 5, fontSize: 10, fontWeight: 700,
    background: `${color}15`, color, border: `1px solid ${color}25`,
  }),
  btn: {
    padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700,
    background: "rgba(251,191,36,0.1)", color: "#fbbf24",
    border: "1px solid rgba(251,191,36,0.2)", cursor: "pointer",
    display: "inline-flex", alignItems: "center", gap: 5,
  },
  empty: { textAlign: "center", padding: 40, color: "rgba(255,255,255,0.25)", fontSize: 13 },
  anomaly: {
    margin: "12px 0", padding: "10px 14px", borderRadius: 10,
    background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.2)",
    color: "#fbbf24", fontSize: 12, display: "flex", alignItems: "center", gap: 8,
  },
};

// ── Responsive grid helper ──────────────────────────────────────────────────
const RGrid = ({ cols = 4, gap = 12, children, style }) => (
  <div style={{
    display: "grid",
    gridTemplateColumns: `repeat(auto-fill, minmax(${Math.floor(900 / cols)}px, 1fr))`,
    gap, ...style,
  }}>{children}</div>
);

// ── KPI Card ────────────────────────────────────────────────────────────────
function KPICard({ label, value, sub, color = "#fbbf24", trend, small }) {
  const isPositive = trend > 0;
  const isNeutral = trend === 0 || trend == null;
  return (
    <div style={S.card}>
      <div style={S.label}>{label}</div>
      <div style={{ ...S.value, color, fontSize: small ? 22 : 26 }}>{value}</div>
      {sub && (
        <div style={{
          ...S.sub,
          color: isNeutral ? "rgba(255,255,255,0.3)" : isPositive ? "#34d399" : "#f87171",
        }}>
          {!isNeutral && (isPositive ? "+" : "")}{trend != null ? `${trend}% WoW` : ""}{trend != null && sub ? " · " : ""}{sub}
        </div>
      )}
    </div>
  );
}

// ── Mini bar chart (CSS) ────────────────────────────────────────────────────
function BarChart({ data = [], label, color = "#fbbf24", height = 64 }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={S.card}>
      <div style={S.label}>{label}</div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height, marginTop: 10 }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{
              width: "100%", maxWidth: 28,
              height: `${Math.max((d.value / max) * (height - 16), 2)}px`,
              background: `linear-gradient(180deg, ${color}, ${color}88)`,
              borderRadius: "3px 3px 0 0", transition: "height 0.4s ease",
            }} title={`${d.label}: ${d.value}`} />
            <span style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", marginTop: 3, whiteSpace: "nowrap" }}>{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── SVG Line chart ──────────────────────────────────────────────────────────
function LineChart({ data = [], label, color = "#34d399", height = 80, secondaryData, secondaryColor = "#60a5fa" }) {
  const allVals = [...data.map(d => d.value), ...(secondaryData || []).map(d => d.value)];
  const max = Math.max(...allVals, 1);
  const W = 300, H = height;
  const pts = (arr) => arr.map((d, i) => {
    const x = arr.length > 1 ? (i / (arr.length - 1)) * W : W / 2;
    const y = H - 4 - ((d.value / max) * (H - 10));
    return `${x},${y}`;
  }).join(" ");

  return (
    <div style={S.card}>
      <div style={S.label}>{label}</div>
      <svg width="100%" height={height} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ marginTop: 8 }}>
        {data.length > 1 && (
          <polyline points={pts(data)} fill="none" stroke={color} strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" />
        )}
        {secondaryData && secondaryData.length > 1 && (
          <polyline points={pts(secondaryData)} fill="none" stroke={secondaryColor} strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 2" />
        )}
        {data.map((d, i) => {
          const x = data.length > 1 ? (i / (data.length - 1)) * W : W / 2;
          const y = H - 4 - ((d.value / max) * (H - 10));
          return <circle key={i} cx={x} cy={y} r="2.5" fill={color} />;
        })}
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
        {data.filter((_, i) => i % Math.ceil(data.length / 6) === 0 || i === data.length - 1).map((d, i) => (
          <span key={i} style={{ fontSize: 8, color: "rgba(255,255,255,0.3)" }}>{d.label}</span>
        ))}
      </div>
      {secondaryData && (
        <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
          <span style={{ fontSize: 10, color }}><span style={{ display: "inline-block", width: 12, height: 2, background: color, verticalAlign: "middle", marginRight: 4 }} />Active scholars</span>
          <span style={{ fontSize: 10, color: secondaryColor }}><span style={{ display: "inline-block", width: 12, height: 2, background: secondaryColor, verticalAlign: "middle", marginRight: 4 }} />Quizzes</span>
        </div>
      )}
    </div>
  );
}

// ── Cohort retention heatmap ─────────────────────────────────────────────────
function CohortTable({ data = [] }) {
  const pctColor = (pct) => {
    if (pct == null || isNaN(pct)) return "rgba(255,255,255,0.04)";
    if (pct >= 70) return "rgba(52,211,153,0.25)";
    if (pct >= 40) return "rgba(251,191,36,0.2)";
    if (pct >= 15) return "rgba(251,146,60,0.2)";
    return "rgba(248,113,113,0.15)";
  };
  const pctText = (active, total) => {
    if (!total) return "—";
    return `${Math.round((active / total) * 100)}%`;
  };
  const fmtMonth = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
  };

  return (
    <div style={S.card}>
      <div style={S.label}>Monthly Cohort Retention</div>
      {data.length === 0 ? (
        <div style={{ ...S.empty, padding: 20 }}>No cohort data yet</div>
      ) : (
        <div style={{ overflowX: "auto", marginTop: 10 }}>
          <table style={{ ...S.table, fontSize: 11 }}>
            <thead>
              <tr>
                <th style={S.th}>Cohort</th>
                <th style={S.th}>Size</th>
                <th style={{ ...S.th, color: "#34d399" }}>Month 0</th>
                <th style={{ ...S.th, color: "#fbbf24" }}>Month 1</th>
                <th style={{ ...S.th, color: "#fb923c" }}>Month 2</th>
                <th style={{ ...S.th, color: "#f87171" }}>Month 3</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => {
                const cols = [
                  { active: row.active_m0, label: pctText(row.active_m0, row.cohort_size) },
                  { active: row.active_m1, label: pctText(row.active_m1, row.cohort_size) },
                  { active: row.active_m2, label: pctText(row.active_m2, row.cohort_size) },
                  { active: row.active_m3, label: pctText(row.active_m3, row.cohort_size) },
                ];
                return (
                  <tr key={i}>
                    <td style={{ ...S.td, fontWeight: 600, color: "#e2e8f0" }}>{fmtMonth(row.cohort_month)}</td>
                    <td style={S.td}>{row.cohort_size}</td>
                    {cols.map((c, j) => {
                      const pct = row.cohort_size ? (c.active / row.cohort_size) * 100 : null;
                      return (
                        <td key={j} style={{ ...S.td, background: pctColor(pct), textAlign: "center", fontWeight: 700 }}>
                          {c.label}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Coverage matrix (curriculum × subject) ───────────────────────────────────
function CoverageMatrix({ data = [] }) {
  const curricula = [...new Set(data.map(d => d.curriculum))].sort();
  const subjects = [...new Set(data.map(d => d.subject))].sort();
  const lookup = {};
  data.forEach(d => { lookup[`${d.curriculum}|${d.subject}`] = d.question_count; });

  const cellColor = (n) => {
    if (!n) return "rgba(248,113,113,0.12)";
    if (n >= 200) return "rgba(52,211,153,0.2)";
    if (n >= 80) return "rgba(251,191,36,0.15)";
    return "rgba(251,146,60,0.15)";
  };
  const fmtC = (c) => ({
    uk_national: "UK", ng_primary: "NG-P", ng_jss: "NG-J", ng_sss: "NG-S",
    "11_plus": "11+", ca_primary: "CA-P", ca_secondary: "CA-S",
  }[c] || c);
  const fmtS = (s) => s.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());

  return (
    <div style={S.card}>
      <div style={S.label}>Question Bank Coverage Matrix</div>
      <div style={{ display: "flex", gap: 12, marginTop: 6, marginBottom: 8, flexWrap: "wrap" }}>
        {[["≥200", "rgba(52,211,153,0.2)", "Good"], ["80–199", "rgba(251,191,36,0.15)", "Fair"], ["1–79", "rgba(251,146,60,0.15)", "Sparse"], ["0", "rgba(248,113,113,0.12)", "Gap"]].map(([label, bg]) => (
          <span key={label} style={{ fontSize: 9, padding: "2px 7px", borderRadius: 4, background: bg, color: "rgba(255,255,255,0.6)" }}>{label}</span>
        ))}
      </div>
      {curricula.length === 0 ? (
        <div style={{ ...S.empty, padding: 20 }}>No coverage data yet</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ ...S.table, fontSize: 10 }}>
            <thead>
              <tr>
                <th style={{ ...S.th, fontSize: 9 }}>Curriculum</th>
                {subjects.map(s => (
                  <th key={s} style={{ ...S.th, fontSize: 9, textAlign: "center" }}>{fmtS(s)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {curricula.map(cur => (
                <tr key={cur}>
                  <td style={{ ...S.td, fontWeight: 700, color: "#e2e8f0", fontSize: 10 }}>{fmtC(cur)}</td>
                  {subjects.map(sub => {
                    const n = lookup[`${cur}|${sub}`] || 0;
                    return (
                      <td key={sub} style={{ ...S.td, background: cellColor(n), textAlign: "center", fontWeight: n > 0 ? 600 : 400, color: n > 0 ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.2)" }}>
                        {n || "—"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Funnel visualization ────────────────────────────────────────────────────
function FunnelChart({ steps }) {
  const maxVal = steps[0]?.value || 1;
  return (
    <div style={S.card}>
      <div style={S.label}>Activation Funnel</div>
      <div style={{ marginTop: 10 }}>
        {steps.map((step, i) => {
          const pct = maxVal > 0 ? (step.value / maxVal) * 100 : 0;
          const convPct = i > 0 && steps[i - 1].value > 0
            ? Math.round((step.value / steps[i - 1].value) * 100) : 100;
          return (
            <div key={i} style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                <span style={{ color: "rgba(255,255,255,0.6)" }}>{step.label}</span>
                <span style={{ color: "rgba(255,255,255,0.5)" }}>
                  {step.value} {i > 0 && <span style={{ color: convPct >= 50 ? "#34d399" : "#fbbf24", fontSize: 10 }}>({convPct}%)</span>}
                </span>
              </div>
              <div style={{ height: 6, background: "rgba(255,255,255,0.04)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{
                  width: `${pct}%`, height: "100%", borderRadius: 3,
                  background: `linear-gradient(90deg, ${step.color || "#fbbf24"}, ${step.color || "#fbbf24"}88)`,
                  transition: "width 0.5s ease",
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Horizontal stat bars ─────────────────────────────────────────────────────
function HorizontalBars({ data = [], label, color = "#60a5fa" }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={S.card}>
      <div style={S.label}>{label}</div>
      <div style={{ marginTop: 10 }}>
        {data.slice(0, 8).map((d, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", width: 80, textAlign: "right", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {d.label}
            </span>
            <div style={{ flex: 1, height: 8, background: "rgba(255,255,255,0.04)", borderRadius: 4, overflow: "hidden" }}>
              <div style={{
                width: `${(d.value / max) * 100}%`, height: "100%", borderRadius: 4,
                background: `linear-gradient(90deg, ${color}, ${color}77)`,
                transition: "width 0.4s ease",
              }} />
            </div>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", width: 30, flexShrink: 0 }}>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Donut chart (SVG) ───────────────────────────────────────────────────────
function DonutChart({ data = [], label, size = 100 }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const colors = ["#fbbf24", "#60a5fa", "#34d399", "#f472b6", "#a78bfa", "#fb923c", "#22d3ee", "#e879f9"];
  let cum = 0;
  const r = 36, cx = 50, cy = 50;
  const circumference = 2 * Math.PI * r;

  return (
    <div style={S.card}>
      <div style={S.label}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
        <svg width={size} height={size} viewBox="0 0 100 100">
          {data.map((d, i) => {
            const pct = d.value / total;
            const offset = circumference * (1 - cum);
            cum += pct;
            return (
              <circle key={i} cx={cx} cy={cy} r={r} fill="none"
                stroke={colors[i % colors.length]} strokeWidth="10"
                strokeDasharray={`${circumference * pct} ${circumference * (1 - pct)}`}
                strokeDashoffset={offset}
                transform={`rotate(-90 ${cx} ${cy})`}
                style={{ transition: "stroke-dasharray 0.5s ease" }}
              />
            );
          })}
          <text x={cx} y={cy - 4} textAnchor="middle" fill="#fbbf24" fontSize="16" fontWeight="900">{total}</text>
          <text x={cx} y={cy + 10} textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="7">TOTAL</text>
        </svg>
        <div style={{ flex: 1 }}>
          {data.slice(0, 6).map((d, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: colors[i % colors.length], flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", flex: 1 }}>{d.label}</span>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", fontWeight: 700 }}>{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Data helpers ────────────────────────────────────────────────────────────
const pctChange = (curr, prev) =>
  prev === 0 ? (curr > 0 ? 100 : 0) : Math.round(((curr - prev) / prev) * 100);

function buildWeeklyTrend(records, weeks) {
  const now = new Date();
  const buckets = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(now - (i + 1) * 7 * 86400000);
    const end = new Date(now - i * 7 * 86400000);
    const count = records.filter(r => {
      const d = new Date(r.created_at);
      return d >= start && d < end;
    }).length;
    const label = start.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    buckets.push({ label, value: count });
  }
  return buckets;
}

function buildDist(arr, key) {
  const dist = {};
  arr.forEach(item => {
    const v = item[key] || "unknown";
    dist[v] = (dist[v] || 0) + 1;
  });
  return Object.entries(dist).map(([k, v]) => ({ label: k, value: v })).sort((a, b) => b.value - a.value);
}

/** Safe Supabase query — never throws */
async function sq(promise) {
  try {
    const res = await promise;
    if (res.error) console.warn("[admin]", res.error.message);
    return { data: res.data ?? null, count: res.count ?? 0 };
  } catch (e) {
    console.warn("[admin] query threw:", e.message);
    return { data: null, count: 0 };
  }
}

/** Export array of objects to CSV download */
function exportCSV(rows, filename) {
  if (!rows || rows.length === 0) return;
  const cols = Object.keys(rows[0]);
  const lines = [
    cols.join(","),
    ...rows.map(r => cols.map(c => {
      const v = r[c] == null ? "" : String(r[c]);
      return v.includes(",") || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
    }).join(","))
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/** Estimate monthly recurring revenue from parents table data */
function estimateMRR(parentsData) {
  let ngMRR = 0, gbMRR = 0, payingNG = 0, payingGB = 0;
  (parentsData || []).forEach(p => {
    if (p.subscription_tier === "ng_scholar") {
      payingNG++;
      let monthly = NG_PRICE.ng_scholar;
      if (p.billing_cycle === "annual") monthly = Math.round(25000 / 12);
      const addons = Array.isArray(p.ng_addons) ? p.ng_addons : [];
      addons.forEach(a => { monthly += NG_PRICE[a] || 0; });
      ngMRR += monthly;
    } else if (p.subscription_tier === "gb_standard") {
      payingGB++;
      gbMRR += p.billing_cycle === "annual" ? Math.round(9999 / 12) : 999; // pence → £ /100 later
    }
  });
  return { ngMRR, gbMRR, payingNG, payingGB };
}

// ── Fetch core analytics directly from Supabase client ──────────────────────
async function fetchAnalytics(supabase) {
  const now = new Date();
  const d7 = new Date(now - 7 * 86400000).toISOString();
  const d14 = new Date(now - 14 * 86400000).toISOString();

  const [
    parents, scholars, questionsAll, sessions, schools, quizCount,
    ns7, ps7, np7, pp7, q7, pq7,
    allScholars, allQuizzes, topicMastery, questionsActive,
    parentsSource,
  ] = await Promise.all([
    sq(supabase.from("parents").select("*", { count: "exact", head: true })),
    sq(supabase.from("scholars").select("*", { count: "exact", head: true }).is("archived_at", null)),
    sq(supabase.from("question_bank").select("*", { count: "exact", head: true })),
    sq(supabase.from("scholar_sessions").select("*", { count: "exact", head: true })),
    sq(supabase.from("schools").select("*", { count: "exact", head: true })),
    sq(supabase.from("quiz_results").select("*", { count: "exact", head: true })),
    sq(supabase.from("scholars").select("*", { count: "exact", head: true }).gte("created_at", d7).is("archived_at", null)),
    sq(supabase.from("scholars").select("*", { count: "exact", head: true }).gte("created_at", d14).lt("created_at", d7).is("archived_at", null)),
    sq(supabase.from("parents").select("*", { count: "exact", head: true }).gte("created_at", d7)),
    sq(supabase.from("parents").select("*", { count: "exact", head: true }).gte("created_at", d14).lt("created_at", d7)),
    sq(supabase.from("quiz_results").select("*", { count: "exact", head: true }).gte("created_at", d7)),
    sq(supabase.from("quiz_results").select("*", { count: "exact", head: true }).gte("created_at", d14).lt("created_at", d7)),
    sq(supabase.from("scholars").select("id, name, age_band, curriculum, created_at, total_xp, country, parent_id").is("archived_at", null).order("created_at", { ascending: false }).limit(200)),
    sq(supabase.from("quiz_results").select("id, scholar_id, subject, accuracy, time_spent_seconds, created_at").order("created_at", { ascending: false }).limit(200)),
    sq(supabase.from("scholar_topic_mastery").select("scholar_id, subject, topic, current_tier").limit(500)),
    sq(supabase.from("question_bank").select("*", { count: "exact", head: true }).eq("is_active", true)),
    sq(supabase.from("parents").select("signup_source").limit(500)),
  ]);

  const scholarsData = allScholars.data || [];
  const quizzesData = allQuizzes.data || [];
  const masteryData = topicMastery.data || [];
  const sourceData = parentsSource.data || [];

  // Activation
  const scholarsWithQuiz = new Set(quizzesData.map(q => q.scholar_id));
  const activatedScholars = scholarsData.filter(s => scholarsWithQuiz.has(s.id)).length;
  const totalScholars = scholars.count;
  const activationRate = totalScholars > 0 ? Math.round((activatedScholars / totalScholars) * 100) : 0;

  // Avg accuracy & time
  const withAcc = quizzesData.filter(q => q.accuracy != null);
  const avgAccuracy = withAcc.length > 0 ? Math.round(withAcc.reduce((s, q) => s + q.accuracy, 0) / withAcc.length) : 0;
  const withTime = quizzesData.filter(q => q.time_spent_seconds > 0);
  const avgTimeMin = withTime.length > 0
    ? (withTime.reduce((s, q) => s + q.time_spent_seconds, 0) / withTime.length / 60).toFixed(1) : "0";

  const totalParents = parents.count;
  const scholarPerParent = totalParents > 0 ? (totalScholars / totalParents).toFixed(1) : "0";

  // Distributions
  const currDist = buildDist(scholarsData, "curriculum").map(d => ({ ...d, label: formatCurriculum(d.label) }));
  const ageDist = buildDist(scholarsData, "age_band").map(d => ({ ...d, label: d.label.toUpperCase() }));
  const countryDist = buildDist(scholarsData, "country");
  const subjectDist = buildDist(quizzesData, "subject").map(d => ({ ...d, label: d.label.replace(/_/g, " ") }));
  const tierDist = buildDist(masteryData, "current_tier");
  const sourceDist = buildDist(sourceData, "signup_source");

  // Funnel
  const multipleQuizzes = scholarsData.filter(s => quizzesData.filter(q => q.scholar_id === s.id).length >= 3).length;
  const hasXP = scholarsData.filter(s => s.total_xp > 0).length;

  // Weekly trend + anomaly detection
  const signupWeekly = buildWeeklyTrend(scholarsData, 8);
  const thisWeek = signupWeekly[signupWeekly.length - 1]?.value || 0;
  const prior4Avg = signupWeekly.slice(-5, -1).reduce((s, d) => s + d.value, 0) / 4;
  const anomalyFlag = prior4Avg > 3 && thisWeek < prior4Avg * 0.8;
  const anomalyMsg = anomalyFlag
    ? `⚠ This week's signups (${thisWeek}) are ${Math.round((1 - thisWeek / prior4Avg) * 100)}% below the 4-week average (${Math.round(prior4Avg)}). Check acquisition channels.`
    : null;

  // Recent scholars
  const recentScholars = scholarsData.slice(0, 20).map(s => ({
    ...s,
    quiz_count: quizzesData.filter(q => q.scholar_id === s.id).length,
    topics_mastered: masteryData.filter(m => m.scholar_id === s.id).length,
  }));

  // Top performers
  const topPerformers = scholarsData
    .map(s => {
      const sQuizzes = quizzesData.filter(q => q.scholar_id === s.id);
      const accArr = sQuizzes.filter(q => q.accuracy != null);
      return {
        name: s.name, age_band: s.age_band, total_xp: s.total_xp || 0,
        quiz_count: sQuizzes.length,
        avg_accuracy: accArr.length > 0 ? Math.round(accArr.reduce((a, q) => a + q.accuracy, 0) / accArr.length) : 0,
      };
    })
    .filter(s => s.quiz_count > 0)
    .sort((a, b) => b.total_xp - a.total_xp)
    .slice(0, 10);

  return {
    kpis: {
      totalParents, totalScholars,
      totalQuestions: questionsAll.count,
      activeQuestions: questionsActive.count,
      totalSessions: sessions.count,
      totalSchools: schools.count,
      totalQuizResults: quizCount.count,
      totalTopicMastery: masteryData.length,
    },
    growth: {
      newScholars7d: ns7.count, prevScholars7d: ps7.count, scholarsGrowthPct: pctChange(ns7.count, ps7.count),
      newParents7d: np7.count, prevParents7d: pp7.count, parentsGrowthPct: pctChange(np7.count, pp7.count),
      quizzes7d: q7.count, prevQuizzes7d: pq7.count, quizzesGrowthPct: pctChange(q7.count, pq7.count),
      anomalyMsg,
    },
    engagement: {
      activationRate, activatedScholars, avgAccuracy,
      avgTimeMin: parseFloat(avgTimeMin), scholarPerParent: parseFloat(scholarPerParent),
    },
    funnel: { totalSignups: totalScholars, firstQuizCompleted: activatedScholars, multipleQuizzes, hasXP },
    distributions: { curriculum: currDist, ageBand: ageDist, country: countryDist, subject: subjectDist, masteryTier: tierDist, signupSource: sourceDist },
    trends: { signupWeekly },
    recentScholars,
    topPerformers,
  };
}

// ── Main component ──────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("growth");
  const [dataError, setDataError] = useState(null);

  const loadData = useCallback(async (supabase) => {
    setLoading(true);
    setDataError(null);
    try {
      const result = await fetchAnalytics(supabase);
      setData(result);
    } catch (err) {
      console.error("Admin data load error:", err);
      setDataError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const supabase = sb();
    let ignore = false;
    let loaded = false;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (ignore) return;
      const user = session?.user;
      if (user && ADMIN_EMAILS.includes(user.email)) {
        setAuthed(true);
        if (!loaded) { loaded = true; loadData(supabase); }
      } else {
        setLoading(false);
      }
    }).catch(() => { if (!ignore) setLoading(false); });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (ignore) return;
        const user = session?.user;
        if (user && ADMIN_EMAILS.includes(user.email)) {
          setAuthed(true);
          if (!loaded) { loaded = true; loadData(supabase); }
          return;
        }
        if (event === "SIGNED_OUT") router.replace("/login");
      }
    );
    return () => { ignore = true; subscription.unsubscribe(); };
  }, [loadData, router]);

  const handleLogout = async () => {
    await sb().auth.signOut();
    router.replace("/login");
  };

  if (!authed) {
    return (
      <div style={{ ...S.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "rgba(255,255,255,0.4)" }}>
          {loading ? "Verifying access..." : "Not authorized"}
        </div>
      </div>
    );
  }

  const TABS = [
    { id: "growth",     label: "Growth" },
    { id: "engagement", label: "Engagement" },
    { id: "retention",  label: "Retention" },
    { id: "revenue",    label: "Revenue" },
    { id: "content",    label: "Content" },
    { id: "scholars",   label: "Scholars" },
    { id: "schools",    label: "Schools" },
  ];

  const k = data?.kpis || {};
  const g = data?.growth || {};
  const e = data?.engagement || {};
  const f = data?.funnel || {};
  const d_ = data?.distributions || {};
  const tr = data?.trends || {};

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#fbbf24", letterSpacing: "-0.02em" }}>LaunchPard HQ</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 1 }}>Growth Analytics</div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <button style={S.btn} onClick={() => loadData(sb())}>↺ Refresh</button>
          <Link href="/dashboard/parent" style={{ ...S.btn, textDecoration: "none", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}>
            Parent
          </Link>
          <button style={{ ...S.btn, background: "rgba(239,68,68,0.08)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.15)" }} onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      {/* Nav */}
      <div style={S.nav}>
        {TABS.map(tb => (
          <button key={tb.id} style={S.navBtn(tab === tb.id)} onClick={() => setTab(tb.id)}>{tb.label}</button>
        ))}
      </div>

      {/* Error banner */}
      {dataError && (
        <div style={{ margin: "12px 20px", padding: "10px 14px", borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5", fontSize: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontWeight: 700, color: "#f87171" }}>Error:</span> {dataError}
          <button onClick={() => loadData(sb())} style={{ marginLeft: "auto", padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: "rgba(239,68,68,0.12)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)", cursor: "pointer" }}>
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div style={S.empty}>
          <div style={{ fontSize: 20, marginBottom: 8 }}>Loading analytics...</div>
          <div style={{ width: 40, height: 3, background: "#fbbf24", borderRadius: 2, margin: "0 auto", animation: "pulse 1.5s ease-in-out infinite" }} />
        </div>
      ) : data ? (
        <div style={S.content}>

          {/* ══════ GROWTH TAB ══════ */}
          {tab === "growth" && (
            <>
              {g.anomalyMsg && <div style={S.anomaly}>⚠ {g.anomalyMsg}</div>}

              <RGrid cols={4}>
                <KPICard label="Total Parents" value={k.totalParents} color="#60a5fa" trend={g.parentsGrowthPct} sub={`+${g.newParents7d} this week`} />
                <KPICard label="Total Scholars" value={k.totalScholars} color="#34d399" trend={g.scholarsGrowthPct} sub={`+${g.newScholars7d} this week`} />
                <KPICard label="Quizzes Completed" value={formatNum(k.totalQuizResults)} color="#fbbf24" trend={g.quizzesGrowthPct} sub={`+${g.quizzes7d} this week`} />
                <KPICard label="Activation Rate" value={`${e.activationRate}%`} color={e.activationRate >= 30 ? "#34d399" : "#fb923c"} sub={`${e.activatedScholars} of ${k.totalScholars} scholars`} />
              </RGrid>

              <RGrid cols={4} style={{ marginTop: 12 }}>
                <KPICard label="Scholar / Parent" value={e.scholarPerParent} color="#a78bfa" sub="avg ratio" small />
                <KPICard label="Avg Accuracy" value={`${e.avgAccuracy}%`} color={e.avgAccuracy >= 60 ? "#34d399" : "#fb923c"} sub="across all quizzes" small />
                <KPICard label="Avg Quiz Time" value={`${e.avgTimeMin}m`} color="#22d3ee" sub="per session" small />
                <KPICard label="Topic Mastery" value={formatNum(k.totalTopicMastery)} color="#f472b6" sub="records tracked" small />
              </RGrid>

              <div style={{ ...S.grid2, marginTop: 16 }}>
                <BarChart data={tr.signupWeekly || []} label="Weekly Scholar Signups (8 weeks)" color="#34d399" height={80} />
                <FunnelChart steps={[
                  { label: "Signed Up", value: f.totalSignups, color: "#60a5fa" },
                  { label: "First Quiz", value: f.firstQuizCompleted, color: "#34d399" },
                  { label: "3+ Quizzes", value: f.multipleQuizzes, color: "#fbbf24" },
                  { label: "Earned XP", value: f.hasXP, color: "#a78bfa" },
                ]} />
              </div>

              <div style={{ ...S.grid2, marginTop: 16 }}>
                <DonutChart data={d_.curriculum || []} label="Scholars by Curriculum" />
                {(d_.signupSource || []).length > 0
                  ? <DonutChart data={d_.signupSource} label="Acquisition Channel" />
                  : <DonutChart data={d_.ageBand || []} label="Scholars by Age Band" />}
              </div>

              {(d_.country || []).length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <HorizontalBars data={d_.country} label="Scholars by Country" color="#22d3ee" />
                </div>
              )}
            </>
          )}

          {/* ══════ ENGAGEMENT TAB ══════ */}
          {tab === "engagement" && (
            <>
              <RGrid cols={3}>
                <KPICard label="Activation Rate" value={`${e.activationRate}%`} color={e.activationRate >= 30 ? "#34d399" : "#fb923c"} sub={`${e.activatedScholars} activated`} />
                <KPICard label="Avg Accuracy" value={`${e.avgAccuracy}%`} color={e.avgAccuracy >= 60 ? "#34d399" : "#fb923c"} sub="platform-wide" />
                <KPICard label="Avg Quiz Time" value={`${e.avgTimeMin} min`} color="#22d3ee" sub="per session" />
              </RGrid>

              <div style={{ ...S.grid2, marginTop: 16 }}>
                <FunnelChart steps={[
                  { label: "Signed Up", value: f.totalSignups, color: "#60a5fa" },
                  { label: "First Quiz", value: f.firstQuizCompleted, color: "#34d399" },
                  { label: "3+ Quizzes", value: f.multipleQuizzes, color: "#fbbf24" },
                  { label: "Earned XP", value: f.hasXP, color: "#a78bfa" },
                ]} />
                {(d_.subject || []).length > 0 && (
                  <HorizontalBars data={d_.subject} label="Quizzes by Subject" color="#a78bfa" />
                )}
              </div>

              {(d_.masteryTier || []).length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <BarChart data={d_.masteryTier} label="Topic Mastery Tiers" color="#f472b6" />
                </div>
              )}

              {(data.topPerformers || []).length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", ...S.sectionTitle }}>
                    <span style={S.sectionTitle}>Top Performers</span>
                    <button style={S.btn} onClick={() => exportCSV(data.topPerformers, "top_performers.csv")}>
                      ↓ Export CSV
                    </button>
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={S.table}>
                      <thead>
                        <tr>
                          <th style={S.th}>#</th><th style={S.th}>Scholar</th><th style={S.th}>Band</th>
                          <th style={S.th}>XP</th><th style={S.th}>Quizzes</th><th style={S.th}>Avg Accuracy</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.topPerformers.map((s, i) => (
                          <tr key={i}>
                            <td style={S.td}>{i + 1}</td>
                            <td style={{ ...S.td, fontWeight: 600, color: "#e2e8f0" }}>{s.name}</td>
                            <td style={S.td}><span style={S.badge(bandColor(s.age_band))}>{(s.age_band || "").toUpperCase()}</span></td>
                            <td style={{ ...S.td, color: "#fbbf24", fontWeight: 700 }}>{s.total_xp.toLocaleString()}</td>
                            <td style={S.td}>{s.quiz_count}</td>
                            <td style={S.td}>
                              <span style={S.badge(s.avg_accuracy >= 70 ? "#34d399" : s.avg_accuracy >= 40 ? "#fbbf24" : "#f87171")}>
                                {s.avg_accuracy}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ══════ RETENTION TAB ══════ */}
          {tab === "retention" && <RetentionTab />}

          {/* ══════ REVENUE TAB ══════ */}
          {tab === "revenue" && <RevenueTab />}

          {/* ══════ CONTENT TAB ══════ */}
          {tab === "content" && (
            <ContentTab
              totalQuestions={k.totalQuestions}
              activeQuestions={k.activeQuestions}
              subjectDist={d_.subject}
            />
          )}

          {/* ══════ SCHOLARS TAB ══════ */}
          {tab === "scholars" && (
            <>
              <RGrid cols={3}>
                <KPICard label="Total Scholars" value={k.totalScholars} color="#34d399" trend={g.scholarsGrowthPct} sub={`+${g.newScholars7d} this week`} />
                <KPICard label="Total Parents" value={k.totalParents} color="#60a5fa" trend={g.parentsGrowthPct} sub={`+${g.newParents7d} this week`} />
                <KPICard label="Activated" value={e.activatedScholars} color="#fbbf24" sub={`${e.activationRate}% rate`} />
              </RGrid>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={S.sectionTitle}>Recent Scholars</div>
                <button style={S.btn} onClick={() => exportCSV(data.recentScholars, "scholars.csv")}>↓ Export CSV</button>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={S.th}>Name</th><th style={S.th}>Band</th><th style={S.th}>Curriculum</th>
                      <th style={S.th}>XP</th><th style={S.th}>Quizzes</th><th style={S.th}>Topics</th><th style={S.th}>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.recentScholars || []).map(s => (
                      <tr key={s.id}>
                        <td style={{ ...S.td, fontWeight: 600, color: "#e2e8f0" }}>{s.name || "—"}</td>
                        <td style={S.td}><span style={S.badge(bandColor(s.age_band))}>{(s.age_band || "—").toUpperCase()}</span></td>
                        <td style={S.td}>{formatCurriculum(s.curriculum)}</td>
                        <td style={{ ...S.td, color: "#fbbf24", fontWeight: 600 }}>{(s.total_xp || 0).toLocaleString()}</td>
                        <td style={S.td}>{s.quiz_count || 0}</td>
                        <td style={S.td}>{s.topics_mastered || 0}</td>
                        <td style={S.td}>{fmtDate(s.created_at)}</td>
                      </tr>
                    ))}
                    {(data.recentScholars || []).length === 0 && (
                      <tr><td colSpan={7} style={{ ...S.td, textAlign: "center", color: "rgba(255,255,255,0.25)" }}>No scholars yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ══════ SCHOOLS TAB ══════ */}
          {tab === "schools" && <SchoolsTab totalSchools={k.totalSchools} />}
        </div>
      ) : null}

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
        @media (max-width: 768px) {
          [style*="grid-template-columns: repeat(auto-fill"] { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 480px) {
          [style*="grid-template-columns: repeat(auto-fill"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

// ── Retention Tab ────────────────────────────────────────────────────────────
function RetentionTab() {
  const [wauData, setWauData] = useState([]);
  const [cohortData, setCohortData] = useState([]);
  const [churnList, setChurnList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [churnRate, setChurnRate] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const supabase = sb();
        const d30 = new Date(Date.now() - 30 * 86400000).toISOString();
        const d60 = new Date(Date.now() - 60 * 86400000).toISOString();

        const [wau, cohort, recentQuizzes, olderQuizzes] = await Promise.all([
          sq(supabase.rpc("admin_weekly_actives", { p_weeks: 12 })),
          sq(supabase.rpc("admin_cohort_retention")),
          sq(supabase.from("quiz_results").select("scholar_id").gte("created_at", d30)),
          sq(supabase.from("quiz_results").select("scholar_id, created_at").gte("created_at", d60).lt("created_at", d30)),
        ]);

        // WAU line chart data
        const wauRows = (wau.data || []).map(r => ({
          label: new Date(r.week_start).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
          value: Number(r.active_scholars),
          quizzes: Number(r.quiz_count),
        }));
        setWauData(wauRows);

        // Cohort retention
        setCohortData(wau.data || [] /* fallback */ , cohort.data || []);
        setCohortData(cohort.data || []);

        // Churn approximation: scholars active 30-60 days ago but not in last 30 days
        const recentSet = new Set((recentQuizzes.data || []).map(r => r.scholar_id));
        const olderSet = [...new Set((olderQuizzes.data || []).map(r => r.scholar_id))];
        const churned = olderSet.filter(id => !recentSet.has(id));
        const churnPct = olderSet.length > 0 ? Math.round((churned.length / olderSet.length) * 100) : 0;
        setChurnRate(churnPct);

        // Enrich churn list with scholar names
        if (churned.length > 0) {
          const { data: scholarNames } = await supabase
            .from("scholars")
            .select("id, name, age_band, curriculum")
            .in("id", churned.slice(0, 20));
          // Find last active date per churned scholar
          const lastActive = {};
          (olderQuizzes.data || []).forEach(q => {
            if (churned.includes(q.scholar_id)) {
              if (!lastActive[q.scholar_id] || q.created_at > lastActive[q.scholar_id]) {
                lastActive[q.scholar_id] = q.created_at;
              }
            }
          });
          setChurnList((scholarNames || []).map(s => ({ ...s, last_active: lastActive[s.id] }))
            .sort((a, b) => new Date(b.last_active) - new Date(a.last_active)));
        }
      } catch (e) {
        console.warn("[retention]", e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div style={S.empty}>Loading retention data...</div>;

  const wauLatest = wauData[wauData.length - 1]?.value || 0;
  const wauPrev = wauData[wauData.length - 2]?.value || 0;

  return (
    <>
      <RGrid cols={3}>
        <KPICard label="Weekly Active Scholars (WAU)" value={wauLatest} color="#34d399" trend={pctChange(wauLatest, wauPrev)} sub="last 7 days" />
        <KPICard label="Churn Rate (30d)" value={churnRate != null ? `${churnRate}%` : "—"} color={churnRate > 30 ? "#f87171" : churnRate > 15 ? "#fbbf24" : "#34d399"} sub="lost prev-month actives" small />
        <KPICard label="At-Risk Scholars" value={churnList.length} color="#fb923c" sub="active 30–60d ago, silent now" small />
      </RGrid>

      {wauData.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <LineChart
            data={wauData}
            secondaryData={wauData.map(d => ({ ...d, value: Math.round(d.quizzes / 5) }))}
            label="Weekly Active Scholars — 12 weeks"
            color="#34d399"
            secondaryColor="#60a5fa"
            height={90}
          />
        </div>
      )}

      {cohortData.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <CohortTable data={cohortData} />
        </div>
      )}

      {churnList.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={S.sectionTitle}>At-Risk Scholars (silent 30–60 days)</div>
            <button style={S.btn} onClick={() => exportCSV(churnList, "at_risk_scholars.csv")}>↓ Export</button>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Scholar</th><th style={S.th}>Band</th>
                  <th style={S.th}>Curriculum</th><th style={S.th}>Last Active</th>
                </tr>
              </thead>
              <tbody>
                {churnList.map(s => (
                  <tr key={s.id}>
                    <td style={{ ...S.td, fontWeight: 600, color: "#e2e8f0" }}>{s.name || "—"}</td>
                    <td style={S.td}><span style={S.badge(bandColor(s.age_band))}>{(s.age_band || "—").toUpperCase()}</span></td>
                    <td style={S.td}>{formatCurriculum(s.curriculum)}</td>
                    <td style={{ ...S.td, color: "#fb923c" }}>{fmtDate(s.last_active)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {cohortData.length === 0 && churnList.length === 0 && wauData.length === 0 && (
        <div style={{ ...S.card, marginTop: 16, textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 13, padding: 32 }}>
          No retention data yet — run the admin_dashboard migration to enable RPC functions.
        </div>
      )}
    </>
  );
}

// ── Revenue Tab ───────────────────────────────────────────────────────────────
function RevenueTab() {
  const [parentsData, setParentsData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await sb()
          .from("parents")
          .select("id, subscription_tier, ng_addons, currency, billing_cycle, created_at, region")
          .limit(1000);
        setParentsData(data || []);
      } catch (e) { console.warn("[revenue]", e.message); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div style={S.empty}>Loading revenue data...</div>;

  const { ngMRR, gbMRR, payingNG, payingGB } = estimateMRR(parentsData);
  const totalPaying = payingNG + payingGB;
  const ngARPU = payingNG > 0 ? Math.round(ngMRR / payingNG) : 0;
  const freeCount = parentsData.filter(p => !p.subscription_tier || p.subscription_tier === "free").length;
  const conversionRate = parentsData.length > 0 ? Math.round((totalPaying / parentsData.length) * 100) : 0;

  // Tier distribution
  const tierDist = buildDist(parentsData, "subscription_tier");
  const addonDist = {};
  parentsData.forEach(p => {
    (Array.isArray(p.ng_addons) ? p.ng_addons : []).forEach(a => { addonDist[a] = (addonDist[a] || 0) + 1; });
  });
  const addonRows = Object.entries(addonDist).map(([k, v]) => ({ label: k.replace(/_/g, " "), value: v })).sort((a, b) => b.value - a.value);

  // Monthly signups of paying users
  const payingParents = parentsData.filter(p => p.subscription_tier === "ng_scholar");
  const signupTrend = buildWeeklyTrend(payingParents, 8);

  return (
    <>
      <RGrid cols={4}>
        <KPICard label="NG MRR (est.)" value={`₦${formatNum(ngMRR)}`} color="#fbbf24" sub={`${payingNG} paying accounts`} />
        <KPICard label="NG ARPU" value={`₦${ngARPU.toLocaleString()}`} color="#34d399" sub="per paying parent/mo" small />
        <KPICard label="Conversion Rate" value={`${conversionRate}%`} color={conversionRate >= 10 ? "#34d399" : "#fb923c"} sub={`${totalPaying} paid / ${parentsData.length} total`} small />
        <KPICard label="Free Accounts" value={freeCount} color="#60a5fa" sub="upgrade opportunity" small />
      </RGrid>

      <div style={{ ...S.grid2, marginTop: 16 }}>
        <DonutChart data={tierDist} label="Parents by Tier" />
        {addonRows.length > 0
          ? <HorizontalBars data={addonRows} label="Add-on Adoption (NG)" color="#fbbf24" />
          : (
            <div style={S.card}>
              <div style={S.label}>GB Revenue</div>
              <div style={{ marginTop: 16, color: "rgba(255,255,255,0.35)", fontSize: 12, lineHeight: 1.7 }}>
                GB Stripe integration pending UK entity setup.<br />
                Target: £9.99/mo core plan once live.
              </div>
            </div>
          )}
      </div>

      <div style={{ marginTop: 16 }}>
        <BarChart data={signupTrend} label="New Paying Parents — Weekly" color="#fbbf24" height={72} />
      </div>

      <div style={{ ...S.card, marginTop: 16 }}>
        <div style={S.label}>Revenue Benchmarks</div>
        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, fontSize: 11 }}>
          {[
            ["uLesson (NG)", "₦4,000/mo", "#f87171"],
            ["LaunchPard Scholar", "₦2,500/mo", "#34d399"],
            ["Target 100 subs", `₦${formatNum(250000)}/mo MRR`, "#fbbf24"],
          ].map(([label, val, color]) => (
            <div key={label} style={{ textAlign: "center", padding: "10px 8px", background: "rgba(255,255,255,0.03)", borderRadius: 8 }}>
              <div style={{ color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>{label}</div>
              <div style={{ fontWeight: 800, fontSize: 14, color }}>{val}</div>
            </div>
          ))}
        </div>
      </div>

      {totalPaying === 0 && (
        <div style={{ ...S.card, marginTop: 16, padding: 20, background: "rgba(251,191,36,0.04)", border: "1px solid rgba(251,191,36,0.15)" }}>
          <div style={{ fontSize: 13, color: "#fbbf24", fontWeight: 700, marginBottom: 6 }}>Payment integration needed</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.7 }}>
            Paystack (NG) and Stripe (GB) routes are pending activation. Once live, MRR will populate automatically from <code style={{ background: "rgba(255,255,255,0.06)", padding: "1px 5px", borderRadius: 3 }}>parents.subscription_tier</code>.
          </div>
        </div>
      )}
    </>
  );
}

// ── Content Tab (self-contained, lazy) ───────────────────────────────────────
function ContentTab({ totalQuestions, activeQuestions, subjectDist }) {
  const [coverageData, setCoverageData] = useState([]);
  const [gapData, setGapData] = useState([]);
  const [loadingContent, setLoadingContent] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const supabase = sb();
        const [coverage, gaps] = await Promise.all([
          sq(supabase.rpc("admin_coverage_matrix")),
          sq(supabase.rpc("admin_topic_gaps", { p_min_count: 30 })),
        ]);
        setCoverageData(coverage.data || []);
        setGapData(gaps.data || []);
      } catch (e) { console.warn("[content]", e.message); }
      finally { setLoadingContent(false); }
    })();
  }, []);

  const inactive = (totalQuestions || 0) - (activeQuestions || 0);

  return (
    <>
      <RGrid cols={3}>
        <KPICard label="Total Questions" value={formatNum(totalQuestions)} color="#a78bfa" sub="in question bank" />
        <KPICard label="Active Questions" value={formatNum(activeQuestions)} color="#34d399" sub="serving to scholars" />
        <KPICard label="Inactive / Purged" value={formatNum(inactive)} color="#f87171" sub="flagged or deleted" />
      </RGrid>

      <div style={{ marginTop: 16 }}>
        {loadingContent ? (
          <div style={{ ...S.card, textAlign: "center", padding: 24, color: "rgba(255,255,255,0.3)", fontSize: 13 }}>
            Loading coverage matrix...
          </div>
        ) : (
          <CoverageMatrix data={coverageData} />
        )}
      </div>

      {gapData.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={S.sectionTitle}>Topic Gaps (&lt;30 active questions)</div>
          <div style={{ overflowX: "auto" }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Curriculum</th><th style={S.th}>Subject</th>
                  <th style={S.th}>Topic</th><th style={S.th}>Questions</th><th style={S.th}>Priority</th>
                </tr>
              </thead>
              <tbody>
                {gapData.map((row, i) => (
                  <tr key={i}>
                    <td style={S.td}>{formatCurriculum(row.curriculum)}</td>
                    <td style={S.td}>{(row.subject || "").replace(/_/g, " ")}</td>
                    <td style={{ ...S.td, color: "#e2e8f0", fontWeight: 600 }}>{row.topic}</td>
                    <td style={S.td}>
                      <span style={S.badge(row.question_count === 0 ? "#f87171" : row.question_count < 10 ? "#fb923c" : "#fbbf24")}>
                        {row.question_count}
                      </span>
                    </td>
                    <td style={S.td}>
                      <span style={S.badge(row.question_count === 0 ? "#f87171" : "#fb923c")}>
                        {row.question_count === 0 ? "Critical" : "High"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(subjectDist || []).length > 0 && (
        <div style={{ marginTop: 16 }}>
          <HorizontalBars data={subjectDist} label="Quiz Activity by Subject" color="#a78bfa" />
        </div>
      )}

      {!loadingContent && coverageData.length === 0 && gapData.length === 0 && (
        <div style={{ ...S.card, marginTop: 16, textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 13, padding: 32 }}>
          Coverage matrix not available — apply the admin_dashboard migration to enable RPC functions.
        </div>
      )}
    </>
  );
}

// ── Provision School Modal ────────────────────────────────────────────────────
const PROVISION_TYPES = ["Primary school","Secondary school","Primary + Secondary (all-through)","International school","Private / independent school"];

function ProvisionModal({ onClose, onProvisioned }) {
  const [form, setForm] = useState({ schoolName: "", schoolType: PROVISION_TYPES[0], state: "", country: "Nigeria", proprietorEmail: "" });
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null); // { schoolId, schoolName, isNewUser, inviteLink }
  const [err, setErr] = useState("");

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const submit = async () => {
    if (!form.schoolName.trim() || !form.proprietorEmail.trim()) { setErr("School name and proprietor email are required."); return; }
    setSaving(true); setErr("");
    try {
      const res = await fetch("/api/admin/schools/provision", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setResult(data);
      onProvisioned(data);
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  const inp = "width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);borderRadius:8px;padding:'8px 12px';fontSize:13px;color:#e2e8f0;outline:'none'";

  if (result) return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200 }}>
      <div style={{ background:"#0f1629",border:"1px solid rgba(255,255,255,0.1)",borderRadius:16,padding:28,width:"100%",maxWidth:440 }}>
        <div style={{ fontSize:32,marginBottom:12 }}>✅</div>
        <div style={{ fontSize:16,fontWeight:900,color:"#e2e8f0",marginBottom:6 }}>School provisioned!</div>
        <div style={{ fontSize:13,color:"rgba(255,255,255,0.5)",marginBottom:16 }}>
          {result.isNewUser ? "Invite email sent" : "Magic link sent"} to <strong style={{ color:"#e2e8f0" }}>{form.proprietorEmail}</strong>
        </div>
        {result.inviteLink && (
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.35)",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6 }}>Invite link (copy if email fails)</div>
            <div style={{ background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,padding:"8px 10px",fontSize:11,color:"#818cf8",wordBreak:"break-all",cursor:"pointer" }}
              onClick={() => navigator.clipboard.writeText(result.inviteLink)}>
              {result.inviteLink.substring(0, 80)}…
            </div>
            <div style={{ fontSize:11,color:"rgba(255,255,255,0.3)",marginTop:4 }}>Click to copy full link</div>
          </div>
        )}
        <button onClick={onClose} style={{ width:"100%",padding:"10px",background:"#4f46e5",borderRadius:10,fontWeight:900,fontSize:13,color:"#fff",cursor:"pointer",border:"none" }}>Done</button>
      </div>
    </div>
  );

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200 }}>
      <div style={{ background:"#0f1629",border:"1px solid rgba(255,255,255,0.1)",borderRadius:16,padding:28,width:"100%",maxWidth:440 }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20 }}>
          <div style={{ fontSize:15,fontWeight:900,color:"#e2e8f0" }}>Provision New School</div>
          <button onClick={onClose} style={{ background:"none",border:"none",color:"rgba(255,255,255,0.4)",fontSize:18,cursor:"pointer",lineHeight:1 }}>✕</button>
        </div>
        {[
          { label:"School name", key:"schoolName", placeholder:"e.g. Greenfield Academy, Lagos", type:"text" },
          { label:"Proprietor email", key:"proprietorEmail", placeholder:"proprietor@school.edu.ng", type:"email" },
          { label:"State / county", key:"state", placeholder:"e.g. Lagos", type:"text" },
        ].map(({ label, key, placeholder, type }) => (
          <div key={key} style={{ marginBottom:12 }}>
            <div style={{ fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.35)",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:5 }}>{label}</div>
            <input type={type} value={form[key]} onChange={set(key)} placeholder={placeholder}
              style={{ width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"8px 12px",fontSize:13,color:"#e2e8f0",outline:"none",boxSizing:"border-box" }} />
          </div>
        ))}
        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.35)",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:5 }}>School type</div>
          <select value={form.schoolType} onChange={set("schoolType")}
            style={{ width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"8px 12px",fontSize:13,color:"#e2e8f0",outline:"none" }}>
            {PROVISION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.35)",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:5 }}>Country</div>
          <select value={form.country} onChange={set("country")}
            style={{ width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"8px 12px",fontSize:13,color:"#e2e8f0",outline:"none" }}>
            <option>Nigeria</option><option>United Kingdom</option><option>Other</option>
          </select>
        </div>
        {err && <div style={{ color:"#f87171",fontSize:12,marginBottom:12,fontWeight:600 }}>{err}</div>}
        <div style={{ display:"flex",gap:10 }}>
          <button onClick={onClose} style={{ flex:1,padding:"10px",background:"rgba(255,255,255,0.06)",borderRadius:10,fontWeight:700,fontSize:13,color:"rgba(255,255,255,0.6)",cursor:"pointer",border:"1px solid rgba(255,255,255,0.1)" }}>Cancel</button>
          <button onClick={submit} disabled={saving}
            style={{ flex:2,padding:"10px",background:"#4f46e5",borderRadius:10,fontWeight:900,fontSize:13,color:"#fff",cursor:"pointer",border:"none",opacity:saving?0.6:1 }}>
            {saving ? "Creating…" : "Create School & Send Invite"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Schools Tab ──────────────────────────────────────────────────────────────
function SchoolsTab({ totalSchools }) {
  const [schools, setSchools] = useState([]);
  const [summary, setSummary] = useState([]);
  const [leads, setLeads] = useState([]);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [updatingLead, setUpdatingLead] = useState(null); // { id, status }
  const [showProvision, setShowProvision] = useState(false);

  const loadSchools = useCallback(async () => {
    try {
      const supabase = sb();
      const [schoolList, schoolSummary, leadsResult] = await Promise.all([
        sq(supabase.from("schools").select("*").order("name").limit(100)),
        sq(supabase.rpc("admin_school_summary")),
        sq(supabase
          .from("school_leads")
          .select(`
            id, lead_status, created_at,
            schools!inner ( id, name, country, region ),
            parents ( full_name, email ),
            scholars ( name, curriculum )
          `)
          .order("created_at", { ascending: false })
          .limit(200)
        ),
      ]);
      setSchools(schoolList.data || []);
      setSummary(schoolSummary.data || []);
      setLeads(leadsResult.data || []);
    } catch (e) { console.warn("[schools]", e.message); }
    finally { setLoading(false); setLeadsLoading(false); }
  }, []);

  useEffect(() => { loadSchools(); }, [loadSchools]);

  // Update a single lead's status (optimistic)
  const updateLeadStatus = async (leadId, newStatus) => {
    setUpdatingLead(leadId);
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, lead_status: newStatus } : l));
    try {
      const supabase = sb();
      await supabase.from("school_leads").update({ lead_status: newStatus }).eq("id", leadId);
    } catch (e) { console.warn("[leads update]", e.message); }
    finally { setUpdatingLead(null); }
  };

  const countryFlag = (c) => ({ GB: "🇬🇧", NG: "🇳🇬", AU: "🇦🇺", CA: "🇨🇦", CH: "🇨🇭" }[c] || "🌍");

  // Compute KPIs from summary
  const activeSchools = summary.filter(s => s.total_scholars > 0).length;
  const totalInvites = summary.reduce((a, s) => a + Number(s.total_invites || 0), 0);
  const claimedInvites = summary.reduce((a, s) => a + Number(s.claimed_invites || 0), 0);
  const claimRate = totalInvites > 0 ? Math.round((claimedInvites / totalInvites) * 100) : 0;
  const countries = [...new Set(schools.map(s => s.country).filter(Boolean))];

  return (
    <>
      {showProvision && (
        <ProvisionModal
          onClose={() => setShowProvision(false)}
          onProvisioned={() => { loadSchools(); }}
        />
      )}

      {/* ── Provision button ── */}
      <div style={{ display:"flex",justifyContent:"flex-end",marginBottom:16 }}>
        <button onClick={() => setShowProvision(true)}
          style={{ display:"flex",alignItems:"center",gap:8,padding:"9px 18px",background:"rgba(79,70,229,0.15)",border:"1px solid rgba(79,70,229,0.35)",borderRadius:10,fontWeight:800,fontSize:13,color:"#818cf8",cursor:"pointer" }}>
          <span style={{ fontSize:16 }}>+</span> Provision School
        </button>
      </div>

      <RGrid cols={4}>
        <KPICard label="Total Schools" value={totalSchools || schools.length || 0} color="#f472b6" sub="in database" />
        <KPICard label="Active Schools" value={activeSchools || "—"} color="#34d399" sub="with enrolled scholars" small />
        <KPICard label="Invite Claim Rate" value={totalInvites > 0 ? `${claimRate}%` : "—"} color={claimRate >= 60 ? "#34d399" : "#fbbf24"} sub={`${claimedInvites}/${totalInvites} claimed`} small />
        <KPICard label="Countries" value={countries.length} color="#22d3ee" sub="represented" small />
      </RGrid>

      {summary.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={S.sectionTitle}>School Enrolment & Conversion</div>
          <div style={{ overflowX: "auto" }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>School</th><th style={S.th}>Scholars</th>
                  <th style={S.th}>Invites Sent</th><th style={S.th}>Claimed</th><th style={S.th}>Claim Rate</th>
                </tr>
              </thead>
              <tbody>
                {summary.map(s => {
                  const rate = s.total_invites > 0 ? Math.round((s.claimed_invites / s.total_invites) * 100) : 0;
                  return (
                    <tr key={s.school_id}>
                      <td style={{ ...S.td, fontWeight: 600, color: "#e2e8f0" }}>{s.school_name}</td>
                      <td style={{ ...S.td, color: "#34d399", fontWeight: 600 }}>{s.total_scholars}</td>
                      <td style={S.td}>{s.total_invites}</td>
                      <td style={S.td}>{s.claimed_invites}</td>
                      <td style={S.td}>
                        <span style={S.badge(rate >= 60 ? "#34d399" : rate >= 30 ? "#fbbf24" : "#f87171")}>
                          {s.total_invites > 0 ? `${rate}%` : "—"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={S.sectionTitle}>Schools Directory ({schools.length})</div>
      {loading ? <div style={S.empty}>Loading...</div> : (
        <div style={{ overflowX: "auto" }}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>School</th><th style={S.th}>Region</th><th style={S.th}>Country</th>
                <th style={S.th}>Curriculum</th><th style={S.th}>Type</th><th style={S.th}>Verified</th>
              </tr>
            </thead>
            <tbody>
              {schools.map(s => (
                <tr key={s.id}>
                  <td style={{ ...S.td, fontWeight: 600, color: "#e2e8f0" }}>{s.name}</td>
                  <td style={S.td}>{s.region || "—"}</td>
                  <td style={S.td}>{countryFlag(s.country)} {s.country}</td>
                  <td style={S.td}>{formatCurriculum(s.curriculum)}</td>
                  <td style={S.td}><span style={S.badge(s.school_type === "primary" ? "#34d399" : "#60a5fa")}>{s.school_type || "—"}</span></td>
                  <td style={S.td}>{s.verified ? "✓" : "—"}</td>
                </tr>
              ))}
              {schools.length === 0 && (
                <tr><td colSpan={6} style={{ ...S.td, textAlign: "center", color: "rgba(255,255,255,0.25)" }}>No schools yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── School Leads (non-partner schools selected by parents) ── */}
      <LeadsSection leads={leads} loading={leadsLoading} onUpdateStatus={updateLeadStatus} updatingLead={updatingLead} />
    </>
  );
}

// ── Lead status helpers ───────────────────────────────────────────────────────
const LEAD_STATUSES = ["new", "contacted", "converted", "ignored"];
const LEAD_COLORS   = { new: "#fbbf24", contacted: "#60a5fa", converted: "#34d399", ignored: "rgba(255,255,255,0.25)" };

function LeadsSection({ leads, loading, onUpdateStatus, updatingLead }) {
  const [statusFilter, setStatusFilter] = useState("new");

  // Group leads by school for the summary row
  const bySchool = leads.reduce((acc, l) => {
    const sId = l.schools?.id;
    if (!sId) return acc;
    if (!acc[sId]) acc[sId] = { school: l.schools, new: 0, contacted: 0, converted: 0, ignored: 0, total: 0 };
    acc[sId][l.lead_status] = (acc[sId][l.lead_status] || 0) + 1;
    acc[sId].total += 1;
    return acc;
  }, {});
  const schoolGroups = Object.values(bySchool).sort((a, b) => b.new - a.new);

  // Status counts for filter pills
  const counts = LEAD_STATUSES.reduce((a, s) => {
    a[s] = leads.filter(l => l.lead_status === s).length;
    return a;
  }, {});

  const filtered = leads.filter(l => l.lead_status === statusFilter);

  if (loading) return <div style={S.empty}>Loading leads...</div>;

  return (
    <div style={{ marginTop: 28 }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={S.sectionTitle}>
          School Leads — Non-Partner Schools ({leads.length})
        </div>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
          Parents who selected schools not yet on LaunchPard
        </span>
      </div>

      {leads.length === 0 ? (
        <div style={S.empty}>No leads captured yet — they appear when parents select non-partner schools.</div>
      ) : (
        <>
          {/* School rollup */}
          {schoolGroups.length > 0 && (
            <div style={{ overflowX: "auto", marginBottom: 20 }}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>School</th>
                    <th style={S.th}>Region</th>
                    <th style={S.th}>Total</th>
                    <th style={S.th}>New</th>
                    <th style={S.th}>Contacted</th>
                    <th style={S.th}>Converted</th>
                    <th style={S.th}>Ignored</th>
                  </tr>
                </thead>
                <tbody>
                  {schoolGroups.map(g => (
                    <tr key={g.school.id}>
                      <td style={{ ...S.td, fontWeight: 700, color: "#e2e8f0" }}>{g.school.name}</td>
                      <td style={S.td}>{g.school.region || g.school.country || "—"}</td>
                      <td style={{ ...S.td, fontWeight: 700, color: "#fbbf24" }}>{g.total}</td>
                      <td style={S.td}><span style={S.badge(LEAD_COLORS.new)}>{g.new}</span></td>
                      <td style={S.td}><span style={S.badge(LEAD_COLORS.contacted)}>{g.contacted}</span></td>
                      <td style={S.td}><span style={S.badge(LEAD_COLORS.converted)}>{g.converted}</span></td>
                      <td style={S.td}><span style={S.badge("rgba(255,255,255,0.3)")}>{g.ignored}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Filter pills */}
          <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
            {LEAD_STATUSES.map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                style={{
                  padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: "pointer",
                  background: statusFilter === s ? `${LEAD_COLORS[s]}20` : "transparent",
                  color: statusFilter === s ? LEAD_COLORS[s] : "rgba(255,255,255,0.35)",
                  border: `1px solid ${statusFilter === s ? LEAD_COLORS[s] + "40" : "rgba(255,255,255,0.08)"}`,
                  transition: "all 0.15s",
                }}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)} <span style={{ opacity: 0.7 }}>({counts[s]})</span>
              </button>
            ))}
          </div>

          {/* Individual leads table */}
          <div style={{ overflowX: "auto" }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>School</th>
                  <th style={S.th}>Parent</th>
                  <th style={S.th}>Scholar</th>
                  <th style={S.th}>Curriculum</th>
                  <th style={S.th}>Date</th>
                  <th style={S.th}>Status</th>
                  <th style={S.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ ...S.td, textAlign: "center", color: "rgba(255,255,255,0.25)" }}>
                      No {statusFilter} leads
                    </td>
                  </tr>
                ) : filtered.map(lead => (
                  <tr key={lead.id}>
                    <td style={{ ...S.td, fontWeight: 600, color: "#e2e8f0" }}>{lead.schools?.name || "—"}</td>
                    <td style={S.td}>
                      <div style={{ fontWeight: 600, color: "#e2e8f0" }}>{lead.parents?.full_name || "—"}</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 1 }}>{lead.parents?.email || ""}</div>
                    </td>
                    <td style={S.td}>{lead.scholars?.name || "—"}</td>
                    <td style={S.td}>{formatCurriculum(lead.scholars?.curriculum)}</td>
                    <td style={S.td}>{fmtDate(lead.created_at)}</td>
                    <td style={S.td}>
                      <span style={S.badge(LEAD_COLORS[lead.lead_status] || "#94a3b8")}>
                        {lead.lead_status}
                      </span>
                    </td>
                    <td style={S.td}>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {LEAD_STATUSES.filter(s => s !== lead.lead_status).map(s => (
                          <button
                            key={s}
                            disabled={updatingLead === lead.id}
                            onClick={() => onUpdateStatus(lead.id, s)}
                            style={{
                              padding: "2px 8px", borderRadius: 5, fontSize: 10, fontWeight: 700,
                              background: `${LEAD_COLORS[s]}15`, color: LEAD_COLORS[s],
                              border: `1px solid ${LEAD_COLORS[s]}30`, cursor: "pointer",
                              opacity: updatingLead === lead.id ? 0.5 : 1,
                              transition: "opacity 0.15s",
                            }}
                          >
                            → {s}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatNum(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n || 0);
}

function formatCurriculum(c) {
  if (!c) return "—";
  const map = {
    uk_national: "UK National", ng_primary: "NG Primary", ng_jss: "NG JSS", ng_sss: "NG SSS",
    ca_primary: "CA Primary", ca_secondary: "CA Secondary", "11_plus": "11+", unknown: "Unknown",
  };
  return map[c] || c.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
}

function bandColor(b) {
  return { ks1: "#f472b6", ks2: "#60a5fa", ks3: "#34d399", ks4: "#a78bfa" }[b] || "#94a3b8";
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
