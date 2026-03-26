"use client";
/**
 * AdaptiveStats.jsx
 * Deploy to: src/components/dashboard/AdaptiveStats.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Renders a row of stat cards adapted to the scholar's age band.
 * KS1: Stars, Adventures, Stickers (no percentages)
 * KS2: Stardust, Missions, Streak
 * KS3: Mastery %, Time spent, Streak
 * KS4: Predicted grade, Mastery %, Mocks completed
 *
 * Props:
 *   stats — { xp, questsCompleted, streak, streakBest, masteryPct,
 *             topicCount, timeMinutes, predictedGrade, mocksCompleted,
 *             stickersCollected }
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useRef, useEffect } from "react";
import gsap from "gsap";
import { useTheme } from "@/components/theme/ThemeProvider";

function Card({ icon, label, value, sub }) {
  const { theme: t, isDark } = useTheme();
  const cardRef = useRef(null);

  // ── 3D micro-tilt on hover ──
  const handleMouseMove = (e) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    gsap.to(el, {
      rotateX: -y * 6, rotateY: x * 6, scale: 1.03,
      duration: 0.3, ease: "power2.out", overwrite: "auto",
    });
  };
  const handleMouseLeave = () => {
    const el = cardRef.current;
    if (!el) return;
    gsap.to(el, {
      rotateX: 0, rotateY: 0, scale: 1,
      duration: 0.45, ease: "elastic.out(1, 0.6)", overwrite: "auto",
    });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        background: t.colours.card,
        border: `1px solid ${t.colours.cardBorder}`,
        borderRadius: t.radius.card * 0.7,
        padding: "14px 16px",
        flex: 1,
        minWidth: 0,
        backdropFilter: isDark ? "blur(12px)" : undefined,
        transformStyle: "preserve-3d",
        willChange: "transform",
        transition: "box-shadow 0.3s ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: t.colours.textMuted,
            fontFamily: t.fonts.body,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          {label}
        </span>
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: t.fontWeight.black,
          color: t.colours.text,
          fontFamily: t.fonts.display,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            fontSize: 11,
            color: t.colours.textMuted,
            fontFamily: t.fonts.body,
            marginTop: 4,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

export default function AdaptiveStats({ stats = {} }) {
  const { band, theme: t } = useTheme();
  const s = stats;

  const cards = {
    ks1: [
      { icon: "⭐", label: t.xpName, value: s.xp ?? 0, sub: "this week" },
      { icon: "🗺️", label: "Adventures", value: s.questsCompleted ?? 0, sub: "completed" },
      { icon: "🏅", label: "Stickers", value: s.stickersCollected ?? 0, sub: "collected" },
    ],
    ks2: [
      { icon: t.xpIcon, label: t.xpName, value: (s.xp ?? 0).toLocaleString(), sub: `+${s.xpToday ?? 0} today` },
      { icon: "🎯", label: "Missions", value: s.questsCompleted ?? 0, sub: "completed" },
      { icon: "🔥", label: "Streak", value: `${s.streak ?? 0}d`, sub: `best: ${s.streakBest ?? 0}d` },
    ],
    ks3: [
      { icon: "📊", label: "Mastery", value: `${s.masteryPct ?? 0}%`, sub: `across ${s.topicCount ?? 0} topics` },
      { icon: "⏱️", label: "Time", value: `${((s.timeMinutes ?? 0) / 60).toFixed(1)}h`, sub: "this week" },
      { icon: "🔥", label: "Streak", value: `${s.streak ?? 0}d`, sub: `best: ${s.streakBest ?? 0}d` },
    ],
    ks4: [
      { icon: "📐", label: "Grade", value: s.predictedGrade ?? "—", sub: "predicted" },
      { icon: "◆", label: "Mastery", value: `${s.masteryPct ?? 0}%`, sub: `${s.topicCount ?? 0} topics` },
      { icon: "📝", label: "Mocks", value: s.mocksCompleted ?? 0, sub: "completed" },
    ],
  };

  const rowRef = useRef(null);

  // ── GSAP stagger entrance for stat cards ──
  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    const children = el.children;
    if (children.length === 0) return;
    gsap.fromTo(children,
      { opacity: 0, y: 18, scale: 0.92 },
      { opacity: 1, y: 0, scale: 1, duration: 0.45, stagger: 0.1, ease: "back.out(1.4)", delay: 0.2 }
    );
  }, [band]);

  return (
    <div ref={rowRef} style={{ display: "flex", gap: 8, perspective: "600px" }}>
      {(cards[band] ?? cards.ks2).map((c, i) => (
        <Card key={i} {...c} />
      ))}
    </div>
  );
}