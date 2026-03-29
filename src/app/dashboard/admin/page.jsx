"use client";
// ─── Admin Growth Dashboard ─────────────────────────────────────────────────
// Comprehensive analytics dashboard for scaling LaunchPard.
// Route: /dashboard/admin
// Queries Supabase directly from the client (no API route dependency).
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
          {!isNeutral && (isPositive ? "+" : "")}{trend != null ? `${trend}% WoW` : ""}{trend != null && sub ? " \u00b7 " : ""}{sub}
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

// ── Horizontal stat bar ─────────────────────────────────────────────────────
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

// ── Fetch all analytics directly from Supabase client ───────────────────────
async function fetchAnalytics(supabase) {
  const now = new Date();
  const d7 = new Date(now - 7 * 86400000).toISOString();
  const d14 = new Date(now - 14 * 86400000).toISOString();

  const [
    parents, scholars, questionsAll, sessions, schools, subs, quizCount,
    ns7, ps7, np7, pp7, q7, pq7,
    allScholars, allQuizzes, topicMastery, questionsActive,
  ] = await Promise.all([
    sq(supabase.from("parents").select("*", { count: "exact", head: true })),
    sq(supabase.from("scholars").select("*", { count: "exact", head: true }).is("archived_at", null)),
    sq(supabase.from("question_bank").select("*", { count: "exact", head: true })),
    sq(supabase.from("scholar_sessions").select("*", { count: "exact", head: true })),
    sq(supabase.from("schools").select("*", { count: "exact", head: true })),
    sq(supabase.from("subscriptions").select("*", { count: "exact", head: true })),
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
  ]);

  const scholarsData = allScholars.data || [];
  const quizzesData = allQuizzes.data || [];
  const masteryData = topicMastery.data || [];

  // Activation
  const scholarsWithQuiz = new Set(quizzesData.map(q => q.scholar_id));
  const activatedScholars = scholarsData.filter(s => scholarsWithQuiz.has(s.id)).length;
  const totalScholars = scholars.count;
  const activationRate = totalScholars > 0 ? Math.round((activatedScholars / totalScholars) * 100) : 0;

  // Avg accuracy
  const withAcc = quizzesData.filter(q => q.accuracy != null);
  const avgAccuracy = withAcc.length > 0 ? Math.round(withAcc.reduce((s, q) => s + q.accuracy, 0) / withAcc.length) : 0;

  // Avg time
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

  // Funnel
  const multipleQuizzes = scholarsData.filter(s => quizzesData.filter(q => q.scholar_id === s.id).length >= 3).length;
  const hasXP = scholarsData.filter(s => s.total_xp > 0).length;

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
      totalSubscriptions: subs.count,
      totalQuizResults: quizCount.count,
      totalTopicMastery: masteryData.length,
    },
    growth: {
      newScholars7d: ns7.count, prevScholars7d: ps7.count, scholarsGrowthPct: pctChange(ns7.count, ps7.count),
      newParents7d: np7.count, prevParents7d: pp7.count, parentsGrowthPct: pctChange(np7.count, pp7.count),
      quizzes7d: q7.count, prevQuizzes7d: pq7.count, quizzesGrowthPct: pctChange(q7.count, pq7.count),
    },
    engagement: {
      activationRate, activatedScholars, avgAccuracy,
      avgTimeMin: parseFloat(avgTimeMin), scholarPerParent: parseFloat(scholarPerParent),
    },
    funnel: { totalSignups: totalScholars, firstQuizCompleted: activatedScholars, multipleQuizzes, hasXP },
    distributions: { curriculum: currDist, ageBand: ageDist, country: countryDist, subject: subjectDist, masteryTier: tierDist },
    trends: { signupWeekly: buildWeeklyTrend(scholarsData, 8) },
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
        if (event === "SIGNED_OUT") {
          router.replace("/login");
        }
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
    { id: "growth", label: "Growth" },
    { id: "engagement", label: "Engagement" },
    { id: "content", label: "Content" },
    { id: "scholars", label: "Scholars" },
    { id: "schools", label: "Schools" },
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
          <div style={{ fontSize: 18, fontWeight: 800, color: "#fbbf24", letterSpacing: "-0.02em" }}>
            LaunchPard HQ
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 1 }}>Growth Analytics</div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <button style={S.btn} onClick={() => loadData(sb())}>Refresh</button>
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
        <div style={{
          margin: "12px 20px", padding: "10px 14px", borderRadius: 10,
          background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
          color: "#fca5a5", fontSize: 12, display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{ fontWeight: 700, color: "#f87171" }}>Error:</span> {dataError}
          <button onClick={() => loadData(sb())}
            style={{ marginLeft: "auto", padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: "rgba(239,68,68,0.12)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)", cursor: "pointer" }}>
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
              <RGrid cols={4}>
                <KPICard label="Total Parents" value={k.totalParents} color="#60a5fa" trend={g.parentsGrowthPct} sub={`+${g.newParents7d} this week`} />
                <KPICard label="Total Scholars" value={k.totalScholars} color="#34d399" trend={g.scholarsGrowthPct} sub={`+${g.newScholars7d} this week`} />
                <KPICard label="Quizzes Completed" value={k.totalQuizResults} color="#fbbf24" trend={g.quizzesGrowthPct} sub={`+${g.quizzes7d} this week`} />
                <KPICard label="Activation Rate" value={`${e.activationRate}%`} color={e.activationRate >= 30 ? "#34d399" : "#fb923c"} sub={`${e.activatedScholars} of ${k.totalScholars} scholars`} />
              </RGrid>

              <RGrid cols={4} style={{ marginTop: 12 }}>
                <KPICard label="Scholar / Parent" value={e.scholarPerParent} color="#a78bfa" sub="avg ratio" small />
                <KPICard label="Avg Accuracy" value={`${e.avgAccuracy}%`} color={e.avgAccuracy >= 60 ? "#34d399" : "#fb923c"} sub="across all quizzes" small />
                <KPICard label="Avg Quiz Time" value={`${e.avgTimeMin}m`} color="#22d3ee" sub="per session" small />
                <KPICard label="Topic Mastery" value={k.totalTopicMastery} color="#f472b6" sub="records tracked" small />
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
                <DonutChart data={d_.ageBand || []} label="Scholars by Age Band" />
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
                  <div style={S.sectionTitle}>Top Performers</div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={S.table}>
                      <thead>
                        <tr>
                          <th style={S.th}>#</th>
                          <th style={S.th}>Scholar</th>
                          <th style={S.th}>Band</th>
                          <th style={S.th}>XP</th>
                          <th style={S.th}>Quizzes</th>
                          <th style={S.th}>Avg Accuracy</th>
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

          {/* ══════ CONTENT TAB ══════ */}
          {tab === "content" && (
            <>
              <RGrid cols={3}>
                <KPICard label="Total Questions" value={formatNum(k.totalQuestions)} color="#a78bfa" sub="in question bank" />
                <KPICard label="Active Questions" value={formatNum(k.activeQuestions)} color="#34d399" sub="serving to scholars" />
                <KPICard label="Inactive/Purged" value={formatNum((k.totalQuestions || 0) - (k.activeQuestions || 0))} color="#f87171" sub="flagged or deleted" />
              </RGrid>
              <div style={{ marginTop: 16 }}>
                <div style={S.sectionTitle}>Content Health</div>
                <div style={S.card}>
                  <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, lineHeight: 1.7 }}>
                    <strong style={{ color: "#a78bfa" }}>{formatNum(k.activeQuestions)}</strong> active questions across all curricula.
                    Coverage spans <strong style={{ color: "#60a5fa" }}>UK National, 11+, Nigerian (Primary/JSS/SSS), Canadian, Australian, IB, and US Common Core</strong>.
                  </p>
                </div>
              </div>
              {(d_.subject || []).length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <HorizontalBars data={d_.subject} label="Quiz Activity by Subject" color="#a78bfa" />
                </div>
              )}
            </>
          )}

          {/* ══════ SCHOLARS TAB ══════ */}
          {tab === "scholars" && (
            <>
              <RGrid cols={3}>
                <KPICard label="Total Scholars" value={k.totalScholars} color="#34d399" trend={g.scholarsGrowthPct} sub={`+${g.newScholars7d} this week`} />
                <KPICard label="Total Parents" value={k.totalParents} color="#60a5fa" trend={g.parentsGrowthPct} sub={`+${g.newParents7d} this week`} />
                <KPICard label="Activated" value={e.activatedScholars} color="#fbbf24" sub={`${e.activationRate}% rate`} />
              </RGrid>
              <div style={S.sectionTitle}>Recent Scholars</div>
              <div style={{ overflowX: "auto" }}>
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={S.th}>Name</th>
                      <th style={S.th}>Band</th>
                      <th style={S.th}>Curriculum</th>
                      <th style={S.th}>XP</th>
                      <th style={S.th}>Quizzes</th>
                      <th style={S.th}>Topics</th>
                      <th style={S.th}>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.recentScholars || []).map(s => (
                      <tr key={s.id}>
                        <td style={{ ...S.td, fontWeight: 600, color: "#e2e8f0" }}>{s.name || "\u2014"}</td>
                        <td style={S.td}><span style={S.badge(bandColor(s.age_band))}>{(s.age_band || "\u2014").toUpperCase()}</span></td>
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
          [style*="grid-template-columns: repeat(auto-fill"] {
            grid-template-columns: 1fr 1fr !important;
          }
        }
        @media (max-width: 480px) {
          [style*="grid-template-columns: repeat(auto-fill"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

// ── Schools Tab ─────────────────────────────────────────────────────────────
function SchoolsTab({ totalSchools }) {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await sb().from("schools").select("*").order("name").limit(100);
        setSchools(data || []);
      } catch (e) { console.warn(e); }
      finally { setLoading(false); }
    })();
  }, []);

  const countryFlag = (c) => ({ GB: "\ud83c\uddec\ud83c\udde7", NG: "\ud83c\uddf3\ud83c\uddec", AU: "\ud83c\udde6\ud83c\uddfa", CA: "\ud83c\udde8\ud83c\udde6", CH: "\ud83c\udde8\ud83c\udded" }[c] || "\ud83c\udf0d");

  return (
    <>
      <RGrid cols={2}>
        <KPICard label="Total Schools" value={totalSchools || 0} color="#f472b6" sub="in database" />
        <KPICard label="Countries" value={[...new Set(schools.map(s => s.country).filter(Boolean))].length} color="#22d3ee" sub="represented" />
      </RGrid>
      <div style={S.sectionTitle}>Schools ({schools.length})</div>
      {loading ? <div style={S.empty}>Loading...</div> : (
        <div style={{ overflowX: "auto" }}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>School</th>
                <th style={S.th}>Region</th>
                <th style={S.th}>Country</th>
                <th style={S.th}>Curriculum</th>
                <th style={S.th}>Type</th>
                <th style={S.th}>Verified</th>
              </tr>
            </thead>
            <tbody>
              {schools.map(s => (
                <tr key={s.id}>
                  <td style={{ ...S.td, fontWeight: 600, color: "#e2e8f0" }}>{s.name}</td>
                  <td style={S.td}>{s.region || "\u2014"}</td>
                  <td style={S.td}>{countryFlag(s.country)} {s.country}</td>
                  <td style={S.td}>{formatCurriculum(s.curriculum)}</td>
                  <td style={S.td}><span style={S.badge(s.school_type === "primary" ? "#34d399" : "#60a5fa")}>{s.school_type || "\u2014"}</span></td>
                  <td style={S.td}>{s.verified ? "\u2713" : "\u2014"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatNum(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n || 0);
}

function formatCurriculum(c) {
  if (!c) return "\u2014";
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
  if (!d) return "\u2014";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
