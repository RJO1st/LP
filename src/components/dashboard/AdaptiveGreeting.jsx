"use client";
/**
 * AdaptiveGreeting.jsx
 * Deploy to: src/components/dashboard/AdaptiveGreeting.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Welcome header adapted per age band.
 * KS1: "Hi [name]! Ready for an adventure? ✨"
 * KS2: "Welcome back, Commander [name]! 🚀"
 * KS3: "Hey [name]. Let's make progress."
 * KS4: "[name] · Year [N]"
 *
 * Props:
 *   scholarName — string
 *   streak      — number
 *   xp          — number
 *   yearLevel   — number
 *   examName    — string (KS4 — e.g. "GCSE")
 *   daysUntilExam — number (KS4)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React from "react";
import { useTheme } from "@/components/theme/ThemeProvider";

export default function AdaptiveGreeting({
  scholarName = "Scholar",
  streak = 0,
  xp = 0,
  yearLevel,
  examName,
  daysUntilExam,
}) {
  const { band, theme: t } = useTheme();
  const name = scholarName || "Scholar";

  const greetings = {
    ks1: { main: `Hi ${name}! Ready for an adventure? ✨`, sub: null },
    ks2: {
      main: `Welcome back, Commander ${name}! 🚀`,
      sub: `${streak > 0 ? `${streak}-day streak · ` : ""}${xp.toLocaleString()} ${t.xpName}`,
    },
    ks3: {
      main: `Hey ${name}. Let's make progress.`,
      sub: `${streak > 0 ? `${streak}-day streak · ` : ""}${xp.toLocaleString()} ${t.xpName}${t.dashboard.showMasteryPct ? " · Top 15%" : ""}`,
    },
    ks4: {
      main: `${name} · Year ${yearLevel || "11"}`,
      sub: `Streak: ${streak}d${daysUntilExam ? ` · ${examName || "Exam"} in ${daysUntilExam} days` : ""}`,
    },
  };

  const g = greetings[band] || greetings.ks2;

  return (
    <div
      style={{
        textAlign: band === "ks1" ? "center" : "left",
        padding: band === "ks1" ? "8px 0" : "0",
      }}
    >
      <div
        style={{
          fontSize: band === "ks1" ? 22 : band === "ks4" ? 18 : 20,
          fontWeight: t.fontWeight.black,
          color: t.colours.text,
          fontFamily: t.fonts.display,
        }}
      >
        {g.main}
      </div>
      {g.sub && (
        <div
          style={{
            fontSize: 12,
            color: t.colours.textMuted,
            fontFamily: t.fonts.body,
            marginTop: 4,
          }}
        >
          {g.sub}
        </div>
      )}
    </div>
  );
}