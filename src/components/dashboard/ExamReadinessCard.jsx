"use client";

/**
 * ExamReadinessCard.jsx
 * Deploy to: src/components/dashboard/ExamReadinessCard.jsx
 *
 * Displays exam readiness visually with:
 *   - Large circular gauge showing overall readiness %
 *   - Predicted grade badge
 *   - Subject breakdown bars (color-coded)
 *   - "Weakest areas" callout with "Focus Here" buttons
 *   - Estimated days to ready (if under 80%)
 *   - "On track" / "Needs attention" / "At risk" status indicator
 *
 * Dark theme: slate-900 background matching existing LaunchPard dashboards.
 */

import { useState, useEffect } from "react";
import {
  calculateExamReadiness,
  getSubjectReadiness,
  estimateGrade,
  getWeakestAreas,
  estimateDaysToReady,
  getReadinessStatus,
  getExamConfig,
} from "@/lib/examReadiness";

/**
 * ExamReadinessCard component
 *
 * @component
 * @param {Object} props
 * @param {string} props.examType - exam key ("11plus" | "gcse_foundation" | "gcse_higher" | "waec" | "bece")
 * @param {Object} props.masteryData - {subjectKey: {compositeScore, stability, recency, timesSeen, lastSeenAt}}
 * @param {Function} props.onPracticeSubject - callback (subjectKey) => void
 * @param {number} props.scholarYear - student's year level (for context)
 * @returns {JSX.Element|null}
 */
