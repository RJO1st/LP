"use client";
/**
 * RevisionPlanner.jsx
 * Deploy to: src/components/dashboard/RevisionPlanner.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * KS3/KS4 revision planner. AI-generates a weekly schedule from mastery data.
 * Scholars can adjust, complete, and skip items.
 *
 * Props:
 *   masteryData — [{ topic, subject, mastery_score, times_seen, next_review_at }]
 *   examDate    — Date or null
 *   examName    — string
 *   onStartTopic — (topic) => void
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useMemo } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function generatePlan(masteryData, examDate) {
  if (!masteryData?.length) return [];

  // Sort: weakest first, then overdue for review
  const now = new Date();
  const sorted = [...masteryData]
    .filter(r => (r.mastery_score ?? 0) < 0.85)
    .sort((a, b) => {
      // Overdue reviews first
      const aOverdue = a.next_review_at && new Date(a.next_review_at) <= now;
      const bOverdue = b.next_review_at && new Date(b.next_review_at) <= now;
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      // Then by mastery (lowest first)
      return (a.mastery_score ?? 0) - (b.mastery_score ?? 0);
    });

  // Generate 7-day plan: 2-3 topics per day, 15-30 min each
  const plan = [];
  let topicIdx = 0;

  for (let day = 0; day < 7; day++) {
    const dayName = DAYS[day];
    const sessionsPerDay = day < 5 ? 3 : 2; // weekdays: 3, weekends: 2
    const sessions = [];

    for (let s = 0; s < sessionsPerDay && topicIdx < sorted.length; s++) {
      const row = sorted[topicIdx % sorted.length];
      const mastery = row.mastery_score ?? 0;
      const duration = mastery < 0.3 ? 30 : mastery < 0.6 ? 20 : 15;
      const type = mastery < 0.3 ? "learn" : mastery < 0.6 ? "practice" : "review";

      sessions.push({
        topic:    row.topic,
        subject:  row.subject,
        duration: `${duration} min`,
        type,
        mastery:  Math.round(mastery * 100),
        status:   day === 0 && s === 0 ? "next" : "pending",
      });
      topicIdx++;
    }

    // Add a mock on Wednesday and Saturday
    if (day === 2 || day === 5) {
      sessions.push({
        topic:    "Mock test",
        subject:  "all",
        duration: "45 min",
        type:     "mock",
        mastery:  null,
        status:   "pending",
      });
    }

    plan.push({ day: dayName, sessions });
  }

  return plan;
}

export default function RevisionPlanner({ masteryData = [], examDate, examName, onStartTopic }) {
  const { band, theme: t, isDark } = useTheme();
  // Default to today's day index (Mon=0 .. Sun=6)
  const [selectedDay, setSelectedDay] = useState(() => {
    const jsDay = new Date().getDay();
    return (jsDay + 6) % 7; // Mon=0, Tue=1, ..., Sun=6
  });
  // Only render for KS3/KS4
  if (band === "ks1" || band === "ks2") return null;

  const plan = useMemo(() => generatePlan(masteryData, examDate), [masteryData, examDate]);
  if (plan.length === 0) return null;

  const daysUntilExam = examDate
    ? Math.max(0, Math.ceil((new Date(examDate) - new Date()) / (1000 * 60 * 60 * 24)))
    : null;

  // Auto-check: a session is "complete" when the scholar's current mastery
  // for that topic has risen above the threshold that generated it.
  // learn (<30%) → complete when mastery >= 30%
  // practice (<60%) → complete when mastery >= 60%
  // review (<85%) → complete when mastery >= 85%
  // mock sessions are never auto-checked.
  const completedItems = useMemo(() => {
    const set = new Set();
    const masteryMap = {};
    (masteryData || []).forEach(r => {
      masteryMap[r.topic] = r.mastery_score ?? 0;
    });
    plan.forEach((day, di) => {
      day.sessions.forEach((session, si) => {
        if (session.type === "mock") return;
        const currentMastery = masteryMap[session.topic] ?? 0;
        const threshold = session.type === "learn" ? 0.30
          : session.type === "practice" ? 0.60
          : 0.85;
        if (currentMastery >= threshold) set.add(`${di}-${si}`);
      });
    });
    return set;
  }, [plan, masteryData]);

  const typeColours = {
    learn:    { bg: isDark ? "rgba(251,146,60,.12)" : "#fff7ed", border: isDark ? "rgba(251,146,60,.3)" : "#fed7aa", text: "#ea580c" },
    practice: { bg: isDark ? "rgba(14,165,233,.1)"  : "#f0f9ff", border: isDark ? "rgba(14,165,233,.25)" : "#bae6fd", text: "#0284c7" },
    review:   { bg: isDark ? "rgba(34,197,94,.1)"   : "#f0fdf4", border: isDark ? "rgba(34,197,94,.25)" : "#bbf7d0", text: "#16a34a" },
    mock:     { bg: isDark ? "rgba(167,139,250,.1)"  : "#f5f3ff", border: isDark ? "rgba(167,139,250,.25)" : "#ddd6fe", text: "#7c3aed" },
  };

  return (
    <div
      style={{
        background: t.colours.card,
        border: `1px solid ${t.colours.cardBorder}`,
        borderRadius: t.radius.card,
        padding: 20,
        backdropFilter: isDark ? "blur(12px)" : undefined,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: t.fontWeight.bold, color: t.colours.text, fontFamily: t.fonts.display }}>
            📅 Revision Planner
          </div>
          <div style={{ fontSize: 11, color: t.colours.textMuted, fontFamily: t.fonts.body, marginTop: 2 }}>
            {daysUntilExam !== null ? `${examName || "Exam"} in ${daysUntilExam} days` : "Weekly plan based on your progress"}
          </div>
        </div>
        <div style={{
          fontSize: 10, fontWeight: 600, color: t.colours.accent, fontFamily: t.fonts.body,
          textTransform: "uppercase", letterSpacing: ".06em",
        }}>
          AI-suggested
        </div>
      </div>

      {/* Day tabs */}
      <div style={{ display: "flex", gap: 2, marginBottom: 14, overflowX: "auto" }}>
        {plan.map((day, i) => {
          // Map actual day of week: JS getDay() returns 0=Sun,1=Mon...6=Sat
          // DAYS array is Mon(0)..Sun(6), so todayIdx = (jsDay + 6) % 7
          const jsDay = new Date().getDay();
          const todayIdx = (jsDay + 6) % 7; // Mon=0, Tue=1, ..., Sun=6
          const isToday = i === todayIdx;
          const dayComplete = day.sessions.every((_, si) => completedItems.has(`${i}-${si}`));

          // Colours: blue for today, green for completed, grey for no activity
          const isSelected = selectedDay === i;
          let bg = "transparent";
          let fg = t.colours.textMuted; // grey default
          if (isSelected) {
            bg = isToday ? "#3b82f6" : dayComplete ? "#22c55e" : t.colours.accent;
            fg = "#fff";
          } else if (isToday) {
            bg = "rgba(59,130,246,0.1)";
            fg = "#3b82f6";
          } else if (dayComplete) {
            fg = "#22c55e";
          }

          return (
            <button
              key={i}
              onClick={() => setSelectedDay(i)}
              style={{
                padding: "8px 12px",
                background: bg,
                color: fg,
                borderRadius: t.radius.button,
                fontSize: 11,
                fontWeight: 700,
                fontFamily: t.fonts.body,
                cursor: "pointer",
                border: isToday && !isSelected ? "1.5px solid #3b82f6" : "none",
                textDecoration: dayComplete && !isSelected ? "line-through" : "none",
                opacity: dayComplete && !isSelected && !isToday ? 0.6 : 1,
                whiteSpace: "nowrap",
              }}
            >
              {day.day}{isToday ? " ●" : ""}
            </button>
          );
        })}
      </div>

      {/* Sessions for selected day */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {plan[selectedDay]?.sessions.map((session, si) => {
          const key = `${selectedDay}-${si}`;
          const done = completedItems.has(key);
          const tc = typeColours[session.type] || typeColours.practice;
          const topicLabel = (session.topic || "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

          return (
            <div
              key={si}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                background: done ? "transparent" : tc.bg,
                border: `1px solid ${done ? t.colours.cardBorder : tc.border}`,
                borderRadius: t.radius.button,
                opacity: done ? 0.5 : 1,
                transition: "all 0.2s",
              }}
            >
              {/* Auto-check indicator — checked when mastery threshold is met */}
              <div
                style={{
                  width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                  border: `2px solid ${done ? t.colours.success : tc.text}`,
                  background: done ? t.colours.success : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, color: done ? "#fff" : "transparent",
                  transition: "all 0.3s ease",
                }}
              >
                {done ? "✓" : ""}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 12, fontWeight: t.fontWeight.bold,
                  color: done ? t.colours.textMuted : t.colours.text,
                  fontFamily: t.fonts.body,
                  textDecoration: done ? "line-through" : "none",
                }}>
                  {topicLabel}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                  <span style={{
                    fontSize: 9, fontWeight: 700, textTransform: "uppercase",
                    color: tc.text, letterSpacing: ".04em",
                  }}>
                    {session.type}
                  </span>
                  {session.mastery !== null && (
                    <span style={{ fontSize: 9, color: t.colours.textMuted }}>{session.mastery}% mastery</span>
                  )}
                </div>
              </div>

              {/* Duration + start */}
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 10, color: t.colours.textMuted, fontFamily: t.fonts.mono }}>{session.duration}</div>
                {!done && session.type !== "mock" && (
                  <button
                    onClick={() => onStartTopic?.(session.topic)}
                    style={{
                      marginTop: 4, padding: "3px 10px", fontSize: 10, fontWeight: 600,
                      background: t.colours.accent, color: "#fff",
                      borderRadius: 6, border: "none", cursor: "pointer",
                    }}
                  >
                    Start
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}