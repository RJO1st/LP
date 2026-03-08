"use client";
/**
 * QuestOrchestrator.jsx
 * Deploy to: src/components/game/QuestOrchestrator.jsx
 *
 * Routes quiz sessions to the correct specialist engine:
 *   ReadingComprehensionEngine — english + passage
 *   STEMEngine                — physics / chemistry / biology / science etc.
 *   HumanitiesEngine          — history / geography / social_studies etc.
 *   MainQuizEngine            — everything else (maths, verbal, nvr, computing…)
 *
 * MainQuizEngine redesign (v2):
 *   • Compact card (max-w-lg) — question + options + Tara all visible at once
 *   • ImageDisplay support from question_bank.image_url
 *   • resultsRef stale-closure fix
 *   • Consistent EngineHeader / MCQOptions / FeedbackArea from QuizShell
 *   • Subject-aware accent colours
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Rocket, XCircle } from "lucide-react";
import { supabase }                from "../../lib/supabase";
import { generateSessionQuestions } from "../../lib/proceduralEngine";
import { getSmartQuestions }        from "../../lib/smartQuestionSelection";
import {
  normalizeQuestion, validateAndFixQuestion, dbRowToQuestion,
  buildCompletionPayload, saveQuizResult, getPerQuestionTimer,
} from "../../lib/quizUtils";
import { useTaraGate }          from "./TaraEIB";
import ImageDisplay             from "./ImageDisplay";
import ReadingComprehensionEngine from "./ReadingComprehensionEngine";
import STEMEngine               from "./STEMEngine";
import HumanitiesEngine         from "./HumanitiesEngine";
import {
  EngineHeader, EngineFinished, MCQOptions, FeedbackArea, getSubjectLabels,
} from "../game/QuizShell";
import NarrativeIntro              from "./NarrativeIntro";
import { processAnswer }           from "../../lib/masteryEngine";
import { generateMissionLogEntry } from "../../lib/narrativeEngine";

const XP_PER_QUESTION = 10;

// ─── useMastery HOOK ─────────────────────────────────────────────────────────
// Handles optimistic mastery updates per answer. API call is fire-and-forget
// so it never blocks the quiz UI. Cache is updated with server values once
// the response arrives.
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

    // Optimistic update (instant)
    const prev    = masteryCache.current[topic] ?? null;
    const updated = processAnswer(prev, correct);
    masteryCache.current[topic] = updated;

    // Fire-and-forget
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
        if (data.storyPointsEarned)  sessionStoryPts.current += data.storyPointsEarned;
      })
      .catch(err => console.warn("mastery update failed (non-fatal):", err));

    return updated;
  }, [student]);

  const getMastery           = useCallback((topic) => masteryCache.current[topic] ?? null, []);
  const getSessionMilestones = useCallback(() => sessionMilestones.current, []);
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

// ─── SUBJECT ACCENT THEMES for MainQuizEngine ────────────────────────────────
const MAIN_THEMES = {
  maths:   { bg: "bg-indigo-50",  border: "border-indigo-100",  text: "text-indigo-900",  accent: "text-indigo-600",  btn: "bg-indigo-600 hover:bg-indigo-700",  Icon: () => <span className="text-base">🔢</span> },
  english: { bg: "bg-purple-50",  border: "border-purple-100",  text: "text-purple-900",  accent: "text-purple-600",  btn: "bg-purple-600 hover:bg-purple-700",  Icon: () => <span className="text-base">📖</span> },
  verbal:  { bg: "bg-violet-50",  border: "border-violet-100",  text: "text-violet-900",  accent: "text-violet-600",  btn: "bg-violet-600 hover:bg-violet-700",  Icon: () => <span className="text-base">🧩</span> },
  nvr:     { bg: "bg-cyan-50",    border: "border-cyan-100",    text: "text-cyan-900",    accent: "text-cyan-600",    btn: "bg-cyan-600 hover:bg-cyan-700",      Icon: () => <span className="text-base">🔷</span> },
  computing: { bg: "bg-slate-50", border: "border-slate-100",   text: "text-slate-900",   accent: "text-slate-600",   btn: "bg-slate-700 hover:bg-slate-800",    Icon: () => <span className="text-base">💻</span> },
};
const DEFAULT_MAIN_THEME = {
  bg: "bg-indigo-50", border: "border-indigo-100", text: "text-indigo-900",
  accent: "text-indigo-600", btn: "bg-indigo-600 hover:bg-indigo-700",
  Icon: Rocket,
};

// ─── LOADING SCREEN ──────────────────────────────────────────────────────────
function LoadingCard({ subject }) {
  const subj = subject?.toLowerCase() || "maths";
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

// ─── MAIN QUIZ ENGINE ────────────────────────────────────────────────────────
function MainQuizEngine({ student, subject, curriculum, questionCount, previousQuestionIds, onComplete, onClose }) {
  const perQTimer = useMemo(() => getPerQuestionTimer(student), [student]);
  const subj      = subject?.toLowerCase() || "maths";
  const theme     = MAIN_THEMES[subj] || DEFAULT_MAIN_THEME;
  const labels    = useMemo(() => getSubjectLabels(subject), [subject]);

  const [sessionQuestions, setSessionQuestions] = useState([]);
  const [qIdx,             setQIdx]             = useState(0);
  const [selected,         setSelected]         = useState(null);
  const [results,          setResults]          = useState({ score: 0, answers: [] });
  const [finished,         setFinished]         = useState(false);
  const [generating,       setGenerating]       = useState(true);
  const [timeLeft,         setTimeLeft]         = useState(perQTimer);
  const [topicSummary,     setTopicSummary]     = useState({});

  const timerRef   = useRef(null);
  const resultsRef = useRef({ score: 0, answers: [] }); // stale-closure guard
  const { taraComplete, onFeedbackReceived, resetTara } = useTaraGate();

  // ── Mastery hook ─────────────────────────────────────────────────────────
  const { recordAnswer, getSessionMilestones, getSessionStoryPoints } = useMastery(student);
  const questionStartTime   = useRef(Date.now());
  const [pendingMilestone,  setPendingMilestone]  = useState(null);

  // ── Fetch questions ───────────────────────────────────────────────────────
  const fetchQuestions = useCallback(async () => {
    setGenerating(true);
    let qs = [];
    const year = parseInt(student?.year_level || student?.year || 4, 10);
    try {
      const dbRows = await getSmartQuestions(
        supabase, student?.id, subject, curriculum, year, questionCount, previousQuestionIds
      );
      if (dbRows?.length > 0) qs = dbRows.map((r) => dbRowToQuestion(r, subject));
    } catch (e) { console.warn("[MainQuiz] DB:", e); }
    if (qs.length < questionCount) {
      try {
        const fb = await generateSessionQuestions(student, subject, "foundation", questionCount);
        qs = [...qs, ...(fb || [])].slice(0, questionCount);
      } catch {}
    }
    setSessionQuestions(
      (qs || []).map(normalizeQuestion).map((q, i) => validateAndFixQuestion(q, i)).filter(Boolean)
    );
    setGenerating(false);
  }, [student, subject, curriculum, questionCount, previousQuestionIds]);

  useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

  // ── Per-question timer ───────────────────────────────────────────────────
  useEffect(() => {
    if (finished || generating || !sessionQuestions[qIdx]) return;
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((p) => (p <= 1 ? 0 : p - 1));
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [qIdx, generating, finished, sessionQuestions]);

  // ── Handlers ────────────────────────────────────────────────────────────
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
        answers: [...r.answers, { q: q.q, isCorrect, correct: q.opts[q.a], myAnswer: q.opts[idx] }],
      };
      resultsRef.current = next;
      return next;
    });

    recordTopicResult(q.topic || subject, isCorrect);

    // Fire mastery update + surface any milestone earned
    recordAnswer(q, isCorrect, idx, timeTaken).then(() => {
      const milestones = getSessionMilestones();
      if (milestones.length) setPendingMilestone(milestones[milestones.length - 1]);
    });

    questionStartTime.current = Date.now();
  }, [selected, sessionQuestions, qIdx, subject, recordTopicResult, recordAnswer, getSessionMilestones]);

  const finishQuest = useCallback(async () => {
    clearInterval(timerRef.current);
    const { answers } = resultsRef.current;
    const correctCount = answers.filter(a => a.isCorrect).length;

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
      studentId: student?.id, subject, questions: sessionQuestions,
      answers, topicSummary, xpPerQuestion: XP_PER_QUESTION,
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

  // ── Render guards ────────────────────────────────────────────────────────
  if (generating) return <LoadingCard subject={subject} />;

  const q = sessionQuestions[qIdx];
  if (!q) return null;

  if (finished) {
    const finalScore = resultsRef.current.answers.filter((a) => a.isCorrect).length;
    return (
      <EngineFinished
        Icon={Rocket} accent={theme.accent} textColor={theme.text} btnClass={theme.btn}
        finalScore={finalScore} totalQuestions={sessionQuestions.length}
        title={labels.finish} onClose={onClose}
      />
    );
  }

  const isCorrectAnswer = selected === q.a;
  const canProceed      = isCorrectAnswer || (selected !== null && !isCorrectAnswer && taraComplete);
  const progress        = ((qIdx + 1) / sessionQuestions.length) * 100;

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[4000] flex items-center justify-center p-3 sm:p-4">
      {/* ── Milestone celebration overlay ─────────────────────────────── */}
      {pendingMilestone && (
        <MilestoneCelebration
          milestones={[pendingMilestone]}
          onDismiss={() => setPendingMilestone(null)}
        />
      )}
      {/* ── Compact card — max-w-lg keeps content always in viewport ── */}
      <div className="bg-white w-full max-w-lg rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border-b-4 border-slate-200"
           style={{ maxHeight: "94vh" }}>

        {/* Progress bar */}
        <div className="h-1 bg-slate-100 shrink-0">
          <div className={`h-full transition-all duration-500 ${theme.btn.split(" ")[0]}`}
               style={{ width: `${progress}%` }} />
        </div>

        {/* Header */}
        <EngineHeader
          Icon={theme.Icon} bg={theme.bg} border={theme.border}
          textColor={theme.text} accent={theme.accent} btnClass={theme.btn}
          label={labels.header}
          qIdx={qIdx} totalQuestions={sessionQuestions.length}
          timeLeft={timeLeft}
          onClose={onClose}
        />

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">

          {/* Question image (from question_bank.image_url) */}
          {q.image_url && (
            <ImageDisplay src={q.image_url} alt="Question visual" />
          )}

          {/* Question text */}
          <h3 className="text-base sm:text-xl font-black text-slate-800 leading-snug">
            {q.q}
          </h3>

          {/* Passage (comprehension embedded in a non-English question) */}
          {q.passage && (
            <div className={`p-3 rounded-xl border-l-4 ${theme.bg} ${theme.border} text-slate-700 text-xs sm:text-sm font-medium italic leading-relaxed`}>
              {q.passage}
            </div>
          )}

          {/* MCQ Options */}
          <MCQOptions
            opts={q.opts} correctIdx={q.a}
            selected={selected} onPick={handlePick}
          />

          {/* Feedback + Tara + Continue */}
          <FeedbackArea
            selected={selected}
            isCorrectAnswer={isCorrectAnswer}
            canProceed={canProceed}
            currentQ={q}
            student={student}
            subject={subject}
            themeBg={theme.bg}
            themeBorder={theme.border}
            themeAccent={theme.accent}
            taraFeedbackReceived={onFeedbackReceived}
            onNext={next}
            isLast={qIdx === sessionQuestions.length - 1}
          />
        </div>
      </div>
    </div>
  );
}

