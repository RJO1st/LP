"use client";
/**
 * KS4QuizShell.jsx
 * Deploy to: src/components/game/KS4QuizShell.jsx
 *
 * Exam Studio — precision exam interface for ages 15-17
 * Left: Case study passage, diagrams, formulae, mark scheme notes
 * Right: Exam-style MCQ with marks indicator, question counter
 * Top: KS4 Exam Studio, Grade Impact, countdown timer
 * Tara: Mark scheme analysis, "Explain the derivation?" button
 */

import React, { useState } from "react";

const OPTION_LETTERS = ["A", "B", "C", "D"];

export default function KS4QuizShell({
  question, options = [], passage, questionIndex = 0, totalQuestions = 20,
  selectedAnswer, onSelect, onSubmit, onSkip, onClose,
  subjectLabel = "Physics", xp = 0, marks = 1, timeLeft,
  taraHint, isCorrect, showResult, explanation,
  missionTitle, gradeImpact = "A*", markSchemeNote,
  leftPanelContent, taraEIBWidget, canProceed,
}) {
  const [showTaraPanel, setShowTaraPanel] = useState(false);

  const formatTime = (s) => {
    if (!s && s !== 0) return "";
    const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const sec = s % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4" style={{
      background: "rgba(13,17,23,0.95)", backdropFilter: "blur(12px)",
    }}>
    <div className="w-full flex flex-col rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl" style={{
      maxWidth: "900px", maxHeight: "90vh", background: "#0d1117",
    }}>

      {/* ═══ TOP NAV ═════════════════════════════════════════════════ */}
      <header className="flex items-center justify-between px-4 md:px-6 py-2.5 shrink-0"
        style={{ background: "rgba(13,17,23,0.95)", borderBottom: "1px solid rgba(167,139,250,0.08)" }}>
        <div className="flex items-center gap-4">
          <span className="text-lg font-bold tracking-tight text-white/90">KS4 Exam Studio</span>
          <div className="hidden md:flex items-center gap-4 text-xs">
            <span className="text-cyan-400 font-semibold underline underline-offset-4 decoration-cyan-400/50">Exam Mode</span>
            <button
              onClick={() => {
                // Scroll to mark scheme note if visible in left panel, otherwise toggle Tara panel
                const msEl = document.getElementById("ks4-mark-scheme");
                if (msEl) { msEl.scrollIntoView({ behavior: "smooth" }); msEl.style.outline = "2px solid rgba(0,229,195,0.5)"; setTimeout(() => { msEl.style.outline = "none"; }, 2000); }
                else { setShowTaraPanel((p) => !p); }
              }}
              className="text-white/30 hover:text-white/50 cursor-pointer transition-colors"
              title="View mark scheme notes & AI guidance"
            >Mark Scheme</button>
            <button
              onClick={() => setShowTaraPanel((p) => !p)}
              className="text-white/30 hover:text-white/50 cursor-pointer transition-colors"
            >AI Tutor</button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {timeLeft != null && (
            <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-sm font-bold text-white tabular-nums">{formatTime(timeLeft)}</span>
            </div>
          )}
          <button onClick={onClose} className="flex items-center justify-center w-7 h-7 rounded-full hover:bg-white/10 transition-colors text-violet-400"
            style={{ fontSize: 14 }} title="Exit exam">
            ✕
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">

        {/* ─── LEFT: Case Study ────────────────────────────────── */}
        <div className="lg:w-1/2 overflow-y-auto p-6 md:p-10 flex-1 max-h-[38vh] lg:max-h-none" style={{ borderRight: "1px solid rgba(255,255,255,0.04)" }}>
          {/* Dynamic left panel — visualiser/passage from QuestOrchestrator, or fallback */}
          {leftPanelContent ? (
            <div className="h-full">{leftPanelContent}</div>
          ) : (
            <>
              {/* Case study header */}
              <div className="text-cyan-400 text-[10px] font-bold uppercase tracking-[0.15em] mb-2">
                CASE STUDY: {subjectLabel.toUpperCase()}
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-6 leading-tight">
                {missionTitle || question?.split("?")[0] || subjectLabel}
              </h1>

              {passage && (
                <div className="text-sm text-white/60 leading-relaxed space-y-4 mb-6">
                  {passage.split("\n").filter(Boolean).map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              )}

              {/* Mark scheme note */}
              {markSchemeNote && (
                <div id="ks4-mark-scheme" className="rounded-lg p-4 mb-6" style={{ background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.12)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs">💎</span>
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">MARK SCHEME NOTE:</span>
                  </div>
                  <p className="text-sm text-violet-200/70 italic leading-relaxed">"{markSchemeNote}"</p>
                </div>
              )}

              {!passage && !markSchemeNote && (
                <div className="rounded-xl p-8 text-center" style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.06)" }}>
                  <span className="text-3xl block mb-2">📝</span>
                  <p className="text-sm text-white/20">Direct question — no passage</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* ─── RIGHT: MCQ ────────────────────────────────────── */}
        <div className="lg:w-[45%] overflow-y-auto p-4 md:p-6 flex flex-col" style={{ background: "rgba(13,17,23,0.4)" }}>
          {/* Question header */}
          <div className="flex items-center justify-between mb-4">
            <span className="px-3 py-1 rounded-full text-[10px] font-bold"
              style={{ background: "rgba(20,184,166,0.15)", color: "#2dd4bf", border: "1px solid rgba(20,184,166,0.2)" }}>
              Question {questionIndex + 1} of {totalQuestions}
            </span>
            <span className="text-sm font-bold text-white/40">{marks} MARK{marks > 1 ? "S" : ""}</span>
          </div>

          <h2 className="text-lg md:text-xl font-bold text-white mb-8 leading-snug">
            {question}
          </h2>

          <div className="space-y-2 flex-1">
            {options.map((opt, i) => {
              const selected = selectedAnswer === i;
              const correct = showResult && isCorrect && selected;
              const wrong = showResult && !isCorrect && selected;

              return (
                <button key={i} onClick={() => !showResult && onSelect?.(i)}
                  className="w-full text-left px-3 py-2.5 md:px-4 md:py-3 rounded-lg border transition-all flex items-center gap-3"
                  style={{
                    background: correct ? "rgba(34,197,94,0.08)" : wrong ? "rgba(239,68,68,0.08)" : selected ? "rgba(167,139,250,0.1)" : "rgba(255,255,255,0.02)",
                    borderColor: correct ? "#22c55e" : wrong ? "#ef4444" : selected ? "#a78bfa" : "rgba(255,255,255,0.06)",
                    transform: selected ? "scale(1.01)" : "scale(1)",
                  }}>
                  <div className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold shrink-0"
                    style={{
                      background: correct ? "#22c55e" : wrong ? "#ef4444" : selected ? "#a78bfa" : "rgba(255,255,255,0.05)",
                      color: selected || correct || wrong ? "#fff" : "rgba(255,255,255,0.3)",
                    }}>
                    {correct ? "✓" : wrong ? "✗" : OPTION_LETTERS[i]}
                  </div>
                  <span className="text-sm md:text-base text-white/70 font-medium">
                    {typeof opt === "string" ? opt : opt?.text || opt}
                  </span>
                </button>
              );
            })}
          </div>

          {showResult && explanation && (
            <div className="mt-4 p-4 rounded-xl" style={{
              background: isCorrect ? "rgba(34,197,94,0.06)" : "rgba(239,68,68,0.06)",
              border: `1px solid ${isCorrect ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)"}`
            }}>
              <p className="text-sm text-white/60">{explanation}</p>
            </div>
          )}

          {/* Tara EIB (Explain It Back) — appears after wrong answer */}
          {taraEIBWidget}

          {/* Actions */}
          <div className="flex items-center justify-between mt-6 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
            <button onClick={() => setShowTaraPanel(!showTaraPanel)}
              className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1.5 bg-violet-500/10 px-3 py-1.5 rounded-lg border border-violet-500/20">
              🤖 {showTaraPanel ? "Hide Tara" : "Ask Tara"}
            </button>
            <div className="flex items-center gap-3">
              <button onClick={onSubmit} disabled={selectedAnswer == null && !showResult}
                className="px-8 py-3.5 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-30"
                style={{ background: showResult ? "#a78bfa" : "linear-gradient(135deg, #a78bfa, #7c87f3)", color: "#0d1117" }}>
                {showResult ? "Next →" : "Submit Answer"}
              </button>
            </div>
          </div>

          {/* Tara panel */}
          {showTaraPanel && (
            <div className="mt-4 rounded-xl p-4" style={{ background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.12)" }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs">🤖</span>
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">TARA AI TUTOR</span>
                <span className="ml-auto flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  <span className="text-[9px] text-white/30">ACTIVE</span>
                </span>
              </div>
              <p className="text-sm text-violet-200/60 leading-relaxed">
                {taraHint || `Think carefully about this question. What key concept does it test?`}
              </p>
              {taraHint && (
                <button className="mt-3 text-xs text-violet-300 border border-violet-500/20 px-3 py-1.5 rounded-lg hover:bg-violet-500/10 transition-colors">
                  Tell me more about this
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom status */}
      <footer className="px-4 md:px-8 py-2 flex items-center justify-between text-[9px] uppercase tracking-wider shrink-0"
        style={{ background: "rgba(13,17,23,0.95)", borderTop: "1px solid rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.15)" }}>
        <div className="flex items-center gap-3">
          <span>SYSTEM STATUS: NOMINAL</span>
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/30" />
          </div>
        </div>
        <span>MODULE: {subjectLabel.toUpperCase()} • REF: {questionIndex + 1}/{totalQuestions}</span>
      </footer>
    </div>
    </div>
  );
}