"use client";
/**
 * KS3QuizShell.jsx
 * Deploy to: src/components/game/KS3QuizShell.jsx
 *
 * Career Simulator — professional challenge interface for ages 12-14
 * Left: Scenario brief with career context, data panels, Tara as mentor
 * Right: Challenge MCQ with confidence meter, skill tags
 * Top: Career Simulator brand, career track progress, timer
 * Theme: Dark teal/slate with emerald accents — modern, aspirational
 */

import React, { useState } from "react";

const OPTION_LETTERS = ["A", "B", "C", "D"];

// Career-themed subject mapping for immersive framing
const CAREER_MAP = {
  Maths:       { icon: "📊", career: "Data Analyst", dept: "Analytics" },
  Mathematics: { icon: "📊", career: "Data Analyst", dept: "Analytics" },
  English:     { icon: "✍️", career: "Content Director", dept: "Communications" },
  Science:     { icon: "🔬", career: "Research Scientist", dept: "R&D Lab" },
  Physics:     { icon: "⚡", career: "Systems Engineer", dept: "Engineering" },
  Chemistry:   { icon: "🧪", career: "Lab Director", dept: "Chemistry Lab" },
  Biology:     { icon: "🧬", career: "Biotech Lead", dept: "Life Sciences" },
  History:     { icon: "🏛️", career: "Policy Advisor", dept: "Strategy" },
  Geography:   { icon: "🌍", career: "Urban Planner", dept: "Sustainability" },
  Computing:   { icon: "💻", career: "Tech Lead", dept: "Engineering" },
  Business:    { icon: "💼", career: "Business Strategist", dept: "Operations" },
  Art:         { icon: "🎨", career: "Creative Director", dept: "Design" },
  Music:       { icon: "🎵", career: "Audio Engineer", dept: "Production" },
  Languages:   { icon: "🌐", career: "Translator", dept: "Global Ops" },
  RE:          { icon: "🤔", career: "Ethics Consultant", dept: "Philosophy" },
  PE:          { icon: "🏃", career: "Sports Analyst", dept: "Performance" },
  NVR:         { icon: "🧩", career: "Logic Specialist", dept: "Problem Solving" },
  VR:          { icon: "🔎", career: "Pattern Analyst", dept: "Intelligence" },
};

