"use client";
// ─── AnswerReaction.jsx ─────────────────────────────────────────────────────
// Compact overlay that fires after every answered question (quests only).
//  • Correct:  "YAY!" + stars + confetti + encouraging message
//  • Incorrect: gentle "Oh no!" + the correct answer shown + learning nudge
//
// Renders as a centered card overlay (NOT full screen).
//
// Props:
//   show        — boolean (true when answer submitted)
//   isCorrect   — boolean
//   correctAnswer — string (the correct option text)
//   ageBand     — "ks1" | "ks2" | "ks3" | "ks4"
//   scholarName — optional first name for personalisation
//   onDone      — () => void — called after animation plays (~2.5s)
//   streak      — current streak count (bonus message at milestones)
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef, useState, useCallback } from "react";

// ── Band-specific theming ────────────────────────────────────────────────────
const THEMES = {
  ks1: {
    correctBg: "radial-gradient(ellipse at 50% 30%, #312e81 0%, #1e1b4b 70%)",
    incorrectBg: "radial-gradient(ellipse at 50% 30%, #44204a 0%, #1e1b4b 70%)",
    correctTitle: ["YAY!", "AMAZING!", "BRILLIANT!", "SUPER STAR!", "FANTASTIC!"],
    incorrectTitle: ["Oh no!", "Nearly!", "Not quite!", "Good try!"],
    correctMsg: (name) => [`${name || "Scholar"}, you're on fire!`, "You nailed it!", "Keep going, explorer!", "That was out of this world!"],
    incorrectMsg: (name, ans) => [`The answer was: ${ans}`, `Don't worry ${name || "explorer"} — every mistake helps you learn!`, "Let's remember this for next time!"],
    titleSize: "clamp(36px, 10vw, 72px)",
    messageSize: "clamp(14px, 3vw, 20px)",
    particleCount: 24,
    duration: 2800,
  },
  ks2: {
    correctBg: "radial-gradient(ellipse at 50% 30%, #1e3a5f 0%, #0f172a 70%)",
    incorrectBg: "radial-gradient(ellipse at 50% 30%, #3b1f3b 0%, #0f172a 70%)",
    correctTitle: ["CORRECT!", "NICE ONE!", "GREAT JOB!", "WELL DONE!"],
    incorrectTitle: ["Not quite!", "Almost!", "Good effort!"],
    correctMsg: (name) => [`${name || "Scholar"}, great work!`, "Your skills are growing!", "Onward to the next challenge!"],
    incorrectMsg: (name, ans) => [`The correct answer was: ${ans}`, "Every wrong answer is a step closer to mastering this!"],
    titleSize: "clamp(32px, 8vw, 60px)",
    messageSize: "clamp(13px, 2.5vw, 18px)",
    particleCount: 18,
    duration: 2200,
  },
  ks3: {
    correctBg: "radial-gradient(ellipse at 50% 30%, #0c2a1a 0%, #0a0f1a 70%)",
    incorrectBg: "radial-gradient(ellipse at 50% 30%, #2a0c0c 0%, #0a0f1a 70%)",
    correctTitle: ["CORRECT!", "NAILED IT!", "SHARP!"],
    incorrectTitle: ["Incorrect", "Not this time"],
    correctMsg: (name) => [`${name || "Scholar"}, solid work!`, "Keep that momentum going."],
    incorrectMsg: (name, ans) => [`Answer: ${ans}`, "Review this topic to strengthen your understanding."],
    titleSize: "clamp(28px, 7vw, 52px)",
    messageSize: "clamp(12px, 2.2vw, 16px)",
    particleCount: 14,
    duration: 1800,
  },
  ks4: {
    correctBg: "radial-gradient(ellipse at 50% 30%, #0f2027 0%, #0a0f1a 70%)",
    incorrectBg: "radial-gradient(ellipse at 50% 30%, #27100a 0%, #0a0f1a 70%)",
    correctTitle: ["CORRECT", "WELL DONE", "RIGHT"],
    incorrectTitle: ["Incorrect", "Wrong answer"],
    correctMsg: (name) => ["Strong answer.", "Keep pushing forward."],
    incorrectMsg: (name, ans) => [`Correct answer: ${ans}`, "Flag this topic for revision."],
    titleSize: "clamp(26px, 6vw, 48px)",
    messageSize: "clamp(12px, 2vw, 15px)",
    particleCount: 10,
    duration: 1600,
  },
};

