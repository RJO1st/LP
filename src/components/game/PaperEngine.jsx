"use client";
/**
 * PaperEngine.jsx
 * Deploy to: src/components/game/PaperEngine.jsx
 *
 * Generic paper-based test engine. Handles:
 *   - ISEB Pre-Test papers
 *   - 11+ mock papers
 *   - SATs practice
 *   - Subject mock tests (Chemistry, Physics, Biology, Maths, English…)
 *   - Diagnostic papers (no timer)
 *
 * Key behaviours:
 *   - No instant feedback during the paper
 *   - Optional countdown timer (null = untimed)
 *   - "Next" button — no auto-advance on answer
 *   - Full mark sheet revealed at end with per-question breakdown
 *   - Tara explanations available post-marking only
 *   - XP/coins awarded via onComplete callback
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { PAPER_CONFIGS, CATEGORIES } from "../../lib/mockTestCatalogue";

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const fmt = (secs) => {
  if (secs === null || secs === undefined) return "∞";
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

const pct = (n, total) => (total === 0 ? 0 : Math.round((n / total) * 100));

const getGrade = (score) => {
  if (score >= 85) return { label: "Distinction", color: "#10b981" };
  if (score >= 70) return { label: "Merit",       color: "#6366f1" };
  if (score >= 55) return { label: "Pass",         color: "#f59e0b" };
  return               { label: "Below Pass",      color: "#ef4444" };
};

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

function PaperHeader({ testConfig, currentQ, total, timeLeft, maxTime, onExit }) {
  const timed  = maxTime !== null && maxTime !== undefined;
  const urgent = timed && timeLeft < 120;
  const timePct = timed ? (timeLeft / maxTime) * 100 : 100;
  const catDef = CATEGORIES[testConfig?.category] ?? CATEGORIES.subject_practice;

  return (
    <div style={{
      background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
      borderBottom: "1px solid #334155",
      padding: "12px 20px",
      position: "sticky", top: 0, zIndex: 50,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            background: catDef.color, color: "white", borderRadius: 6,
            padding: "3px 8px", fontSize: 10, fontWeight: 800,
            letterSpacing: "0.08em", textTransform: "uppercase",
          }}>
            {catDef.emoji} {catDef.label}
          </div>
          <span style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600 }}>
            {testConfig?.label ?? "Mock Test"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            background: urgent ? "#7f1d1d" : "#1e293b",
            border: `1px solid ${urgent ? "#ef4444" : "#334155"}`,
            borderRadius: 8, padding: "4px 10px", transition: "all 0.3s",
          }}>
            <span style={{ fontSize: 14 }}>
              {!timed ? "∞" : urgent ? "⚠️" : "⏱"}
            </span>
            <span style={{
              fontFamily: "monospace", fontSize: 16, fontWeight: 800,
              color: urgent ? "#fca5a5" : "#e2e8f0", letterSpacing: "0.05em",
            }}>
              {timed ? fmt(timeLeft) : "No limit"}
            </span>
          </div>
          <button
            onClick={onExit}
            style={{
              background: "transparent", border: "1px solid #475569",
              color: "#94a3b8", borderRadius: 6, padding: "4px 10px",
              fontSize: 11, fontWeight: 600, cursor: "pointer",
            }}
          >Exit</button>
        </div>
      </div>
      {/* Progress */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 11, color: "#64748b", whiteSpace: "nowrap" }}>
          Q {currentQ + 1} / {total}
        </span>
        <div style={{ flex: 1, height: 4, background: "#1e3a5f", borderRadius: 2, overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 2,
            background: `linear-gradient(90deg, ${catDef.color}, #8b5cf6)`,
            width: `${pct(currentQ + 1, total)}%`,
            transition: "width 0.3s ease",
          }} />
        </div>
        {timed && (
          <>
            <div style={{ flex: 1, height: 4, background: "#1e293b", borderRadius: 2, overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 2,
                background: urgent
                  ? "linear-gradient(90deg, #ef4444, #f97316)"
                  : "linear-gradient(90deg, #10b981, #06b6d4)",
                width: `${timePct}%`, transition: "width 1s linear",
              }} />
            </div>
            <span style={{ fontSize: 11, color: "#64748b", whiteSpace: "nowrap" }}>time</span>
          </>
        )}
      </div>
    </div>
  );
}

