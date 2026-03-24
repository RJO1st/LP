"use client";
/**
 * QuestOrchestrator.jsx
 * Deploy to: src/components/game/QuestOrchestrator.jsx
 *
 * Tier 1 additions vs production:
 *   + sessionStartRef  — tracks wall-clock time from when questions are ready
 *   + timeSpentSeconds — passed to saveQuizResult for SubjectInsightCard minutes stat
 *
 * All other logic identical to production.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Rocket, XCircle, BookOpen, LayoutGrid } from "lucide-react";
import { supabase }                from "../../lib/supabase";
import { generateSessionQuestions } from "../../lib/proceduralEngine";
import { getSmartQuestions, getTopicSequence, loadScholarContext, resolveAnchorTopic } from "../../lib/smartQuestionSelection";
import {
  validateAndFixQuestion, dbRowToQuestion,
  buildCompletionPayload, saveQuizResult, getPerQuestionTimer,
} from "../../lib/quizUtils";
import TaraEIB, { useTaraGate } from "./TaraEIB";
import ImageDisplay             from "./ImageDisplay";
import MathsVisualiser, { canVisualise } from "./MathsVisualiser";
import ReadingComprehensionEngine from "./ReadingComprehensionEngine";
import STEMEngine               from "./STEMEngine";
import HumanitiesEngine         from "./HumanitiesEngine";
import {
  EngineHeader, EngineFinished, MCQOptions, FeedbackArea, getSubjectLabels,
} from "./QuizShell";
import NarrativeIntro              from "./NarrativeIntro";
import { processAnswer }           from "../../lib/masteryEngine";
import { generateMissionLogEntry } from "../../lib/narrativeEngine";
import JourneyMap                  from "../JourneyMap";
import { useReadAloud }            from "@/hooks/useReadAloud";
import { getQuestFrame, getTimerConfig, getSubmitLabel,
         getNextLabel, getRewardLabel, getTaraFeedback } from '@/lib/questOrchestratorAdapter';
import KeyboardShortcuts from '@/components/game/KeyboardShortcuts';
import AdaptiveTimer from './AdaptiveTimer';
import { getAgeBand } from "@/lib/ageBandConfig";
import { getSubjectLabel } from "@/lib/subjectDisplay";
import KS1QuizShell from "./KS1QuizShell";
import KS2QuizShell from "./KS2QuizShell";
import KS3QuizShell from "./KS3QuizShell";
import KS4QuizShell from "./KS4QuizShell";
console.log({ KS1QuizShell, KS2QuizShell, KS3QuizShell, KS4QuizShell });
const XP_PER_QUESTION = 10;

// ─── TOPIC LABEL FORMATTER ────────────────────────────────────────────────────
// Converts raw topic slugs to specific, honest human-readable labels.
// "division" alone is too broad — we infer specificity from the questions.
export function formatTopicLabel(topicSlug, questions = []) {
  if (!topicSlug) return "Mixed Topics";
  const slug = topicSlug.toLowerCase().replace(/-/g, "_");

  // Analyse question text to infer specificity
  const texts = questions.map(q => (q.q || q.question_text || "").toLowerCase());
  const nums   = texts.flatMap(t => (t.match(/\d+/g) || []).map(Number));
  const maxNum = nums.length ? Math.max(...nums) : 0;

  // Division specificity
  if (slug.includes("division") || slug.includes("sharing") || slug.includes("divid")) {
    if (maxNum <= 10)  return "Single-Digit Division";
    if (maxNum <= 100) return "Two-Digit Division";
    return "Long Division";
  }
  // Multiplication specificity
  if (slug.includes("multiplication") || slug.includes("times_table") || slug.includes("multiply")) {
    if (maxNum <= 12)  return "Times Tables (×1–12)";
    if (maxNum <= 100) return "Two-Digit Multiplication";
    return "Multi-Digit Multiplication";
  }
  // Addition
  if (slug.includes("addition") || slug.includes("add")) {
    if (maxNum <= 20)  return "Addition Within 20";
    if (maxNum <= 100) return "Addition to 100";
    return "Column Addition";
  }
  // Subtraction
  if (slug.includes("subtraction") || slug.includes("subtract")) {
    if (maxNum <= 20)  return "Subtraction Within 20";
    if (maxNum <= 100) return "Subtraction to 100";
    return "Column Subtraction";
  }
  // Fractions
  if (slug.includes("fraction")) {
    if (texts.some(t => /equivalent|simplif/i.test(t))) return "Equivalent Fractions";
    if (texts.some(t => /add|subtract|plus|minus/i.test(t))) return "Adding & Subtracting Fractions";
    return "Fractions";
  }
  // Percentages
  if (slug.includes("percent")) return "Percentages";
  // Area / Perimeter
  if (slug.includes("area") && slug.includes("perim")) return "Area & Perimeter";
  if (slug.includes("area"))      return "Area";
  if (slug.includes("perimeter")) return "Perimeter";
  // Place value
  if (slug.includes("place_value")) {
    if (maxNum >= 1000) return "Place Value (Thousands)";
    if (maxNum >= 100)  return "Place Value (Hundreds)";
    return "Place Value";
  }
  // Algebra
  if (slug.includes("algebra") || slug.includes("equation")) return "Algebra & Equations";
  // Statistics
  if (slug.includes("mean") || slug.includes("median") || slug.includes("mode")) return "Mean, Median & Mode";
  if (slug.includes("statistic") || slug.includes("data")) return "Data & Statistics";
  // Geometry
  if (slug.includes("angle"))    return "Angles";
  if (slug.includes("shape"))    return "2D Shapes";
  if (slug.includes("symmetr"))  return "Symmetry";
  if (slug.includes("coord"))    return "Coordinates";
  // Probability
  if (slug.includes("probabilit")) return "Probability";
  // Ratio
  if (slug.includes("ratio") || slug.includes("proportion")) return "Ratio & Proportion";
  // Time
  if (slug.includes("time") || slug.includes("clock")) return "Telling the Time";
  // Money
  if (slug.includes("money") || slug.includes("coin")) return "Money";
  // Rounding
  if (slug.includes("round")) return "Rounding Numbers";
  // Fallback: prettify slug
  return slug.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

// ─── useMastery HOOK ─────────────────────────────────────────────────────────
function useMastery(student) {
  const sessionId = useRef(
    typeof crypto !== "undefined"
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2)
  );
  const masteryCache      = useRef({});
  const sessionMilestones = useRef([]);
  const sessionStoryPts   = useRef(0);

  const recordAnswer = useCallback(async (question, correct, chosenIdx, timeTakenMs) => {
    const topic      = question.topic      ?? question._diagnostic_topic ?? "general";
    const subj       = question.subject    ?? "general";
    const curriculum = question.curriculum ?? student?.curriculum ?? "uk_national";
    const yearLevel  = question.year_level ?? student?.year_level ?? 6;

    const prev    = masteryCache.current[topic] ?? null;
    const updated = processAnswer(prev, correct);
    masteryCache.current[topic] = updated;

    fetch("/api/mastery/update", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scholarId:     student?.id,
        sessionId:     sessionId.current,
        questionId:    question.id ?? null,
        curriculum, subject: subj, topic, yearLevel,
        correct, chosenIndex: chosenIdx,
        correctIndex:  question.a ?? question.correct_index ?? 0,
        timeTakenMs:   timeTakenMs ?? null,
        difficultyTier: question.difficulty_tier ?? null,
      }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.mastery)          masteryCache.current[topic] = data.mastery;
        if (data.milestones?.length) sessionMilestones.current.push(...data.milestones);
        if (data.tier_crossed)     sessionMilestones.current.push({ type: 'tier_crossed', tier: data.tier_crossed, topic });
        if (data.storyPointsEarned)  sessionStoryPts.current += data.storyPointsEarned;
      })
      .catch(err => console.warn("mastery update failed (non-fatal):", err));

    return updated;
  }, [student]);

  const getMastery            = useCallback((topic) => masteryCache.current[topic] ?? null, []);
  const getSessionMilestones  = useCallback(() => sessionMilestones.current, []);
  const getSessionStoryPoints = useCallback(() => sessionStoryPts.current, []);

  return { recordAnswer, getMastery, getSessionMilestones, getSessionStoryPoints, sessionId };
}

// ─── MILESTONE CELEBRATION OVERLAY ───────────────────────────────────────────
function MilestoneCelebration({ milestones, onDismiss }) {
  if (!milestones?.length) return null;
  const m = milestones[milestones.length - 1];
  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-yellow-400 to-amber-500 text-white rounded-3xl px-8 py-6 text-center shadow-2xl max-w-xs mx-auto animate-bounce">
        <div className="text-5xl mb-3">{m.emoji}</div>
        <p className="text-xl font-black mb-1">{m.label}</p>
        <p className="text-sm opacity-90 mb-4">+{m.storyPoints} Stardust</p>
        <button onClick={onDismiss}
          className="bg-white/30 hover:bg-white/50 px-5 py-2 rounded-xl text-sm font-bold transition-all">
          Continue →
        </button>
      </div>
    </div>
  );
}

// ─── SUBJECT ACCENT THEMES ───────────────────────────────────────────────────
const _mathsTheme   = { bg: "bg-indigo-50",  border: "border-indigo-100",  text: "text-indigo-900",  accent: "text-indigo-600",  btn: "bg-indigo-600 hover:bg-indigo-700",  Icon: () => <span className="text-base">🔢</span>, panelBg: "#eef2ff", accentHex: "#4f46e5" };
const _verbalTheme  = { bg: "bg-violet-50",  border: "border-violet-100",  text: "text-violet-900",  accent: "text-violet-600",  btn: "bg-violet-600 hover:bg-violet-700",  Icon: () => <span className="text-base">🧩</span>, panelBg: "#f5f3ff", accentHex: "#6d28d9" };
const MAIN_THEMES = {
  mathematics:      _mathsTheme,
  maths:            _mathsTheme,   // legacy alias
  english:          { bg: "bg-purple-50",  border: "border-purple-100",  text: "text-purple-900",  accent: "text-purple-600",  btn: "bg-purple-600 hover:bg-purple-700",  Icon: () => <span className="text-base">📖</span>, panelBg: "#f5f3ff", accentHex: "#7c3aed" },
  verbal_reasoning: _verbalTheme,
  verbal:           _verbalTheme,  // legacy alias
  nvr:              { bg: "bg-cyan-50",    border: "border-cyan-100",    text: "text-cyan-900",    accent: "text-cyan-600",    btn: "bg-cyan-600 hover:bg-cyan-700",      Icon: () => <span className="text-base">🔷</span>, panelBg: "#ecfeff", accentHex: "#0891b2" },
  computing:        { bg: "bg-slate-50",   border: "border-slate-100",   text: "text-slate-900",   accent: "text-slate-600",   btn: "bg-slate-700 hover:bg-slate-800",    Icon: () => <span className="text-base">💻</span>, panelBg: "#f8fafc", accentHex: "#475569" },
};
const DEFAULT_MAIN_THEME = {
  bg: "bg-indigo-50", border: "border-indigo-100", text: "text-indigo-900",
  accent: "text-indigo-600", btn: "bg-indigo-600 hover:bg-indigo-700",
  panelBg: "#eef2ff", accentHex: "#4f46e5",
  Icon: Rocket,
};

// ─── LOADING CARD ─────────────────────────────────────────────────────────────
function LoadingCard({ subject }) {
  const subj  = subject?.toLowerCase() || "mathematics";
  const theme = MAIN_THEMES[subj] || DEFAULT_MAIN_THEME;
  const labels = getSubjectLabels(subject);
  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[5000] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-7 text-center max-w-xs w-full shadow-2xl">
        <Rocket size={40} className={`mx-auto mb-3 animate-bounce ${theme.accent}`} />
        <h3 className="text-lg font-black text-slate-800 mb-1">Briefing Mission…</h3>
        <p className="text-sm font-bold text-slate-400">{labels.loading}</p>
      </div>
    </div>
  );
}

// ─── MAIN QUIZ ENGINE ─────────────────────────────────────────────────────────

function MainQuizEngine({ student, subject, curriculum, questionCount, previousQuestionIds, onComplete, onClose, taraEnabled, focusedTopic, BandQuizShell, band, friendlySubject }) {
  const perQTimer   = useMemo(() => getPerQuestionTimer(student), [student]);
  const subj        = subject?.toLowerCase() || "mathematics";
  const theme       = MAIN_THEMES[subj] || DEFAULT_MAIN_THEME;
  const labels      = useMemo(() => getSubjectLabels(subject), [subject]);
  const questFrame = useMemo(() => getQuestFrame(student?.year_level, subject, null, curriculum), [student?.year_level, subject]);
  const timerConfig = useMemo(() => getTimerConfig(student?.year_level), [student?.year_level]);
const rewardInfo  = useMemo(() => getRewardLabel(student?.year_level, XP_PER_QUESTION), [student?.year_level]);

  const [sessionQuestions, setSessionQuestions] = useState([]);
  const [qIdx,             setQIdx]             = useState(0);
  const [selected,         setSelected]         = useState(null);
  const [results,          setResults]          = useState({ score: 0, answers: [] });
  const [finished,         setFinished]         = useState(false);
  const [generating,       setGenerating]       = useState(true);
  const [timeLeft,         setTimeLeft]         = useState(perQTimer);
  const [topicSummary,     setTopicSummary]     = useState({});

  const timerRef        = useRef(null);
  const resultsRef      = useRef({ score: 0, answers: [] }); // stale-closure guard
  const sessionStartRef = useRef(Date.now());                // ← TIER 1: session timer
  const shownMilestonesRef = useRef(new Set());              // track shown milestone popups
  const sessionPassageRef = useRef(null);                    // ← persistent passage across linked questions
  const { taraComplete, onFeedbackReceived, resetTara } = useTaraGate();

  const { recordAnswer, getSessionMilestones, getSessionStoryPoints } = useMastery(student);
  const questionStartTime  = useRef(Date.now());
  const [pendingMilestone, setPendingMilestone] = useState(null);

  // ── Read-aloud for KS1 scholars ───────────────────────────────────────────
  const { speak, stop: stopSpeaking, speaking, enabled: readAloudEnabled, setEnabled: setReadAloud, isKS1 } = useReadAloud(student);

  // Auto-speak question text when question changes (if enabled)
  const currentQuestionText = sessionQuestions[qIdx]?.q || "";
  useEffect(() => {
    if (!readAloudEnabled || !currentQuestionText || generating) return;
    // Small delay to ensure DOM has rendered the correct question
    const timer = setTimeout(() => speak(currentQuestionText), 300);
    return () => { clearTimeout(timer); stopSpeaking(); };
  }, [currentQuestionText, readAloudEnabled, generating]);

  // ── Fetch questions ───────────────────────────────────────────────────────
  const fetchQuestions = useCallback(async () => {
    setGenerating(true);
    let qs = [];
    const rawYear = parseInt(student?.year_level || student?.year || 4, 10);
    function getEffectiveYear(yr, cur) {
  const c = (cur || "").toLowerCase();
  if (c === "ng_jss") return yr + 6;
  if (c === "ng_sss") return yr + 9;
  return yr;
}
const year = rawYear;
    try {
      const dbRows = await getSmartQuestions(
        supabase, student?.id, subject, curriculum, year, questionCount, previousQuestionIds,
        null, student?.exam_mode ?? null, focusedTopic
      );
      if (dbRows?.length > 0) qs = dbRows.map((r) => {
        const q = dbRowToQuestion(r, subject);
        if (q.year_level == null) q.year_level = year;
        q._studentYear = year;

        // ── Passage attachment ───────────────────────────────────────────────
        // If smartQuestionSelection grouped this question with a passage,
        // attach the passage body so the left panel renders it
        if (r._passage?.body) {
          q.passage = r._passage.body;
          q._passageTitle = r._passage.title;
          q._passageId = r._passage.id;
        }
        // Also check if the DB row has an inline passage field
        if (!q.passage && r.passage) {
          q.passage = r.passage;
        }

        // ── correct_index recovery ──────────────────────────────────────────
        const rawQD = r.question_data
          ? (typeof r.question_data === 'string'
            ? (() => { try { return JSON.parse(r.question_data); } catch { return {}; } })()
            : r.question_data)
          : {};
        const rawAnswer = r.correct_answer || r.answer || rawQD.correctAnswer;
        if (rawAnswer && q.opts?.length) {
          const matchIdx = q.opts.findIndex(
            o => String(o).trim().toLowerCase() === String(rawAnswer).trim().toLowerCase()
          );
          if (matchIdx !== -1 && matchIdx !== q.a) {
            console.warn(`[MainQuiz] correct_index recovery: "${q.q}" — remapped ${q.a} → ${matchIdx}`);
            q.a = matchIdx;
          }
        }

        return q;
      });
    } catch (e) { console.warn("[MainQuiz] DB:", e); }
    if (qs.length < questionCount) {
      // Procedural fallback — MATHS ONLY for beta.
      // English procedural generates disjointed prefix/suffix questions with no passages.
      // Science/physics/chemistry/biology procedural generates primary-level questions for all years.
      // All other subjects fall through to generateLocalMaths which is wrong subject entirely.
      // Better to serve fewer DB questions than pad with garbage.
      const PROCEDURAL_SAFE = ["maths", "mathematics"];
      const canUseProcedural = PROCEDURAL_SAFE.includes(subj);

      if (canUseProcedural && qs.length === 0) {
        // Only use procedural if DB returned literally zero questions
        try {
          const fb = await generateSessionQuestions(student, subject, "foundation", questionCount - qs.length);
          const stamped = (fb || []).map(q => {
            if (q.year_level == null) q.year_level = year;
            q._studentYear = year;
            return q;
          });
          qs = [...qs, ...stamped].slice(0, questionCount);
        } catch {}
      }

      // If we still don't have enough questions, log it — the quest will
      // run with fewer questions rather than padding with bad ones.
      if (qs.length === 0) {
        console.warn(`[MainQuiz] No questions available for ${subj} — DB returned 0 and procedural ${canUseProcedural ? "also returned 0" : "disabled for this subject"}`);
      } else if (qs.length < questionCount) {
        console.warn(`[MainQuiz] Only ${qs.length}/${questionCount} questions for ${subj}`);
      }
    }
    // ── Safe normalize: validate question shape WITHOUT re-shuffling ────────
    // normalizeQuestion from quizUtils shuffles options, but dbRowToQuestion
    // and generateSessionQuestions already shuffle. Double-shuffling breaks
    // the answer index when two options share a value (indexOf returns first).
    const safeNormalize = (q) => {
      if (!q || !q.opts || !q.opts.length) return q;
      // Ensure q.a is a valid number pointing within opts
      const a = typeof q.a === 'number' && q.a >= 0 && q.a < q.opts.length ? q.a : 0;
      // Store correctAnswer text for downstream components (Tara, feedback)
      const correctAnswer = q.opts[a];
      return { ...q, a, correctAnswer };
    };

    setSessionQuestions(
      (qs || []).map(safeNormalize).map((q, i) => validateAndFixQuestion(q, i)).filter(Boolean)
    );
    setGenerating(false);
    sessionStartRef.current = Date.now(); // ← TIER 1: start clock once questions ready
  }, [student, subject, curriculum, questionCount, previousQuestionIds]);

  useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

  // ── Per-question timer ────────────────────────────────────────────────────
  useEffect(() => {
    if (finished || generating || !sessionQuestions[qIdx]) return;
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((p) => (p <= 1 ? 0 : p - 1));
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [qIdx, generating, finished, sessionQuestions]);

  // ── Answer handler ────────────────────────────────────────────────────────
  const recordTopicResult = useCallback((topic, isCorrect) => {
    if (!topic) return;
    setTopicSummary((prev) => {
      const e = prev[topic] || { correct: 0, total: 0 };
      return { ...prev, [topic]: { correct: e.correct + (isCorrect ? 1 : 0), total: e.total + 1 } };
    });
  }, []);

  const handlePick = useCallback((idx) => {
    if (selected !== null) return;
    const q         = sessionQuestions[qIdx];
    const isCorrect = idx === q.a;
    const timeTaken = Date.now() - questionStartTime.current;

    setSelected(idx);
    setResults((r) => {
      const next = {
        ...r,
        score:   r.score + (isCorrect ? 1 : 0),
        answers: [...r.answers, {
          q: q.q, isCorrect, correct: q.opts[q.a], myAnswer: q.opts[idx],
          // Full data for answer review
          opts: q.opts, correctIdx: q.a, chosenIdx: idx,
          exp: q.exp || null, topic: q.topic || subject,
          hints: q.hints || [],
        }],
      };
      resultsRef.current = next;
      return next;
    });

    recordTopicResult(q.topic || subject, isCorrect);

    recordAnswer(q, isCorrect, idx, timeTaken).then(() => {
      // Milestone celebrations disabled for beta — tier crossings are shown
      // via the certificate on the completion screen instead. The popup was
      // firing too frequently and disrupting quiz flow.
    });

    questionStartTime.current = Date.now();
  }, [selected, sessionQuestions, qIdx, subject, recordTopicResult, recordAnswer, getSessionMilestones]);

  // ── Finish ────────────────────────────────────────────────────────────────
  const finishQuest = useCallback(async () => {
    clearInterval(timerRef.current);
    const { answers } = resultsRef.current;
    const correctCount = answers.filter(a => a.isCorrect).length;

    // ← TIER 1: compute actual time spent answering questions
    const timeSpentSeconds = Math.round((Date.now() - sessionStartRef.current) / 1000);

    const payload = buildCompletionPayload({
      answers,
      totalQuestions:  sessionQuestions.length,
      xpPerQuestion:   XP_PER_QUESTION,
      topicSummary,
      milestones:      getSessionMilestones(),
      storyPoints:     getSessionStoryPoints(),
      missionLog:      generateMissionLogEntry({
        scholarName: student?.name,
        subject,
        topic:   sessionQuestions[0]?.topic ?? subject,
        correct: correctCount,
        total:   sessionQuestions.length,
      }),
    });

    await saveQuizResult(supabase, {
      studentId: student?.id, subject, curriculum, questions: sessionQuestions,
      answers, topicSummary, xpPerQuestion: XP_PER_QUESTION,
      timeSpentSeconds,
    });

    onComplete?.(payload);
  }, [sessionQuestions, topicSummary, student, subject, onComplete,
      getSessionMilestones, getSessionStoryPoints]);

  const next = () => {
    if (qIdx < sessionQuestions.length - 1) {
      setQIdx((p) => p + 1);
      setSelected(null);
      setTimeLeft(perQTimer);
      resetTara();
    } else {
      setFinished(true);
      finishQuest();
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (generating) return <LoadingCard subject={subject} />;

  const q = sessionQuestions[qIdx];
  if (!q) return null;

  if (finished) {
    const finalAnswers = resultsRef.current.answers;
    const finalScore = finalAnswers.filter((a) => a.isCorrect).length;
    // Derive the most-practiced topic this session for the certificate
    const topicCounts = {};
    sessionQuestions.forEach(q => { if (q.topic) topicCounts[q.topic] = (topicCounts[q.topic] || 0) + 1; });
    const topSlug  = Object.entries(topicCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || subject;
    const topTopic = formatTopicLabel(topSlug, sessionQuestions);

    // Certificate requires: 
    // 1. At least 15 questions answered (not a broken/short quest)
    // 2. At least 55% accuracy (developing threshold)
    // 3. The mastery API must have returned a tier_crossed (server-side validation)
    //    This ensures the certificate reflects sustained mastery across sessions,
    //    not just one good quest.
    const accuracy = sessionQuestions.length > 0 ? finalScore / sessionQuestions.length : 0;
    const milestones = getSessionMilestones() || [];
    const serverTierCrossed = milestones.some(m => m.type === 'tier_crossed');
    const showCertificate = sessionQuestions.length >= 15 && accuracy >= 0.55 && serverTierCrossed;

    return (
      <EngineFinished
        Icon={Rocket} accent={theme.accent} textColor={theme.text} btnClass={theme.btn}
        finalScore={finalScore} totalQuestions={sessionQuestions.length}
        title={labels.finish} onClose={onClose}
        subject={subject}
        topic={topTopic}
        scholarName={student?.name}
        answers={finalAnswers}
        xpEarned={finalScore * XP_PER_QUESTION}
        xpLabel={getRewardLabel(student?.year_level, finalScore * XP_PER_QUESTION)}
        showCertificate={showCertificate}
      />
    );
  }

  const isCorrectAnswer = selected === q.a;
  const canProceed      = isCorrectAnswer || (selected !== null && !isCorrectAnswer && taraComplete);
  const progress        = ((qIdx + 1) / sessionQuestions.length) * 100;
  // labels is declared via useMemo at the top of this component — no re-declaration needed

  // ── Left-panel content ─────────────────────────────────────────────────────
  // Priority: passage text → maths/science visual → generic subject context panel
  // Smart visual check: don't show basic arithmetic grids for multi-step word problems
  const yearLvl = q.year_level ?? student?.year_level ?? 6;
  const rawCanVisualise = q.image_url || canVisualise(q, subject, yearLvl);
  const hasVisual = (() => {
    if (q.image_url) return true; // explicit images always show
    if (!rawCanVisualise) return false;
    // For word problems with multiple operations, basic dot grids don't help
    const qText = (q.q || q.question_text || "").toLowerCase();
    const nums = (q.q || "").match(/\d+/g) || [];
    const multiStep = nums.length >= 3; // 3+ numbers = likely multi-step
    const hasMultiOps = /(\bthen\b|\band\b.*\bthen\b|removed|left|remaining|gave away|eaten|taken|after)/i.test(qText)
      && /(\bshelves?\b|\brows?\b|\bboxes?\b|\bbags?\b|\bgroups?\b|\bpacks?\b|\bsets?\b)/i.test(qText);
    // Questions like "look at the diagram" should always try to visualise
    const explicitlyAsksForVisual = /look at|diagram|drawing|picture|image|chart|graph|table|map/i.test(qText);
    if (explicitlyAsksForVisual) return true;
    // Filter out multi-step word problems where simple grids won't help
    if (multiStep && hasMultiOps) return false;
    // Filter out large number arithmetic (grids of 100+ dots aren't helpful)
    if (nums.some(n => parseInt(n) > 50)) return false;
    return true;
  })();

  // ── Passage persistence: keep passage in left panel across all linked questions
  // When current question has a _passageId, use the session passage.
  // When question has no _passageId, clear the session passage.
  if (q._passageId && q.passage) {
    sessionPassageRef.current = {
      id: q._passageId,
      title: q._passageTitle || "",
      body: q.passage,
    };
  } else if (!q._passageId) {
    sessionPassageRef.current = null;
  }
  // If current question shares the same passage as the session, use the persistent one
  const activePassage = (q._passageId && sessionPassageRef.current?.id === q._passageId)
    ? sessionPassageRef.current
    : (q.passage ? { id: null, title: q._passageTitle || "", body: q.passage } : null);

  const hasPassage = !!activePassage;

  // For English w/o passage: use topic as panel label not generic "Reading Passage"
  const panelScenarioLabel = (subject === "english" && !hasPassage)
    ? (labels.scenarioNoPassage || formatTopicLabel(q.topic || "english", sessionQuestions))
    : labels.scenario;

  // Count how many remaining questions share this passage
  const passageQuestionsRemaining = activePassage?.id
    ? sessionQuestions.slice(qIdx).filter(sq => sq._passageId === activePassage.id).length
    : 0;

  const leftPanelContent = hasPassage ? (
    // Passage / reading context — persists across linked questions
    <div className="flex flex-col gap-3 h-full">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs shrink-0"
          style={{ backgroundColor: theme.accentHex || "#4f46e5" }}>
          <BookOpen size={13} />
        </span>
        <div>
          <p className="text-xs font-black text-slate-800">
            {activePassage.title || panelScenarioLabel}
          </p>
          <p className="text-[10px] text-slate-400 font-semibold">
            {passageQuestionsRemaining > 1
              ? `Read carefully · ${passageQuestionsRemaining} questions about this passage`
              : "Read this passage carefully"}
          </p>
        </div>
      </div>
      <div className="flex-1 bg-white rounded-xl border border-slate-200 p-4 text-sm text-slate-700 font-medium leading-relaxed overflow-y-auto whitespace-pre-line">
        {activePassage.body}
      </div>
    </div>
  ) : hasVisual ? (
    // Maths visual / image
    <div className="flex flex-col gap-3 h-full">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs shrink-0"
          style={{ backgroundColor: theme.accentHex || "#4f46e5" }}>
          <LayoutGrid size={13} />
        </span>
        <div>
          <p className="text-xs font-black text-slate-800">{panelScenarioLabel}</p>
          <p className="text-[10px] text-slate-400 font-semibold">Study this carefully</p>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center bg-white rounded-xl border border-slate-200 p-3 overflow-hidden">
        {q.image_url
          ? <ImageDisplay src={q.image_url} alt="Question visual" />
          : <MathsVisualiser question={q} subject={subject} yearLevel={q.year_level ?? student?.year_level ?? 6} />
        }
      </div>
    </div>
  ) : (
    // Generic context panel — subject-appropriate copy
    <div className="flex flex-col gap-3 h-full">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs shrink-0"
          style={{ backgroundColor: theme.accentHex || "#4f46e5" }}>
          <BookOpen size={13} />
        </span>
        <div>
          <p className="text-xs font-black text-slate-800">{labels.scenario}</p>
          <p className="text-[10px] text-slate-400 font-semibold truncate max-w-[160px]">
            {q.topic ? q.topic.replace(/_/g, " ") : "Read and answer"}
          </p>
        </div>
      </div>
      <div className="flex-1 bg-white rounded-xl border border-slate-200 p-4 text-sm text-slate-500 leading-relaxed overflow-y-auto">
        {selected !== null && q.exp
          ? <p className="text-sm text-slate-600 leading-relaxed">{q.exp}</p>
          : (q.hints?.[0]
            ? <p className="text-sm text-slate-600 leading-relaxed">💡 {q.hints[0]}</p>
            : <p className="italic text-slate-400">Answer the question on the right using what you know about <span className="font-semibold not-italic text-slate-500">{q.topic?.replace(/_/g, " ") || subject}</span>.</p>
          )
        }
      </div>
    </div>
  );
  // ── Band-specific quiz shell (KS1-KS4 split-screen layouts) ──────────────
  if (BandQuizShell && !finished) {
    // Build TaraEIB widget for wrong answers
    const taraEIBWidget = (selected !== null && !isCorrectAnswer && taraEnabled !== false) ? (
      <TaraEIB
        student={student}
        subject={subject}
        currentQ={q}
        correctAnswer={q.opts?.[q.a]}
        scholarAnswer={typeof q.opts?.[selected] === "string" ? q.opts[selected] : q.opts?.[selected]?.text}
        onFeedbackReceived={onFeedbackReceived}
      />
    ) : null;

    return (
      <BandQuizShell
        question={q.q}
        options={q.opts || []}
        passage={activePassage?.body || q.passage}
        questionIndex={qIdx}
        totalQuestions={sessionQuestions.length}
        selectedAnswer={selected}
        onSelect={(i) => { if (selected === null) handlePick(i); }}
        onSubmit={() => { if (canProceed) next(); }}
        onSkip={() => next()}
        onClose={onClose}
        subjectLabel={friendlySubject || labels.header}
        xp={student?.total_xp || 0}
        streak={student?.streak || 0}
        timeLeft={timeLeft}
        taraHint={q.hints?.[0] || null}
        isCorrect={isCorrectAnswer}
        showResult={selected !== null}
        explanation={selected !== null ? (q.exp || q.explanation) : null}
        missionTitle={friendlySubject || topicLabel}
        marks={q.marks || 1}
        masteryPercent={student?.mastery_percent || 0}
        gradeImpact={student?.predicted_grade || ""}
        markSchemeNote={q.mark_scheme_note}
        leftPanelContent={leftPanelContent}
        taraEIBWidget={taraEIBWidget}
        canProceed={canProceed}
      />
    );
  }
  return (
    <KeyboardShortcuts
      yearLevel={student?.year_level}
      onSelectOption={(idx) => { if (selected === null && sessionQuestions[qIdx]) handlePick(idx); }}
      onCheck={() => {}}
      onNext={() => { if (canProceed) next(); }}
      onClose={onClose}
      canCheck={false}
      canNext={canProceed}
    >
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[4000] flex items-center justify-center p-3 sm:p-4">
      {pendingMilestone && (
        <MilestoneCelebration milestones={[pendingMilestone]} onDismiss={() => setPendingMilestone(null)} />
      )}

      {/* ── WIDE TWO-COLUMN MODAL — matches Science Investigation design ── */}
      <div className="bg-white w-full rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border-b-4 border-slate-200"
           style={{ maxWidth: "860px", maxHeight: "94vh" }}>

        {/* ── HEADER — full width, coloured accent bar ── */}
        <EngineHeader
           Icon={theme.Icon}
          subject={subject}
          bg={theme.bg}
          border={theme.border}
          accent={theme.accent}
          textColor={theme.text}
          btnClass={theme.btn}
          label={getSubjectLabels(subject).header}
          qIdx={qIdx}
          totalQuestions={sessionQuestions.length}
          timeLeft={timeLeft}
          totalTime={perQTimer}
          yearLevel={student?.year_level}
          onClose={onClose}
        />

        {/* ── BODY — two column grid ── */}
        <div className="flex flex-1 overflow-hidden min-h-0">

          {/* LEFT PANEL — tinted context / visual */}
          <div className="hidden sm:flex flex-col w-[42%] shrink-0 p-4 overflow-y-auto"
               style={{ backgroundColor: theme.panelBg || "#f0f9ff", borderRight: "1px solid #e2e8f0" }}>
            {leftPanelContent}
          </div>

          {/* RIGHT PANEL — question text + options + feedback */}
          <div className="flex-1 flex flex-col overflow-y-auto p-5 gap-4">
            <div className="flex items-start gap-2">
              <h3 className="text-base sm:text-lg font-black text-slate-800 leading-snug flex-1">
                {q.q}
              </h3>
              {/* Read-aloud controls — visible for KS1, optional toggle for others */}
              {(isKS1 || readAloudEnabled) && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => speak(q.q)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                      speaking ? "bg-indigo-100 text-indigo-600 animate-pulse" : "bg-slate-100 text-slate-500 hover:bg-indigo-50 hover:text-indigo-500"
                    }`}
                    title="Read aloud"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setReadAloud(!readAloudEnabled)}
                    className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black transition-all ${
                      readAloudEnabled ? "bg-indigo-500 text-white" : "bg-slate-200 text-slate-400"
                    }`}
                    title={readAloudEnabled ? "Disable read-aloud" : "Enable read-aloud"}
                  >
                    {readAloudEnabled ? "ON" : "OFF"}
                  </button>
                </div>
              )}
            </div>

            {/* On mobile only: show passage/visual inline before options */}
            {hasPassage && (
              <div className="sm:hidden p-3 rounded-xl border-l-4 bg-slate-50 border-slate-200 text-slate-700 text-xs font-medium italic leading-relaxed">
                {q.passage}
              </div>
            )}

            <MCQOptions opts={q.opts} correctIdx={q.a} selected={selected} onPick={handlePick} />

            <FeedbackArea
              selected={selected} isCorrectAnswer={isCorrectAnswer} canProceed={canProceed}
              currentQ={q} student={student} subject={subject}
              scholarAnswer={selected !== null ? q.opts[selected] : null}
              themeBg={theme.bg} themeBorder={theme.border} themeAccent={theme.accent}
              taraFeedbackReceived={onFeedbackReceived} onNext={next}
              isLast={qIdx === sessionQuestions.length - 1}
               taraEnabled={taraEnabled}
            />
          </div>
        </div>
      </div>
    </div>
    </KeyboardShortcuts>
  );
}