// ── Star / particle shapes ──────────────────────────────────────────────────
function StarSVG({ size = 20, color = "#fbbf24" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M12 2l2.4 7.2H22l-6 4.8 2.4 7.2L12 16.4l-6 4.8 2.4-7.2-6-4.8h7.6z" />
    </svg>
  );
}

function HeartSVG({ size = 18, color = "#f472b6" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}

// ── Particle explosion ──────────────────────────────────────────────────────
function Particles({ count, isCorrect }) {
  const particles = useRef(
    Array.from({ length: count }, (_, i) => ({
      id: i,
      angle: (360 / count) * i + Math.random() * 20 - 10,
      distance: 80 + Math.random() * 120,
      size: isCorrect ? 12 + Math.random() * 16 : 8 + Math.random() * 10,
      delay: Math.random() * 0.3,
      rotation: Math.random() * 360,
      type: isCorrect
        ? (Math.random() > 0.4 ? "star" : Math.random() > 0.5 ? "heart" : "circle")
        : "circle",
      color: isCorrect
        ? ["#fbbf24", "#f472b6", "#60a5fa", "#a78bfa", "#34d399", "#fb923c"][i % 6]
        : ["#94a3b8", "#64748b", "#a78bfa"][i % 3],
    }))
  ).current;

  return (
    <>
      {particles.map((p) => {
        const rad = (p.angle * Math.PI) / 180;
        const tx = Math.cos(rad) * p.distance;
        const ty = Math.sin(rad) * p.distance;

        return (
          <div
            key={p.id}
            style={{
              position: "absolute",
              left: "50%",
              top: "45%",
              transform: "translate(-50%, -50%)",
              animation: `reaction-particle ${isCorrect ? 1.2 : 0.8}s ${p.delay}s cubic-bezier(0.22, 1, 0.36, 1) forwards`,
              "--tx": `${tx}px`,
              "--ty": `${ty}px`,
              "--rot": `${p.rotation}deg`,
              opacity: 0,
            }}
          >
            {p.type === "star" ? (
              <StarSVG size={p.size} color={p.color} />
            ) : p.type === "heart" ? (
              <HeartSVG size={p.size} color={p.color} />
            ) : (
              <div
                style={{
                  width: p.size,
                  height: p.size,
                  borderRadius: "50%",
                  background: p.color,
                }}
              />
            )}
          </div>
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

    // Hold phase
    const holdTimer = setTimeout(() => setPhase("hold"), 200);

    // Exit phase
    const exitTimer = setTimeout(() => {
      setPhase("exit");
    }, theme.duration - 400);

    // Fully done
    timerRef.current = setTimeout(() => {
      setVisible(false);
      setPhase("enter");
      onDone?.();
    }, theme.duration);

    return () => {
      clearTimeout(holdTimer);
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
      {/* Keyframes injected once */}
      <style>{`
        @keyframes reaction-enter {
          0% { opacity: 0; transform: scale(0.5); }
          60% { opacity: 1; transform: scale(1.08); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes reaction-exit {
          0% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.9); }
        }
        @keyframes reaction-particle {
          0% { opacity: 1; transform: translate(-50%, -50%) translate(0px, 0px) rotate(0deg); }
          100% { opacity: 0; transform: translate(-50%, -50%) translate(var(--tx), var(--ty)) rotate(var(--rot)); }
        }
        @keyframes reaction-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes reaction-shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        @keyframes reaction-glow-pulse {
          0%, 100% { box-shadow: 0 0 40px rgba(251,191,36,0.15); }
          50% { box-shadow: 0 0 80px rgba(251,191,36,0.35); }
        }
        @keyframes reaction-ring {
          0% { transform: translate(-50%, -50%) scale(0.3); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(2.5); opacity: 0; }
        }
      `}</style>

      {/* Semi-transparent backdrop — click-through */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9998,
          background: "rgba(0,0,0,0.35)",
          pointerEvents: "none",
          animation: phase === "enter"
            ? "reaction-enter 0.3s ease-out forwards"
            : phase === "exit"
            ? "reaction-exit 0.25s ease-in forwards"
            : "none",
        }}
      />

      {/* Compact centred card overlay */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 9999,
          width: "min(90vw, 340px)",
          padding: "28px 24px 24px",
          borderRadius: 24,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: isCorrect ? theme.correctBg : theme.incorrectBg,
          boxShadow: isCorrect
            ? "0 8px 48px rgba(251,191,36,0.25), 0 0 0 2px rgba(251,191,36,0.15)"
            : "0 8px 48px rgba(252,165,165,0.2), 0 0 0 2px rgba(252,165,165,0.1)",
          animation: phase === "enter"
            ? "reaction-enter 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards"
            : phase === "exit"
            ? "reaction-exit 0.35s ease-in forwards"
            : "none",
          pointerEvents: "none",
          overflow: "hidden",
        }}
      >
        {/* Particles — scoped inside the card */}
        <Particles count={Math.min(theme.particleCount, 14)} isCorrect={isCorrect} />

        {/* Emoji (KS1/KS2 correct only) — no bounce, stays centered */}
        {(ageBand === "ks1" || ageBand === "ks2") && isCorrect && (
          <div style={{
            fontSize: 40,
            filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.3))",
            marginBottom: 4,
          }}>
            {streak >= 5 ? "🏆" : streak >= 3 ? "🔥" : "⭐"}
          </div>
        )}

        {/* Title — no bounce/shake, just a subtle glow pulse */}
        <h1
          style={{
            fontSize: "clamp(22px, 6vw, 36px)",
            fontWeight: 900,
            color: isCorrect ? "#fbbf24" : "#fca5a5",
            textAlign: "center",
            fontFamily: "'Nunito', 'DM Sans', system-ui, sans-serif",
            textShadow: isCorrect
              ? "0 0 24px rgba(251,191,36,0.35), 0 1px 4px rgba(0,0,0,0.2)"
              : "0 0 20px rgba(252,165,165,0.25), 0 1px 4px rgba(0,0,0,0.2)",
            marginBottom: 6,
            letterSpacing: isCorrect ? "0.03em" : "0",
            lineHeight: 1,
          }}
        >
          {title}
        </h1>

        {/* Message */}
        <p
          style={{
            fontSize: "clamp(12px, 2.5vw, 15px)",
            fontWeight: 700,
            color: isCorrect ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.7)",
            textAlign: "center",
            maxWidth: 280,
            lineHeight: 1.5,
            fontFamily: "'Nunito', 'DM Sans', system-ui, sans-serif",
            textShadow: "0 1px 3px rgba(0,0,0,0.15)",
          }}
        >
          {message}
        </p>

        {/* Streak milestone */}
        {streakMsg && (
          <div
            style={{
              marginTop: 8,
              padding: "4px 14px",
              borderRadius: 16,
              background: "rgba(251,191,36,0.15)",
              border: "1.5px solid rgba(251,191,36,0.3)",
              color: "#fbbf24",
              fontWeight: 900,
              fontSize: 12,
              fontFamily: "'Nunito', 'DM Sans', system-ui, sans-serif",
              boxShadow: "0 0 16px rgba(251,191,36,0.2)",
            }}
          >
            🔥 {streakMsg}
          </div>
        )}

        {/* Incorrect: show correct answer */}
        {!isCorrect && correctAnswer && (
          <div
            style={{
              marginTop: 14,
              padding: "8px 16px",
              borderRadius: 12,
              background: "rgba(34,197,94,0.08)",
              border: "1.5px solid rgba(34,197,94,0.25)",
              textAlign: "center",
              width: "100%",
            }}
          >
            <p style={{
              fontSize: 9,
              fontWeight: 700,
              color: "rgba(255,255,255,0.5)",
              marginBottom: 3,
              fontFamily: "'Nunito', 'DM Sans', system-ui, sans-serif",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}>
              The correct answer is
            </p>
            <p style={{
              fontSize: "clamp(14px, 3.5vw, 22px)",
              fontWeight: 900,
              color: "#4ade80",
              fontFamily: "'Nunito', 'DM Sans', system-ui, sans-serif",
              textShadow: "0 0 12px rgba(74,222,128,0.25)",
            }}>
              {correctAnswer}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
