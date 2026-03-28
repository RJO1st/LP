"use client";
// ─── AnswerReaction.jsx ─────────────────────────────────────────────────────
// Lightweight feedback toast after every answered question (quests only).
//  • Correct:  brief "CORRECT!" banner with a small confetti burst
//  • Incorrect: gentle "Not quite" banner — no particles, no drama
//
// Designed to be quick, non-distracting, and age-appropriate.
//
// Props:
//   show        — boolean (true when answer submitted)
//   isCorrect   — boolean
//   correctAnswer — string (the correct option text)
//   ageBand     — "ks1" | "ks2" | "ks3" | "ks4"
//   scholarName — optional first name for personalisation
//   onDone      — () => void — called after animation plays
//   streak      — current streak count (bonus message at milestones)
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef, useState, useCallback } from "react";

// ── Band-specific theming ────────────────────────────────────────────────────
const THEMES = {
  ks1: {
    correctBg: "linear-gradient(135deg, #312e81 0%, #1e1b4b 100%)",
    incorrectBg: "linear-gradient(135deg, #44204a 0%, #1e1b4b 100%)",
    correctTitle: ["YAY!", "AMAZING!", "BRILLIANT!", "SUPER!"],
    incorrectTitle: ["Oh no!", "Nearly!", "Not quite!", "Good try!"],
    correctMsg: (name) => [`${name || "Scholar"}, you're on fire!`, "You nailed it!", "Keep going!"],
    incorrectMsg: (name, ans) => [`The answer was: ${ans}`],
    duration: 1600,
    particleCount: 8,
  },
  ks2: {
    correctBg: "linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)",
    incorrectBg: "linear-gradient(135deg, #3b1f3b 0%, #0f172a 100%)",
    correctTitle: ["CORRECT!", "NICE ONE!", "GREAT JOB!"],
    incorrectTitle: ["Not quite!", "Almost!"],
    correctMsg: (name) => [`${name || "Scholar"}, great work!`, "Onward!"],
    incorrectMsg: (name, ans) => [`Correct answer: ${ans}`],
    duration: 1400,
    particleCount: 6,
  },
  ks3: {
    correctBg: "linear-gradient(135deg, #0c2a1a 0%, #0a0f1a 100%)",
    incorrectBg: "linear-gradient(135deg, #2a0c0c 0%, #0a0f1a 100%)",
    correctTitle: ["CORRECT!", "NAILED IT!"],
    incorrectTitle: ["Incorrect", "Not this time"],
    correctMsg: (name) => ["Solid work.", "Keep that momentum."],
    incorrectMsg: (name, ans) => [`Answer: ${ans}`],
    duration: 1200,
    particleCount: 5,
  },
  ks4: {
    correctBg: "linear-gradient(135deg, #0f2027 0%, #0a0f1a 100%)",
    incorrectBg: "linear-gradient(135deg, #27100a 0%, #0a0f1a 100%)",
    correctTitle: ["CORRECT", "RIGHT"],
    incorrectTitle: ["Incorrect"],
    correctMsg: (name) => ["Strong answer."],
    incorrectMsg: (name, ans) => [`Correct answer: ${ans}`],
    duration: 1000,
    particleCount: 4,
  },
};

// ── Minimal confetti dots (correct answers only) ────────────────────────────
const COLORS = ["#fbbf24", "#f472b6", "#60a5fa", "#34d399", "#a78bfa", "#fb923c"];

function MiniConfetti({ count }) {
  const dots = useRef(
    Array.from({ length: count }, (_, i) => ({
      id: i,
      angle: (360 / count) * i + (Math.random() * 30 - 15),
      distance: 40 + Math.random() * 50,
      size: 4 + Math.random() * 4,
      delay: Math.random() * 0.15,
      color: COLORS[i % COLORS.length],
    }))
  ).current;

  return (
    <>
      {dots.map((d) => {
        const rad = (d.angle * Math.PI) / 180;
        const tx = Math.cos(rad) * d.distance;
        const ty = Math.sin(rad) * d.distance;
        return (
          <div
            key={d.id}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: d.size,
              height: d.size,
              borderRadius: "50%",
              background: d.color,
              opacity: 0,
              pointerEvents: "none",
              animation: `ar-dot 0.7s ${d.delay}s cubic-bezier(0.22, 1, 0.36, 1) forwards`,
              "--tx": `${tx}px`,
              "--ty": `${ty}px`,
            }}
          />
        );
      })}
    </>
  );
}

