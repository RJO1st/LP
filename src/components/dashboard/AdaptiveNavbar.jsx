"use client";
/**
 * AdaptiveNavbar.jsx
 * Deploy to: src/components/dashboard/AdaptiveNavbar.jsx
 */
import React from "react";
import { useTheme } from "@/components/theme/ThemeProvider";

export default function AdaptiveNavbar({ xp = 0, coins = 0, todayQCount = 0, effectiveTier = "pro", onAvatar, onSignOut }) {
  const { band, theme: t } = useTheme();
  const isDark = band === "ks2" || band === "ks4";

  return (
    <div style={{
      padding: "12px 20px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      borderBottom: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.06)",
    }}>
      {/* Logo + metaphor */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 34, height: 34, borderRadius: band === "ks1" ? 14 : 10,
          background: `linear-gradient(135deg, ${t.colours.accent}, ${t.colours.accentDark})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 15, color: "#fff",
        }}>
          {t.mascot}
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: t.fontWeight.black, color: t.colours.text, fontFamily: t.fonts.display }}>
            LaunchPard
          </div>
          <div style={{ fontSize: 10, color: t.colours.textMuted, fontWeight: 500, fontFamily: t.fonts.body }}>
            {t.metaphor}
          </div>
        </div>
      </div>

      {/* Right controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {/* Free tier counter — only show for free plan */}
        {effectiveTier === "free" && (
          <div style={{
            display: "flex", alignItems: "center", gap: 4,
            background: t.colours.accentLight, padding: "4px 10px",
            borderRadius: 999, fontSize: 11, fontWeight: 700,
            color: t.colours.accent,
          }}>
            📝 {todayQCount}/10 <span style={{ fontSize: 9, opacity: 0.7, marginLeft: 2 }}>today</span>
          </div>
        )}

        {/* Coins */}
        <div style={{
          display: "flex", alignItems: "center", gap: 4,
          background: isDark ? "rgba(255,255,255,0.06)" : "#fef9c3",
          padding: "4px 10px", borderRadius: 999,
          fontSize: 12, fontWeight: 700,
          color: isDark ? "#fbbf24" : "#92400e",
          border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid #fde68a",
        }}>
          🪙 {coins}
        </div>

        {/* XP */}
        <div style={{
          display: "flex", alignItems: "center", gap: 4,
          background: t.colours.accentLight, padding: "4px 12px",
          borderRadius: 999, fontSize: 12, fontWeight: t.fontWeight.bold,
          color: t.colours.accent, fontFamily: t.fonts.display,
        }}>
          {t.xpIcon} {xp.toLocaleString()} {t.xpName}
        </div>

        {/* Avatar */}
        <button onClick={onAvatar} style={{
          display: "flex", alignItems: "center", gap: 4,
          background: isDark ? "rgba(255,255,255,0.06)" : "#f5f3ff",
          padding: "6px 10px", borderRadius: 10, border: "none", cursor: "pointer",
          color: t.colours.text, fontSize: 12, fontWeight: 700,
        }}>
          👤 Avatar
        </button>

        {/* Logout */}
        <button onClick={onSignOut} style={{
          background: "none", border: "none", cursor: "pointer",
          fontSize: 11, fontWeight: 700, color: t.colours.textMuted,
          padding: "6px 10px", borderRadius: 8,
          textTransform: "uppercase", letterSpacing: "0.05em",
        }}>
          Logout
        </button>
      </div>
    </div>
  );
}