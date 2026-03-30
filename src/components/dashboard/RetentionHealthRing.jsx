"use client";
/**
 * RetentionHealthRing.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * KS4 Phase 1 Visualization — Retention Health Ring
 *
 * Multi-ring SVG donut chart showing retention health per subject.
 * Inner ring = overall, outer rings = individual subjects.
 * Uses exam readiness data from useDashboardData.
 *
 * Dependencies: Zero new — pure SVG
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useMemo } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";

const SUBJECT_COLOURS = {
  mathematics: "#8b5cf6",
  english: "#a855f7",
  physics: "#06b6d4",
  chemistry: "#14b8a6",
  biology: "#22c55e",
  combined_science: "#10b981",
  science: "#10b981",
  history: "#f59e0b",
  geography: "#84cc16",
  default: "#8b5cf6",
};

function getSubjectColour(subject) {
  return SUBJECT_COLOURS[subject] || SUBJECT_COLOURS.default;
}

function ArcRing({ cx, cy, radius, strokeWidth, percent, colour, delay = 0 }) {
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(percent / 100, 1));

  return (
    <>
      {/* Track */}
      <circle
        cx={cx} cy={cy} r={radius}
        fill="none"
        stroke="rgba(139,92,246,0.06)"
        strokeWidth={strokeWidth}
      />
      {/* Fill */}
      <circle
        cx={cx} cy={cy} r={radius}
        fill="none"
        stroke={colour}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{
          transition: `stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1) ${delay}ms`,
        }}
      />
    </>
  );
}

export default function RetentionHealthRing({
  examData,
  masteryData = [],
  subjects = [],
  compact = false,
}) {
  const { isDark } = useTheme();
  // Compute per-subject retention from masteryData
  const subjectRetention = useMemo(() => {
    const groups = {};
    masteryData.forEach(r => {
      if (!groups[r.subject]) groups[r.subject] = { total: 0, retained: 0, scores: [] };
      groups[r.subject].total++;
      groups[r.subject].scores.push(r.mastery_score ?? 0);
      // "Retained" = has been reviewed at least twice and score > 0.4
      const reps = r.sm2_repetitions ?? r.repetitions ?? 0;
      if (reps >= 2 && (r.mastery_score ?? 0) >= 0.4) groups[r.subject].retained++;
    });

    return Object.entries(groups).map(([subj, data]) => ({
      subject: subj,
      displayName: subj.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
      retention: data.total > 0 ? Math.round((data.retained / data.total) * 100) : 0,
      avgMastery: data.scores.length > 0
        ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length * 100)
        : 0,
      colour: getSubjectColour(subj),
    })).sort((a, b) => b.retention - a.retention);
  }, [masteryData]);

  // Use readiness data if available, otherwise compute from masteryData
  const overallRetention = examData?.readiness?.retention
    ?? (subjectRetention.length > 0
        ? Math.round(subjectRetention.reduce((s, r) => s + r.retention, 0) / subjectRetention.length)
        : 0);

  const size = compact ? 100 : 140;
  const cx = size / 2;
  const cy = size / 2;
  const innerRadius = compact ? 28 : 40;
  const ringGap = compact ? 7 : 9;
  const strokeWidth = compact ? 5 : 6;

  // Only show top 3 subjects as rings
  const rings = subjectRetention.slice(0, 3);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: compact ? 12 : 20 }}>
      {/* SVG Rings */}
      <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
        <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size }}>
          {/* Inner ring — overall retention */}
          <ArcRing
            cx={cx} cy={cy}
            radius={innerRadius}
            strokeWidth={strokeWidth + 2}
            percent={overallRetention}
            colour="#8b5cf6"
            delay={0}
          />
          {/* Subject rings */}
          {rings.map((r, i) => (
            <ArcRing
              key={r.subject}
              cx={cx} cy={cy}
              radius={innerRadius + (i + 1) * ringGap}
              strokeWidth={strokeWidth}
              percent={r.retention}
              colour={r.colour}
              delay={(i + 1) * 150}
            />
          ))}
        </svg>
        {/* Centre label */}
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontSize: compact ? 16 : 22, fontWeight: 900, color: isDark ? "#ede9fe" : "#1e1b4b" }}>
            {overallRetention}
          </span>
          <span style={{ fontSize: compact ? 7 : 8, fontWeight: 700, color: isDark ? "rgba(167,139,250,0.35)" : "rgba(30,27,75,0.35)", textTransform: "uppercase" }}>
            %
          </span>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", flexDirection: "column", gap: compact ? 4 : 6 }}>
        <div style={{ fontSize: compact ? 10 : 11, fontWeight: 700, color: isDark ? "#ede9fe" : "#1e1b4b", marginBottom: 2 }}>
          Retention Health
        </div>
        {/* Overall */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#8b5cf6" }} />
          <span style={{ fontSize: compact ? 9 : 10, color: isDark ? "rgba(167,139,250,0.5)" : "rgba(30,27,75,0.5)", fontWeight: 600 }}>
            Overall: <span style={{ color: "#8b5cf6", fontWeight: 700 }}>{overallRetention}%</span>
          </span>
        </div>
        {/* Per subject */}
        {rings.map(r => (
          <div key={r.subject} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: r.colour }} />
            <span style={{ fontSize: compact ? 9 : 10, color: isDark ? "rgba(167,139,250,0.5)" : "rgba(30,27,75,0.5)", fontWeight: 600 }}>
              {r.displayName.split(" ")[0]}: <span style={{ color: r.colour, fontWeight: 700 }}>{r.retention}%</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
