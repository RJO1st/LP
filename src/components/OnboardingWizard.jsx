// ─── Deploy to: src/components/OnboardingWizard.jsx ──────────────────────────
// Shows ONCE for new scholars (no quest_sessions yet).
// Flow: Welcome → Avatar pick → 3 easy warm-up questions → Celebration
// After completion, sets localStorage flag so it never shows again.
"use client";
import { useState, useEffect, useCallback } from "react";

const WELCOME_MESSAGES = {
  uk_11plus:    "Welcome to LaunchPard Academy, Space Cadet! Your mission: master the galaxy of knowledge.",
  uk_national:  "Welcome aboard, explorer! Every mission you complete makes you smarter and stronger.",
  ng_primary:   "Welcome, young scholar! Your learning adventure begins now.",
  ng_jss:       "Welcome to LaunchPard! Every question brings you closer to mastery.",
  ng_sss:       "Welcome, future leader! Prepare for greatness — one mission at a time.",
  ca_primary:   "Welcome to LaunchPard, eh! Your learning journey starts here.",
  default:      "Welcome to LaunchPard! Ready for your first mission?",
};

// 3 easy warm-up questions (no DB needed, pure client-side)
const WARM_UP_QUESTIONS = {
  mathematics: [
    { q: "What is 2 + 3?", opts: ["4", "5", "6", "3"], a: 1 },
    { q: "What is 10 - 4?", opts: ["5", "7", "6", "8"], a: 2 },
    { q: "How many sides does a triangle have?", opts: ["4", "2", "3", "5"], a: 2 },
  ],
  english: [
    { q: "Which word is a noun?", opts: ["Run", "Happy", "Dog", "Quickly"], a: 2 },
    { q: "What is the opposite of 'hot'?", opts: ["Warm", "Cold", "Wet", "Dry"], a: 1 },
    { q: "Which sentence is correct?", opts: ["She go to school.", "She goes to school.", "She going to school.", "She goed to school."], a: 1 },
  ],
  default: [
    { q: "What is 1 + 1?", opts: ["1", "2", "3", "0"], a: 1 },
    { q: "What colour is the sky on a clear day?", opts: ["Green", "Red", "Blue", "Yellow"], a: 2 },
    { q: "How many legs does a dog have?", opts: ["2", "6", "4", "8"], a: 2 },
  ],
};

function StarBurst() {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {Array.from({ length: 20 }, (_, i) => (
        <div key={i} style={{
          position: "absolute",
          left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
          width: 2 + Math.random() * 3, height: 2 + Math.random() * 3,
          background: "white", borderRadius: "50%",
          opacity: 0.3 + Math.random() * 0.4,
        }} />
      ))}
    </div>
  );
}

