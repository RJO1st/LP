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
import { getSubjectLabel } from "@/lib/subjectDisplay";

const SUBJECT_COLORS = {
  mathematics: "#6366f1", maths: "#6366f1",
  english: "#e11d48", english_studies: "#e11d48",
  science: "#10b981", basic_science: "#10b981",
  verbal_reasoning: "#7c3aed",
  non_verbal_reasoning: "#0891b2",
  history: "#92400e", geography: "#065f46",
  computing: "#475569",
  physics: "#0ea5e9", chemistry: "#dc2626", biology: "#16a34a",
  languages: "#8b5cf6", music: "#ec4899", art: "#f97316", pe: "#84cc16",
  social_studies: "#0891b2", civic_education: "#2563eb",
  religious_studies: "#a855f7", religious_education: "#a855f7",
  design_and_technology: "#b45309",
};

// Subject labels now come from getSubjectLabel() in subjectDisplay.js

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
      pct: count > 0 ? Math.round((total / count) * 100) : 0,
      color: SUBJECT_COLORS[subj] || t.colours.accent,
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
