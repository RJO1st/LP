"use client";
// src/components/StreakCountdown.jsx
// Tier 1 Feature 4 — Streak Countdown Timer
// Shows live countdown to midnight (streak deadline).
// Urgency nudge: turns red inside final hour.
//
// Props:
//   streak          — number (current streak days)
//   lastActivityAt  — ISO string of last quiz_result created_at (or null)
//   onStartMission  — callback when CTA is tapped

import React, { useState, useEffect } from "react";

function getSecondsUntilMidnight() {
  const now = new Date();
  const midnight = new Date();
  midnight.setHours(24, 0, 0, 0);
  return Math.max(0, Math.floor((midnight - now) / 1000));
}

function formatCountdown(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return {
    hours:   String(h).padStart(2, "0"),
    minutes: String(m).padStart(2, "0"),
    seconds: String(s).padStart(2, "0"),
  };
}

function isActivityToday(lastActivityAt) {
  if (!lastActivityAt) return false;
  const last = new Date(lastActivityAt);
  const now = new Date();
  return (
    last.getDate() === now.getDate() &&
    last.getMonth() === now.getMonth() &&
    last.getFullYear() === now.getFullYear()
  );
}

export default function StreakCountdown({ streak = 0, lastActivityAt = null, onStartMission }) {
  const [seconds, setSeconds] = useState(getSecondsUntilMidnight);
  const [activityToday, setActivityToday] = useState(() => isActivityToday(lastActivityAt));

  useEffect(() => {
    setActivityToday(isActivityToday(lastActivityAt));
  }, [lastActivityAt]);

  useEffect(() => {
    const t = setInterval(() => {
      setSeconds(getSecondsUntilMidnight());
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const { hours, minutes, seconds: secs } = formatCountdown(seconds);
  const hoursLeft = Math.floor(seconds / 3600);
  const critical = hoursLeft < 1;
  const urgent = hoursLeft < 4;

  // If done for today — show celebration state
  if (activityToday) {
    return (
      <div className="flex items-center gap-4 bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4">
        <div className="text-2xl">✅</div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-emerald-800 text-sm">
            Streak secured for today!
          </p>
          <p className="text-xs text-emerald-600">
            🔥 {streak} day{streak !== 1 ? "s" : ""} and counting — brilliant work.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border px-5 py-4 transition-all ${
        critical
          ? "bg-rose-50 border-rose-300"
          : urgent
          ? "bg-amber-50 border-amber-200"
          : "bg-slate-50 border-slate-200"
      }`}
    >
      <div className="flex items-center gap-4">
        {/* Flame */}
        <div className={`text-3xl ${critical ? "animate-bounce" : ""}`}>🔥</div>

        {/* Streak + countdown */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-0.5">
            <span
              className={`text-2xl font-black tabular-nums ${
                critical ? "text-rose-600" : urgent ? "text-amber-600" : "text-slate-800"
              }`}
            >
              {hours}:{minutes}:{secs}
            </span>
            <span className="text-xs text-slate-400 font-bold">left to keep your streak</span>
          </div>
          <p className={`text-xs font-bold ${
            critical ? "text-rose-500" : urgent ? "text-amber-500" : "text-slate-500"
          }`}>
            {streak > 0
              ? `${streak} day streak at risk — do at least one mission today`
              : `Start your first mission to begin a streak`}
          </p>
        </div>

        {/* CTA */}
        <button
          onClick={onStartMission}
          className={`flex-shrink-0 text-sm font-black px-4 py-2 rounded-xl text-white transition-all hover:scale-105 active:scale-95 shadow-sm ${
            critical
              ? "bg-rose-500 shadow-rose-500/25"
              : urgent
              ? "bg-amber-500 shadow-amber-500/25"
              : "bg-indigo-600 shadow-indigo-500/25"
          }`}
        >
          Start →
        </button>
      </div>
    </div>
  );
}

// ─── Supabase query helper ────────────────────────────────────────────────────
// Call from parent. Returns { streak, lastActivityAt }

export async function fetchStreakData(supabase, scholarId) {
  // Get the last 60 days of quiz_results, one per day
  const since = new Date();
  since.setDate(since.getDate() - 60);

  const { data, error } = await supabase
    .from("quiz_results")
    .select("created_at")
    .eq("scholar_id", scholarId)
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false });

  if (error || !data?.length) return { streak: 0, lastActivityAt: null };

  const lastActivityAt = data[0].created_at;

  // Build set of unique activity dates (YYYY-MM-DD)
  const activityDates = new Set(
    data.map((r) => new Date(r.created_at).toISOString().slice(0, 10))
  );

  // Walk backwards from today counting consecutive days
  let streak = 0;
  const cursor = new Date();
  // If no activity today, start from yesterday for streak calculation
  const todayStr = cursor.toISOString().slice(0, 10);
  if (!activityDates.has(todayStr)) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (true) {
    const dateStr = cursor.toISOString().slice(0, 10);
    if (!activityDates.has(dateStr)) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return { streak, lastActivityAt };
}