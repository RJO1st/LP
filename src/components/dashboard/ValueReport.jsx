"use client";

/**
 * ValueReport — Parent Dashboard widget
 * "Is LaunchPard worth it?" — monthly learning stats at a glance.
 * Fetches from /api/parent/value-report
 */

import React, { useState, useEffect } from "react";

function Arrow({ up }) {
  return (
    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"
      className={up ? "text-emerald-400" : "text-red-400"}>
      <path d={up ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"} />
    </svg>
  );
}

function Stat({ icon, value, label, sub, highlight }) {
  return (
    <div className={`flex flex-col items-center text-center p-3 rounded-xl ${
      highlight ? "bg-indigo-500/15 border border-indigo-500/20" : "bg-white/5"
    }`}>
      <div className="text-2xl mb-1">{icon}</div>
      <div className={`text-2xl font-bold ${highlight ? "text-indigo-300" : "text-white"}`}>{value}</div>
      <div className="text-xs text-slate-400 font-medium mt-0.5">{label}</div>
      {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}

export default function ValueReport({ scholarId, scholarName }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!scholarId) return;
    setLoading(true);
    fetch(`/api/parent/value-report?scholarId=${scholarId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setData(d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [scholarId]);

  if (loading) {
    return (
      <div className="bg-slate-800/40 border border-white/10 rounded-xl p-4 animate-pulse">
        <div className="h-4 bg-slate-700/40 rounded w-40 mb-3" />
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-20 bg-slate-700/40 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (error || !data) return null;

  const { questionsThisMonth, topicsMasteredThisMonth, readinessDelta, streakDays, currentScore, month } = data;

  const deltaPositive = readinessDelta !== null && readinessDelta > 0;
  const deltaNeutral  = readinessDelta === null || readinessDelta === 0;

  return (
    <div className="bg-slate-800/40 border border-white/10 rounded-xl p-4 sm:p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center text-lg">📈</div>
          <div>
            <h3 className="font-semibold text-white text-sm">{month} Progress</h3>
            <p className="text-xs text-slate-400">{scholarName}&apos;s learning this month</p>
          </div>
        </div>
        {currentScore !== null && (
          <div className="flex flex-col items-end">
            <span className="text-lg font-bold text-indigo-300">{currentScore}%</span>
            <span className="text-xs text-slate-500">readiness</span>
          </div>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
        <Stat
          icon="❓"
          value={questionsThisMonth.toLocaleString()}
          label="Questions answered"
          sub={`this ${month}`}
        />
        <Stat
          icon="🏅"
          value={topicsMasteredThisMonth}
          label="Topics mastered"
          sub="new this month"
        />
        <Stat
          icon="🔥"
          value={streakDays}
          label="Day streak"
          sub="keep it going!"
          highlight={streakDays >= 3}
        />
        <div className={`flex flex-col items-center text-center p-3 rounded-xl ${
          deltaNeutral ? "bg-white/5" :
          deltaPositive ? "bg-emerald-500/10 border border-emerald-500/20" :
          "bg-red-500/10 border border-red-500/20"
        }`}>
          <div className="text-2xl mb-1">🎯</div>
          <div className="flex items-center gap-1">
            {!deltaNeutral && <Arrow up={deltaPositive} />}
            <span className={`text-2xl font-bold ${
              deltaNeutral ? "text-white" : deltaPositive ? "text-emerald-300" : "text-red-300"
            }`}>
              {readinessDelta !== null ? `${deltaPositive ? "+" : ""}${readinessDelta}%` : "—"}
            </span>
          </div>
          <div className="text-xs text-slate-400 font-medium mt-0.5">Readiness change</div>
          <div className="text-xs text-slate-500 mt-0.5">vs last month</div>
        </div>
      </div>

      {/* Value nudge */}
      {questionsThisMonth >= 50 && (
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 mt-1">
          <span>🌟</span>
          <p className="text-xs text-emerald-200">
            <strong>{scholarName}</strong> has answered {questionsThisMonth} questions this month — equivalent to{" "}
            <strong>~{Math.round(questionsThisMonth / 10)} tutoring sessions</strong>.
          </p>
        </div>
      )}
    </div>
  );
}
