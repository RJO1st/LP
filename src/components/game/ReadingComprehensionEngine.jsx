"use client";
/**
 * ReadingComprehensionEngine.jsx
 * Deploy to: src/app/components/quiz/ReadingComprehensionEngine.jsx
 *
 * Split-pane layout: passage always visible left, questions scroll right.
 * Supports two modes:
 *   1. PROP mode  — passageTitle + passageText + questions passed directly (legacy)
 *   2. DB mode    — fetches a passage + linked questions via get_passage_with_questions RPC
 *
 * The passage panel never unmounts between questions — it stays frozen on the left.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Brain, ArrowRight, CheckCircle, XCircle, Zap, BookOpen } from "lucide-react";
import { supabase } from "../../lib/supabase";
import ContextPanel from "./ContextPanel";
import { useTaraGate } from "./TaraEIB";
import TaraEIB from "./TaraEIB";

const THEME = {
  bg: "bg-indigo-50", border: "border-indigo-100",
  text: "text-indigo-900", accent: "text-indigo-600",
  btn: "bg-indigo-600 hover:bg-indigo-700",
};

// ── Shuffle options while preserving the correct answer ──────────────────────
function shuffleQuestion(q) {
  const opts = [...q.opts];
  const correctText = opts[q.a ?? 0];
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [opts[i], opts[j]] = [opts[j], opts[i]];
  }
  return { ...q, opts, a: opts.indexOf(correctText), correctAnswer: correctText };
}

export default function ReadingComprehensionEngine({
  student,
  // Prop mode
  passageTitle,
  passageText,
  questions: initialQuestions = [],
  // DB mode (overrides prop mode when provided)
  curriculum,
  // Shared
  onComplete,
  onClose,
}) {
  const [passage,            setPassage]            = useState(
    passageText ? { title: passageTitle, body: passageText } : null
  );
  const [normalizedQuestions, setNormalizedQuestions] = useState(() =>
    initialQuestions.map(shuffleQuestion)
  );
  const [loading,  setLoading]  = useState(!passageText && !!curriculum);
  const [qIdx,     setQIdx]     = useState(0);
  const [selected, setSelected] = useState(null);
  const [results,  setResults]  = useState({ score: 0, answers: [] });
  const [finished, setFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(420); // 7 minutes for passage set
  const [topicSummary, setTopicSummary] = useState({});

  const timerRef   = useRef(null);
  const answersRef = useRef([]);
  const resultsRef = useRef({ score: 0, answers: [] });
  const { taraComplete, onFeedbackReceived, resetTara } = useTaraGate();

  // ── DB mode: fetch passage + questions via RPC ────────────────────────────
  useEffect(() => {
    if (!curriculum || passageText) return;
    setLoading(true);
    const year = parseInt(student?.year_level || student?.year || 4, 10);
    supabase
      .rpc("get_passage_with_questions", {
        p_curriculum: curriculum,
        p_year:       year,
        p_scholar_id: student?.id || null,
        p_limit:      6,
      })
      .single()
      .then(({ data, error }) => {
        if (error || !data) { setLoading(false); return; }
        setPassage({ title: data.passage_title, body: data.passage_body });
        const qs = Array.isArray(data.question_data) ? data.question_data : [];
        setNormalizedQuestions(qs.map(shuffleQuestion));
        setLoading(false);
      });
  }, [curriculum, passageText, student]);

  // ── Timer ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (finished || loading || !passage) return;
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setFinished(true);
          finishQuest(answersRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [finished, loading, passage]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const recordTopicResult = useCallback((topic, isCorrect) => {
    if (!topic) return;
    setTopicSummary(prev => {
      const e = prev[topic] || { correct: 0, total: 0 };
      return { ...prev, [topic]: { correct: e.correct + (isCorrect ? 1 : 0), total: e.total + 1 } };
    });
  }, []);

  const handlePick = (idx) => {
    if (selected !== null) return;
    const q = normalizedQuestions[qIdx];
    const isCorrect = idx === q.a;
    setSelected(idx);
    setResults(r => {
      const next = {
        ...r,
        score: r.score + (isCorrect ? 1 : 0),
        answers: [...r.answers, { q: q.q, isCorrect, correct: q.opts[q.a], myAnswer: q.opts[idx] }],
      };
      resultsRef.current = next;
      answersRef.current = next.answers;
      return next;
    });
    recordTopicResult(q.topic || "comprehension", isCorrect);
  };

  const finishQuest = useCallback(async (overrideAnswers) => {
    clearInterval(timerRef.current);
    const answers    = overrideAnswers ?? resultsRef.current.answers;
    const finalScore = answers.filter(a => a.isCorrect).length;
    const accuracy   = normalizedQuestions.length > 0
      ? Math.round((finalScore / normalizedQuestions.length) * 100) : 0;

    if (student?.id) {
      const details = normalizedQuestions.map((q, i) => ({
        question_id: q.id || null,
        subject: "english",
        topic: q.topic || "comprehension",
        correct: answers[i]?.isCorrect ?? false,
      }));
      const { data: qrRow } = await supabase.from("quiz_results").insert({
        scholar_id: student.id, subject: "english",
        score: finalScore, questions_total: normalizedQuestions.length,
        accuracy,
        completed_at: new Date().toISOString(),
      }).select("id").single().catch(() => ({}));
      await supabase.rpc("update_scholar_skills",  { p_scholar_id: student.id, p_details: details }).catch(() => {});
      await supabase.rpc("increment_scholar_xp",   { s_id: student.id, xp_to_add: finalScore * 10 }).catch(() => {});
      // Coins + streak + quest progress (non-fatal)
      try {
        let cs = 0;
        try { const { data: sv } = await supabase.rpc("update_scholar_streak", { p_scholar_id: student.id }); cs = sv ?? 0; } catch {}
        if (qrRow?.id) {
          const { awardCoinsForQuiz } = await import("../../lib/coins");
          await awardCoinsForQuiz(supabase, { scholarId: student.id, quizResultId: qrRow.id, score: accuracy, xpEarned: finalScore * 10, topic: "comprehension", currentStreak: cs });
        }
        const { updateQuestProgress } = await import("../../lib/questSystem");
        await updateQuestProgress(student.id, { subject: "english", totalQuestions: normalizedQuestions.length, correctCount: finalScore, accuracy, timeSpent: 0 });
      } catch {}
    }
    onComplete?.({ score: finalScore, accuracy, answers, topicSummary });
  }, [normalizedQuestions, student, onComplete, topicSummary]);

  const next = () => {
    if (qIdx < normalizedQuestions.length - 1) {
      setQIdx(p => p + 1);
      setSelected(null);
      resetTara();
    } else {
      setFinished(true);
      finishQuest();
    }
  };

  // ── Render guards ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[5000] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-7 text-center max-w-xs w-full shadow-2xl">
          <BookOpen size={40} className="mx-auto text-indigo-500 mb-3 animate-bounce" />
          <h3 className="text-lg font-black text-slate-800 mb-1">Loading Passage…</h3>
          <p className="text-sm font-bold text-slate-400">Selecting your reading material</p>
        </div>
      </div>
    );
  }

  if (finished) {
    const finalScore = resultsRef.current.answers.filter(a => a.isCorrect).length;
    return (
      <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[5000] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 text-center max-w-sm w-full shadow-2xl border-b-4 border-slate-200">
          <BookOpen size={48} className="mx-auto text-indigo-500 mb-4" />
          <h2 className="text-2xl font-black text-slate-800 mb-1">Passage Complete!</h2>
          <p className="text-slate-500 font-bold mb-2">
            {finalScore} / {normalizedQuestions.length} correct
          </p>
          <p className="text-indigo-600 font-black text-lg mb-6">
            +{finalScore * 10} ✨ Stardust
          </p>
          <button
            onClick={() => onClose?.()}
            className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl shadow border-b-4 border-indigo-800 hover:bg-indigo-700 transition-all active:border-b-0 active:translate-y-1"
          >
            Return to Base
          </button>
        </div>
      </div>
    );
  }

  if (!passage || normalizedQuestions.length === 0) return null;

  const currentQ = normalizedQuestions[qIdx];
  const isCorrectAnswer = selected === currentQ.a;
  const canProceed = isCorrectAnswer || (selected !== null && !isCorrectAnswer && taraComplete);
  const mins = Math.floor(timeLeft / 60);
  const secs = (timeLeft % 60).toString().padStart(2, "0");

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[4000] flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white w-full max-w-5xl rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border-b-4 border-slate-200"
           style={{ maxHeight: "94vh" }}>

        {/* Progress bar */}
        <div className="h-1 bg-slate-100 shrink-0">
          <div className="h-full bg-indigo-500 transition-all duration-500"
               style={{ width: `${((qIdx + 1) / normalizedQuestions.length) * 100}%` }} />
        </div>

        {/* Header */}
        <div className="h-14 px-4 sm:px-6 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 text-white p-1.5 rounded-xl">
              <BookOpen size={16} />
            </div>
            <div>
              <h2 className="font-black text-indigo-900 leading-none text-sm">Reading Comprehension</h2>
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                Question {qIdx + 1} of {normalizedQuestions.length}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-sm font-black tabular-nums ${timeLeft < 60 ? "text-rose-500 animate-pulse" : "text-slate-600"}`}>
              {mins}:{secs}
            </span>
            <button onClick={() => onClose?.()} className="text-slate-400 hover:text-rose-500 transition-colors">
              <XCircle size={22} />
            </button>
          </div>
        </div>

        {/* Split content — passage stays frozen on left */}
        <div className="flex-1 flex overflow-hidden min-h-0">

          {/* LEFT: Passage — never remounts */}
          <div className="hidden sm:flex w-[45%] flex-col border-r border-indigo-100 overflow-hidden shrink-0">
            <ContextPanel passage={passage} theme={THEME} className="flex-1" />
          </div>

          {/* RIGHT: Question engine */}
          <div className="flex-1 overflow-y-auto bg-white p-4 sm:p-6">
            <div className="max-w-lg mx-auto">

              {/* Mobile: collapsed passage toggle */}
              <details className="sm:hidden mb-4 bg-indigo-50 rounded-xl border border-indigo-100">
                <summary className="px-4 py-3 font-black text-indigo-700 text-sm cursor-pointer flex items-center gap-2">
                  <BookOpen size={14} /> Read passage
                </summary>
                <div className="px-4 pb-4">
                  <ContextPanel passage={passage} theme={THEME} />
                </div>
              </details>

              <h3 className="text-base sm:text-lg font-black text-slate-800 mb-4 leading-snug">
                {currentQ.q}
              </h3>

              {/* Options */}
              <div className="space-y-2.5 mb-4">
                {currentQ.opts.map((opt, i) => {
                  const isAnswered = selected !== null;
                  const isOC       = i === currentQ.a;
                  const isSel      = selected === i;
                  let cls = "bg-white border-slate-200 hover:border-indigo-400 text-slate-700";
                  if (isAnswered) {
                    if (isOC)        cls = "bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-100";
                    else if (isSel)  cls = "bg-rose-50 border-rose-500 text-rose-700 ring-2 ring-rose-100";
                    else             cls = "bg-white border-slate-100 opacity-40";
                  }
                  return (
                    <button key={i} disabled={isAnswered} onClick={() => handlePick(i)}
                      className={`w-full px-4 py-3 rounded-xl font-bold border-2 transition-all text-left flex justify-between items-center text-sm ${cls}`}>
                      <span>{opt}</span>
                      {isAnswered && isOC  && <CheckCircle size={17} className="text-emerald-500 shrink-0" />}
                      {isAnswered && isSel && !isOC && <XCircle size={17} className="text-rose-500 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {/* Feedback */}
              {selected !== null && (
                <div className="animate-in fade-in slide-in-from-bottom-2 space-y-3">
                  <div className="p-3 bg-slate-50 rounded-xl border-l-4 border-indigo-500 flex gap-2.5 items-start">
                    <Brain size={18} className="text-indigo-500 shrink-0 mt-0.5" />
                    <p className="text-xs sm:text-sm font-bold text-slate-800 leading-relaxed">{currentQ.exp}</p>
                  </div>
                  {!isCorrectAnswer && (
                    <TaraEIB
                      student={student} subject="english"
                      currentQ={currentQ} correctAnswer={currentQ.opts[currentQ.a]}
                      onFeedbackReceived={onFeedbackReceived}
                      challengePrompt="Search the passage on the left for the answer!"
                    />
                  )}
                  {canProceed && (
                    <button onClick={next}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-3 sm:py-4 rounded-xl sm:rounded-2xl flex items-center justify-center gap-2 text-sm border-b-4 border-black transition-all active:border-b-0 active:translate-y-1">
                      {qIdx === normalizedQuestions.length - 1 ? "Finish Passage" : "Next Question"}
                      <ArrowRight size={18} />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}