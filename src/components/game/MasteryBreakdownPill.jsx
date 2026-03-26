"use client";
/**
 * MasteryBreakdownPill.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Compact visual indicator showing the three pillars of v2 composite mastery:
 *   - Acquisition (BKT raw knowledge)
 *   - Stability (SM-2 retention proof)
 *   - Recency (how recently reviewed)
 *
 * Renders as a small pill with three mini-bars, expandable to a tooltip
 * with detailed breakdown. Designed for use inside LearningPathMap topic rows,
 * dashboard cards, and MasteryCertificate stats.
 *
 * Props:
 *   masteryRecord  - DB row from scholar_topic_mastery (with v2 fields)
 *   compact        - boolean, if true shows only the three bars (no labels)
 *   showTooltip    - boolean, if true shows expanded breakdown on hover
 *   className      - optional extra CSS class
 */

import { useState } from "react";
import { getMasteryBreakdown } from "@/lib/masteryEngine";

const PILLAR_CONFIG = {
  acquisition: { label: "Knowledge",  icon: "🧠", color: "#6366f1", tip: "Can they answer correctly?" },
  stability:   { label: "Retention",  icon: "🔒", color: "#10b981", tip: "Do they remember over time?" },
  recency:     { label: "Freshness",  icon: "⚡", color: "#f59e0b", tip: "How recently reviewed?" },
};

function MiniBar({ value, color, label, tip, showLabel }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      {showLabel && (
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {label}
          </span>
          <span style={{ fontSize: 9, fontWeight: 800, color }}>{value}%</span>
        </div>
      )}
      <div style={{ height: showLabel ? 5 : 3, background: "rgba(255,255,255,0.1)", borderRadius: 99, overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: 99, backgroundColor: color,
          width: `${Math.max(2, value)}%`, transition: "width 0.6s ease",
        }} />
      </div>
    </div>
  );
}

export default function MasteryBreakdownPill({
  masteryRecord,
  compact = false,
  showTooltip = true,
  className = "",
}) {
  const [hovered, setHovered] = useState(false);
  const breakdown = getMasteryBreakdown(masteryRecord);

  if (!breakdown) return null;

  const { acquisition, stability, recency, composite, uniqueDays, spacedReviews, tier } = breakdown;

  return (
    <div
      className={className}
      style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 4 }}
      onMouseEnter={() => showTooltip && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Compact: three tiny bars side by side */}
      <div style={{ display: "flex", gap: 2, alignItems: "center", minWidth: compact ? 48 : 80 }}>
        {Object.entries(PILLAR_CONFIG).map(([key, cfg]) => (
          <MiniBar
            key={key}
            value={breakdown[key]}
            color={cfg.color}
            label={cfg.label}
            tip={cfg.tip}
            showLabel={!compact}
          />
        ))}
      </div>

      {/* Expanded tooltip */}
      {hovered && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)",
          background: "#1e293b", border: "1px solid #334155", borderRadius: 12,
          padding: "12px 14px", width: 220, zIndex: 100,
          boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
        }}>
          {/* Title */}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#e2e8f0" }}>Mastery Breakdown</span>
            <span style={{ fontSize: 11, fontWeight: 900, color: "#6366f1" }}>{composite}%</span>
          </div>

          {/* Pillar bars with labels */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {Object.entries(PILLAR_CONFIG).map(([key, cfg]) => (
              <div key={key}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                  <span style={{ fontSize: 10, color: "#94a3b8" }}>
                    {cfg.icon} {cfg.label}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 800, color: cfg.color }}>{breakdown[key]}%</span>
                </div>
                <div style={{ height: 4, background: "#334155", borderRadius: 99, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", borderRadius: 99, backgroundColor: cfg.color,
                    width: `${Math.max(2, breakdown[key])}%`,
                  }} />
                </div>
              </div>
            ))}
          </div>

          {/* Evidence stats */}
          <div style={{
            marginTop: 8, paddingTop: 8, borderTop: "1px solid #334155",
            display: "flex", justifyContent: "space-between",
          }}>
            <span style={{ fontSize: 9, color: "#64748b" }}>📅 {uniqueDays} practice days</span>
            <span style={{ fontSize: 9, color: "#64748b" }}>🔄 {spacedReviews} reviews</span>
          </div>

          {/* Arrow */}
          <div style={{
            position: "absolute", bottom: -5, left: "50%", transform: "translateX(-50%) rotate(45deg)",
            width: 10, height: 10, background: "#1e293b", borderRight: "1px solid #334155",
            borderBottom: "1px solid #334155",
          }} />
        </div>
      )}
    </div>
  );
}

/**
 * Inline version for MasteryCertificate stats grid — shows all three pillars
 * in a horizontal layout with labels and values.
 */
export function MasteryBreakdownInline({ masteryRecord }) {
  const breakdown = getMasteryBreakdown(masteryRecord);
  if (!breakdown) return null;

  return (
    <div style={{ display: "flex", gap: 6 }}>
      {Object.entries(PILLAR_CONFIG).map(([key, cfg]) => (
        <div key={key} style={{
          flex: 1, background: "#f8fafc", borderRadius: 10, padding: "8px 6px",
          textAlign: "center", border: "1px solid #e2e8f0",
        }}>
          <div style={{ fontSize: 14, marginBottom: 2 }}>{cfg.icon}</div>
          <p style={{ color: cfg.color, fontWeight: 900, fontSize: 13, margin: "0 0 1px" }}>
            {breakdown[key]}%
          </p>
          <p style={{
            color: "#94a3b8", fontSize: 8, fontWeight: 700, textTransform: "uppercase",
            letterSpacing: "0.05em", margin: 0,
          }}>{cfg.label}</p>
        </div>
      ))}
    </div>
  );
}
