"use client";
// ─── CelebrationBurst.jsx ───────────────────────────────────────────────────
// GSAP-powered celebration effects for correct answers.
// Renders a burst of particles/confetti that auto-cleans up.
//
// Usage:
//   <CelebrationBurst active={isCorrect && showResult} band="ks2" />
// ────────────────────────────────────────────────────────────────────────────
import React, { useRef, useEffect, useState } from "react";
import gsap from "gsap";

// ─── BAND-THEMED PARTICLE COLORS ────────────────────────────────────────────
const BAND_PALETTES = {
  ks1: ["#fbbf24", "#a78bfa", "#38bdf8", "#34d399", "#f472b6", "#fb923c"],
  ks2: ["#6366f1", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ec4899"],
  ks3: ["#5b6abf", "#3b82f6", "#14b8a6", "#a855f7", "#f97316", "#22d3ee"],
  ks4: ["#7c3aed", "#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444"],
};

// Particle shapes
const SHAPES = ["circle", "square", "star", "diamond"];

function createParticle(index, colors) {
  const color = colors[index % colors.length];
  const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
  const size = 6 + Math.random() * 8;

  const style = {
    position: "absolute",
    width: size,
    height: size,
    left: "50%",
    top: "50%",
    pointerEvents: "none",
    zIndex: 9999,
  };

  if (shape === "circle") {
    return <div key={index} className="cel-particle" style={{ ...style, borderRadius: "50%", background: color }} />;
  }
  if (shape === "square") {
    return <div key={index} className="cel-particle" style={{ ...style, borderRadius: 2, background: color }} />;
  }
  if (shape === "diamond") {
    return <div key={index} className="cel-particle" style={{ ...style, borderRadius: 2, background: color, transform: "rotate(45deg)" }} />;
  }
  // star — use SVG
  return (
    <svg key={index} className="cel-particle" width={size} height={size} viewBox="0 0 20 20"
      style={{ ...style, overflow: "visible" }}>
      <polygon
        points="10,0 12.5,7 20,7.5 14,12.5 16,20 10,15.5 4,20 6,12.5 0,7.5 7.5,7"
        fill={color}
      />
    </svg>
  );
}

export default function CelebrationBurst({
  active = false,
  band = "ks2",
  particleCount = 24,
  intensity = "normal",  // "subtle" | "normal" | "epic"
}) {
  const containerRef = useRef(null);
  const [particles, setParticles] = useState([]);
  const tlRef = useRef(null);
  const hasPlayed = useRef(false);

  const count = intensity === "subtle" ? 12 : intensity === "epic" ? 40 : particleCount;
  const colors = BAND_PALETTES[band] || BAND_PALETTES.ks2;

  useEffect(() => {
    if (!active || hasPlayed.current) return;
    hasPlayed.current = true;

    // Generate particles
    const pts = Array.from({ length: count }, (_, i) => createParticle(i, colors));
    setParticles(pts);

    // Wait for DOM render, then animate
    const timer = setTimeout(() => {
      if (!containerRef.current) return;

      const els = containerRef.current.querySelectorAll(".cel-particle");
      if (!els.length) return;

      const tl = gsap.timeline({
        onComplete: () => {
          setParticles([]);
          hasPlayed.current = false;
        },
      });

      els.forEach((el, i) => {
        const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
        const distance = 60 + Math.random() * (intensity === "epic" ? 140 : 80);
        const dx = Math.cos(angle) * distance;
        const dy = Math.sin(angle) * distance - 20; // bias upward
        const rotation = (Math.random() - 0.5) * 720;
        const dur = 0.6 + Math.random() * 0.4;

        tl.fromTo(el,
          {
            x: 0, y: 0, scale: 0, opacity: 1, rotation: 0,
          },
          {
            x: dx,
            y: dy,
            scale: 0.8 + Math.random() * 0.6,
            opacity: 0,
            rotation,
            duration: dur,
            ease: "power2.out",
          },
          Math.random() * 0.15 // slight random stagger for organic feel
        );
      });

      tlRef.current = tl;
    }, 30);

    return () => {
      clearTimeout(timer);
      if (tlRef.current) tlRef.current.kill();
    };
  }, [active, count, colors, intensity]);

  // Reset when active becomes false
  useEffect(() => {
    if (!active) {
      hasPlayed.current = false;
    }
  }, [active]);

  if (particles.length === 0) return null;

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        overflow: "visible",
        zIndex: 9999,
      }}
      aria-hidden="true"
    >
      {particles}
    </div>
  );
}

// ─── Smaller inline star burst (for option selection) ────────────────────────
export function StarBurst({ active, color = "#10b981", size = 6 }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!active || !ref.current) return;

    const stars = ref.current.querySelectorAll(".star-p");
    if (!stars.length) return;

    const tl = gsap.timeline();
    stars.forEach((el, i) => {
      const angle = (i / 6) * Math.PI * 2;
      tl.fromTo(el,
        { x: 0, y: 0, scale: 0, opacity: 1 },
        {
          x: Math.cos(angle) * 20,
          y: Math.sin(angle) * 20,
          scale: 1,
          opacity: 0,
          duration: 0.5,
          ease: "power2.out",
        },
        i * 0.02
      );
    });

    return () => tl.kill();
  }, [active, color]);

  if (!active) return null;

  return (
    <div ref={ref} style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible" }} aria-hidden="true">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="star-p" style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: size,
          height: size,
          borderRadius: "50%",
          background: color,
        }} />
      ))}
    </div>
  );
}
