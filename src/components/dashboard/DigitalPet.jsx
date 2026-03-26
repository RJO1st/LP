"use client";
/**
 * DigitalPet.jsx — Enhanced
 * Deploy to: src/components/dashboard/DigitalPet.jsx
 *
 * An animated SVG digital pet that evolves as the scholar earns XP (Stardust).
 * KS1/KS2 only. 7 evolution stages. GSAP-powered animations.
 * Tap-to-interact with idle bounce, happy reaction, and sparkle effects.
 *
 * Props:
 *   totalXp    — number
 *   scholarId  — string (for persistent pet type)
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import gsap from "gsap";

// ─── PET TYPES (7 stages each) ──────────────────────────────────────────────
const PET_TYPES = [
  {
    name: "Starling",
    element: "sky",
    color: "#6366f1",
    colorLight: "#e0e7ff",
    stages: [
      { label: "Egg",           minXp: 0,     size: 28 },
      { label: "Hatchling",     minXp: 300,   size: 32 },
      { label: "Chick",         minXp: 1000,  size: 36 },
      { label: "Fledgling",     minXp: 3000,  size: 40 },
      { label: "Songbird",      minXp: 6000,  size: 44 },
      { label: "Hawk",          minXp: 12000, size: 48 },
      { label: "Phoenix",       minXp: 25000, size: 52 },
    ],
  },
  {
    name: "Cosmo",
    element: "earth",
    color: "#10b981",
    colorLight: "#d1fae5",
    stages: [
      { label: "Seed",          minXp: 0,     size: 24 },
      { label: "Sprout",        minXp: 300,   size: 28 },
      { label: "Sapling",       minXp: 1000,  size: 32 },
      { label: "Bush",          minXp: 3000,  size: 36 },
      { label: "Tree",          minXp: 6000,  size: 40 },
      { label: "Ancient Oak",   minXp: 12000, size: 46 },
      { label: "World Tree",    minXp: 25000, size: 52 },
    ],
  },
  {
    name: "Blaze",
    element: "fire",
    color: "#f59e0b",
    colorLight: "#fef3c7",
    stages: [
      { label: "Spark",         minXp: 0,     size: 24 },
      { label: "Ember",         minXp: 300,   size: 28 },
      { label: "Flame",         minXp: 1000,  size: 32 },
      { label: "Torch",         minXp: 3000,  size: 36 },
      { label: "Bonfire",       minXp: 6000,  size: 40 },
      { label: "Sun",           minXp: 12000, size: 46 },
      { label: "Supernova",     minXp: 25000, size: 52 },
    ],
  },
  {
    name: "Buddy",
    element: "water",
    color: "#3b82f6",
    colorLight: "#dbeafe",
    stages: [
      { label: "Bubble",        minXp: 0,     size: 24 },
      { label: "Droplet",       minXp: 300,   size: 28 },
      { label: "Puddle Pup",    minXp: 1000,  size: 32 },
      { label: "Stream Fox",    minXp: 3000,  size: 36 },
      { label: "River Wolf",    minXp: 6000,  size: 40 },
      { label: "Ocean Bear",    minXp: 12000, size: 46 },
      { label: "Sea Dragon",    minXp: 25000, size: 52 },
    ],
  },
];

// ─── SVG PET RENDERERS BY TYPE + STAGE ──────────────────────────────────────
function PetSVG({ petType, stageIdx, size, color }) {
  const cx = 60, cy = 55;
  const s = size / 52; // scale factor

  // Common eyes helper
  const Eyes = ({ open = true, dx = 4, dy = -2 }) => (
    <g>
      <circle cx={cx - dx * s} cy={cy + dy * s} r={2.5 * s} fill="white" />
      <circle cx={cx + dx * s} cy={cy + dy * s} r={2.5 * s} fill="white" />
      {open ? (
        <>
          <circle cx={cx - (dx - 0.5) * s} cy={cy + dy * s} r={1.2 * s} fill="#1e293b" />
          <circle cx={cx + (dx + 0.5) * s} cy={cy + dy * s} r={1.2 * s} fill="#1e293b" />
        </>
      ) : (
        <>
          <line x1={cx - (dx + 2) * s} y1={cy + dy * s} x2={cx - (dx - 2) * s} y2={cy + dy * s}
            stroke="#1e293b" strokeWidth={1.5 * s} strokeLinecap="round" />
          <line x1={cx + (dx - 2) * s} y1={cy + dy * s} x2={cx + (dx + 2) * s} y2={cy + dy * s}
            stroke="#1e293b" strokeWidth={1.5 * s} strokeLinecap="round" />
        </>
      )}
    </g>
  );

  if (petType === 0) {
    // STARLING — bird evolution
    if (stageIdx === 0) {
      // Egg
      return (
        <g className="pet-body">
          <ellipse cx={cx} cy={cy} rx={14 * s} ry={18 * s} fill={color} opacity={0.9} />
          <ellipse cx={cx} cy={cy} rx={14 * s} ry={18 * s} fill="none" stroke={color} strokeWidth={2} />
          <path d={`M ${cx - 6 * s} ${cy - 4 * s} Q ${cx} ${cy - 10 * s} ${cx + 6 * s} ${cy - 4 * s}`}
            fill="none" stroke="white" strokeWidth={1.5 * s} opacity={0.4} />
        </g>
      );
    }
    if (stageIdx <= 2) {
      // Hatchling / Chick — small round bird
      return (
        <g className="pet-body">
          <ellipse cx={cx} cy={cy + 4 * s} rx={12 * s} ry={14 * s} fill={color} />
          <circle cx={cx} cy={cy - 6 * s} r={10 * s} fill={color} />
          <Eyes dx={3} dy={-8} />
          <polygon points={`${cx - 2 * s},${cy - 4 * s} ${cx + 2 * s},${cy - 4 * s} ${cx},${cy - 1 * s}`}
            fill="#f59e0b" />
          {stageIdx >= 2 && (
            <>
              <ellipse cx={cx - 14 * s} cy={cy + 2 * s} rx={6 * s} ry={3 * s}
                fill={color} transform={`rotate(-20 ${cx - 14 * s} ${cy + 2 * s})`} opacity={0.8} />
              <ellipse cx={cx + 14 * s} cy={cy + 2 * s} rx={6 * s} ry={3 * s}
                fill={color} transform={`rotate(20 ${cx + 14 * s} ${cy + 2 * s})`} opacity={0.8} />
            </>
          )}
        </g>
      );
    }
    // stages 3-6: progressively more majestic bird
    const wingSpan = 10 + stageIdx * 4;
    const crownSize = stageIdx >= 6 ? 8 : stageIdx >= 5 ? 5 : 0;
    return (
      <g className="pet-body">
        {/* Wings */}
        <ellipse className="pet-wing-l" cx={cx - wingSpan * s} cy={cy + 2 * s} rx={8 * s} ry={14 * s}
          fill={color} transform={`rotate(-15 ${cx - wingSpan * s} ${cy + 2 * s})`} opacity={0.8} />
        <ellipse className="pet-wing-r" cx={cx + wingSpan * s} cy={cy + 2 * s} rx={8 * s} ry={14 * s}
          fill={color} transform={`rotate(15 ${cx + wingSpan * s} ${cy + 2 * s})`} opacity={0.8} />
        {/* Body */}
        <ellipse cx={cx} cy={cy + 4 * s} rx={14 * s} ry={16 * s} fill={color} />
        <circle cx={cx} cy={cy - 8 * s} r={12 * s} fill={color} />
        <Eyes dx={4} dy={-10} />
        <polygon points={`${cx - 3 * s},${cy - 6 * s} ${cx + 3 * s},${cy - 6 * s} ${cx},${cy - 2 * s}`}
          fill="#f59e0b" />
        {/* Crown/crest for high stages */}
        {crownSize > 0 && (
          <g>
            {[-1, 0, 1].map(d => (
              <line key={d} x1={cx + d * 4 * s} y1={cy - 18 * s}
                x2={cx + d * 5 * s} y2={cy - (18 + crownSize) * s}
                stroke={stageIdx >= 6 ? "#f59e0b" : color} strokeWidth={2 * s} strokeLinecap="round" />
            ))}
          </g>
        )}
        {/* Flame aura for Phoenix (stage 6) */}
        {stageIdx >= 6 && (
          <g className="pet-aura" opacity={0.4}>
            {[0, 60, 120, 180, 240, 300].map(deg => {
              const rad = (deg * Math.PI) / 180;
              const aR = 28 * s;
              return (
                <circle key={deg} cx={cx + Math.cos(rad) * aR} cy={cy + Math.sin(rad) * aR}
                  r={4 * s} fill="#f59e0b" />
              );
            })}
          </g>
        )}
        {/* Tail */}
        <path d={`M ${cx} ${cy + 18 * s} Q ${cx - 8 * s} ${cy + 28 * s} ${cx} ${cy + 30 * s} Q ${cx + 8 * s} ${cy + 28 * s} ${cx} ${cy + 18 * s}`}
          fill={color} opacity={0.7} />
      </g>
    );
  }

  if (petType === 1) {
    // COSMO — tree evolution
    if (stageIdx === 0) {
      return (
        <g className="pet-body">
          <ellipse cx={cx} cy={cy + 10 * s} rx={6 * s} ry={4 * s} fill="#92400e" opacity={0.5} />
          <circle cx={cx} cy={cy} r={8 * s} fill={color} opacity={0.6} />
          <circle cx={cx} cy={cy} r={4 * s} fill={color} />
        </g>
      );
    }
    const trunkH = 8 + stageIdx * 4;
    const canopyR = 6 + stageIdx * 4;
    return (
      <g className="pet-body">
        <rect x={cx - 3 * s} y={cy} width={6 * s} height={trunkH * s}
          rx={2 * s} fill="#92400e" />
        <circle className="pet-canopy" cx={cx} cy={cy - canopyR * s * 0.4} r={canopyR * s}
          fill={color} />
        {stageIdx >= 3 && (
          <circle cx={cx - canopyR * s * 0.5} cy={cy - canopyR * s * 0.2} r={canopyR * s * 0.6}
            fill={color} opacity={0.7} />
        )}
        {stageIdx >= 3 && (
          <circle cx={cx + canopyR * s * 0.5} cy={cy - canopyR * s * 0.2} r={canopyR * s * 0.6}
            fill={color} opacity={0.7} />
        )}
        <Eyes dx={3} dy={-canopyR * 0.4} />
        {stageIdx >= 5 && (
          <g className="pet-aura" opacity={0.3}>
            {[0, 72, 144, 216, 288].map(deg => {
              const rad = (deg * Math.PI) / 180;
              return (
                <circle key={deg} cx={cx + Math.cos(rad) * (canopyR + 6) * s}
                  cy={(cy - canopyR * s * 0.4) + Math.sin(rad) * (canopyR + 6) * s}
                  r={2 * s} fill={color} />
              );
            })}
          </g>
        )}
      </g>
    );
  }

  if (petType === 2) {
    // BLAZE — fire evolution
    if (stageIdx === 0) {
      return (
        <g className="pet-body">
          <circle cx={cx} cy={cy} r={6 * s} fill={color} opacity={0.5} />
          <circle cx={cx} cy={cy} r={3 * s} fill="#fbbf24" />
        </g>
      );
    }
    const flameH = 10 + stageIdx * 5;
    const flameW = 6 + stageIdx * 3;
    return (
      <g className="pet-body">
        <ellipse cx={cx} cy={cy + 4 * s} rx={flameW * s} ry={flameH * s} fill={color} />
        <ellipse cx={cx} cy={cy + 2 * s} rx={flameW * 0.7 * s} ry={flameH * 0.7 * s}
          fill="#fbbf24" opacity={0.7} />
        <ellipse cx={cx} cy={cy} rx={flameW * 0.4 * s} ry={flameH * 0.4 * s}
          fill="white" opacity={0.5} />
        <Eyes dx={3} dy={-2} />
        <path d={`M ${cx - 3 * s} ${cy + 4 * s} Q ${cx} ${cy + 7 * s} ${cx + 3 * s} ${cy + 4 * s}`}
          fill="none" stroke="white" strokeWidth={1 * s} strokeLinecap="round" opacity={0.6} />
        {stageIdx >= 4 && (
          <g className="pet-aura" opacity={0.3}>
            {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => {
              const rad = (deg * Math.PI) / 180;
              const aR = (flameH + 4) * s;
              return (
                <circle key={deg} cx={cx + Math.cos(rad) * aR} cy={cy + Math.sin(rad) * aR}
                  r={2 * s} fill="#fbbf24" />
              );
            })}
          </g>
        )}
      </g>
    );
  }

  // BUDDY — water/mammal evolution (petType === 3)
  if (stageIdx === 0) {
    return (
      <g className="pet-body">
        <circle cx={cx} cy={cy} r={10 * s} fill={color} opacity={0.4} />
        <circle cx={cx} cy={cy} r={6 * s} fill={color} opacity={0.7} />
        <circle cx={cx + 3 * s} cy={cy - 2 * s} r={2 * s} fill="white" opacity={0.5} />
      </g>
    );
  }
  const bodyR = 8 + stageIdx * 3;
  const headR = 6 + stageIdx * 2;
  return (
    <g className="pet-body">
      <ellipse cx={cx} cy={cy + 6 * s} rx={bodyR * s} ry={(bodyR - 2) * s} fill={color} />
      <circle cx={cx} cy={cy - 4 * s} r={headR * s} fill={color} />
      {/* Ears */}
      <ellipse cx={cx - headR * 0.7 * s} cy={cy - (headR + 4) * s} rx={3 * s} ry={5 * s}
        fill={color} transform={`rotate(-15 ${cx - headR * 0.7 * s} ${cy - (headR + 4) * s})`} />
      <ellipse cx={cx + headR * 0.7 * s} cy={cy - (headR + 4) * s} rx={3 * s} ry={5 * s}
        fill={color} transform={`rotate(15 ${cx + headR * 0.7 * s} ${cy - (headR + 4) * s})`} />
      <Eyes dx={3} dy={-6} />
      {/* Nose */}
      <ellipse cx={cx} cy={cy - 1 * s} rx={2 * s} ry={1.5 * s} fill="#1e293b" />
      {/* Smile */}
      <path d={`M ${cx - 3 * s} ${cy + 1 * s} Q ${cx} ${cy + 4 * s} ${cx + 3 * s} ${cy + 1 * s}`}
        fill="none" stroke="#1e293b" strokeWidth={1 * s} strokeLinecap="round" />
      {/* Tail */}
      <path d={`M ${cx + bodyR * s} ${cy + 4 * s} Q ${cx + (bodyR + 8) * s} ${cy - 4 * s} ${cx + (bodyR + 4) * s} ${cy + 8 * s}`}
        fill="none" stroke={color} strokeWidth={3 * s} strokeLinecap="round" className="pet-tail" />
      {stageIdx >= 5 && (
        <g className="pet-aura" opacity={0.3}>
          {[0, 60, 120, 180, 240, 300].map(deg => {
            const rad = (deg * Math.PI) / 180;
            return (
              <circle key={deg} cx={cx + Math.cos(rad) * (bodyR + 8) * s}
                cy={cy + Math.sin(rad) * (bodyR + 8) * s}
                r={2 * s} fill={color} />
            );
          })}
        </g>
      )}
    </g>
  );
}