// ─── QUEST BRIEFING SCREEN ────────────────────────────────────────────────────
// Shown before NarrativeIntro. Sets the learning theme explicitly so scholars
// and parents know exactly what this quest covers before it starts.
const REALM_THEMES = {
  maths:            { realm: "Number Nebula",   colour: "#6366f1", icon: "🔢", hooks: [
    "A data storm has scrambled the star charts. Only precise calculations can restore navigation.",
    "The ship's shields run on equations. Solve them to power up before the asteroid field.",
    "Mission Control has detected a number anomaly. Your skills are needed to decode it.",
  ]},
  mathematics:      { realm: "Number Nebula",   colour: "#6366f1", icon: "🔢", hooks: [
    "A meteor has knocked the ship's calculator offline. You'll need to compute manually.",
    "The fuel cell ratios are out of balance. Use your maths to recalibrate.",
  ]},
  english:          { realm: "Word Galaxy",     colour: "#ec4899", icon: "📖", hooks: [
    "An ancient manuscript has been found in the cargo bay. Can you decode its meaning?",
    "A distress signal in an unknown dialect is coming through. Translate it to help the crew.",
    "The ship's log is corrupted. Piece together the narrative to find what happened.",
  ]},
  verbal_reasoning: { realm: "Word Galaxy",     colour: "#7c3aed", icon: "🧩", hooks: [
    "The cipher key is scrambled. Crack the word patterns to unlock the next star gate.",
    "An alien code has been intercepted. Use logic and language to break it.",
  ]},
  nvr:              { realm: "Pattern Planet",  colour: "#0891b2", icon: "🔷", hooks: [
    "A shape transmission from an unknown planet needs decoding. Spot the patterns.",
    "The navigation crystals form a sequence. Identify the missing piece to chart the course.",
  ]},
  science:          { realm: "Science Sector",  colour: "#059669", icon: "🔬", hooks: [
    "The lab sensors have picked up an unusual reading. Investigate the science behind it.",
    "A specimen from the surface needs analysis. Apply your knowledge to classify it.",
  ]},
  physics:          { realm: "Science Sector",  colour: "#1d4ed8", icon: "⚡", hooks: [
    "The ship's engines are behaving strangely. Use physics to diagnose the problem.",
  ]},
  chemistry:        { realm: "Science Sector",  colour: "#dc2626", icon: "⚗️", hooks: [
    "A chemical reaction in the lab is out of control. Balance the equation to stabilise it.",
  ]},
  biology:          { realm: "Science Sector",  colour: "#16a34a", icon: "🌿", hooks: [
    "Life signs detected on the surface. Study the organisms to understand this ecosystem.",
  ]},
  history:          { realm: "History Halls",   colour: "#92400e", icon: "🏛️", hooks: [
    "A time rift has opened. Step through and uncover what happened in the past.",
    "An artefact from a lost civilisation needs your expertise to understand.",
  ]},
  geography:        { realm: "Geo Sphere",      colour: "#065f46", icon: "🌍", hooks: [
    "The planet's terrain map is incomplete. Use your geographical knowledge to fill the gaps.",
    "A new settlement needs planning. Analyse the environment to find the best location.",
  ]},
  computing:        { realm: "Cyber Core",      colour: "#0e7490", icon: "💻", hooks: [
    "The ship's systems have a bug. Debug the code to get everything running again.",
  ]},
  religious_education: { realm: "Wisdom Spire", colour: "#7e22ce", icon: "🕊️", hooks: [
    "Ancient texts from across the galaxy hold wisdom. Explore their teachings.",
  ]},
  design_and_technology: { realm: "Forge Station", colour: "#b45309", icon: "🔧", hooks: [
    "A broken component needs redesigning. Apply your design skills to build a solution.",
  ]},
  default:          { realm: "Learning Realm",  colour: "#4f46e5", icon: "🚀", hooks: [
    "A new signal has been detected. Your knowledge is needed to investigate.",
    "Mission Control is counting on you. Show what you've learned.",
  ]},
};

