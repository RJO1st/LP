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
 *   scholarName   — string
 *   streak        — number
 *   xp            — number
 *   yearLevel     — number
 *   examName      — string (KS4 — e.g. "GCSE")
 *   daysUntilExam — number (KS4)
 *   avatar        — object { base, hat, pet, accessory, background }
 *   onAvatarClick — function (opens avatar shop)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { AVATAR_ITEMS } from "@/lib/gamificationEngine";

// ── Inline Avatar Display ──────────────────────────────────────────────────
function GreetingAvatar({ avatar, onClick, band }) {
  const BASE_EMOJI = {
    astronaut: "👨‍🚀", explorer: "👩‍🚀", hero: "🦸", wizard: "🧙",
    fox: "🦊", cat: "🐱", robot: "🤖", unicorn: "🦄",
  };
  const BG_MAP = {
    planet: "from-purple-600 to-indigo-800",
    galaxy: "from-slate-800 to-indigo-900",
    sunset: "from-orange-500 to-rose-600",
    ocean:  "from-cyan-600 to-blue-800",
  };
  const bgKey = avatar?.background;
  const bgClass = BG_MAP[bgKey] || "from-indigo-700 to-violet-800";
  const size = band === "ks1" ? 64 : band === "ks4" ? 44 : 52;

  return (
    <div
      onClick={onClick}
      style={{ width: size, height: size, cursor: onClick ? "pointer" : "default", position: "relative", flexShrink: 0 }}
      title={onClick ? "Customise avatar" : undefined}
    >
      <div
        className={`w-full h-full rounded-full bg-gradient-to-br ${bgClass} flex items-center justify-center shadow-lg`}
        style={{ fontSize: size * 0.5, lineHeight: 1 }}
      >
        {BASE_EMOJI[avatar?.base] || "🚀"}
      </div>
      {avatar?.hat && AVATAR_ITEMS[avatar.hat] && (
        <span style={{ position: "absolute", top: -4, right: -4, fontSize: size * 0.28 }}>
          {AVATAR_ITEMS[avatar.hat].icon}
        </span>
      )}
      {avatar?.pet && AVATAR_ITEMS[avatar.pet] && (
        <span style={{ position: "absolute", bottom: -2, right: -2, fontSize: size * 0.25 }}>
          {AVATAR_ITEMS[avatar.pet].icon}
        </span>
      )}
      {onClick && (
        <div style={{
          position: "absolute", bottom: -2, right: -2, width: 20, height: 20,
          borderRadius: "50%", background: "#22d3ee", border: "2px solid white",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 10, boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
        }}>✏️</div>
      )}
    </div>
  );
}

export default function AdaptiveGreeting({
  scholarName = "Scholar",
  streak = 0,
  xp = 0,
  yearLevel,
  examName,
  daysUntilExam,
  avatar,
  onAvatarClick,
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
        display: "flex",
        alignItems: band === "ks1" ? "center" : "flex-start",
        flexDirection: band === "ks1" ? "column" : "row",
        gap: band === "ks1" ? 12 : 16,
        padding: band === "ks1" ? "8px 0" : "0",
      }}
    >
      {avatar && (
        <GreetingAvatar avatar={avatar} onClick={onAvatarClick} band={band} />
      )}
      <div style={{ textAlign: band === "ks1" ? "center" : "left", flex: 1, minWidth: 0 }}>
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
    </div>
  );
}