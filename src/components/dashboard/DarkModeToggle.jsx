"use client";
/**
 * DarkModeToggle.jsx
 * Deploy to: src/components/dashboard/DarkModeToggle.jsx
 *
 * KS4 dark/light mode toggle. Stores preference in localStorage.
 * When light mode is active, overrides the KS4 dark theme with a light variant.
 *
 * Props:
 *   onToggle — (isDark: boolean) => void
 */

import React, { useState, useEffect } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";

export default function DarkModeToggle({ onToggle }) {
  const { band, theme: t } = useTheme();
  const [isDark, setIsDark] = useState(true);

  // Only show for KS4
  if (band !== "ks4") return null;

  useEffect(() => {
    const saved = localStorage.getItem("lp_dark_mode");
    if (saved !== null) {
      const val = saved === "true";
      setIsDark(val);
      onToggle?.(val);
    }
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem("lp_dark_mode", String(next));
    onToggle?.(next);
  };

  return (
    <button
      onClick={toggle}
      style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "6px 12px", borderRadius: t.radius.button,
        background: isDark ? "rgba(255,255,255,0.06)" : "#f1f5f9",
        border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "#e2e8f0"}`,
        cursor: "pointer", transition: "all 0.2s",
        fontSize: 11, fontWeight: 600,
        color: isDark ? "#94a3b8" : "#475569",
        fontFamily: t.fonts.body,
      }}
    >
      <span style={{ fontSize: 14 }}>{isDark ? "🌙" : "☀️"}</span>
      {isDark ? "Dark" : "Light"}
    </button>
  );
}