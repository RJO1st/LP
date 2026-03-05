"use client";

import React from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";

// Stroke colours per subject — matches SUBJECT_COLORS in gamificationEngine
const SUBJECT_STROKES = {
  maths:     "#4f46e5",
  english:   "#f43f5e",
  verbal:    "#7c3aed",
  nvr:       "#0d9488",
  science:   "#10b981",
  geography: "#3b82f6",
  history:   "#f59e0b",
};

/**
 * ProgressChart — renders an accuracy trend from joined_at to now.
 *
 * Props:
 *  data     – array of { date: string, accuracy: number }
 *             OR { date: string, maths: number, english: number, … }
 *  subjects – optional string[] of subject keys for multi-line mode
 *  color    – fallback single-line colour (default indigo)
 */
export default function ProgressChart({ data = [], subjects = [], color = "#6366f1" }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-72 flex items-center justify-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
        <p className="text-slate-400 font-bold italic text-sm">No accuracy data yet.</p>
      </div>
    );
  }

  // Multi-subject mode: data contains per-subject keys
  const isMulti = subjects.length > 0 && data[0] && subjects.some(s => s in data[0]);

  return (
    <div className="w-full bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
      <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">
        {isMulti ? "Accuracy by Subject" : "Accuracy Trend"}
      </h4>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              {isMulti ? subjects.map(s => (
                <linearGradient key={s} id={`grad_${s}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={SUBJECT_STROKES[s] ?? color} stopOpacity={0.2}/>
                  <stop offset="95%" stopColor={SUBJECT_STROKES[s] ?? color} stopOpacity={0}/>
                </linearGradient>
              )) : (
                <linearGradient id="colorAcc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={color} stopOpacity={0.2}/>
                  <stop offset="95%" stopColor={color} stopOpacity={0}/>
                </linearGradient>
              )}
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800 }}
              dy={10}
            />
            <YAxis
              domain={[0, 100]}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800 }}
            />
            <Tooltip
              contentStyle={{
                borderRadius: '16px',
                border: 'none',
                boxShadow: '0 4px 24px rgba(0,0,0,.1)',
                fontWeight: 900,
                fontSize: 12,
              }}
              formatter={(val, name) => [`${val}%`, name]}
            />
            {isMulti && <Legend wrapperStyle={{ fontSize: 10, fontWeight: 700 }} />}

            {isMulti ? subjects.map(s => (
              <Area
                key={s}
                type="monotone"
                dataKey={s}
                stroke={SUBJECT_STROKES[s] ?? color}
                strokeWidth={2.5}
                fill={`url(#grad_${s})`}
                connectNulls
                dot={false}
                activeDot={{ r: 4 }}
                animationDuration={1200}
              />
            )) : (
              <Area
                type="monotone"
                dataKey="accuracy"
                stroke={color}
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorAcc)"
                dot={false}
                activeDot={{ r: 5 }}
                animationDuration={1500}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}