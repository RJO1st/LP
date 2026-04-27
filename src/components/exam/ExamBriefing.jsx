"use client";

/**
 * ExamBriefing.jsx — Pre-exam mission briefing screen
 * Deploy to: src/components/exam/ExamBriefing.jsx
 *
 * Shown after paper + mode selection, before ExamRunner starts.
 * Gives the scholar: paper stats, topic distribution, mode-specific
 * tips, and a single "Begin Mission" button that starts the timer.
 *
 * Props:
 *   paper:     { display_title, subject, paper_number, tier,
 *                total_marks, duration_minutes, total_questions }
 *   questions: array of question objects from the sitting
 *   mode:      "timed" | "practice" | "topic_focus" | "review"
 *   sitting:   { id } — for reference
 *   onBegin:   fn() — called when scholar clicks Begin
 *   onBack:    fn() — back to lobby
 */

import React, { useMemo } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Icons
// ─────────────────────────────────────────────────────────────────────────────

const RocketIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
    <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
    <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
    <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
  </svg>
);

const ClockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
);

const CheckCircleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);

const BarChartIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="20" x2="18" y2="10"/>
    <line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/>
  </svg>
);

const ChevronLeftIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const SUBJECT_META = {
  mathematics:         { label: "Mathematics",       icon: "📐", accent: "#3b82f6" },
  english_language:    { label: "English Language",  icon: "📖", accent: "#a855f7" },
  english_literature:  { label: "English Literature",icon: "📚", accent: "#a855f7" },
  science:             { label: "Science",           icon: "🔬", accent: "#22c55e" },
  biology:             { label: "Biology",           icon: "🧬", accent: "#22c55e" },
  chemistry:           { label: "Chemistry",         icon: "⚗️", accent: "#06b6d4" },
  physics:             { label: "Physics",           icon: "⚛️", accent: "#8b5cf6" },
  history:             { label: "History",           icon: "🏛️", accent: "#f59e0b" },
  geography:           { label: "Geography",         icon: "🌍", accent: "#34d399" },
};

const MODE_TIPS = {
  timed: [
    "Timer starts the moment you click Begin — you cannot pause.",
    "Flag questions you're unsure about using the palette (top right).",
    "Manage your time: aim for 1–2 minutes per mark.",
  ],
  practice: [
    "No timer — take your time and read every question carefully.",
    "Review each answer before moving on.",
    "Use the mark scheme hints to understand where marks are awarded.",
  ],
  topic_focus: [
    "This session targets a specific topic area.",
    "Focus on accuracy over speed — quality matters more here.",
    "Each wrong answer will be re-queued for a second attempt.",
  ],
  review: [
    "Questions and mark scheme are shown together.",
    "Use this to analyse your previous sitting.",
    "No marks are being recorded in this mode.",
  ],
};

const MODE_LABEL = {
  timed:       "Timed Exam",
  practice:    "Practice Mode",
  topic_focus: "Topic Focus",
  review:      "Review Mode",
};

