"use client";
/**
 * TopicHeatmap.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * KS4 Phase 1 Visualization — Topic Mastery Heatmap
 *
 * Displays all topics for a subject as a colour-coded grid. Each cell's opacity
 * reflects mastery level. Clicking a topic triggers revision/study.
 * Hover shows mastery %, next review date, and times seen.
 *
 * Uses: computeTopicHeatmap() from analyticsEngine.js
 * Dependencies: Zero new — pure SVG + CSS
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useMemo, useState } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";

// ── Mastery colour scale ────────────────────────────────────────────────────
function getMasteryColour(pct) {
  if (pct >= 80) return { bg: "rgba(34,197,94,0.25)", border: "rgba(34,197,94,0.4)", text: "#22c55e", label: "Mastered" };
  if (pct >= 60) return { bg: "rgba(59,130,246,0.2)", border: "rgba(59,130,246,0.35)", text: "#3b82f6", label: "On Track" };
  if (pct >= 40) return { bg: "rgba(245,158,11,0.2)", border: "rgba(245,158,11,0.35)", text: "#f59e0b", label: "Developing" };
  if (pct > 0)   return { bg: "rgba(239,68,68,0.15)", border: "rgba(239,68,68,0.3)", text: "#ef4444", label: "Needs Focus" };
  return { bg: "rgba(139,92,246,0.04)", border: "rgba(139,92,246,0.1)", text: "#a78bfa", label: "Not Started" };
}

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
  if (diff <= 0) return "Overdue";
  if (diff === 1) return "Tomorrow";
  if (diff <= 7) return `In ${diff} days`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function TopicHeatmap({
  masteryData = [],
  subject = "mathematics",
  onTopicClick,
  compact = false,
  band = "ks2",
}) {
  const { isDark } = useTheme();
  const [hoveredTopic, setHoveredTopic] = useState(null);

  // Filter mastery data for the active subject
  const topicData = useMemo(() => {
    const filtered = masteryData.filter(
      r => (r.subject || "").toLowerCase() === subject.toLowerCase()
    );

    return filtered
      .map(r => {
        const pct = Math.round((r.mastery_score ?? r.p_know ?? 0) * 100);
        return {
          topic: r.topic,
          displayName: (r.topic || "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
          mastery: pct,
          timesSeen: r.times_seen ?? 0,
          nextReview: r.next_review_at,
          ...getMasteryColour(pct),
        };
      })
      .sort((a, b) => a.mastery - b.mastery); // weakest first
  }, [masteryData, subject]);

  if (topicData.length === 0) {
    return (
      <div style={{ padding: 16, textAlign: "center", color: isDark ? "rgba(167,139,250,0.35)" : "rgba(30,27,75,0.35)", fontSize: 12, fontWeight: 600 }}>
        No topic data yet — complete quizzes to build your heatmap.
      </div>
    );
  }

  const cols = compact ? 4 : Math.min(6, Math.max(3, Math.ceil(Math.sqrt(topicData.length))));

  return (
    <div style={{ position: "relative" }} role="figure" aria-label={`Topic mastery heatmap for ${subject}`}>
      <div style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: compact ? 4 : (band === "ks1" ? 8 : 6),
      }}>
        {topicData.map((t) => (
          <div
            key={t.topic}
            role="button"
            tabIndex={0}
            aria-label={`${t.displayName}: ${t.mastery}% mastery, practiced ${t.timesSeen} times`}
            onClick={() => onTopicClick?.(t.topic, subject)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onTopicClick?.(t.topic, subject); } }}
            onMouseEnter={() => setHoveredTopic(t.topic)}
            onMouseLeave={() => setHoveredTopic(null)}
            style={{
              position: "relative",
              padding: compact ? "6px 4px" : (band === "ks1" ? "12px 8px" : "10px 8px"),
              borderRadius: compact ? 6 : (band === "ks1" ? 12 : 8),
              background: t.bg,
              border: `1px solid ${hoveredTopic === t.topic ? t.text : t.border}`,
              cursor: "pointer",
              transition: "all 0.2s ease",
              transform: hoveredTopic === t.topic ? "scale(1.04)" : "scale(1)",
              textAlign: "center",
              minHeight: compact ? 44 : 56,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
            }}
          >
            {/* Topic name */}
            <div style={{
              fontSize: compact ? 9 : 10,
              fontWeight: 700,
              color: isDark ? "#e2e8f0" : "#1e1b4b",
              lineHeight: 1.2,
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              maxWidth: "100%",
            }}>
              {t.displayName}
            </div>

            {/* Mastery bar */}
            <div style={{
              width: "80%",
              height: 3,
              borderRadius: 2,
              background: isDark ? "rgba(167,139,250,0.08)" : "rgba(30,27,75,0.06)",
              marginTop: 2,
              overflow: "hidden",
            }}>
              <div style={{
                height: "100%",
                borderRadius: 2,
                width: `${t.mastery}%`,
                background: t.text,
                transition: "width 0.5s ease",
              }} />
            </div>

            {/* Mastery % */}
            <div style={{
              fontSize: compact ? 8 : 9,
              fontWeight: 800,
              color: t.text,
              marginTop: 1,
            }}>
              {t.mastery}%
            </div>

            {/* Tooltip on hover */}
            {hoveredTopic === t.topic && !compact && (
              <div style={{
                position: "absolute",
                bottom: "calc(100% + 8px)",
                left: "50%",
                transform: "translateX(-50%)",
                background: isDark ? "#1a1625" : "#1e1b4b",
                color: "#fff",
                padding: "8px 12px",
                borderRadius: 8,
                fontSize: 10,
                whiteSpace: "nowrap",
                zIndex: 50,
                boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
                pointerEvents: "none",
              }}>
                <div style={{ fontWeight: 700, marginBottom: 3 }}>{t.displayName}</div>
                <div style={{ display: "flex", gap: 12, color: "rgba(255,255,255,0.7)" }}>
                  <span>Mastery: <span style={{ color: t.text, fontWeight: 700 }}>{t.mastery}%</span></span>
                  <span>Seen: {t.timesSeen}×</span>
                  <span>Review: {formatDate(t.nextReview)}</span>
                </div>
                <div style={{ marginTop: 3, fontWeight: 600, color: t.text }}>{t.label}</div>
                {/* Arrow */}
                <div style={{
                  position: "absolute",
                  top: "100%",
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 0,
                  height: 0,
                  borderLeft: "6px solid transparent",
                  borderRight: "6px solid transparent",
                  borderTop: `6px solid ${isDark ? "#1a1625" : "#1e1b4b"}`,
                }} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      {!compact && (
        <div style={{
          display: "flex",
          justifyContent: "center",
          gap: 16,
          marginTop: 12,
          fontSize: 9,
          fontWeight: 600,
          color: isDark ? "rgba(226,232,240,0.4)" : "rgba(30,27,75,0.4)",
        }}>
          {[
            { label: "Mastered", color: "#22c55e" },
            { label: "On Track", color: "#3b82f6" },
            { label: "Developing", color: "#f59e0b" },
            { label: "Needs Focus", color: "#ef4444" },
            { label: "Not Started", color: "#a78bfa" },
          ].map(l => (
            <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: l.color, opacity: 0.6 }} />
              <span>{l.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
