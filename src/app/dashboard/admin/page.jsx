"use client";
// ─── Admin Dashboard ─────────────────────────────────────────────────────────
// Overview page with KPIs, charts, and quick-access panels.
// Route: /dashboard/admin
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";

// ── Supabase client ─────────────────────────────────────────────────────────
function sb() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

// ── Admin email whitelist (expand as needed) ────────────────────────────────
const ADMIN_EMAILS = [
  "ogunwede.r@gmail.com",
  "admin@launchpard.com",
];

// ── Icons (inline SVG — same pattern as parent dashboard) ───────────────────
const Icon = ({ d, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
);

const UsersIcon = () => <Icon d={["M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2","M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8","M23 21v-2a4 4 0 0 0-3-3.87","M16 3.13a4 4 0 0 1 0 7.75"]} />;
const BookIcon = () => <Icon d={["M4 19.5A2.5 2.5 0 0 1 6.5 17H20","M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15z"]} />;
const SchoolIcon = () => <Icon d={["M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z","M9 22V12h6v10"]} />;
const TrendIcon = () => <Icon d={["M23 6l-9.5 9.5-5-5L1 18"]} />;
const CoinIcon = () => <Icon d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 6v12M8 12h8" />;
const CalendarIcon = () => <Icon d={["M16 2v4M8 2v4","M3 10h18","M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"]} />;
const RefreshIcon = () => <Icon d={["M23 4v6h-6","M1 20v-6h6","M3.51 9a9 9 0 0 1 14.85-3.36L23 10","M1 14l4.64 4.36A9 9 0 0 0 20.49 15"]} />;
const LogOutIcon = () => <Icon size={18} d={["M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4","M16 17l5-5-5-5","M21 12H9"]} />;

// ── Styles (dark theme matching the platform) ───────────────────────────────
const S = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0a0f1a 0%, #111827 50%, #0a0f1a 100%)",
    color: "#e2e8f0",
    fontFamily: "'DM Sans', 'Nunito', system-ui, sans-serif",
  },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  title: {
    fontSize: 22, fontWeight: 800, color: "#fbbf24",
    letterSpacing: "-0.02em",
  },
  subtitle: { fontSize: 13, color: "rgba(255,255,255,0.45)", marginTop: 2 },
  nav: {
    display: "flex", gap: 6, padding: "12px 24px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    overflowX: "auto",
  },
  navLink: (active) => ({
    padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
    background: active ? "rgba(251,191,36,0.12)" : "transparent",
    color: active ? "#fbbf24" : "rgba(255,255,255,0.5)",
    border: active ? "1px solid rgba(251,191,36,0.2)" : "1px solid transparent",
    textDecoration: "none", cursor: "pointer", whiteSpace: "nowrap",
    transition: "all 0.2s",
  }),
  grid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: 16, padding: "20px 24px",
  },
  card: {
    background: "rgba(255,255,255,0.03)", borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.06)", padding: "18px 20px",
    transition: "all 0.2s",
  },
  cardLabel: { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.4)" },
  cardValue: { fontSize: 28, fontWeight: 900, marginTop: 6, letterSpacing: "-0.02em" },
  cardSub: { fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 4 },
  section: { padding: "8px 24px 20px" },
  sectionTitle: { fontSize: 15, fontWeight: 700, marginBottom: 12, color: "rgba(255,255,255,0.7)" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: {
    textAlign: "left", padding: "10px 12px", fontWeight: 700, fontSize: 11,
    textTransform: "uppercase", letterSpacing: "0.08em",
    color: "rgba(255,255,255,0.35)", borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  td: {
    padding: "10px 12px", borderBottom: "1px solid rgba(255,255,255,0.04)",
    color: "rgba(255,255,255,0.7)",
  },
  badge: (color) => ({
    display: "inline-block", padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700,
    background: `${color}18`, color, border: `1px solid ${color}30`,
  }),
  btn: {
    padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700,
    background: "rgba(251,191,36,0.12)", color: "#fbbf24",
    border: "1px solid rgba(251,191,36,0.2)", cursor: "pointer",
    display: "inline-flex", alignItems: "center", gap: 6,
  },
  empty: { textAlign: "center", padding: 40, color: "rgba(255,255,255,0.3)", fontSize: 14 },
};

// ── Bar chart (pure CSS) ────────────────────────────────────────────────────
function MiniBar({ data, label, color = "#fbbf24" }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={S.card}>
      <div style={S.cardLabel}>{label}</div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 60, marginTop: 12 }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{
              width: "100%", maxWidth: 32,
              height: `${Math.max((d.value / max) * 50, 2)}px`,
              background: color, borderRadius: "4px 4px 0 0", opacity: 0.8,
              transition: "height 0.5s ease",
            }} />
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [stats, setStats] = useState(null);
  const [scholars, setScholars] = useState([]);
  const [currDist, setCurrDist] = useState([]);
  const [recentSessions, setRecentSessions] = useState([]);
  const [tab, setTab] = useState("overview");

  // ── Auth check (waits for session hydration) ─────────────────────────────
  useEffect(() => {
    const supabase = sb();
    // Listen for auth state — fires immediately once session hydrates
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const user = session?.user;
        if (!user || !ADMIN_EMAILS.includes(user.email)) {
          // Only redirect after INITIAL_SESSION (hydration done, still no valid admin)
          if (event === "INITIAL_SESSION" || event === "SIGNED_OUT") {
            router.replace("/dashboard/parent");
          }
          return;
        }
        setAuthed(true);
        await loadData(supabase);
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  // ── Data loader ───────────────────────────────────────────────────────────
  const loadData = useCallback(async (supabase) => {
    setLoading(true);
    try {
      // Parallel queries
      const [
        { count: totalParents },
        { count: totalScholars },
        { count: totalQuestions },
        { count: totalSessions },
        { count: totalSchools },
        { count: totalSubscriptions },
        { data: scholarsData },
        { data: sessionsData },
        { count: quizResults },
        { count: newScholars7d },
      ] = await Promise.all([
        supabase.from("parents").select("*", { count: "exact", head: true }),
        supabase.from("scholars").select("*", { count: "exact", head: true }),
        supabase.from("question_bank").select("*", { count: "exact", head: true }),
        supabase.from("scholar_sessions").select("*", { count: "exact", head: true }),
        supabase.from("schools").select("*", { count: "exact", head: true }),
        supabase.from("subscriptions").select("*", { count: "exact", head: true }),
        supabase.from("scholars").select("id, name, age_band, curriculum, created_at, school_id").order("created_at", { ascending: false }).limit(50),
        supabase.from("scholar_sessions").select("id, scholar_id, started_at, ended_at, questions_answered, correct_count").order("started_at", { ascending: false }).limit(20),
        supabase.from("quiz_results").select("*", { count: "exact", head: true }),
        supabase.from("scholars").select("*", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()),
      ]);

      // Curriculum distribution
      const dist = {};
      (scholarsData || []).forEach(s => {
        const c = s.curriculum || "unknown";
        dist[c] = (dist[c] || 0) + 1;
      });
      const distArr = Object.entries(dist).map(([k, v]) => ({ label: k.replace("uk_", "UK ").replace("ng_", "NG ").replace("ca_", "CA "), value: v }))
        .sort((a, b) => b.value - a.value);

      setStats({
        totalParents: totalParents || 0,
        totalScholars: totalScholars || 0,
        totalQuestions: totalQuestions || 0,
        totalSessions: totalSessions || 0,
        totalSchools: totalSchools || 0,
        totalSubscriptions: totalSubscriptions || 0,
        quizResults: quizResults || 0,
        newScholars7d: newScholars7d || 0,
      });
      setScholars(scholarsData || []);
      setCurrDist(distArr);
      setRecentSessions(sessionsData || []);
    } catch (err) {
      console.error("Admin data load error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLogout = async () => {
    await sb().auth.signOut();
    router.replace("/login");
  };

  // ── Loading / unauthorized ────────────────────────────────────────────────
  if (!authed) {
    return (
      <div style={{ ...S.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "rgba(255,255,255,0.5)" }}>
            {loading ? "Verifying access..." : "Not authorized"}
          </div>
        </div>
      </div>
    );
  }

  // ── Tabs ──────────────────────────────────────────────────────────────────
  const TABS = [
    { id: "overview", label: "Overview" },
    { id: "users", label: "Users & Scholars" },
    { id: "content", label: "Content" },
    { id: "schools", label: "Schools" },
    { id: "engagement", label: "Engagement" },
  ];

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div>
          <div style={S.title}>Admin Dashboard</div>
          <div style={S.subtitle}>LaunchPard / Quest Academy — Platform Overview</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button style={S.btn} onClick={() => loadData(sb())}>
            <RefreshIcon /> Refresh
          </button>
          <Link href="/dashboard/parent" style={{ ...S.btn, textDecoration: "none", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.08)" }}>
            Parent View
          </Link>
          <button style={{ ...S.btn, background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }} onClick={handleLogout}>
            <LogOutIcon /> Logout
          </button>
        </div>
      </div>

      {/* Nav tabs */}
      <div style={S.nav}>
        {TABS.map(t => (
          <button key={t.id} style={S.navLink(tab === t.id)} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={S.empty}>Loading dashboard data...</div>
      ) : (
        <>
          {/* ── OVERVIEW TAB ─────────────────────────────────────── */}
          {tab === "overview" && (
            <>
              {/* KPI Cards */}
              <div style={S.grid}>
                <KPICard icon={<UsersIcon />} label="Parents" value={stats.totalParents} color="#60a5fa" />
                <KPICard icon={<UsersIcon />} label="Scholars" value={stats.totalScholars} sub={`+${stats.newScholars7d} this week`} color="#34d399" />
                <KPICard icon={<BookIcon />} label="Question Bank" value={formatNum(stats.totalQuestions)} color="#a78bfa" />
                <KPICard icon={<TrendIcon />} label="Quiz Sessions" value={stats.totalSessions} color="#fbbf24" />
                <KPICard icon={<SchoolIcon />} label="Schools" value={stats.totalSchools} color="#f472b6" />
                <KPICard icon={<CoinIcon />} label="Subscriptions" value={stats.totalSubscriptions} sub="Pro + Exam" color="#fb923c" />
              </div>

              {/* Charts row */}
              <div style={{ ...S.grid, gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
                <MiniBar data={currDist.length ? currDist : [{ label: "—", value: 0 }]} label="Scholars by Curriculum" color="#60a5fa" />
                <MiniBar
                  data={[
                    { label: "KS1", value: scholars.filter(s => s.age_band === "ks1").length },
                    { label: "KS2", value: scholars.filter(s => s.age_band === "ks2").length },
                    { label: "KS3", value: scholars.filter(s => s.age_band === "ks3").length },
                    { label: "KS4", value: scholars.filter(s => s.age_band === "ks4").length },
                  ]}
                  label="Scholars by Age Band"
                  color="#34d399"
                />
              </div>

              {/* Quick Actions */}
              <QuickActionsPanel />

              {/* Recent scholars table */}
              <div style={S.section}>
                <div style={S.sectionTitle}>Recent Scholars</div>
                <div style={{ overflowX: "auto" }}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>Name</th>
                        <th style={S.th}>Age Band</th>
                        <th style={S.th}>Curriculum</th>
                        <th style={S.th}>Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scholars.slice(0, 10).map(s => (
                        <tr key={s.id}>
                          <td style={S.td}>{s.name || "—"}</td>
                          <td style={S.td}>
                            <span style={S.badge(bandColor(s.age_band))}>{(s.age_band || "—").toUpperCase()}</span>
                          </td>
                          <td style={S.td}>{formatCurriculum(s.curriculum)}</td>
                          <td style={S.td}>{fmtDate(s.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ── USERS TAB ────────────────────────────────────────── */}
          {tab === "users" && <UsersTab scholars={scholars} stats={stats} />}

          {/* ── CONTENT TAB ──────────────────────────────────────── */}
          {tab === "content" && <ContentTab stats={stats} />}

          {/* ── SCHOOLS TAB ──────────────────────────────────────── */}
          {tab === "schools" && <SchoolsTab />}

          {/* ── ENGAGEMENT TAB ───────────────────────────────────── */}
          {tab === "engagement" && <EngagementTab sessions={recentSessions} stats={stats} />}
        </>
      )}
    </div>
  );
}

// ── KPI Card ────────────────────────────────────────────────────────────────
function KPICard({ icon, label, value, sub, color = "#fbbf24" }) {
  return (
    <div style={{ ...S.card, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 14, right: 16, opacity: 0.15, color }}>{icon}</div>
      <div style={S.cardLabel}>{label}</div>
      <div style={{ ...S.cardValue, color }}>{value}</div>
      {sub && <div style={S.cardSub}>{sub}</div>}
    </div>
  );
}

// ── Quick Actions Panel ─────────────────────────────────────────────────────
function QuickActionsPanel() {
  const [sendingReminders, setSendingReminders] = useState(false);
  const [reminderResult, setReminderResult] = useState(null);

  const handleSendSchoolReminders = async () => {
    setSendingReminders(true);
    setReminderResult(null);
    try {
      const res = await fetch("/api/emails/school-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batch: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setReminderResult({ ok: false, msg: data.error || "Failed" });
      } else if (data.sent === 0) {
        setReminderResult({ ok: true, msg: "No scholars missing school info." });
      } else {
        setReminderResult({ ok: true, msg: `Sent to ${data.sent} parent${data.sent > 1 ? "s" : ""} (${data.totalScholars} scholar${data.totalScholars > 1 ? "s" : ""})` });
      }
    } catch (err) {
      setReminderResult({ ok: false, msg: err.message });
    } finally {
      setSendingReminders(false);
    }
  };

  return (
    <div style={S.section}>
      <div style={S.sectionTitle}>Quick Actions</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        <button
          onClick={handleSendSchoolReminders}
          disabled={sendingReminders}
          style={{
            padding: "10px 18px",
            borderRadius: 10,
            border: "1.5px solid rgba(244,114,182,0.3)",
            background: sendingReminders ? "rgba(244,114,182,0.1)" : "rgba(244,114,182,0.08)",
            color: "#f472b6",
            fontWeight: 700,
            fontSize: 13,
            cursor: sendingReminders ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            opacity: sendingReminders ? 0.6 : 1,
            transition: "all 0.2s",
          }}
        >
          <SchoolIcon />
          {sendingReminders ? "Sending..." : "Send School Reminders"}
        </button>
        {reminderResult && (
          <span style={{
            display: "flex",
            alignItems: "center",
            fontSize: 12,
            fontWeight: 600,
            color: reminderResult.ok ? "#34d399" : "#f87171",
            padding: "6px 12px",
            borderRadius: 8,
            background: reminderResult.ok ? "rgba(52,211,153,0.1)" : "rgba(248,113,113,0.1)",
          }}>
            {reminderResult.ok ? "✓" : "✕"} {reminderResult.msg}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Users Tab ───────────────────────────────────────────────────────────────
function UsersTab({ scholars, stats }) {
  return (
    <div style={S.section}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <KPICard label="Total Parents" value={stats.totalParents} color="#60a5fa" icon={<UsersIcon />} />
        <KPICard label="Total Scholars" value={stats.totalScholars} color="#34d399" icon={<UsersIcon />} />
      </div>
      <div style={S.sectionTitle}>All Scholars</div>
      <div style={{ overflowX: "auto" }}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Name</th>
              <th style={S.th}>Age Band</th>
              <th style={S.th}>Curriculum</th>
              <th style={S.th}>Joined</th>
            </tr>
          </thead>
          <tbody>
            {scholars.map(s => (
              <tr key={s.id}>
                <td style={S.td}>{s.name || "—"}</td>
                <td style={S.td}><span style={S.badge(bandColor(s.age_band))}>{(s.age_band || "—").toUpperCase()}</span></td>
                <td style={S.td}>{formatCurriculum(s.curriculum)}</td>
                <td style={S.td}>{fmtDate(s.created_at)}</td>
              </tr>
            ))}
            {scholars.length === 0 && (
              <tr><td colSpan={4} style={{ ...S.td, textAlign: "center", color: "rgba(255,255,255,0.3)" }}>No scholars yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Content Tab ─────────────────────────────────────────────────────────────
function ContentTab({ stats }) {
  return (
    <div style={S.section}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16, marginBottom: 20 }}>
        <KPICard label="Question Bank" value={formatNum(stats.totalQuestions)} color="#a78bfa" icon={<BookIcon />} />
        <KPICard label="Quiz Results" value={stats.quizResults} color="#fbbf24" icon={<TrendIcon />} />
      </div>
      <div style={S.sectionTitle}>Content Health</div>
      <div style={S.card}>
        <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, lineHeight: 1.6 }}>
          The question bank contains <strong style={{ color: "#a78bfa" }}>{formatNum(stats.totalQuestions)}</strong> questions
          across all curricula and age bands. Questions are generated via the OpenRouter AI pipeline
          and cached in the question_bank table for fast retrieval.
        </p>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 8 }}>
          Supported curricula: UK National, 11+, US Common Core, AUS ACARA, IB PYP/MYP, NG Primary/JSS/SSS, CA Primary/Secondary
        </p>
      </div>
    </div>
  );
}

// ── Schools Tab ─────────────────────────────────────────────────────────────
function SchoolsTab() {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await sb().from("schools").select("*").order("name");
      setSchools(data || []);
      setLoading(false);
    })();
  }, []);

  const countryFlag = (c) => ({ GB: "🇬🇧", NG: "🇳🇬", AU: "🇦🇺", CA: "🇨🇦", CH: "🇨🇭" }[c] || "🌍");

  return (
    <div style={S.section}>
      <div style={S.sectionTitle}>Schools ({schools.length})</div>
      {loading ? (
        <div style={S.empty}>Loading schools...</div>
      ) : (
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
                  <td style={S.td}>{s.name}</td>
                  <td style={S.td}>{s.region || "—"}</td>
                  <td style={S.td}>{countryFlag(s.country)} {s.country}</td>
                  <td style={S.td}>{formatCurriculum(s.curriculum)}</td>
                  <td style={S.td}><span style={S.badge(s.school_type === "primary" ? "#34d399" : "#60a5fa")}>{s.school_type || "—"}</span></td>
                  <td style={S.td}>{s.verified ? "✓" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Engagement Tab ──────────────────────────────────────────────────────────
function EngagementTab({ sessions, stats }) {
  return (
    <div style={S.section}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16, marginBottom: 20 }}>
        <KPICard label="Total Sessions" value={stats.totalSessions} color="#fbbf24" icon={<TrendIcon />} />
        <KPICard label="Quiz Results" value={stats.quizResults} color="#34d399" icon={<BookIcon />} />
      </div>
      <div style={S.sectionTitle}>Recent Sessions</div>
      <div style={{ overflowX: "auto" }}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Scholar</th>
              <th style={S.th}>Started</th>
              <th style={S.th}>Questions</th>
              <th style={S.th}>Correct</th>
              <th style={S.th}>Accuracy</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map(s => {
              const acc = s.questions_answered ? Math.round((s.correct_count / s.questions_answered) * 100) : 0;
              return (
                <tr key={s.id}>
                  <td style={S.td}>{s.scholar_id?.slice(0, 8) || "—"}</td>
                  <td style={S.td}>{fmtDate(s.started_at)}</td>
                  <td style={S.td}>{s.questions_answered || 0}</td>
                  <td style={S.td}>{s.correct_count || 0}</td>
                  <td style={S.td}>
                    <span style={S.badge(acc >= 70 ? "#34d399" : acc >= 40 ? "#fbbf24" : "#ef4444")}>
                      {acc}%
                    </span>
                  </td>
                </tr>
              );
            })}
            {sessions.length === 0 && (
              <tr><td colSpan={5} style={{ ...S.td, textAlign: "center", color: "rgba(255,255,255,0.3)" }}>No sessions yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function formatNum(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n || 0);
}

function formatCurriculum(c) {
  if (!c) return "—";
  return c.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
}

function bandColor(b) {
  return { ks1: "#f472b6", ks2: "#60a5fa", ks3: "#34d399", ks4: "#a78bfa" }[b] || "#94a3b8";
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
