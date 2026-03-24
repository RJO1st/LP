"use client";
/**
 * MockTestLauncher.jsx
 * Deploy to: src/components/dashboard/MockTestLauncher.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Mock test card for KS3/KS4 dashboard. Shows available mocks, timing,
 * and past results. Clicking launches the test via QuestOrchestrator
 * in exam mode with full timing.
 *
 * Props:
 *   subject    — string
 *   curriculum — string
 *   examMode   — string (gcse, waec, neco, eleven_plus)
 *   pastMocks  — [{ date, score, total, predictedGrade }]
 *   onStartMock — (config) => void
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { getSubjectLabel } from "@/lib/subjectDisplay";

const MOCK_CONFIGS = {
  gcse: {
    label: "GCSE Mock",
    questions: 30,
    duration: 45,    // minutes
    format: "AQA / Edexcel style",
    icon: "📝",
  },
  waec: {
    label: "WAEC Mock",
    questions: 40,
    duration: 60,
    format: "WASSCE format",
    icon: "📝",
  },
  neco: {
    label: "NECO Mock",
    questions: 40,
    duration: 60,
    format: "SSCE format",
    icon: "📝",
  },
  eleven_plus: {
    label: "11+ Mock",
    questions: 50,
    duration: 50,
    format: "GL / CEM style",
    icon: "📝",
  },
  general: {
    label: "Practice Test",
    questions: 20,
    duration: 30,
    format: "Adaptive difficulty",
    icon: "📋",
  },
};

export default function MockTestLauncher({
  subject = "mathematics",
  curriculum,
  examMode = "general",
  pastMocks = [],
  onStartMock,
}) {
  const { band, theme: t, isDark } = useTheme();

  // Only render for KS3/KS4
  if (band === "ks1" || band === "ks2") return null;

  const config = MOCK_CONFIGS[examMode] || MOCK_CONFIGS.general;
  const subjectLabel = getSubjectLabel(subject);
  const lastMock = pastMocks.length > 0 ? pastMocks[0] : null;

  return (
    <div
      style={{
        background: t.colours.card,
        border: `1px solid ${t.colours.cardBorder}`,
        borderRadius: t.radius.card,
        padding: 18,
        backdropFilter: isDark ? "blur(12px)" : undefined,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div
          style={{
            width: 36, height: 36, borderRadius: t.radius.button,
            background: `linear-gradient(135deg, ${t.colours.accent}, ${t.colours.accentDark})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, flexShrink: 0,
          }}
        >
          {config.icon}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: t.fontWeight.bold, color: t.colours.text, fontFamily: t.fonts.display }}>
            {config.label} — {subjectLabel}
          </div>
          <div style={{ fontSize: 11, color: t.colours.textMuted, fontFamily: t.fonts.body }}>
            {config.questions} questions · {config.duration} min · {config.format}
          </div>
        </div>
      </div>

      {/* Last attempt */}
      {lastMock && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "10px 12px",
            background: t.colours.accentLight,
            borderRadius: t.radius.button,
            marginBottom: 12,
            fontSize: 12,
            fontFamily: t.fonts.body,
          }}
        >
          <div>
            <span style={{ fontWeight: 600, color: t.colours.text }}>Last attempt: </span>
            <span style={{ color: t.colours.textMuted }}>
              {lastMock.score}/{lastMock.total} ({Math.round((lastMock.score / lastMock.total) * 100)}%)
            </span>
          </div>
          {lastMock.predictedGrade && (
            <span style={{ fontWeight: 600, color: t.colours.accent }}>
              Grade {lastMock.predictedGrade}
            </span>
          )}
        </div>
      )}

      {/* Start button */}
      <button
        onClick={() =>
          onStartMock?.({
            subject,
            examMode,
            questionCount: config.questions,
            durationMinutes: config.duration,
            isMock: true,
          })
        }
        style={{
          width: "100%",
          padding: "12px 16px",
          background: `linear-gradient(135deg, ${t.colours.accent}, ${t.colours.accentDark})`,
          border: "none",
          borderRadius: t.radius.button,
          color: "#fff",
          fontSize: 13,
          fontWeight: t.fontWeight.bold,
          fontFamily: t.fonts.display,
          cursor: "pointer",
          transition: "opacity 0.15s",
        }}
      >
        Start {config.label}
      </button>

      {/* Past mocks summary */}
      {pastMocks.length > 1 && (
        <div style={{ marginTop: 10, fontSize: 10, color: t.colours.textMuted, fontFamily: t.fonts.body }}>
          {pastMocks.length} mocks completed ·
          Average: {Math.round(pastMocks.reduce((s, m) => s + (m.score / m.total) * 100, 0) / pastMocks.length)}%
        </div>
      )}
    </div>
  );
}