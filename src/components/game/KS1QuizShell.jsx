"use client";
/**
 * KS1QuizShell.jsx — v2 Soft HUD Edition
 * Deploy to: src/components/game/KS1QuizShell.jsx
 *
 * Celestial Nursery — soft glowing adventure quiz for ages 5-7
 * Warm purple-blue with gold/amber glowing borders, rounded corners,
 * gentle pulsing stars, kid-friendly large text and tap targets.
 * Softer, friendlier take on the HUD aesthetic.
 */

import React, { useState } from "react";
import StepByStepTimeline, { parseExplanationSteps } from "./StepByStepTimeline";
import useStaggerEntrance from "../../hooks/useStaggerEntrance";

const N = { fontFamily: "'Nunito', 'Comic Sans MS', sans-serif" };
const OPTION_ICONS = ["🌟", "🪐", "🌙", "⭐"];
const GOLD = "#fbbf24";
const GOLD_DIM = "rgba(251,191,36,0.08)";
const PURPLE = "#a78bfa";
const OPTION_COLORS = [
  { bg: "rgba(251,191,36,0.1)", border: "#fbbf24", glow: "rgba(251,191,36,0.2)" },
  { bg: "rgba(168,85,247,0.1)", border: "#a855f7", glow: "rgba(168,85,247,0.2)" },
  { bg: "rgba(56,189,248,0.1)", border: "#38bdf8", glow: "rgba(56,189,248,0.2)" },
  { bg: "rgba(52,211,153,0.1)", border: "#34d399", glow: "rgba(52,211,153,0.2)" },
];

/* ── Helpers — explanation parsing + TTS (KS1-friendly) ───── */

/** Get the primary "why" sentence(s) from an AI-generated explanation. */
function getPrimaryExplanation(explanation) {
  if (!explanation || typeof explanation !== "string") return "";
  const sentences = explanation.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length === 0) return explanation.trim();
  // First 1–2 sentences as the main "why"
  return sentences.slice(0, 2).join(" ").trim();
}