export default function ExamReadinessCard({
  examType,
  masteryData = {},
  onPracticeSubject = () => {},
  scholarYear = null,
}) {
  const [readiness, setReadiness] = useState(null);
  const [subjectReadiness, setSubjectReadiness] = useState(null);
  const [estimatedGrade, setEstimatedGrade] = useState(null);
  const [weakestAreas, setWeakestAreas] = useState(null);
  const [daysToReady, setDaysToReady] = useState(null);
  const [status, setStatus] = useState(null);

  const config = getExamConfig(examType);

  // Calculate all readiness metrics on mount or when data changes
  useEffect(() => {
    if (!examType || !config) return;

    const r = calculateExamReadiness(examType, masteryData);
    const sr = getSubjectReadiness(examType, masteryData);
    const grade = estimateGrade(examType, r);
    const weak = getWeakestAreas(examType, masteryData, 3);
    const days = r < 80 ? estimateDaysToReady(examType, masteryData, 80) : 0;
    const st = getReadinessStatus(r, examType);

    setReadiness(r);
    setSubjectReadiness(sr);
    setEstimatedGrade(grade);
    setWeakestAreas(weak);
    setDaysToReady(days);
    setStatus(st);
  }, [examType, masteryData, config]);

  // Null safety
  if (!config || readiness === null) {
    return null;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // STYLING UTILITIES
  // ──────────────────────────────────────────────────────────────────────────

  const readinessColor =
    readiness >= 80
      ? "#10b981" // green
      : readiness >= 60
        ? "#f59e0b" // amber
        : readiness >= 40
          ? "#f97316" // orange
          : "#ef4444"; // red

  const getSubjectBarColor = (score) => {
    if (score >= 80) return "#10b981"; // green
    if (score >= 50) return "#f59e0b"; // amber
    return "#ef4444"; // red
  };

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        borderRadius: 24,
        border: "1px solid #475569",
        padding: 28,
        maxWidth: 480,
        color: "#f1f5f9",
        fontFamily: "'Nunito', sans-serif",
      }}
    >
      {/* ─── HEADER: Circular Gauge + Exam Title ─── */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        {/* Circular Readiness Gauge */}
        <div
          style={{
            position: "relative",
            width: 140,
            height: 140,
            margin: "0 auto 16px",
          }}
        >
          <svg width={140} height={140} viewBox="0 0 140 140">
            {/* Background circle */}
            <circle
              cx={70}
              cy={70}
              r={60}
              fill="none"
              stroke="#334155"
              strokeWidth={6}
            />
            {/* Progress circle (animated) */}
            <circle
              cx={70}
              cy={70}
              r={60}
              fill="none"
              stroke={readinessColor}
              strokeWidth={6}
              strokeDasharray={`${(readiness / 100) * 376.99} 376.99`}
              strokeLinecap="round"
              transform="rotate(-90 70 70)"
              style={{
                transition: "stroke-dasharray 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)",
              }}
            />
          </svg>
          {/* Center percentage text */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontSize: 36,
                fontWeight: 900,
                color: readinessColor,
                lineHeight: 1,
              }}
            >
              {readiness}%
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "#94a3b8",
                textTransform: "uppercase",
                marginTop: 2,
              }}
            >
              Ready
            </span>
          </div>
        </div>

        {/* Exam title and status */}
        <h3
          style={{
            fontSize: 20,
            fontWeight: 900,
            color: "#f1f5f9",
            margin: "0 0 6px",
          }}
        >
          {config.label}
        </h3>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <span style={{ fontSize: 24 }}>{status?.emoji}</span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: status?.color,
            }}
          >
            {status?.status}
          </span>
        </div>
      </div>

      {/* ─── ESTIMATED GRADE BADGE ─── */}
      {estimatedGrade && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 20,
          }}
        >
          <div
            style={{
              background: "rgba(99, 102, 241, 0.15)",
              border: "1px solid #6366f1",
              borderRadius: 12,
              padding: "8px 16px",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 12, color: "#94a3b8" }}>Est. Grade:</span>
            <span
              style={{
                fontSize: 14,
                fontWeight: 900,
                color: "#6366f1",
              }}
            >
              {estimatedGrade}
            </span>
          </div>
        </div>
      )}

      {/* ─── SUBJECT BREAKDOWN BARS ─── */}
      <div style={{ marginBottom: 24 }}>
        <h4
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "#cbd5e1",
            textTransform: "uppercase",
            marginBottom: 12,
            letterSpacing: "0.5px",
          }}
        >
          Subject Breakdown
        </h4>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {Object.entries(config.subjects).map(([subjectKey, subjectConfig]) => {
            const score = subjectReadiness?.[subjectKey] || 0;
            const barColor = getSubjectBarColor(score);

            return (
              <div key={subjectKey}>
                {/* Subject label + score */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 6,
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#cbd5e1",
                    }}
                  >
                    <span style={{ marginRight: 6 }}>{subjectConfig.icon}</span>
                    {subjectConfig.label}
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 900,
                      color: barColor,
                    }}
                  >
                    {score}%
                  </span>
                </div>

                {/* Progress bar */}
                <div
                  style={{
                    height: 8,
                    background: "#1e293b",
                    borderRadius: 4,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${score}%`,
                      background: barColor,
                      borderRadius: 4,
                      transition: "width 0.8s ease",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── WEAKEST AREAS CALLOUT ─── */}
      {weakestAreas && weakestAreas.length > 0 && (
        <div
          style={{
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: 16,
            padding: 16,
            marginBottom: 20,
          }}
        >
          <h4
            style={{
              fontSize: 13,
              fontWeight: 900,
              color: "#fca5a5",
              margin: "0 0 10px",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>🎯</span> Focus Here
          </h4>

          {weakestAreas.map((area) => (
            <div
              key={area.subjectKey}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <span style={{ fontSize: 13, color: "#cbd5e1" }}>
                <span style={{ marginRight: 6 }}>{area.icon}</span>
                {area.label}
              </span>
              <button
                onClick={() => onPracticeSubject(area.subjectKey)}
                style={{
                  background: "rgba(239, 68, 68, 0.2)",
                  color: "#fca5a5",
                  border: "1px solid rgba(239, 68, 68, 0.4)",
                  borderRadius: 6,
                  padding: "4px 10px",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = "rgba(239, 68, 68, 0.3)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = "rgba(239, 68, 68, 0.2)";
                }}
              >
                Practice
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ─── DAYS TO READY (if applicable) ─── */}
      {readiness < 80 && daysToReady !== null && daysToReady > 0 && (
        <div
          style={{
            background: "rgba(251, 146, 60, 0.1)",
            border: "1px solid rgba(251, 146, 60, 0.3)",
            borderRadius: 12,
            padding: "12px 14px",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span style={{ fontSize: 18 }}>⏱️</span>
          <span style={{ fontSize: 12, color: "#cbd5e1" }}>
            <span style={{ fontWeight: 700, color: "#fed7aa" }}>
              ~{daysToReady} days
            </span>{" "}
            until exam ready at current pace
          </span>
        </div>
      )}

      {/* ─── ENCOURAGEMENT MESSAGE ─── */}
      <div
        style={{
          background: "rgba(99, 102, 241, 0.1)",
          borderRadius: 12,
          padding: "12px 14px",
        }}
      >
        <p
          style={{
            fontSize: 12,
            color: "#cbd5e1",
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          {readiness >= 80
            ? "🎉 You're on track for the exam! Keep up the consistent practice to maintain this level."
            : readiness >= 60
              ? "💪 Good progress! Focus on the weaker areas to boost your overall readiness."
              : "📚 Build a strong foundation with daily practice. Small steps lead to big improvements!"}
        </p>
      </div>
    </div>
  );
}
