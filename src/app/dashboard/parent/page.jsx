"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { getCurriculumInfo, formatGradeLabel } from "@/lib/gamificationEngine";
import { getProgressionState } from "@/lib/progressionEngine";
import { EXAM_MODES } from "@/lib/examModes";
import GraduationModal from "@/components/GraduationModal";
import ReferralBanner from "../../../components/ReferralBanner";
import ReadinessScore from "@/components/ReadinessScore";

// ═══════════════════════════════════════════════════════════════════
// ICONS
// ═══════════════════════════════════════════════════════════════════
const Icon = ({ d, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
);

const PlusIcon    = ({ size = 22 }) => <Icon size={size} d="M12 5v14M5 12h14" />;
const LogOutIcon  = ({ size = 18 }) => <Icon size={size} d={["M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4","M16 17l5-5-5-5","M21 12H9"]} />;
const CopyIcon    = ({ size = 16 }) => <Icon size={size} d={["M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2","M8 2h8v4H8z"]} />;
const CheckIcon   = ({ size = 14 }) => <Icon size={size} d="M20 6 9 17l-5-5" />;
const ChevronDown = ({ size = 16 }) => <Icon size={size} d="m6 9 6 6 6-6" />;
const ChevronUp   = ({ size = 16 }) => <Icon size={size} d="m18 15-6-6-6 6" />;
const StarIcon    = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
  </svg>
);

// ═══════════════════════════════════════════════════════════════════
// CURRICULA / SUBJECT DATA (unchanged from production)
// ═══════════════════════════════════════════════════════════════════
const CURRICULA = {
  uk_national:    { country: "🇬🇧", name: "UK National",         gradeLabel: "Year",    grades: [1,2,3,4,5,6,7,8,9,10,11] },
  us_common_core: { country: "🇺🇸", name: "US Common Core",      gradeLabel: "Grade",   grades: [1,2,3,4,5,6,7,8] },
  ca_primary:     { country: "🇨🇦", name: "Canadian Primary",    gradeLabel: "Grade",   grades: [1,2,3,4,5,6,7,8], hasProvinces: true },
  ca_secondary:   { country: "🇨🇦", name: "Canadian Secondary",  gradeLabel: "Grade",   grades: [9,10,11,12], hasProvinces: true },
  aus_acara:      { country: "🇦🇺", name: "Australian",          gradeLabel: "Year",    grades: [1,2,3,4,5,6,7,8,9] },
  ib_pyp:         { country: "🌍", name: "IB PYP",               gradeLabel: "Year",    grades: [1,2,3,4,5,6] },
  ib_myp:         { country: "🌍", name: "IB MYP",               gradeLabel: "Year",    grades: [1,2,3,4,5] },
  ng_primary:     { country: "🇳🇬", name: "Nigerian Primary",    gradeLabel: "Primary", grades: [1,2,3,4,5,6] },
  ng_jss:         { country: "🇳🇬", name: "Nigerian JSS",        gradeLabel: "JSS",     grades: [1,2,3] },
  ng_sss:         { country: "🇳🇬", name: "Nigerian SSS",        gradeLabel: "SS",      grades: [1,2,3] },
};

const NG_SSS_COMPULSORY = ["english","mathematics","civic_education","digital_technologies"];
const NG_SSS_STREAMS = {
  science:    { label: "Science",    emoji: "🔬", subjects: ["biology","chemistry","physics","further_mathematics","agricultural_science","health_education","geography"] },
  humanities: { label: "Humanities", emoji: "📜", subjects: ["literature_in_english","government","nigerian_history","home_management"] },
  business:   { label: "Business",   emoji: "💼", subjects: ["economics","accounting","commerce","marketing"] },
};
const NG_SSS_TRADES = [
  { value: "data_processing", label: "Data Processing" },
  { value: "marketing",       label: "Marketing" },
];
const NG_JSS_SUBJECTS = [
  "mathematics","english_studies","basic_science","basic_technology","social_studies",
  "business_education","cultural_and_creative_arts","pre_vocational_studies",
  "religious_studies","civic_education","basic_digital_literacy","agricultural_science",
];
const UK_KS4_COMPULSORY = ["mathematics","english_language","english_literature","combined_science","citizenship"];
const UK_KS4_OPTIONS = [
  { group: "STEM", emoji: "🔬", subjects: [
    { value: "biology", label: "Biology (Triple)" }, { value: "chemistry", label: "Chemistry (Triple)" },
    { value: "physics", label: "Physics (Triple)" }, { value: "computer_science", label: "Computer Science" },
    { value: "further_mathematics", label: "Further Mathematics" }, { value: "statistics", label: "Statistics" },
  ]},
  { group: "Arts & Humanities", emoji: "🎨", subjects: [
    { value: "history", label: "History" }, { value: "geography", label: "Geography" },
    { value: "religious_education", label: "Religious Education" }, { value: "media_studies", label: "Media Studies" },
    { value: "physical_education", label: "Physical Education" },
  ]},
  { group: "Vocational & Technical", emoji: "🛠", subjects: [
    { value: "business_studies", label: "Business Studies" }, { value: "ict", label: "ICT" },
    { value: "design_technology", label: "Design & Technology" }, { value: "food_technology", label: "Food Technology" },
    { value: "health_social_care", label: "Health & Social Care" }, { value: "sport_science", label: "Sport Science" },
  ]},
];
const UK_KS4_YEARS = [10, 11];
const needsSubjectSelection = (curriculum, year) => curriculum === "uk_national" && UK_KS4_YEARS.includes(Number(year));
const UK_NATIONAL_SUBJECTS = {
  ks1: ["mathematics","english","science"],
  ks2: ["mathematics","english","science","history","geography","computing","design_technology","religious_education"],
  ks3: ["mathematics","english_language","english_literature","combined_science","history","geography","citizenship","computing","design_technology"],
  ks4: ["mathematics","english_language","english_literature","combined_science","citizenship"],
};
const getUkNationalKeyStage = (year) => {
  const y = Number(year);
  if (y <= 2) return "ks1";
  if (y <= 6) return "ks2";
  if (y <= 9) return "ks3";
  return "ks4";
};
const getScholarSubjects = (curriculum, stream, tradeSubject, selectedSubjects, year, examMode) => {
  if (curriculum === "ng_sss") {
    const streamSubjects = stream ? (NG_SSS_STREAMS[stream]?.subjects || []) : [];
    return [...NG_SSS_COMPULSORY, ...streamSubjects, ...(tradeSubject ? [tradeSubject] : [])];
  }
  if (curriculum === "uk_national") {
    const ks = getUkNationalKeyStage(year);
    const base = UK_NATIONAL_SUBJECTS[ks];
    const _examDef   = EXAM_MODES[examMode] ?? null;
    const examExtras = (_examDef?.eligibleYears.includes(Number(year)) ? _examDef.extraSubjects : []) ?? [];
    if (ks === "ks4") return [...base, ...(selectedSubjects || []), ...examExtras];
    return [...base, ...examExtras];
  }
  return SUBJECTS_BY_CURRICULUM[curriculum] || [];
};
const SUBJECTS_BY_CURRICULUM = {
  uk_national:    ["mathematics","english","science"],
  us_common_core: ["maths","english","science"],
  aus_acara:      ["maths","english","science"],
  ib_pyp:         ["maths","english","science"],
  ib_myp:         ["maths","english","science"],
  ng_primary:     ["mathematics","english","basic_science","social_studies"],
  ng_jss:         NG_JSS_SUBJECTS,
  ng_sss:         NG_SSS_COMPULSORY,
  ca_primary: ["maths","english","science","social_studies"],
  ca_secondary: ["maths","english","science","canadian_history","geography","physics","chemistry","biology","computer_science"],
};
const SUBJECT_META = {
  maths:"🔢",mathematics:"🔢",further_mathematics:"📐",statistics:"📊",
  english:"📖",english_language:"📖",english_literature:"📖",english_studies:"📖",
  literature_in_english:"📖",verbal:"🧩",verbal_reasoning:"🧩",nvr:"🔷",
  science:"🔬",biology:"🧬",chemistry:"🧪",physics:"⚛️",combined_science:"🔬",
  basic_science:"🔬",basic_technology:"🔧",health_education:"🏥",
  agricultural_science:"🌱",history:"🏛️",nigerian_history:"🏛️",geography:"🗺️",
  social_studies:"🌍",religious_education:"✝️",religious_studies:"✝️",
  government:"🏛️",civic_education:"⚖️",citizenship:"⚖️",
  cultural_and_creative_arts:"🎨",home_management:"🏠",pre_vocational_studies:"🛠",
  digital_technologies:"💻",media_studies:"📺",economics:"📈",business_studies:"💼",
  business_education:"💼",commerce:"💰",accounting:"📒",financial_accounting:"📒",
  marketing:"📣",computer_science:"💻",ict:"💻",digital_technologies:"💻",
  basic_digital_literacy:"💻",basic_technology:"🔧",design_technology:"⚙️",
  food_technology:"🍳",data_processing:"🖥️",physical_education:"🏃",
  sport_science:"⚽",canadian_history:"🍁",computing:"💻",
};
const subjectLabel = (s) => s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
const subjectEmoji = (s) => SUBJECT_META[s] || "📚";

