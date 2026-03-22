"use client";
/**
 * AdaptiveStats.jsx
 * Deploy to: src/components/dashboard/AdaptiveStats.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Renders a row of stat cards adapted to the scholar's age band.
 * KS1: Stars, Adventures, Stickers (no percentages)
 * KS2: Stardust, Missions, Streak
 * KS3: Mastery %, Time spent, Streak
 * KS4: Predicted grade, Mastery %, Mocks completed
 *
 * Props:
 *   stats — { xp, questsCompleted, streak, streakBest, masteryPct,
 *             topicCount, timeMinutes, predictedGrade, mocksCompleted,
 *             stickersCollected }
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React from "react";
import { useTheme } from "@/components/theme/ThemeProvider";

function Card({ icon, label, value, sub }) {
  const { theme: t, isDark } = useTheme();
  return (
    <div
      style={{
        background: t.colours.card,
        border: `1px solid ${t.colours.cardBorder}`,
        borderRadius: t.radius.card * 0.7,
        padding: "14px 16px",
        flex: 1,
        minWidth: 0,
        backdropFilter: isDark ? "blur(12px)" : undefined,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: t.colours.textMuted,
            fontFamily: t.fonts.body,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          {label}
        </span>
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: t.fontWeight.black,
          color: t.colours.text,
          fontFamily: t.fonts.display,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            fontSize: 11,
            color: t.colours.textMuted,
            fontFamily: t.fonts.body,
            marginTop: 4,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

export default function AdaptiveStats({ stats = {} }) {
  const { band, theme: t } = useTheme();
  const s = stats;

  const cards = {
    ks1: [
      { icon: "⭐", label: t.xpName, value: s.xp ?? 0, sub: "this week" },
      { icon: "🗺️", label: "Adventures", value: s.questsCompleted ?? 0, sub: "completed" },
      { icon: "🏅", label: "Stickers", value: s.stickersCollected ?? 0, sub: "collected" },
    ],
    ks2: [
      { icon: t.xpIcon, label: t.xpName, value: (s.xp ?? 0).toLocaleString(), sub: `+${s.xpToday ?? 0} today` },
      { icon: "🎯", label: "Missions", value: s.questsCompleted ?? 0, sub: "completed" },
      { icon: "🔥", label: "Streak", value: `${s.streak ?? 0}d`, sub: `best: ${s.streakBest ?? 0}d` },
    ],
    ks3: [
      { icon: "📊", label: "Mastery", value: `${s.masteryPct ?? 0}%`, sub: `across ${s.topicCount ?? 0} topics` },
      { icon: "⏱️", label: "Time", value: `${((s.timeMinutes ?? 0) / 60).toFixed(1)}h`, sub: "this week" },
      { icon: "🔥", label: "Streak", value: `${s.streak ?? 0}d`, sub: `best: ${s.streakBest ?? 0}d` },
    ],
    ks4: [
      { icon: "📐", label: "Grade", value: s.predictedGrade ?? "—", sub: "predicted" },
      { icon: "◆", label: "Mastery", value: `${s.masteryPct ?? 0}%`, sub: `${s.topicCount ?? 0} topics` },
      { icon: "📝", label: "Mocks", value: s.mocksCompleted ?? 0, sub: "completed" },
    ],
  };

  return (
    <div style={{ display: "flex", gap: 8 }}>
      {(cards[band] ?? cards.ks2).map((c, i) => (
        <Card key={i} {...c} />
      ))}
    </div>
  );
}