/** Find sentences in the explanation that reference a specific option's text. */
function findRationaleForOption(explanation, optText) {
  if (!explanation || typeof explanation !== "string") return null;
  const optString = typeof optText === "string" ? optText : (optText?.text || String(optText || ""));
  if (!optString || optString.length < 1) return null;

  const sentences = explanation.split(/(?<=[.!?])\s+/).filter(Boolean);
  const needle = optString.toLowerCase().trim().slice(0, 30);
  if (!needle) return null;

  // Exact-ish match first
  const exact = sentences.filter((s) => s.toLowerCase().includes(needle));
  if (exact.length > 0) return exact.join(" ").trim();

  // Word-level match for short options (e.g. "cat", "7")
  if (needle.length <= 4) {
    const wordRe = new RegExp(`\\b${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    const wordMatch = sentences.filter((s) => wordRe.test(s));
    if (wordMatch.length > 0) return wordMatch.join(" ").trim();
  }
  return null;
}

/** Speak text aloud using Web Speech API with a friendly voice. */
function speakText(text) {
  if (typeof window === "undefined" || !window.speechSynthesis || !text) return;
  try {
    window.speechSynthesis.cancel();
    const utter = new window.SpeechSynthesisUtterance(String(text));
    utter.rate = 0.85;   // Slower for young children
    utter.pitch = 1.1;   // Slightly higher, friendlier tone
    utter.volume = 1.0;

    const voices = window.speechSynthesis.getVoices() || [];
    const preferred =
      voices.find((v) => /female|samantha|karen|tessa|serena/i.test(v.name)) ||
      voices.find((v) => /en[-_]GB/i.test(v.lang)) ||
      voices.find((v) => /^en/i.test(v.lang));
    if (preferred) utter.voice = preferred;

    window.speechSynthesis.speak(utter);
  } catch (e) {
    // Silent fail — TTS is a bonus, not required
  }
}

/* ── Collapsible per-distractor explanation cards ───── */
function DistractorExplanations({ options, correctIndex, explanation, isCorrect }) {
  const [expanded, setExpanded] = useState(false);

  if (correctIndex == null || !Array.isArray(options)) return null;

  const distractors = options
    .map((opt, i) => ({ opt, i }))
    .filter(({ i }) => i !== correctIndex);

  if (distractors.length === 0) return null;

  const headerLabel = isCorrect
    ? "🤔 What about the other answers?"
    : "🤔 Why were the others wrong?";

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        style={{
          width: "100%",
          padding: "10px 14px",
          borderRadius: 12,
          background: "rgba(168,85,247,0.08)",
          border: "1.5px solid rgba(168,85,247,0.25)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontWeight: 900,
          fontSize: 13,
          color: "#c4b5fd",
          ...N,
        }}
      >
        <span>{headerLabel}</span>
        <span
          style={{
            fontSize: 14,
            display: "inline-block",
            transition: "transform 0.2s",
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          ▼
        </span>
      </button>

      {expanded && (
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
          {distractors.map(({ opt, i }) => {
            const optText = typeof opt === "string" ? opt : (opt?.text || String(opt || ""));
            const icon = OPTION_ICONS[i] || "•";
            const rationale =
              findRationaleForOption(explanation, opt) ||
              "This one was not quite right for this question. Try again next time!";
            return (
              <div
                key={`distractor-${i}`}
                style={{
                  padding: 12,
                  borderRadius: 12,
                  background: "rgba(239,68,68,0.04)",
                  border: "1px solid rgba(239,68,68,0.18)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    marginBottom: 6,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 18 }}>{icon}</span>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 900,
                        color: "#fca5a5",
                        ...N,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {optText}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      speakText(`${optText}. ${rationale}`);
                    }}
                    aria-label={`Read explanation for ${optText} aloud`}
                    style={{
                      borderRadius: 8,
                      padding: "4px 10px",
                      background: "rgba(239,68,68,0.12)",
                      border: "1px solid rgba(239,68,68,0.3)",
                      cursor: "pointer",
                      fontSize: 13,
                      color: "#fca5a5",
                      flexShrink: 0,
                      ...N,
                    }}
                  >
                    🔊
                  </button>
                </div>
                <p
                  style={{
                    fontSize: 12,
                    color: "rgba(255,255,255,0.75)",
                    lineHeight: 1.5,
                    fontWeight: 600,
                    margin: 0,
                    ...N,
                  }}
                >
                  {rationale}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Soft glowing frame for cards ───── */
function GlowFrame({ children, color = GOLD, intensity = 0.15, style = {} }) {
  return (
    <div style={{
      position: "relative",
      borderRadius: 20,
      border: `1.5px solid ${color}25`,
      boxShadow: `0 0 20px ${color}${Math.round(intensity * 255).toString(16).padStart(2, "0")}, inset 0 1px 0 ${color}10`,
      ...style,
    }}>
      {children}
    </div>
  );
}

/* ── Animated star sparkle ───── */
function Sparkles() {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1, overflow: "hidden" }}>
      {[...Array(12)].map((_, i) => (
        <div key={i} style={{
          position: "absolute",
          left: `${10 + (i * 7.3 % 80)}%`,
          top: `${5 + (i * 13.7 % 85)}%`,
          width: 3 + (i % 3),
          height: 3 + (i % 3),
          borderRadius: "50%",
          background: i % 3 === 0 ? GOLD : i % 3 === 1 ? PURPLE : "#38bdf8",
          opacity: 0.15 + (i % 5) * 0.08,
          animation: `ks1-sparkle ${2 + (i % 4) * 0.7}s ease-in-out infinite`,
          animationDelay: `${(i % 8) * 0.3}s`,
        }} />
      ))}
    </div>
  );
}

export default function KS1QuizShell({
  question, options = [], passage, questionIndex = 0, totalQuestions = 10,
  selectedAnswer, onSelect, onSubmit, onSkip, onClose,
  subjectLabel = "Science", xp = 0, timeLeft, streak = 0,
  taraHint, isCorrect, showResult, explanation, missionTitle,
  leftPanelContent, taraEIBWidget, canProceed, correctIndex,
}) {
  const [showTaraHelp, setShowTaraHelp] = useState(false);
  const optionsRef = useStaggerEntrance(".ks1-option", [questionIndex]);

  const formatTime = (s) => {
    if (!s && s !== 0) return "";
    const m = Math.floor(s / 60); const sec = s % 60;
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  const progress = totalQuestions > 0 ? ((questionIndex) / totalQuestions) * 100 : 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4" style={{
      background: "rgba(12,8,32,0.96)", backdropFilter: "blur(14px)",
    }}>

    <div className="w-full flex flex-col overflow-hidden shadow-2xl" style={{
      maxWidth: "920px", maxHeight: "90vh",
      background: "linear-gradient(170deg, #1a1050 0%, #251668 30%, #1e1260 60%, #150e48 100%)",
      borderRadius: 24,
      border: `1.5px solid ${GOLD}15`,
      boxShadow: `0 0 50px rgba(251,191,36,0.06), 0 0 100px rgba(168,85,247,0.04)`,
      position: "relative",
    }}>
      <Sparkles />

      {/* ═══ TOP NAV — warm & magical ═══════════════════════════════ */}
      <header className="flex items-center justify-between px-3 md:px-6 py-2 shrink-0" style={{
        background: `linear-gradient(90deg, ${GOLD}06, rgba(26,16,80,0.9), ${GOLD}06)`,
        borderBottom: `1px solid ${GOLD}12`,
        position: "relative", zIndex: 3,
      }}>
        {/* Brand + progress inline */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="shrink-0" style={{
            width: 30, height: 30, borderRadius: 10,
            background: `${GOLD}12`, border: `1.5px solid ${GOLD}20`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 15, boxShadow: `0 0 12px ${GOLD}15`,
          }}>✨</div>
          <div className="min-w-0">
            <div className="truncate" style={{ fontSize: 12, fontWeight: 900, color: GOLD, ...N }}>Celestial Nursery</div>
            <div style={{ fontSize: 10, color: `${GOLD}90`, fontWeight: 700, ...N }}>
              Mission {questionIndex + 1} of {totalQuestions}
            </div>
          </div>
        </div>

        {/* Compact progress bar — hidden on very small screens, shown on md+ */}
        <div className="hidden sm:block flex-1 max-w-[140px] mx-3">
          <div style={{
            height: 6, borderRadius: 10, overflow: "hidden",
            background: `${GOLD}08`, border: `1px solid ${GOLD}10`,
          }}>
            <div style={{
              height: "100%", borderRadius: 10,
              width: `${progress}%`,
              background: `linear-gradient(90deg, ${GOLD}, #f59e0b)`,
              boxShadow: `0 0 10px ${GOLD}40`,
              transition: "width 0.7s ease",
            }} />
          </div>
        </div>

        {/* Right: Stats — compact */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {streak > 0 && (
            <div style={{
              padding: "3px 7px", borderRadius: 8,
              background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)",
            }}>
              <span style={{ fontSize: 11, fontWeight: 900, color: "#fbbf24", ...N }}>🔥{streak}</span>
            </div>
          )}
          <div style={{
            padding: "3px 7px", borderRadius: 8,
            background: `${GOLD}08`, border: `1px solid ${GOLD}12`,
          }}>
            <span style={{ fontSize: 11, fontWeight: 900, color: GOLD, ...N }}>⭐{xp}</span>
          </div>
          {timeLeft != null && (
            <div style={{
              padding: "3px 7px", borderRadius: 8,
              background: timeLeft <= 10 ? "rgba(239,68,68,0.12)" : `${GOLD}08`,
              border: `1px solid ${timeLeft <= 10 ? "rgba(239,68,68,0.25)" : `${GOLD}15`}`,
            }}>
              <span style={{ fontSize: 11, fontWeight: 900, color: timeLeft <= 10 ? "#f87171" : `${GOLD}cc`, ...N }}>⏱{formatTime(timeLeft)}</span>
            </div>
          )}
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 8,
            background: "rgba(255,255,255,0.03)", border: `1px solid ${GOLD}12`,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: `${GOLD}60`, fontSize: 13, cursor: "pointer",
          }} title="Exit quest">✕</button>
        </div>
      </header>

      {/* ═══ MAIN CONTENT ═══════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden" style={{ position: "relative", zIndex: 3 }}>

        {/* ─── LEFT: Story Panel ────────────────────────────── */}
        <div className="lg:w-[45%] overflow-y-auto p-3 sm:p-5 md:p-7 max-h-[32vh] sm:max-h-[38vh] lg:max-h-none"
          style={{ borderRight: `1px solid ${GOLD}06` }}>

          {leftPanelContent ? (
            <div className="h-full">{leftPanelContent}</div>
          ) : (
            <>
              {/* Mission badge */}
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "6px 14px", borderRadius: 12,
                background: `${GOLD}08`, border: `1px solid ${GOLD}15`,
                marginBottom: 14,
              }}>
                <span style={{ fontSize: 14 }}>🚀</span>
                <span style={{ fontSize: 11, fontWeight: 900, color: `${GOLD}90`, ...N }}>
                  {subjectLabel} Adventure
                </span>
              </div>

              <h1 style={{
                fontSize: "clamp(22px, 5vw, 30px)", fontWeight: 900, color: "#fff",
                marginBottom: 20, lineHeight: 1.25, ...N,
              }}>
                {missionTitle || `Space Mission ${questionIndex + 1}`}
              </h1>

              {/* Story passage */}
              {passage && (
                <GlowFrame color={PURPLE} intensity={0.1} style={{
                  background: "linear-gradient(135deg, rgba(45,22,104,0.7), rgba(30,18,96,0.8))",
                  padding: 20, marginBottom: 20,
                }}>
                  <div style={{ position: "absolute", top: 8, right: 12, fontSize: 24, opacity: 0.15 }}>🌌</div>
                  <div style={{ fontSize: 15, color: "rgba(255,255,255,0.75)", lineHeight: 1.7, ...N }}>
                    {passage.split("\n").filter(Boolean).map((p, i) => (
                      <p key={i} style={{ marginBottom: 8 }}>{p}</p>
                    ))}
                  </div>
                </GlowFrame>
              )}

              {/* Tara guide */}
              <GlowFrame color={GOLD} intensity={0.1} style={{
                background: `${GOLD}04`, padding: 18,
              }}>
                <div className="flex items-center gap-3 mb-3">
                  <div style={{
                    width: 40, height: 40, borderRadius: 14,
                    background: `${GOLD}10`, border: `1.5px solid ${GOLD}20`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 20, boxShadow: `0 0 10px ${GOLD}15`,
                  }}>🧚</div>
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 900, color: GOLD, ...N }}>Tara the Star Guide</span>
                    <br />
                    <span style={{ fontSize: 9, color: `${GOLD}40`, fontWeight: 700, ...N }}>Here to help!</span>
                  </div>
                </div>
                <p style={{ fontSize: 14, color: "rgba(251,191,36,0.55)", lineHeight: 1.6, ...N }}>
                  {taraHint || `Hello, little explorer! 🌟 Look at the question carefully. You're doing amazing!`}
                </p>
                {!showTaraHelp && (
                  <button onClick={() => setShowTaraHelp(true)} style={{
                    marginTop: 10, fontSize: 12, fontWeight: 900, color: GOLD,
                    background: `${GOLD}08`, border: `1px solid ${GOLD}15`,
                    padding: "6px 14px", borderRadius: 10, cursor: "pointer", ...N,
                  }}>
                    ✨ Give me a hint!
                  </button>
                )}
                {showTaraHelp && (
                  <div style={{
                    marginTop: 10, padding: 12, borderRadius: 14,
                    background: `${GOLD}06`, border: `1px solid ${GOLD}10`,
                  }}>
                    <p style={{ fontSize: 13, color: "rgba(251,191,36,0.6)", ...N }}>
                      {taraHint || "Read each answer slowly. Which one makes the most sense? Trust your brain! 🌟"}
                    </p>
                  </div>
                )}
              </GlowFrame>

              {!passage && (
                <div style={{
                  marginTop: 20, padding: 32, textAlign: "center", borderRadius: 20,
                  border: `1.5px dashed ${GOLD}10`, background: `${GOLD}02`,
                }}>
                  <span style={{ fontSize: 40, display: "block", marginBottom: 8 }}>🌟</span>
                  <p style={{ fontSize: 14, color: `${GOLD}25`, fontWeight: 900, ...N }}>Ready for your adventure!</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* ─── RIGHT: Answer Buttons ────────────────────────── */}
        <div className="lg:w-[55%] overflow-y-auto p-3 sm:p-4 md:p-6 flex flex-col"
          style={{ background: "rgba(30,18,96,0.4)" }}>

          {/* Question badge */}
          <div style={{ marginBottom: 8 }}>
            <span style={{
              display: "inline-block", padding: "5px 14px", borderRadius: 10,
              fontSize: 12, fontWeight: 900, ...N,
              background: `${GOLD}15`, color: GOLD, border: `1px solid ${GOLD}30`,
              letterSpacing: 0.5,
            }}>
              Question {questionIndex + 1}
            </span>
          </div>

          <h2 style={{
            fontSize: "clamp(15px, 3.5vw, 24px)", fontWeight: 900, color: "#fff",
            marginBottom: 12, lineHeight: 1.3, ...N,
          }}>
            {question}
          </h2>

          {/* Big, friendly answer buttons with glow */}
          <div ref={optionsRef} style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
            {options.map((opt, i) => {
              const selected = selectedAnswer === i;
              const isCorrectOption = correctIndex != null && i === correctIndex;
              const correct = showResult && (isCorrectOption || (isCorrect && selected));
              const wrong = showResult && selected && !isCorrect;
              const col = OPTION_COLORS[i] || OPTION_COLORS[0];

              let borderCol = `${col.border}20`;
              let bgCol = `${col.border}04`;
              let glowShadow = "none";

              if (selected && !showResult) {
                borderCol = `${col.border}60`;
                bgCol = col.bg;
                glowShadow = `0 0 16px ${col.glow}, inset 0 0 12px ${col.border}08`;
              }
              if (correct) {
                borderCol = "#22c55e";
                bgCol = "rgba(34,197,94,0.1)";
                glowShadow = "0 0 16px rgba(34,197,94,0.2)";
              }
              if (wrong) {
                borderCol = "#ef4444";
                bgCol = "rgba(239,68,68,0.1)";
                glowShadow = "0 0 12px rgba(239,68,68,0.15)";
              }

              return (
                <button key={i} onClick={() => !showResult && onSelect?.(i)}
                  className="ks1-option ks1-answer-btn"
                  style={{
                    width: "100%", textAlign: "left",
                    borderRadius: 14,
                    background: bgCol,
                    border: `2px solid ${borderCol}`,
                    display: "flex", alignItems: "center",
                    cursor: showResult ? "default" : "pointer",
                    transition: "all 0.2s ease",
                    boxShadow: glowShadow,
                    transform: selected ? "scale(1.02)" : "scale(1)",
                  }}>
                  <div className="ks1-answer-icon" style={{
                    borderRadius: 10,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                    background: correct ? "#22c55e" : wrong ? "#ef4444" : selected ? `${col.border}20` : "rgba(255,255,255,0.04)",
                    border: `1.5px solid ${correct ? "#22c55e" : wrong ? "#ef4444" : selected ? `${col.border}40` : "rgba(255,255,255,0.06)"}`,
                    boxShadow: selected ? `0 0 8px ${col.glow}` : "none",
                  }}>
                    {correct ? "✅" : wrong ? "❌" : OPTION_ICONS[i]}
                  </div>
                  <span className="ks1-answer-text" style={{ color: "rgba(255,255,255,0.8)", fontWeight: 800, ...N }}>
                    {typeof opt === "string" ? opt : opt?.text || opt}
                  </span>
                  {correct && <span style={{ marginLeft: "auto", fontSize: 18 }}>🎉</span>}
                </button>
              );
            })}
          </div>

          {/* Result explanation — KS1 age-appropriate three-part structure */}
          {showResult && (() => {
            const correctOpt = correctIndex != null ? options[correctIndex] : null;
            const correctText = typeof correctOpt === "string" ? correctOpt : (correctOpt?.text || correctOpt?.label || "");
            const primaryWhy = getPrimaryExplanation(explanation);
            return (
              <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Part 1: Correct answer callout */}
                <GlowFrame
                  color="#22c55e"
                  intensity={0.15}
                  style={{ padding: 18, background: "rgba(34,197,94,0.07)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 40, lineHeight: 1 }}>
                      {isCorrect ? "🎉" : "✨"}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 900, color: "#86efac", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4, ...N }}>
                        {isCorrect ? "You got it!" : "The right answer is..."}
                      </div>
                      {correctText && (
                        <div style={{ fontSize: 18, fontWeight: 900, color: "#ffffff", ...N }}>
                          {correctText}
                        </div>
                      )}
                    </div>
                    {correctText && (
                      <button
                        type="button"
                        onClick={() => speakText(correctText)}
                        aria-label="Read the answer aloud"
                        style={{
                          fontSize: 22, background: "rgba(34,197,94,0.15)",
                          border: "1.5px solid rgba(34,197,94,0.4)", borderRadius: 12,
                          padding: "8px 12px", cursor: "pointer", color: "#ffffff",
                        }}>
                        🔊
                      </button>
                    )}
                  </div>
                </GlowFrame>

                {/* Part 2: Why? section */}
                {primaryWhy && (
                  <GlowFrame
                    color={GOLD}
                    intensity={0.12}
                    style={{ padding: 18, background: "rgba(251,191,36,0.05)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <span style={{ fontSize: 22 }}>💡</span>
                      <span style={{ fontSize: 14, fontWeight: 900, color: "#fcd34d", ...N }}>
                        Why?
                      </span>
                      <button
                        type="button"
                        onClick={() => speakText(primaryWhy)}
                        aria-label="Listen to the explanation"
                        style={{
                          marginLeft: "auto", display: "flex", alignItems: "center", gap: 6,
                          fontSize: 12, fontWeight: 800, color: "#fcd34d",
                          background: "rgba(251,191,36,0.12)",
                          border: "1.5px solid rgba(251,191,36,0.35)",
                          borderRadius: 10, padding: "6px 12px", cursor: "pointer", ...N,
                        }}>
                        🔊 Listen
                      </button>
                    </div>
                    <p style={{ fontSize: 14, color: "rgba(255,255,255,0.85)", lineHeight: 1.65, margin: 0, ...N }}>
                      {primaryWhy}
                    </p>
                  </GlowFrame>
                )}

                {/* Part 3: What about the other answers? */}
                <DistractorExplanations
                  options={options}
                  correctIndex={correctIndex}
                  explanation={explanation}
                  isCorrect={isCorrect}
                />
              </div>
            );
          })()}

          {taraEIBWidget}

          {/* Streak bonus */}
          {streak > 0 && !showResult && (
            <div style={{
              marginTop: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "8px 16px", borderRadius: 14,
              background: `${GOLD}05`, border: `1px solid ${GOLD}10`,
              boxShadow: `0 0 12px ${GOLD}08`,
            }}>
              <span style={{ fontSize: 14 }}>🔥</span>
              <span style={{ fontSize: 12, fontWeight: 900, color: GOLD, ...N }}>{streak} in a row! +{streak * 5} bonus stars!</span>
            </div>
          )}

          {/* Actions */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "flex-end",
            marginTop: 12, paddingTop: 10,
            borderTop: `1px solid ${GOLD}06`,
          }}>
            <button onClick={onSubmit} disabled={(selectedAnswer == null && !showResult) || (showResult && !canProceed)}
              className="ks1-submit-btn"
              style={{
                borderRadius: 14,
                fontWeight: 900,
                display: "flex", alignItems: "center", gap: 6,
                cursor: (selectedAnswer != null || showResult) && !(showResult && !canProceed) ? "pointer" : "default",
                opacity: (selectedAnswer == null && !showResult) || (showResult && !canProceed) ? 0.3 : 1,
                transition: "all 0.2s",
                ...N,
                background: `linear-gradient(135deg, ${GOLD}, #f59e0b)`,
                color: "#1a1040",
                border: "none",
                boxShadow: (selectedAnswer != null || showResult) && !(showResult && !canProceed) ? `0 0 24px ${GOLD}35` : "none",
              }}>
              {showResult && !canProceed ? "Tell Tara what you learned ↓" : showResult ? "Next Adventure →" : "Lock In Answer"} ✨
            </button>
          </div>

          <p className="hidden sm:block" style={{
            fontSize: 9, color: `${GOLD}10`, textAlign: "center", marginTop: 6,
            fontWeight: 900, ...N,
          }}>
            ✨ BELIEVE IN YOURSELF, EXPLORER ✨
          </p>
        </div>
      </div>
    </div>

    {/* ── Animations + Responsive ── */}
    <style>{`
      @keyframes ks1-sparkle {
        0%, 100% { opacity: 0.1; transform: scale(0.8); }
        50% { opacity: 0.4; transform: scale(1.3); }
      }
      .ks1-answer-btn { padding: 8px 12px; gap: 8px; }
      .ks1-answer-icon { width: 34px; height: 34px; font-size: 16px; }
      .ks1-answer-text { font-size: 14px; }
      .ks1-submit-btn { padding: 10px 20px; font-size: 13px; }
      @media (min-width: 640px) {
        .ks1-answer-btn { padding: 12px 16px; gap: 12px; }
        .ks1-answer-icon { width: 42px; height: 42px; font-size: 20px; }
        .ks1-answer-text { font-size: 16px; }
        .ks1-submit-btn { padding: 14px 32px; font-size: 16px; }
      }
    `}</style>
    </div>
  );
}
