"use client";
/**
 * QuizShell.jsx
 * Deploy to: src/components/game/QuizShell.jsx
 *
 * v2 — Upgraded UI based on design inspirations:
 *   + MCQOptions    — Bold A/B/C/D label chips (Image 9 style)
 *   + EngineFinished — Stat trio, readiness arc gauge, grade bar,
 *                      "Where you lost marks", AI coach insight cards,
 *                      difficulty rating (Image 5 + 7 style)
 *   + EngineHeader  — Subject chip, Q counter, timer pill, progress bar (Image 8 style)
 *   + FeedbackArea  — Preserves TaraEIB + canProceed gate (original logic)
 *   + EngineLoading — Preserved from original
 *
 * API is 100% backward-compatible with original QuizShell.jsx
 */

import React, { useState, useEffect, lazy, Suspense } from "react";
import {
  XCircle, CheckCircle, ArrowRight, Zap,
  Trophy, Target, TrendingUp, Star, Brain,
  AlertTriangle, Lightbulb, Clock, ChevronDown, ChevronUp,
} from "lucide-react";
import TaraEIB from "./TaraEIB";

// Lazy-load certificate (only needed on Distinction)
const MasteryCertificate = lazy(() => import("./MasteryCertificate"));
function MasteryCertificateLazy(props) {
  return (
    <Suspense fallback={null}>
      <MasteryCertificate {...props} />
    </Suspense>
  );
}

// ─── SUBJECT LABEL MAP ───────────────────────────────────────────────────────
const SUBJECT_LABELS = {
  physics:              { header: "Physics Lab Station",          scenario: "Experiment Data",       loading: "Calibrating instruments...",    finish: "Lab Analysis Complete!"          },
  chemistry:            { header: "Chemistry Lab Station",        scenario: "Reaction Data",          loading: "Preparing reagents...",         finish: "Lab Analysis Complete!"          },
  biology:              { header: "Biology Lab Station",          scenario: "Field Observation",      loading: "Setting up microscope...",      finish: "Lab Analysis Complete!"          },
  science:              { header: "Science Investigation",        scenario: "Investigation Data",     loading: "Gathering evidence...",         finish: "Investigation Complete!"         },
  basic_science:        { header: "Science Discovery",            scenario: "Discovery Data",         loading: "Exploring the world...",        finish: "Discovery Complete!"             },
  history:              { header: "History Source Analysis",      scenario: "Primary Source",         loading: "Unearthing archives...",        finish: "Source Analysis Complete!"       },
  geography:            { header: "Geography Field Study",        scenario: "Field Data",             loading: "Reading the terrain...",        finish: "Field Study Complete!"           },
  social_studies:       { header: "Social Studies Investigation", scenario: "Case Study",             loading: "Reviewing evidence...",         finish: "Investigation Complete!"         },
  hass:                 { header: "HASS Investigation",           scenario: "Source Material",        loading: "Gathering sources...",          finish: "Investigation Complete!"         },
  english:              { header: "Reading Comprehension",        scenario: "Reading Passage",        scenarioNoPassage: "Study Material",       loading: "Loading passage...",            finish: "Passage Complete!"               },
  financial_accounting: { header: "Financial Accounting",         scenario: "Ledger Data",            loading: "Crunching numbers...",          finish: "Accounting Complete!"            },
  commerce:             { header: "Commerce Analysis",            scenario: "Market Data",            loading: "Analyzing trade...",            finish: "Commerce Complete!"              },
  basic_technology:     { header: "Technology Workshop",          scenario: "Technical Data",         loading: "Setting up equipment...",       finish: "Workshop Complete!"              },
  further_mathematics:  { header: "Further Mathematics",          scenario: "Advanced Problem",       loading: "Calculating...",                finish: "Problem Solved!"                 },
  economics:            { header: "Economics Study",              scenario: "Economic Indicators",    loading: "Analyzing markets...",          finish: "Economic Analysis Complete!"     },
  government:           { header: "Government & Politics",        scenario: "Policy Document",        loading: "Reviewing legislation...",      finish: "Political Analysis Complete!"    },
  business_studies:     { header: "Business Studies",             scenario: "Case Study",             loading: "Evaluating business...",        finish: "Business Analysis Complete!"     },
  maths:                { header: "Maths Mission",                scenario: "Problem Set",            loading: "Preparing your maths mission…", finish: "Mission Debrief"                 },
  verbal:               { header: "Verbal Reasoning",             scenario: "Word Problem",           loading: "Warming up verbal circuits…",  finish: "Mission Debrief"                 },
  nvr:                  { header: "Non-Verbal Reasoning",         scenario: "Pattern Problem",        loading: "Calibrating pattern sensors…", finish: "Mission Debrief"                 },
};

