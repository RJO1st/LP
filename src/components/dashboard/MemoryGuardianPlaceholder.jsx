"use client";

/**
 * MemoryGuardianPlaceholder — teaser card for the upcoming Memory Guardian
 * Phaser 3 mini-game. Shown to KS2+ scholars as a "coming soon" feature.
 *
 * Memory Guardian is a spaced-repetition battle game where the scholar
 * fights memory monsters by answering review questions on topics that
 * are about to decay (SM-2 schedule).
 *
 * Gated behind the `boss_battles` feature flag (same tier as Nebula Trials).
 *
 * Props:
 *   band         {string}  ks1|ks2|ks3|ks4
 *   canAccess    {boolean} true = show unlock prompt; false = greyed out
 *   dueTopics    {number}  how many topics are due for review today
 */

import React, { useState } from "react";

const PARTICLES = [
  { top: "12%", left: "8%",  size: 4, delay: 0   },
  { top: "70%", left: "15%", size: 3, delay: 400 },
  { top: "30%", left: "80%", size: 5, delay: 800 },
  { top: "55%", left: "60%", size: 3, delay: 200 },
  { top: "85%", left: "75%", size: 4, delay: 600 },
];

export default function MemoryGuardianPlaceholder({
  band = "ks2",
  canAccess = false,
  dueTopics = 0,
}) {
  const [hovered, setHovered] = useState(false);

  const isNeutralBand = band === "ks1";
  if (isNeutralBand) return null; // KS1 doesn't need this yet

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative rounded-xl border overflow-hidden transition-all duration-200 select-none"
      style={{
        background: hovered
          ? "linear-gradient(135deg, #0f172a 0%, #1e1040 60%, #0f172a 100%)"
          : "linear-gradient(135deg, #0a0f1e 0%, #150d30 60%, #0a0f1e 100%)",
        borderColor: hovered ? "rgba(139, 92, 246, 0.5)" : "rgba(139, 92, 246, 0.2)",
        boxShadow: hovered ? "0 0 24px rgba(139, 92, 246, 0.15)" : "none",
        cursor: canAccess ? "pointer" : "default",
      }}
    >
      {/* Floating particles */}
      {PARTICLES.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            top: p.top, left: p.left,
            width: p.size, height: p.size,
            background: "rgba(167, 139, 250, 0.4)",
            animation: `mg-float 3s ${p.delay}ms ease-in-out infinite alternate`,
          }}
        />
      ))}

      {/* Locked overlay */}
      {!canAccess && (
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[1px] z-10 flex items-center justify-center">
          <div className="flex flex-col items-center gap-1 text-center px-4">
            <span className="text-2xl">🔒</span>
            <p className="text-xs font-bold text-slate-300">Unlock with Scholar plan</p>
          </div>
        </div>
      )}

      <div className="p-4 relative z-0">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-xl flex-shrink-0"
              style={{ background: "rgba(139, 92, 246, 0.2)", border: "1px solid rgba(139, 92, 246, 0.4)" }}
            >
              🧠
            </div>
            <div>
              <p className="text-sm font-black text-white leading-tight">Memory Guardian</p>
              <p className="text-[10px] text-violet-400 font-bold uppercase tracking-wider">Coming soon · Phaser 3</p>
            </div>
          </div>

          {/* Coming soon badge */}
          <span
            className="text-[10px] font-black px-2 py-0.5 rounded-full"
            style={{ background: "rgba(139, 92, 246, 0.2)", color: "#c4b5fd", border: "1px solid rgba(139, 92, 246, 0.3)" }}
          >
            Phase 2
          </span>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-400 leading-relaxed mb-3">
          Battle memory monsters using spaced repetition.
          Every topic you forget summons a new creature — defeat them with correct answers to restore mastery.
        </p>

        {/* Due topics preview */}
        {dueTopics > 0 && canAccess && (
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg mb-3"
            style={{ background: "rgba(139, 92, 246, 0.15)", border: "1px solid rgba(139, 92, 246, 0.25)" }}
          >
            <span className="text-base">⚔️</span>
            <p className="text-xs font-bold text-violet-300">
              {dueTopics} topic{dueTopics !== 1 ? "s" : ""} ready for battle today
            </p>
          </div>
        )}

        {/* Feature preview pills */}
        <div className="flex flex-wrap gap-1.5">
          {["Spaced repetition", "Boss battles", "XP rewards", "Memory streaks"].map((f) => (
            <span
              key={f}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(139, 92, 246, 0.1)", color: "#a78bfa", border: "1px solid rgba(139, 92, 246, 0.2)" }}
            >
              {f}
            </span>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
          <p className="text-[10px] text-slate-500">
            Launching with Phaser 3 integration — Phase 2
          </p>
          <button
            className="text-[10px] font-bold text-violet-400 hover:text-violet-300 transition-colors"
            onClick={() => {}}
          >
            Notify me →
          </button>
        </div>
      </div>

      <style>{`
        @keyframes mg-float {
          from { transform: translateY(0) scale(1);   opacity: 0.4; }
          to   { transform: translateY(-6px) scale(1.2); opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}