function QuestionCard({ question, qIndex, chosenIndex, onSelect }) {
  const qText = question.q ?? question.question_text ?? "";
  const opts  = question.opts ?? question.options ?? [];

  return (
    <div style={{
      background: "white", borderRadius: 16,
      boxShadow: "0 4px 24px rgba(0,0,0,0.08)", overflow: "hidden",
    }}>
      <div style={{
        background: "linear-gradient(135deg, #f8fafc, #f1f5f9)",
        borderBottom: "1px solid #e2e8f0",
        padding: "12px 20px", display: "flex", alignItems: "center", gap: 10,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: "50%",
          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "white", fontSize: 12, fontWeight: 800, flexShrink: 0,
        }}>{qIndex + 1}</div>
        <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Question {qIndex + 1}
        </span>
        {chosenIndex !== undefined && chosenIndex !== null && (
          <span style={{
            marginLeft: "auto", fontSize: 10, fontWeight: 700,
            color: "#10b981", background: "#dcfce7", borderRadius: 4, padding: "2px 6px",
          }}>ANSWERED</span>
        )}
      </div>

      {question.passage && (
        <div style={{
          padding: "16px 20px", background: "#f8fafc",
          borderBottom: "1px solid #e2e8f0",
          fontSize: 13, lineHeight: 1.7, color: "#374151", fontStyle: "italic",
          maxHeight: 180, overflowY: "auto",
        }}>
          {question.passage}
        </div>
      )}

      <div style={{ padding: "20px 20px 12px", fontSize: 17, fontWeight: 700, color: "#0f172a", lineHeight: 1.5 }}>
        {qText}
      </div>

      <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        {opts.map((opt, i) => {
          const isChosen = chosenIndex === i;
          const letter = String.fromCharCode(65 + i);
          return (
            <button
              key={i}
              onClick={() => onSelect(i)}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "12px 14px",
                background: isChosen ? "#ede9fe" : "#f8fafc",
                border: `2px solid ${isChosen ? "#6366f1" : "#e2e8f0"}`,
                borderRadius: 10, cursor: "pointer", textAlign: "left",
                transition: "all 0.15s ease",
                fontSize: 14, color: isChosen ? "#4338ca" : "#374151",
                fontWeight: isChosen ? 700 : 500,
              }}
            >
              <span style={{
                width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: isChosen ? "#6366f1" : "#e2e8f0",
                color: isChosen ? "white" : "#64748b",
                fontSize: 12, fontWeight: 800,
              }}>{letter}</span>
              <span style={{ flex: 1 }}>
                {typeof opt === "string" ? opt : opt?.text ?? JSON.stringify(opt)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function NavigationBar({ currentQ, total, answers, onPrev, onNext, onSubmit }) {
  const answered = Object.keys(answers).length;
  const isLast   = currentQ === total - 1;
  const hasAnswer = answers[currentQ] !== undefined && answers[currentQ] !== null;

  return (
    <div style={{
      background: "white", borderTop: "1px solid #e2e8f0",
      padding: "12px 20px", position: "sticky", bottom: 0,
      display: "flex", alignItems: "center", gap: 12,
    }}>
      <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, flex: 1 }}>
        <span style={{ color: answered === total ? "#10b981" : "#6366f1", fontWeight: 800 }}>
          {answered}
        </span>/{total} answered
      </div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", maxWidth: 200 }}>
        {Array.from({ length: total }, (_, i) => (
          <div key={i} style={{
            width: 8, height: 8, borderRadius: "50%",
            background: i === currentQ ? "#6366f1"
              : answers[i] !== undefined ? "#10b981" : "#e2e8f0",
          }} />
        ))}
      </div>
      <button
        onClick={onPrev}
        disabled={currentQ === 0}
        style={{
          padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0",
          background: "white", color: "#64748b", fontSize: 13, fontWeight: 600,
          cursor: currentQ === 0 ? "not-allowed" : "pointer",
          opacity: currentQ === 0 ? 0.4 : 1,
        }}
      >← Back</button>
      {isLast ? (
        <button
          onClick={onSubmit}
          style={{
            padding: "8px 20px", borderRadius: 8, border: "none",
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer",
            boxShadow: "0 4px 12px rgba(99,102,241,0.4)",
          }}
        >Submit Paper ✓</button>
      ) : (
        <button
          onClick={onNext}
          style={{
            padding: "8px 20px", borderRadius: 8, border: "none",
            background: hasAnswer ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "#f1f5f9",
            color: hasAnswer ? "white" : "#94a3b8",
            fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}
        >Next →</button>
      )}
    </div>
  );
}

function ResultsScreen({ testConfig, questions, answers, timeTaken, maxTime, onClose, onReview }) {
  const total   = questions.length;
  const correct = questions.filter((q, i) => answers[i] === (q.a ?? q.correct_index ?? 0)).length;
  const score   = pct(correct, total);
  const grade   = getGrade(score);
  const catDef  = CATEGORIES[testConfig?.category] ?? CATEGORIES.subject_practice;

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "system-ui, sans-serif" }}>
      <div style={{
        background: "linear-gradient(135deg, #0f172a, #1e293b)",
        padding: "24px 20px", color: "white", textAlign: "center",
      }}>
        <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          {catDef.emoji} {testConfig?.label ?? "Mock Test"}
        </div>
        <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 4 }}>Paper Complete</div>
        {maxTime && (
          <div style={{ fontSize: 13, color: "#64748b" }}>
            Time used: {fmt(timeTaken)} / {fmt(maxTime)}
          </div>
        )}
      </div>

      <div style={{ maxWidth: 480, margin: "24px auto 0", padding: "0 16px" }}>
        <div style={{
          background: "white", borderRadius: 20,
          boxShadow: "0 8px 32px rgba(0,0,0,0.10)",
          padding: "28px 24px", textAlign: "center", marginBottom: 16,
        }}>
          <div style={{
            width: 100, height: 100, borderRadius: "50%", margin: "0 auto 12px",
            background: `conic-gradient(${grade.color} ${score * 3.6}deg, #e2e8f0 0deg)`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div style={{
              width: 78, height: 78, borderRadius: "50%", background: "white",
              display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column",
            }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: grade.color, lineHeight: 1 }}>{score}%</div>
              <div style={{ fontSize: 9, color: "#94a3b8", fontWeight: 700 }}>{correct}/{total}</div>
            </div>
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: grade.color, marginBottom: 4 }}>{grade.label}</div>
          <div style={{ fontSize: 13, color: "#64748b" }}>
            {correct} correct · {total - correct} incorrect
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
            {[
              { label: "Correct",   value: correct,         color: "#10b981" },
              { label: "Incorrect", value: total - correct, color: "#ef4444" },
              { label: "Score",     value: `${score}%`,     color: grade.color },
            ].map((s, i) => (
              <div key={i} style={{
                flex: 1, background: s.color + "11",
                border: `1px solid ${s.color}33`,
                borderRadius: 10, padding: "10px 4px",
              }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <button
            onClick={onReview}
            style={{
              flex: 1, padding: "12px", borderRadius: 10, border: "none",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer",
            }}
          >Review Answers</button>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: "12px", borderRadius: 10,
              border: "1px solid #e2e8f0", background: "white",
              color: "#374151", fontSize: 14, fontWeight: 600, cursor: "pointer",
            }}
          >Done</button>
        </div>
      </div>
    </div>
  );
}