const CANADIAN_PROVINCES = [
  { code: "ON", name: "Ontario",                note: "Largest province; Ontario curriculum" },
  { code: "BC", name: "British Columbia",        note: "Inquiry-based curriculum" },
  { code: "AB", name: "Alberta",                 note: "Strong STEM focus" },
  { code: "QC", name: "Québec",                  note: "Québec Education Programme" },
  { code: "MB", name: "Manitoba",                note: "Central Canada" },
  { code: "SK", name: "Saskatchewan",            note: "Prairie province" },
  { code: "NS", name: "Nova Scotia",             note: "Atlantic Canada" },
  { code: "NB", name: "New Brunswick",           note: "Atlantic Canada" },
  { code: "NL", name: "Newfoundland & Labrador", note: "Atlantic Canada" },
  { code: "PE", name: "Prince Edward Island",    note: "Atlantic Canada" },
  { code: "NT", name: "Northwest Territories",   note: "Northern Canada" },
  { code: "YT", name: "Yukon",                   note: "Follows BC curriculum framework" },
  { code: "NU", name: "Nunavut",                 note: "Northern Canada" },
];

// ═══════════════════════════════════════════════════════════════════
// MASTERY TIER HELPER
// ═══════════════════════════════════════════════════════════════════
function getMasteryTier(pct) {
  if (pct >= 85) return { label: "Mastered",   color: "#10b981", bg: "#ecfdf5", border: "#6ee7b7" };
  if (pct >= 70) return { label: "Strong",     color: "#6366f1", bg: "#eef2ff", border: "#a5b4fc" };
  if (pct >= 50) return { label: "Developing", color: "#f59e0b", bg: "#fffbeb", border: "#fcd34d" };
  return              { label: "Needs work",  color: "#ef4444", bg: "#fef2f2", border: "#fca5a5" };
}

// ═══════════════════════════════════════════════════════════════════
// DATA FETCHING HELPERS
// ═══════════════════════════════════════════════════════════════════

