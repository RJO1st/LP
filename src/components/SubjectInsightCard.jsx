"use client";
// src/components/SubjectInsightCard.jsx
// Tier 1 Feature 2 — Subject Time Insight Carousel
// Shows contextual, data-driven motivational insights.
// Rotates automatically. Mobile-first insight panel with per-subject focus rotation.
//
// Props:
//   scholar      — scholar object { id, name }
//   weeklyStats  — [{ subject, questions_total, questions_correct, minutes }]
//   streak       — number (current streak days)
//   lastWeekStats — [{ subject, questions_total, minutes }] (prior week for comparison)

import React, { useState, useEffect, useMemo } from "react";

const SUBJECT_LABELS = {
  mathematics: "Mathematics", english: "English", science: "Science",
  verbal_reasoning: "Verbal Reasoning", non_verbal_reasoning: "Non-Verbal Reasoning",
  history: "History", geography: "Geography", computing: "Computing",
  basic_science: "Basic Science", social_studies: "Social Studies",
  chemistry: "Chemistry", physics: "Physics", biology: "Biology",
};

const SUBJECT_EMOJIS = {
  mathematics: "➗", english: "📖", science: "🔬", verbal_reasoning: "🔤",
  non_verbal_reasoning: "🔷", history: "🏛️", geography: "🌍", computing: "💻",
  basic_science: "⚗️", social_studies: "🤝", chemistry: "🧪", physics: "⚡", biology: "🌱",
};

// Card gradient themes
const THEMES = [
  { from: "#6366f1", to: "#8b5cf6", text: "#fff", sub: "rgba(255,255,255,0.7)" },
  { from: "#10b981", to: "#059669", text: "#fff", sub: "rgba(255,255,255,0.7)" },
  { from: "#f59e0b", to: "#d97706", text: "#fff", sub: "rgba(255,255,255,0.7)" },
  { from: "#3b82f6", to: "#1d4ed8", text: "#fff", sub: "rgba(255,255,255,0.7)" },
  { from: "#ec4899", to: "#be185d", text: "#fff", sub: "rgba(255,255,255,0.7)" },
];

// ─── Insight generators ───────────────────────────────────────────────────────

