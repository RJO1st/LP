"use client";
/**
 * KS2QuizShell.jsx — v2 HUD Edition
 * Deploy to: src/components/game/KS2QuizShell.jsx
 *
 * Orbital Command — sci-fi HUD quiz interface for ages 8-11
 * Full dark theme with glowing cyan/teal borders, angled corners,
 * scan-line effects, holographic data overlays.
 * Inspired by futuristic HUD interfaces.
 */

import React from "react";

const N = { fontFamily: "'Orbitron', 'Rajdhani', 'Nunito', sans-serif" };
const NB = { fontFamily: "'Rajdhani', 'Nunito', sans-serif" };
const OPTION_LETTERS = ["A", "B", "C", "D"];
const CYAN = "#22d3ee";
const CYAN_DIM = "rgba(34,211,238,0.12)";
const CYAN_GLOW = "rgba(34,211,238,0.35)";

/* ── HUD Frame SVG border with angled corners ───── */
function HudFrame({ children, glow, className = "", style = {} }) {
  return (
    <div className={className} style={{
      position: "relative",
      ...style,
    }}>
      {/* Corner accents */}
      <div style={{ position: "absolute", top: -1, left: -1, width: 18, height: 18, pointerEvents: "none" }}>
        <svg width="18" height="18" viewBox="0 0 18 18"><path d="M0 4 L0 0 L18 0" fill="none" stroke={CYAN} strokeWidth="1.5" opacity={glow ? 0.8 : 0.35} /></svg>
      </div>
      <div style={{ position: "absolute", top: -1, right: -1, width: 18, height: 18, pointerEvents: "none" }}>
        <svg width="18" height="18" viewBox="0 0 18 18"><path d="M0 0 L18 0 L18 4" fill="none" stroke={CYAN} strokeWidth="1.5" opacity={glow ? 0.8 : 0.35} /></svg>
      </div>
      <div style={{ position: "absolute", bottom: -1, left: -1, width: 18, height: 18, pointerEvents: "none" }}>
        <svg width="18" height="18" viewBox="0 0 18 18"><path d="M0 14 L0 18 L18 18" fill="none" stroke={CYAN} strokeWidth="1.5" opacity={glow ? 0.8 : 0.35} /></svg>
      </div>
      <div style={{ position: "absolute", bottom: -1, right: -1, width: 18, height: 18, pointerEvents: "none" }}>
        <svg width="18" height="18" viewBox="0 0 18 18"><path d="M0 18 L18 18 L18 14" fill="none" stroke={CYAN} strokeWidth="1.5" opacity={glow ? 0.8 : 0.35} /></svg>
      </div>
      {/* Glow edge lines */}
      {glow && (
        <div style={{
          position: "absolute", inset: 0, borderRadius: "inherit", pointerEvents: "none",
          boxShadow: `inset 0 0 15px ${CYAN}10, 0 0 10px ${CYAN}08`,
        }} />
      )}
      {children}
    </div>
  );
}

/* ── Scan line overlay ───── */
function ScanLines() {
  return (
    <div style={{
      position: "absolute", inset: 0, pointerEvents: "none", zIndex: 2, opacity: 0.03,
      background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(34,211,238,0.15) 2px, rgba(34,211,238,0.15) 3px)",
    }} />
  );
}

/* ── Mini data readout widget ───── */
function DataReadout({ label, value, unit, color = CYAN }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 8, fontWeight: 700, color: `${color}60`, textTransform: "uppercase", letterSpacing: "0.15em", ...NB }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 900, color, lineHeight: 1.1, ...N }}>{value}</div>
      {unit && <div style={{ fontSize: 8, color: `${color}40`, fontWeight: 600, ...NB }}>{unit}</div>}
    </div>
  );
}

