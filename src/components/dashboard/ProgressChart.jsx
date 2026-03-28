"use client";
/**
 * ProgressChart.jsx — Interactive mastery progress chart
 *
 * Features:
 *   - Line chart showing mastery % over time per subject
 *   - Subject filter pills (click to toggle visibility)
 *   - Tooltips with date + score + subject breakdown
 *   - Zoom: brush selector for date-range zoom
 *   - Band-aware theming (rounded/playful for KS1, data-dense for KS4)
 *   - Responsive — stacks nicely on mobile
 *   - Accessible: keyboard-navigable filter pills, descriptive ARIA
 */

import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Brush,
  Legend,
} from "recharts";

// ── Subject colours ──────────────────────────────────────────────────
const SUBJECT_COLORS = {
  mathematics: "#6366f1",
  maths: "#6366f1",
  math: "#6366f1",
  english: "#f59e0b",
  science: "#10b981",
  history: "#ef4444",
  geography: "#3b82f6",
  computing: "#8b5cf6",
  french: "#ec4899",
  spanish: "#14b8a6",
  religious_studies: "#a855f7",
  art: "#f97316",
  music: "#06b6d4",
  default: "#64748b",
};

function getSubjectColor(subject) {
  const key = (subject || "").toLowerCase().replace(/\s+/g, "_");
  return SUBJECT_COLORS[key] || SUBJECT_COLORS.default;
}

function formatSubjectLabel(subject) {
  return (subject || "unknown")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Custom tooltip ───────────────────────────────────────────────────
function ChartTooltip({ active, payload, label, band }) {
  if (!active || !payload?.length) return null;

  const isYoung = band === "ks1" || band === "ks2";
  return (
    <div
      className="rounded-lg shadow-lg border px-3 py-2 text-xs"
      style={{
        background: "rgba(255,255,255,0.97)",
        borderColor: "#e2e8f0",
        maxWidth: 220,
      }}
    >
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full"
            style={{ background: entry.color }}
          />
          <span className="text-slate-600">{formatSubjectLabel(entry.dataKey)}:</span>
          <span className="font-bold" style={{ color: entry.color }}>
            {isYoung ? `${entry.value}%` : `${entry.value}%`}
          </span>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export default function ProgressChart({
  masteryData = [],
  quizResults = [],
  band = "ks2",
  className = "",
}) {
  // ── Discover subjects from data ──────────────────────────────────
  const subjects = useMemo(() => {
    const set = new Set();
    masteryData.forEach((r) => r.subject && set.add(r.subject));
    quizResults.forEach((r) => {
      const subj = r.subject || r.details?.subject;
      if (subj) set.add(subj);
    });
    return Array.from(set).sort();
  }, [masteryData, quizResults]);

  const [visibleSubjects, setVisibleSubjects] = useState(new Set(subjects));

  // Keep visible set in sync when subjects change
  useMemo(() => {
    setVisibleSubjects((prev) => {
      const next = new Set(prev);
      subjects.forEach((s) => {
        if (!next.has(s) && prev.size === 0) next.add(s);
      });
      return next.size === 0 ? new Set(subjects) : next;
    });
  }, [subjects]);

  // ── Build time-series data from quiz results ─────────────────────
  const chartData = useMemo(() => {
    if (quizResults.length === 0 && masteryData.length === 0) return [];

    // Group quizzes by date
    const byDate = {};
    quizResults.forEach((q) => {
      const raw = q.completed_at || q.created_at;
      if (!raw) return;
      const date = raw.split("T")[0];
      const subj = q.subject || q.details?.subject || "mathematics";
      if (!byDate[date]) byDate[date] = {};
      if (!byDate[date][subj]) byDate[date][subj] = { total: 0, count: 0 };
      const score = q.score ?? 0;
      const total = q.total_questions ?? q.questions_total ?? 1;
      byDate[date][subj].total += Math.round((score / Math.max(total, 1)) * 100);
      byDate[date][subj].count += 1;
    });

    // If no quiz data, use mastery snapshots
    if (Object.keys(byDate).length === 0) {
      masteryData.forEach((r) => {
        const date = (r.updated_at || "").split("T")[0];
        if (!date) return;
        if (!byDate[date]) byDate[date] = {};
        byDate[date][r.subject] = {
          total: Math.round((r.mastery_score ?? 0) * 100),
          count: 1,
        };
      });
    }

    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, subjects]) => {
        const point = {
          date: new Date(date).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
          }),
          rawDate: date,
        };
        Object.entries(subjects).forEach(([subj, { total, count }]) => {
          point[subj] = Math.round(total / count);
        });
        return point;
      });
  }, [quizResults, masteryData]);

  // ── Toggle subject visibility ─────────────────────────────────────
  const toggleSubject = (subj) => {
    setVisibleSubjects((prev) => {
      const next = new Set(prev);
      if (next.has(subj)) {
        // Don't allow deselecting the last one
        if (next.size > 1) next.delete(subj);
      } else {
        next.add(subj);
      }
      return next;
    });
  };

  const isYoung = band === "ks1" || band === "ks2";
  const chartHeight = band === "ks4" ? 300 : band === "ks3" ? 260 : 220;

  if (chartData.length === 0) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-400 ${className}`}
        style={{ minHeight: chartHeight }}
      >
        {isYoung
          ? "Complete some adventures to see your progress chart!"
          : "Complete quizzes to see your progress over time."}
      </div>
    );
  }

  return (
    <div className={`${className}`} role="figure" aria-label="Mastery progress chart">
      {/* Subject filter pills */}
      {subjects.length > 1 && (
        <div className="flex flex-wrap gap-1.5 mb-3" role="group" aria-label="Filter by subject">
          {subjects.map((subj) => {
            const active = visibleSubjects.has(subj);
            return (
              <button
                key={subj}
                onClick={() => toggleSubject(subj)}
                className={`
                  text-xs px-2.5 py-1 rounded-full border transition-all font-medium
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1
                  ${active
                    ? "text-white shadow-sm"
                    : "bg-white text-slate-400 border-slate-200 hover:border-slate-300"
                  }
                `}
                style={
                  active
                    ? { background: getSubjectColor(subj), borderColor: getSubjectColor(subj) }
                    : {}
                }
                aria-pressed={active}
              >
                {formatSubjectLabel(subj)}
              </button>
            );
          })}
        </div>
      )}

      {/* Chart */}
      <ResponsiveContainer width="100%" height={chartHeight}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={{ stroke: "#e2e8f0" }}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip content={<ChartTooltip band={band} />} />
          {/* Brush for zoom (show for KS3/4 with enough data) */}
          {(band === "ks3" || band === "ks4") && chartData.length > 7 && (
            <Brush
              dataKey="date"
              height={24}
              stroke="#cbd5e1"
              fill="#f8fafc"
              tickFormatter={() => ""}
            />
          )}
          {subjects
            .filter((s) => visibleSubjects.has(s))
            .map((subj) => (
              <Line
                key={subj}
                type="monotone"
                dataKey={subj}
                stroke={getSubjectColor(subj)}
                strokeWidth={2}
                dot={{ r: isYoung ? 4 : 3, fill: getSubjectColor(subj) }}
                activeDot={{ r: 6, stroke: "#fff", strokeWidth: 2 }}
                connectNulls
                animationDuration={800}
              />
            ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
