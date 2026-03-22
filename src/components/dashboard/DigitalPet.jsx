"use client";
/**
 * DigitalPet.jsx
 * Deploy to: src/components/dashboard/DigitalPet.jsx
 *
 * A digital pet that evolves as the scholar earns XP.
 * KS1/KS2 only. 4 evolution stages. Pet type chosen on first render.
 *
 * Props:
 *   totalXp    — number
 *   scholarId  — string (for persistent pet type)
 */

import React, { useState, useEffect } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";

const PET_TYPES = [
  {
    name: "Starling",
    stages: [
      { emoji: "🥚", label: "Egg", minXp: 0 },
      { emoji: "🐣", label: "Hatchling", minXp: 100 },
      { emoji: "🐥", label: "Chick", minXp: 500 },
      { emoji: "🦅", label: "Eagle", minXp: 2000 },
    ],
  },
  {
    name: "Cosmo",
    stages: [
      { emoji: "🌑", label: "Seed", minXp: 0 },
      { emoji: "🌱", label: "Sprout", minXp: 100 },
      { emoji: "🌿", label: "Sapling", minXp: 500 },
      { emoji: "🌳", label: "Great Tree", minXp: 2000 },
    ],
  },
  {
    name: "Blaze",
    stages: [
      { emoji: "💫", label: "Spark", minXp: 0 },
      { emoji: "🔥", label: "Flame", minXp: 100 },
      { emoji: "☀️", label: "Sun", minXp: 500 },
      { emoji: "⭐", label: "Supernova", minXp: 2000 },
    ],
  },
  {
    name: "Buddy",
    stages: [
      { emoji: "🫧", label: "Bubble", minXp: 0 },
      { emoji: "🐾", label: "Paw Print", minXp: 100 },
      { emoji: "🐶", label: "Puppy", minXp: 500 },
      { emoji: "🦁", label: "Lion", minXp: 2000 },
    ],
  },
];

function getPetKey(scholarId) {
  return `lp_pet_${scholarId}`;
}

export default function DigitalPet({ totalXp = 0, scholarId }) {
  const { band, theme: t } = useTheme();
  const [petIdx, setPetIdx] = useState(0);

  // Only KS1/KS2
  if (band !== "ks1" && band !== "ks2") return null;

  // Persistent pet selection per scholar
  useEffect(() => {
    if (!scholarId) return;
    const saved = localStorage.getItem(getPetKey(scholarId));
    if (saved !== null) {
      setPetIdx(parseInt(saved, 10));
    } else {
      // Assign based on scholar ID hash for consistency
      const hash = scholarId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
      const idx = hash % PET_TYPES.length;
      setPetIdx(idx);
      localStorage.setItem(getPetKey(scholarId), String(idx));
    }
  }, [scholarId]);

  const pet = PET_TYPES[petIdx] || PET_TYPES[0];
  const currentStage = [...pet.stages].reverse().find(s => totalXp >= s.minXp) || pet.stages[0];
  const stageIdx = pet.stages.indexOf(currentStage);
  const nextStage = pet.stages[stageIdx + 1];
  const progressToNext = nextStage
    ? Math.min(100, Math.round(((totalXp - currentStage.minXp) / (nextStage.minXp - currentStage.minXp)) * 100))
    : 100;

  return (
    <div style={{
      background: t.colours.card,
      border: `1px solid ${t.colours.cardBorder}`,
      borderRadius: t.radius.card,
      padding: band === "ks1" ? 22 : 18,
      textAlign: "center",
    }}>
      {/* Pet display */}
      <div style={{
        fontSize: 52, lineHeight: 1, marginBottom: 8,
        filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.1))",
        animation: "lp-pet-bounce 2s ease-in-out infinite",
      }}>
        {currentStage.emoji}
      </div>

      <div style={{
        fontSize: band === "ks1" ? 15 : 13, fontWeight: t.fontWeight.black,
        color: t.colours.text, fontFamily: t.fonts.display,
      }}>
        {pet.name}
      </div>

      <div style={{
        fontSize: 11, fontWeight: 600, color: t.colours.accent,
        fontFamily: t.fonts.body, marginTop: 2,
      }}>
        {currentStage.label}
      </div>

      {/* Evolution progress */}
      {nextStage && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: t.colours.textMuted, fontFamily: t.fonts.body }}>
              Next: {nextStage.emoji} {nextStage.label}
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, color: t.colours.accent, fontFamily: t.fonts.body }}>
              {progressToNext}%
            </span>
          </div>
          <div style={{
            height: 6, background: band === "ks2" ? "rgba(255,255,255,0.1)" : "#f1f5f9",
            borderRadius: 3, overflow: "hidden",
          }}>
            <div style={{
              width: `${progressToNext}%`, height: "100%",
              background: `linear-gradient(90deg, ${t.colours.accent}, ${t.colours.accentDark})`,
              borderRadius: 3, transition: "width 0.5s ease",
            }} />
          </div>
          <div style={{
            fontSize: 9, color: t.colours.textMuted, fontFamily: t.fonts.body, marginTop: 4,
          }}>
            {nextStage.minXp - totalXp > 0
              ? `${(nextStage.minXp - totalXp).toLocaleString()} ${t.xpName} to evolve`
              : "Ready to evolve!"}
          </div>
        </div>
      )}

      {stageIdx === pet.stages.length - 1 && (
        <div style={{
          fontSize: 11, fontWeight: 700, color: "#22c55e",
          fontFamily: t.fonts.body, marginTop: 8,
        }}>
          Fully evolved! 🏆
        </div>
      )}

      {/* Evolution timeline */}
      <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 12 }}>
        {pet.stages.map((s, i) => (
          <div key={i} style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            opacity: i <= stageIdx ? 1 : 0.3,
          }}>
            <span style={{ fontSize: 18 }}>{s.emoji}</span>
            <span style={{ fontSize: 8, fontWeight: 700, color: t.colours.textMuted }}>{s.minXp}</span>
          </div>
        ))}
      </div>

      <style>{`@keyframes lp-pet-bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}`}</style>
    </div>
  );
}