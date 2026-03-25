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
  leftPanelContent, taraEIBWidget, canProceed,
}) {
  const [showTaraHelp, setShowTaraHelp] = useState(false);

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
            <div style={{ fontSize: 9, color: `${GOLD}35`, fontWeight: 700, ...N }}>
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
            <div className="hidden sm:block" style={{
              padding: "3px 7px", borderRadius: 8,
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
            }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.5)", ...N }}>⏱{formatTime(timeLeft)}</span>
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
        <div className="lg:w-[45%] overflow-y-auto p-3 sm:p-5 md:p-7 max-h-[28vh] sm:max-h-[35vh] lg:max-h-none"
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
          <div style={{ marginBottom: 6 }}>
            <span style={{
              display: "inline-block", padding: "5px 14px", borderRadius: 10,
              fontSize: 11, fontWeight: 900, ...N,
              background: `${GOLD}08`, color: GOLD, border: `1px solid ${GOLD}15`,
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
          <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
            {options.map((opt, i) => {
              const selected = selectedAnswer === i;
              const correct = showResult && isCorrect && selected;
              const wrong = showResult && !isCorrect && selected;
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
                  className="ks1-answer-btn"
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

          {/* Result explanation */}
          {showResult && explanation && (
            <GlowFrame
              color={isCorrect ? "#22c55e" : "#ef4444"}
              intensity={0.1}
              style={{
                marginTop: 14, padding: 18,
                background: isCorrect ? "rgba(34,197,94,0.05)" : "rgba(239,68,68,0.05)",
              }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 18 }}>{isCorrect ? "🌟" : "💡"}</span>
                <span style={{ fontSize: 13, fontWeight: 900, color: isCorrect ? "#4ade80" : "#fca5a5", ...N }}>
                  {isCorrect ? "Amazing work, explorer!" : "Let's learn something new!"}
                </span>
              </div>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.6, ...N }}>{explanation}</p>
            </GlowFrame>
          )}

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
