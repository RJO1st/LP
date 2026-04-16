"use client";

/**
 * DifficultyBadge — shows the scholar's current adaptive difficulty level.
 *
 * LaunchPard uses a 5-level system (Seeker → Cosmic Master).
 * Level is derived from the average p_mastery across active topics.
 *
 * Props:
 *   avgMastery  {number}  0–1 (average p_mastery across topics, or null)
 *   compact     {boolean} if true, show icon only with tooltip
 *   className   {string}
 */

import React from "react";

export const DIFFICULTY_LEVELS = [
  { id: "seeker",       label: "Seeker",       emoji: "🌱", colour: "#34d399", minMastery: 0    },
  { id: "explorer",     label: "Explorer",     emoji: "🚀", colour: "#60a5fa", minMastery: 0.35 },
  { id: "navigator",    label: "Navigator",    emoji: "⭐", colour: "#a78bfa", minMastery: 0.55 },
  { id: "commander",    label: "Commander",    emoji: "🔥", colour: "#f59e0b", minMastery: 0.72 },
  { id: "cosmic_master",label: "Cosmic Master",emoji: "🌌", colour: "#f472b6", minMastery: 0.88 },
];

export function getDifficultyLevel(avgMastery = 0) {
  const m = avgMastery ?? 0;
  for (let i = DIFFICULTY_LEVELS.length - 1; i >= 0; i--) {
    if (m >= DIFFICULTY_LEVELS[i].minMastery) return DIFFICULTY_LEVELS[i];
  }
  return DIFFICULTY_LEVELS[0];
}

export default function DifficultyBadge({ avgMastery, compact = false, className = "" }) {
  const level = getDifficultyLevel(avgMastery);
  const pct = Math.round((avgMastery ?? 0) * 100);

  if (compact) {
    return (
      <span
        title={`Difficulty Level: ${level.label} (${pct}% avg mastery)`}
        className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-base leading-none cursor-default ${className}`}
        style={{ background: level.colour + "22", border: `2px solid ${level.colour}55` }}
      >
        {level.emoji}
      </span>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold select-none ${className}`}
      style={{
        background: level.colour + "18",
        border:     `1.5px solid ${level.colour}40`,
        color:      level.colour,
      }}
    >
      <span>{level.emoji}</span>
      <span>{level.label}</span>
      <span
        className="rounded-full px-1 text-[10px] font-black"
        style={{ background: level.colour + "30", color: level.colour }}
      >
        {pct}%
      </span>
    </div>
  );
}
