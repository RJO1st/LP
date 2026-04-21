"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";
import { apiFetch } from "@/lib/apiFetch";
import { CURRICULA, SUBJECTS_BY_CURRICULUM, getLevelInfo } from "@/lib/constants";
import SkillHeatmap from "@/components/parent/SkillHeatmap";
import ReadinessScore from "@/components/ReadinessScore";
import TimeChart from "./TimeChart";
import Goals from "./Goals";

// ── Icons ─────────────────────────────────────────────────────────────────────
const ArrowLeftIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>
  </svg>
);
const TargetIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
  </svg>
);
const ClockIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
  </svg>
);
const ZapIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
);
const TrendingUpIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
  </svg>
);

// ── Constants ─────────────────────────────────────────────────────────────────
/** Capitalise a snake_case slug into proper English: "counting_objects" → "Counting Objects" */
function titleCase(str) {
  return (str || "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

const SUBJECT_META = {
  mathematics:    { emoji: "📚", label: "Mathematics",  color: "bg-indigo-100 text-indigo-700" },
  maths:          { emoji: "🔢", label: "Maths",        color: "bg-indigo-100 text-indigo-700" },
  math:           { emoji: "🔢", label: "Math",         color: "bg-indigo-100 text-indigo-700" },
  english:        { emoji: "📖", label: "English",      color: "bg-blue-100 text-blue-700" },
  english_studies: { emoji: "📖", label: "English",     color: "bg-blue-100 text-blue-700" },
  verbal_reasoning: { emoji: "🧩", label: "Verbal Reasoning", color: "bg-purple-100 text-purple-700" },
  verbal:         { emoji: "🧩", label: "Verbal",       color: "bg-purple-100 text-purple-700" },
  nvr:            { emoji: "🔷", label: "Non-Verbal Reasoning", color: "bg-teal-100 text-teal-700" },
  science:        { emoji: "🔬", label: "Science",      color: "bg-green-100 text-green-700" },
  basic_science:  { emoji: "🧪", label: "Science",      color: "bg-lime-100 text-lime-700" },
  geography:      { emoji: "🌍", label: "Geography",    color: "bg-amber-100 text-amber-700" },
  history:        { emoji: "📜", label: "History",       color: "bg-rose-100 text-rose-700" },
  physics:        { emoji: "⚛️", label: "Physics",      color: "bg-sky-100 text-sky-700" },
  chemistry:      { emoji: "🧪", label: "Chemistry",    color: "bg-lime-100 text-lime-700" },
  biology:        { emoji: "🧬", label: "Biology",      color: "bg-green-100 text-green-700" },
  commerce:       { emoji: "💰", label: "Commerce",     color: "bg-amber-100 text-amber-700" },
  computing:      { emoji: "💻", label: "Computing",    color: "bg-indigo-100 text-indigo-700" },
  computer_science: { emoji: "💻", label: "Computer Science", color: "bg-indigo-100 text-indigo-700" },
  basic_technology: { emoji: "🔧", label: "Technology", color: "bg-stone-100 text-stone-700" },
  basic_digital_literacy: { emoji: "💻", label: "Digital Skills", color: "bg-indigo-100 text-indigo-700" },
  design_and_technology: { emoji: "🛠️", label: "Design & Technology", color: "bg-orange-100 text-orange-700" },
  religious_education: { emoji: "🕊️", label: "Religious Education", color: "bg-violet-100 text-violet-700" },
  religious_studies: { emoji: "🕊️", label: "Religious Studies", color: "bg-violet-100 text-violet-700" },
  civic_education: { emoji: "🏛️", label: "Civic Education", color: "bg-blue-100 text-blue-700" },
  social_studies: { emoji: "👥", label: "Social Studies", color: "bg-cyan-100 text-cyan-700" },
  financial_accounting: { emoji: "📊", label: "Financial Accounting", color: "bg-emerald-100 text-emerald-700" },
  further_mathematics: { emoji: "📐", label: "Further Maths", color: "bg-indigo-100 text-indigo-700" },
  economics:      { emoji: "📈", label: "Economics",    color: "bg-teal-100 text-teal-700" },
  government:     { emoji: "🏛️", label: "Government",  color: "bg-blue-100 text-blue-700" },
  business_studies: { emoji: "💼", label: "Business Studies", color: "bg-purple-100 text-purple-700" },
  business_education: { emoji: "💼", label: "Business Studies", color: "bg-purple-100 text-purple-700" },
  agricultural_science: { emoji: "🌱", label: "Agriculture", color: "bg-green-100 text-green-700" },
  literature:     { emoji: "📕", label: "Literature",   color: "bg-rose-100 text-rose-700" },
};

const TABS         = ["Overview", "Skills", "Study Time", "Goals"];
const TIME_PERIODS = [{ label: "Week", value: "week" }, { label: "Month", value: "month" }, { label: "Year", value: "year" }];

// ── Stat card ─────────────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, sub }) => (
  <div className="bg-white dark:bg-slate-800/60 border-2 sm:border-4 border-slate-100 dark:border-white/10 border-b-4 sm:border-b-8 rounded-2xl sm:rounded-3xl p-3 sm:p-5 flex items-start gap-3 sm:gap-4">
    <div className="p-2 sm:p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700/40 text-slate-600 dark:text-slate-400 shrink-0">{icon}</div>
    <div className="min-w-0">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1 truncate">{label}</p>
      <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-none">{value}</p>
      {sub && <p className="text-[11px] font-bold text-slate-400 dark:text-slate-400 mt-1">{sub}</p>}
    </div>
  </div>
);

export default function ScholarInsights({ params }) {
  const { id }   = React.use(params);
  const router   = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const [scholar,   setScholar]   = useState(null);
  const [skills,    setSkills]    = useState([]);
  const [timeData,  setTimeData]  = useState([]);
  const [goals,     setGoals]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState("Overview");
  const [period,    setPeriod]    = useState("week");

  // ── Initial fetch ─────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      const { data: scholarData, error } = await supabase
        .from("scholars").select("*").eq("id", id).single();
      if (error || !scholarData) { router.push("/dashboard/parent"); return; }
      setScholar(scholarData);

      const [sr, tr, gr] = await Promise.all([
        fetch(`/api/parent/skills?scholar_id=${id}`),
        fetch(`/api/parent/time?scholar_id=${id}&period=week`),
        fetch(`/api/parent/goals?scholar_id=${id}`),
      ]);
      if (sr.ok) setSkills(await sr.json());
      if (tr.ok) setTimeData(await tr.json());
      if (gr.ok) setGoals(await gr.json());
      setLoading(false);
    };
    fetchData();
  }, [id, supabase, router]);

  // ── Refetch time on period change ─────────────────────────────────────────
  useEffect(() => {
    if (!scholar) return;
    fetch(`/api/parent/time?scholar_id=${id}&period=${period}`)
      .then(r => r.ok ? r.json() : [])
      .then(setTimeData);
  }, [period, id, scholar]);

  // ── Goal handlers ─────────────────────────────────────────────────────────
  const handleAddGoal = async (goal) => {
    const { data: { user } } = await supabase.auth.getUser();
    const res = await apiFetch("/api/parent/goals", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...goal, parent_id: user?.id }),
    });
    if (res.ok) {
      const newGoal = await res.json();
      setGoals(prev => [newGoal, ...prev]);
    }
  };

  const handleToggleGoal = async (goalId, achieved) => {
    const res = await apiFetch(`/api/parent/goals/${goalId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ achieved }),
    });
    if (res.ok) setGoals(prev => prev.map(g => g.id === goalId ? { ...g, achieved, achieved_at: achieved ? new Date().toISOString() : null } : g));
  };

  // ── Derived data ──────────────────────────────────────────────────────────
  const currInfo      = scholar ? (CURRICULA[scholar.curriculum]           || CURRICULA.uk_11plus)           : null;
  const subjects      = scholar ? (SUBJECTS_BY_CURRICULUM[scholar.curriculum] || SUBJECTS_BY_CURRICULUM.uk_11plus) : [];
  const levelInfo     = scholar ? getLevelInfo(scholar.total_xp || 0) : null;
  const avgAccuracy   = skills.length > 0 ? Math.round(skills.reduce((s, k) => s + (k.score ?? 0), 0) / skills.length) : 0;
  const weeklyMinutes = timeData.reduce((s, d) => s + (d.minutes || 0), 0);
  const masteredCount = skills.filter(s => s.score >= 80).length;
  const needsWorkCount= skills.filter(s => s.score < 50 && (s.attempts || 0) > 0).length;

  if (loading) return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#080c15] flex items-center justify-center">
      <div className="w-12 h-12 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#080c15] font-sans pb-24">

      {/* NAV */}
      <nav className="bg-white dark:bg-slate-800/60 border-b border-slate-200 dark:border-white/10 px-3 sm:px-6 py-3 sm:py-4 flex items-center gap-3 sm:gap-4 sticky top-0 z-50 shadow-sm dark:shadow-black/20">
        <Link href="/dashboard/parent" className="flex items-center gap-2 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 font-bold transition-colors">
          <ArrowLeftIcon /> <span className="hidden sm:inline">Mission Control</span>
        </Link>
        <div className="w-px h-5 bg-slate-200 dark:bg-white/10" />
        <span className="font-black text-slate-800 dark:text-white text-lg truncate">{scholar?.name}</span>
        {currInfo && (
          <span className="ml-auto hidden sm:flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700/40 text-slate-600 dark:text-slate-300 font-bold px-3 py-1.5 rounded-xl text-xs">
            {currInfo.country} {currInfo.name} · {currInfo.gradeLabel} {scholar?.year}
          </span>
        )}
      </nav>

      <main className="max-w-6xl mx-auto px-3 sm:px-6 pt-6 sm:pt-10">

        {/* SCHOLAR HERO */}
        <div className="bg-white dark:bg-slate-800/60 border-2 sm:border-4 border-slate-100 dark:border-white/10 border-b-4 sm:border-b-8 rounded-2xl sm:rounded-[40px] p-4 sm:p-8 mb-4 sm:mb-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white mb-2 sm:mb-3">{scholar?.name}</h1>
              <div className="flex flex-wrap items-center gap-2">
                {currInfo && <>
                  <span className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700/40 text-slate-700 dark:text-slate-300 font-bold px-3 py-1.5 rounded-xl text-sm">
                    {currInfo.country} {currInfo.name}
                  </span>
                  <span className="bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 font-bold px-3 py-1.5 rounded-xl text-sm">
                    {currInfo.gradeLabel} {scholar?.year}
                  </span>
                </>}
                {levelInfo && (
                  <span className="bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold px-3 py-1.5 rounded-xl text-sm">
                    ⚡ Lv.{levelInfo.current.level} {levelInfo.current.title}
                  </span>
                )}
              </div>
            </div>

            {/* XP + Level bar */}
            <div className="text-right shrink-0">
              <div className="flex items-baseline gap-1.5 justify-end mb-2">
                <span className="text-xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">{(scholar?.total_xp || 0).toLocaleString()}</span>
                <span className="text-sm font-bold text-slate-400 dark:text-slate-500">XP</span>
              </div>
              {levelInfo?.next && (
                <div className="w-32 sm:w-44">
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1">
                    <span>Lv.{levelInfo.current.level}</span>
                    <span>{levelInfo.progressPct}% → Lv.{levelInfo.next.level}</span>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-700/40 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 dark:bg-amber-500 rounded-full transition-all duration-700" style={{ width: `${levelInfo.progressPct}%` }} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Subject averages */}
          <div className="flex flex-wrap gap-2 mt-5 pt-5 border-t border-slate-100 dark:border-white/10">
            {subjects.map(s => {
              const m   = SUBJECT_META[s] || { emoji: "📚", label: titleCase(s), color: "bg-slate-100 text-slate-700" };
              const arr = skills.filter(sk => sk.subject === s);
              const avg = arr.length > 0 ? Math.round(arr.reduce((sum, sk) => sum + sk.score, 0) / arr.length) : null;
              return (
                <span key={s} className={`inline-flex items-center gap-1.5 ${m.color} font-bold px-3 py-1.5 rounded-xl text-sm`}>
                  {m.emoji} {m.label}
                  {avg !== null && <span className="opacity-60">· {avg}%</span>}
                </span>
              );
            })}
          </div>
        </div>

        {/* QUICK STATS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-8">
          <StatCard icon={<TargetIcon />} label="Avg Accuracy"  value={`${avgAccuracy}%`}   sub={`${skills.length} topics tracked`} />
          <StatCard icon={<ClockIcon />}  label="Study Time"    value={`${weeklyMinutes}m`}  sub="this week" />
          <StatCard icon={<ZapIcon />}    label="Mastered"      value={masteredCount}         sub="topics ≥ 80%" />
          <StatCard icon={<TrendingUpIcon />} label="Needs Work" value={needsWorkCount}       sub="topics < 50%" />
        </div>

        {/* TABS */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wide whitespace-nowrap transition-all
                ${activeTab === tab ? "bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-black/20" : "bg-white dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-2 border-slate-200 dark:border-white/10 hover:border-indigo-300 dark:hover:border-indigo-500/30 hover:text-indigo-600 dark:hover:text-indigo-400"}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* TAB: OVERVIEW */}
        {activeTab === "Overview" && (
          <div className="space-y-6">

            {/* Exam Readiness (visible for all scholars) */}
            <div className="bg-white dark:bg-slate-800/60 border-2 sm:border-4 border-slate-100 dark:border-white/10 border-b-4 sm:border-b-8 rounded-2xl sm:rounded-3xl p-4 sm:p-6">
              <h3 className="font-black text-lg text-slate-800 dark:text-white mb-4">🎯 Exam Readiness</h3>
              <ReadinessScore scholarId={id} supabase={supabase} />
            </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Subject bars */}
            <div className="bg-white dark:bg-slate-800/60 border-2 sm:border-4 border-slate-100 dark:border-white/10 border-b-4 sm:border-b-8 rounded-2xl sm:rounded-3xl p-4 sm:p-6">
              <h3 className="font-black text-lg text-slate-800 dark:text-white mb-4">Subject Breakdown</h3>
              {subjects.length === 0 ? <p className="text-slate-400 dark:text-slate-500 text-sm font-bold">No data yet.</p> : (
                <div className="space-y-4">
                  {subjects.map(s => {
                    const m   = SUBJECT_META[s] || { emoji: "📚", label: titleCase(s) };
                    const arr = skills.filter(sk => sk.subject === s);
                    const avg = arr.length > 0 ? Math.round(arr.reduce((sum, sk) => sum + sk.score, 0) / arr.length) : 0;
                    const bar = avg >= 80 ? "bg-emerald-400 dark:bg-emerald-500" : avg >= 60 ? "bg-lime-400 dark:bg-lime-500" : avg >= 40 ? "bg-amber-400 dark:bg-amber-500" : "bg-red-400 dark:bg-red-500";
                    const txt = avg >= 80 ? "text-emerald-600 dark:text-emerald-400" : avg >= 60 ? "text-lime-600 dark:text-lime-400" : avg >= 40 ? "text-amber-600 dark:text-amber-400" : "text-red-500 dark:text-red-400";
                    return (
                      <div key={s}>
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="font-bold text-sm text-slate-700 dark:text-slate-300">{m.emoji} {m.label}</span>
                          <span className={`text-sm font-black ${txt}`}>{avg > 0 ? `${avg}%` : "—"}</span>
                        </div>
                        <div className="h-2 bg-slate-100 dark:bg-slate-700/40 rounded-full overflow-hidden">
                          <div className={`h-full ${bar} rounded-full transition-all duration-700`} style={{ width: `${avg}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Strongest topics */}
            <div className="bg-white dark:bg-slate-800/60 border-2 sm:border-4 border-slate-100 dark:border-white/10 border-b-4 sm:border-b-8 rounded-2xl sm:rounded-3xl p-4 sm:p-6">
              <h3 className="font-black text-lg text-slate-800 dark:text-white mb-4">🌟 Strongest Topics</h3>
              {skills.length === 0 ? <p className="text-slate-400 dark:text-slate-500 text-sm font-bold">Complete some quests first.</p> : (
                <div className="space-y-1">
                  {[...skills].sort((a, b) => b.score - a.score).slice(0, 6).map((sk, i) => {
                    const m = SUBJECT_META[sk.subject] || { emoji: "📚" };
                    return (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-white/5 last:border-0">
                        <span className="font-bold text-sm text-slate-700 dark:text-slate-300">{m.emoji} {titleCase(sk.topic)}</span>
                        <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-0.5 rounded-lg">{sk.score}%</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Needs work */}
            <div className="bg-white dark:bg-slate-800/60 border-2 sm:border-4 border-slate-100 dark:border-white/10 border-b-4 sm:border-b-8 rounded-2xl sm:rounded-3xl p-4 sm:p-6">
              <h3 className="font-black text-lg text-slate-800 dark:text-white mb-4">🎯 Areas to Improve</h3>
              {skills.filter(s => s.score < 60 && (s.attempts || 0) > 0).length === 0 ? (
                <p className="text-slate-400 dark:text-slate-500 text-sm font-bold">{skills.length === 0 ? "No data yet." : "Everything's looking great! 🎉"}</p>
              ) : (
                <div className="space-y-1">
                  {[...skills].filter(s => s.score < 60 && (s.attempts || 0) > 0).sort((a, b) => a.score - b.score).slice(0, 6).map((sk, i) => {
                    const m   = SUBJECT_META[sk.subject] || { emoji: "📚" };
                    const cls = sk.score < 40 ? "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10" : "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10";
                    return (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-white/5 last:border-0">
                        <span className="font-bold text-sm text-slate-700 dark:text-slate-300">{m.emoji} {titleCase(sk.topic)}</span>
                        <span className={`font-black text-sm px-2.5 py-0.5 rounded-lg ${cls}`}>{sk.score}%</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Week snapshot */}
            <div className="bg-white dark:bg-slate-800/60 border-2 sm:border-4 border-slate-100 dark:border-white/10 border-b-4 sm:border-b-8 rounded-2xl sm:rounded-3xl p-4 sm:p-6">
              <h3 className="font-black text-lg text-slate-800 dark:text-white mb-4">📅 This Week</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl p-4 text-center">
                  <p className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{weeklyMinutes}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 dark:text-indigo-500 mt-1">Minutes studied</p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-500/10 rounded-2xl p-4 text-center">
                  <p className="text-3xl font-black text-amber-600 dark:text-amber-400">
                    {timeData.filter(d => (d.minutes || 0) > 0).length}
                  </p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-400 dark:text-amber-500 mt-1">Active days</p>
                </div>
              </div>
            </div>
          </div>
          </div>
        )}

        {/* TAB: SKILLS */}
        {activeTab === "Skills" && <SkillHeatmap skills={skills} loading={false} />}

        {/* TAB: STUDY TIME */}
        {activeTab === "Study Time" && (
          <div className="space-y-4">
            <div className="flex gap-2">
              {TIME_PERIODS.map(tp => (
                <button key={tp.value} onClick={() => setPeriod(tp.value)}
                  className={`px-4 py-2 rounded-xl font-bold text-sm transition-all
                    ${period === tp.value ? "bg-indigo-600 text-white" : "bg-white dark:bg-slate-800/60 border-2 border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:border-indigo-300 dark:hover:border-indigo-500/30"}`}
                >
                  {tp.label}
                </button>
              ))}
            </div>
            <TimeChart data={timeData} />
          </div>
        )}

        {/* TAB: GOALS */}
        {activeTab === "Goals" && (
          <Goals scholarId={id} goals={goals} onAdd={handleAddGoal} onToggleAchieved={handleToggleGoal} />
        )}

      </main>
    </div>
  );
}