export function getSubjectLabels(subject) {
  return SUBJECT_LABELS[subject?.toLowerCase()] || {
    header: `${subject || "Study"} Mission`,
    scenario: "Study Material",
    loading: "Preparing your mission…",
    finish: "Mission Debrief",
  };
}

// ─── SUBJECT COLOUR MAP ──────────────────────────────────────────────────────
const SUBJECT_COLORS = {
  maths:     { accent: "#4f46e5", chipBg: "#eef2ff", chipText: "#4338ca" },
  english:   { accent: "#7c3aed", chipBg: "#f5f3ff", chipText: "#6d28d9" },
  verbal:    { accent: "#6d28d9", chipBg: "#f5f3ff", chipText: "#5b21b6" },
  nvr:       { accent: "#0891b2", chipBg: "#ecfeff", chipText: "#0e7490" },
  physics:   { accent: "#0891b2", chipBg: "#ecfeff", chipText: "#0e7490" },
  chemistry: { accent: "#059669", chipBg: "#ecfdf5", chipText: "#047857" },
  biology:   { accent: "#059669", chipBg: "#ecfdf5", chipText: "#047857" },
  science:   { accent: "#059669", chipBg: "#ecfdf5", chipText: "#047857" },
  history:   { accent: "#b45309", chipBg: "#fffbeb", chipText: "#92400e" },
  geography: { accent: "#0891b2", chipBg: "#ecfeff", chipText: "#0e7490" },
  economics: { accent: "#059669", chipBg: "#ecfdf5", chipText: "#047857" },
};
function getColors(subject) {
  const s = (subject || "").toLowerCase();
  for (const [key, val] of Object.entries(SUBJECT_COLORS)) {
    if (s.includes(key)) return val;
  }
  return { accent: "#4f46e5", chipBg: "#eef2ff", chipText: "#4338ca" };
}

// ─── QUESTION NORMALISATION ─────────────────────────────────────────────────
/**
 * normalizeQuestion — converts any question shape to internal format.
 * DB rows: { options: [...], correct_index: N, question_text: "..." }
 * Internal: { opts: [...], a: N, q: "..." }
 */
export function normalizeQuestion(raw) {
  if (!raw) return null;

  let opts = [];
  if (Array.isArray(raw.opts) && raw.opts.length > 0) opts = raw.opts;
  else if (Array.isArray(raw.options) && raw.options.length > 0) opts = raw.options;
  else if (typeof raw.options === 'string') {
    try { opts = JSON.parse(raw.options); } catch { opts = []; }
  }

  if (opts.length === 0) return raw;

  let a = raw.a !== undefined ? Number(raw.a)
        : raw.correct_index !== undefined ? Number(raw.correct_index)
        : raw.correctIndex !== undefined ? Number(raw.correctIndex)
        : 0;

  if (a < 0 || a >= opts.length) a = 0;

  const correctText = opts[a];
  
  // Shuffle options safely
  const shuffledOpts = [...opts];
  for (let i = shuffledOpts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledOpts[i], shuffledOpts[j]] = [shuffledOpts[j], shuffledOpts[i]];
  }

  const newA = shuffledOpts.indexOf(correctText);

  const q   = raw.q ?? raw.question_text ?? raw.questionText ?? "";
  const exp = raw.exp ?? raw.explanation ?? "";

  return { ...raw, opts: shuffledOpts, a: newA !== -1 ? newA : 0, q, exp, correctAnswer: correctText };
}

/** dbRowToQuestion — alias for normalizeQuestion, accepts optional subject override */
export function dbRowToQuestion(row, subject) {
  return normalizeQuestion(subject ? { ...row, subject } : row);
}

