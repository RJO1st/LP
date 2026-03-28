"use client";
/**
 * MasteryDashboardCards.jsx
 * Deploy to: src/components/dashboard/MasteryDashboardCards.jsx
 *
 * Phase 1 "Mastery & Progression" — adaptive learning dashboard
 * Displays subject mastery progress with:
 *   - SVG progress rings (color-coded by tier)
 *   - Composite mastery percentage
 *   - Tier badges (Developing/Mastered/Exceeding)
 *   - Trend indicators (↑ improving, → steady, ↓ declining)
 *   - Practice metrics (questions answered, unique days)
 *   - Next review dates from SM-2 scheduling
 *   - Spaced review alerts for overdue topics
 *   - Overall progress summary
 *
 * Integrates with masteryEngine.js:
 *   - Imports MASTERY_THRESHOLDS, masteryToTier, computeRecency
 *   - Uses composite mastery scores + SM-2 intervals
 *   - Applies forgetting-curve decay for predictions
 */

import React, { useMemo } from "react";
import { MIcon } from "./DashboardShell";
import {
  MASTERY_THRESHOLDS,
  masteryToTier,
  computeRecency,
  applyForgettingDecay,
  computeStability,
  masteryToPercent,
} from "@/lib/masteryEngine";

/**
 * SVG progress ring component with animated stroke
 */
