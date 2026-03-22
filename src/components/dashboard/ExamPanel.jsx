"use client";
/**
 * ExamPanel.jsx
 * Deploy to: src/components/dashboard/ExamPanel.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * KS4 only. Exam readiness command panel showing:
 *   - Predicted grade (AI-derived from mastery data)
 *   - Exam countdown (days until next exam)
 *   - Topics remaining
 *   - Mocks completed
 *   - Today's AI-suggested revision plan
 *
 * Props:
 *   predictedGrade   — string|number (e.g. "7", "A*", "B2")
 *   previousGrade    — string|number (for comparison)
 *   examName         — string (e.g. "GCSE Maths")
 *   daysUntilExam    — number
 *   topicsRemaining  — number
 *   mocksCompleted   — number
 *   revisionPlan     — [{ title, duration, status }]
 *                       status: 'next' | 'pending' | 'done'
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React from "react";
import { useTheme } from "@/components/theme/ThemeProvider";

export default function ExamPanel({
  predictedGrade,
  previousGrade,
  examName = "GCSE Maths",
  daysUntilExam,
  topicsRemaining,
  mocksCompleted,
  revisionPlan = [],
}) {
  const { band, theme: t, isDark } = useTheme();

  // Only render for KS4
  if (band !== "ks4") return null;

  const gradeComparison = previousGrade
    ? `up from ${previousGrade}`
    : null;

  return (
    <div
      style={{
        background: t.colours.card,
        border: `1px solid ${t.colours.cardBorder}`,
        borderRadius: t.radius.card,
        padding: 20,
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: t.fontWeight.bold,
            color: t.colours.text,
            fontFamily: t.fonts.display,
          }}
        >
          📐 Exam Readiness
        </span>
        <span
          style={{
            fontSize: 11,
            color: t.colours.accent,
            fontWeight: 600,
            fontFamily: t.fonts.body,
          }}
        >
          {examName}
        </span>
      </div>

      {/* Predicted grade */}
      {predictedGrade && (
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 16 }}>
          <span
            style={{
              fontSize: 36,
              fontWeight: 700,
              color: t.colours.accent,
              fontFamily: t.fonts.display,
            }}
          >
            {predictedGrade}
          </span>
          <span
            style={{
              fontSize: 13,
              color: t.colours.textMuted,
              fontFamily: t.fonts.body,
            }}
          >
            Predicted grade{gradeComparison ? ` · ${gradeComparison}` : ""}
          </span>
        </div>
      )}

      {/* Key metrics */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[
          { n: daysUntilExam ?? "—", l: "days" },
          { n: topicsRemaining ?? "—", l: "topics" },
          { n: mocksCompleted ?? "—", l: "mocks" },
        ].map((d, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              background: t.colours.accentLight,
              borderRadius: 10,
              padding: "10px 8px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: t.colours.text,
                fontFamily: t.fonts.display,
              }}
            >
              {d.n}
            </div>
            <div
              style={{
                fontSize: 9,
                color: t.colours.textMuted,
                fontFamily: t.fonts.body,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              {d.l}
            </div>
          </div>
        ))}
      </div>

      {/* Revision plan */}
      {revisionPlan.length > 0 && (
        <>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: t.colours.textMuted,
              fontFamily: t.fonts.body,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 8,
            }}
          >
            Today&apos;s revision plan
          </div>
          {revisionPlan.map((item, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 0",
                borderBottom:
                  i < revisionPlan.length - 1
                    ? `1px solid ${t.colours.cardBorder}`
                    : "none",
              }}
            >
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 6,
                  border: `1.5px solid ${
                    item.status === "done"
                      ? t.colours.success
                      : item.status === "next"
                        ? t.colours.accent
                        : t.colours.cardBorder
                  }`,
                  background:
                    item.status === "done" ? t.colours.success : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  color:
                    item.status === "done"
                      ? "#fff"
                      : item.status === "next"
                        ? t.colours.accent
                        : t.colours.textMuted,
                }}
              >
                {item.status === "done" ? "✓" : item.status === "next" ? "▶" : "○"}
              </div>
              <span
                style={{
                  fontSize: 12,
                  color: t.colours.text,
                  fontFamily: t.fonts.body,
                  flex: 1,
                }}
              >
                {item.title}
              </span>
              {item.duration && (
                <span
                  style={{
                    fontSize: 10,
                    color: t.colours.textMuted,
                    fontFamily: t.fonts.mono,
                  }}
                >
                  {item.duration}
                </span>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}