// ─── QUEST ORCHESTRATOR ───────────────────────────────────────────────────────
export default function QuestOrchestrator({
  student, subject, curriculum,
  questionCount = 10, previousQuestionIds = [],
  questData = {}, onClose, onComplete,
}) {
  const subj = subject?.toLowerCase() || "maths";

  // ── NarrativeIntro gate ──────────────────────────────────────────────────
  const [showIntro,      setShowIntro]      = useState(true);
  const [masteryRecords, setMasteryRecords] = useState([]);

  useEffect(() => {
    if (!student?.id || !curriculum) return;
    supabase
      .from("scholar_topic_mastery")
      .select("*")
      .eq("scholar_id", student.id)
      .eq("curriculum", curriculum)
      .eq("subject", subj)
      .then(({ data }) => setMasteryRecords(data ?? []));
  }, [student?.id, curriculum, subj]);

  if (showIntro) {
    return (
      <NarrativeIntro
        scholar={student}
        subject={subj}
        topic={questData?.topic ?? subj}
        masteryScore={masteryRecords.find(r => r.topic === questData?.topic)?.mastery_score ?? 0}
        masteryRecords={masteryRecords}
        isDueReview={questData?.isDueReview ?? false}
        onStart={() => setShowIntro(false)}
      />
    );
  }

  // English + passage → ReadingComprehensionEngine
  if (subj === "english" && (questData.isComprehension || questData.passageText)) {
    return (
      <ReadingComprehensionEngine
        student={student}
        passageTitle={questData.passageTitle}
        passageText={questData.passageText}
        questions={questData.questions || []}
        onClose={onClose} onComplete={onComplete}
      />
    );
  }

  // STEM subjects → STEMEngine
  if ([
    "physics", "chemistry", "biology", "science", "basic_science",
    "financial_accounting", "commerce", "basic_technology", "further_mathematics",
  ].includes(subj)) {
    return (
      <STEMEngine
        student={student} subject={subject}
        scenario={questData.scenario}
        questions={questData.questions || []}
        onClose={onClose} onComplete={onComplete}
      />
    );
  }

  // Humanities subjects → HumanitiesEngine
  if ([
    "history", "geography", "social_studies", "hass",
    "economics", "government", "business_studies", "civic_education",
  ].includes(subj)) {
    return (
      <HumanitiesEngine
        student={student} subject={subject}
        sourceMaterial={questData.sourceMaterial}
        questions={questData.questions || []}
        onClose={onClose} onComplete={onComplete}
      />
    );
  }

  // Default: maths, verbal, nvr, computing, etc.
  return (
    <MainQuizEngine
      student={student} subject={subject} curriculum={curriculum}
      questionCount={questionCount} previousQuestionIds={previousQuestionIds}
      onClose={onClose} onComplete={onComplete}
    />
  );
}