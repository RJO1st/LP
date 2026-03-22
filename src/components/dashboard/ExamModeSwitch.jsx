"use client";
/**
 * ExamModeSwitch.jsx
 * Deploy to: src/components/dashboard/ExamModeSwitch.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * KS4 exam mode selector. Lets scholars switch between exam formats.
 * Each mode changes: question style, timing, difficulty, and formatting.
 *
 * Props:
 *   currentMode — string (current exam_mode from scholar record)
 *   curriculum  — string (determines available modes)
 *   onSwitch    — (mode) => void
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";

const EXAM_MODES = {
  gcse: {
    label: "GCSE",
    flag: "🇬🇧",
    desc: "AQA / Edexcel / OCR format",
    timing: "1.5 min/question",
    curricula: ["uk_national", "uk_11plus"],
  },
  waec: {
    label: "WAEC",
    flag: "🇳🇬",
    desc: "WASSCE format",
    timing: "2 min/question",
    curricula: ["ng_sss", "ng_jss"],
  },
  neco: {
    label: "NECO",
    flag: "🇳🇬",
    desc: "SSCE format",
    timing: "2 min/question",
    curricula: ["ng_sss"],
  },
  ib: {
    label: "IB",
    flag: "🌍",
    desc: "International Baccalaureate",
    timing: "2 min/question",
    curricula: ["ib_myp", "ib_pyp"],
  },
  eleven_plus: {
    label: "11+",
    flag: "🇬🇧",
    desc: "GL / CEM entrance format",
    timing: "50 sec/question",
    curricula: ["uk_11plus", "uk_national"],
  },
  general: {
    label: "Practice",
    flag: "📚",
    desc: "Standard adaptive mode",
    timing: "30 sec/question",
    curricula: ["*"], // available to all
  },
};

export default function ExamModeSwitch({ currentMode = "general", curriculum, onSwitch }) {
  const { band, theme: t } = useTheme();
  const [expanded, setExpanded] = useState(false);

  // Filter available modes based on curriculum
  const available = Object.entries(EXAM_MODES).filter(
    ([key, mode]) =>
      mode.curricula.includes("*") || mode.curricula.includes(curriculum)
  );

  // Only show for KS3+ (exam modes don't make sense for KS1/KS2)
  if (band === "ks1" || band === "ks2") return null;

  const active = EXAM_MODES[currentMode] || EXAM_MODES.general;

  return (
    <div
      style={{
        background: t.colours.card,
        border: `1px solid ${t.colours.cardBorder}`,
        borderRadius: t.radius.card,
        padding: 16,
        backdropFilter: band === "ks4" ? "blur(12px)" : undefined,
      }}
    >
      {/* Current mode display */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18 }}>{active.flag}</span>
          <div style={{ textAlign: "left" }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: t.fontWeight.bold,
                color: t.colours.text,
                fontFamily: t.fonts.display,
              }}
            >
              {active.label} Mode
            </div>
            <div
              style={{
                fontSize: 11,
                color: t.colours.textMuted,
                fontFamily: t.fonts.body,
              }}
            >
              {active.desc} · {active.timing}
            </div>
          </div>
        </div>
        <span
          style={{
            fontSize: 12,
            color: t.colours.accent,
            fontWeight: 600,
            fontFamily: t.fonts.body,
            transform: expanded ? "rotate(180deg)" : "rotate(0)",
            transition: "transform 0.2s",
          }}
        >
          ▼
        </span>
      </button>

      {/* Expanded mode list */}
      {expanded && (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 4 }}>
          {available.map(([key, mode]) => {
            const isActive = key === currentMode;
            return (
              <button
                key={key}
                onClick={() => {
                  onSwitch?.(key);
                  setExpanded(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  background: isActive ? t.colours.accentLight : "transparent",
                  border: `1px solid ${isActive ? t.colours.accent : t.colours.cardBorder}`,
                  borderRadius: t.radius.button,
                  cursor: "pointer",
                  textAlign: "left",
                  width: "100%",
                  transition: "all 0.15s",
                }}
              >
                <span style={{ fontSize: 16 }}>{mode.flag}</span>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: isActive ? t.fontWeight.bold : t.fontWeight.normal,
                      color: isActive ? t.colours.accent : t.colours.text,
                      fontFamily: t.fonts.body,
                    }}
                  >
                    {mode.label}
                  </div>
                  <div style={{ fontSize: 10, color: t.colours.textMuted }}>{mode.desc}</div>
                </div>
                <span style={{ fontSize: 10, color: t.colours.textMuted }}>{mode.timing}</span>
                {isActive && (
                  <span style={{ fontSize: 12, color: t.colours.accent }}>✓</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}