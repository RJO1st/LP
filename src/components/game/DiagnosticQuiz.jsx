"use client";
/**
 * DiagnosticQuiz.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * First-run diagnostic assessment. Shown once per scholar × subject.
 * 2 questions per topic, fast-paced, no pressure framing.
 * Results seed the learning path via learningPathEngine.generateLearningPath().
 *
 * Props:
 *   scholar    - scholar DB row
 *   subject    - e.g. "mathematics"
 *   curriculum - e.g. "uk_national"
 *   yearLevel  - e.g. 6
 *   questions  - pre-fetched diagnostic questions array (from API)
 *   onComplete - callback(diagnosticResult) when done
 *   onSkip     - optional callback to skip diagnostic
 *
 * → src/components/game/DiagnosticQuiz.jsx
 */

import { useState, useEffect, useRef } from "react";
import { scoreDiagnostic } from "@/lib/masteryEngine";
import { getSubjectLabel } from "@/lib/subjectDisplay";

const TARA_MESSAGES = {
  start:    "No pressure — just answer what you know. I use this to build your perfect learning path! 🗺️",
  correct:  ["Nice work! ⭐", "You know this one! 🚀", "Brilliant! Keep going!", "Stellar! ✨"],
  incorrect:["No worries — I've noted that! 📋", "Good try! That's exactly why we do this. 📝", "I'll make sure we cover this properly. 🎯"],
  halfway:  "Halfway there, Commander! You're doing great — keep going 🚀",
  complete: "Mission complete! I've mapped your learning path. Let's launch! 🌟",
};