export default function KS2QuizShell({
  question, options = [], passage, questionIndex = 0, totalQuestions = 20,
  selectedAnswer, onSelect, onSubmit, onSkip, onClose,
  subjectLabel = "Science", xp = 0, timeLeft, streak = 0,
  taraHint, isCorrect, showResult, explanation, missionTitle,
  leftPanelContent, taraEIBWidget, canProceed,
}) {
  const formatTime = (s) => {
    if (!s && s !== 0) return "";
    const m = Math.floor(s / 60); const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const progress = totalQuestions > 0 ? ((questionIndex) / totalQuestions) * 100 : 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4" style={{
      background: "rgba(2,6,18,0.97)", backdropFilter: "blur(16px)",
    }}>

    {/* ── Grid / tech background ── */}
    <div style={{
      position: "fixed", inset: 0, pointerEvents: "none", opacity: 0.04,
      backgroundImage: `
        linear-gradient(${CYAN} 1px, transparent 1px),
        linear-gradient(90deg, ${CYAN} 1px, transparent 1px)
      `,
      backgroundSize: "50px 50px",
    }} />

    <div className="w-full flex flex-col overflow-hidden shadow-2xl" style={{
      maxWidth: "960px", maxHeight: "90vh",
      background: "linear-gradient(170deg, #020b1a 0%, #061220 35%, #0a1628 65%, #020b1a 100%)",
      border: `1px solid ${CYAN}25`,
      borderRadius: 4,
      boxShadow: `0 0 40px ${CYAN}08, inset 0 1px 0 ${CYAN}10`,
      position: "relative",
    }}>
      <ScanLines />

      {/* ═══ TOP HUD BAR ═══════════════════════════════════════════ */}
      <header className="flex items-center justify-between px-4 md:px-6 py-2 shrink-0" style={{
        background: "linear-gradient(90deg, rgba(34,211,238,0.03) 0%, rgba(2,11,26,0.95) 30%, rgba(2,11,26,0.95) 70%, rgba(34,211,238,0.03) 100%)",
        borderBottom: `1px solid ${CYAN}15`,
        position: "relative", zIndex: 3,
      }}>
        {/* Left: Brand */}
        <div className="flex items-center gap-3">
          <div style={{
            width: 28, height: 28, borderRadius: 2,
            border: `1px solid ${CYAN}40`,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: `${CYAN}08`,
          }}>
            <span style={{ fontSize: 14 }}>🛰️</span>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, color: CYAN, letterSpacing: "0.2em", ...N }}>ORBITAL COMMAND</div>
            <div style={{ fontSize: 8, color: `${CYAN}40`, letterSpacing: "0.15em", fontWeight: 600, ...NB }}>MISSION ACTIVE • SECTOR {questionIndex + 1}</div>
          </div>
        </div>

        {/* Center: Progress bar */}
        <div className="hidden sm:flex items-center gap-3 flex-1 max-w-[240px] mx-6">
          <div style={{
            flex: 1, height: 4, borderRadius: 2, overflow: "hidden",
            background: `${CYAN}08`, border: `1px solid ${CYAN}10`,
          }}>
            <div style={{
              height: "100%", width: `${progress}%`,
              background: `linear-gradient(90deg, ${CYAN}, #06b6d4)`,
              boxShadow: `0 0 8px ${CYAN}50`,
              transition: "width 0.5s ease",
            }} />
          </div>
          <span style={{ fontSize: 10, fontWeight: 800, color: `${CYAN}80`, ...NB }}>
            {Math.round(progress)}%
          </span>
        </div>

        {/* Right: Data readouts */}
        <div className="flex items-center gap-4">
          <DataReadout label="XP" value={xp.toLocaleString()} />
          {streak > 0 && <DataReadout label="Streak" value={streak} color="#fbbf24" />}
          {timeLeft != null && <DataReadout label="Time" value={formatTime(timeLeft)} />}
          <div style={{
            width: 28, height: 28, borderRadius: 2,
            border: `1px solid ${CYAN}20`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 900, color: CYAN, ...N,
            background: `${CYAN}05`,
          }}>
            {String(questionIndex + 1).padStart(2, "0")}
          </div>
          <button onClick={onClose} className="flex items-center justify-center" style={{
            width: 28, height: 28, borderRadius: 2,
            border: `1px solid rgba(239,68,68,0.2)`,
            background: "rgba(239,68,68,0.05)",
            color: "#f87171", fontSize: 12, cursor: "pointer",
          }} title="Exit mission">✕</button>
        </div>
      </header>

      {/* ═══ SPLIT CONTENT ═══════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden" style={{ position: "relative", zIndex: 3 }}>

        {/* ─── LEFT: Mission Narrative ──────────────────────────── */}
        <div className="lg:w-1/2 overflow-y-auto p-5 md:p-8 max-h-[38vh] lg:max-h-none"
          style={{ borderRight: `1px solid ${CYAN}08` }}>

          {leftPanelContent ? (
            <div className="h-full">{leftPanelContent}</div>
          ) : (
            <>
              <div style={{ fontSize: 9, fontWeight: 800, color: `${CYAN}50`, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 8, ...NB }}>
                ▸ CURRENT OBJECTIVE
              </div>

              <h1 style={{
                fontSize: "clamp(20px, 4vw, 28px)", fontWeight: 900, color: "#e2e8f0",
                marginBottom: 20, lineHeight: 1.25, ...NB,
              }}>
                {missionTitle || `Mission #${String(questionIndex + 1).padStart(3, "0")}: ${subjectLabel}`}
              </h1>

              {/* Passage in HUD frame */}
              {passage && (
                <HudFrame glow style={{
                  background: `linear-gradient(135deg, rgba(34,211,238,0.03), rgba(6,18,32,0.9))`,
                  border: `1px solid ${CYAN}12`,
                  borderRadius: 2, padding: 20, marginBottom: 20,
                }}>
                  <div style={{ fontSize: 13, color: "rgba(226,232,240,0.7)", lineHeight: 1.7, ...NB }}>
                    {passage.split("\n").filter(Boolean).map((p, i) => (
                      <p key={i} style={{ marginBottom: 8 }}>{p}</p>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <span style={{
                      fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase",
                      padding: "3px 10px", borderRadius: 2, ...NB,
                      background: `${CYAN}10`, color: `${CYAN}90`, border: `1px solid ${CYAN}20`,
                    }}>
                      {subjectLabel}
                    </span>
                    <span style={{
                      fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase",
                      padding: "3px 10px", borderRadius: 2, ...NB,
                      background: "rgba(251,191,36,0.08)", color: "rgba(251,191,36,0.7)", border: "1px solid rgba(251,191,36,0.15)",
                    }}>
                      LVL {questionIndex + 1}
                    </span>
                  </div>
                </HudFrame>
              )}

              {/* Tara comm panel */}
              <HudFrame style={{
                background: `${CYAN}04`,
                border: `1px solid ${CYAN}10`,
                borderRadius: 2, padding: 16,
              }}>
                <div className="flex items-center gap-3 mb-3">
                  <div style={{
                    width: 32, height: 32, borderRadius: 2,
                    background: `${CYAN}10`, border: `1px solid ${CYAN}20`,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
                  }}>🛰️</div>
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 800, color: CYAN, ...NB }}>Commander Tara</span>
                    <span style={{ fontSize: 8, color: `${CYAN}40`, marginLeft: 8, fontWeight: 700, letterSpacing: "0.1em", ...NB }}>COMM LINK ACTIVE</span>
                  </div>
                </div>
                <p style={{ fontSize: 12, color: "rgba(226,232,240,0.45)", lineHeight: 1.6, ...NB }}>
                  {taraHint || `Welcome back, Commander. Sector ${questionIndex + 1} scan complete. Analyze readings and confirm findings.`}
                </p>
              </HudFrame>

              {!passage && (
                <div style={{
                  marginTop: 20, padding: 32, textAlign: "center", borderRadius: 2,
                  border: `1px dashed ${CYAN}12`, background: `${CYAN}02`,
                }}>
                  <span style={{ fontSize: 32, display: "block", marginBottom: 8 }}>📡</span>
                  <p style={{ fontSize: 11, color: `${CYAN}30`, fontWeight: 700, ...NB }}>AWAITING MISSION DATA...</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* ─── RIGHT: MCQ Panel ──────────────────────────────── */}
        <div className="lg:w-1/2 overflow-y-auto p-4 md:p-6 flex flex-col"
          style={{ background: "rgba(2,11,26,0.6)" }}>

          {/* Task badge */}
          <div className="flex items-center gap-3 mb-3">
            <span style={{
              padding: "3px 12px", borderRadius: 2,
              fontSize: 10, fontWeight: 900, letterSpacing: "0.15em", ...N,
              background: `${CYAN}10`, color: CYAN, border: `1px solid ${CYAN}25`,
            }}>
              TASK {String(questionIndex + 1).padStart(2, "0")}
            </span>
            <span style={{ fontSize: 9, color: `${CYAN}25`, letterSpacing: "0.15em", fontWeight: 700, ...NB }}>MISSION BRIEFING</span>
          </div>

          {/* Question */}
          <h2 style={{
            fontSize: "clamp(16px, 3.5vw, 22px)", fontWeight: 800, color: "#e2e8f0",
            marginBottom: 24, lineHeight: 1.4, ...NB,
          }}>
            {question}
          </h2>

          {/* Option buttons with HUD styling */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
            {options.map((opt, i) => {
              const selected = selectedAnswer === i;
              const correct = showResult && isCorrect && selected;
              const wrong = showResult && !isCorrect && selected;

              let borderCol = `${CYAN}10`;
              let bgCol = `${CYAN}02`;
              let letterBg = `${CYAN}08`;
              let letterCol = `${CYAN}50`;

              if (selected && !showResult) {
                borderCol = `${CYAN}50`;
                bgCol = `${CYAN}08`;
                letterBg = CYAN;
                letterCol = "#020b1a";
              }
              if (correct) {
                borderCol = "#22c55e";
                bgCol = "rgba(34,197,94,0.08)";
                letterBg = "#22c55e";
                letterCol = "#020b1a";
              }
              if (wrong) {
                borderCol = "#ef4444";
                bgCol = "rgba(239,68,68,0.08)";
                letterBg = "#ef4444";
                letterCol = "#fff";
              }

              return (
                <button key={i} onClick={() => !showResult && onSelect?.(i)}
                  style={{
                    width: "100%", textAlign: "left",
                    padding: "10px 14px",
                    borderRadius: 2,
                    background: bgCol,
                    border: `1px solid ${borderCol}`,
                    display: "flex", alignItems: "center", gap: 12,
                    cursor: showResult ? "default" : "pointer",
                    transition: "all 0.15s ease",
                    boxShadow: selected && !showResult ? `0 0 12px ${CYAN}15, inset 0 0 12px ${CYAN}05` : correct ? "0 0 12px rgba(34,197,94,0.15)" : "none",
                  }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 2,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 900,
                    background: letterBg, color: letterCol,
                    border: `1px solid ${borderCol}`,
                    flexShrink: 0, ...N,
                  }}>
                    {correct ? "✓" : wrong ? "✗" : OPTION_LETTERS[i]}
                  </div>
                  <span style={{ fontSize: 13, color: "rgba(226,232,240,0.8)", fontWeight: 600, ...NB }}>
                    {typeof opt === "string" ? opt : opt?.text || opt}
                  </span>
                  {correct && <span style={{ marginLeft: "auto", color: "#22c55e", fontSize: 14 }}>✓</span>}
                </button>
              );
            })}
          </div>

          {/* Explanation */}
          {showResult && explanation && (
            <HudFrame style={{
              marginTop: 16, padding: 16, borderRadius: 2,
              background: isCorrect ? "rgba(34,197,94,0.04)" : "rgba(239,68,68,0.04)",
              border: `1px solid ${isCorrect ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)"}`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 12 }}>{isCorrect ? "✅" : "💡"}</span>
                <span style={{ fontSize: 10, fontWeight: 800, color: isCorrect ? "#22c55e" : "#f87171", letterSpacing: "0.1em", ...NB }}>
                  {isCorrect ? "CONFIRMED" : "CORRECTION"}
                </span>
              </div>
              <p style={{ fontSize: 12, color: "rgba(226,232,240,0.5)", lineHeight: 1.6, ...NB }}>{explanation}</p>
            </HudFrame>
          )}

          {taraEIBWidget}

          {/* Streak bonus */}
          {streak > 0 && (
            <div style={{
              marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "8px 14px", borderRadius: 2,
              background: "rgba(251,191,36,0.04)", border: "1px solid rgba(251,191,36,0.12)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12 }}>⚡</span>
                <span style={{ fontSize: 9, fontWeight: 800, color: "rgba(251,191,36,0.5)", letterSpacing: "0.1em", ...NB }}>STREAK BONUS</span>
              </div>
              <span style={{ fontSize: 11, fontWeight: 900, color: "#fbbf24", ...N }}>+{streak * 10} XP</span>
            </div>
          )}

          {/* Actions */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginTop: 20, paddingTop: 14,
            borderTop: `1px solid ${CYAN}08`,
          }}>
            <div />
            <button onClick={onSubmit} disabled={selectedAnswer == null && !showResult}
              style={{
                padding: "10px 28px", borderRadius: 2,
                fontSize: 12, fontWeight: 900, letterSpacing: "0.1em",
                display: "flex", alignItems: "center", gap: 8,
                cursor: selectedAnswer != null || showResult ? "pointer" : "default",
                opacity: selectedAnswer == null && !showResult ? 0.3 : 1,
                transition: "all 0.2s",
                ...N,
                ...(showResult ? {
                  background: CYAN,
                  color: "#020b1a",
                  border: `1px solid ${CYAN}`,
                  boxShadow: `0 0 20px ${CYAN}30`,
                } : {
                  background: `${CYAN}12`,
                  color: CYAN,
                  border: `1px solid ${CYAN}30`,
                  boxShadow: selectedAnswer != null ? `0 0 15px ${CYAN}15` : "none",
                }),
              }}>
              {showResult ? "NEXT MISSION ▸" : "CONFIRM"} 🚀
            </button>
          </div>

          <p style={{
            fontSize: 8, color: `${CYAN}12`, textAlign: "center", marginTop: 10,
            letterSpacing: "0.2em", fontWeight: 700, ...NB,
          }}>
            ◆ ORBITAL COMMAND • AWAITING CONFIRMATION ◆
          </p>
        </div>
      </div>
    </div>

    {/* ── Fonts ── */}
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@400;500;600;700&display=swap');
    `}</style>
    </div>
  );
}