function QuestBriefing({ subject, topicLabel, scholarName, onContinue, onClose }) {
  const subj   = (subject || "").toLowerCase();
  const theme  = REALM_THEMES[subj] || REALM_THEMES.default;
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    const t = setTimeout(() => setReady(true), 60);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="fixed inset-0 z-[4900] flex items-center justify-center p-4"
      style={{ background: "rgba(15,14,26,0.97)" }}
    >
      {/* Animated stars */}
      {Array.from({ length: 18 }, (_, i) => (
        <div key={i} className="absolute rounded-full bg-white pointer-events-none"
          style={{
            left: `${(i * 17.3) % 100}%`, top: `${(i * 23.7) % 100}%`,
            width: 1 + (i % 2), height: 1 + (i % 2), opacity: 0.3 + (i % 3) * 0.15,
          }} />
      ))}

      <div
        className="relative w-full max-w-sm rounded-3xl overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0f0e1a 0%, #1a1730 100%)",
          border: `1.5px solid ${theme.colour}44`,
          opacity: ready ? 1 : 0,
          transform: ready ? "translateY(0) scale(1)" : "translateY(20px) scale(0.97)",
          transition: "opacity 0.4s ease, transform 0.4s cubic-bezier(.22,.68,0,1.2)",
        }}
      >
        {/* Top accent bar */}
        <div className="h-1 w-full" style={{
          background: `linear-gradient(90deg, ${theme.colour}, #ec4899, #f59e0b)`,
        }} />

        <div className="p-6 pb-5">
          {/* Realm badge */}
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg"
              style={{ background: `${theme.colour}22`, border: `1px solid ${theme.colour}44` }}>
              {theme.icon}
            </div>
            <span className="text-xs font-black uppercase tracking-widest"
              style={{ color: theme.colour }}>
              {theme.realm}
            </span>
          </div>

          {/* Mission title */}
          <p className="text-slate-400 text-sm mb-1">
            Ready, <span className="text-white font-bold">{scholarName || "Scholar"}</span>?
          </p>
          <h2 className="text-white font-black text-xl leading-tight mb-4">
            {getQuestFrame(student?.year_level, subject, null).prefix || "Your next quest begins now."}
          </h2>

          {/* Learning theme card */}
          <div className="rounded-2xl p-4 mb-5"
            style={{
              background: `${theme.colour}12`,
              border: `1.5px solid ${theme.colour}33`,
            }}
          >
            <p className="text-[10px] font-black uppercase tracking-widest mb-1.5"
              style={{ color: theme.colour }}>
              In this quest, you will explore
            </p>
            <p className="text-white font-black text-lg leading-snug">
              {topicLabel}
            </p>
            <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
              {getTopicDescription(topicLabel, subject)}
            </p>
          </div>

          {/* Quest format */}
          <div className="flex items-center gap-4 mb-5 text-center">
            {[
              { v: String(questionCount), label: "Questions" },
              { v: "MCQ",  label: "Format" },
              { v: "10",   label: "XP each" },
            ].map(s => (
              <div key={s.label} className="flex-1 rounded-xl py-2.5"
                style={{ background: "rgba(255,255,255,0.05)" }}>
                <p className="text-white font-black text-sm">{s.v}</p>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wide">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Actions */}
          <button
            onClick={onContinue}
            className="w-full py-3.5 rounded-2xl font-black text-sm text-white transition-all active:scale-95"
            style={{ background: `linear-gradient(135deg, ${theme.colour}, #7c3aed)` }}
          >
            Launch Quest 🚀
          </button>
          <button onClick={onClose}
            className="w-full mt-2 py-2 text-slate-500 text-sm font-bold hover:text-slate-400 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// Short, kid-friendly description per topic
function getTopicDescription(topicLabel, subject) {
  const label = (topicLabel || "").toLowerCase();
  const descs = {
    "single-digit division":       "Splitting numbers into equal groups — using small numbers to get confident with sharing.",
    "two-digit division":           "Dividing bigger numbers — you'll use what you know about multiplication to work backwards.",
    "long division":                "Breaking large numbers into steps — a powerful tool for solving complex problems.",
    "times tables (×1–12)":        "The foundation of multiplication — knowing these off by heart opens up everything else.",
    "two-digit multiplication":     "Multiplying larger numbers using column method and place value skills.",
    "multi-digit multiplication":   "Scaling up — you'll multiply three and four digit numbers with confidence.",
    "addition within 20":          "Adding numbers up to 20 — building speed and accuracy with mental maths.",
    "addition to 100":             "Adding two-digit numbers — number bonds and bridging through 10.",
    "column addition":             "Adding large numbers in columns, carrying digits when needed.",
    "subtraction within 20":       "Taking away within 20 — finding the difference and counting back.",
    "subtraction to 100":          "Two-digit subtraction, borrowing, and checking with the inverse.",
    "column subtraction":          "Subtracting large numbers using the column method with exchanging.",
    "fractions":                   "Parts of a whole — reading, writing, and comparing fractions.",
    "equivalent fractions":        "Fractions that look different but mean the same thing — like ½ and 2/4.",
    "adding & subtracting fractions": "Combining fractions — with the same denominator and different denominators.",
    "percentages":                 "Fractions out of 100 — calculating percentage amounts and changes.",
    "area":                        "Measuring the space inside a shape — counting squares and using formulas.",
    "perimeter":                   "Measuring around the outside of a shape — adding up all the sides.",
    "area & perimeter":            "Two key measures of shape — one for inside space, one for the boundary.",
    "place value":                 "Understanding what each digit means — units, tens, hundreds and beyond.",
    "place value (hundreds)":      "Working with three-digit numbers — hundreds, tens, and ones.",
    "place value (thousands)":     "Big numbers — thousands, hundreds, tens and ones all in play.",
    "algebra & equations":         "Using letters to represent unknown values — solving for x.",
    "mean, median & mode":         "Three ways to describe the middle of a data set.",
    "data & statistics":           "Reading charts, interpreting data, and spotting patterns.",
    "angles":                      "Measuring and classifying turns — acute, obtuse, reflex, and right angles.",
    "2d shapes":                   "Properties of flat shapes — sides, corners, symmetry.",
    "coordinates":                 "Plotting and reading positions on a grid using x and y.",
    "probability":                 "How likely something is to happen — from impossible to certain.",
    "ratio & proportion":          "Comparing quantities and scaling up or down.",
    "telling the time":            "Reading clocks — o'clock, half past, quarter to, digital time.",
    "money":                       "Pounds and pence — counting, adding, and giving change.",
    "rounding numbers":            "Estimating to the nearest 10, 100, or 1000.",
  };
  return descs[label] ||
    `Exploring ${topicLabel} — building skills in ${(subject || "mathematics").replace(/_/g, " ")}.`;
}

// ─── QUEST ORCHESTRATOR ───────────────────────────────────────────────────────
export default function QuestOrchestrator({
  student, subject, curriculum,
  questionCount: questionCountProp, previousQuestionIds = [],
  questData = {}, onClose, onComplete, taraEnabled = true,
}) {
  const subj = (typeof subject === "string" ? subject : subject?.subject || subject?.name || "mathematics").toLowerCase();
  const band = getAgeBand(student?.year_level || student?.year, student?.curriculum);
const friendlySubject = getSubjectLabel(subject, band);
 
const QuizShellMap = {
  ks1: KS1QuizShell,
  ks2: KS2QuizShell,
  ks3: KS3QuizShell,
  ks4: KS4QuizShell,
};
const BandQuizShell = QuizShellMap[band] || KS2QuizShell;

  // Age-appropriate question count:
  // Year/Grade/Primary 1: 10 questions (short attention span, age 5-6)
  // Year/Grade/Primary 2: 15 questions (age 6-7)
  // Year/Grade/Primary 3+: 20 questions (age 7+)
  const yearLevel = Number(student?.year_level || student?.year || 4);
const c = (curriculum || '').toLowerCase();
const isNigerianSecondary = c === 'ng_jss' || c === 'ng_sss';
const questionCount = questionCountProp || (isNigerianSecondary ? 20 : yearLevel <= 1 ? 10 : yearLevel <= 2 ? 15 : 20);

  // Three-stage flow: "journey" (read-only path display) → "briefing" → "intro" → "quiz"
  // Journey shows the scholar their personalised path and auto-advances after 3 seconds
  const [stage,          setStage]          = useState("journey");
  const [masteryRecords, setMasteryRecords] = useState([]);
  const [algorithmTopic, setAlgorithmTopic] = useState(null);
  const [topicReason,    setTopicReason]    = useState(null);

  const rawTopic   = algorithmTopic || questData?.topic || subj;
  const topicLabel = formatTopicLabel(rawTopic, questData?.questions || []);

  // Load mastery for this subject
  useEffect(() => {
    if (!student?.id || !curriculum) return;
    supabase
      .from("scholar_topic_mastery")
      .select("*")
      .eq("scholar_id", student.id)
      .eq("curriculum", curriculum)
      .eq("subject", subj)
      .then(({ data }) => {
        const records = data ?? [];
        setMasteryRecords(records);
      });
  }, [student?.id, curriculum, subj]);

  // Auto-compute the optimal topic from the adaptive algorithm
  // This runs when masteryRecords loads — the algorithm picks the topic, not the scholar
  useEffect(() => {
    if (!student?.id || !curriculum) return;
    (async () => {
      try {
        const sequence = await getTopicSequence(subj, curriculum, supabase);
        // Load scholar context for anchor resolution
        const { masteryRows, currentTopic } = await loadScholarContext(supabase, student.id, curriculum, subj, null);
        const { topic, reason } = resolveAnchorTopic(masteryRows, currentTopic, subj, sequence);
        if (topic) {
          setAlgorithmTopic(topic);
          setTopicReason(reason);
        }
      } catch (err) {
        console.warn("[QuestOrchestrator] Algorithm topic resolution failed:", err.message);
      }
    })();
  }, [student?.id, curriculum, subj, masteryRecords]);

  // ── Stage: Journey (read-only path + 1-click start) ───────────────────────
  if (stage === "journey") {
    const REASON_LABELS = {
      spaced_repetition: "Due for review — spaced repetition",
      weakest_topic: "Your weakest area — let's strengthen it",
      new_introduction: "New topic — time to explore",
      reinforcement: "Good progress — let's solidify it",
      learning_path: "Continuing your learning path",
      sequence_start: "First topic — let's go!",
      journey_map_selected: "AI-selected",
      fallback: "Mixed practice",
    };

    const theme = REALM_THEMES[subj] || REALM_THEMES.default;

    return (
      <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4"
        style={{ background: "rgba(15,14,26,0.97)" }}>
        {/* Animated stars */}
        {Array.from({ length: 14 }, (_, i) => (
          <div key={i} className="absolute rounded-full bg-white pointer-events-none"
            style={{
              left: `${(i * 17.3) % 100}%`, top: `${(i * 23.7) % 100}%`,
              width: 1 + (i % 2), height: 1 + (i % 2), opacity: 0.2 + (i % 3) * 0.15,
            }} />
        ))}

        <div className="relative w-full max-w-md rounded-3xl overflow-hidden max-h-[88vh] flex flex-col"
          style={{ background: "linear-gradient(135deg, #0f0e1a 0%, #1a1730 100%)", border: `1.5px solid ${theme.colour}44` }}>

          {/* Accent bar */}
          <div className="h-1 w-full shrink-0"
            style={{ background: `linear-gradient(90deg, ${theme.colour}, #ec4899, #f59e0b)` }} />

          {/* Header: realm badge + close */}
          <div className="flex items-center justify-between px-5 pt-4 pb-2 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg"
                style={{ background: `${theme.colour}22`, border: `1px solid ${theme.colour}44` }}>
                {theme.icon}
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-widest" style={{ color: theme.colour }}>
                  {theme.realm}
                </span>
                <p className="text-slate-500 text-[10px] font-bold">
                  {student?.name || "Scholar"} · {getSubjectLabels(subject).full}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
              <XCircle size={20} />
            </button>
          </div>

          {/* Narrative hook — space-themed story intro */}
          <div className="mx-5 mb-3 shrink-0">
            <p className="text-slate-300 text-sm leading-relaxed italic">
              &ldquo;{(theme.hooks || REALM_THEMES.default.hooks)[
                ((student?.name || "").length + (algorithmTopic || "").length) % (theme.hooks || REALM_THEMES.default.hooks).length
              ]}&rdquo;
            </p>
          </div>

          {/* Mission topic card */}
          {algorithmTopic && (
            <div className="mx-5 mb-2 rounded-2xl p-4 shrink-0"
              style={{ background: `${theme.colour}12`, border: `1.5px solid ${theme.colour}33` }}>
              <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: theme.colour }}>
                Your mission
              </p>
              <p className="text-white font-black text-lg leading-snug">{topicLabel}</p>
              <p className="text-slate-400 text-[11px] mt-1 leading-relaxed">
                {REASON_LABELS[topicReason] || "AI-selected based on your performance"}
              </p>
            </div>
          )}

          {/* Quest format stats */}
          <div className="flex items-center gap-3 mx-5 mb-3 shrink-0">
            {[
              { v: String(questionCount), label: "Questions" },
              { v: "MCQ", label: "Format" },
              { v: "10", label: "XP each" },
            ].map(s => (
              <div key={s.label} className="flex-1 rounded-xl py-2 text-center"
                style={{ background: "rgba(255,255,255,0.05)" }}>
                <p className="text-white font-black text-sm">{s.v}</p>
                <p className="text-slate-500 text-[9px] font-bold uppercase tracking-wide">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Journey Map (compact, scrollable) */}
          <div className="flex-1 overflow-y-auto px-5 py-2 min-h-0">
            <JourneyMap
              scholar={student}
              subjects={[subj]}
              masteryData={masteryRecords}
              onStartTopic={() => {}}
            />
          </div>

          {/* Launch button — 1 click */}
          <div className="px-5 py-4 shrink-0">
            <button
              onClick={() => setStage("quiz")}
              className="w-full py-3.5 rounded-2xl font-black text-sm text-white transition-all active:scale-95 shadow-lg"
              style={{ background: `linear-gradient(135deg, ${theme.colour}, #7c3aed)` }}
            >
              Launch Quest 🚀
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Briefing + Intro stages REMOVED — 1-click flow goes straight to quiz ──

  if (subj === "english" && (questData.isComprehension || questData.passageText)) {
    return (
      <ReadingComprehensionEngine
          student={student} subject={subject}
        scenario={questData.scenario}
        questions={questData.questions || []}
        onClose={onClose} onComplete={onComplete}
        BandQuizShell={BandQuizShell} band={band} friendlySubject={friendlySubject}
      />
    );
  }

  // STEM subjects use MainQuizEngine (which has full DB loading, nuclear fallback, etc.)
  // STEMEngine is reserved for scenario-based questions with investigation data panels.
  // Only route to STEMEngine if questData has a scenario — otherwise use MainQuizEngine.
  if ([
    "physics", "chemistry", "biology", "science", "basic_science",
    "financial_accounting", "commerce", "basic_technology", "further_mathematics",
  ].includes(subj) && questData.scenario) {
    return (
      <STEMEngine
         student={student} subject={subject}
        scenario={questData.scenario}
        questions={questData.questions || []}
        onClose={onClose} onComplete={onComplete}
        BandQuizShell={BandQuizShell} band={band} friendlySubject={friendlySubject}
      />
    );
  }

  if ([
    "history", "geography", "social_studies", "hass",
    "economics", "government", "business_studies", "civic_education",
  ].includes(subj) && questData.sourceMaterial) {
    return (
      <HumanitiesEngine
         student={student} subject={subject}
        scenario={questData.scenario}
        questions={questData.questions || []}
        onClose={onClose} onComplete={onComplete}
        BandQuizShell={BandQuizShell} band={band} friendlySubject={friendlySubject}
      />
    );
  }

  return (
    <MainQuizEngine
      student={student} subject={subject} curriculum={curriculum}
      questionCount={questionCount} previousQuestionIds={previousQuestionIds}
      onClose={onClose} onComplete={onComplete}
      taraEnabled={taraEnabled}
      focusedTopic={algorithmTopic}
      BandQuizShell={BandQuizShell}
      band={band}
      friendlySubject={friendlySubject}
    />
  );
}