async function fetchScholarInsights(supabase, scholarId) {
  const monday = new Date();
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const lastMonday = new Date(monday);
  lastMonday.setDate(lastMonday.getDate() - 7);

  const [thisWeek, lastWeek, recentTopics] = await Promise.all([
    // This week's quiz results
    supabase.from("quiz_results")
      .select("subject, questions_correct, questions_total, time_spent_seconds, topic_summary, answers")
      .eq("scholar_id", scholarId)
      .gte("created_at", monday.toISOString()),

    // Last week's quiz results
    supabase.from("quiz_results")
      .select("subject, questions_correct, questions_total")
      .eq("scholar_id", scholarId)
      .gte("created_at", lastMonday.toISOString())
      .lt("created_at", monday.toISOString()),

    // Last 30 days for topic mastery
    supabase.from("quiz_results")
      .select("subject, topic_summary, answers")
      .eq("scholar_id", scholarId)
      .gte("created_at", new Date(Date.now() - 30 * 864e5).toISOString()),
  ]);

  // Aggregate this week by subject
  const weekBySubject = {};
  (thisWeek.data || []).forEach(row => {
    const s = row.subject;
    if (!weekBySubject[s]) weekBySubject[s] = { subject: s, questions_correct: 0, questions_total: 0, minutes: 0 };
    weekBySubject[s].questions_correct += row.questions_correct || 0;
    weekBySubject[s].questions_total   += row.questions_total   || 0;
    weekBySubject[s].minutes           += Math.round((row.time_spent_seconds || 0) / 60);
  });
  const weeklyStats = Object.values(weekBySubject);

  // Aggregate last week
  const lastWeekBySubject = {};
  (lastWeek.data || []).forEach(row => {
    const s = row.subject;
    if (!lastWeekBySubject[s]) lastWeekBySubject[s] = { subject: s, questions_total: 0, minutes: 0 };
    lastWeekBySubject[s].questions_total += row.questions_total || 0;
  });
  const lastWeekStats = Object.values(lastWeekBySubject);

  // Aggregate topic mastery
  const topicAgg = {}; // { subject: { topic: { correct, total } } }
  (recentTopics.data || []).forEach(row => {
    const subj = row.subject;
    if (!topicAgg[subj]) topicAgg[subj] = {};
    const agg = topicAgg[subj];

    if (row.topic_summary && typeof row.topic_summary === "object") {
      Object.entries(row.topic_summary).forEach(([topic, stats]) => {
        if (!agg[topic]) agg[topic] = { correct: 0, total: 0 };
        agg[topic].correct += stats.correct || 0;
        agg[topic].total   += stats.total   || 0;
      });
    } else {
      (Array.isArray(row.answers) ? row.answers : []).forEach(({ topic, isCorrect }) => {
        if (!topic) return;
        if (!agg[topic]) agg[topic] = { correct: 0, total: 0 };
        agg[topic].correct += isCorrect ? 1 : 0;
        agg[topic].total   += 1;
      });
    }
  });

  // Streak: walk back consecutive activity days
  const activityDates = new Set(
    (thisWeek.data || []).map(r => r.created_at?.slice(0, 10))
  );
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (activityDates.has(d.toISOString().slice(0, 10))) streak++;
    else if (i > 0) break;
  }

  return { weeklyStats, lastWeekStats, topicAgg, streak };
}