/** validateAndFixQuestion — drops questions with missing options/text, clamps correct index */
export function validateAndFixQuestion(q, idx) {
  if (!q) return null;
  if (!Array.isArray(q.opts) || q.opts.length < 2) {
    console.warn(`[QuizShell] Q[${idx}] dropped — no valid options`, q);
    return null;
  }
  if (!q.q || typeof q.q !== "string" || !q.q.trim()) {
    console.warn(`[QuizShell] Q[${idx}] dropped — no question text`, q);
    return null;
  }
  return { ...q, a: Math.max(0, Math.min(Number(q.a) || 0, q.opts.length - 1)) };
}

// ─── OPTION LABELS ───────────────────────────────────────────────────────────
const OPTION_LABELS = ["A", "B", "C", "D", "E", "F"];

// ─── LOADING ─────────────────────────────────────────────────────────────────
export function EngineLoading({ Icon, accent, title, subtitle }) {
  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[5000] flex items-center justify-center p-4">
      <div className="bg-white rounded-[32px] p-6 text-center max-w-xs w-full shadow-2xl">
        <Icon size={44} className={`mx-auto mb-3 animate-bounce ${accent}`} />
        <h3 className="text-lg font-black text-slate-800 mb-1">{title}</h3>
        <p className="text-sm text-slate-500 font-bold">{subtitle}</p>
      </div>
    </div>
  );
}

// ─── ENGINE HEADER ────────────────────────────────────────────────────────────
// Image 8 inspired: subject chip | Q counter | timer pill | progress bar
export function EngineHeader({
  Icon, bg, border, textColor, accent, btnClass,
  label, qIdx = 0, totalQuestions = 10, timeLeft, onClose,
  // new props (optional, falls back gracefully)
  subject, total,
}) {
  const labels   = getSubjectLabels(subject);
  const colors   = getColors(subject);
  const count    = total ?? totalQuestions;
  const progress = count > 0 ? (qIdx / count) * 100 : 0;

  const timerCls =
    timeLeft == null        ? "text-slate-500 bg-slate-100" :
    timeLeft > 20           ? "text-emerald-700 bg-emerald-50" :
    timeLeft > 10           ? "text-amber-700   bg-amber-50"   :
                              "text-red-700 bg-red-50 animate-pulse";

  const fmtTime = (s) => {
    if (s == null) return null;
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}:${sec.toString().padStart(2, "0")}` : `${s}s`;
  };

  return (
    <div className="w-full shrink-0">
      {/* Header row */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        {/* Left: subject chip + label */}
        <div className="flex items-center gap-2 min-w-0">
          {Icon && (
            <span className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0"
              style={{ backgroundColor: colors.accent }}>
              <Icon size={14} />
            </span>
          )}
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wider truncate"
              style={{ color: colors.accent }}>
              {label || labels.header}
            </p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Question {qIdx + 1} of {count}
            </p>
          </div>
        </div>

        {/* Right: counter pill + timer + close */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
            {qIdx + 1} / {count}
          </span>
          {timeLeft != null && (
            <span className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full transition-colors ${timerCls}`}>
              <Clock size={11} />
              {fmtTime(timeLeft)}
            </span>
          )}
          <button onClick={() => onClose?.()} className="text-slate-400 hover:text-rose-500 transition-colors ml-1">
            <XCircle size={22} />
          </button>
        </div>
      </div>

      {/* Thin progress bar */}
      <div className="h-1 w-full bg-slate-100">
        <div className="h-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%`, backgroundColor: colors.accent }} />
      </div>
    </div>
  );
}