export default function OnboardingWizard({ scholar, supabase, onComplete }) {
  const [step, setStep] = useState("welcome"); // welcome | avatar | quiz | celebrate
  const [selectedAvatar, setSelectedAvatar] = useState(scholar?.avatar_url || null);
  const [quizIdx, setQuizIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(null); // null | { selected, correct }
  const [xpEarned, setXpEarned] = useState(0);

  const curriculum = scholar?.curriculum || "default";
  const welcomeMsg = WELCOME_MESSAGES[curriculum] || WELCOME_MESSAGES.default;
  const subject = scholar?.subjects?.[0] || "default";
  const questions = WARM_UP_QUESTIONS[subject] || WARM_UP_QUESTIONS.default;

  // Avatar choices — maps to the avatar.base field the dashboard reads
  const AVATAR_CHOICES = [
    { base: "astronaut",  emoji: "👨‍🚀", bg: "🌌", label: "Astronaut" },
    { base: "explorer",   emoji: "👩‍🚀", bg: "🪐", label: "Explorer" },
    { base: "hero",       emoji: "🦸",  bg: "🔥", label: "Hero" },
    { base: "wizard",     emoji: "🧙",  bg: "🌌", label: "Wizard" },
    { base: "fox",        emoji: "🦊",  bg: "🪐", label: "Fox" },
    { base: "cat",        emoji: "🐱",  bg: "🌌", label: "Cat" },
    { base: "robot",      emoji: "🤖",  bg: "🔥", label: "Robot" },
    { base: "unicorn",    emoji: "🦄",  bg: "🪐", label: "Unicorn" },
  ];

  const handleAnswer = useCallback((idx) => {
    if (answered) return;
    const correct = idx === questions[quizIdx].a;
    setAnswered({ selected: idx, correct });
    if (correct) {
      setScore(s => s + 1);
      setXpEarned(x => x + 10);
    }
    setTimeout(() => {
      if (quizIdx < questions.length - 1) {
        setQuizIdx(i => i + 1);
        setAnswered(null);
      } else {
        setStep("celebrate");
      }
    }, 1200);
  }, [answered, quizIdx, questions]);

  const handleAvatarSelect = async (choice) => {
    setSelectedAvatar(choice.base);
    if (supabase && scholar?.id) {
      // Save as the avatar JSON object the dashboard expects
      await supabase.from("scholars").update({ 
        avatar: { base: choice.base, background: choice.bg } 
      }).eq("id", scholar.id);
    }
  };

  const handleFinish = () => {
    try { localStorage.setItem(`lp_onboarded_${scholar?.id}`, "true"); } catch {}
    onComplete?.();
  };

  // ── WELCOME ────────────────────────────────────────────────────────────
  if (step === "welcome") return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center",
      justifyContent: "center", background: "rgba(15,14,26,0.97)", padding: 16,
    }}>
      <StarBurst />
      <div style={{
        position: "relative", zIndex: 1, maxWidth: 400, width: "100%", textAlign: "center",
        background: "linear-gradient(135deg, #1a1730, #0f0e1a)", borderRadius: 24,
        border: "1.5px solid rgba(99,102,241,0.3)", padding: "40px 32px",
      }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🚀</div>
        <h1 style={{ color: "white", fontSize: 24, fontWeight: 900, margin: "0 0 12px" }}>
          Hello, {scholar?.name || "Explorer"}!
        </h1>
        <p style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.6, margin: "0 0 24px" }}>
          {welcomeMsg}
        </p>
        <button onClick={() => setStep("avatar")} style={{
          width: "100%", padding: "14px 0", borderRadius: 16, border: "none",
          background: "linear-gradient(135deg, #6366f1, #7c3aed)", color: "white",
          fontWeight: 800, fontSize: 16, cursor: "pointer",
        }}>
          Let's go!
        </button>
      </div>
    </div>
  );

  // ── AVATAR SELECT ──────────────────────────────────────────────────────
  if (step === "avatar") return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center",
      justifyContent: "center", background: "rgba(15,14,26,0.97)", padding: 16,
    }}>
      <StarBurst />
      <div style={{
        position: "relative", zIndex: 1, maxWidth: 400, width: "100%", textAlign: "center",
        background: "linear-gradient(135deg, #1a1730, #0f0e1a)", borderRadius: 24,
        border: "1.5px solid rgba(99,102,241,0.3)", padding: "32px 24px",
      }}>
        <h2 style={{ color: "white", fontSize: 20, fontWeight: 800, margin: "0 0 8px" }}>
          Choose your avatar
        </h2>
        <p style={{ color: "#94a3b8", fontSize: 13, margin: "0 0 20px" }}>
          Pick a character for your space journey
        </p>
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24,
        }}>
          {AVATAR_CHOICES.map((av, i) => (
            <button key={i} onClick={() => handleAvatarSelect(av)}
              style={{
                width: "100%", aspectRatio: "1", borderRadius: 16, border: "2px solid",
                borderColor: selectedAvatar === av.base ? "#6366f1" : "rgba(255,255,255,0.1)",
                background: selectedAvatar === av.base ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.05)",
                fontSize: 32, cursor: "pointer", display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 4, transition: "all 0.2s",
              }}>
              <span>{av.emoji}</span>
              <span style={{ fontSize: 10, color: selectedAvatar === av.base ? "#a5b4fc" : "#64748b", fontWeight: 700 }}>{av.label}</span>
            </button>
          ))}
        </div>
        <button onClick={() => setStep("quiz")} style={{
          width: "100%", padding: "14px 0", borderRadius: 16, border: "none",
          background: "linear-gradient(135deg, #6366f1, #7c3aed)", color: "white",
          fontWeight: 800, fontSize: 16, cursor: "pointer",
          opacity: selectedAvatar ? 1 : 0.4, pointerEvents: selectedAvatar ? "auto" : "none",
        }}>
          Start first mission
        </button>
      </div>
    </div>
  );

  // ── WARM-UP QUIZ ───────────────────────────────────────────────────────
  if (step === "quiz") {
    const q = questions[quizIdx];
    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center",
        justifyContent: "center", background: "rgba(15,14,26,0.97)", padding: 16,
      }}>
        <StarBurst />
        <div style={{
          position: "relative", zIndex: 1, maxWidth: 440, width: "100%",
          background: "linear-gradient(135deg, #1a1730, #0f0e1a)", borderRadius: 24,
          border: "1.5px solid rgba(99,102,241,0.3)", padding: "32px 24px",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
            <span style={{ color: "#6366f1", fontSize: 12, fontWeight: 800 }}>
              WARM-UP · QUESTION {quizIdx + 1} OF {questions.length}
            </span>
            <span style={{ color: "#f59e0b", fontSize: 12, fontWeight: 800 }}>
              {xpEarned} XP
            </span>
          </div>

          <h2 style={{ color: "white", fontSize: 18, fontWeight: 700, margin: "0 0 20px", lineHeight: 1.4 }}>
            {q.q}
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {q.opts.map((opt, i) => {
              let bg = "rgba(255,255,255,0.06)";
              let border = "1px solid rgba(255,255,255,0.1)";
              let color = "white";
              if (answered) {
                if (i === q.a) { bg = "rgba(34,197,94,0.2)"; border = "2px solid #22c55e"; }
                else if (i === answered.selected && !answered.correct) { bg = "rgba(239,68,68,0.2)"; border = "2px solid #ef4444"; }
                else { color = "#64748b"; }
              }
              return (
                <button key={i} onClick={() => handleAnswer(i)} style={{
                  padding: "14px 16px", borderRadius: 14, border, background: bg,
                  color, fontSize: 15, fontWeight: 600, textAlign: "left", cursor: answered ? "default" : "pointer",
                  transition: "all 0.2s",
                }}>
                  <span style={{
                    display: "inline-flex", width: 28, height: 28, borderRadius: "50%",
                    alignItems: "center", justifyContent: "center", marginRight: 10,
                    background: "rgba(99,102,241,0.2)", fontSize: 13, fontWeight: 800,
                  }}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  {opt}
                </button>
              );
            })}
          </div>

          {answered && (
            <div style={{
              marginTop: 16, padding: "12px 16px", borderRadius: 12, textAlign: "center",
              background: answered.correct ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
              color: answered.correct ? "#22c55e" : "#ef4444", fontWeight: 700, fontSize: 14,
            }}>
              {answered.correct ? "Brilliant! +10 XP" : `The answer is ${String.fromCharCode(65 + q.a)}. Keep going!`}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── CELEBRATION ────────────────────────────────────────────────────────
  if (step === "celebrate") return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center",
      justifyContent: "center", background: "rgba(15,14,26,0.97)", padding: 16,
    }}>
      <StarBurst />
      <div style={{
        position: "relative", zIndex: 1, maxWidth: 400, width: "100%", textAlign: "center",
        background: "linear-gradient(135deg, #1a1730, #0f0e1a)", borderRadius: 24,
        border: "1.5px solid rgba(34,197,94,0.4)", padding: "40px 32px",
      }}>
        <div style={{ fontSize: 64, marginBottom: 12 }}>🏆</div>
        <h1 style={{ color: "white", fontSize: 24, fontWeight: 900, margin: "0 0 8px" }}>
          First mission complete!
        </h1>
        <p style={{ color: "#94a3b8", fontSize: 14, margin: "0 0 24px" }}>
          {score}/{questions.length} correct · {xpEarned} XP earned
        </p>

        <div style={{
          display: "flex", gap: 12, justifyContent: "center", marginBottom: 24,
        }}>
          {[
            { label: "Score", value: `${score}/${questions.length}`, color: "#6366f1" },
            { label: "XP", value: xpEarned, color: "#f59e0b" },
            { label: "Rank", value: "Space Cadet", color: "#22c55e" },
          ].map((s, i) => (
            <div key={i} style={{
              background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: "12px 16px",
              flex: 1,
            }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>{s.label}</div>
            </div>
          ))}
        </div>

        <p style={{ color: "#94a3b8", fontSize: 13, margin: "0 0 20px" }}>
          Come back tomorrow for your next mission. Every session makes you stronger!
        </p>

        <button onClick={handleFinish} style={{
          width: "100%", padding: "14px 0", borderRadius: 16, border: "none",
          background: "linear-gradient(135deg, #22c55e, #16a34a)", color: "white",
          fontWeight: 800, fontSize: 16, cursor: "pointer",
        }}>
          Go to Mission Control
        </button>
      </div>
    </div>
  );

  return null;
}