// ═══════════════════════════════════════════════════════════════════
// SCHOLAR INSIGHT PANEL (parent-facing, read-only)
// ═══════════════════════════════════════════════════════════════════
function ScholarInsightPanel({ scholarId, scholarName, supabase }) {
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [expandedSubject, setExpanded] = useState(null);
  const [topicFilter, setFilter]  = useState("all");

  useEffect(() => {
    fetchScholarInsights(supabase, scholarId)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [scholarId]);

  if (loading) return (
    <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-100 p-4 text-center">
      <div className="w-6 h-6 border-2 border-indigo-400/40 border-t-indigo-500 rounded-full animate-spin mx-auto" />
    </div>
  );

  if (!data) return null;

  const { weeklyStats, lastWeekStats, topicAgg, streak } = data;

  // ── Summary numbers ──────────────────────────────────────────────
  const totalMins      = weeklyStats.reduce((a, s) => a + (s.minutes || 0), 0);
  const totalQ         = weeklyStats.reduce((a, s) => a + (s.questions_total || 0), 0);
  const totalCorrect   = weeklyStats.reduce((a, s) => a + (s.questions_correct || 0), 0);
  const accuracy       = totalQ > 0 ? Math.round((totalCorrect / totalQ) * 100) : null;
  const topSubject     = [...weeklyStats].sort((a, b) => (b.minutes || 0) - (a.minutes || 0))[0];
  const lastWeekTotal  = lastWeekStats.reduce((a, s) => a + (s.questions_total || 0), 0);
  const weekChange     = lastWeekTotal > 0 ? Math.round(((totalQ - lastWeekTotal) / lastWeekTotal) * 100) : null;

  const hrs  = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  const timeStr = totalMins === 0 ? "0 min" : hrs > 0 ? `${hrs}h ${mins}m` : `${mins} min`;

  // ── Subjects with topic data ─────────────────────────────────────
  const subjectsWithTopics = Object.keys(topicAgg).filter(s => Object.keys(topicAgg[s]).length > 0);

  // No activity this week
  if (totalQ === 0 && subjectsWithTopics.length === 0) {
    return (
      <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-100 p-4 text-center text-sm text-slate-400 font-semibold">
        No sessions recorded yet this week.
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">

      {/* ── Week-at-a-glance stat strip ────────────────────────── */}
      <div className="grid grid-cols-3 gap-2">
        {/* Time */}
        <div className="bg-indigo-50 rounded-2xl p-3 border border-indigo-100 text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1">This week</p>
          <p className="text-xl font-black text-indigo-700">{timeStr}</p>
          <p className="text-[10px] text-indigo-400 font-semibold mt-0.5">study time</p>
        </div>
        {/* Accuracy */}
        <div className="bg-emerald-50 rounded-2xl p-3 border border-emerald-100 text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-1">Accuracy</p>
          <p className="text-xl font-black text-emerald-700">{accuracy !== null ? `${accuracy}%` : "—"}</p>
          <p className="text-[10px] text-emerald-400 font-semibold mt-0.5">{totalQ} questions</p>
        </div>
        {/* Streak */}
        <div className="bg-amber-50 rounded-2xl p-3 border border-amber-100 text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-400 mb-1">Streak</p>
          <p className="text-xl font-black text-amber-700">{streak} 🔥</p>
          <p className="text-[10px] text-amber-400 font-semibold mt-0.5">day{streak !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* ── Week-on-week change pill ───────────────────────────── */}
      {weekChange !== null && (
        <div className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${
          weekChange >= 0
            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : "bg-rose-50 text-rose-600 border-rose-200"
        }`}>
          {weekChange >= 0 ? "↑" : "↓"} {Math.abs(weekChange)}% vs last week
          <span className="font-normal text-slate-400">· {totalQ} questions done</span>
        </div>
      )}

      {/* ── Top subject this week ─────────────────────────────── */}
      {topSubject && topSubject.minutes > 0 && (
        <div className="bg-white border border-slate-100 rounded-2xl p-3 flex items-center gap-3">
          <span className="text-2xl">{subjectEmoji(topSubject.subject)}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-0.5">Most time this week</p>
            <p className="font-black text-slate-800 text-sm truncate">{subjectLabel(topSubject.subject)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-black text-indigo-600">{topSubject.minutes} min</p>
            {topSubject.questions_total > 0 && (
              <p className="text-[10px] text-slate-400 font-semibold">
                {Math.round((topSubject.questions_correct / topSubject.questions_total) * 100)}% acc
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Per-subject mastery bars (30-day topics) ─────────── */}
      {subjectsWithTopics.length > 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Topic Mastery · 30 days</p>
          </div>

          {subjectsWithTopics.map((subject) => {
            const isExpanded = expandedSubject === subject;
            const topicsRaw  = topicAgg[subject];
            const topics     = Object.entries(topicsRaw)
              .map(([topic, { correct, total }]) => ({
                topic,
                pct: total > 0 ? Math.round((correct / total) * 100) : 0,
                correct,
                total,
              }))
              .sort((a, b) => a.pct - b.pct);

            const avgMastery = topics.length > 0
              ? Math.round(topics.reduce((a, t) => a + t.pct, 0) / topics.length)
              : 0;
            const tier = getMasteryTier(avgMastery);

            const filtered = topics.filter(t => {
              if (topicFilter === "needs_work") return t.pct < 50;
              if (topicFilter === "mastered")   return t.pct >= 85;
              return true;
            });

            return (
              <div key={subject} className="border-b border-slate-50 last:border-0">
                {/* Subject row — click to expand */}
                <button
                  onClick={() => {
                    setExpanded(isExpanded ? null : subject);
                    setFilter("all");
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                >
                  <span className="text-lg">{subjectEmoji(subject)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-slate-700 truncate">{subjectLabel(subject)}</span>
                      <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                          style={{ color: tier.color, background: tier.bg, borderColor: tier.border }}
                        >
                          avg {avgMastery}%
                        </span>
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </div>
                    </div>
                    {/* Mini mastery bar */}
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${avgMastery}%`, background: tier.color }}
                      />
                    </div>
                  </div>
                </button>

                {/* Expanded topic list */}
                {isExpanded && (
                  <div className="px-4 pb-4 bg-slate-50/50">
                    {/* Filter tabs */}
                    <div className="flex gap-1.5 mb-3 flex-wrap pt-1">
                      {[
                        { key: "all",        label: `All (${topics.length})` },
                        { key: "needs_work", label: `Needs work (${topics.filter(t => t.pct < 50).length})` },
                        { key: "mastered",   label: `Mastered (${topics.filter(t => t.pct >= 85).length})` },
                      ].map(({ key, label }) => (
                        <button
                          key={key}
                          onClick={() => setFilter(key)}
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all ${
                            topicFilter === key
                              ? "bg-indigo-600 border-indigo-600 text-white"
                              : "bg-white border-slate-200 text-slate-500 hover:border-indigo-300"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    {filtered.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-2">No topics match this filter.</p>
                    ) : (
                      <div className="space-y-2.5">
                        {filtered.map(({ topic, pct, correct, total }) => {
                          const t = getMasteryTier(pct);
                          return (
                            <div key={topic}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-semibold text-slate-600 capitalize">
                                  {topic.replace(/_/g, " ")}
                                </span>
                                <div className="flex items-center gap-1.5 ml-2">
                                  <span
                                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full border"
                                    style={{ color: t.color, background: t.bg, borderColor: t.border }}
                                  >
                                    {t.label}
                                  </span>
                                  <span className="text-[10px] font-black text-slate-400 tabular-nums w-8 text-right">
                                    {pct}%
                                  </span>
                                </div>
                              </div>
                              <div className="h-2 bg-white rounded-full overflow-hidden border border-slate-100">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{ width: `${pct}%`, background: t.color }}
                                />
                              </div>
                              <p className="text-[10px] text-slate-400 mt-0.5">{correct} of {total} correct</p>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Mastery legend */}
                    <div className="flex flex-wrap gap-2 mt-3 pt-2 border-t border-slate-100">
                      {[
                        { label: "Mastered",   color: "#10b981" },
                        { label: "Strong",     color: "#6366f1" },
                        { label: "Developing", color: "#f59e0b" },
                        { label: "Needs work", color: "#ef4444" },
                      ].map(({ label, color }) => (
                        <div key={label} className="flex items-center gap-1 text-[10px] text-slate-400">
                          <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                          {label}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Weekly digest ─────────────────────────────────────── */}
      <WeeklyDigest
        scholarName={scholarName}
        weeklyStats={weeklyStats}
        lastWeekStats={lastWeekStats}
        topicAgg={topicAgg}
        streak={streak}
        accuracy={accuracy}
        totalMins={totalMins}
        totalQ={totalQ}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// WEEKLY DIGEST — upgraded with Tier 1 insights
// ═══════════════════════════════════════════════════════════════════
function WeeklyDigest({ scholarName, weeklyStats, lastWeekStats, topicAgg, streak, accuracy, totalMins, totalQ }) {
  const [open, setOpen] = useState(false);
  if (totalQ === 0 && totalMins === 0) return null;

  const name = scholarName?.split(" ")[0] || "Your scholar";

  // Find weakest subject by accuracy
  const subjectsWithQ = weeklyStats.filter(s => s.questions_total > 0);
  const weakest = subjectsWithQ.length > 0
    ? [...subjectsWithQ].sort((a, b) =>
        (a.questions_correct / a.questions_total) - (b.questions_correct / b.questions_total)
      )[0]
    : null;

  // Find most improved topic this week (highest pct but < 85 previously)
  let needsWorkTopics = [];
  Object.entries(topicAgg).forEach(([subject, topics]) => {
    Object.entries(topics).forEach(([topic, { correct, total }]) => {
      const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
      if (pct < 50) needsWorkTopics.push({ subject, topic, pct });
    });
  });
  needsWorkTopics.sort((a, b) => a.pct - b.pct);
  const topNeedsWork = needsWorkTopics[0];

  const hrs  = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  const timeStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins} min`;

  const highlights = [];

  if (streak >= 3) highlights.push({ icon: "🔥", text: `${streak}-day streak — ${name} is building a real habit.` });
  if (totalMins >= 60) highlights.push({ icon: "⏱️", text: `${timeStr} of study time logged this week.` });
  if (accuracy !== null && accuracy >= 75) highlights.push({ icon: "🎯", text: `${accuracy}% accuracy across ${totalQ} questions — excellent.` });
  if (accuracy !== null && accuracy < 55 && totalQ >= 10) highlights.push({ icon: "💡", text: `${accuracy}% accuracy this week. Consider reviewing topics before the next session.` });
  if (weakest && weakest.questions_total >= 5) {
    const acc = Math.round((weakest.questions_correct / weakest.questions_total) * 100);
    highlights.push({ icon: subjectEmoji(weakest.subject), text: `${subjectLabel(weakest.subject)} needs attention — ${acc}% accuracy this week.` });
  }
  if (topNeedsWork) highlights.push({ icon: "📌", text: `"${topNeedsWork.topic.replace(/_/g, " ")}" in ${subjectLabel(topNeedsWork.subject)} is below 50% mastery. Worth focusing on.` });
  if (highlights.length === 0) highlights.push({ icon: "✅", text: `${name} has been active this week. Keep the momentum going!` });

  return (
    <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-base">📋</span>
          <p className="text-xs font-black uppercase tracking-widest text-slate-500">Weekly Digest</p>
        </div>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-2 border-t border-slate-50">
          {highlights.map((h, i) => (
            <div key={i} className="flex items-start gap-2.5 pt-2">
              <span className="text-base flex-shrink-0 mt-0.5">{h.icon}</span>
              <p className="text-sm text-slate-600 font-semibold leading-relaxed">{h.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// CURRICULUM CARD
// ═══════════════════════════════════════════════════════════════════
const CurriculumCard = ({ currKey, curr, selected, onSelect }) => (
  <button
    type="button"
    onClick={() => onSelect(currKey)}
    className={`flex flex-col items-center gap-1 p-3 rounded-2xl border-2 text-center transition-all cursor-pointer
      ${selected
        ? "border-indigo-500 bg-indigo-600 text-white shadow-lg scale-105"
        : "border-indigo-100 bg-white text-slate-600 hover:border-indigo-300 hover:bg-indigo-50"
      }`}
  >
    <span className="text-3xl">{curr.country}</span>
    <span className={`text-[11px] font-black leading-tight ${selected ? "text-indigo-100" : "text-slate-500"}`}>
      {curr.name}
    </span>
  </button>
);

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════
export default function ParentDashboard() {
  const router   = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const [user,   setUser]   = useState(null);
  const [parent, setParent] = useState(null);
  const [scholars, setScholars] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [copied, setCopied]     = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError]       = useState(null);
  const [expandedInsights, setExpandedInsights] = useState({});

  // Form state
  const [newName,     setNewName]     = useState("");
  const [newCurriculum, setNewCurriculum] = useState("uk_national");
  const [newGrade,    setNewGrade]    = useState(1);
  const [newProvince, setNewProvince] = useState("");
  const [newStream,   setNewStream]   = useState("");
  const [newTrade,    setNewTrade]    = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [graduatingScholar, setGraduatingScholar] = useState(null);
  const [newExamMode, setNewExamMode] = useState(null);

  const currDef    = CURRICULA[newCurriculum];
  const isCanadian = !!currDef?.hasProvinces;
  const isNgSss    = newCurriculum === "ng_sss";
  const isUkKs4    = needsSubjectSelection(newCurriculum, newGrade);
  const isUkKs2    = newCurriculum === "uk_national" && Number(newGrade) >= 3 && Number(newGrade) <= 6;
  const provInfo   = isCanadian && newProvince ? CANADIAN_PROVINCES.find(p => p.code === newProvince) : null;

  const toggleSubject = (value) =>
    setSelectedSubjects(prev => prev.includes(value) ? prev.filter(s => s !== value) : [...prev, value]);

  const handleCurriculumChange = (key) => {
    setNewCurriculum(key);
    setNewGrade(CURRICULA[key].grades[0]);
    if (!CURRICULA[key]?.hasProvinces) setNewProvince("");
    if (key !== "ng_sss") { setNewStream(""); setNewTrade(""); }
    setSelectedSubjects([]);
  };

  const handleGradeChange = (grade) => {
    setNewGrade(Number(grade));
    if (!needsSubjectSelection(newCurriculum, grade)) setSelectedSubjects([]);
    if (newExamMode && !EXAM_MODES[newExamMode]?.eligibleYears.includes(Number(grade))) setNewExamMode(null);
  };

  // ═══════════════════════════════════════════════════════════════
  // FETCH USER AND SCHOLARS
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    const init = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) { router.push("/"); return; }
      setUser(user);

      let { data: parentData, error: fetchError } = await supabase
        .from("parents").select("*").eq("id", user.id).single();

      if (fetchError && fetchError.code === "PGRST116") {
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 14);
        const { data: newParent } = await supabase.from("parents").upsert({
          id: user.id,
          full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Parent",
          email: user.email,
          subscription_status: "trial",
          trial_end: trialEnd.toISOString(),
          max_children: 3,
          billing_cycle: "monthly",
        }, { onConflict: "id" }).select().single();
        if (newParent) parentData = newParent;
      }

      if (parentData) setParent(parentData);

      const { data: scholarData, error: scholarError } = await supabase
        .from("scholars").select("*").eq("parent_id", user.id).order("created_at", { ascending: true });
      if (!scholarError && scholarData) setScholars(scholarData);

      setLoading(false);
    };
    init();
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════
  const handleSignOut = async () => { await supabase.auth.signOut(); router.push("/"); };

  const MAX_SCHOLARS = 3;

  const handleAddScholar = async (e) => {
    e.preventDefault();
    if (!newName.trim()) { setError("Please enter a name"); return; }
    if (scholars.length >= MAX_SCHOLARS) { setError(`Maximum of ${MAX_SCHOLARS} scholars on your current plan.`); return; }
    if (newCurriculum === "ng_sss" && !newStream) { setError("Please select a stream for this SSS scholar."); return; }

    setIsAdding(true); setError(null);

    try {
      const code = `QUEST-${Math.floor(1000 + Math.random() * 9000)}`;
      const { data, error: insertError } = await supabase.from("scholars").insert([{
        parent_id: user.id,
        name: newName.trim(),
        year_level: newGrade,
        year: newGrade,
        curriculum: newCurriculum,
        province: newProvince || null,
        stream: isNgSss ? (newStream || null) : null,
        trade_subject: isNgSss ? (newTrade || null) : null,
        selected_subjects: isUkKs4 && selectedSubjects.length > 0 ? selectedSubjects : null,
        exam_mode: isUkKs2 ? (newExamMode || null) : null,
        access_code: code,
        total_xp: 0, coins: 0, streak: 0, personal_best: 0, codename: null,
        avatar: { base: "astronaut", background: "🌌" },
      }]).select().single();

      if (insertError) { setError(`Failed to create scholar: ${insertError.message}`); return; }

      if (data) {
        try {
          await fetch("/api/emails/scholar-created", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              parentEmail: user.email,
              parentName:  user.user_metadata?.full_name || "Parent",
              scholarName: data.name,
              questCode:   data.access_code,
              curriculum:  getCurriculumInfo(data.curriculum).name,
              yearLevel:   formatGradeLabel(data.year_level, data.curriculum),
            }),
          });
        } catch (emailError) { console.error("Email send failed:", emailError); }

        setScholars(prev => [...prev, data]);
        setNewName(""); setNewCurriculum("uk_national"); setNewGrade(1);
        setNewProvince(""); setNewStream(""); setNewTrade("");
        setSelectedSubjects([]); setNewExamMode(null); setError(null);
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsAdding(false);
    }
  };

  const copyCode = (scholar) => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(scholar.access_code).then(() => {
        setCopied(scholar.id); setTimeout(() => setCopied(null), 2000);
      }).catch(() => alert(`Copy this code: ${scholar.access_code}`));
    } else {
      alert(`Access Code: ${scholar.access_code}`);
    }
  };

  const getCurr       = (s) => CURRICULA[s.curriculum] || CURRICULA.uk_national;
  const getSubjects = (s) => getScholarSubjects(s.curriculum, s.stream, s.trade_subject, s.selected_subjects, s.year_level || s.year || 1, s.exam_mode);
  const toggleInsights = (id) => setExpandedInsights(prev => ({ ...prev, [id]: !prev[id] }));

  // ═══════════════════════════════════════════════════════════════
  // LOADING
  // ═══════════════════════════════════════════════════════════════
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-bold">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col pb-24">

      {/* Nav */}
      <nav className="bg-white border-b-4 border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3 font-black text-xl">
          <img src="/logo.svg" alt="LaunchPard" width={40} height={40} style={{ objectFit: "contain" }} />
          <span className="hidden sm:inline">Parent Portal</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/dashboard/parent/analytics" className="text-slate-500 hover:text-indigo-600 font-bold text-sm transition-colors">Analytics</Link>
          <Link href="/dashboard/parent/billing"   className="text-slate-500 hover:text-indigo-600 font-bold text-sm transition-colors">Billing</Link>
          <Link href="/dashboard/parent/account"   className="text-slate-500 hover:text-indigo-600 font-bold text-sm transition-colors">Account</Link>
          <span className="hidden sm:block text-sm font-bold text-slate-400 max-w-[220px] truncate">{user?.email}</span>
          <button onClick={handleSignOut} className="flex items-center gap-2 text-slate-500 font-bold hover:text-rose-500 hover:bg-rose-50 px-4 py-2 rounded-xl transition-all">
            <LogOutIcon /> <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 pt-12 w-full">

        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-black mb-3">Your Scholars</h1>
          <p className="text-xl text-slate-500 font-semibold">Manage profiles, share access codes, and track progress.</p>

<div className="mt-4 space-y-2">
            {parent?.subscription_status === "trial" && parent?.trial_end && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 flex items-start gap-3">
                <span className="text-2xl">🎉</span>
                <div className="flex-1">
                  <p className="font-black text-blue-900 mb-1">Pro Trial Active</p>
                  <p className="text-sm text-blue-700">
                    {(() => {
                      const daysLeft = Math.max(0, Math.ceil((new Date(parent.trial_end) - new Date()) / 864e5));
                      return daysLeft > 0
                        ? `${daysLeft} day${daysLeft !== 1 ? "s" : ""} remaining — all Pro features unlocked`
                        : "Your trial has ended — you're on the Free plan";
                    })()}
                  </p>
                </div>
                <Link href="/subscribe" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors">
                  Upgrade to Pro
                </Link>
              </div>
            )}
            <ReferralBanner parentId={user?.id} parentName={parent?.full_name} supabase={supabase} />
          </div>
          
        </div>

        {error && (
          <div className="mb-6 bg-rose-50 border-2 border-rose-200 rounded-2xl p-4 text-rose-700 font-bold">{error}</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Scholar cards */}
          {scholars.length === 0 ? (
            <div className="md:col-span-2 bg-white border-4 border-dashed border-slate-200 rounded-[32px] p-16 text-center">
              <p className="text-5xl mb-4">🚀</p>
              <p className="font-black text-2xl text-slate-700 mb-2">No scholars yet</p>
              <p className="text-slate-400 font-bold">Add your first scholar using the form →</p>
            </div>
          ) : (
            scholars.map(scholar => {
              const curr       = getCurr(scholar);
              const subjects   = getSubjects(scholar);
              const isCopied   = copied === scholar.id;
              const yearLevel  = scholar.year_level || scholar.year || 1;
              const isInsightsOpen = !!expandedInsights[scholar.id];

              return (
                <div
                  key={scholar.id}
                  className="bg-white border-2 border-slate-100 rounded-[20px] p-4 hover:border-indigo-200 transition-all flex flex-col gap-3"
                >
                  {/* Name + XP */}
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <h3 className="text-base font-black text-slate-800 mb-1 truncate">{scholar.name}</h3>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-lg text-xs">
                          {curr.country} {curr.name}
                        </span>
                        <span className="bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-lg text-xs">
                          {curr.gradeLabel} {yearLevel}
                        </span>
                        {scholar.province && (
                          <span className="bg-red-50 text-red-700 border border-red-100 font-bold px-2 py-0.5 rounded-lg text-xs">
                            🍁 {CANADIAN_PROVINCES.find(p => p.code === scholar.province)?.name || scholar.province}
                          </span>
                        )}
                        {scholar.stream && (
                          <span className="bg-green-50 text-green-700 border border-green-100 font-bold px-2 py-0.5 rounded-lg text-xs">
                            {NG_SSS_STREAMS[scholar.stream]?.emoji} {NG_SSS_STREAMS[scholar.stream]?.label}
                          </span>
                        )}
                        {scholar.selected_subjects?.length > 0 && (
                          <span className="bg-blue-50 text-blue-700 border border-blue-100 font-bold px-2 py-0.5 rounded-lg text-xs">
                            📚 {scholar.selected_subjects.length} GCSE options
                          </span>
                        )}
                        {scholar.exam_mode && (
                          <span className="inline-flex items-center gap-1 bg-violet-50 text-violet-700 border border-violet-200 font-bold px-2 py-0.5 rounded-lg text-xs">
                            {EXAM_MODES[scholar.exam_mode]?.emoji} {EXAM_MODES[scholar.exam_mode]?.label}
                          </span>
                        )}
                        {(() => {
                          const prog = getProgressionState(scholar.curriculum, scholar.year_level);
                          if (!prog.isAtStageEnd) return null;
                          return (
                            <button
                              onClick={() => setGraduatingScholar(scholar)}
                              className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-300 font-black px-2 py-0.5 rounded-lg text-xs animate-pulse hover:bg-amber-100 transition-colors"
                            >
                              🎓 Ready to Graduate!
                            </button>
                          );
                        })()}
                      </div>
                    </div>
                    <div className="bg-amber-100 text-amber-700 font-black px-2.5 py-1 rounded-xl flex items-center gap-1 flex-shrink-0">
                      <StarIcon size={12} />
                      <span className="text-xs">{(scholar.total_xp || 0).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Subjects */}
                  <div className="flex flex-wrap gap-1.5">
                    {subjects.map(s => (
                      <span key={s} className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 text-slate-600 text-xs font-bold px-2.5 py-1 rounded-lg">
                        {subjectEmoji(s)} {subjectLabel(s)}
                      </span>
                    ))}
                  </div>

                  {/* Access code */}
                  <div className="bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 flex justify-between items-center">
                    <div>
                      <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Access Code</div>
                      <div className="text-sm font-black text-indigo-600 tracking-widest">{scholar.access_code}</div>
                    </div>
                    <button
                      onClick={() => copyCode(scholar)}
                      className={`p-2 rounded-lg border transition-all ${
                        isCopied
                          ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                          : "bg-white border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-300"
                      }`}
                      title={isCopied ? "Copied!" : "Copy code"}
                    >
                      {isCopied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
                    </button>
                  </div>

                  {/* Progress insights — expandable */}
                  <div className="rounded-xl border border-indigo-100 overflow-hidden">
                    <button
                      onClick={() => toggleInsights(scholar.id)}
                      className="w-full flex items-center justify-between px-3 py-2 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm">📊</span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Progress Insights</span>
                      </div>
                      {isInsightsOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                    {isInsightsOpen && (
                      <div className="px-4 pt-4 pb-4 flex flex-col gap-4">
                        {(scholar.exam_mode === 'eleven_plus' ||
                          (scholar.curriculum === 'uk_national' &&
                          Number(scholar.year_level || scholar.year || 0) >= 3 &&
                          Number(scholar.year_level || scholar.year || 0) <= 6)) && (
                          <div className="w-full flex justify-center">
                            <div className="w-full max-w-sm">
                              <ReadinessScore scholarId={scholar.id} supabase={supabase} />
                            </div>
                          </div>
                        )}
                        <ScholarInsightPanel
                          scholarId={scholar.id}
                          scholarName={scholar.name}
                          supabase={supabase}
                        />
                      </div>
                    )}
                  </div>

                  {/* View Analytics Button */}
                  <Link
                    href={`/dashboard/parent/analytics?scholar=${scholar.id}`}
                    className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-2 px-3 rounded-xl text-center text-sm transition-colors border border-indigo-100 hover:border-indigo-200"
                  >
                    📈 View Full Analytics
                  </Link>
                </div>
              );
            })
          )}

          {/* Add Scholar Form */}
          <div className="bg-indigo-50 border-2 border-indigo-100 rounded-[20px] p-4 flex flex-col">
            <h3 className="text-sm font-black text-indigo-900 mb-0.5 flex items-center gap-1.5">
              <PlusIcon size={18} /> Add New Scholar
            </h3>
            <p className="text-indigo-700/70 font-semibold mb-3 text-xs">Generate a profile and unique access code.</p>

            {scholars.length >= MAX_SCHOLARS ? (
              <div className="flex flex-col items-center justify-center flex-grow gap-3 py-4 text-center">
                <div className="text-4xl">🚀</div>
                <p className="text-indigo-900 font-black text-base">Full crew aboard!</p>
                <p className="text-indigo-700/70 font-semibold text-xs leading-relaxed">
                  You've added {MAX_SCHOLARS} scholars — the maximum on your current plan.<br />
                  Need more? Get in touch.
                </p>
                <a href="mailto:hello@launchpard.com?subject=Scholar%20Limit"
                  className="mt-1 px-5 py-2 bg-indigo-600 text-white font-black rounded-xl border-b-2 border-indigo-800 hover:bg-indigo-700 transition-all text-xs">
                  Contact us ✦
                </a>
              </div>
            ) : (
              <form onSubmit={handleAddScholar} className="flex flex-col gap-3 flex-grow">
                <input
                  type="text" required placeholder="Scholar's First Name" value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-indigo-100 rounded-xl font-bold text-sm outline-none focus:border-indigo-400 placeholder:text-slate-300 transition-colors"
                />

                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-indigo-500 mb-1.5 ml-1">Curriculum</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {Object.entries(CURRICULA).map(([key, c]) => (
                      <CurriculumCard key={key} currKey={key} curr={c} selected={newCurriculum === key} onSelect={handleCurriculumChange} />
                    ))}
                  </div>
                </div>

                {isCanadian && (
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-indigo-500 mb-1 ml-1">🍁 Province / Territory</label>
                    <select value={newProvince} onChange={e => setNewProvince(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-indigo-100 rounded-xl font-bold text-sm outline-none focus:border-indigo-400 cursor-pointer transition-colors">
                      <option value="">Select province or territory…</option>
                      {CANADIAN_PROVINCES.map(p => (
                        <option key={p.code} value={p.code}>{p.name}</option>
                      ))}
                    </select>
                    {provInfo && (
                      <div className="mt-1.5 bg-white/80 border border-indigo-100 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-indigo-700 flex items-start gap-1.5">
                        <span>📌</span><span>{provInfo.note}</span>
                      </div>
                    )}
                  </div>
                )}

                {isUkKs4 && (
                  <div className="flex flex-col gap-3">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-indigo-500 ml-1">🇬🇧 GCSE Subjects</label>
                    <p className="text-xs text-indigo-700/60 font-semibold ml-1">Core subjects are included automatically. Tick the optional subjects your scholar is studying.</p>
                    <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-3 mb-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2">Compulsory (all scholars)</p>
                      <div className="flex flex-wrap gap-1.5">
                        {UK_KS4_COMPULSORY.map(s => (
                          <span key={s} className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-lg">
                            ✓ {s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                          </span>
                        ))}
                      </div>
                    </div>
                    {UK_KS4_OPTIONS.map(group => (
                      <div key={group.group} className="mb-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">{group.emoji} {group.group}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {group.subjects.map(s => {
                            const checked = selectedSubjects.includes(s.value);
                            return (
                              <button key={s.value} type="button" onClick={() => toggleSubject(s.value)}
                                className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg border-2 transition-all ${
                                  checked ? "bg-indigo-600 text-white border-indigo-700" : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
                                }`}>
                                {checked ? "✓" : "+"} {s.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    {selectedSubjects.length > 0 && (
                      <p className="text-xs text-indigo-600 font-bold ml-1">{selectedSubjects.length} optional subject{selectedSubjects.length !== 1 ? "s" : ""} selected</p>
                    )}
                  </div>
                )}

                {isUkKs2 && (
                  <div className="flex flex-col gap-1.5">
                    <label className="block text-[9px] font-black uppercase tracking-widest text-indigo-500 ml-1">🎓 Exam Prep Mode</label>
                    <p className="text-[10px] text-indigo-700/60 font-semibold ml-1">Optional — adds exam-specific subjects alongside the National Curriculum</p>
                    <button type="button" onClick={() => setNewExamMode(null)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border font-bold text-xs transition-all text-left ${
                        !newExamMode ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-500 hover:border-indigo-200"
                      }`}>
                      <span className="text-base">📚</span>
                      <div><p className="font-black">National Curriculum only</p><p className="text-[10px] font-semibold opacity-70">No exam prep added</p></div>
                    </button>
                    {Object.entries(EXAM_MODES).map(([key, mode]) => {
                      if (!mode.eligibleYears.includes(Number(newGrade))) return null;
                      return (
                        <button key={key} type="button" onClick={() => setNewExamMode(key)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl border font-bold text-xs transition-all text-left ${
                            newExamMode === key ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600 hover:border-indigo-200"
                          }`}>
                          <span className="text-base">{mode.emoji}</span>
                          <div><p className="font-black">{mode.label}</p><p className="text-[10px] font-semibold opacity-70">{mode.desc}</p></div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {isNgSss && (
                  <>
                    <div className="flex flex-col gap-2">
                      <label className="block text-[9px] font-black uppercase tracking-widest text-indigo-500 ml-1">🇳🇬 Select Stream</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {Object.entries(NG_SSS_STREAMS).map(([key, s]) => (
                          <button key={key} type="button" onClick={() => setNewStream(key)}
                            className={`flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl border font-bold text-xs transition-all ${
                              newStream === key ? "border-indigo-500 bg-indigo-50 text-indigo-900" : "border-indigo-100 bg-white text-slate-500 hover:border-indigo-300"
                            }`}>
                            <span className="text-base">{s.emoji}</span><span>{s.label}</span>
                          </button>
                        ))}
                      </div>
                      {!newStream && <p className="text-[10px] text-amber-600 font-semibold ml-1">⚠ Please select a stream</p>}
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest text-indigo-500 mb-1 ml-1">🛠 Trade Subject</label>
                      <select value={newTrade} onChange={e => setNewTrade(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-indigo-100 rounded-xl font-bold text-sm outline-none focus:border-indigo-400 cursor-pointer transition-colors">
                        <option value="">Select a trade subject…</option>
                        {NG_SSS_TRADES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                  </>
                )}

                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="block text-[9px] font-black uppercase tracking-widest text-indigo-500 mb-1 ml-1">{currDef.gradeLabel}</label>
                    <select value={newGrade} onChange={e => handleGradeChange(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-indigo-100 rounded-xl font-bold text-sm outline-none focus:border-indigo-400 cursor-pointer transition-colors">
                      {currDef.grades.map(g => <option key={g} value={g}>{currDef.gradeLabel} {g}</option>)}
                    </select>
                  </div>
                  <button type="submit" disabled={isAdding || !newName.trim()}
                    className="px-5 py-2 bg-indigo-600 text-white font-black text-sm rounded-xl border-b-2 border-indigo-800 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed active:translate-y-0.5 active:border-b-0 transition-all whitespace-nowrap">
                    {isAdding ? "Creating…" : "Create ✓"}
                  </button>
                </div>

                <div className="bg-white/70 rounded-xl p-2.5 border border-indigo-100 mt-auto">
                  <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400 mb-1.5">Subjects included</p>
                  <div className="flex flex-wrap gap-1">
                    {getScholarSubjects(newCurriculum, newStream, newTrade, selectedSubjects, newGrade, newExamMode).map(s => (
                      <span key={s} className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-md">
                        {subjectEmoji(s)} {subjectLabel(s)}
                      </span>
                    ))}
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-slate-200 bg-white py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-400">
          <div className="flex items-center gap-2 font-bold">
            <img src="/logo.svg" alt="LaunchPard" width={24} height={24} style={{ objectFit: "contain" }} />
            <span>© 2026 LaunchPard Technologies</span>
          </div>
          <div className="flex gap-6 font-semibold">
            <Link href="/privacy-policy" className="hover:text-indigo-600 transition-colors">Privacy Policy</Link>
            <Link href="/terms"          className="hover:text-indigo-600 transition-colors">Terms & Conditions</Link>
            <Link href="/cookie-policy"  className="hover:text-indigo-600 transition-colors">Cookie Policy</Link>
            <a href="mailto:hello@launchpard.com" className="hover:text-indigo-600 transition-colors">Contact</a>
          </div>
        </div>
      </footer>

      {/* Graduation Modal */}
      {graduatingScholar && (
        <GraduationModal
          scholar={graduatingScholar}
          supabase={supabase}
          onClose={() => { setGraduatingScholar(null); window.location.reload(); }}
        />
      )}
    </div>
  );
}