"use client";
/**
 * PeerComparison.jsx
 * Deploy to: src/components/dashboard/PeerComparison.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Anonymised peer comparison. "You're in the top 20% for algebra."
 * Only renders for KS3/KS4.
 *
 * Props:
 *   comparisons — [{ topic, subject, percentile, direction }]
 *                  percentile: 0-100 (lower = better)
 *                  direction: 'up' | 'down' | 'stable'
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React from "react";
import { useTheme } from "@/components/theme/ThemeProvider";

export default function PeerComparison({ comparisons = [] }) {
  const { band, theme: t, isDark } = useTheme();

  if (band === "ks1" || band === "ks2") return null;
  if (comparisons.length === 0) return null;

  return (
    <div
      style={{
        background: t.colours.card,
        border: `1px solid ${t.colours.cardBorder}`,
        borderRadius: t.radius.card,
        padding: band === "ks4" ? 16 : 18,
        backdropFilter: isDark ? "blur(12px)" : undefined,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: t.colours.textMuted,
          fontFamily: t.fonts.body,
          textTransform: "uppercase",
          letterSpacing: ".06em",
          marginBottom: 12,
        }}
      >
        📊 Your position
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {comparisons.slice(0, 5).map((c, i) => {
          const topicLabel = (c.topic || "").replace(/_/g, " ").replace(/\b\w/g, ch => ch.toUpperCase());
          const pct = c.percentile ?? 50;
          const isGood = pct <= 25;
          const isGreat = pct <= 10;

          // Colour based on percentile
          const barCol = isGreat
            ? t.colours.success
            : isGood
              ? t.colours.accent
              : pct <= 50
                ? isDark ? "#fbbf24" : "#f59e0b"
                : isDark ? "#f87171" : "#ef4444";

          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {/* Topic label */}
              <div style={{ width: 90, fontSize: 11, fontWeight: 600, color: t.colours.text, fontFamily: t.fonts.body, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {topicLabel}
              </div>

              {/* Bar */}
              <div style={{ flex: 1, height: 6, background: isDark ? "rgba(255,255,255,.06)" : "#e2e8f0", borderRadius: 3, overflow: "hidden" }}>
                <div
                  style={{
                    width: `${100 - pct}%`,
                    height: "100%",
                    background: barCol,
                    borderRadius: 3,
                    transition: "width 0.6s ease",
                  }}
                />
              </div>

              {/* Percentile text */}
              <div style={{ width: 60, textAlign: "right", fontSize: 11, fontWeight: 600, color: barCol, fontFamily: t.fonts.mono }}>
                Top {pct}%
              </div>

              {/* Trend */}
              {c.direction && (
                <span style={{ fontSize: 10, color: c.direction === "up" ? t.colours.success : c.direction === "down" ? "#ef4444" : t.colours.textMuted }}>
                  {c.direction === "up" ? "↑" : c.direction === "down" ? "↓" : "→"}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: 9, color: t.colours.textMuted, fontFamily: t.fonts.body, marginTop: 10, fontStyle: "italic" }}>
        Compared to scholars in your year group. Updated weekly.
      </div>
    </div>
  );
}