const MODE_ACCENT = {
  timed:       "#3b82f6",
  practice:    "#10b981",
  topic_focus: "#f59e0b",
  review:      "#a855f7",
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function toTitleCase(slug = "") {
  return slug.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function formatDuration(mins) {
  if (!mins) return "—";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h} hr ${m} min` : `${h} hr`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Stat card
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, accent = "#3b82f6" }) {
  return (
    <div style={{
      padding: "20px",
      borderRadius: "12px",
      border: `1px solid ${accent}30`,
      background: `${accent}08`,
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      minWidth: 0,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", color: accent }}>
        <Icon />
        <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.07em", color: "#64748b" }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: "28px", fontWeight: "700", color: "#f1f5f9", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>
        {value}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Topic distribution bar
// ─────────────────────────────────────────────────────────────────────────────

function TopicBar({ topic, count, total, accent }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
      <div style={{ fontSize: "13px", color: "#94a3b8", width: "160px", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {toTitleCase(topic)}
      </div>
      <div style={{ flex: 1, height: "6px", background: "#1e293b", borderRadius: "3px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: accent, borderRadius: "3px", transition: "width 0.6s ease-out" }} />
      </div>
      <div style={{ fontSize: "12px", color: "#64748b", width: "40px", textAlign: "right", fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
        {count}Q
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function ExamBriefing({ paper, questions = [], mode = "timed", onBegin, onBack }) {
  const meta = SUBJECT_META[paper?.subject] || { label: toTitleCase(paper?.subject), icon: "📋", accent: "#3b82f6" };
  const accent = MODE_ACCENT[mode] || "#3b82f6";
  const tips = MODE_TIPS[mode] || MODE_TIPS.timed;

  // Compute topic distribution from loaded questions
  const topicCounts = useMemo(() => {
    const counts = {};
    for (const q of questions) {
      const t = q.topic || q.topic_slug || "General";
      counts[t] = (counts[t] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8); // top 8 topics
  }, [questions]);

  const qTotal   = questions.length || paper?.total_questions || "?";
  const duration = paper?.duration_minutes;
  const marks    = paper?.total_marks;

  const paperLabel = paper?.display_title || `${meta.label} ${paper?.paper_number ? `Paper ${paper.paper_number}` : "Paper"}`;
  const tierLabel  = paper?.tier ? ` · ${paper.tier.charAt(0).toUpperCase() + paper.tier.slice(1)}` : "";

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #020617 0%, #0f172a 100%)",
      color: "#f1f5f9",
      display: "flex",
      flexDirection: "column",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      {/* Sticky header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 20,
        borderBottom: "1px solid #1e293b",
        background: "rgba(2, 6, 23, 0.85)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        padding: "16px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <button
          onClick={onBack}
          style={{
            display: "flex", alignItems: "center", gap: "6px",
            padding: "8px 14px", borderRadius: "8px",
            border: "1px solid #1e293b", background: "transparent",
            color: "#64748b", cursor: "pointer", fontSize: "13px", fontWeight: "600",
            transition: "all 150ms ease-out",
          }}
          onMouseEnter={e => { e.currentTarget.style.color = "#94a3b8"; e.currentTarget.style.borderColor = "#334155"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "#64748b"; e.currentTarget.style.borderColor = "#1e293b"; }}
        >
          <ChevronLeftIcon /> Back
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            padding: "5px 12px", borderRadius: "20px",
            background: `${accent}20`, border: `1px solid ${accent}40`,
            fontSize: "12px", fontWeight: "700", color: accent, letterSpacing: "0.03em",
          }}>
            {MODE_LABEL[mode]}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, maxWidth: "760px", margin: "0 auto", width: "100%", padding: "40px 24px 60px" }}>

        {/* Paper title */}
        <div style={{ marginBottom: "36px" }}>
          <div style={{ fontSize: "32px", marginBottom: "10px" }}>{meta.icon}</div>
          <h1 style={{ fontSize: "28px", fontWeight: "700", letterSpacing: "-0.02em", marginBottom: "6px", color: "#f1f5f9" }}>
            {paperLabel}
          </h1>
          <p style={{ fontSize: "14px", color: "#64748b" }}>
            {meta.label}{tierLabel}
            {paper?.exam_board ? ` · ${paper.exam_board.toUpperCase()}` : ""}
          </p>
        </div>

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "14px", marginBottom: "36px" }}>
          <StatCard label="Questions" value={qTotal}   icon={BarChartIcon} accent={accent} />
          {duration && <StatCard label="Duration"  value={formatDuration(duration)} icon={ClockIcon}    accent={accent} />}
          {marks    && <StatCard label="Marks"     value={marks}          icon={CheckCircleIcon} accent={accent} />}
        </div>

        {/* Topic distribution */}
        {topicCounts.length > 0 && (
          <div style={{ marginBottom: "36px" }}>
            <h2 style={{ fontSize: "13px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.08em", color: "#4ade80", marginBottom: "16px" }}>
              Topic Breakdown
            </h2>
            <div style={{
              padding: "20px 24px", borderRadius: "12px",
              border: "1px solid #1e293b", background: "#0f172a",
            }}>
              {topicCounts.map(([topic, count]) => (
                <TopicBar key={topic} topic={topic} count={count} total={questions.length} accent={accent} />
              ))}
            </div>
          </div>
        )}

        {/* Mode tips */}
        <div style={{ marginBottom: "40px" }}>
          <h2 style={{ fontSize: "13px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.08em", color: "#4ade80", marginBottom: "16px" }}>
            Before You Start
          </h2>
          <div style={{
            padding: "20px 24px", borderRadius: "12px",
            border: `1px solid ${accent}25`, background: `${accent}08`,
            display: "flex", flexDirection: "column", gap: "12px",
          }}>
            {tips.map((tip, i) => (
              <div key={i} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                <div style={{
                  width: "20px", height: "20px", borderRadius: "50%",
                  background: `${accent}20`, border: `1px solid ${accent}40`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, marginTop: "1px",
                }}>
                  <span style={{ fontSize: "11px", fontWeight: "700", color: accent }}>{i + 1}</span>
                </div>
                <p style={{ fontSize: "14px", color: "#94a3b8", lineHeight: "1.5", margin: 0 }}>{tip}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Begin button */}
        <button
          onClick={onBegin}
          style={{
            width: "100%", padding: "18px 24px", borderRadius: "14px",
            border: "none", cursor: "pointer", fontSize: "16px", fontWeight: "700",
            background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`,
            color: "#fff", letterSpacing: "0.01em",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
            boxShadow: `0 8px 30px ${accent}40`,
            transition: "all 200ms ease-out",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = `0 12px 40px ${accent}50`;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = `0 8px 30px ${accent}40`;
          }}
        >
          <RocketIcon />
          {mode === "review" ? "Open Review" : "Begin Mission"}
        </button>

        {mode === "timed" && (
          <p style={{ textAlign: "center", marginTop: "14px", fontSize: "12px", color: "#475569" }}>
            The timer starts immediately when you click Begin Mission.
          </p>
        )}
      </div>
    </div>
  );
}
