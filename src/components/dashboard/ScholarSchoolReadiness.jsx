"use client";
/**
 * ScholarSchoolReadiness.jsx
 *
 * Shows a scholar's school readiness score inside the parent dashboard.
 * Only rendered when the scholar has a school_id (i.e. enrolled at a partner school).
 *
 * Free tier   — overall score gauge + grade band, subject bars blurred + upgrade CTA.
 * Scholar tier — full subject scores + top 3 topic weaknesses.
 */

import React, { useEffect, useState } from "react";
import Link from "next/link";

// ── Band config ───────────────────────────────────────────────────────────────
const BANDS = {
  Exceptional:    { colour: "#34d399", bg: "bg-emerald-500/15 dark:bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-300 dark:border-emerald-500/30" },
  Ready:          { colour: "#6366f1", bg: "bg-indigo-500/15 dark:bg-indigo-500/10",   text: "text-indigo-700 dark:text-indigo-300",   border: "border-indigo-300 dark:border-indigo-500/30" },
  Developing:     { colour: "#f59e0b", bg: "bg-amber-500/15 dark:bg-amber-500/10",    text: "text-amber-700 dark:text-amber-300",    border: "border-amber-300 dark:border-amber-500/30" },
  "Needs Support":{ colour: "#ef4444", bg: "bg-red-500/15 dark:bg-red-500/10",        text: "text-red-700 dark:text-red-300",        border: "border-red-300 dark:border-red-500/30" },
};

const SUBJECT_LABELS = {
  mathematics:      "Maths",
  english:          "English",
  verbal_reasoning: "Verbal Reasoning",
  nvr:              "Non-Verbal Reasoning",
};

// ── Circular gauge SVG ────────────────────────────────────────────────────────
function ScoreGauge({ score, colour, size = 80 }) {
  const r = (size - 10) / 2;
  const circumference = 2 * Math.PI * r;
  const strokeDash = (score / 100) * circumference;

  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor"
        className="text-slate-200 dark:text-slate-700" strokeWidth={8} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={colour}
        strokeWidth={8} strokeLinecap="round"
        strokeDasharray={`${strokeDash} ${circumference}`}
        style={{ transition: "stroke-dasharray 0.6s ease" }}
      />
    </svg>
  );
}

// ── Subject bar row ────────────────────────────────────────────────────────────
function SubjectBar({ label, score, blurred }) {
  const colour = score >= 70 ? "bg-emerald-500" : score >= 50 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className={blurred ? "blur-sm select-none pointer-events-none" : ""}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">{label}</span>
        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{score}%</span>
      </div>
      <div className="h-1.5 bg-slate-200 dark:bg-slate-700/50 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${colour}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function ScholarSchoolReadiness({ scholar, parentTier, isNgParent = false }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const isFreeTier = !parentTier || parentTier === "free";

  useEffect(() => {
    if (!scholar?.id) return;
    fetch(`/api/parent/scholar-readiness?scholar_id=${scholar.id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [scholar?.id]);

  // ── Loading ──
  if (loading) {
    return (
      <div className="mt-3 border border-slate-200 dark:border-white/10 rounded-xl p-3 animate-pulse">
        <div className="h-3 bg-slate-200 dark:bg-slate-700/40 rounded w-32 mb-3" />
        <div className="flex gap-3">
          <div className="w-16 h-16 bg-slate-200 dark:bg-slate-700/40 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="h-2 bg-slate-200 dark:bg-slate-700/40 rounded w-3/4" />
            <div className="h-2 bg-slate-200 dark:bg-slate-700/40 rounded w-1/2" />
            <div className="h-2 bg-slate-200 dark:bg-slate-700/40 rounded w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  // ── No data / error ──
  if (error || !data) return null;

  const band     = BANDS[data.grade_band] ?? BANDS["Needs Support"];
  const subjects = Object.entries(data.subjectScores || {})
    .map(([key, val]) => ({ key, label: SUBJECT_LABELS[key] || key, score: val ?? 0 }));
  const snapDate = data.snapshot_date
    ? new Date(data.snapshot_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : null;

  return (
    <div className="mt-3 border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
          🏫 School Readiness
        </p>
        {snapDate && (
          <p className="text-[9px] text-slate-400 dark:text-slate-500">Updated {snapDate}</p>
        )}
      </div>

      <div className="p-3 space-y-3">
        {/* Score + band */}
        <div className="flex items-center gap-4">
          {/* Gauge */}
          <div className="relative flex-shrink-0 flex items-center justify-center" style={{ width: 72, height: 72 }}>
            <ScoreGauge score={data.overall_score} colour={band.colour} size={72} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-black text-slate-900 dark:text-white">{data.overall_score}</span>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${band.bg} ${band.text} ${band.border}`}>
              {data.grade_band}
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-snug">
              {data.grade_band === "Exceptional" && "Top of the class — outstanding performance."}
              {data.grade_band === "Ready"        && "On track for secondary entrance — keep it up."}
              {data.grade_band === "Developing"   && "Good progress — a little more work on weak topics."}
              {data.grade_band === "Needs Support"&& "Needs focused practice across key subjects."}
            </p>
          </div>
        </div>

        {/* Subject breakdown */}
        {subjects.length > 0 && (
          <div className="space-y-2 relative">
            {subjects.map(s => (
              <SubjectBar key={s.key} label={s.label} score={s.score} blurred={isFreeTier} />
            ))}

            {/* Free-tier lock overlay */}
            {isFreeTier && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/60 dark:bg-slate-900/60 backdrop-blur-[2px] rounded-lg px-3 text-center">
                <span className="text-xl">🔒</span>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-snug">
                  Subject scores unlock with LaunchPard Scholar
                </p>
                <Link
                  href="/subscribe"
                  className="text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-colors"
                >
                  {isNgParent ? "Upgrade — ₦2,500/mo" : "Upgrade — £12.99/mo"}
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Topic weaknesses — Scholar tier only */}
        {!isFreeTier && data.topicWeaknesses?.length > 0 && (
          <div className="pt-2 border-t border-slate-100 dark:border-white/5">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">Focus topics</p>
            <div className="flex flex-wrap gap-1.5">
              {data.topicWeaknesses.slice(0, 3).map((t, i) => (
                <span key={i}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-full text-[10px] font-bold text-red-700 dark:text-red-300"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                  {t.topic} · {t.mastery}%
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