export default function KS3QuizShell({
  question, options = [], passage, questionIndex = 0, totalQuestions = 20,
  selectedAnswer, onSelect, onSubmit, onSkip, onClose,
  subjectLabel = "Science", xp = 0, timeLeft, streak = 0,
  taraHint, isCorrect, showResult, explanation, missionTitle,
  leftPanelContent, taraEIBWidget, canProceed,
}) {
  const [showMentor, setShowMentor] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const career = CAREER_MAP[subjectLabel] || CAREER_MAP.Science;
  const progress = totalQuestions > 0 ? ((questionIndex) / totalQuestions) * 100 : 0;

  const formatTime = (s) => {
    if (!s && s !== 0) return "";
    const m = Math.floor(s / 60); const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4" style={{
      background: "rgba(12,18,34,0.95)", backdropFilter: "blur(12px)",
    }}>
    <div className="w-full flex flex-col rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl" style={{
      maxWidth: "900px", maxHeight: "90vh", background: "#0c1222",
    }}>

      {/* ═══ TOP NAV ═════════════════════════════════════════════════════ */}
      <header className="flex items-center justify-between px-4 md:px-6 py-2.5 shrink-0"
        style={{ background: "rgba(12,18,34,0.95)", borderBottom: "1px solid rgba(16,185,129,0.1)" }}>

        <div className="flex items-center gap-3">
          <span className="text-base font-black tracking-tight text-emerald-400">
            Career Simulator
          </span>
          <div className="hidden md:flex items-center gap-1 text-[10px]">
            <span className="text-white/20">|</span>
            <span className="text-emerald-400/60 font-bold">{career.dept.toUpperCase()}</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex-1 max-w-[240px] mx-6 hidden sm:block">
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-white/25 font-bold uppercase tracking-wider">Track</span>
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${progress}%`, background: "linear-gradient(90deg, #10b981, #34d399)" }} />
            </div>
            <span className="text-[10px] font-bold text-emerald-400">{questionIndex + 1}/{totalQuestions}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-3 text-xs">
            {streak > 0 && (
              <span className="text-amber-400 font-bold">🔥 {streak} streak</span>
            )}
            <span className="text-white/40 font-bold">◉ {xp.toLocaleString()} XP</span>
          </div>
          {timeLeft != null && (
            <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm font-bold text-white tabular-nums">{formatTime(timeLeft)}</span>
            </div>
          )}
          <div className="w-8 h-8 rounded-full bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center text-sm">
            {career.icon}
          </div>
          <button onClick={() => setShowExitConfirm(true)} className="flex items-center justify-center w-7 h-7 rounded-full hover:bg-white/10 transition-colors text-emerald-400"
            style={{ fontSize: 14 }} title="Exit challenge">
            ✕
          </button>
        </div>
      </header>

      {/* ═══ SPLIT CONTENT ═══════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">

        {/* ─── LEFT: Scenario Brief ───────────────────────────────────── */}
        <div className="lg:w-1/2 overflow-y-auto p-3 sm:p-5 md:p-8 max-h-[28vh] sm:max-h-[35vh] lg:max-h-none"
          style={{ borderRight: "1px solid rgba(16,185,129,0.06)" }}>

          {/* Dynamic left panel — visualiser/passage from QuestOrchestrator, or fallback */}
          {leftPanelContent ? (
            <div className="h-full">{leftPanelContent}</div>
          ) : (
            <>
              {/* Career context badges */}
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                  style={{ background: "rgba(16,185,129,0.1)", color: "#34d399", border: "1px solid rgba(16,185,129,0.2)" }}>
                  {career.career}
                </span>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                  style={{ background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  CHALLENGE {questionIndex + 1}
                </span>
              </div>

              <h1 className="text-2xl md:text-3xl font-black text-white mb-5 leading-tight">
                {missionTitle || `${career.dept} Challenge`}
              </h1>

              {/* Scenario data panel */}
              {passage && (
                <div className="rounded-xl overflow-hidden mb-5"
                  style={{ background: "rgba(16,185,129,0.03)", border: "1px solid rgba(16,185,129,0.08)" }}>
                  <div className="px-4 py-2 flex items-center gap-2"
                    style={{ background: "rgba(16,185,129,0.05)", borderBottom: "1px solid rgba(16,185,129,0.06)" }}>
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-[9px] font-bold text-emerald-400/60 uppercase tracking-wider">SCENARIO DATA</span>
                  </div>
                  <div className="p-5">
                    <div className="text-sm text-white/65 leading-relaxed space-y-3">
                      {passage.split("\n").filter(Boolean).map((p, i) => (
                        <p key={i}>{p}</p>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Mentor panel */}
              <div className="rounded-xl p-5" style={{
                background: "rgba(16,185,129,0.04)",
                border: "1px solid rgba(16,185,129,0.08)",
              }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm"
                    style={{ background: "rgba(16,185,129,0.15)" }}>
                    🎯
                  </div>
                  <div>
                    <span className="text-sm font-bold text-white">Tara — Career Mentor</span>
                    <span className="text-[9px] text-white/25 uppercase tracking-wider ml-2">ONLINE</span>
                  </div>
                </div>
                <p className="text-sm text-emerald-200/50 leading-relaxed">
                  {taraHint || `Great to see you tackling this, analyst! This ${subjectLabel.toLowerCase()} challenge tests a skill every ${career.career.toLowerCase()} needs. Think critically and trust your reasoning.`}
                </p>
                {!showMentor && (
                  <button onClick={() => setShowMentor(true)}
                    className="mt-3 text-xs text-emerald-400 hover:text-emerald-300 border border-emerald-500/20 px-3 py-1.5 rounded-lg hover:bg-emerald-500/5 transition-colors font-bold">
                    🎯 Get career insight
                  </button>
                )}
                {showMentor && (
                  <div className="mt-3 p-3 rounded-lg" style={{ background: "rgba(16,185,129,0.06)" }}>
                    <p className="text-sm text-emerald-200/60 leading-relaxed">
                      {taraHint || "In the real world, professionals break complex problems into smaller parts. Try eliminating the answers you know are wrong first — that's how experts narrow down solutions."}
                    </p>
                  </div>
                )}
              </div>

              {!passage && (
                <div className="mt-5 rounded-xl p-8 text-center"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(16,185,129,0.1)" }}>
                  <span className="text-3xl block mb-2">{career.icon}</span>
                  <p className="text-sm text-white/20">Direct challenge — apply your knowledge</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* ─── RIGHT: MCQ ─────────────────────────────────────────────── */}
        <div className="lg:w-1/2 overflow-y-auto p-3 sm:p-4 md:p-6 flex flex-col"
          style={{ background: "rgba(12,18,34,0.5)" }}>

          <div className="flex items-center justify-between mb-2 sm:mb-4">
            <span className="px-3 py-1 rounded-full text-[10px] font-bold"
              style={{ background: "rgba(16,185,129,0.12)", color: "#34d399", border: "1px solid rgba(16,185,129,0.2)" }}>
              Task {questionIndex + 1} of {totalQuestions}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-white/25 uppercase tracking-wider font-bold">
                {subjectLabel}
              </span>
            </div>
          </div>

          <h2 className="text-base sm:text-lg md:text-xl font-bold text-white mb-3 sm:mb-6 leading-snug">
            {question}
          </h2>

          <div className="space-y-1.5 sm:space-y-2 flex-1">
            {options.map((opt, i) => {
              const selected = selectedAnswer === i;
              const correct = showResult && isCorrect && selected;
              const wrong = showResult && !isCorrect && selected;

              return (
                <button key={i} onClick={() => !showResult && onSelect?.(i)}
                  className="w-full text-left px-2.5 py-2 sm:px-3 sm:py-2.5 md:px-4 md:py-3 rounded-lg border transition-all flex items-center gap-2 sm:gap-3"
                  style={{
                    background: correct ? "rgba(34,197,94,0.1)" : wrong ? "rgba(239,68,68,0.1)" : selected ? "rgba(16,185,129,0.1)" : "rgba(255,255,255,0.02)",
                    borderColor: correct ? "#22c55e" : wrong ? "#ef4444" : selected ? "#10b981" : "rgba(255,255,255,0.06)",
                    transform: selected ? "scale(1.01)" : "scale(1)",
                  }}>
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md flex items-center justify-center text-[10px] sm:text-xs font-bold shrink-0"
                    style={{
                      background: correct ? "#22c55e" : wrong ? "#ef4444" : selected ? "#10b981" : "rgba(255,255,255,0.05)",
                      color: selected || correct || wrong ? "#fff" : "rgba(255,255,255,0.35)",
                    }}>
                    {correct ? "✓" : wrong ? "✗" : OPTION_LETTERS[i]}
                  </div>
                  <span className="text-xs sm:text-sm md:text-base text-white/70 font-medium">
                    {typeof opt === "string" ? opt : opt?.text || opt}
                  </span>
                  {correct && <span className="ml-auto text-green-400 text-xs sm:text-sm font-bold">Correct</span>}
                </button>
              );
            })}
          </div>

          {/* Result explanation */}
          {showResult && explanation && (
            <div className="mt-4 p-4 rounded-xl" style={{
              background: isCorrect ? "rgba(34,197,94,0.06)" : "rgba(239,68,68,0.06)",
              border: `1px solid ${isCorrect ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)"}`,
            }}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-white/40 uppercase tracking-wider">
                  {isCorrect ? "Career Skill Unlocked" : "Learning Opportunity"}
                </span>
              </div>
              <p className="text-sm text-white/60 leading-relaxed">{explanation}</p>
            </div>
          )}

          {/* Tara EIB (Explain It Back) — appears after wrong answer */}
          {taraEIBWidget}

          {/* Streak */}
          {streak > 0 && (
            <div className="mt-4 flex items-center justify-between p-3 rounded-xl"
              style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.1)" }}>
              <div className="flex items-center gap-2">
                <span className="text-sm">🔥</span>
                <span className="text-xs font-bold text-white/40">STREAK BONUS</span>
              </div>
              <span className="text-xs font-bold text-emerald-400">+{streak * 10} XP</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between mt-4 sm:mt-6 pt-3 sm:pt-4"
            style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
            <button onClick={() => setShowMentor(!showMentor)}
              className="text-[10px] sm:text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 bg-emerald-500/10 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-emerald-500/20">
              🎯 {showMentor ? "Hide Mentor" : "Ask Mentor"}
            </button>
            <div className="flex items-center gap-3">
              <button onClick={onSubmit} disabled={(selectedAnswer == null && !showResult) || (showResult && !canProceed)}
                className="px-5 sm:px-8 py-2.5 sm:py-3.5 rounded-xl text-xs sm:text-sm font-bold transition-all active:scale-95 disabled:opacity-30"
                style={{
                  background: showResult ? "#10b981" : "linear-gradient(135deg, #10b981, #059669)",
                  color: showResult ? "#0c1222" : "#fff",
                }}>
                {showResult && !canProceed ? "Explain to Tara first ↓" : showResult ? "Next Challenge →" : "Submit Answer"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom status */}
      <footer className="px-4 md:px-8 py-2 flex items-center justify-between text-[9px] uppercase tracking-wider shrink-0"
        style={{ background: "rgba(12,18,34,0.95)", borderTop: "1px solid rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.12)" }}>
        <div className="flex items-center gap-3">
          <span>CAREER TRACK: {career.career.toUpperCase()}</span>
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/30" />
          </div>
        </div>
        <span>DEPT: {career.dept.toUpperCase()} • TASK: {questionIndex + 1}/{totalQuestions}</span>
      </footer>
    </div>

    {/* Exit Confirmation Modal */}
    {showExitConfirm && (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
        onClick={(e) => { if (e.target === e.currentTarget) setShowExitConfirm(false); }}>
        <div style={{
          background: "#0c1222", borderRadius: 20, padding: "28px 24px", maxWidth: 360, width: "100%",
          boxShadow: "0 25px 50px rgba(0,0,0,0.5)", border: "1px solid rgba(16,185,129,0.15)",
          textAlign: "center",
        }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🚪</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: "#fff", marginBottom: 8 }}>
            Leave Challenge?
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 24, lineHeight: 1.5 }}>
            Your progress on this challenge will be lost. Are you sure you want to exit?
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setShowExitConfirm(false)} style={{
              flex: 1, padding: "12px 16px", borderRadius: 12, border: "none", cursor: "pointer",
              fontSize: 14, fontWeight: 800, background: "rgba(255,255,255,0.1)", color: "#fff",
            }}>
              Continue
            </button>
            <button onClick={() => { setShowExitConfirm(false); onClose?.(); }} style={{
              flex: 1, padding: "12px 16px", borderRadius: 12, border: "none", cursor: "pointer",
              fontSize: 14, fontWeight: 800, background: "#ef4444", color: "#fff",
            }}>
              Exit
            </button>
          </div>
        </div>
      </div>
    )}
    </div>
  );
}
