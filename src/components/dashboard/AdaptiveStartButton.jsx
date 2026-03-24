"use client";
/**
 * AdaptiveStartButton.jsx (v2)
 * Deploy to: src/components/dashboard/AdaptiveStartButton.jsx
 *
 * v2: Button label reflects the subject being launched.
 */

import React from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { getSubjectLabel } from "@/lib/subjectDisplay";

export default function AdaptiveStartButton({ onClick, label, disabled = false, subject }) {
  const { band, theme: t } = useTheme();

  const subjectLabel = getSubjectLabel(subject);

  const defaults = {
    ks1: subjectLabel ? `Start ${subjectLabel} adventure! ✨` : "Start today's adventure! ✨",
    ks2: subjectLabel ? `Launch ${subjectLabel} mission 🚀` : "Launch next mission 🚀",
    ks3: subjectLabel ? `Start ${subjectLabel} challenge` : "Start challenge",
    ks4: subjectLabel ? `Begin ${subjectLabel} practice` : "Begin practice session",
  };

  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: "100%",
      padding: band === "ks1" ? 18 : band === "ks4" ? 14 : 16,
      background: disabled
        ? "transparent"
        : `linear-gradient(135deg, ${t.colours.accent}, ${t.colours.accentDark})`,
      border: disabled ? `2px solid ${t.colours.cardBorder}` : "none",
      borderRadius: band === "ks1" ? 999 : t.radius.card * 0.7,
      cursor: disabled ? "default" : "pointer",
      fontSize: band === "ks1" ? 17 : 14,
      fontWeight: t.fontWeight.black,
      color: disabled ? t.colours.textMuted : "#fff",
      fontFamily: t.fonts.display,
      boxShadow: disabled ? "none" : `0 4px 16px ${t.colours.accent}30`,
      transition: "all 0.2s",
      ...(band === "ks1" && !disabled ? { borderBottom: `4px solid ${t.colours.accentDark}` } : {}),
    }}>
      {label || defaults[band] || defaults.ks2}
    </button>
  );
}