// ─── MCQ OPTIONS ─────────────────────────────────────────────────────────────
// Image 9 inspired: bold A/B/C/D label chip + option text side by side
export function MCQOptions({ opts, correctIdx, selected, onPick }) {
  const answered = selected !== null && selected !== undefined;

  return (
    <div className="space-y-2.5 mb-5">
      {(opts || []).map((opt, i) => {
        const isSelected     = selected === i;
        const isCorrect      = i === correctIdx;
        const answered_wrong = answered && isSelected && !isCorrect;
        const answered_right = answered && isSelected && isCorrect;
        const show_correct   = answered && isCorrect && !isSelected;
        const dimmed         = answered && !isSelected && !isCorrect;

        // Letter chip colour
        const labelCls =
          answered_wrong ? "bg-red-500 text-white" :
          answered_right ? "bg-emerald-500 text-white" :
          show_correct   ? "bg-emerald-500 text-white" :
          isSelected     ? "bg-indigo-600 text-white" :
                           "bg-slate-200 text-slate-600";

        // Row style
        const rowCls =
          answered_wrong ? "border-red-300 bg-red-50 ring-2 ring-red-100" :
          answered_right ? "border-emerald-400 bg-emerald-50 ring-2 ring-emerald-100" :
          show_correct   ? "border-emerald-400 bg-emerald-50 ring-2 ring-emerald-100" :
          dimmed         ? "border-slate-100 bg-white opacity-40 grayscale" :
                           "border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/40 cursor-pointer";

        const RightIcon =
          answered_wrong                    ? XCircle :
          (answered_right || show_correct)  ? CheckCircle :
          null;
        const iconCls = answered_wrong ? "text-red-500" : "text-emerald-500";

        return (
          <button
            key={i}
            disabled={answered}
            onClick={() => !answered && onPick(i)}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl sm:rounded-2xl border-2 text-left transition-all duration-150 ${rowCls}`}
          >
            {/* Letter chip */}
            <span className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-sm font-black transition-all ${labelCls}`}>
              {OPTION_LABELS[i] || i + 1}
            </span>

            {/* Option text */}
            <span className={`flex-1 text-sm sm:text-[15px] font-bold leading-snug ${dimmed ? "text-slate-400" : "text-slate-700"}`}>
              {opt}
            </span>

            {/* Right icon */}
            {RightIcon && <RightIcon size={18} className={`flex-shrink-0 ${iconCls}`} />}
          </button>
        );
      })}
    </div>
  );
}

