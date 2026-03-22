"use client";
/**
 * AdaptiveNavbar.jsx
 * Deploy to: src/components/dashboard/AdaptiveNavbar.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Top navigation bar adapted per age band.
 * Shows: logo + metaphor label | XP/Stars badge
 *
 * Props:
 *   xp       — number
 *   onMenu   — () => void (hamburger tap)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import DarkModeToggle from "./DarkModeToggle";

export default function AdaptiveNavbar({ xp = 0, onMenu }) {
  const { band, theme: t } = useTheme();

  return (
    <div
      style={{
        padding: "16px 20px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      {/* Logo + metaphor */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: band === "ks1" ? 16 : 10,
            background: `linear-gradient(135deg, ${t.colours.accent}, ${t.colours.accentDark})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            color: "#fff",
            cursor: onMenu ? "pointer" : "default",
          }}
          onClick={onMenu}
        >
          {t.mascot}
        </div>
        <div>
          <div
            style={{
              fontSize: band === "ks1" ? 16 : 14,
              fontWeight: t.fontWeight.black,
              color: t.colours.text,
              fontFamily: t.fonts.display,
            }}
          >
            LaunchPard
          </div>
          <div
            style={{
              fontSize: 10,
              color: t.colours.textMuted,
              fontWeight: 500,
              fontFamily: t.fonts.body,
            }}
          >
            {t.metaphor}
          </div>
        </div>
      </div>

      {/* XP badge */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: t.colours.accentLight,
          padding: "6px 14px",
          borderRadius: 999,
          fontSize: 13,
          fontWeight: t.fontWeight.bold,
          color: t.colours.accent,
          fontFamily: t.fonts.display,
        }}
      >
        {t.xpIcon} {xp.toLocaleString()} {t.xpName}
      </div>
      {/* Dark mode toggle — KS4 only */}
      <DarkModeToggle onToggle={(isDark) => {
        // Future: propagate to ThemeProvider to swap KS4 colours
        document.documentElement.style.setProperty('--lp-dark', isDark ? '1' : '0');
      }} />
    </div>
  );
}