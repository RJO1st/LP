"use client";
/**
 * KS1QuizShell.jsx
 * Deploy to: src/components/game/KS1QuizShell.jsx
 *
 * Celestial Nursery — magical adventure quiz for ages 5-7
 * Large friendly text, warm colours, gentle animations
 * Left: Story panel with Tara as friendly space guide, star trail progress
 * Right: Big tap-friendly answer buttons with star/planet icons
 * Top: Celestial Nursery brand, star progress, gentle timer
 * Theme: Deep space purple-blue with warm gold stars
 */

import React, { useState } from "react";

const N = { fontFamily: "'Nunito', 'Comic Sans MS', sans-serif" };
const OPTION_ICONS = ["🌟", "🪐", "🌙", "⭐"];
const OPTION_COLORS = [
  { bg: "rgba(251,191,36,0.12)", border: "#fbbf24", text: "#fbbf24" },
  { bg: "rgba(168,85,247,0.12)", border: "#a855f7", text: "#a855f7" },
  { bg: "rgba(56,189,248,0.12)", border: "#38bdf8", text: "#38bdf8" },
  { bg: "rgba(52,211,153,0.12)", border: "#34d399", text: "#34d399" },
];

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

  // Star trail progress
  const progress = totalQuestions > 0 ? ((questionIndex) / totalQuestions) * 100 : 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4" style={{
      background: "rgba(15,14,26,0.95)", backdropFilter: "blur(12px)",
    }}>
    <div className="w-full flex flex-col rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl" style={{
      maxWidth: "900px", maxHeight: "90vh",
      background: "linear-gradient(180deg, #1a1040 0%, #2d1b69 40%, #1a1040 100%)",
    }}>

      {/* ═══ TOP NAV — friendly & warm ═══════════════════════════════════ */}
      <header className="flex items-center justify-between px-4 md:px-6 py-3 shrink-0"
        style={{ background: "rgba(26,16,64,0.9)", borderBottom: "1px solid rgba(251,191,36,0.15)" }}>

        <div className="flex items-center gap-2">
          <span className="text-2xl">✨</span>
          <span className="text-base font-black text-amber-300 tracking-tight hidden sm:inline" style={N}>Celestial Nursery</span>
        </div>

        {/* Star trail progress */}
        <div className="flex-1 max-w-[200px] mx-4">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
              <div className="h-full rounded-full transition-all duration-700 ease-out"
                style={{ width: `${progress}%`, background: "linear-gradient(90deg, #fbbf24, #f59e0b)" }} />
            </div>
            <span className="text-xs font-bold text-amber-300" style={N}>
              {questionIndex + 1}/{totalQuestions}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {streak > 0 && (
            <span className="text-sm font-bold text-amber-200 flex items-center gap-1" style={N}>
              🔥 {streak}
            </span>
          )}
          <span className="text-sm font-bold text-amber-200 flex items-center gap-1" style={N}>
            ⭐ {xp}
          </span>
          {timeLeft != null && (
            <span className="text-sm font-bold text-white/60 bg-white/5 px-2.5 py-1 rounded-full" style={N}>
              ⏱ {formatTime(timeLeft)}
            </span>
          )}
          <button onClick={onClose} className="flex items-center justify-center w-7 h-7 rounded-full hover:bg-white/10 transition-colors"
            style={{ color: "#fbbf24", fontSize: 15 }} title="Exit quest">
            ✕
          </button>
        </div>
      </header>

      {/* ═══ MAIN CONTENT ═══════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">

        {/* ─── LEFT: Story Panel ────────────────────────────────────── */}
        <div className="lg:w-[45%] overflow-y-auto p-5 md:p-8 max-h-[40vh] lg:max-h-none"
          style={{ borderRight: "1px solid rgba(251,191,36,0.06)" }}>

          {/* Dynamic left panel — visualiser/passage from QuestOrchestrator, or fallback */}
          {leftPanelContent ? (
            <div className="h-full">{leftPanelContent}</div>
          ) : (
            <>
              {/* Mission badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4"
                style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.2)" }}>
                <span className="text-sm">🚀</span>
                <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider" style={N}>
                  {subjectLabel} Adventure
                </span>
              </div>

              <h1 className="text-2xl md:text-3xl font-black text-white mb-5 leading-snug" style={N}>
                {missionTitle || `Space Mission ${questionIndex + 1}`}
              </h1>

              {/* Story passage */}
              {passage && (
                <div className="rounded-2xl p-5 mb-5 relative overflow-hidden"
                  style={{ background: "linear-gradient(135deg, rgba(45,27,105,0.8), rgba(26,16,64,0.9))", border: "1px solid rgba(251,191,36,0.1)" }}>
                  <div className="absolute top-2 right-3 text-2xl opacity-20">🌌</div>
                  <div className="text-base text-white/80 leading-relaxed space-y-3" style={N}>
                    {passage.split("\n").filter(Boolean).map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Tara guide */}
              <div className="rounded-2xl p-5" style={{
                background: "rgba(251,191,36,0.05)",
                border: "1px solid rgba(251,191,36,0.1)",
              }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                    style={{ background: "rgba(251,191,36,0.15)" }}>
                    🧚
                  </div>
                  <div>
                    <span className="text-sm font-black text-amber-200 block" style={N}>Tara the Star Guide</span>
                    <span className="text-[10px] text-amber-300/50" style={N}>Here to help!</span>
                  </div>
                </div>
                <p className="text-sm text-amber-100/60 leading-relaxed" style={N}>
                  {taraHint || `Hello, little explorer! 🌟 Look at the question carefully. You're doing amazing — mission ${questionIndex + 1} is almost complete!`}
                </p>
                {!showTaraHelp && (
                  <button onClick={() => setShowTaraHelp(true)}
                    className="mt-3 text-xs font-bold text-amber-300 hover:text-amber-200 transition-colors" style={N}>
                    ✨ Give me a hint!
                  </button>
                )}
                {showTaraHelp && (
                  <div className="mt-3 p-3 rounded-xl" style={{ background: "rgba(251,191,36,0.06)" }}>
                    <p className="text-sm text-amber-200/70" style={N}>
                      {taraHint || "Read each answer slowly. Which one makes the most sense? Trust your brain — you know this! 🌟"}
                    </p>
                  </div>
                )}
              </div>

              {!passage && (
                <div className="mt-5 rounded-2xl p-8 text-center"
                  style={{ background: "rgba(251,191,36,0.03)", border: "1px dashed rgba(251,191,36,0.12)" }}>
                  <span className="text-5xl block mb-3">🌟</span>
                  <p className="text-amber-200/30 text-sm font-bold" style={N}>Ready for your adventure!</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* ─── RIGHT: Answer Buttons ────────────────────────────────── */}
        <div className="lg:w-[55%] overflow-y-auto p-4 md:p-6 flex flex-col"
          style={{ background: "rgba(26,16,64,0.5)" }}>

          {/* Question */}
          <div className="mb-2">
            <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-3"
              style={{ background: "rgba(251,191,36,0.12)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.2)" }}>
              Question {questionIndex + 1}
            </span>
          </div>

          <h2 className="text-xl md:text-2xl font-black text-white mb-6 leading-snug" style={N}>
            {question}
          </h2>

          {/* Big, friendly answer buttons */}
          <div className="space-y-2 flex-1">
            {options.map((opt, i) => {
              const selected = selectedAnswer === i;
              const correct = showResult && isCorrect && selected;
              const wrong = showResult && !isCorrect && selected;
              const col = OPTION_COLORS[i] || OPTION_COLORS[0];

              return (
                <button key={i} onClick={() => !showResult && onSelect?.(i)}
                  className="w-full text-left px-3 py-3 md:px-4 md:py-3.5 rounded-xl border-2 transition-all flex items-center gap-3"
                  style={{
                    background: correct ? "rgba(34,197,94,0.12)" : wrong ? "rgba(239,68,68,0.12)" : selected ? col.bg : "rgba(255,255,255,0.03)",
                    borderColor: correct ? "#22c55e" : wrong ? "#ef4444" : selected ? col.border : "rgba(255,255,255,0.06)",
                    transform: selected ? "scale(1.02)" : "scale(1)",
                  }}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0"
                    style={{
                      background: correct ? "#22c55e" : wrong ? "#ef4444" : selected ? `${col.border}30` : "rgba(255,255,255,0.05)",
                    }}>
                    {correct ? "✅" : wrong ? "❌" : OPTION_ICONS[i]}
                  </div>
                  <span className="text-base md:text-lg text-white/80 font-bold" style={N}>
                    {typeof opt === "string" ? opt : opt?.text || opt}
                  </span>
                  {correct && <span className="ml-auto text-2xl">🎉</span>}
                </button>
              );
            })}
          </div>

          {/* Result explanation */}
          {showResult && explanation && (
            <div className="mt-4 p-5 rounded-2xl" style={{
              background: isCorrect ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
              border: `1px solid ${isCorrect ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`
            }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{isCorrect ? "🌟" : "💡"}</span>
                <span className="text-sm font-black text-white/60" style={N}>
                  {isCorrect ? "Amazing work, explorer!" : "Let's learn something new!"}
                </span>
              </div>
              <p className="text-sm text-white/60 leading-relaxed" style={N}>{explanation}</p>
            </div>
          )}

          {/* Tara EIB (Explain It Back) — appears after wrong answer */}
          {taraEIBWidget}

          {/* Streak bonus */}
          {streak > 0 && !showResult && (
            <div className="mt-4 flex items-center justify-center gap-2 p-3 rounded-xl"
              style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.1)" }}>
              <span className="text-sm">🔥</span>
              <span className="text-xs font-black text-amber-300" style={N}>{streak} in a row! +{streak * 5} bonus stars!</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between mt-6 pt-4"
            style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <button onClick={onSkip}
              className="text-sm text-white/20 hover:text-white/40 transition-colors font-bold" style={N}>
              Skip →
            </button>
            <button onClick={onSubmit} disabled={selectedAnswer == null && !showResult}
              className="px-8 py-4 rounded-2xl text-base font-black flex items-center gap-2 transition-all active:scale-95 disabled:opacity-30"
              style={{
                background: showResult
                  ? "linear-gradient(135deg, #fbbf24, #f59e0b)"
                  : "linear-gradient(135deg, #fbbf24, #f59e0b)",
                color: "#1a1040",
                boxShadow: selectedAnswer != null || showResult ? "0 0 20px rgba(251,191,36,0.3)" : "none",
                ...N,
              }}>
              {showResult ? "Next Adventure →" : "Lock In Answer"} ✨
            </button>
          </div>

          <p className="text-[9px] text-white/10 text-center mt-3 uppercase tracking-wider font-bold" style={N}>
            ✨ BELIEVE IN YOURSELF, EXPLORER ✨
          </p>
        </div>
      </div>
    </div>
    </div>
  );
}
