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

import React, { useRef, useEffect } from "react";
import gsap from "gsap";
import { useTheme } from "@/components/theme/ThemeProvider";
import AvatarRenderer from "@/components/game/AvatarRenderer";
import LottieAvatar from "@/components/game/LottieAvatar";

// ── Avatar Display — Lottie primary, SVG fallback ───────────────────────────
function GreetingAvatar({ avatar, onClick, band, questsCompleted, streak = 0, mastery = 0 }) {
  const sizeKey = band === "ks1" ? "lg" : band === "ks4" ? "md" : "lg";

  return (
    <div
      style={{ cursor: onClick ? "pointer" : "default", position: "relative", flexShrink: 0 }}
      title={onClick ? "Customise avatar" : undefined}
    >
      <LottieAvatar
        avatar={avatar}
        size={sizeKey}
        streak={streak}
        mastery={mastery}
        onClick={onClick}
      />
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
  isFirstLogin = false,
  questsCompleted = 0,
}) {
  const { band, theme: t } = useTheme();
  const name = scholarName || "Scholar";

  const greetings = {
    ks1: { main: isFirstLogin ? `Welcome, ${name}! ✨` : `Hi ${name}! Ready for an adventure? ✨`, sub: null },
    ks2: {
      main: isFirstLogin ? `Welcome, Commander ${name}! 🚀` : `Welcome back, Commander ${name}! 🚀`,
      sub: streak > 0 ? `${streak}-day streak 🔥` : null,
    },
    ks3: {
      main: isFirstLogin ? `Welcome, ${name}.` : `Hey ${name}. Let's make progress.`,
      sub: `${streak > 0 ? `${streak}-day streak · ` : ""}${xp.toLocaleString()} ${t.xpName}`,
    },
    ks4: {
      main: `${name} · Year ${yearLevel || "11"}`,
      sub: `Streak: ${streak}d${daysUntilExam ? ` · ${examName || "Exam"} in ${daysUntilExam} days` : ""}`,
    },
  };

  const g = greetings[band] || greetings.ks2;
  const greetRef = useRef(null);

  // ── GSAP entrance: fade-in + scale from center ──
  useEffect(() => {
    const el = greetRef.current;
    if (!el) return;
    gsap.fromTo(el,
      { opacity: 0, y: -12, scale: 0.97 },
      { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: "power3.out", delay: 0.1 }
    );
  }, []);

  return (
    <div
      ref={greetRef}
      style={{
        display: "flex",
        alignItems: band === "ks1" ? "center" : "flex-start",
        flexDirection: band === "ks1" ? "column" : "row",
        gap: band === "ks1" ? 12 : 16,
        padding: band === "ks1" ? "8px 0" : "0",
      }}
    >
      {avatar && (
        <GreetingAvatar avatar={avatar} onClick={onAvatarClick} band={band} questsCompleted={questsCompleted} streak={streak} mastery={xp > 0 ? Math.min(100, Math.round(xp / 50)) : 0} />
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