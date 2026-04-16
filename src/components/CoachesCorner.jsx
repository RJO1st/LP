"use client";

/**
 * CoachesCorner — Parent Dashboard widget
 * Renders a 5-day AI-generated study plan for the active scholar.
 * Calls /api/coach/weekly-plan, caches response client-side per week.
 */

import React, { useState, useEffect, useCallback } from "react";

const DAYS_SHORT = { Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed", Thursday: "Thu", Friday: "Fri" };
const SUBJECT_EMOJI = {
  mathematics: "🔢", math: "🔢", maths: "🔢",
  english: "📖", english_language: "📖", english_literature: "📖",
  science: "🔬", biology: "🧬", chemistry: "🧪", physics: "⚛️",
  history: "🏛️", geography: "🌍",
};

function dayEmoji(day) {
  const map = { Monday: "🌅", Tuesday: "⚡", Wednesday: "🌿", Thursday: "🎯", Friday: "🏆" };
  return map[day] || "📅";
}

function subjectEmoji(subject) {
  return SUBJECT_EMOJI[subject?.toLowerCase()] || "📚";
}

function isoWeekKey() {
  const now = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil(((now - jan1) / 86400000 + jan1.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

export default function CoachesCorner({ scholarId, scholarName, isNigerian = false }) {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeDay, setActiveDay] = useState(0);

  const cacheKey = `lp_coach_plan_${scholarId}_${isoWeekKey()}`;

  const fetchPlan = useCallback(async (force = false) => {
    if (!scholarId) return;

    // Client-side cache check (sessionStorage)
    if (!force) {
      try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          setPlan(JSON.parse(cached));
          return;
        }
      } catch { /* ignore */ }
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/coach/weekly-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scholarId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load plan");
      setPlan(data.plan);
      try { sessionStorage.setItem(cacheKey, JSON.stringify(data.plan)); } catch { /* quota */ }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [scholarId, cacheKey]);

  useEffect(() => { fetchPlan(); }, [fetchPlan]);

  // Highlight current weekday
  useEffect(() => {
    if (plan?.length) {
      const todayIdx = new Date().getDay() - 1; // 0=Mon
      setActiveDay(Math.max(0, Math.min(4, todayIdx)));
    }
  }, [plan]);

  const currentDay = plan?.[activeDay];

  return (
    <div className="bg-gradient-to-br from-indigo-950/60 to-slate-800/60 border border-indigo-500/20 rounded-xl p-4 sm:p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-indigo-500/20 flex items-center justify-center text-xl">🎓</div>
          <div>
            <h3 className="font-semibold text-white text-sm">Coach&apos;s Corner</h3>
            <p className="text-xs text-indigo-300/80">This week&apos;s plan for {scholarName}</p>
          </div>
        </div>
        <button
          onClick={() => fetchPlan(true)}
          disabled={loading}
          title="Refresh plan"
          className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors disabled:opacity-40"
        >
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round" className={loading ? "animate-spin" : ""}>
            <path d="M23 4v6h-6M1 20v-6h6" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        </button>
      </div>

      {loading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-white/5 rounded-lg animate-pulse" />
          ))}
          <p className="text-center text-xs text-slate-400 mt-3">
            Tara is building {scholarName}&apos;s plan…
          </p>
        </div>
      )}

      {error && (
        <div className="text-center py-6">
          <p className="text-sm text-red-400 mb-3">{error}</p>
          <button
            onClick={() => fetchPlan(true)}
            className="text-xs px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {plan && !loading && (
        <>
          {/* Day tabs */}
          <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
            {plan.map((d, i) => (
              <button
                key={d.day}
                onClick={() => setActiveDay(i)}
                className={`flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  activeDay === i
                    ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/30"
                    : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className="text-base">{dayEmoji(d.day)}</span>
                <span>{DAYS_SHORT[d.day] ?? d.day}</span>
              </button>
            ))}
          </div>

          {/* Active day card */}
          {currentDay && (
            <div className="bg-white/5 rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{subjectEmoji(currentDay.subject)}</span>
                    <span className="text-white font-semibold text-sm capitalize">{currentDay.focus}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 capitalize">
                    {currentDay.subject?.replace(/_/g, " ")} · {currentDay.duration}
                  </p>
                </div>
                <span className="px-2.5 py-1 bg-indigo-500/20 text-indigo-300 text-xs rounded-full border border-indigo-500/20">
                  {currentDay.day}
                </span>
              </div>

              <div className="bg-slate-800/50 rounded-lg p-3">
                <p className="text-xs text-slate-300 font-medium mb-1">Today&apos;s activity</p>
                <p className="text-sm text-white">{currentDay.activity}</p>
              </div>

              <div className="flex items-start gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                <span className="text-base mt-0.5">💡</span>
                <p className="text-xs text-emerald-200">{currentDay.tip}</p>
              </div>
            </div>
          )}

          {/* Week overview strip */}
          <div className="mt-3 grid grid-cols-5 gap-1">
            {plan.map((d, i) => (
              <button
                key={d.day}
                onClick={() => setActiveDay(i)}
                className="flex flex-col items-center py-1.5 rounded hover:bg-white/5 transition-colors group"
              >
                <span className="text-xs text-slate-500 group-hover:text-slate-300 truncate w-full text-center"
                  title={d.focus}>
                  {subjectEmoji(d.subject)}
                </span>
                <div className={`mt-1 w-1.5 h-1.5 rounded-full ${i === activeDay ? "bg-indigo-400" : "bg-slate-600"}`} />
              </button>
            ))}
          </div>

          <p className="text-xs text-slate-500 text-center mt-2">
            Plan refreshes each week · Powered by Tara
          </p>
        </>
      )}
    </div>
  );
}
