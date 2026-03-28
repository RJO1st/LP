"use client";
/**
 * NebulaTrials.jsx
 * Deploy to: src/components/game/NebulaTrials.jsx
 *
 * LaunchPard's speed-based times tables trainer — Number Nebula realm.
 * Features:
 *   - Three modes: Orbital Run (random all tables), Target Lock (one table focus), Warp Trial (beat your best time)
 *   - Speed scoring: faster answers = more Stardust XP
 *   - Personal best tracking (localStorage)
 *   - Live "Speed Rank" — Cadet → Navigator → Commander → Admiral → Legend
 *   - Per-table mastery grid showing weak/strong tables
 *   - Combo multiplier (streak × speed = bonus XP)
 *   - Animated number pad + keyboard input
 *   - Saves results to Supabase via props callback
 *
 * Props:
 *   student      { id, name } — current scholar
 *   onClose      () => void
 *   onXPEarned   (xp: number) => void   — hook to award Stardust
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  X, Zap, Star, Trophy, Target, Clock, ChevronRight,
  RefreshCw, Music, Swords, BookOpen, TrendingUp, Award,
  ArrowLeft, CheckCircle, XCircle, Flame,
} from "lucide-react";

const PhaserScene = dynamic(() => import("@/components/phaser/PhaserScene"), { ssr: false });

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const TABLES  = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const LAUNCH_Q   = 20;   // questions per Launch session
const DRILL_Q = 15;  // questions per Studio session

// Speed rank thresholds (avg ms per correct answer)
const SPEED_RANKS = [
  { label: "Legend",    emoji: "⭐", maxMs: 1500,  color: "#f59e0b", xpMult: 3.0 },
  { label: "Admiral",   emoji: "🚀", maxMs: 2500,  color: "#6366f1", xpMult: 2.0 },
  { label: "Commander", emoji: "🌟", maxMs: 4000,  color: "#0891b2", xpMult: 1.5 },
  { label: "Navigator", emoji: "🧭", maxMs: 6000,  color: "#059669", xpMult: 1.2 },
  { label: "Cadet",     emoji: "🛸", maxMs: Infinity, color: "#64748b", xpMult: 1.0 },
];

function getRank(avgMs) {
  return SPEED_RANKS.find(r => avgMs <= r.maxMs) || SPEED_RANKS[SPEED_RANKS.length - 1];
}

// XP per correct: base 10, modified by speed and combo
function calcXP(msElapsed, combo) {
  const speedBonus = msElapsed < 1500 ? 3 : msElapsed < 3000 ? 2 : msElapsed < 5000 ? 1.5 : 1;
  const comboBonus = Math.min(combo, 5); // cap at 5x
  return Math.round(10 * speedBonus * (1 + comboBonus * 0.1));
}

// ─── LOCAL BEST STORAGE ──────────────────────────────────────────────────────
const LS_KEY = "lp_tt_bests";
function loadBests() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); } catch { return {}; }
}
function saveBest(table, avgMs) {
  const bests = loadBests();
  if (!bests[table] || avgMs < bests[table]) {
    bests[table] = avgMs;
    try { localStorage.setItem(LS_KEY, JSON.stringify(bests)); } catch {}
  }
}

// ─── QUESTION GENERATOR ──────────────────────────────────────────────────────
function makeQuestion(table) {
  const a = table;
  const b = TABLES[Math.floor(Math.random() * TABLES.length)];
  // Randomly flip so kids can't rely on order
  return Math.random() > 0.5
    ? { a, b, answer: a * b, text: `${a} × ${b}` }
    : { a: b, b: a, answer: a * b, text: `${b} × ${a}` };
}

function makeLaunchQuestions(count) {
  const qs = [];
  for (let i = 0; i < count; i++) {
    const table = TABLES[Math.floor(Math.random() * TABLES.length)];
    qs.push(makeQuestion(table));
  }
  return qs;
}

function makeDrillQuestions(table, count) {
  return Array.from({ length: count }, () => makeQuestion(table));
}

// ─── SUB COMPONENTS ──────────────────────────────────────────────────────────

function SpeedBar({ msElapsed, maxMs = 8000 }) {
  const pct = Math.max(0, Math.min(100, 100 - (msElapsed / maxMs) * 100));
  const color = pct > 60 ? "#10b981" : pct > 30 ? "#f59e0b" : "#ef4444";
  return (
    <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-none"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}

function NumberPad({ onPress, onDelete, onEnter }) {
  const KEYS = [
    ["7","8","9"],
    ["4","5","6"],
    ["1","2","3"],
    ["⌫","0","↵"],
  ];
  return (
    <div className="grid gap-2.5 w-full max-w-[240px] mx-auto">
      {KEYS.map((row, ri) => (
        <div key={ri} className="grid grid-cols-3 gap-2.5">
          {row.map(k => {
            const isAction = k === "⌫" || k === "↵";
            return (
              <button
                key={k}
                onClick={() => {
                  if (k === "⌫") onDelete();
                  else if (k === "↵") onEnter();
                  else onPress(k);
                }}
                className="h-14 rounded-2xl font-black text-xl transition-all active:scale-90 select-none"
                style={{
                  backgroundColor: isAction ? "#334155" : "#1e293b",
                  color: k === "↵" ? "#10b981" : k === "⌫" ? "#f87171" : "#f1f5f9",
                  boxShadow: "0 4px 0 rgba(0,0,0,0.4)",
                }}
              >
                {k}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function ComboFlame({ combo }) {
  if (combo < 3) return null;
  return (
    <div className="flex items-center gap-1 animate-bounce">
      <Flame size={16} className="text-orange-400" />
      <span className="text-orange-400 font-black text-sm">{combo}× COMBO!</span>
    </div>
  );
}

// ─── MODE SELECT SCREEN ──────────────────────────────────────────────────────
function ModeSelect({ student, onSelect, onClose }) {
  const bests  = loadBests();
  const hasAny = Object.keys(bests).length > 0;

  const modes = [
    {
      id:    "launch",
      icon:  <Music size={28} />,
      title: "Orbital Run",
      sub:   "All tables · 20 questions · Full speed",
      color: "#6366f1",
      desc:  "Random mix from × 2 to × 12 — race the clock across the full orbit for max Stardust.",
    },
    {
      id:    "drill",
      icon:  <BookOpen size={28} />,
      title: "Target Lock",
      sub:   "Pick one table · 15 questions · Precision",
      color: "#0891b2",
      desc:  "Zero in on one table at a time. Perfect for locking down weak spots.",
    },
    {
      id:    "grid",
      icon:  <span style={{ fontSize: 26 }}>⊞</span>,
      title: "Grid Fill",
      sub:   "Multiplication square · Fill the blanks",
      color: "#10b981",
      desc:  "A times table grid with blanks hidden. Tap each cell and type the missing product — build the whole picture.",
    },
    {
      id:    "warp",
      icon:  <Swords size={28} />,
      title: "Warp Trial",
      sub:   "Race your ghost · Beat your best time",
      color: "#f59e0b",
      desc:  hasAny ? "Your ghost is waiting in the warp. Can you beat your personal best?" : "Complete an Orbital Run first to unlock your ghost time.",
      locked: !hasAny,
    },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 flex items-center justify-between">
        <div>
          <p className="text-indigo-300 text-xs font-black tracking-widest uppercase mb-0.5">LaunchPard</p>
          <h1 className="text-2xl font-black text-white">Nebula Trials</h1>
          <p className="text-slate-400 text-sm mt-0.5">Orbital Run · Target Lock · Warp Trial</p>
        </div>
        <button onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white">
          <X size={18} />
        </button>
      </div>

      {/* Welcome */}
      <div className="mx-5 mb-4 px-4 py-3 rounded-2xl bg-white/5 border border-white/10">
        <p className="text-white font-bold text-sm">
          👋 Ready, {student?.name || "Cadet"}? Answer fast = more Stardust ⚡
        </p>
      </div>

      {/* Mode cards */}
      <div className="flex-1 px-5 space-y-3 overflow-y-auto">
        {modes.map(m => (
          <button
            key={m.id}
            onClick={() => !m.locked && onSelect(m.id)}
            disabled={m.locked}
            className={`w-full text-left rounded-2xl p-4 transition-all active:scale-[0.98] ${
              m.locked ? "opacity-50 cursor-not-allowed" : "hover:scale-[1.01]"
            }`}
            style={{ background: `${m.color}18`, border: `1.5px solid ${m.color}44` }}
          >
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${m.color}33`, color: m.color }}>
                {m.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-white font-black text-base">{m.title}</p>
                  {m.locked && <span className="text-[10px] bg-slate-600 text-slate-300 px-2 py-0.5 rounded-full font-bold">LOCKED</span>}
                </div>
                <p className="text-xs font-bold mb-1" style={{ color: m.color }}>{m.sub}</p>
                <p className="text-slate-400 text-xs leading-snug">{m.desc}</p>
              </div>
              {!m.locked && <ChevronRight size={18} className="text-slate-500 shrink-0 mt-1" />}
            </div>
          </button>
        ))}

        {/* Mastery grid */}
        <div className="mt-2 rounded-2xl p-4 bg-white/5 border border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={14} className="text-indigo-400" />
            <p className="text-sm font-black text-white">Table Mastery</p>
          </div>
          <div className="grid grid-cols-6 gap-1.5">
            {TABLES.map(t => {
              const best = bests[`gig_${t}`] || bests[`studio_${t}`];
              const rank = best ? getRank(best) : null;
              return (
                <div key={t}
                  className="aspect-square rounded-xl flex flex-col items-center justify-center"
                  style={{
                    backgroundColor: rank ? `${rank.color}22` : "#ffffff0a",
                    border: `1.5px solid ${rank ? rank.color + "44" : "#ffffff12"}`,
                  }}
                >
                  <span className="text-[10px] font-black" style={{ color: rank ? rank.color : "#475569" }}>
                    ×{t}
                  </span>
                  {rank && <span className="text-[8px]">{rank.emoji}</span>}
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-slate-500 mt-2 text-center">
            Complete sessions to colour in your mastery grid
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── STUDIO TABLE PICKER ─────────────────────────────────────────────────────
function TablePicker({ onPick, onBack, title = "Target Lock", subtitle = "Pick a table to practise" }) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-6 pb-4 flex items-center gap-3">
        <button onClick={onBack}
          className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h2 className="text-xl font-black text-white">{title}</h2>
          <p className="text-slate-400 text-xs">{subtitle}</p>
        </div>
      </div>
      <div className="flex-1 px-5 grid grid-cols-3 gap-3 content-start overflow-y-auto">
        {TABLES.map(t => {
          const bests = loadBests();
          const best  = bests[`studio_${t}`];
          const rank  = best ? getRank(best) : null;
          return (
            <button
              key={t}
              onClick={() => onPick(t)}
              className="aspect-square rounded-2xl flex flex-col items-center justify-center transition-all active:scale-90"
              style={{
                background: rank ? `${rank.color}22` : "rgba(255,255,255,0.06)",
                border: `2px solid ${rank ? rank.color + "55" : "rgba(255,255,255,0.1)"}`,
              }}
            >
              <span className="text-3xl font-black text-white">×{t}</span>
              {rank ? (
                <span className="text-[11px] font-bold mt-0.5" style={{ color: rank.color }}>
                  {rank.emoji} {rank.label}
                </span>
              ) : (
                <span className="text-[11px] text-slate-500 mt-0.5">Not tried</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── QUIZ SCREEN ─────────────────────────────────────────────────────────────
function QuizScreen({ questions, mode, table, student, onDone, onBack, phaserEvent }) {
  const [qIdx,      setQIdx]      = useState(0);
  const [input,     setInput]     = useState("");
  const [feedback,  setFeedback]  = useState(null); // null | "correct" | "wrong"
  const [combo,     setCombo]     = useState(0);
  const [totalXP,   setTotalXP]   = useState(0);
  const [times,     setTimes]     = useState([]); // ms per correct answer
  const [elapsed,   setElapsed]   = useState(0);
  const [results,   setResults]   = useState([]);

  const qStartRef  = useRef(Date.now());
  const timerRef   = useRef(null);

  const q = questions[qIdx];

  // Per-question elapsed timer
  useEffect(() => {
    qStartRef.current = Date.now();
    setElapsed(0);
    timerRef.current = setInterval(() => {
      setElapsed(Date.now() - qStartRef.current);
    }, 50);
    return () => clearInterval(timerRef.current);
  }, [qIdx]);

  const handleSubmit = useCallback(() => {
    if (!input || feedback) return;
    clearInterval(timerRef.current);
    const ms        = Date.now() - qStartRef.current;
    const isCorrect = parseInt(input, 10) === q.answer;
    const xp        = isCorrect ? calcXP(ms, combo) : 0;
    const newCombo  = isCorrect ? combo + 1 : 0;

    setFeedback(isCorrect ? "correct" : "wrong");
    setCombo(newCombo);
    setTotalXP(p => p + xp);
    if (isCorrect) setTimes(p => [...p, ms]);
    setResults(p => [...p, { q: q.text, answer: q.answer, given: parseInt(input, 10), isCorrect, ms, xp }]);

    // ── Phaser visual events ──
    if (phaserEvent) {
      phaserEvent("combo", newCombo);
      phaserEvent("progress", (qIdx + 1) / questions.length);
      const avgMs = isCorrect
        ? [...times, ms].reduce((a, b) => a + b, 0) / ([...times, ms].length)
        : times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 9999;
      phaserEvent("speedRank", getRank(avgMs));
      // Trigger correct/wrong with a changing value so registry fires changedata
      phaserEvent(isCorrect ? "triggerCorrect" : "triggerWrong", Date.now());
    }

    setTimeout(() => {
      setFeedback(null);
      setInput("");
      if (qIdx < questions.length - 1) {
        setQIdx(p => p + 1);
      } else {
        // Session complete
        const allTimes   = [...times, ...(isCorrect ? [ms] : [])];
        const correctAll = [...results, { isCorrect }].filter(r => r.isCorrect).length;
        const avgMs      = allTimes.length > 0 ? allTimes.reduce((a, b) => a + b, 0) / allTimes.length : 9999;
        const rank       = getRank(avgMs);

        // Save bests
        if (table) saveBest(`studio_${table}`, avgMs);
        else saveBest("gig_all", avgMs);

        onDone({
          results: [...results, { q: q.text, answer: q.answer, given: parseInt(input, 10), isCorrect, ms, xp }],
          totalXP: totalXP + xp,
          avgMs,
          rank,
          correct: correctAll,
          total:   questions.length,
        });
      }
    }, 600);
  }, [input, feedback, combo, q, qIdx, questions.length, times, results, totalXP, table, onDone, phaserEvent]);

  // Keyboard support — placed after handleSubmit so the dep array can reference it directly.
  // Without a dep array this ran every render; with [handleSubmit] it re-attaches only when
  // handleSubmit changes (i.e. when input/combo/qIdx change), preventing stale closure on Enter.
  useEffect(() => {
    const handler = (e) => {
      if (feedback) return;
      if (e.key >= "0" && e.key <= "9") setInput(p => p.length < 4 ? p + e.key : p);
      if (e.key === "Backspace") setInput(p => p.slice(0, -1));
      if (e.key === "Enter") handleSubmit();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [feedback, handleSubmit]);

  const progress = ((qIdx) / questions.length) * 100;

  const bgColor =
    feedback === "correct" ? "rgba(16,185,129,0.15)" :
    feedback === "wrong"   ? "rgba(239,68,68,0.15)"  :
    "transparent";

  return (
    <div className="flex flex-col h-full" style={{ background: bgColor, transition: "background 0.2s" }}>
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between mb-3">
          <button onClick={onBack}
            className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white">
            <X size={15} />
          </button>
          <div className="flex items-center gap-3">
            <ComboFlame combo={combo} />
            <div className="flex items-center gap-1.5 bg-white/10 rounded-xl px-3 py-1.5">
              <Zap size={13} className="text-amber-400" />
              <span className="text-amber-400 font-black text-sm">{totalXP} XP</span>
            </div>
          </div>
          <span className="text-slate-400 text-sm font-bold">{qIdx + 1}/{questions.length}</span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mb-3">
          <div className="h-full bg-indigo-400 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }} />
        </div>

        {/* Speed bar */}
        <SpeedBar msElapsed={elapsed} />
      </div>

      {/* Question */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 gap-4">
        <div
          className="w-full max-w-[280px] rounded-3xl p-6 text-center"
          style={{ background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(255,255,255,0.12)" }}
        >
          <p className="text-slate-400 text-sm font-bold mb-2">What is</p>
          <p className="text-5xl font-black text-white mb-2">{q.text}</p>
          <p className="text-slate-400 text-sm">= ?</p>
        </div>

        {/* Answer display */}
        <div className="w-full max-w-[280px]">
          <div
            className="w-full h-16 rounded-2xl flex items-center justify-center text-4xl font-black transition-all"
            style={{
              background: feedback === "correct" ? "rgba(16,185,129,0.25)"
                        : feedback === "wrong"   ? "rgba(239,68,68,0.25)"
                        : "rgba(255,255,255,0.08)",
              border: feedback === "correct" ? "2px solid #10b981"
                    : feedback === "wrong"   ? "2px solid #ef4444"
                    : "2px solid rgba(255,255,255,0.12)",
              color: feedback === "correct" ? "#10b981"
                   : feedback === "wrong"   ? "#ef4444"
                   : "#f1f5f9",
            }}
          >
            {feedback === "correct" ? `✓ ${q.answer}` :
             feedback === "wrong"   ? `✗ ${q.answer}` :
             input || "·"}
          </div>
        </div>
      </div>

      {/* Number pad */}
      <div className="px-5 pb-6">
        <NumberPad
          onPress={k => !feedback && setInput(p => p.length < 4 ? p + k : p)}
          onDelete={() => setInput(p => p.slice(0, -1))}
          onEnter={handleSubmit}
        />
      </div>
    </div>
  );
}

// ─── RESULTS SCREEN ──────────────────────────────────────────────────────────
function ResultsScreen({ data, mode, table, student, onReplay, onMenu, onClose }) {
  const { results, totalXP, avgMs, rank, correct, total } = data;
  const accuracy = Math.round((correct / total) * 100);

  useEffect(() => {
    // Surface XP back to parent asynchronously — no-op if not provided
  }, [totalXP]);

  const wrongOnes = results.filter(r => !r.isCorrect);
  const avgSecs   = (avgMs / 1000).toFixed(1);

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 text-center"
        style={{ background: `linear-gradient(180deg, ${rank.color}18 0%, transparent 100%)` }}>
        <p className="text-6xl mb-2">{rank.emoji}</p>
        <h2 className="text-2xl font-black text-white">{rank.label}!</h2>
        <p className="text-slate-400 text-sm mt-1">
          {accuracy >= 90 ? "Incredible! You nailed it! 🔥" :
           accuracy >= 70 ? "Great work — keep pushing! 💪" :
           "Good effort — practice makes perfect! 🚀"}
        </p>
      </div>

      {/* Stats */}
      <div className="mx-5 grid grid-cols-3 gap-2.5 mb-4">
        {[
          { label: "Correct",  value: `${correct}/${total}`,  color: "#10b981", icon: <CheckCircle size={13} /> },
          { label: "Avg Speed", value: `${avgSecs}s`,         color: rank.color, icon: <Clock size={13} /> },
          { label: "Stardust",  value: `+${totalXP}`,         color: "#f59e0b", icon: <Zap size={13} /> },
        ].map(s => (
          <div key={s.label}
            className="rounded-2xl p-3 text-center"
            style={{ background: `${s.color}15`, border: `1.5px solid ${s.color}30` }}>
            <div className="flex items-center justify-center gap-1 mb-1" style={{ color: s.color }}>
              {s.icon}
              <span className="text-[10px] font-bold uppercase tracking-widest">{s.label}</span>
            </div>
            <p className="text-xl font-black text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Speed rank bar */}
      <div className="mx-5 mb-4 rounded-2xl px-4 py-3 bg-white/5 border border-white/10">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Speed Ranks</p>
        <div className="flex justify-between items-center gap-1">
          {SPEED_RANKS.slice().reverse().map(r => (
            <div key={r.label}
              className="flex-1 text-center py-1.5 rounded-xl text-[9px] font-black transition-all"
              style={{
                backgroundColor: r.label === rank.label ? `${r.color}33` : "transparent",
                border: r.label === rank.label ? `1.5px solid ${r.color}77` : "1.5px solid transparent",
                color: r.label === rank.label ? r.color : "#475569",
              }}
            >
              {r.emoji}<br/>{r.label}
            </div>
          ))}
        </div>
      </div>

      {/* Weak tables */}
      {wrongOnes.length > 0 && (
        <div className="mx-5 mb-4 rounded-2xl p-4 bg-red-500/10 border border-red-500/20">
          <div className="flex items-center gap-2 mb-2">
            <XCircle size={14} className="text-red-400" />
            <p className="text-sm font-black text-white">To practise</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[...new Set(wrongOnes.map(r => {
              const parts = r.q.split(" × ");
              return `${parts[0]} × ${parts[1]}`;
            }))].map(q => (
              <span key={q}
                className="bg-red-500/20 text-red-300 text-xs font-bold px-2.5 py-1 rounded-xl">
                {q}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="px-5 pb-6 space-y-2.5 mt-auto pt-2">
        <button
          onClick={onReplay}
          className="w-full py-3.5 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 active:scale-95 transition-all"
          style={{ background: `linear-gradient(135deg, ${rank.color}, #7c3aed)` }}
        >
          <RefreshCw size={15} />
          Play Again
        </button>
        <button
          onClick={onMenu}
          className="w-full py-3.5 rounded-2xl font-black text-sm text-slate-300 flex items-center justify-center gap-2 active:scale-95 transition-all bg-white/5 border border-white/10"
        >
          <Target size={15} />
          Change Mode
        </button>
        <button
          onClick={onClose}
          className="w-full py-3 text-sm text-slate-500 font-bold"
        >
          Return to Base
        </button>
      </div>
    </div>
  );
}

// ─── GRID FILL SCREEN ────────────────────────────────────────────────────────
// Shows a 12-cell row for the chosen table (n × 1 through n × 12).
// A random 40–60% of cells are blanked. Scholar taps a blank, types the answer.
// After all blanks are filled a results summary shows.

const GRID_COLORS = [
  "#6366f1","#ec4899","#0891b2","#10b981",
  "#f59e0b","#ef4444","#7c3aed","#059669",
  "#d97706","#1d4ed8","#be185d","#0e7490",
];

function GridFillScreen({ table, onDone, onBack }) {
  // Build the 12 cells for this table
  const cells = useMemo(() => {
    const all = Array.from({ length: 12 }, (_, i) => ({
      multiplier: i + 1,
      product:    table * (i + 1),
    }));
    // Randomly blank 5–8 cells
    const blankCount = 5 + Math.floor(Math.random() * 4); // 5–8
    const indices    = [...Array(12).keys()].sort(() => Math.random() - 0.5).slice(0, blankCount);
    return all.map((c, i) => ({ ...c, isBlank: indices.includes(i) }));
  }, [table]);

  const [answers,  setAnswers]  = useState({}); // index → string value typed
  const [active,   setActive]   = useState(() => cells.findIndex(c => c.isBlank)); // which blank is focused
  const [checked,  setChecked]  = useState(false); // reveal mode after "Check Answers"
  const [input,    setInput]    = useState("");
  const [xp,       setXP]       = useState(0);
  const inputRef = useRef(null);

  const blanks   = cells.map((c, i) => c.isBlank ? i : -1).filter(i => i >= 0);
  // Include the currently-typed (but not yet committed) input so "Check Answers"
  // appears as soon as the scholar types in the last cell without an extra Confirm tap.
  const allFilled = blanks.every(i =>
    i === active
      ? input !== ""
      : (answers[i] !== undefined && answers[i] !== "")
  );

  const advanceBlank = useCallback((dir) => {
    setActive(prev => {
      const idx  = blanks.indexOf(prev);
      const next = blanks[(idx + dir + blanks.length) % blanks.length];
      setInput(answers[next] ?? "");
      return next;
    });
  }, [blanks, answers]);

  const confirmCell = useCallback(() => {
    if (input === "") return;
    setAnswers(p => ({ ...p, [active]: input }));
    const remaining = blanks.filter(i => i !== active && !answers[i]);
    if (remaining.length > 0) {
      setActive(remaining[0]);
      setInput(answers[remaining[0]] ?? "");
    }
    // If this was the last blank, leave active/input as-is so allFilled triggers
  }, [input, active, blanks, answers]);

  // Keyboard — dep array prevents stale closures on confirmCell/advanceBlank
  useEffect(() => {
    const handler = (e) => {
      if (checked) return;
      if (e.key >= "0" && e.key <= "9") setInput(p => p.length < 3 ? p + e.key : p);
      if (e.key === "Backspace") setInput(p => p.slice(0, -1));
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); confirmCell(); }
      if (e.key === "ArrowRight") advanceBlank(1);
      if (e.key === "ArrowLeft")  advanceBlank(-1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [checked, confirmCell, advanceBlank]);

  function handleCheck() {
    // commit current input before checking
    const finalAnswers = { ...answers, [active]: input };
    setAnswers(finalAnswers);
    setChecked(true);

    const correct = blanks.filter(i => parseInt(finalAnswers[i], 10) === cells[i].product).length;
    const earned  = correct * 8;
    setXP(earned);
    onDone?.({ correct, total: blanks.length, xp: earned, table });
  }

  const accentColor = GRID_COLORS[(table - 2) % GRID_COLORS.length];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-center gap-3 shrink-0">
        <button onClick={onBack}
          className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white shrink-0">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-black uppercase tracking-widest mb-0.5" style={{ color: accentColor }}>
            Grid Fill · ×{table} table
          </p>
          <p className="text-slate-400 text-[11px]">
            {checked ? `${blanks.filter(i => parseInt(answers[i], 10) === cells[i].product).length}/${blanks.length} correct` : `${blanks.length} blanks to fill`}
          </p>
        </div>
        {checked && (
          <div className="flex items-center gap-1 bg-amber-500/20 rounded-xl px-3 py-1.5">
            <Zap size={13} className="text-amber-400" />
            <span className="text-amber-400 font-black text-sm">+{xp} XP</span>
          </div>
        )}
      </div>

      {/* The multiplication grid row */}
      <div className="px-4 mb-4 shrink-0">
        {/* Column header row */}
        <div className="grid mb-1" style={{ gridTemplateColumns: `48px repeat(12, 1fr)`, gap: 3 }}>
          {/* Top-left × label */}
          <div className="h-8 rounded-lg flex items-center justify-center font-black text-sm text-white"
            style={{ background: accentColor }}>
            ×{table}
          </div>
          {/* Column multipliers 1–12 */}
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i}
              className="h-8 rounded-lg flex items-center justify-center text-[11px] font-black text-white"
              style={{ background: `${accentColor}44` }}>
              {i + 1}
            </div>
          ))}
        </div>

        {/* Product row */}
        <div className="grid" style={{ gridTemplateColumns: `48px repeat(12, 1fr)`, gap: 3 }}>
          {/* Row label */}
          <div className="h-12 rounded-lg flex items-center justify-center text-sm font-black text-white"
            style={{ background: `${accentColor}44` }}>
            {table}
          </div>

          {/* Cells */}
          {cells.map((cell, i) => {
            const isActive  = active === i;
            const isBlank   = cell.isBlank;
            const answered  = answers[i];
            const isCorrect = checked && parseInt(answers[i], 10) === cell.product;
            const isWrong   = checked && isBlank && !isCorrect;

            const bg = !isBlank   ? `${accentColor}22`
                     : isCorrect  ? "rgba(16,185,129,0.25)"
                     : isWrong    ? "rgba(239,68,68,0.25)"
                     : isActive   ? `${accentColor}44`
                     :              "rgba(255,255,255,0.07)";

            const border = !isBlank   ? `1.5px solid ${accentColor}33`
                         : isCorrect  ? "1.5px solid #10b981"
                         : isWrong    ? "1.5px solid #ef4444"
                         : isActive   ? `2px solid ${accentColor}`
                         :              "1.5px solid rgba(255,255,255,0.12)";

            return (
              <button
                key={i}
                disabled={!isBlank || checked}
                onClick={() => {
                  if (!isBlank || checked) return;
                  setActive(i);
                  setInput(answers[i] ?? "");
                }}
                className="h-12 rounded-lg flex items-center justify-center transition-all"
                style={{ background: bg, border }}
              >
                {!isBlank ? (
                  <span className="text-[13px] font-black" style={{ color: accentColor }}>
                    {cell.product}
                  </span>
                ) : isCorrect ? (
                  <span className="text-[13px] font-black text-emerald-400">{cell.product}</span>
                ) : isWrong ? (
                  <div className="flex flex-col items-center leading-none">
                    <span className="text-[11px] font-black text-red-400 line-through opacity-60">{answers[i]}</span>
                    <span className="text-[11px] font-black text-emerald-400">{cell.product}</span>
                  </div>
                ) : isActive ? (
                  <span className="text-[13px] font-black text-white">
                    {input || <span className="opacity-30">?</span>}
                  </span>
                ) : answered ? (
                  <span className="text-[13px] font-black text-slate-300">{answered}</span>
                ) : (
                  <span className="text-[13px] font-black text-slate-600">?</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Full 12×12 mini preview (collapsed, shows context) */}
      <div className="mx-4 mb-3 shrink-0">
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1.5 px-1">
          Full ×{table} sequence
        </p>
        <div className="flex gap-1 flex-wrap">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i}
              className="rounded-lg px-2 py-1 text-[11px] font-bold"
              style={{
                background: cells[i].isBlank ? "rgba(255,255,255,0.06)" : `${accentColor}22`,
                color: cells[i].isBlank ? "#475569" : accentColor,
                border: cells[i].isBlank ? "1px dashed rgba(255,255,255,0.12)" : `1px solid ${accentColor}33`,
              }}>
              {table}×{i+1}={cells[i].isBlank ? "?" : cells[i].product}
            </div>
          ))}
        </div>
      </div>

      {/* Active cell input + number pad */}
      {!checked && (
        <div className="flex-1 flex flex-col justify-end px-4 pb-5">
          {/* Active cell label */}
          {active >= 0 && (
            <div className="text-center mb-3">
              <p className="text-slate-400 text-sm">
                What is <span className="text-white font-black">{table} × {cells[active]?.multiplier}</span>?
              </p>
              <div
                className="mx-auto mt-2 w-24 h-12 rounded-2xl flex items-center justify-center text-3xl font-black"
                style={{
                  background: input ? `${accentColor}22` : "rgba(255,255,255,0.07)",
                  border: `2px solid ${input ? accentColor : "rgba(255,255,255,0.12)"}`,
                  color: input ? accentColor : "#475569",
                }}>
                {input || "·"}
              </div>
            </div>
          )}

          <NumberPad
            onPress={k => setInput(p => p.length < 3 ? p + k : p)}
            onDelete={() => setInput(p => p.slice(0, -1))}
            onEnter={confirmCell}
          />

          <div className="flex gap-2.5 mt-3">
            <button
              onClick={() => advanceBlank(-1)}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-400 bg-white/5 border border-white/10">
              ← Prev
            </button>
            <button
              onClick={confirmCell}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white active:scale-95 transition-all"
              style={{ background: accentColor }}>
              Confirm ↵
            </button>
            <button
              onClick={() => advanceBlank(1)}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-400 bg-white/5 border border-white/10">
              Next →
            </button>
          </div>

          {allFilled && (
            <button
              onClick={handleCheck}
              className="w-full mt-3 py-3.5 rounded-2xl font-black text-sm text-white active:scale-95 transition-all"
              style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}>
              Check Answers ✓
            </button>
          )}
        </div>
      )}

      {/* Post-check summary */}
      {checked && (
        <div className="flex-1 flex flex-col justify-end px-4 pb-5">
          {(() => {
            const correct = blanks.filter(i => parseInt(answers[i], 10) === cells[i].product).length;
            const pct     = Math.round((correct / blanks.length) * 100);
            return (
              <div className="rounded-2xl p-4 mb-3 text-center"
                style={{ background: "rgba(16,185,129,0.1)", border: "1.5px solid rgba(16,185,129,0.25)" }}>
                <p className="text-4xl font-black text-white mb-1">
                  {correct}/{blanks.length}
                </p>
                <p className="text-emerald-400 font-bold text-sm">
                  {pct >= 100 ? "Perfect! All correct! 🌟" :
                   pct >= 70  ? "Great work! 🚀" : "Keep practising! 💪"}
                </p>
              </div>
            );
          })()}
          <button
            onClick={onBack}
            className="w-full py-3.5 rounded-2xl font-black text-sm text-white active:scale-95 transition-all"
            style={{ background: `linear-gradient(135deg, ${accentColor}, #7c3aed)` }}>
            Try Another Table
          </button>
        </div>
      )}
    </div>
  );
}