export default function DiagnosticQuiz({
  scholar,
  subject,
  curriculum,
  yearLevel,
  questions = [],
  onComplete,
  onSkip,
}) {
  const [currentIdx, setCurrentIdx]   = useState(0);
  const [answers,    setAnswers]       = useState([]);
  const [selected,   setSelected]      = useState(null);     // index chosen
  const [revealed,   setRevealed]      = useState(false);    // show correct/wrong
  const [taraMsg,    setTaraMsg]       = useState(TARA_MESSAGES.start);
  const [phase,      setPhase]         = useState("intro");  // intro → quiz → results
  const [results,    setResults]       = useState(null);
  const timerRef = useRef(null);

  const total   = questions.length;
  const current = questions[currentIdx];
  const pct     = total > 0 ? Math.round((currentIdx / total) * 100) : 0;

  // Clear timer on unmount
  useEffect(() => () => clearTimeout(timerRef.current), []);

  function handleAnswer(optionIdx) {
    if (revealed) return;
    const correct = optionIdx === current.correct_index;
    setSelected(optionIdx);
    setRevealed(true);

    // Tara reaction
    const pool = correct ? TARA_MESSAGES.correct : TARA_MESSAGES.incorrect;
    setTaraMsg(pool[Math.floor(Math.random() * pool.length)]);

    const newAnswers = [
      ...answers,
      {
        topic:     current._diagnostic_topic ?? current.topic,
        correct,
        questionId: current.id,
      },
    ];
    setAnswers(newAnswers);

    // Auto-advance after 1.2s
    timerRef.current = setTimeout(() => {
      const next = currentIdx + 1;
      if (next >= total) {
        // Done
        const diagnosticResult = scoreDiagnostic(newAnswers);
        setResults(diagnosticResult);
        setTaraMsg(TARA_MESSAGES.complete);
        setPhase("results");
      } else {
        if (next === Math.floor(total / 2)) setTaraMsg(TARA_MESSAGES.halfway);
        setCurrentIdx(next);
        setSelected(null);
        setRevealed(false);
      }
    }, 1200);
  }

  function handleComplete() {
    onComplete?.({
      ...results,
      subject,
      curriculum,
      yearLevel,
      totalAnswered: total,
    });
  }

  // ── INTRO PHASE ────────────────────────────────────────────────────────────
  if (phase === "intro") {
    return (
      <div className="fixed inset-0 z-50 bg-[#0a0e27] flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="text-6xl mb-5">🗺️</div>
          <h1 className="text-3xl font-black text-white mb-3">Quick Assessment</h1>
          <p className="text-slate-400 mb-6 leading-relaxed">
            Before we build your personalised learning path for{" "}
            <span className="text-indigo-400 font-bold capitalize">{getSubjectLabel(subject)}</span>,
            Tara will ask you {total} quick questions to see where you're starting from.
          </p>

          {/* Tara */}
          <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700 mb-8 flex items-start gap-3">
            <div className="text-3xl">🤖</div>
            <p className="text-slate-300 text-sm text-left italic">
              "{TARA_MESSAGES.start}"
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => setPhase("quiz")}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-black text-white text-lg transition-all active:scale-95"
            >
              🚀 Start Assessment
            </button>
            {onSkip && (
              <button
                onClick={onSkip}
                className="w-full py-2 text-slate-500 hover:text-slate-300 text-sm transition-colors"
              >
                Skip — I'll start from scratch
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── RESULTS PHASE ──────────────────────────────────────────────────────────
  if (phase === "results" && results) {
    const correct = answers.filter(a => a.correct).length;
    const pctCorrect = Math.round((correct / total) * 100);

    const levelLabels = {
      above_year:  { emoji: "🌟", label: "Above Year Level",  desc: "You've got strong foundations. We'll start with more advanced topics." },
      at_year:     { emoji: "📈", label: "At Year Level",      desc: "Good foundations. Your path will balance review with new topics." },
      below_year:  { emoji: "🔄", label: "Building Foundations", desc: "We'll start from the core skills and build up step by step." },
    };
    const levelInfo = levelLabels[results.estimatedLevel] ?? levelLabels.at_year;

    // Topic scores sorted — show top 3 strong and top 3 weak
    const topicEntries = Object.entries(results.topicScores)
      .sort(([, a], [, b]) => b - a);
    const strong = topicEntries.filter(([, s]) => s >= 0.5).slice(0, 3);
    const weak   = topicEntries.filter(([, s]) => s <  0.5).slice(0, 3);

    return (
      <div className="fixed inset-0 z-50 bg-[#0a0e27] overflow-y-auto">
        <div className="min-h-screen flex items-start justify-center p-6 pt-12">
          <div className="max-w-md w-full">

            {/* Score */}
            <div className="text-center mb-8">
              <div className="text-6xl mb-3">{levelInfo.emoji}</div>
              <h1 className="text-3xl font-black text-white mb-2">Assessment Complete!</h1>
              <p className="text-slate-400">
                {correct}/{total} correct — {pctCorrect}% accuracy
              </p>
            </div>

            {/* Level */}
            <div className="bg-indigo-900/40 border border-indigo-700/40 rounded-2xl p-5 mb-5 text-center">
              <p className="text-indigo-400 text-xs uppercase tracking-widest mb-1">Estimated Level</p>
              <p className="text-2xl font-black text-white mb-2">{levelInfo.label}</p>
              <p className="text-slate-300 text-sm">{levelInfo.desc}</p>
            </div>

            {/* Tara */}
            <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700 mb-5 flex items-start gap-3">
              <div className="text-2xl">🤖</div>
              <p className="text-slate-300 text-sm italic">"{taraMsg}"</p>
            </div>

            {/* Topic breakdown */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {strong.length > 0 && (
                <div className="bg-emerald-900/30 border border-emerald-700/30 rounded-xl p-3">
                  <p className="text-xs font-bold text-emerald-400 mb-2">💪 Strong areas</p>
                  {strong.map(([topic, score]) => (
                    <p key={topic} className="text-xs text-slate-300 capitalize">
                      · {topic.replace(/_/g, " ")}
                    </p>
                  ))}
                </div>
              )}
              {weak.length > 0 && (
                <div className="bg-red-900/30 border border-red-700/30 rounded-xl p-3">
                  <p className="text-xs font-bold text-red-400 mb-2">🎯 Focus areas</p>
                  {weak.map(([topic, score]) => (
                    <p key={topic} className="text-xs text-slate-300 capitalize">
                      · {topic.replace(/_/g, " ")}
                    </p>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleComplete}
              className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl font-black text-white text-lg transition-all active:scale-95 shadow-lg shadow-indigo-900/40"
            >
              🗺️ Build My Learning Path
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── QUIZ PHASE ─────────────────────────────────────────────────────────────
  if (phase === "quiz" && current) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0a0e27] flex flex-col p-6">

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Question {currentIdx + 1} of {total}</span>
            <span className="capitalize">{current._diagnostic_topic?.replace(/_/g, " ") ?? current.topic}</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2">
            <div
              className="h-2 rounded-full bg-indigo-500 transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Tara */}
        <div className="bg-slate-800/50 rounded-xl px-4 py-3 mb-5 flex items-center gap-3 border border-slate-700/50">
          <span className="text-xl">🤖</span>
          <p className="text-slate-300 text-xs italic">{taraMsg}</p>
        </div>

        {/* Question */}
        <div className="flex-1 flex flex-col justify-center">
          <p className="text-white font-bold text-lg leading-relaxed mb-8 text-center">
            {current.question_text}
          </p>

          {/* Options */}
          <div className="space-y-3">
            {(current.options ?? []).map((opt, i) => {
              const isSelected = selected === i;
              const isCorrect  = i === current.correct_index;
              let bg = "bg-slate-800 border-slate-700 hover:border-indigo-400 hover:bg-slate-700";

              if (revealed) {
                if (isCorrect)          bg = "bg-emerald-900/60 border-emerald-500";
                else if (isSelected)    bg = "bg-red-900/60 border-red-500";
                else                    bg = "bg-slate-800/40 border-slate-700 opacity-50";
              }

              return (
                <button
                  key={i}
                  onClick={() => handleAnswer(i)}
                  disabled={revealed}
                  className={`w-full p-4 rounded-xl border text-left transition-all text-sm font-medium ${bg} text-white`}
                >
                  <span className="text-slate-400 mr-3">
                    {["A", "B", "C", "D"][i]}.
                  </span>
                  {opt}
                  {revealed && isCorrect  && <span className="float-right">✅</span>}
                  {revealed && isSelected && !isCorrect && <span className="float-right">❌</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Difficulty label */}
        <div className="mt-6 text-center">
          <span className="text-xs text-slate-600 uppercase tracking-widest">
            Diagnostic · {current.difficulty_tier ?? "mixed"}
          </span>
        </div>
      </div>
    );
  }

  return null;
}
