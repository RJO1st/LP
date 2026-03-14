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
import { getSmartQuestions }        from "../../lib/smartQuestionSelection";
import {
  validateAndFixQuestion, dbRowToQuestion,
  buildCompletionPayload, saveQuizResult, getPerQuestionTimer,
} from "../../lib/quizUtils";
import { useTaraGate }          from "./TaraEIB";
import ImageDisplay             from "./ImageDisplay";
import MathsVisualiser         from "./MathsVisualiser";
import ReadingComprehensionEngine from "./ReadingComprehensionEngine";
import STEMEngine               from "./STEMEngine";
import HumanitiesEngine         from "./HumanitiesEngine";
import {
  EngineHeader, EngineFinished, MCQOptions, FeedbackArea, getSubjectLabels,
} from "./QuizShell";
import NarrativeIntro              from "./NarrativeIntro";
import { processAnswer }           from "../../lib/masteryEngine";
import { generateMissionLogEntry } from "../../lib/narrativeEngine";

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
const MAIN_THEMES = {
  maths:     { bg: "bg-indigo-50",  border: "border-indigo-100",  text: "text-indigo-900",  accent: "text-indigo-600",  btn: "bg-indigo-600 hover:bg-indigo-700",  Icon: () => <span className="text-base">🔢</span>, panelBg: "#eef2ff", accentHex: "#4f46e5" },
  english:   { bg: "bg-purple-50",  border: "border-purple-100",  text: "text-purple-900",  accent: "text-purple-600",  btn: "bg-purple-600 hover:bg-purple-700",  Icon: () => <span className="text-base">📖</span>, panelBg: "#f5f3ff", accentHex: "#7c3aed" },
  verbal:    { bg: "bg-violet-50",  border: "border-violet-100",  text: "text-violet-900",  accent: "text-violet-600",  btn: "bg-violet-600 hover:bg-violet-700",  Icon: () => <span className="text-base">🧩</span>, panelBg: "#f5f3ff", accentHex: "#6d28d9" },
  nvr:       { bg: "bg-cyan-50",    border: "border-cyan-100",    text: "text-cyan-900",    accent: "text-cyan-600",    btn: "bg-cyan-600 hover:bg-cyan-700",      Icon: () => <span className="text-base">🔷</span>, panelBg: "#ecfeff", accentHex: "#0891b2" },
  computing: { bg: "bg-slate-50",   border: "border-slate-100",   text: "text-slate-900",   accent: "text-slate-600",   btn: "bg-slate-700 hover:bg-slate-800",    Icon: () => <span className="text-base">💻</span>, panelBg: "#f8fafc", accentHex: "#475569" },
};
const DEFAULT_MAIN_THEME = {
  bg: "bg-indigo-50", border: "border-indigo-100", text: "text-indigo-900",
  accent: "text-indigo-600", btn: "bg-indigo-600 hover:bg-indigo-700",
  panelBg: "#eef2ff", accentHex: "#4f46e5",
  Icon: Rocket,
};

