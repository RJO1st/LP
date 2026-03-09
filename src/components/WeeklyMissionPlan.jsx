"use client";
// src/components/WeeklyMissionPlan.jsx
// Tier 1 Feature 1 — Weekly Mission Plan
// Auto-generates weekly subject targets. Tracks completion ratio per subject.
// Resets every Monday. No parent setup required.
//
// Props:
//   scholar      — scholar object { id, name, curriculum, year_level, selected_subjects, exam_mode }
//   weeklyStats  — array from Supabase: [{ subject, questions_correct, questions_total, minutes }]
//                  aggregated for the current ISO week
//   onStartSubject(subject) — called when scholar taps a subject card

import React, { useMemo } from "react";

// ─── Config ──────────────────────────────────────────────────────────────────

// How many missions (sessions) we target per subject per week.
// A "mission" = one completed QuestOrchestrator session (10 questions).
const MISSIONS_PER_SUBJECT = 8;

// Subject display config keyed by subject slug
const SUBJECT_META = {
  mathematics:             { label: "Mathematics",        emoji: "➗", color: "bg-blue-500",    light: "bg-blue-50 border-blue-200",   text: "text-blue-700"   },
  english:                 { label: "English",            emoji: "📖", color: "bg-rose-500",    light: "bg-rose-50 border-rose-200",   text: "text-rose-700"   },
  science:                 { label: "Science",            emoji: "🔬", color: "bg-emerald-500", light: "bg-emerald-50 border-emerald-200", text: "text-emerald-700" },
  verbal_reasoning:        { label: "Verbal Reasoning",   emoji: "🔤", color: "bg-violet-500",  light: "bg-violet-50 border-violet-200",  text: "text-violet-700" },
  non_verbal_reasoning:    { label: "Non-Verbal Reasoning", emoji: "🔷", color: "bg-amber-500", light: "bg-amber-50 border-amber-200",   text: "text-amber-700"  },
  history:                 { label: "History",            emoji: "🏛️", color: "bg-orange-500",  light: "bg-orange-50 border-orange-200",  text: "text-orange-700" },
  geography:               { label: "Geography",          emoji: "🌍", color: "bg-teal-500",    light: "bg-teal-50 border-teal-200",    text: "text-teal-700"   },
  computing:               { label: "Computing",          emoji: "💻", color: "bg-slate-500",   light: "bg-slate-50 border-slate-200",   text: "text-slate-700"  },
  basic_science:           { label: "Basic Science",      emoji: "⚗️", color: "bg-emerald-500", light: "bg-emerald-50 border-emerald-200", text: "text-emerald-700" },
  social_studies:          { label: "Social Studies",     emoji: "🤝", color: "bg-cyan-500",    light: "bg-cyan-50 border-cyan-200",    text: "text-cyan-700"   },
  english_studies:         { label: "English Studies",    emoji: "📝", color: "bg-rose-500",    light: "bg-rose-50 border-rose-200",    text: "text-rose-700"   },
  chemistry:               { label: "Chemistry",          emoji: "🧪", color: "bg-yellow-500",  light: "bg-yellow-50 border-yellow-200",  text: "text-yellow-700" },
  physics:                 { label: "Physics",            emoji: "⚡", color: "bg-blue-500",    light: "bg-blue-50 border-blue-200",    text: "text-blue-700"   },
  biology:                 { label: "Biology",            emoji: "🌱", color: "bg-green-500",   light: "bg-green-50 border-green-200",   text: "text-green-700"  },
  further_mathematics:     { label: "Further Maths",      emoji: "∑",  color: "bg-indigo-500",  light: "bg-indigo-50 border-indigo-200",  text: "text-indigo-700" },
};

const fallbackMeta = (subject) => ({
  label: subject.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
  emoji: "📚",
  color: "bg-indigo-500",
  light: "bg-indigo-50 border-indigo-200",
  text: "text-indigo-700",
});

// Returns the ISO week number for a date
function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