function ProgressRing({ percentage, size = 120, color = "#6366f1", thickness = 8 }) {
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      {/* Background ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#e2e8f0"
        strokeWidth={thickness}
      />
      {/* Progress ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={thickness}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{
          transition: "stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      />
      {/* Center percentage text */}
      <text
        x={size / 2}
        y={size / 2 + 6}
        textAnchor="middle"
        dominantBaseline="middle"
        style={{
          fontSize: "20px",
          fontWeight: "700",
          fill: "#1e293b",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {percentage}%
      </text>
    </svg>
  );
}

/**
 * Tier color mapping with light/dark variants
 */
function getTierColor(tier) {
  const colors = {
    developing: { bg: "#fef3c7", border: "#fcd34d", text: "#b45309", icon: "#f59e0b" },
    expected: { bg: "#d1fae5", border: "#6ee7b7", text: "#065f46", icon: "#10b981" },
    exceeding: { bg: "#e9d5ff", border: "#d8b4fe", text: "#6b21a8", icon: "#a855f7" },
    "not-started": { bg: "#f1f5f9", border: "#cbd5e1", text: "#475569", icon: "#94a3b8" },
  };
  return colors[tier] || colors["not-started"];
}

/**
 * Tier badge component
 */
function TierBadge({ tier, label }) {
  const colors = getTierColor(tier);
  return (
    <span
      className="px-3 py-1.5 rounded-full text-xs font-bold inline-flex items-center gap-1"
      style={{
        background: colors.bg,
        color: colors.text,
        border: `1px solid ${colors.border}`,
      }}
    >
      {tier === "exceeding" && <span className="text-sm">⭐</span>}
      {tier === "expected" && <span className="text-sm">📈</span>}
      {tier === "developing" && <span className="text-sm">🔄</span>}
      {label}
    </span>
  );
}

/**
 * Trend indicator based on recent mastery changes
 */
function TrendIndicator({ trend }) {
  const trendConfigs = {
    improving: { icon: "trending_up", color: "#10b981", label: "Improving" },
    steady: { icon: "trending_flat", color: "#f59e0b", label: "Steady" },
    declining: { icon: "trending_down", color: "#ef4444", label: "Declining" },
  };
  const config = trendConfigs[trend] || trendConfigs.steady;

  return (
    <div className="flex items-center gap-1.5">
      <MIcon name={config.icon} size={18} style={{ color: config.color }} />
      <span className="text-xs font-medium text-slate-600">{config.label}</span>
    </div>
  );
}

/**
 * Single subject mastery card
 */
function SubjectMasteryCard({
  subjectKey,
  label,
  icon,
  masteryRecord,
  onStartSubject,
  onStartReview,
}) {
  if (!masteryRecord) {
    // Not started
    return (
      <div className="p-6 rounded-lg border border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-center min-h-64">
        <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center mb-4">
          {icon ? (
            <MIcon name={icon} size={28} className="text-slate-400" />
          ) : (
            <span className="text-2xl">📚</span>
          )}
        </div>
        <h3 className="font-bold text-slate-700 mb-2">{label}</h3>
        <p className="text-xs text-slate-500 mb-4">Not started yet</p>
        <button
          onClick={() => onStartSubject?.(subjectKey)}
          className="px-4 py-2 bg-slate-700 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors"
        >
          Start Learning
        </button>
      </div>
    );
  }

  const compositeScore = masteryRecord.mastery_score ?? 0;
  const percentage = masteryToPercent(compositeScore);
  const tier = masteryToTier(
    compositeScore,
    masteryRecord.interval_days ?? 0,
    masteryRecord.times_seen ?? 0,
    masteryRecord.spaced_review_count ?? 0,
    masteryRecord.unique_practice_days ?? 1
  );

  const tierColor = getTierColor(tier);
  const tierLabel =
    {
      developing: "Developing",
      expected: "Mastered",
      exceeding: "Exceeding",
    }[tier] || "Developing";

  // Calculate next review date
  const lastSeen = masteryRecord.last_seen_at
    ? new Date(masteryRecord.last_seen_at)
    : null;
  const intervalDays = masteryRecord.interval_days ?? 1;
  const nextReviewAt = lastSeen
    ? new Date(lastSeen.getTime() + intervalDays * 24 * 60 * 60 * 1000)
    : null;

  const now = new Date();
  const isOverdue = nextReviewAt && nextReviewAt < now;
  const daysUntilReview = nextReviewAt
    ? Math.ceil((nextReviewAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
    : 0;

  // Format next review display
  const nextReviewDisplay =
    daysUntilReview < 0
      ? `${Math.abs(daysUntilReview)} days overdue`
      : daysUntilReview === 0
        ? "Due today"
        : `Due in ${daysUntilReview} days`;

  // Determine color based on tier
  const progressColor =
    tier === "exceeding"
      ? "#a855f7"
      : tier === "expected"
        ? "#10b981"
        : "#f59e0b";

  const trend = masteryRecord.trend || "steady";

  return (
    <div
      className={`p-6 rounded-lg border-2 flex flex-col gap-4 transition-all ${isOverdue ? "border-orange-300 bg-orange-50/30" : "border-slate-200 bg-white hover:border-slate-300"}`}
      style={{
        boxShadow: isOverdue ? "0 0 12px rgba(251, 146, 60, 0.15)" : "0 1px 3px rgba(0,0,0,0.05)",
      }}
    >
      {/* Header: Icon + Title + Tier */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3 flex-1">
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center"
            style={{ background: tierColor.bg }}
          >
            {icon ? (
              <MIcon name={icon} size={24} style={{ color: tierColor.icon }} />
            ) : (
              <span className="text-xl">📚</span>
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-slate-900">{label}</h3>
            <p className="text-xs text-slate-500">
              {masteryRecord.times_seen || 0} questions answered
            </p>
          </div>
        </div>
        <TierBadge tier={tier} label={tierLabel} />
      </div>

      {/* Progress Ring + Stats */}
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0">
          <ProgressRing percentage={percentage} color={progressColor} size={100} thickness={6} />
        </div>
        <div className="flex-1 space-y-2">
          <div>
            <p className="text-xs text-slate-500 mb-1">Unique practice days</p>
            <p className="text-sm font-bold text-slate-700">
              {masteryRecord.unique_practice_days || 0} days
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Spaced reviews</p>
            <p className="text-sm font-bold text-slate-700">
              {masteryRecord.spaced_review_count || 0} completed
            </p>
          </div>
          <div>
            <TrendIndicator trend={trend} />
          </div>
        </div>
      </div>

      {/* Next Review Info */}
      <div
        className="p-3 rounded-lg text-sm"
        style={{
          background: isOverdue ? "#fee2e2" : "#f0f9ff",
          border: `1px solid ${isOverdue ? "#fecaca" : "#bae6fd"}`,
        }}
      >
        <div className="flex items-center gap-2">
          <MIcon name="calendar_month" size={16} style={{ color: isOverdue ? "#dc2626" : "#0284c7" }} />
          <span style={{ color: isOverdue ? "#991b1b" : "#075985" }} className="font-medium">
            {nextReviewDisplay}
          </span>
        </div>
      </div>

      {/* CTA Buttons */}
      <div className="flex gap-2 pt-2">
        {isOverdue ? (
          <button
            onClick={() => onStartReview?.(subjectKey)}
            className="flex-1 px-4 py-2.5 bg-orange-500 text-white text-sm font-bold rounded-lg hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
          >
            <MIcon name="refresh" size={16} />
            Review Now
          </button>
        ) : (
          <button
            onClick={() => onStartSubject?.(subjectKey)}
            className="flex-1 px-4 py-2.5 bg-slate-700 text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
          >
            <MIcon name="play_arrow" size={16} />
            Practice
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Overall progress summary card
 */
function OverallProgressCard({ subjects, masteryData, streak }) {
  const validRecords = subjects
    .map((s) => masteryData?.[s.key])
    .filter((m) => m != null);

  const stats = useMemo(() => {
    if (validRecords.length === 0) {
      return {
        avgMastery: 0,
        developingCount: 0,
        masteredCount: 0,
        exceedingCount: 0,
        totalQuestionsAnswered: 0,
      };
    }

    let totalQuestionsAnswered = 0;
    let totalMastery = 0;
    let developingCount = 0;
    let masteredCount = 0;
    let exceedingCount = 0;

    for (const record of validRecords) {
      const score = record.mastery_score ?? 0;
      const tier = masteryToTier(
        score,
        record.interval_days ?? 0,
        record.times_seen ?? 0,
        record.spaced_review_count ?? 0,
        record.unique_practice_days ?? 1
      );

      totalQuestionsAnswered += record.times_seen ?? 0;
      totalMastery += score;

      if (tier === "exceeding") exceedingCount += 1;
      else if (tier === "expected") masteredCount += 1;
      else developingCount += 1;
    }

    const avgMastery = validRecords.length > 0 ? totalMastery / validRecords.length : 0;

    return {
      avgMastery: masteryToPercent(avgMastery),
      developingCount,
      masteredCount,
      exceedingCount,
      totalQuestionsAnswered,
    };
  }, [validRecords]);

  return (
    <div className="p-6 rounded-lg border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-12 h-12 rounded-lg bg-indigo-200 flex items-center justify-center">
          <MIcon name="trending_up" size={24} className="text-indigo-700" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900">Overall Progress</h3>
          <p className="text-xs text-slate-600">Across all subjects</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-5">
        {/* Average Mastery */}
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <p className="text-xs text-slate-500 mb-1 font-medium">Average Mastery</p>
          <p className="text-3xl font-bold text-indigo-700">{stats.avgMastery}%</p>
        </div>

        {/* Current Streak */}
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <p className="text-xs text-slate-500 mb-1 font-medium">Current Streak</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold text-amber-600">{streak}</p>
            <span className="text-sm text-amber-600 font-semibold">days</span>
          </div>
        </div>
      </div>

      {/* Tier breakdown */}
      <div className="bg-white p-4 rounded-lg border border-slate-200">
        <p className="text-xs text-slate-500 mb-3 font-medium">Subjects by Tier</p>
        <div className="space-y-2">
          {stats.exceedingCount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="text-sm">⭐</span>
                <span className="text-slate-600">Exceeding</span>
              </div>
              <span className="font-bold text-purple-700">{stats.exceedingCount}</span>
            </div>
          )}
          {stats.masteredCount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="text-sm">📈</span>
                <span className="text-slate-600">Mastered</span>
              </div>
              <span className="font-bold text-emerald-700">{stats.masteredCount}</span>
            </div>
          )}
          {stats.developingCount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="text-sm">🔄</span>
                <span className="text-slate-600">Developing</span>
              </div>
              <span className="font-bold text-amber-700">{stats.developingCount}</span>
            </div>
          )}
          {stats.developingCount === 0 && stats.masteredCount === 0 && stats.exceedingCount === 0 && (
            <p className="text-xs text-slate-400">Start learning to see progress</p>
          )}
        </div>
      </div>

      {/* Total questions */}
      <div className="mt-4 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">Total questions answered</span>
          <span className="text-2xl font-bold text-slate-900">{stats.totalQuestionsAnswered}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Spaced review alerts — subjects overdue for review
 */
function SpacedReviewAlerts({ subjects, masteryData, onStartReview }) {
  const overdueSubjects = useMemo(() => {
    const now = new Date();
    return subjects
      .map((s) => {
        const record = masteryData?.[s.key];
        if (!record?.next_review_at) return null;

        const nextReviewAt = new Date(record.next_review_at);
        if (nextReviewAt > now) return null;

        const daysOverdue = Math.ceil(
          (now.getTime() - nextReviewAt.getTime()) / (24 * 60 * 60 * 1000)
        );

        // Predict mastery decay
        const stability = record.stability ?? 0;
        const decayedScore = applyForgettingDecay(
          record.mastery_score ?? 0,
          record.last_seen_at,
          stability,
          record.interval_days ?? 1
        );
        const decayPercentage = masteryToPercent(record.mastery_score ?? 0) - masteryToPercent(decayedScore);

        return {
          key: s.key,
          label: s.label,
          daysOverdue,
          decayPercentage,
          record,
        };
      })
      .filter((x) => x != null)
      .sort((a, b) => b.daysOverdue - a.daysOverdue);
  }, [subjects, masteryData]);

  if (overdueSubjects.length === 0) {
    return null;
  }

  return (
    <div className="p-6 rounded-lg border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-lg bg-orange-200 flex items-center justify-center animate-pulse">
          <MIcon name="schedule" size={24} className="text-orange-700" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900">Time to Review</h3>
          <p className="text-xs text-slate-600">
            {overdueSubjects.length} topic{overdueSubjects.length !== 1 ? "s" : ""} overdue
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {overdueSubjects.map((item) => (
          <div
            key={item.key}
            className="p-3 bg-white rounded-lg border border-orange-200 flex items-center justify-between"
          >
            <div className="flex-1">
              <p className="font-semibold text-slate-900 text-sm">{item.label}</p>
              <p className="text-xs text-orange-700 mt-1">
                {item.daysOverdue} days overdue • mastery declining {item.decayPercentage}%
              </p>
            </div>
            <button
              onClick={() => onStartReview?.(item.key)}
              className="px-3 py-1.5 bg-orange-500 text-white text-xs font-bold rounded hover:bg-orange-600 transition-colors flex-shrink-0 ml-3"
            >
              Review
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Main component: MasteryDashboardCards
 */
export default function MasteryDashboardCards({
  subjects = [],
  masteryData = {},
  streak = 0,
  onStartSubject,
  onStartReview,
  scholarName = "Scholar",
}) {
  if (!subjects || subjects.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500">
        <p>No subjects available. Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Overall Progress Summary */}
      <OverallProgressCard subjects={subjects} masteryData={masteryData} streak={streak} />

      {/* Spaced Review Alerts */}
      <SpacedReviewAlerts subjects={subjects} masteryData={masteryData} onStartReview={onStartReview} />

      {/* Subject Mastery Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {subjects.map((subject) => (
          <SubjectMasteryCard
            key={subject.key}
            subjectKey={subject.key}
            label={subject.label}
            icon={subject.icon}
            masteryRecord={masteryData[subject.key]}
            onStartSubject={onStartSubject}
            onStartReview={onStartReview}
          />
        ))}
      </div>
    </div>
  );
}