// ─── PHASER BACKGROUND ────────────────────────────────────────────────────────
// Loads the NebulaTrialsScene and renders as a full-screen background canvas.
// The gameRef lets parent components trigger visual events via registry.
function PhaserBackground({ gameRef, totalQuestions = 20, width, height }) {
  const [sceneClass, setSceneClass] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const PhaserModule = await import("phaser");
        const Phaser = PhaserModule.default || PhaserModule;
        const { createNebulaTrialsScene } = await import("@/components/phaser/NebulaTrialsScene");
        const SceneClass = createNebulaTrialsScene(Phaser);
        if (!cancelled && SceneClass) setSceneClass(() => SceneClass);
      } catch (err) {
        console.warn("PhaserBackground: failed to load", err);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const reactData = useMemo(() => ({
    totalQuestions,
    combo: 0,
    progress: 0,
    speedRank: { label: "Cadet", color: "#64748b" },
  }), [totalQuestions]);

  if (!sceneClass) return null;

  return (
    <PhaserScene
      sceneClass={sceneClass}
      reactData={reactData}
      width={width}
      height={height}
      gameRef={gameRef}
      className="nebula-trials-bg"
    />
  );
}

export default function NebulaTrials({ student, onClose, onXPEarned }) {
  const [screen,    setScreen]    = useState("menu");   // menu | table_pick | grid_pick | quiz | grid | results
  const [mode,      setMode]      = useState(null);     // launch | drill | grid | warp
  const [table,     setTable]     = useState(null);     // 2–12
  const [questions, setQuestions] = useState([]);
  const [doneData,  setDoneData]  = useState(null);

  // Phaser background
  const gameRef = useRef(null);
  const containerRef = useRef(null);
  const [containerSize, setContainerSize] = useState({ w: 400, h: 760 });

  // Measure the main container so the Phaser canvas fills it exactly
  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r) setContainerSize({ w: Math.round(r.width), h: Math.round(r.height) });
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  // Helper: push event to Phaser registry
  const phaserEvent = useCallback((key, value) => {
    try {
      gameRef.current?.registry?.set(key, value);
    } catch {}
  }, []);

  const startMode = useCallback((selectedMode) => {
    setMode(selectedMode);
    if (selectedMode === "drill") {
      setScreen("table_pick");
    } else if (selectedMode === "grid") {
      setScreen("grid_pick");
    } else {
      setQuestions(makeLaunchQuestions(LAUNCH_Q));
      setScreen("quiz");
    }
  }, []);

  const startDrill = useCallback((t) => {
    setTable(t);
    setQuestions(makeDrillQuestions(t, DRILL_Q));
    setScreen("quiz");
  }, []);

  const startGrid = useCallback((t) => {
    setTable(t);
    setScreen("grid");
  }, []);

  const handleDone = useCallback((data) => {
    setDoneData(data);
    setScreen("results");
    onXPEarned?.(data.totalXP);
  }, [onXPEarned]);

  const handleGridDone = useCallback((data) => {
    onXPEarned?.(data.xp);
  }, [onXPEarned]);

  const handleReplay = useCallback(() => {
    if (mode === "drill" && table) {
      setQuestions(makeDrillQuestions(table, DRILL_Q));
    } else {
      setQuestions(makeLaunchQuestions(LAUNCH_Q));
    }
    setScreen("quiz");
  }, [mode, table]);

  return (
    <div
      className="fixed inset-0 z-[8000] flex items-center justify-center"
      style={{
        backgroundColor: "#000",
        background: "radial-gradient(ellipse at 50% 0%, #1e1b4b 0%, #0f0e1a 60%, #000 100%)",
        isolation: "isolate",
      }}
    >
      <div
        ref={containerRef}
        className="relative w-full h-full sm:max-w-sm sm:max-h-[760px] sm:rounded-3xl overflow-hidden flex flex-col"
        style={{ backgroundColor: "#0f0e1a", border: "1.5px solid rgba(99,102,241,0.3)" }}
      >
        {/* Phaser animated background — renders behind all UI */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <PhaserBackground
            gameRef={gameRef}
            totalQuestions={questions.length || 20}
            width={containerSize.w}
            height={containerSize.h}
          />
        </div>

        {/* All UI content sits above the Phaser canvas */}
        <div className="relative z-10 flex flex-col flex-1 min-h-0">
          {screen === "menu" && (
            <ModeSelect student={student} onSelect={startMode} onClose={onClose} />
          )}
          {screen === "table_pick" && (
            <TablePicker onPick={startDrill} onBack={() => setScreen("menu")} />
          )}
          {screen === "grid_pick" && (
            <TablePicker
              onPick={startGrid}
              onBack={() => setScreen("menu")}
              title="Grid Fill"
              subtitle="Pick a table — then fill the blanks"
            />
          )}
          {screen === "quiz" && (
            <QuizScreen
              questions={questions} mode={mode} table={table} student={student}
              onDone={handleDone} onBack={() => setScreen("menu")}
              phaserEvent={phaserEvent}
            />
          )}
          {screen === "grid" && (
            <GridFillScreen
              table={table}
              onDone={handleGridDone}
              onBack={() => setScreen("grid_pick")}
            />
          )}
          {screen === "results" && doneData && (
            <ResultsScreen
              data={doneData} mode={mode} table={table} student={student}
              onReplay={handleReplay} onMenu={() => setScreen("menu")} onClose={onClose}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// STARS_BG removed — replaced by Phaser animated background