// ── Main AnswerReaction component ────────────────────────────────────────────
export default function AnswerReaction({
  show = false,
  isCorrect = false,
  correctAnswer = "",
  ageBand = "ks1",
  scholarName,
  onDone,
  streak = 0,
}) {
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState("enter"); // "enter" | "hold" | "exit"
  const timerRef = useRef(null);
  const theme = THEMES[ageBand] || THEMES.ks1;

  const pickRandom = useCallback((arr) => arr[Math.floor(Math.random() * arr.length)], []);

  useEffect(() => {
    if (!show) return;

    setVisible(true);
    setPhase("enter");

    // Exit phase
    const exitTimer = setTimeout(() => setPhase("exit"), theme.duration - 300);

    // Fully done
    timerRef.current = setTimeout(() => {
      setVisible(false);
      setPhase("enter");
      onDone?.();
    }, theme.duration);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(timerRef.current);
    };
  }, [show, theme.duration, onDone]);

  if (!visible) return null;

  const title = pickRandom(isCorrect ? theme.correctTitle : theme.incorrectTitle);
  const messages = isCorrect ? theme.correctMsg(scholarName) : theme.incorrectMsg(scholarName, correctAnswer);
  const message = pickRandom(messages);

  // Streak milestone bonus
  const streakMsg = isCorrect && streak > 0 && streak % 3 === 0
    ? `${streak} in a row!`
    : null;

  return (
    <>
      {/* Keyframes — minimal set */}
      <style>{`
        @keyframes ar-enter {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.85); }
          100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes ar-exit {
          0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(0.92); }
        }
        @keyframes ar-dot {
          0% { opacity: 1; transform: translate(-50%, -50%) translate(0px, 0px); }
          100% { opacity: 0; transform: translate(-50%, -50%) translate(var(--tx), var(--ty)); }
        }
      `}</style>

      {/* Centred card — no backdrop, no full-screen overlay */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 9999,
          width: "min(85vw, 300px)",
          padding: "20px 20px 16px",
          borderRadius: 16,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: isCorrect ? theme.correctBg : theme.incorrectBg,
          boxShadow: isCorrect
            ? "0 4px 32px rgba(251,191,36,0.2), 0 0 0 1px rgba(251,191,36,0.1)"
            : "0 4px 32px rgba(252,165,165,0.15), 0 0 0 1px rgba(252,165,165,0.08)",
          animation: phase === "enter"
            ? "ar-enter 0.25s ease-out forwards"
            : phase === "exit"
            ? "ar-exit 0.25s ease-in forwards"
            : "none",
          pointerEvents: "none",
          overflow: "hidden",
        }}
      >
        {/* Confetti — correct answers only, minimal count */}
        {isCorrect && <MiniConfetti count={theme.particleCount} />}

        {/* Emoji — KS1/KS2 correct only, static (no bounce) */}
        {(ageBand === "ks1" || ageBand === "ks2") && isCorrect && (
          <div style={{
            fontSize: 28,
            marginBottom: 2,
            filter: "drop-shadow(0 1px 4px rgba(0,0,0,0.2))",
          }}>
            {streak >= 5 ? "🏆" : streak >= 3 ? "🔥" : "⭐"}
          </div>
        )}

        {/* Title — clean, no bounce/shake/glow */}
        <h1
          style={{
            fontSize: "clamp(18px, 5vw, 28px)",
            fontWeight: 900,
            color: isCorrect ? "#fbbf24" : "#fca5a5",
            textAlign: "center",
            fontFamily: "'Nunito', 'DM Sans', system-ui, sans-serif",
            textShadow: isCorrect
              ? "0 0 12px rgba(251,191,36,0.25)"
              : "0 0 10px rgba(252,165,165,0.15)",
            marginBottom: 4,
            letterSpacing: isCorrect ? "0.03em" : "0",
            lineHeight: 1,
          }}
        >
          {title}
        </h1>

        {/* Message */}
        <p
          style={{
            fontSize: "clamp(11px, 2.2vw, 14px)",
            fontWeight: 700,
            color: isCorrect ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.65)",
            textAlign: "center",
            maxWidth: 260,
            lineHeight: 1.4,
            fontFamily: "'Nunito', 'DM Sans', system-ui, sans-serif",
          }}
        >
          {message}
        </p>

        {/* Streak milestone */}
        {streakMsg && (
          <div
            style={{
              marginTop: 6,
              padding: "3px 10px",
              borderRadius: 12,
              background: "rgba(251,191,36,0.12)",
              border: "1px solid rgba(251,191,36,0.25)",
              color: "#fbbf24",
              fontWeight: 900,
              fontSize: 11,
              fontFamily: "'Nunito', 'DM Sans', system-ui, sans-serif",
            }}
          >
            🔥 {streakMsg}
          </div>
        )}
      </div>
    </>
  );
}
