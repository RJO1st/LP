"use client";
/**
 * AdaptiveLeaderboard.jsx
 * Deploy to: src/components/dashboard/AdaptiveLeaderboard.jsx
 *
 * Age-appropriate leaderboard. KS1 shows friendly "Star Collectors".
 * KS2 shows "Commander Rankings". KS3/KS4 show percentile-based standings.
 * All use codenames for privacy.
 *
 * Props:
 *   entries         — [{ id, codename, total_xp, personal_best, avatar }]
 *   currentScholarId — string
 *   maxEntries      — number (default 5)
 */

import React from "react";
import { useTheme } from "@/components/theme/ThemeProvider";

export default function AdaptiveLeaderboard({ entries = [], currentScholarId, maxEntries = 5 }) {
  const { band, theme: t, isDark } = useTheme();

  if (entries.length === 0) return null;

  const visible = entries.slice(0, maxEntries);
  const myRank = entries.findIndex(e => e.id === currentScholarId) + 1;

  const titles = {
    ks1: "⭐ Star Collectors",
    ks2: "🏆 Commander Rankings",
    ks3: "📊 Year Group Standings",
    ks4: "📊 Standings",
  };

  const xpLabel = { ks1: "Stars", ks2: "Stardust", ks3: "XP", ks4: "Points" };

  return (
    <div style={{
      background: t.colours.card,
      border: `1px solid ${t.colours.cardBorder}`,
      borderRadius: t.radius.card,
      padding: band === "ks1" ? 22 : 18,
      backdropFilter: isDark ? "blur(12px)" : undefined,
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span style={{
          fontSize: band === "ks1" ? 15 : 13, fontWeight: t.fontWeight.black,
          color: t.colours.text, fontFamily: t.fonts.display,
        }}>
          {titles[band]}
        </span>
        {myRank > 0 && (
          <span style={{
            fontSize: 10, fontWeight: 700, color: t.colours.accent,
            fontFamily: t.fonts.body, textTransform: "uppercase", letterSpacing: ".06em",
          }}>
            You: #{myRank}
          </span>
        )}
      </div>

      {/* Entries */}
      <div style={{ display: "flex", flexDirection: "column", gap: band === "ks1" ? 8 : 6 }}>
        {visible.map((entry, i) => {
          const isMe = entry.id === currentScholarId;
          const medal = ["🥇", "🥈", "🥉"][i];
          const rank = medal || `${i + 1}`;

          return (
            <div
              key={entry.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: band === "ks1" ? "10px 12px" : "8px 10px",
                borderRadius: t.radius.button,
                background: isMe
                  ? t.colours.accentLight
                  : "transparent",
                border: isMe
                  ? `1.5px solid ${t.colours.accent}`
                  : `1px solid ${t.colours.cardBorder}`,
                transition: "all 0.15s",
              }}
            >
              {/* Rank */}
              <span style={{
                fontSize: medal ? 18 : 12, fontWeight: 800,
                color: medal ? undefined : t.colours.textMuted,
                width: 28, textAlign: "center", flexShrink: 0,
                fontFamily: t.fonts.display,
              }}>
                {rank}
              </span>

              {/* Avatar circle */}
              <div style={{
                width: band === "ks1" ? 32 : 28,
                height: band === "ks1" ? 32 : 28,
                borderRadius: 999,
                background: `linear-gradient(135deg, ${t.colours.accent}, ${t.colours.accentDark})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: band === "ks1" ? 16 : 14,
                flexShrink: 0,
              }}>
                {entry.avatar?.base === "astronaut" ? "👨‍🚀"
                  : entry.avatar?.base === "explorer" ? "👩‍🚀"
                  : entry.avatar?.base === "fox" ? "🦊"
                  : entry.avatar?.base === "cat" ? "🐱"
                  : entry.avatar?.base === "robot" ? "🤖"
                  : entry.avatar?.base === "unicorn" ? "🦄"
                  : "🚀"}
              </div>

              {/* Name */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: band === "ks1" ? 13 : 12,
                  fontWeight: t.fontWeight.bold,
                  color: isMe ? t.colours.accent : t.colours.text,
                  fontFamily: t.fonts.body,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {entry.codename || "Scholar"}{isMe ? " (You)" : ""}
                </div>
                {band !== "ks1" && entry.personal_best > 0 && (
                  <div style={{ fontSize: 10, color: t.colours.textMuted }}>
                    {entry.personal_best}% best
                  </div>
                )}
              </div>

              {/* XP */}
              <div style={{
                fontSize: band === "ks1" ? 13 : 12,
                fontWeight: t.fontWeight.black,
                color: isMe ? t.colours.accent : t.colours.text,
                fontFamily: t.fonts.display,
                flexShrink: 0,
              }}>
                {(entry.total_xp || 0).toLocaleString()} {band === "ks1" ? "⭐" : ""}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}