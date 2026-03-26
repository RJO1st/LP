"use client";
/**
 * AdaptiveTimer.jsx
 * Deploy to: src/components/game/AdaptiveTimer.jsx
 *
 * Age-adaptive visual timer for QuizShell/QuestOrchestrator.
 * Replaces the numeric-only timer with themed visuals.
 *
 * Props:
 *   timeLeft  — seconds remaining
 *   total     — total seconds for this question
 *   yearLevel — scholar's year level (determines band)
 *
 * INTEGRATION in EngineHeader:
 *   Replace the existing timer display with <AdaptiveTimer ... />
 */

import React from "react";
import { getAgeBand } from "@/lib/ageBandConfig";

export default function AdaptiveTimer({ timeLeft, total, yearLevel, curriculum }) {
  const band = getAgeBand(yearLevel, curriculum);
  const pct = total > 0 ? timeLeft / total : 1;
  const isLow = timeLeft <= 10;

  // ── KS1: Caterpillar eating leaves ────────────────────────────────
  if (band === "ks1") {
    const leaves = 5;
    const eaten = Math.floor((1 - pct) * leaves);
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 3, background: isLow ? "#fef2f2" : "#ecfdf5", borderRadius: 20, padding: "4px 10px" }}>
        <span style={{ fontSize: 18 }}>{isLow ? "😰" : "🐛"}</span>
        {Array.from({ length: leaves }, (_, i) => (
          <span
            key={i}
            style={{
              fontSize: 14,
              opacity: i < eaten ? 0.15 : 1,
              transition: "opacity 0.5s ease",
              filter: i < eaten ? "grayscale(1)" : "none",
            }}
          >
            🍃
          </span>
        ))}
      </div>
    );
  }

  // ── KS2: Rocket fuel bar ──────────────────────────────────────────
  if (band === "ks2") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 6, background: isLow ? "#fef2f2" : "#eef2ff", borderRadius: 20, padding: "4px 10px" }}>
        <span style={{ fontSize: 16 }}>🚀</span>
        <div
          style={{
            width: 64,
            height: 8,
            background: "#e2e8f0",
            borderRadius: 4,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${pct * 100}%`,
              height: "100%",
              background: isLow
                ? "linear-gradient(90deg, #f87171, #ef4444)"
                : "linear-gradient(90deg, #818cf8, #a78bfa)",
              borderRadius: 4,
              transition: "width 1s linear",
            }}
          />
        </div>
        <span
          style={{
            fontSize: 12,
            fontWeight: 800,
            color: isLow ? "#dc2626" : "#4f46e5",
            fontVariantNumeric: "tabular-nums",
            minWidth: 24,
          }}
        >
          {timeLeft}s
        </span>
      </div>
    );
  }

  // ── KS3: Clean progress bar ───────────────────────────────────────
  if (band === "ks3") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 6, background: isLow ? "#fef2f2" : "#f1f5f9", borderRadius: 20, padding: "4px 10px" }}>
        <div
          style={{
            width: 70,
            height: 6,
            background: "#cbd5e1",
            borderRadius: 3,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${pct * 100}%`,
              height: "100%",
              background: isLow ? "#ef4444" : "#0ea5e9",
              borderRadius: 3,
              transition: "width 1s linear",
            }}
          />
        </div>
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: isLow ? "#dc2626" : "#334155",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {timeLeft}s
        </span>
      </div>
    );
  }

  // ── KS4: SVG ring countdown ───────────────────────────────────────
  const size = 32;
  const stroke = 3;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - pct);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, background: isLow ? "#fef2f2" : "#f5f3ff", borderRadius: 20, padding: "3px 10px 3px 4px" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="#e2e8f0" strokeWidth={stroke}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke={isLow ? "#ef4444" : "#7c3aed"}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s linear" }}
        />
      </svg>
      <span
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: isLow ? "#dc2626" : "#5b21b6",
          fontVariantNumeric: "tabular-nums",
          fontFamily: "'DM Mono', monospace",
        }}
      >
        {String(Math.floor(timeLeft / 60)).padStart(2, "0")}:
        {String(timeLeft % 60).padStart(2, "0")}
      </span>
    </div>
  );
}