function ReviewScreen({ questions, answers, onClose }) {
  const [expandedIdx, setExpandedIdx] = useState(null);
  const [taraReply,   setTaraReply]   = useState({});
  const [taraLoading, setTaraLoading] = useState({});
  const [taraError,   setTaraError]   = useState({}); // idx → true if last attempt failed

  const askTara = async (idx, question) => {
    setTaraLoading(l => ({ ...l, [idx]: true }));
    setTaraError(e => ({ ...e, [idx]: false }));
    const chosen  = answers[idx];
    const correct = question.a ?? question.correct_index ?? 0;
    const opts    = question.opts ?? question.options ?? [];
    try {
      const resp = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `You are Tara, a friendly and encouraging tutor for a student. Question: "${question.q ?? question.question_text}". The correct answer is "${opts[correct]}". The student chose "${opts[chosen] ?? "nothing"}". In 2-3 sentences, explain clearly why the correct answer is right. Be warm, specific, and helpful.`,
          maxTokens: 130,
        }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      setTaraReply(r => ({ ...r, [idx]: data.text ?? data.content ?? question.exp ?? "Think carefully about the key concept this question is testing." }));
    } catch {
      setTaraError(e => ({ ...e, [idx]: true }));
      // If a static explanation exists, show it as a fallback
      if (question.exp) setTaraReply(r => ({ ...r, [idx]: question.exp }));
    }
    setTaraLoading(l => ({ ...l, [idx]: false }));
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "system-ui, sans-serif" }}>
      <div style={{
        background: "linear-gradient(135deg, #0f172a, #1e293b)",
        padding: "16px 20px", color: "white",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 50,
      }}>
        <div>
          <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>Review</div>
          <div style={{ fontSize: 16, fontWeight: 800 }}>All {questions.length} Questions</div>
        </div>
        <button onClick={onClose} style={{
          background: "#1e293b", border: "1px solid #334155",
          color: "#94a3b8", borderRadius: 8, padding: "6px 14px",
          fontSize: 12, fontWeight: 600, cursor: "pointer",
        }}>← Back to Results</button>
      </div>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "16px" }}>
        {questions.map((q, idx) => {
          const opts    = q.opts ?? q.options ?? [];
          const correct = q.a ?? q.correct_index ?? 0;
          const chosen  = answers[idx];
          const isRight = chosen === correct;
          const isExpanded = expandedIdx === idx;

          return (
            <div key={idx} style={{
              background: "white", borderRadius: 14, marginBottom: 10,
              border: `2px solid ${isRight ? "#bbf7d0" : chosen !== undefined ? "#fecaca" : "#e2e8f0"}`,
              overflow: "hidden",
            }}>
              <button
                onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                style={{
                  width: "100%", padding: "14px 16px", background: "transparent",
                  border: "none", cursor: "pointer", textAlign: "left",
                  display: "flex", alignItems: "center", gap: 10,
                }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: isRight ? "#dcfce7" : chosen !== undefined ? "#fee2e2" : "#f1f5f9",
                  fontSize: 14,
                }}>
                  {isRight ? "✓" : chosen !== undefined ? "✗" : "—"}
                </div>
                <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "#374151", lineHeight: 1.4 }}>
                  <span style={{ color: "#94a3b8", marginRight: 6 }}>Q{idx + 1}.</span>
                  {(q.q ?? q.question_text ?? "").slice(0, 80)}{(q.q ?? q.question_text ?? "").length > 80 ? "…" : ""}
                </div>
                <span style={{ fontSize: 12, color: "#94a3b8" }}>{isExpanded ? "▲" : "▼"}</span>
              </button>

              {isExpanded && (
                <div style={{ padding: "0 16px 16px", borderTop: "1px solid #f1f5f9" }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", marginTop: 12, marginBottom: 10, lineHeight: 1.5 }}>
                    {q.q ?? q.question_text}
                  </div>
                  {opts.map((opt, oi) => {
                    const isCorrectOpt = oi === correct;
                    const isChosenOpt  = oi === chosen;
                    let bg = "#f8fafc", border = "#e2e8f0", color = "#374151";
                    if (isCorrectOpt) { bg = "#dcfce7"; border = "#86efac"; color = "#14532d"; }
                    else if (isChosenOpt) { bg = "#fee2e2"; border = "#fca5a5"; color = "#7f1d1d"; }
                    return (
                      <div key={oi} style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "8px 10px", marginBottom: 6, borderRadius: 8,
                        background: bg, border: `1.5px solid ${border}`,
                        fontSize: 13, color, fontWeight: isCorrectOpt || isChosenOpt ? 700 : 400,
                      }}>
                        <span style={{ fontSize: 12, fontWeight: 800, width: 18, textAlign: "center" }}>
                          {String.fromCharCode(65 + oi)}
                        </span>
                        <span style={{ flex: 1 }}>
                          {typeof opt === "string" ? opt : opt?.text ?? ""}
                        </span>
                        {isCorrectOpt && <span style={{ fontSize: 11 }}>✓ Correct</span>}
                        {isChosenOpt && !isCorrectOpt && <span style={{ fontSize: 11 }}>✗ Your answer</span>}
                      </div>
                    );
                  })}
                  {taraReply[idx] ? (
                    <div style={{
                      marginTop: 10, padding: "10px 12px", borderRadius: 10,
                      background: "linear-gradient(135deg, #ede9fe, #faf5ff)",
                      border: "1px solid #c4b5fd",
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: "#6d28d9", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        🤖 Tara
                      </div>
                      <div style={{ fontSize: 13, color: "#4c1d95", lineHeight: 1.6 }}>{taraReply[idx]}</div>
                    </div>
                  ) : taraError[idx] ? (
                    <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, color: "#ef4444" }}>Tara couldn't connect.</span>
                      <button
                        onClick={() => askTara(idx, q)}
                        style={{
                          padding: "6px 12px", borderRadius: 8, border: "1px solid #fca5a5",
                          background: "#fee2e2", color: "#7f1d1d",
                          fontSize: 12, fontWeight: 700, cursor: "pointer",
                        }}
                      >Retry ↺</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => askTara(idx, q)}
                      disabled={taraLoading[idx]}
                      style={{
                        marginTop: 10, padding: "8px 14px", borderRadius: 8,
                        background: taraLoading[idx] ? "#f3f4f6" : "linear-gradient(135deg, #7c3aed, #6366f1)",
                        color: taraLoading[idx] ? "#9ca3af" : "white",
                        border: "none", fontSize: 12, fontWeight: 700,
                        cursor: taraLoading[idx] ? "wait" : "pointer",
                      }}
                    >
                      {taraLoading[idx] ? "Tara is thinking…" : "Ask Tara to explain ✦"}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── MAIN EXPORT ──────────────────────────────────────────────────────────────
/**
 * Props:
 *   testConfig    — object from mockTestCatalogue TEST_CATALOGUE
 *   questions     — array of question_bank rows (pre-fetched by parent)
 *   onClose       — () => void
 *   onComplete    — ({ correct, total, score, timeTaken, answers, testId }) => void
 */
export default function PaperEngine({ testConfig, questions = [], onClose, onComplete }) {
  const paperCfg  = PAPER_CONFIGS[testConfig?.paperSize] ?? PAPER_CONFIGS.standard;
  const maxTime   = paperCfg.minutes ? paperCfg.minutes * 60 : null; // null = untimed
  const paperSize = Math.min(questions.length, paperCfg.questions);
  const paper     = useMemo(() => questions.slice(0, paperSize), [questions, paperSize]);

  const [phase,    setPhase]    = useState("paper");
  const [currentQ, setCurrentQ] = useState(0);
  const [answers,  setAnswers]  = useState({});
  const [timeLeft, setTimeLeft] = useState(maxTime);
  const [timeTaken, setTimeTaken] = useState(0);
  const startTime = useRef(Date.now());

  const handleSubmit = useCallback((timeout = false) => {
    const elapsed = Math.round((Date.now() - startTime.current) / 1000);
    setTimeTaken(elapsed);
    setPhase("results");
    const correct = paper.filter((q, i) => answers[i] === (q.a ?? q.correct_index ?? 0)).length;
    onComplete?.({ correct, total: paper.length, score: pct(correct, paper.length), timeTaken: elapsed, timeout, answers, testId: testConfig?.id });
  }, [paper, answers, testConfig, onComplete]);

  const handleSelect = useCallback((optionIndex) => {
    setAnswers(prev => ({ ...prev, [currentQ]: optionIndex }));
  }, [currentQ]);

  // Keep a ref to the latest handleSubmit so the interval closure never goes stale.
  // Without this, a timeout fires handleSubmit from mount which has empty answers.
  const handleSubmitRef = useRef(handleSubmit);
  useEffect(() => { handleSubmitRef.current = handleSubmit; }, [handleSubmit]);

  // Countdown — skip if untimed
  useEffect(() => {
    if (phase !== "paper" || maxTime === null) return;
    const interval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(interval); handleSubmitRef.current(true); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, maxTime]);

  if (paper.length === 0) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", flexDirection: "column", gap: 16, fontFamily: "system-ui, sans-serif" }}>
        <div style={{ fontSize: 32 }}>📄</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#374151" }}>No questions loaded for this paper.</div>
        <button onClick={onClose} style={{ padding: "10px 20px", background: "#6366f1", color: "white", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600 }}>Go Back</button>
      </div>
    );
  }

  if (phase === "results") {
    return (
      <ResultsScreen
        testConfig={testConfig}
        questions={paper}
        answers={answers}
        timeTaken={timeTaken}
        maxTime={maxTime}
        onClose={onClose}
        onReview={() => setPhase("review")}
      />
    );
  }

  if (phase === "review") {
    return <ReviewScreen questions={paper} answers={answers} onClose={() => setPhase("results")} />;
  }

  const q = paper[currentQ];
  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", fontFamily: "system-ui, sans-serif", display: "flex", flexDirection: "column" }}>
      <PaperHeader
        testConfig={testConfig}
        currentQ={currentQ}
        total={paper.length}
        timeLeft={timeLeft}
        maxTime={maxTime}
        onExit={onClose}
      />
      <div style={{ flex: 1, maxWidth: 600, width: "100%", margin: "0 auto", padding: "16px 16px 0" }}>
        <QuestionCard question={q} qIndex={currentQ} chosenIndex={answers[currentQ]} onSelect={handleSelect} />
        {currentQ === paper.length - 1 && Object.keys(answers).length < paper.length && (
          <div style={{
            marginTop: 12, padding: "10px 14px", borderRadius: 10,
            background: "#fffbeb", border: "1px solid #fde68a",
            fontSize: 12, color: "#92400e", fontWeight: 600,
          }}>
            ⚠️ {paper.length - Object.keys(answers).length} question{paper.length - Object.keys(answers).length !== 1 ? "s" : ""} still unanswered. You can go back before submitting.
          </div>
        )}
      </div>
      <NavigationBar
        currentQ={currentQ}
        total={paper.length}
        answers={answers}
        onPrev={() => setCurrentQ(q => Math.max(0, q - 1))}
        onNext={() => setCurrentQ(q => Math.min(paper.length - 1, q + 1))}
        onSubmit={() => handleSubmit(false)}
      />
    </div>
  );
}