function buildInsights(scholar, weeklyStats, lastWeekStats, streak) {
  const insights = [];
  const name = scholar?.name || "Scholar";

  // Total time this week
  const totalMins = weeklyStats.reduce((a, s) => a + (s.minutes || 0), 0);
  if (totalMins > 0) {
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    const timeStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins} min`;
    insights.push({
      icon: "⏱️",
      headline: `${timeStr} studied this week`,
      body: totalMins >= 120
        ? `Great consistency, ${name}. You're building real momentum.`
        : `Every minute counts. Keep adding sessions to hit your weekly target.`,
    });
  }

  // Top subject by time
  const topSubject = [...weeklyStats].sort((a, b) => (b.minutes || 0) - (a.minutes || 0))[0];
  if (topSubject && topSubject.minutes > 0) {
    const label = SUBJECT_LABELS[topSubject.subject] || topSubject.subject;
    const emoji = SUBJECT_EMOJIS[topSubject.subject] || "📚";
    insights.push({
      icon: emoji,
      headline: `${topSubject.minutes} min on ${label} this week`,
      body: topSubject.minutes >= 45
        ? `You're on track to outpace your usual weekly effort. Keep it up!`
        : `Add a couple more sessions to really lock in those ${label} skills.`,
    });
  }

  // Accuracy this week
  const totalQ = weeklyStats.reduce((a, s) => a + (s.questions_total || 0), 0);
  const totalCorrect = weeklyStats.reduce((a, s) => a + (s.questions_correct || 0), 0);
  if (totalQ >= 10) {
    const acc = Math.round((totalCorrect / totalQ) * 100);
    insights.push({
      icon: acc >= 70 ? "🎯" : "💡",
      headline: `${acc}% accuracy across ${totalQ} questions`,
      body: acc >= 80
        ? `Excellent precision. Strong accuracy at this stage is a great sign.`
        : acc >= 60
        ? `You're in the right zone. A little more focus will push this above 80%.`
        : `Don't worry about the score — keep practising and accuracy will climb.`,
    });
  }

  // Week-on-week comparison
  if (lastWeekStats?.length > 0) {
    const thisTotal = weeklyStats.reduce((a, s) => a + (s.questions_total || 0), 0);
    const lastTotal = lastWeekStats.reduce((a, s) => a + (s.questions_total || 0), 0);
    if (lastTotal > 0 && thisTotal > 0) {
      const change = Math.round(((thisTotal - lastTotal) / lastTotal) * 100);
      if (change > 0) {
        insights.push({
          icon: "📈",
          headline: `${change}% more questions than last week`,
          body: `That improvement compounds fast. ${name} is on an upward trend.`,
        });
      } else if (change < -15) {
        insights.push({
          icon: "🔁",
          headline: `Quieter week than usual`,
          body: `Last week was stronger. No worries — even a short session today helps maintain the streak.`,
        });
      }
    }
  }

  // Streak
  if (streak >= 3) {
    insights.push({
      icon: "🔥",
      headline: `${streak}-day streak — keep it burning!`,
      body: streak >= 14
        ? `Two weeks of consistency. That's the habit that creates real progress.`
        : `Brilliant focus. Log in tomorrow to extend the streak further.`,
    });
  }

  // Weakest subject nudge (lowest accuracy)
  const subjectsWithAcc = weeklyStats
    .filter((s) => s.questions_total >= 5)
    .map((s) => ({ ...s, acc: s.questions_total > 0 ? s.questions_correct / s.questions_total : 0 }))
    .sort((a, b) => a.acc - b.acc);

  if (subjectsWithAcc.length > 0) {
    const weakest = subjectsWithAcc[0];
    const acc = Math.round(weakest.acc * 100);
    if (acc < 65) {
      const label = SUBJECT_LABELS[weakest.subject] || weakest.subject;
      insights.push({
        icon: "🎯",
        headline: `${label} needs more focus — ${acc}% accuracy`,
        body: `That's the one to push this week. A few targeted sessions will move the needle.`,
      });
    }
  }

  // Fallback if no data yet
  if (insights.length === 0) {
    insights.push({
      icon: "🚀",
      headline: `Welcome to Mission Control`,
      body: `Start your first mission to begin tracking your progress. Every session builds mastery.`,
    });
  }

  return insights;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SubjectInsightCard({
  scholar,
  weeklyStats = [],
  lastWeekStats = [],
  streak = 0,
}) {
  const insights = useMemo(
    () => buildInsights(scholar, weeklyStats, lastWeekStats, streak),
    [scholar, weeklyStats, lastWeekStats, streak]
  );

  const [idx, setIdx] = useState(0);
  const [fading, setFading] = useState(false);

  // Auto-rotate every 5s
  useEffect(() => {
    if (insights.length <= 1) return;
    const t = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setIdx((i) => (i + 1) % insights.length);
        setFading(false);
      }, 200);
    }, 5000);
    return () => clearInterval(t);
  }, [insights.length]);

  const goTo = (i) => {
    setFading(true);
    setTimeout(() => { setIdx(i); setFading(false); }, 150);
  };

  const theme = THEMES[idx % THEMES.length];
  const insight = insights[idx];

  return (
    <div
      className="rounded-2xl p-6 relative overflow-hidden select-none"
      style={{
        background: `linear-gradient(135deg, ${theme.from}, ${theme.to})`,
        minHeight: 160,
      }}
    >
      {/* Decorative blob */}
      <div
        className="absolute -right-8 -top-8 w-32 h-32 rounded-full opacity-20"
        style={{ background: "rgba(255,255,255,0.3)" }}
      />
      <div
        className="absolute -right-4 bottom-0 w-20 h-20 rounded-full opacity-10"
        style={{ background: "rgba(255,255,255,0.5)" }}
      />

      {/* Content */}
      <div
        className="relative z-10 transition-opacity duration-200"
        style={{ opacity: fading ? 0 : 1 }}
      >
        <div className="text-3xl mb-3">{insight.icon}</div>
        <h4
          className="text-xl font-black mb-1 leading-snug"
          style={{ color: theme.text }}
        >
          {insight.headline}
        </h4>
        <p className="text-sm leading-relaxed" style={{ color: theme.sub }}>
          {insight.body}
        </p>
      </div>

      {/* Dot nav */}
      {insights.length > 1 && (
        <div className="flex items-center gap-1.5 mt-5 relative z-10">
          {insights.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className="rounded-full transition-all duration-200"
              style={{
                width: i === idx ? 20 : 6,
                height: 6,
                background: i === idx ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.4)",
              }}
            />
          ))}
          {/* Prev / Next */}
          <div className="ml-auto flex gap-1.5">
            <button
              onClick={() => goTo((idx - 1 + insights.length) % insights.length)}
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs hover:bg-white/20 transition-colors"
            >
              ‹
            </button>
            <button
              onClick={() => goTo((idx + 1) % insights.length)}
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs hover:bg-white/20 transition-colors"
            >
              ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}