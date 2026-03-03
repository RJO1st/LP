"use client";

import React, { useState } from "react";
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";

// ── Per-subject colour palette ─────────────────────────────────────────────
const SUBJECT_COLORS = {
  maths:     "#6366f1",   // indigo
  english:   "#10b981",   // emerald
  verbal:    "#f59e0b",   // amber
  nvr:       "#8b5cf6",   // violet
  science:   "#06b6d4",   // cyan
  geography: "#84cc16",   // lime
  history:   "#f97316",   // orange
};

const SUBJECT_LABELS = {
  maths:     "Maths",
  english:   "English",
  verbal:    "Verbal",
  nvr:       "NVR",
  science:   "Science",
  geography: "Geography",
  history:   "History",
};

// Custom tooltip
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border-2 border-slate-100 rounded-2xl shadow-xl p-4 min-w-[140px]">
      <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">{label}</p>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-1">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="text-sm font-bold text-slate-600">{SUBJECT_LABELS[p.dataKey] ?? p.dataKey}</span>
          <span className="text-sm font-black ml-auto" style={{ color: p.color }}>{p.value}%</span>
        </div>
      ))}
    </div>
  );
};

// ── Component ──────────────────────────────────────────────────────────────
//
// Props:
//   data     – array of { date: string, maths?: number, english?: number, ... }
//              OR array of { date: string, accuracy: number }  (single-subject mode)
//   subjects – string[] of subject keys to render (from SUBJECTS_BY_CURRICULUM)
//   color    – fallback colour for single-subject mode
//
export default function ProgressChart({ data = [], subjects = [], color = "#6366f1" }) {

  // Detect whether caller passed multi-subject or single-subject data
  const isMulti = subjects.length > 1;

  // Active subject filter (multi mode)
  const [active, setActive] = useState(null); // null = all visible

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center bg-slate-50
                      rounded-[32px] border-4 border-dashed border-slate-100 gap-3">
        <span className="text-4xl">📈</span>
        <p className="text-slate-400 font-bold">Complete a quest to see your progress here.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[32px] border-2 border-slate-100 shadow-sm p-6 space-y-4">

      {/* Subject filter pills (multi mode only) */}
      {isMulti && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActive(null)}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all border-2
              ${active === null
                ? "bg-slate-800 text-white border-slate-900"
                : "bg-slate-100 text-slate-500 border-slate-100 hover:border-slate-300"}`}
          >
            All
          </button>
          {subjects.map(s => (
            <button
              key={s}
              onClick={() => setActive(active === s ? null : s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all border-2`}
              style={active === s || active === null
                ? { background: SUBJECT_COLORS[s] ?? color, color: "#fff", borderColor: SUBJECT_COLORS[s] ?? color }
                : { background: "#f8fafc", color: "#94a3b8", borderColor: "#f1f5f9" }
              }
            >
              {SUBJECT_LABELS[s] ?? s}
            </button>
          ))}
        </div>
      )}

      {/* Chart */}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {isMulti ? (
            <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 800 }}
                dy={10}
              />
              <YAxis
                domain={[0, 100]}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 800 }}
                tickFormatter={v => `${v}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              {subjects
                .filter(s => active === null || s === active)
                .map(s => (
                  <Line
                    key={s}
                    type="monotone"
                    dataKey={s}
                    stroke={SUBJECT_COLORS[s] ?? color}
                    strokeWidth={3}
                    dot={{ r: 4, fill: SUBJECT_COLORS[s] ?? color, strokeWidth: 0 }}
                    activeDot={{ r: 6 }}
                    animationDuration={800}
                    connectNulls
                  />
                ))
              }
            </LineChart>
          ) : (
            // Single-subject / legacy mode — area chart
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="singleGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={color} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={color} stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 800 }}
                dy={10}
              />
              <YAxis
                domain={[0, 100]}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 800 }}
                tickFormatter={v => `${v}%`}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "16px", border: "none",
                  boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)", fontWeight: 900,
                }}
                formatter={v => [`${v}%`, "Accuracy"]}
              />
              <Area
                type="monotone"
                dataKey="accuracy"
                stroke={color}
                strokeWidth={4}
                fillOpacity={1}
                fill="url(#singleGrad)"
                animationDuration={1500}
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}