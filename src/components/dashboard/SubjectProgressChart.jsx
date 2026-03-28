"use client";
/**
 * SubjectProgressChart.jsx
 * Deploy to: src/components/dashboard/SubjectProgressChart.jsx
 *
 * Horizontal bar chart showing mastery % per subject for the scholar's year level.
 * Adapts visuals to match KS band theme.
 */

import React from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { getSubjectLabel, getSubjectColor } from "@/lib/subjectDisplay";
import { calculatePercentage } from "@/lib/calculationUtils";

export default function SubjectProgressChart({ masteryData = [], subjects = [] }) {
  const { band, theme: t, isDark } = useTheme();

  // Group mastery by subject and compute averages
  const subjectAvg = {};
  masteryData.forEach(r => {
    const subj = (r.subject || "").toLowerCase();
    if (!subjectAvg[subj]) subjectAvg[subj] = { total: 0, count: 0 };
    subjectAvg[subj].total += (r.mastery_score ?? r.p_know ?? 0);
    subjectAvg[subj].count += 1;
  });

  // Also include subjects from the subjects prop even if no mastery data
  subjects.forEach(s => {
    if (!subjectAvg[s]) subjectAvg[s] = { total: 0, count: 0 };
  });

  const entries = Object.entries(subjectAvg)
    .map(([subj, { total, count }]) => ({
      subject: subj,
      label: getSubjectLabel(subj, band),
      pct: calculatePercentage(total, count),
      color: getSubjectColor(subj) || t.colours.accent,
    }))
    .sort((a, b) => b.pct - a.pct);

  if (entries.length === 0) return null;

  const barHeight = band === "ks1" ? 20 : 16;
  const fontSize = band === "ks1" ? 12 : 11;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: band === "ks1" ? 10 : 8 }}>
      {entries.map(({ subject, label, pct, color }) => (
        <div key={subject} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            width: band === "ks1" ? 70 : 80, fontSize, fontWeight: 700,
            color: t.colours.text, fontFamily: t.fonts.display,
            textAlign: "right", flexShrink: 0,
          }}>
            {label}
          </span>
          <div style={{
            flex: 1, height: barHeight, borderRadius: barHeight / 2,
            background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
            overflow: "hidden", position: "relative",
          }}>
            <div style={{
              height: "100%", borderRadius: barHeight / 2,
              width: `${Math.max(pct, 2)}%`,
              background: `linear-gradient(90deg, ${color}, ${color}cc)`,
              transition: "width 0.5s ease",
              minWidth: pct > 0 ? 8 : 0,
            }} />
          </div>
          <span style={{
            width: 36, fontSize: fontSize - 1, fontWeight: 700,
            color: pct > 0 ? color : t.colours.textMuted,
            fontFamily: t.fonts.display, textAlign: "right", flexShrink: 0,
          }}>
            {pct}%
          </span>
        </div>
      ))}
    </div>
  );
}