// ─── FEEDBACK + TARA + NEXT ──────────────────────────────────────────────────
// Preserves original logic: TaraEIB for wrong answers, canProceed gates Next button
export function FeedbackArea({
  selected, isCorrectAnswer, canProceed, currentQ, student, subject,
  scholarAnswer, themeBg, themeBorder, themeAccent, taraFeedbackReceived, onNext, isLast,
}) {
  if (selected === null) return null;

  // Derive scholar's chosen answer text if not explicitly passed
  const chosenText = scholarAnswer ?? (selected !== null ? currentQ?.opts?.[selected] : null);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 mt-5 pt-5 border-t border-slate-100">
      {/* Explanation */}
      {currentQ?.exp && (
        <div className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border-l-4 flex gap-2.5 items-start mb-3 ${themeBg} ${themeBorder} text-slate-800`}>
          <Zap size={20} className={`shrink-0 mt-0.5 ${themeAccent}`} />
          <p className="text-xs sm:text-sm font-bold leading-relaxed">{currentQ.exp}</p>
        </div>
      )}

      {/* Tara EIB — only for wrong answers */}
      {!isCorrectAnswer && (
        <TaraEIB
          student={student}
          subject={subject}
          currentQ={currentQ}
          correctAnswer={currentQ?.opts?.[currentQ?.a]}
          scholarAnswer={chosenText}
          onFeedbackReceived={taraFeedbackReceived}
        />
      )}

      {/* Next button — gated by canProceed (Tara gate) */}
      {canProceed && (
        <button
          onClick={onNext}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-3 sm:py-4 rounded-xl sm:rounded-2xl flex items-center justify-center gap-2 text-sm sm:text-base border-b-4 border-black transition-all active:border-b-0 active:translate-y-1"
        >
          {isLast ? "Complete" : "Next Question"} <ArrowRight size={18} />
        </button>
      )}
    </div>
  );
}

// ─── ENGINE FINISHED ─────────────────────────────────────────────────────────
// Image 5 + 7 inspired:
//   Stat trio | Readiness arc gauge | Grade bar | AI Coach insights
//   Where you lost marks (expandable) | Difficulty rating | XP earned
export function EngineFinished({
  Icon, accent, textColor, btnClass,
  finalScore = 0, totalQuestions = 10,
  title = "Mission Debrief",
  onClose,
  // new props (optional — won't break if not passed)
  subject,
  topic,
  scholarName,
  answers = [],   // [{ q, isCorrect, correct, myAnswer }]
  xpEarned,
}) {
  const [diffRating,  setDiffRating]  = useState(null);
  const [showWrong,   setShowWrong]   = useState(false);
  const [gaugeVal,    setGaugeVal]    = useState(0);
  const [showCert,    setShowCert]    = useState(false);

  const colors      = getColors(subject);
  const accentColor = colors.accent;
  const accuracy    = totalQuestions > 0 ? Math.round((finalScore / totalQuestions) * 100) : 0;
  const wrongList   = answers.filter(a => !a.isCorrect);
  const xp          = xpEarned ?? finalScore * 10;
  // Stage-gated mastery: check what tier the session performance corresponds to
  // In production this is driven by BKT from DB; here we derive from session accuracy
  const masteryScore  = accuracy / 100;
  const masteryTier   = masteryScore >= 0.80 ? "exceeding"
                      : masteryScore >= 0.70 ? "expected"
                      : masteryScore >= 0.55 ? "developing"
                      : null;
  const isMastery     = masteryTier !== null;   // any stage threshold crossed

  const grade =
    accuracy >= 80 ? { label: "Stellar 🏆",    color: "#d97706", bg: "#fffbeb" } :
    accuracy >= 70 ? { label: "On Track ⭐",   color: "#7c3aed", bg: "#f5f3ff" } :
    accuracy >= 55 ? { label: "Building 🌱",   color: "#0891b2", bg: "#ecfeff" } :
                     { label: "Keep Going 💪", color: "#dc2626", bg: "#fef2f2" };

  const insights = buildInsights(accuracy, wrongList, totalQuestions);

  // Animate gauge on mount
  useEffect(() => {
    const t = setTimeout(() => setGaugeVal(accuracy), 350);
    return () => clearTimeout(t);
  }, [accuracy]);

  return (
    <>
    {/* Mastery certificate overlay */}
    {showCert && (
      <MasteryCertificateLazy
        scholarName={scholarName || "Cadet"}
        subject={subject}
        topic={topic || subject}
        masteryTier={masteryTier || "developing"}
        masteryScore={masteryScore}
        accuracy={accuracy}
        xpEarned={xp}
        date={new Date()}
        onClose={() => setShowCert(false)}
      />
    )}

    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[5000] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-y-auto"
        style={{ maxHeight: "92vh" }}>

        {/* ── HERO SECTION ── */}
        <div className="px-5 pt-6 pb-5"
          style={{ background: `linear-gradient(135deg, ${accentColor}14 0%, #ffffff 65%)` }}>

          {/* Title row */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-sm"
                style={{ backgroundColor: accentColor }}>
                <Trophy size={17} />
              </span>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mission Complete</p>
                <h2 className="text-base font-black text-slate-900 leading-tight">{title}</h2>
              </div>
            </div>
            <button onClick={() => onClose?.()}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors">
              <XCircle size={16} />
            </button>
          </div>

          {/* STAT TRIO */}
          <div className="grid grid-cols-3 gap-2.5 mb-4">
            <StatPill label="Questions" value={totalQuestions} color="#64748b" icon={<Target size={12} />} />
            <StatPill label="Correct"   value={finalScore}     color="#059669" icon={<CheckCircle size={12} />} />
            <StatPill label="Accuracy"  value={`${accuracy}%`} color={accentColor} icon={<TrendingUp size={12} />} highlight />
          </div>

          {/* READINESS GAUGE + GRADE */}
          <div className="flex items-center gap-4 mb-4 bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <ReadinessGauge value={gaugeVal} color={accentColor} />
            <div className="flex-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Readiness Score</p>
              <p className="text-3xl font-black leading-none" style={{ color: accentColor }}>{accuracy}%</p>
              <span className="inline-block mt-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold"
                style={{ color: grade.color, backgroundColor: grade.bg }}>
                {grade.label}
              </span>
            </div>
          </div>

          {/* GRADE BAR */}
          <GradeBar accuracy={accuracy} gradeColor={grade.color} accentColor={accentColor} />

          {/* STARDUST */}
          <div className="flex items-center justify-center gap-1.5 mt-3">
            <Zap size={13} className="text-amber-500" />
            <span className="text-sm font-bold text-amber-600">+{xp} Stardust earned</span>
          </div>
        </div>

        {/* ── TARA'S ANALYSIS ── */}
        {insights.length > 0 && (
          <div className="px-5 py-4 border-t border-slate-100">
            <div className="flex items-center gap-2 mb-3">
              <Brain size={14} className="text-indigo-500" />
              <p className="text-sm font-black text-slate-800">Tara's Analysis</p>
            </div>
            <div className="space-y-2">
              {insights.map((ins, i) => <InsightCard key={i} {...ins} />)}
            </div>
          </div>
        )}

        {/* ── WHERE YOU LOST MARKS ── */}
        {wrongList.length > 0 && (
          <div className="px-5 py-4 border-t border-slate-100">
            <button onClick={() => setShowWrong(p => !p)}
              className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <XCircle size={14} className="text-red-500" />
                <p className="text-sm font-black text-slate-800">
                  Where you lost marks
                  <span className="ml-2 bg-red-100 text-red-600 text-xs font-bold px-1.5 py-0.5 rounded-full">
                    {wrongList.length}
                  </span>
                </p>
              </div>
              {showWrong
                ? <ChevronUp size={15} className="text-slate-400" />
                : <ChevronDown size={15} className="text-slate-400" />}
            </button>

            {showWrong && (
              <div className="mt-3 space-y-2">
                {wrongList.map((a, i) => (
                  <div key={i} className="bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
                    <p className="text-xs font-semibold text-slate-700 mb-1.5 leading-snug line-clamp-2">{a.q}</p>
                    <div className="flex gap-3 flex-wrap">
                      <span className="text-xs text-red-600">
                        You chose: <span className="font-bold">{a.myAnswer}</span>
                      </span>
                      <span className="text-xs text-emerald-600">
                        Correct: <span className="font-bold">{a.correct}</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── DIFFICULTY RATING ── */}
        <div className="px-5 py-4 border-t border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">How difficult was this?</p>
          <div className="flex gap-2">
            {DIFF_OPTIONS.map(d => (
              <button key={d.val}
                onClick={() => setDiffRating(d.val)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${
                  diffRating === d.val ? "text-white" : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
                style={diffRating === d.val ? { backgroundColor: d.color, borderColor: d.color } : {}}>
                {d.emoji} {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── MASTERY CERTIFICATE BANNER (Distinction only) ── */}
        {isMastery && (
          <div className="px-5 py-4 border-t border-slate-100">
            <button
              onClick={() => setShowCert(true)}
              className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2.5 font-black text-sm text-white transition-all active:scale-95 shadow-lg"
              style={{
                background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #ec4899 100%)",
                boxShadow: "0 4px 20px rgba(99,102,241,0.4)",
              }}
            >
              <span className="text-lg">🏆</span>
              {masteryTier === "exceeding" ? "🏆 Stellar Mastery Certificate"
               : masteryTier === "expected" ? "⭐ On Track Certificate"
               : "🌱 Building Stage Certificate"}
              <span className="text-lg">✨</span>
            </button>
            <p className="text-center text-[10px] text-slate-400 mt-1.5">
              Printable · Shareable · PDF export
            </p>
          </div>
        )}

        {/* ── CLOSE BUTTON ── */}
        <div className="px-5 pb-7 pt-1">
          <button
            onClick={() => onClose?.()}
            className="w-full py-4 rounded-2xl text-sm font-black text-white shadow-lg transition-all active:scale-95 border-b-4 border-black/20"
            style={{ backgroundColor: accentColor }}
          >
            Return to Base
          </button>
        </div>
      </div>
    </div>
    </>
  );
}

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

function StatPill({ label, value, color, icon, highlight }) {
  return (
    <div className={`rounded-xl px-3 py-2.5 text-center border ${
      highlight ? "bg-white border-slate-200 shadow-sm" : "bg-slate-50 border-slate-100"
    }`}>
      <div className="flex items-center justify-center gap-1 mb-1" style={{ color }}>
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-xl font-black text-slate-900">{value}</p>
    </div>
  );
}

function GradeBar({ accuracy, gradeColor, accentColor }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW(accuracy), 250);
    return () => clearTimeout(t);
  }, [accuracy]);

  const markers = [
    { pct: 60, label: "Pass" },
    { pct: 75, label: "Merit" },
    { pct: 90, label: "Distinction" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Grade Progress</p>
        <p className="text-xs font-bold" style={{ color: gradeColor }}>{accuracy}%</p>
      </div>
      <div className="relative h-3.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${w}%`, backgroundColor: accentColor }} />
        {markers.map(m => (
          <div key={m.pct} className="absolute top-0 h-full w-px bg-white/70"
            style={{ left: `${m.pct}%` }} />
        ))}
      </div>
      <div className="relative h-4 mt-0.5">
        {markers.map(m => (
          <span key={m.pct}
            className="absolute text-[9px] text-slate-400 font-semibold -translate-x-1/2"
            style={{ left: `${m.pct}%` }}>
            {m.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function ReadinessGauge({ value = 0, color = "#4f46e5", size = 80 }) {
  const r      = 30;
  const cx     = size / 2;
  const cy     = size * 0.62;
  const circum = Math.PI * r;
  const filled = (value / 100) * circum;
  const arcPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;

  return (
    <svg width={size} height={size * 0.68} viewBox={`0 0 ${size} ${size * 0.68}`}>
      <path d={arcPath} fill="none" stroke="#e2e8f0" strokeWidth="8" strokeLinecap="round" />
      <path d={arcPath} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
        strokeDasharray={`${filled} ${circum}`}
        style={{ transition: "stroke-dasharray 1.1s cubic-bezier(0.4,0,0.2,1)" }} />
    </svg>
  );
}

const DIFF_OPTIONS = [
  { val: "easy", label: "Easy", emoji: "😊", color: "#059669" },
  { val: "ok",   label: "OK",   emoji: "😐", color: "#d97706" },
  { val: "hard", label: "Hard", emoji: "😤", color: "#dc2626" },
];

function InsightCard({ severity, title, body }) {
  const S = {
    critical: { wrap: "bg-red-50 border-red-200",       badge: "bg-red-100 text-red-700",       icon: <AlertTriangle size={13} className="text-red-500" />    },
    warning:  { wrap: "bg-amber-50 border-amber-200",   badge: "bg-amber-100 text-amber-700",   icon: <AlertTriangle size={13} className="text-amber-500" />  },
    info:     { wrap: "bg-blue-50 border-blue-200",     badge: "bg-blue-100 text-blue-700",     icon: <Lightbulb size={13} className="text-blue-500" />       },
    success:  { wrap: "bg-emerald-50 border-emerald-200",badge: "bg-emerald-100 text-emerald-700",icon: <Star size={13} className="text-emerald-500" />       },
  };
  const s = S[severity] || S.info;
  return (
    <div className={`${s.wrap} border rounded-xl px-3 py-2.5 flex gap-2.5 items-start`}>
      <span className="flex-shrink-0 mt-0.5">{s.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full ${s.badge}`}>
            {severity}
          </span>
          <p className="text-xs font-bold text-slate-800">{title}</p>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

function buildInsights(accuracy, wrongList, total) {
  const out = [];
  if (accuracy >= 90) {
    out.push({ severity: "success",  title: "Outstanding!",       body: "Distinction-level performance. Keep this form going into exam day." });
  } else if (accuracy >= 75) {
    out.push({ severity: "info",     title: "Solid performance",  body: `${total - wrongList.length} of ${total} correct. A little more practice and you'll hit distinction.` });
  } else if (accuracy >= 50) {
    out.push({ severity: "warning",  title: "Room to improve",    body: "You're getting the basics but dropping marks on harder questions. Review the wrong answers below." });
  } else {
    out.push({ severity: "critical", title: "Needs work",         body: "This topic needs more attention before exam day. Go through each wrong answer carefully." });
  }
  if (wrongList.length > 0 && wrongList.length <= 3) {
    out.push({ severity: "info", title: "Tip", body: `You missed ${wrongList.length} question${wrongList.length > 1 ? "s" : ""}. Check "Where you lost marks" to see exactly what to revise.` });
  }
  return out;
}