// ─── LOADING CARD ─────────────────────────────────────────────────────────────
function LoadingCard({ subject }) {
  const subj  = subject?.toLowerCase() || "maths";
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
// ─── LAYOUT HELPER ────────────────────────────────────────────────────────────
// Mirrors MathsVisualiser's parser entry conditions without doing any rendering.
// Used to decide whether to activate the side-by-side grid layout.
function hasMathsVisual(question, subject) {
  if (!question) return false;
  const subj  = (subject || "").toLowerCase();
  const topic = (question.topic || "").toLowerCase();
  const text  = question.q || question.question_text || "";

  const isMaths   = subj.includes("math");
  const isScience = subj.includes("science") || subj.includes("physics") || subj.includes("biology") || subj.includes("chemistry");
  const isNVR     = subj.includes("verbal") || subj.includes("nvr") || topic.includes("nvr");
  const isEnglish = subj.includes("english");
  if (!isMaths && !isScience && !isNVR && !isEnglish) return false;

  // ── NVR / VERBAL REASONING ────────────────────────────────────────────────────
  if (isNVR && /circle|square|triangle|diamond|star|cross|grow|shrink|larger|smaller|alternate|fill|rectangle|pentagon|hexagon|octagon/i.test(text)) return true;
  if (isNVR && /how many sides|how many corners|how many edges|how many vertices|what shape|which shape|sides does|corners does/i.test(text)) return true;
  if (isNVR && /sequence|series|pattern|next in|matrix|odd one out/i.test(text)) return true;
  // VR-specific: letter/alphabet sequences (AlphabetStripVis) + analogies
  if (isNVR && /letter|alphabet|next.*letter|[A-Z]\s+[A-Z]\s+[A-Z]/i.test(text)) return true;
  if (isNVR && (topic.includes("analogy") || /is to.*as|analogy/i.test(text))) return true;

  // ── SCIENCE ──────────────────────────────────────────────────────────────────
  if (isScience) {
    if (topic.includes("force") || topic.includes("newton")) return true;
    if (topic.includes("velocit") || topic.includes("speed") || topic.includes("motion")) return true;
    if (/m\/s|km\/h|mph/i.test(text)) return true;
    if (topic.includes("food_chain") || topic.includes("ecosystem") || /food chain|eats/i.test(text)) return true;
    if (topic.includes("distance_time") || topic.includes("velocity_time") || topic.includes("circuit")) return true;
    if (/d-t graph|v-t graph|series circuit|parallel circuit/i.test(text)) return true;
    if (topic.includes("periodic") || topic.includes("element") || topic.includes("atom")) return true;
    if (/find.*(speed|force|distance|mass|power|density)/i.test(text)) return true;
    if (topic.includes("wave") || /longitudinal|transverse|frequency|amplitude/i.test(text)) return true;
    if (topic.includes("molecule") || /H2O|CO2|NaCl|methane|oxygen molecule/i.test(text)) return true;
    // Fix: match both 'cell' and 'cell_biology', 'cell_structure' etc.
    if (topic.includes("cell") || /plant cell|animal cell/i.test(text)) return true;
    if (topic.includes("ph") || /acidic|alkaline|pH scale/i.test(text)) return true;
    if (topic.includes("energy") || /kinetic energy|potential energy|thermal energy/i.test(text)) return true;
    if (topic.includes("em_spectrum") || /electromagnetic|infrared|ultraviolet|gamma ray|x-ray/i.test(text)) return true;
    if (topic.includes("state") || /melting|freezing|boiling|evaporat|condensat/i.test(text)) return true;
    if (topic.includes("genetics") || /punnett|dominant|recessive|allele/i.test(text)) return true;
    // Fix: photosynthesis — show a cell diagram (CellVis) as a proxy
    if (topic.includes("photosynthesis") || /photosynthesis|chloroplast|chlorophyll/i.test(text)) return true;
    // Fix: electromagnet, magnetism
    if (topic.includes("magnet") || /magnet|electromagnet|magnetic field/i.test(text)) return true;
  }

  // ── MATHS ─────────────────────────────────────────────────────────────────────
  if (isMaths) {
    const year = parseInt(question?.year_level ?? question?._studentYear ?? 4, 10);
    // Early years arithmetic visuals
    if (year <= 4) {
      if (/[0-9]+\s*[+]\s*[0-9]+/.test(text)) return true;
      if (/[0-9]+\s*[-]\s*[0-9]+/.test(text)) return true;
      // Skip dots grid for decimal operands (2.5 × 4 — explanation panel is better)
      if (!(/\d+\.\d+\s*[×x*]|[×x*]\s*\d+\.\d+/.test(text)) &&
          (/[0-9]+\s*[x*]\s*[0-9]+/i.test(text) || text.includes("\u00d7") ||
           /\d+\s+(?:multiplied\s+by|times)\s+\d+/i.test(text))) return true;
      if (/[0-9]+\s*\/\s*[0-9]+/.test(text)) return true;
      if (/half|quarter|third/i.test(text)) return true;
      if (topic.includes("place_value") || topic.includes("count") || topic.includes("number_bond")) return true;
      if (year <= 2 && /eat|ate|take away|fly away|fell? off|lost|left|fewer|less|gives? away|burst|popped|spent|sold|more|gets?|join|arrive|together|total|altogether|groups? of|bags? of|boxes? of/i.test(text)) return true;
    }
    // All-year maths visuals
    if (topic.includes("coord") || topic.includes("plot") || /\(-?\d+,\s*-?\d+\)/.test(text)) return true;
    if (topic.includes("number_line") || topic.includes("rounding") || /round.*nearest|number line/i.test(text)) return true;
    // Negative numbers and "more/less than" phrasing → number line visual
    if (topic.includes("negative") || /negative|more than\s+-?\d+|less than\s+-?\d+|\d+\s+more than\s+-?\d+|\d+\s+less than\s+-?\d+|-\d+\s*[+\-]/i.test(text)) return true;
    if (topic.includes("venn") || /factors? of|multiples? of/i.test(text)) return true;
    if (topic.includes("bar_chart") || topic.includes("statistics") || /bar chart|how many more/i.test(text)) return true;
    // Word-form multiplication (all years): "6 groups of 7", "7 multiplied by 4", "3 times 5"
    if (/\d+\s+(?:groups?|bags?|rows?|sets?|packs?|plates?|baskets?)\s+of\s+\d+/i.test(text)) return true;
    if (/\d+\s+(?:multiplied\s+by|times)\s+\d+/i.test(text)) return true;
    if (topic.includes("angle") || /acute|obtuse|reflex|right angle|\d+\s*°/i.test(text)) return true;
    if (topic.includes("area") || topic.includes("perimeter") || /area|perimeter/i.test(text)) return true;
    if (topic.includes("quadratic") || /x\^2|quadratic/i.test(text)) return true;
    // IXL-aligned additions: clock, money, division, ruler, ratio
    if (topic.includes("time") || topic.includes("clock") || /o'clock|half past|quarter past|quarter to|\d+:\d+/i.test(text)) return true;
    if (topic.includes("money") || topic.includes("coin") || /pence|penny|pennies|£|\bp\b/i.test(text)) return true;
    if (topic.includes("division") || topic.includes("sharing") || /divide|share|split|each get|equally|how many weeks|how many days|how many months|how many times|how many groups/i.test(text)) return true;
    if (topic.includes("measure") || topic.includes("length") || /\bcm\b|\bmm\b|centimetre|millimetre|ruler/i.test(text)) return true;
    if (topic.includes("ratio") || topic.includes("proportion") || /ratio|for every|\d+\s*:\s*\d+/i.test(text)) return true;
    if (topic.includes("fraction") || /fraction|numerator|denominator/i.test(text)) return true;
    if (topic.includes("algebra") || /equation|solve for|variable|expression|\d+x\s*=|\d+\s*[×x]\s*\?|\?\s*[×x+\-]\s*\d+/i.test(text)) return true;
    if (topic.includes("probability") || /probability|likelihood|chance/i.test(text)) return true;
    if (topic.includes("sequence") || /next.*term|nth term|arithmetic sequence/i.test(text)) return true;
    if (topic.includes("percent") || /%/.test(text) || /percent/i.test(text)) return true;
    if (/hcf|lcm|highest common factor|lowest common multiple/i.test(text)) return true;
    if (/\bmean\b|\baverage\b|\bmode\b|\bmedian\b/i.test(text)) return true;
  }

  // ── ENGLISH ──────────────────────────────────────────────────────────────────
  if (isEnglish) {
    if (topic.includes("grammar") || topic.includes("noun") || topic.includes("verb") || topic.includes("adjective")) return true;
    if (topic.includes("prefix") || topic.includes("suffix") || /prefix|suffix|root word/i.test(text)) return true;
    if (topic.includes("synonym") || topic.includes("antonym") || /synonym|antonym|opposite|similar meaning/i.test(text)) return true;
    if (topic.includes("analogy") || /is to.*as|analogy/i.test(text)) return true;
  }

  return false;
}

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

  const timerRef        = useRef(null);
  const resultsRef      = useRef({ score: 0, answers: [] }); // stale-closure guard
  const sessionStartRef = useRef(Date.now());                // ← TIER 1: session timer
  const { taraComplete, onFeedbackReceived, resetTara } = useTaraGate();

  const { recordAnswer, getSessionMilestones, getSessionStoryPoints } = useMastery(student);
  const questionStartTime  = useRef(Date.now());
  const [pendingMilestone, setPendingMilestone] = useState(null);

  // ── Fetch questions ───────────────────────────────────────────────────────
  const fetchQuestions = useCallback(async () => {
    setGenerating(true);
    let qs = [];
    const rawYear = parseInt(student?.year_level || student?.year || 4, 10);
    const CURRICULUM_MIN_YEAR = { uk_11plus: 3 }; // uk_national has real Y1/Y2 content — no clamp needed
    const year = Math.max(rawYear, CURRICULUM_MIN_YEAR[curriculum] ?? 1);
    try {
      const dbRows = await getSmartQuestions(
        supabase, student?.id, subject, curriculum, year, questionCount, previousQuestionIds,
        null, student?.exam_mode ?? null
      );
      if (dbRows?.length > 0) qs = dbRows.map((r) => {
        const q = dbRowToQuestion(r, subject);
        if (q.year_level == null) q.year_level = year;
        q._studentYear = year;

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
      // Procedural fallback — only for subjects with reliable generators.
      // NVR and verbal procedural generators produce ambiguous/incorrect questions
      // (wrong odd-one-out logic, matrix patterns with multiple valid answers,
      // visualiser mismatches). Better to serve fewer DB questions than bad ones.
      const PROCEDURAL_SAFE = ["maths", "mathematics", "english", "science", "physics", "chemistry", "biology"];
      const canUseProcedural = PROCEDURAL_SAFE.includes(subj);

      if (canUseProcedural) {
        try {
          const fb = await generateSessionQuestions(student, subject, "foundation", questionCount);
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
        answers: [...r.answers, { q: q.q, isCorrect, correct: q.opts[q.a], myAnswer: q.opts[idx] }],
      };
      resultsRef.current = next;
      return next;
    });

    recordTopicResult(q.topic || subject, isCorrect);

    recordAnswer(q, isCorrect, idx, timeTaken).then(() => {
      if (isCorrect) {
        const milestones = getSessionMilestones();
        if (milestones.length) setPendingMilestone(milestones[milestones.length - 1]);
      }
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
    const serverTierCrossed = sessionMilestones.current?.some(m => m.type === 'tier_crossed');
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
        xpEarned={finalScore * 10}
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
  const hasVisual  = q.image_url || hasMathsVisual(q, subject);
  const hasPassage = !!q.passage;

  // For English w/o passage: use topic as panel label not generic "Reading Passage"
  const panelScenarioLabel = (subject === "english" && !hasPassage)
    ? (labels.scenarioNoPassage || formatTopicLabel(q.topic || "english", sessionQuestions))
    : labels.scenario;

  const leftPanelContent = hasPassage ? (
    // Passage / reading context
    <div className="flex flex-col gap-3 h-full">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs shrink-0"
          style={{ backgroundColor: theme.accentHex || "#4f46e5" }}>
          <BookOpen size={13} />
        </span>
        <div>
          <p className="text-xs font-black text-slate-800">{panelScenarioLabel}</p>
          <p className="text-[10px] text-slate-400 font-semibold">Read this passage carefully</p>
        </div>
      </div>
      <div className="flex-1 bg-white rounded-xl border border-slate-200 p-4 text-sm text-slate-700 font-medium leading-relaxed overflow-y-auto">
        {q.passage}
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

  return (
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
            <h3 className="text-base sm:text-lg font-black text-slate-800 leading-snug">
              {q.q}
            </h3>

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
              themeBg={theme.bg} themeBorder={theme.border} themeAccent={theme.accent}
              taraFeedbackReceived={onFeedbackReceived} onNext={next}
              isLast={qIdx === sessionQuestions.length - 1}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── QUEST BRIEFING SCREEN ────────────────────────────────────────────────────
// Shown before NarrativeIntro. Sets the learning theme explicitly so scholars
// and parents know exactly what this quest covers before it starts.
const REALM_THEMES = {
  maths:            { realm: "Number Nebula",   colour: "#6366f1", icon: "🔢" },
  mathematics:      { realm: "Number Nebula",   colour: "#6366f1", icon: "🔢" },
  english:          { realm: "Word Galaxy",     colour: "#ec4899", icon: "📖" },
  verbal_reasoning: { realm: "Word Galaxy",     colour: "#7c3aed", icon: "🧩" },
  nvr:              { realm: "Pattern Planet",  colour: "#0891b2", icon: "🔷" },
  science:          { realm: "Science Sector",  colour: "#059669", icon: "🔬" },
  physics:          { realm: "Science Sector",  colour: "#1d4ed8", icon: "⚡" },
  chemistry:        { realm: "Science Sector",  colour: "#dc2626", icon: "⚗️" },
  biology:          { realm: "Science Sector",  colour: "#16a34a", icon: "🌿" },
  history:          { realm: "History Halls",   colour: "#92400e", icon: "🏛️" },
  geography:        { realm: "Geo Sphere",      colour: "#065f46", icon: "🌍" },
  default:          { realm: "Learning Realm",  colour: "#4f46e5", icon: "🚀" },
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
            Ready, <span className="text-white font-bold">{scholarName || "Cadet"}</span>?
          </p>
          <h2 className="text-white font-black text-xl leading-tight mb-4">
            Your next quest begins now.
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
              { v: "20", label: "Questions" },
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
    `Exploring ${topicLabel} — building skills in ${(subject || "maths").replace(/_/g, " ")}.`;
}

// ─── QUEST ORCHESTRATOR ───────────────────────────────────────────────────────
export default function QuestOrchestrator({
  student, subject, curriculum,
  questionCount = 20, previousQuestionIds = [],
  questData = {}, onClose, onComplete,
}) {
  const subj = subject?.toLowerCase() || "maths";

  // Three-stage flow: "briefing" → "intro" (NarrativeIntro) → quiz
  const [stage,          setStage]          = useState("briefing");
  const [masteryRecords, setMasteryRecords] = useState([]);

  const rawTopic   = questData?.topic ?? subj;
  const topicLabel = formatTopicLabel(rawTopic, questData?.questions || []);

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

  if (stage === "briefing") {
    return (
      <QuestBriefing
        subject={subj}
        topicLabel={topicLabel}
        scholarName={student?.name}
        onContinue={() => setStage("intro")}
        onClose={onClose}
      />
    );
  }

  if (stage === "intro") {
    return (
      <NarrativeIntro
        scholar={student}
        subject={subj}
        topic={rawTopic}
        masteryScore={masteryRecords.find(r => r.topic === rawTopic)?.mastery_score ?? 0}
        masteryRecords={masteryRecords}
        isDueReview={questData?.isDueReview ?? false}
        onStart={() => setStage("quiz")}
      />
    );
  }

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

  return (
    <MainQuizEngine
      student={student} subject={subject} curriculum={curriculum}
      questionCount={questionCount} previousQuestionIds={previousQuestionIds}
      onClose={onClose} onComplete={onComplete}
    />
  );
}