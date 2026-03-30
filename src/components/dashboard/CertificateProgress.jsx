"use client";
/**
 * CertificateProgress.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * KS4 Phase 1 Visualization — Certificate Progress Tracker
 *
 * Shows progress toward mastery certificates per subject.
 * Tracks: topics mastered / total, next certificate milestone, and
 * a progress bar for each subject.
 *
 * Dependencies: Zero new — pure CSS/inline styles
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useMemo } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";

const CERT_MILESTONES = [
  { threshold: 3,  label: "Bronze",   emoji: "🥉", colour: "#cd7f32" },
  { threshold: 5,  label: "Silver",   emoji: "🥈", colour: "#94a3b8" },
  { threshold: 8,  label: "Gold",     emoji: "🥇", colour: "#f59e0b" },
  { threshold: 12, label: "Platinum", emoji: "💎", colour: "#8b5cf6" },
  { threshold: 18, label: "Diamond",  emoji: "💠", colour: "#06b6d4" },
];

function getCertLevel(mastered) {
  let current = null;
  let next = CERT_MILESTONES[0];
  for (let i = 0; i < CERT_MILESTONES.length; i++) {
    if (mastered >= CERT_MILESTONES[i].threshold) {
      current = CERT_MILESTONES[i];
      next = CERT_MILESTONES[i + 1] ?? null;
    }
  }
  return { current, next };
}

export default function CertificateProgress({
  masteryData = [],
  subjects = [],
}) {
  const { isDark } = useTheme();
  const subjectProgress = useMemo(() => {
    const groups = {};
    masteryData.forEach(r => {
      if (!groups[r.subject]) groups[r.subject] = { total: 0, mastered: 0 };
      groups[r.subject].total++;
      if ((r.mastery_score ?? 0) >= 0.80) groups[r.subject].mastered++;
    });

    return Object.entries(groups)
      .map(([subj, data]) => {
        const { current, next } = getCertLevel(data.mastered);
        return {
          subject: subj,
          displayName: subj.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
          mastered: data.mastered,
          total: data.total,
          pct: data.total > 0 ? Math.round((data.mastered / data.total) * 100) : 0,
          currentCert: current,
          nextCert: next,
          toNextCert: next ? Math.max(0, next.threshold - data.mastered) : 0,
        };
      })
      .sort((a, b) => b.mastered - a.mastered);
  }, [masteryData]);

  if (subjectProgress.length === 0) {
    return (
      <div style={{ padding: 16, textAlign: "center", color: isDark ? "rgba(167,139,250,0.3)" : "rgba(30,27,75,0.35)", fontSize: 12, fontWeight: 600 }}>
        Master topics to earn certificates — keep practising!
      </div>
    );
  }

  // Overall stats
  const totalMastered = subjectProgress.reduce((s, p) => s + p.mastered, 0);
  const overallLevel = getCertLevel(totalMastered);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Overall progress header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 14px", borderRadius: 10,
        background: overallLevel.current
          ? `${overallLevel.current.colour}10`
          : "rgba(139,92,246,0.04)",
        border: `1px solid ${overallLevel.current?.colour ?? "#8b5cf6"}18`,
      }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 800, color: "#8b5cf6", textTransform: "uppercase", letterSpacing: "0.12em" }}>
            Certificate Level
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
            <span style={{ fontSize: 20 }}>{overallLevel.current?.emoji ?? "🎓"}</span>
            <span style={{ fontSize: 16, fontWeight: 900, color: overallLevel.current?.colour ?? "#8b5cf6" }}>
              {overallLevel.current?.label ?? "Beginner"}
            </span>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: isDark ? "#ede9fe" : "#1e1b4b" }}>{totalMastered}</div>
          <div style={{ fontSize: 9, fontWeight: 600, color: isDark ? "rgba(167,139,250,0.4)" : "rgba(30,27,75,0.4)" }}>topics mastered</div>
        </div>
      </div>

      {/* Next milestone */}
      {overallLevel.next && (
        <div style={{
          padding: "8px 14px", borderRadius: 8,
          background: `${overallLevel.next.colour}08`,
          border: `1px solid ${overallLevel.next.colour}12`,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{ fontSize: 14 }}>{overallLevel.next.emoji}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: isDark ? "#e2e8f0" : "#1e1b4b" }}>
              {overallLevel.next.threshold - totalMastered} more topic{(overallLevel.next.threshold - totalMastered) !== 1 ? "s" : ""} to {overallLevel.next.label}
            </div>
            <div style={{ height: 4, borderRadius: 2, background: `${overallLevel.next.colour}12`, marginTop: 4, overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 2,
                width: `${Math.min(100, (totalMastered / overallLevel.next.threshold) * 100)}%`,
                background: overallLevel.next.colour,
                transition: "width 0.8s ease",
              }} />
            </div>
          </div>
        </div>
      )}

      {/* Per-subject progress */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {subjectProgress.slice(0, 5).map(sp => (
          <div key={sp.subject} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "8px 10px", borderRadius: 8,
            background: "rgba(139,92,246,0.02)",
            border: "1px solid rgba(139,92,246,0.06)",
          }}>
            {/* Subject cert level */}
            <span style={{ fontSize: 14, width: 20, textAlign: "center" }}>
              {sp.currentCert?.emoji ?? "📘"}
            </span>
            {/* Name + progress */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: isDark ? "#e2e8f0" : "#1e1b4b" }}>
                  {sp.displayName.split(" ")[0]}
                </span>
                <span style={{ fontSize: 9, fontWeight: 700, color: sp.currentCert?.colour ?? "#8b5cf6" }}>
                  {sp.mastered}/{sp.total}
                </span>
              </div>
              <div style={{ height: 3, borderRadius: 2, background: "rgba(139,92,246,0.08)", marginTop: 4, overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 2,
                  width: `${sp.pct}%`,
                  background: sp.currentCert?.colour ?? "#8b5cf6",
                  transition: "width 0.6s ease",
                }} />
              </div>
              {sp.nextCert && sp.toNextCert > 0 && (
                <div style={{ fontSize: 8, color: isDark ? "rgba(167,139,250,0.35)" : "rgba(30,27,75,0.35)", marginTop: 2, fontWeight: 600 }}>
                  {sp.toNextCert} to {sp.nextCert.label} {sp.nextCert.emoji}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