// Days remaining in the current week (Mon-Sun), min 1
function daysLeftInWeek() {
  const today = new Date().getDay(); // 0=Sun, 1=Mon ... 6=Sat
  const daysSinceMon = today === 0 ? 6 : today - 1;
  return Math.max(1, 7 - daysSinceMon);
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function WeeklyMissionPlan({ scholar, weeklyStats = [], onStartSubject }) {
  const week = getISOWeek(new Date());
  const daysLeft = daysLeftInWeek();

  // Derive active subjects from scholar
  const subjects = useMemo(() => {
    if (!scholar) return [];
    const base = scholar.selected_subjects?.length
      ? scholar.selected_subjects
      : ["mathematics", "english"];

    // Exam mode adds VR/NVR
    if (scholar.exam_mode === "eleven_plus") {
      const extras = ["verbal_reasoning", "non_verbal_reasoning"].filter(
        (s) => !base.includes(s)
      );
      return [...base, ...extras];
    }
    return base;
  }, [scholar]);

  // Map weeklyStats into a lookup by subject
  const statsMap = useMemo(() => {
    const m = {};
    weeklyStats.forEach((s) => {
      m[s.subject] = s;
    });
    return m;
  }, [weeklyStats]);

  // Build plan items
  const plan = useMemo(
    () =>
      subjects.map((subject) => {
        const stats = statsMap[subject] || { questions_correct: 0, questions_total: 0, minutes: 0 };
        // Each session = 10 questions; missions done = floor(total/10)
        const missionsDone = Math.floor((stats.questions_total || 0) / 10);
        const missionsTarget = MISSIONS_PER_SUBJECT;
        const pct = Math.min(100, Math.round((missionsDone / missionsTarget) * 100));
        const done = missionsDone >= missionsTarget;
        const meta = SUBJECT_META[subject] || fallbackMeta(subject);
        return { subject, meta, missionsDone, missionsTarget, pct, done, minutes: stats.minutes || 0 };
      }),
    [subjects, statsMap]
  );

  const totalDone = plan.reduce((acc, p) => acc + p.missionsDone, 0);
  const totalTarget = plan.length * MISSIONS_PER_SUBJECT;
  const overallPct = totalTarget > 0 ? Math.min(100, Math.round((totalDone / totalTarget) * 100)) : 0;
  const completedSubjects = plan.filter((p) => p.done).length;

  if (!scholar || plan.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-lg">📅</span>
            <h3 className="font-black text-slate-900 text-base">
              {scholar.name}&apos;s Weekly Mission Plan
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            Week {week} &middot; {daysLeft} day{daysLeft !== 1 ? "s" : ""} left &middot;{" "}
            {completedSubjects}/{plan.length} subjects complete
          </p>
        </div>
        {/* Overall ring */}
        <div className="relative w-14 h-14 flex-shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="#f1f5f9" strokeWidth="3" />
            <circle
              cx="18" cy="18" r="15.5" fill="none"
              stroke={overallPct === 100 ? "#10b981" : "#6366f1"}
              strokeWidth="3"
              strokeDasharray={`${overallPct} 100`}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-slate-800">
            {overallPct}%
          </span>
        </div>
      </div>

      {/* Subject rows */}
      <div className="divide-y divide-slate-50">
        {plan.map(({ subject, meta, missionsDone, missionsTarget, pct, done, minutes }) => (
          <button
            key={subject}
            onClick={() => onStartSubject?.(subject)}
            className="w-full px-6 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors text-left group"
          >
            {/* Icon */}
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg flex-shrink-0 ${meta.color}`}
            >
              {meta.emoji}
            </div>

            {/* Label + bar */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-bold text-slate-800 truncate">{meta.label}</span>
                <span className="text-xs font-black text-slate-500 ml-2 flex-shrink-0">
                  {missionsDone}/{missionsTarget} missions
                </span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    done ? "bg-emerald-500" : "bg-gradient-to-r from-indigo-500 to-violet-500"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              {minutes > 0 && (
                <p className="text-xs text-slate-400 mt-1">{minutes} min this week</p>
              )}
            </div>

            {/* Status */}
            <div className="flex-shrink-0">
              {done ? (
                <span className="text-emerald-500 text-xl">✓</span>
              ) : (
                <span className="text-slate-300 group-hover:text-indigo-500 transition-colors text-lg">→</span>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Footer nudge */}
      <div className="px-6 py-3 bg-slate-50 border-t border-slate-100">
        <p className="text-xs text-slate-400 text-center">
          {overallPct === 100
            ? "🎉 All missions complete this week — brilliant effort!"
            : `${totalTarget - totalDone} mission${totalTarget - totalDone !== 1 ? "s" : ""} to go — keep the streak alive!`}
        </p>
      </div>
    </div>
  );
}

// ─── Supabase query helper (call from parent) ─────────────────────────────────
// Usage:
//   const weeklyStats = await fetchWeeklyStats(supabase, scholar.id);
//
// Requires quiz_results table with columns:
//   scholar_id, subject, questions_correct, questions_total, time_spent_seconds, created_at
//
// Add this to your parent dashboard or scholar home page:

export async function fetchWeeklyStats(supabase, scholarId) {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const daysSinceMon = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - daysSinceMon);
  monday.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("quiz_results")
    .select("subject, questions_correct, questions_total, time_spent_seconds")
    .eq("scholar_id", scholarId)
    .gte("created_at", monday.toISOString());

  if (error) { console.error("[fetchWeeklyStats]", error); return []; }

  // Aggregate by subject
  const agg = {};
  (data || []).forEach(({ subject, questions_correct, questions_total, time_spent_seconds }) => {
    if (!agg[subject]) agg[subject] = { subject, questions_correct: 0, questions_total: 0, minutes: 0 };
    agg[subject].questions_correct += questions_correct || 0;
    agg[subject].questions_total   += questions_total   || 0;
    agg[subject].minutes           += Math.round((time_spent_seconds || 0) / 60);
  });

  return Object.values(agg);
}