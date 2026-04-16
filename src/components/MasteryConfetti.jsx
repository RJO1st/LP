"use client";

/**
 * MasteryConfetti — fires a burst of confetti when a scholar masters a topic.
 *
 * Usage:
 *   <MasteryConfetti trigger={justMastered} topicName="Fractions" onComplete={() => {}} />
 *
 * Props:
 *   trigger     {boolean}   - set true to fire; component auto-resets after animation
 *   topicName   {string}    - shown in the celebration label
 *   onComplete  {function}  - called after celebration finishes (~3 s)
 */

import React, { useEffect, useRef, useState } from "react";

// Confetti particle colours — space theme (no rainbow per project rules)
const COLOURS = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#a78bfa", // light violet
  "#34d399", // emerald
  "#fbbf24", // amber
  "#f472b6", // pink
  "#38bdf8", // sky
  "#e2e8f0", // white-ish
];

function randomBetween(a, b) {
  return a + Math.random() * (b - a);
}

function createParticles(count = 80) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: randomBetween(10, 90),      // % from left
    delay: randomBetween(0, 400),  // ms
    duration: randomBetween(1800, 3000),
    colour: COLOURS[Math.floor(Math.random() * COLOURS.length)],
    size: randomBetween(6, 12),
    rotation: randomBetween(0, 360),
    dx: randomBetween(-40, 40),    // horizontal drift px
    shape: Math.random() > 0.5 ? "rect" : "circle",
  }));
}

export default function MasteryConfetti({ trigger, topicName = "", onComplete }) {
  const [particles, setParticles] = useState([]);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!trigger) return;

    setParticles(createParticles(90));
    setVisible(true);

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setVisible(false);
      setParticles([]);
      onComplete?.();
    }, 3200);

    return () => clearTimeout(timerRef.current);
  }, [trigger]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!visible) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-0 z-[9000] overflow-hidden"
    >
      {/* Celebration label */}
      <div
        className="absolute left-1/2 top-[18%] -translate-x-1/2 text-center animate-bounce-in"
        style={{ animation: "lp-pop 0.4s cubic-bezier(.36,.07,.19,.97) both" }}
      >
        <div className="bg-indigo-900/90 border border-indigo-400/40 rounded-2xl px-6 py-4 shadow-2xl backdrop-blur-sm">
          <div className="text-4xl mb-1">⭐</div>
          <p className="text-white font-black text-lg leading-tight">Topic Mastered!</p>
          {topicName && (
            <p className="text-indigo-300 text-sm mt-0.5 font-semibold">{topicName}</p>
          )}
        </div>
      </div>

      {/* Particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            left: `${p.x}%`,
            top: "-20px",
            width: p.shape === "rect" ? p.size : p.size,
            height: p.shape === "rect" ? p.size * 0.5 : p.size,
            borderRadius: p.shape === "circle" ? "50%" : "2px",
            backgroundColor: p.colour,
            animation: `lp-fall ${p.duration}ms ${p.delay}ms ease-in both`,
            transform: `rotate(${p.rotation}deg)`,
            opacity: 0.9,
          }}
        />
      ))}

      <style>{`
        @keyframes lp-fall {
          0%   { transform: translateY(0)      rotate(0deg)   translateX(0);    opacity: 1; }
          60%  { opacity: 0.9; }
          100% { transform: translateY(110vh)  rotate(720deg) translateX(var(--dx, 0px)); opacity: 0; }
        }
        @keyframes lp-pop {
          0%   { transform: translate(-50%, 0) scale(0.3); opacity: 0; }
          60%  { transform: translate(-50%, 0) scale(1.1); opacity: 1; }
          100% { transform: translate(-50%, 0) scale(1);   opacity: 1; }
        }
      `}</style>
    </div>
  );
}

/**
 * useMasteryConfetti — hook to track mastery changes and trigger confetti.
 *
 * @param {Array} topics - array of { topic, p_mastery }
 * @returns { confettiTopic, clearConfetti }
 */
export function useMasteryConfetti(topics = []) {
  const prevRef = useRef({});
  const [confettiTopic, setConfettiTopic] = useState(null);

  useEffect(() => {
    if (!topics || topics.length === 0) return;

    for (const t of topics) {
      const key = t.topic || t.slug;
      const prev = prevRef.current[key];
      const curr = t.p_mastery ?? 0;

      // Just crossed 0.8 threshold for the first time this session
      if (prev !== undefined && prev < 0.8 && curr >= 0.8) {
        setConfettiTopic(t.topic_display || t.topic || key);
        break;
      }
      prevRef.current[key] = curr;
    }

    // Initialise on first load without triggering confetti
    if (Object.keys(prevRef.current).length === 0) {
      for (const t of topics) {
        prevRef.current[t.topic || t.slug] = t.p_mastery ?? 0;
      }
    }
  }, [topics]);

  const clearConfetti = () => setConfettiTopic(null);

  return { confettiTopic, clearConfetti };
}
