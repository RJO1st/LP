"use client";
/**
 * StoryUnlockModal.jsx
 * Deploy to: src/components/adventure/StoryUnlockModal.jsx
 *
 * Full-screen celebration modal that fires when tier_crossed arrives
 * in the onComplete payload from QuestOrchestrator.
 *
 * Imports getUnlockNarrative() and getRealmForSubject() from the real
 * narrativeEngine.js so visual identity and copy are always in sync
 * with the rest of the adventure system.
 *
 * Props:
 *   tier        — "developing" | "expected" | "exceeding"
 *   subject     — subject key, e.g. "mathematics"
 *   topic       — topic slug that crossed the tier, e.g. "fractions"
 *   scholarName — string
 *   yearLevel   — number
 *   onClose     — () => void
 */

import React, { useEffect, useState, useMemo } from "react";
import { getRealmForSubject, getUnlockNarrative } from "@/lib/narrativeEngine";

// ─── Tier visual config ───────────────────────────────────────────
const TIER_STYLE = {
  exceeding:  { border: "#fbbf24", glow: "#fbbf2450", btn: "linear-gradient(135deg,#f59e0b,#d97706)", orb: "🏆", label: "Stellar"  },
  expected:   { border: "#a78bfa", glow: "#a78bfa40", btn: "linear-gradient(135deg,#7c3aed,#6d28d9)", orb: "⭐", label: "On Track" },
  developing: { border: "#34d399", glow: "#34d39940", btn: "linear-gradient(135deg,#059669,#047857)", orb: "🌱", label: "Building" },
};

const PARTICLE_PALETTE = {
  exceeding:  ["#fbbf24", "#f59e0b", "#fde68a"],
  expected:   ["#a78bfa", "#8b5cf6", "#c4b5fd"],
  developing: ["#34d399", "#10b981", "#6ee7b7"],
};

// Deterministic particles — avoids hydration mismatch
const makeParticles = (tier) => {
  const cols = PARTICLE_PALETTE[tier] || PARTICLE_PALETTE.developing;
  return Array.from({ length: 20 }, (_, i) => ({
    x:   ((i * 73 + 17) % 90) + 5,
    dur: 1.8 + (i % 5) * 0.4,
    del: (i % 7) * 0.15,
    sz:  i % 4 === 0 ? 8 : i % 3 === 0 ? 5 : 4,
    col: cols[i % cols.length],
  }));
};

// ─── Modal ────────────────────────────────────────────────────────
export default function StoryUnlockModal({ tier, subject, topic, scholarName, yearLevel, onClose }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 40);
    return () => clearTimeout(t);
  }, []);

  const realm     = getRealmForSubject(subject);
  const style     = TIER_STYLE[tier] || TIER_STYLE.developing;
  const particles = useMemo(() => makeParticles(tier), [tier]);
  const narrative = getUnlockNarrative(tier, subject, scholarName, yearLevel);

  const topicLabel = topic
    ? topic.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
    : null;

  const y = Number(yearLevel);
  const ctaLabel =
    y <= 4 ? "Continue my adventure! 🚀" :
    y <= 8 ? "Continue mission →"          :
             "Continue →";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="unlock-headline"
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(6, 4, 18, 0.97)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
        opacity: visible ? 1 : 0,
        transition: "opacity 0.3s ease",
      }}
    >
      {/* Float-up animation keyframe */}
      <style>{`
        @keyframes lp-float {
          0%   { transform: translateY(0) scale(1);   opacity: 0; }
          15%  { opacity: 1; }
          85%  { opacity: 0.7; }
          100% { transform: translateY(-105vh) scale(0.5); opacity: 0; }
        }
      `}</style>

      {/* Floating particles */}
      <div aria-hidden="true" style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
        {particles.map((p, i) => (
          <div key={i} style={{
            position: "absolute", left: `${p.x}%`, bottom: -8,
            width: p.sz, height: p.sz, borderRadius: "50%",
            background: p.col, opacity: 0,
            animation: `lp-float ${p.dur}s ${p.del}s ease-in-out infinite`,
          }} />
        ))}
      </div>

      {/* Modal card */}
      <div style={{
        background: "linear-gradient(150deg, #1e1b4b 0%, #0f172a 100%)",
        border: `2px solid ${style.border}`,
        borderRadius: 24, padding: "38px 28px 28px",
        maxWidth: 440, width: "100%", textAlign: "center",
        position: "relative", overflow: "hidden",
        boxShadow: `0 0 60px ${style.glow}`,
        transform: visible ? "scale(1) translateY(0)" : "scale(0.92) translateY(20px)",
        transition: "transform 0.4s cubic-bezier(0.34,1.56,0.64,1)",
      }}>

        {/* Realm orb */}
        <div style={{
          width: 88, height: 88, borderRadius: "50%",
          background: realm?.colour
            ? `radial-gradient(circle at 35% 35%, ${realm.colour}cc, ${realm.colour}77)`
            : "radial-gradient(circle at 35% 35%, #374151, #1f2937)",
          margin: "0 auto 20px",
          boxShadow: `0 0 44px ${realm?.colour || "#475569"}55`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 32, position: "relative", zIndex: 2,
        }}>
          {realm?.icon || style.orb}
        </div>

        {/* Headline */}
        <h2 id="unlock-headline" style={{
          fontSize: 20, fontWeight: 700, lineHeight: 1.3, marginBottom: 12,
          color: style.border, position: "relative", zIndex: 2,
        }}>
          {narrative.headline}
        </h2>

        {/* Body */}
        <p style={{
          fontSize: 14, lineHeight: 1.75, marginBottom: 20,
          color: "rgba(255,255,255,0.75)", position: "relative", zIndex: 2,
        }}>
          {narrative.body}
        </p>

        {/* Topic chip */}
        {topicLabel && (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            background: `${style.border}15`,
            border: `1px solid ${style.border}40`,
            borderRadius: 20, padding: "4px 14px",
            fontSize: 11, fontWeight: 700, color: style.border,
            marginBottom: 20, position: "relative", zIndex: 2,
          }}>
            {style.orb} {style.label} · {topicLabel}
          </div>
        )}

        {/* CTA button */}
        <button
          onClick={onClose}
          style={{
            display: "block", width: "100%",
            padding: "13px 24px", borderRadius: 13,
            background: style.btn, border: "none",
            cursor: "pointer", fontSize: 14, fontWeight: 700, color: "#fff",
            position: "relative", zIndex: 2,
            transition: "opacity 0.15s ease, transform 0.15s ease",
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = "0.88"; e.currentTarget.style.transform = "scale(1.01)"; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = "1";    e.currentTarget.style.transform = "scale(1)"; }}
          onMouseDown={e =>  { e.currentTarget.style.transform = "scale(0.98)"; }}
          onMouseUp={e =>    { e.currentTarget.style.transform = "scale(1.01)"; }}
        >
          {ctaLabel}
        </button>
      </div>
    </div>
  );
}