// ─── SPARKLE PARTICLES ──────────────────────────────────────────────────────
function SparkleParticles({ active, color, containerRef }) {
  useEffect(() => {
    if (!active || !containerRef.current) return;
    const svg = containerRef.current.querySelector("svg");
    if (!svg) return;

    const sparkles = [];
    for (let i = 0; i < 8; i++) {
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("r", String(2 + Math.random() * 2));
      circle.setAttribute("fill", i % 2 === 0 ? color : "#fbbf24");
      circle.setAttribute("cx", "60");
      circle.setAttribute("cy", "55");
      circle.setAttribute("opacity", "0");
      svg.appendChild(circle);
      sparkles.push(circle);
    }

    sparkles.forEach((sp, i) => {
      const angle = (i / sparkles.length) * Math.PI * 2 + Math.random() * 0.5;
      const dist = 25 + Math.random() * 20;
      gsap.fromTo(sp,
        { attr: { cx: 60, cy: 55, opacity: 1 } },
        {
          attr: { cx: 60 + Math.cos(angle) * dist, cy: 55 + Math.sin(angle) * dist, opacity: 0 },
          duration: 0.6 + Math.random() * 0.3,
          ease: "power2.out",
          delay: i * 0.04,
          onComplete: () => sp.remove(),
        }
      );
    });
  }, [active, color, containerRef]);

  return null;
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────
function getPetKey(scholarId) {
  return `lp_pet_${scholarId}`;
}

export default function DigitalPet({ totalXp = 0, scholarId }) {
  const { band, theme: t } = useTheme();
  const [petIdx, setPetIdx] = useState(0);
  const [tapped, setTapped] = useState(false);
  const [sparkleCount, setSparkleCount] = useState(0);
  const petRef = useRef(null);

  // Only KS1/KS2
  if (band !== "ks1" && band !== "ks2") return null;

  // Persistent pet selection per scholar
  useEffect(() => {
    if (!scholarId) return;
    const saved = localStorage.getItem(getPetKey(scholarId));
    if (saved !== null) {
      setPetIdx(parseInt(saved, 10));
    } else {
      const hash = scholarId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
      const idx = hash % PET_TYPES.length;
      setPetIdx(idx);
      localStorage.setItem(getPetKey(scholarId), String(idx));
    }
  }, [scholarId]);

  // GSAP idle animations
  useEffect(() => {
    if (!petRef.current) return;
    const ctx = gsap.context(() => {
      const body = petRef.current.querySelector(".pet-body");
      const aura = petRef.current.querySelector(".pet-aura");
      const wingL = petRef.current.querySelector(".pet-wing-l");
      const wingR = petRef.current.querySelector(".pet-wing-r");
      const tail = petRef.current.querySelector(".pet-tail");
      const canopy = petRef.current.querySelector(".pet-canopy");

      if (body) {
        gsap.to(body, { y: -3, duration: 1.2, yoyo: true, repeat: -1, ease: "sine.inOut" });
      }
      if (aura) {
        gsap.to(aura, { opacity: 0.15, scale: 1.08, duration: 1.8, yoyo: true, repeat: -1, ease: "sine.inOut", transformOrigin: "center center" });
      }
      if (wingL) {
        gsap.to(wingL, { rotation: -8, duration: 0.6, yoyo: true, repeat: -1, ease: "sine.inOut", transformOrigin: "right center" });
      }
      if (wingR) {
        gsap.to(wingR, { rotation: 8, duration: 0.6, yoyo: true, repeat: -1, ease: "sine.inOut", transformOrigin: "left center" });
      }
      if (tail) {
        gsap.to(tail, { attr: { d: tail.getAttribute("d").replace(/Q [\d.]+ [\d.]+/, (m) => {
          const parts = m.split(" ");
          return `Q ${parseFloat(parts[1]) + 4} ${parseFloat(parts[2]) - 6}`;
        }) }, duration: 0.8, yoyo: true, repeat: -1, ease: "sine.inOut" });
      }
      if (canopy) {
        gsap.to(canopy, { scale: 1.04, duration: 2, yoyo: true, repeat: -1, ease: "sine.inOut", transformOrigin: "center center" });
      }
    }, petRef);
    return () => ctx.revert();
  }, [petIdx, totalXp]);

  // Tap interaction
  const handleTap = useCallback(() => {
    if (!petRef.current || tapped) return;
    setTapped(true);
    setSparkleCount(c => c + 1);

    const body = petRef.current.querySelector(".pet-body");
    if (body) {
      gsap.to(body, {
        scale: 1.2, y: -10, duration: 0.2, ease: "back.out(3)",
        onComplete: () => {
          gsap.to(body, { scale: 1, y: 0, duration: 0.5, ease: "elastic.out(1, 0.4)" });
        },
      });
    }

    setTimeout(() => setTapped(false), 800);
  }, [tapped]);

  const pet = PET_TYPES[petIdx] || PET_TYPES[0];
  const currentStage = [...pet.stages].reverse().find(s => totalXp >= s.minXp) || pet.stages[0];
  const stageIdx = pet.stages.indexOf(currentStage);
  const nextStage = pet.stages[stageIdx + 1];
  const progressToNext = nextStage
    ? Math.min(100, Math.round(((totalXp - currentStage.minXp) / (nextStage.minXp - currentStage.minXp)) * 100))
    : 100;
  const isMaxed = stageIdx === pet.stages.length - 1;

  return (
    <div ref={petRef} style={{
      background: t.colours.card,
      border: `2px solid ${pet.color}30`,
      borderRadius: t.radius.card,
      padding: band === "ks1" ? 22 : 16,
      textAlign: "center",
      position: "relative", overflow: "hidden",
    }}>
      {/* Ambient glow */}
      <div style={{
        position: "absolute", top: -20, left: "50%", transform: "translateX(-50%)",
        width: 120, height: 120, borderRadius: "50%",
        background: `radial-gradient(circle, ${pet.color}15 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />

      {/* Pet SVG — tap to interact */}
      <div
        onClick={handleTap}
        style={{
          cursor: "pointer", position: "relative", marginBottom: 8,
          display: "inline-block",
        }}
        title="Tap me!"
      >
        <svg width={100} height={100} viewBox="0 0 120 120">
          {/* Habitat ring */}
          <circle cx={60} cy={60} r={52} fill="none" stroke={pet.color} strokeWidth={1.5}
            strokeDasharray="4,4" opacity={0.2} />
          <PetSVG petType={petIdx} stageIdx={stageIdx} size={currentStage.size} color={pet.color} />
        </svg>
        <SparkleParticles active={sparkleCount > 0} color={pet.color} containerRef={petRef} key={sparkleCount} />
      </div>

      {/* Name + Stage */}
      <div style={{
        fontSize: band === "ks1" ? 16 : 14, fontWeight: 900,
        color: pet.color, fontFamily: t.fonts.display,
      }}>
        {pet.name}
      </div>
      <div style={{
        fontSize: 11, fontWeight: 700, color: t.colours.textMuted,
        fontFamily: t.fonts.body, marginTop: 2,
      }}>
        Stage {stageIdx + 1}: {currentStage.label}
      </div>

      {/* Evolution progress */}
      {nextStage && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: t.colours.textMuted, fontFamily: t.fonts.body }}>
              Next: {nextStage.label}
            </span>
            <span style={{ fontSize: 10, fontWeight: 800, color: pet.color, fontFamily: t.fonts.body }}>
              {progressToNext}%
            </span>
          </div>
          <div style={{
            height: 8, background: pet.colorLight, borderRadius: 4, overflow: "hidden",
            border: `1px solid ${pet.color}20`,
          }}>
            <div style={{
              width: `${progressToNext}%`, height: "100%",
              background: `linear-gradient(90deg, ${pet.color}, ${pet.color}cc)`,
              borderRadius: 4, transition: "width 0.6s ease",
              boxShadow: `0 0 8px ${pet.color}40`,
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

      {isMaxed && (
        <div style={{
          fontSize: 12, fontWeight: 900, color: pet.color,
          fontFamily: t.fonts.body, marginTop: 10,
          background: pet.colorLight, borderRadius: 8, padding: "6px 0",
        }}>
          Fully Evolved!
        </div>
      )}

      {/* Stage timeline — shows all 7 stages */}
      <div style={{
        display: "flex", justifyContent: "center", gap: 4, marginTop: 12,
        flexWrap: "wrap",
      }}>
        {pet.stages.map((s, i) => (
          <div key={i} style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 1,
            opacity: i <= stageIdx ? 1 : 0.25,
            transition: "opacity 0.3s ease",
          }}>
            <div style={{
              width: i <= stageIdx ? 10 : 8,
              height: i <= stageIdx ? 10 : 8,
              borderRadius: "50%",
              background: i <= stageIdx ? pet.color : "#e2e8f0",
              border: i === stageIdx ? `2px solid ${pet.color}` : "none",
              boxShadow: i === stageIdx ? `0 0 6px ${pet.color}60` : "none",
              transition: "all 0.3s ease",
            }} />
            <span style={{
              fontSize: 7, fontWeight: 700, color: i <= stageIdx ? pet.color : "#94a3b8",
              maxWidth: 36, textAlign: "center", lineHeight: 1.1,
            }}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
