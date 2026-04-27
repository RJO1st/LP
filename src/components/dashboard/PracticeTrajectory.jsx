"use client";

/**
 * PracticeTrajectory — readiness band projection widget for parent dashboard.
 *
 * Shows where the scholar is likely to land by end of term if they maintain
 * their current practice pace. Displayed below the readiness score.
 *
 * Props:
 *   scholarId   string   — scholar UUID
 *   supabase    object   — browser Supabase client
 *   currentScore number  — current overall_score (0–100), passed in to avoid refetch
 */

import React, { useEffect, useState } from "react";

const BANDS = [
  { label: "Exceptional", min: 85, color: "#10b981", bg: "#ecfdf5", border: "#6ee7b7" },
  { label: "Ready",       min: 70, color: "#22c55e", bg: "#f0fdf4", border: "#86efac" },
  { label: "Developing",  min: 50, color: "#f59e0b", bg: "#fffbeb", border: "#fde68a" },
  { label: "Needs Support", min: 0, color: "#ef4444", bg: "#fff5f5", border: "#fecaca" },
];

function bandFor(score) {
  return BANDS.find(b => score >= b.min) ?? BANDS[3];
}

async function fetchTrajectoryData(supabase, scholarId) {
  // Get last 8 weekly readiness snapshots
  const { data: snapshots } = await supabase
    .from("scholar_readiness_snapshot")
    .select("overall_score, snapshot_date")
    .eq("scholar_id", scholarId)
    .order("snapshot_date", { ascending: false })
    .limit(8);

  if (!snapshots?.length) return null;

  const sorted = [...snapshots].sort((a, b) =>
    new Date(a.snapshot_date) - new Date(b.snapshot_date)
  );

  // Need at least 2 points to compute a slope
  if (sorted.length < 2) return { points: sorted, weeklyDelta: 0, projected: sorted[0].overall_score };

  // Compute average weekly delta (linear regression slope)
  const n = sorted.length;
  const xMean = (n - 1) / 2;
  const yMean = sorted.reduce((s, p) => s + p.overall_score, 0) / n;

  let num = 0, den = 0;
  sorted.forEach((p, i) => {
    num += (i - xMean) * (p.overall_score - yMean);
    den += (i - xMean) ** 2;
  });
  const weeklyDelta = den > 0 ? num / den : 0;

  // Project 4 weeks ahead (one month)
  const current = sorted[n - 1].overall_score;
  const projected = Math.min(100, Math.max(0, current + weeklyDelta * 4));

  return { points: sorted, weeklyDelta, projected, current };
}

export default function PracticeTrajectory({ scholarId, supabase, currentScore }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!scholarId || !supabase) { setLoading(false); return; }
    fetchTrajectoryData(supabase, scholarId)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [scholarId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="mt-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-white/10 rounded-xl p-3 animate-pulse h-20" />
    );
  }

  // If no snapshot history at all, fall back to a simple current-band display
  if (!data) {
    if (currentScore == null) return null;
    const band = bandFor(currentScore);
    return (
      <div className="mt-3 px-3 py-2.5 rounded-xl border text-[11px] font-bold"
        style={{ background: band.bg, borderColor: band.border, color: band.color }}>
        Current band: {band.label} ({Math.round(currentScore)})
      </div>
    );
  }

  const { weeklyDelta, projected, current } = data;
  const projBand = bandFor(projected);
  const currBand = bandFor(current ?? currentScore ?? 0);
  const improving = weeklyDelta > 0.3;
  const declining = weeklyDelta < -0.3;
  const stable    = !improving && !declining;

  const trendIcon  = improving ? "📈" : declining ? "📉" : "➡️";
  const trendLabel = improving ? `+${(weeklyDelta * 4).toFixed(0)} pts over 4 weeks` :
                     declining ? `${(weeklyDelta * 4).toFixed(0)} pts over 4 weeks` :
                     "Stable — consistent practice";

  const bandChanged = projBand.label !== currBand.label;

  // Mini sparkline — normalise to 0–100 in available 60px height
  const pts = data.points.map(p => p.overall_score);
  const minY = Math.min(...pts, projected) - 2;
  const maxY = Math.max(...pts, projected) + 2;
  const range = maxY - minY || 1;
  const W = 80, H = 36, pad = 4;
  const toX = (i, total) => pad + ((W - 2 * pad) * i) / Math.max(total - 1, 1);
  const toY = (v) => H - pad - ((v - minY) / range) * (H - 2 * pad);

  const histPoints = pts.map((v, i) => `${toX(i, pts.length + 1).toFixed(1)},${toY(v).toFixed(1)}`).join(" ");
  const projX = toX(pts.length, pts.length + 1).toFixed(1);
  const projY = toY(projected).toFixed(1);
  const lastX = toX(pts.length - 1, pts.length + 1).toFixed(1);
  const lastY = toY(pts[pts.length - 1]).toFixed(1);

  return (
    <div className="mt-3 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {trendIcon} Practice Trajectory
        </p>
        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">next 4 weeks</span>
      </div>

      <div className="flex items-center gap-3">
        {/* Sparkline */}
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="shrink-0">
          {/* Historical line */}
          <polyline
            points={histPoints}
            fill="none"
            stroke="#6366f1"
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {/* Projected dashed line */}
          <line
            x1={lastX} y1={lastY} x2={projX} y2={projY}
            stroke={projBand.color}
            strokeWidth="1.5"
            strokeDasharray="3,2"
            strokeLinecap="round"
          />
          {/* Projected dot */}
          <circle cx={projX} cy={projY} r="3" fill={projBand.color} />
        </svg>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-black" style={{ color: projBand.color }}>
              {Math.round(projected)}
            </span>
            <span className="text-[10px] font-bold" style={{ color: projBand.color }}>
              {projBand.label}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
            {trendLabel}
          </p>
          {bandChanged && improving && (
            <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 mt-1">
              ✨ On track to reach {projBand.label}!
            </p>
          )}
          {bandChanged && declining && (
            <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 mt-1">
              ⚠️ At risk of dropping to {projBand.label} — boost practice!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
