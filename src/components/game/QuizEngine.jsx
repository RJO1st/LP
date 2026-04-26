"use client";
// ╔══════════════════════════════════════════════════════════════╗
// ║         LAUNCHPARD — QUIZ ENGINE v8                         ║
// ║  question_bank · difficulty_tier · multi-type questions     ║
// ╚══════════════════════════════════════════════════════════════╝
import React, { useState, useEffect, useRef, useCallback } from "react";
import ImageDisplay from "./ImageDisplay";
import { apiFetch } from "@/lib/apiFetch";

// ─── REAL SUPABASE CLIENT ──────────────────────────────────────────────────────
import { supabase } from "../../lib/supabase";

// ─── DB QUESTION FETCH ────────────────────────────────────────────────────────
// Fetches randomised questions from question_bank.
// Excludes recently seen IDs. Accepts year±1 for variety.
// Shuffles in JS (Supabase doesn't support ORDER BY random() reliably on free tier).
// ─── CURRICULUM RESOLVER ──────────────────────────────────────────────────────
// Maps scholar curriculum + year to the actual DB curriculum string.
// Based on what's in question_bank — uk_national has NO core subjects for Y3-6,
// so those scholars are served from uk_11plus which has 2000+ questions per year.
const resolveDbCurriculum = (curriculum, subject, yearLevel) => {
  const yr  = parseInt(yearLevel, 10) || 4;
  const cur = (curriculum || "uk_national").toLowerCase();
  const sub = (subject || "").toLowerCase();

  // Verbal/NVR only exist under uk_11plus regardless of scholar curriculum
  if (["verbal_reasoning", "verbal", "nvr", "non_verbal_reasoning"].includes(sub)) {
    return "uk_11plus";
  }

  switch (cur) {
    case "uk_national":
      // Y1-2: uk_national has mathematics, english, science
      // Y3-6: uk_national has NO core subjects — fall back to uk_11plus
      // Y7+:  uk_national has secondary subjects
      if (yr >= 3 && yr <= 6) return "uk_11plus";
      return "uk_national";

    case "uk_11plus":
      return "uk_11plus";

    case "aus_acara":
      return "aus_acara";

    case "australian":
      return "australian";

    case "ng_primary":
    case "nigerian_primary":
      return "nigerian_primary";

    case "ng_jss":
    case "nigerian_jss":
      return cur === "ng_jss" ? "ng_jss" : "nigerian_jss";

    case "ng_sss":
    case "nigerian_sss":
      return cur === "ng_sss" ? "ng_sss" : "nigerian_sss";

    case "waec":
      return "waec";

    case "ib_myp":
      return "ib_myp";

    case "ib_pyp":
      return "ib_pyp";

    case "us_common_core":
      return "us_common_core";

    default:
      return curriculum;
  }
};

const getSmartQuestions = async (sbClient, scholarId, subject, curriculum, yearLevel, count, excludeIds = []) => {
  try {
    // Normalise subject to match DB column values
    const subjectMap = {
      maths: "mathematics", math: "mathematics", mathematics: "mathematics",
      english: "english",
      verbal: "verbal_reasoning", verbal_reasoning: "verbal_reasoning",
      nvr: "nvr", non_verbal_reasoning: "nvr",
      science: "science", basic_science: "basic_science_and_technology",
      physics: "physics", chemistry: "chemistry", biology: "biology",
      history: "history", geography: "geography",
      further_mathematics: "further_mathematics",
      computing: "computing",
    };
    const dbSubject    = subjectMap[subject?.toLowerCase()] || subject;
    const dbCurriculum = resolveDbCurriculum(curriculum, dbSubject, yearLevel);
    const yr           = parseInt(yearLevel, 10) || 4;

    console.log(`[QuizEngine] Fetching: subject=${dbSubject} curriculum=${dbCurriculum} year=${yr}`);

    let query = sbClient
      .from("question_bank")
      .select("id, question_text, options, correct_index, explanation, topic, subject, difficulty, difficulty_tier, question_type, hints, steps, answer, answer_aliases, question_data, image_url, year_level, curriculum")
      .eq("subject", dbSubject)
      .eq("curriculum", dbCurriculum)
      .gte("year_level", yr - 1)
      .lte("year_level", yr + 1);

    // Exclude recently seen — PostgREST needs double-quoted UUIDs: ("id1","id2")
    if (excludeIds.length > 0) {
      const safe = excludeIds.slice(-50);
      query = query.not("id", "in", `(${safe.map(id => `"${id}"`).join(",")})`);
    }

    const { data, error } = await query.limit(Math.min(count * 4, 80));

    if (error) {
      console.warn("[QuizEngine] DB error:", error.message, "| subject:", dbSubject, "curriculum:", dbCurriculum);
      return [];
    }

    // Cross-curriculum supplement: if primary query is thin, pull from also_curricula
    let allData = data ?? [];
    if (allData.length < count * 2) {
      try {
        const existingIds = new Set(allData.map(r => r.id));
        const allExclude = [...excludeIds, ...Array.from(existingIds)];
        let crossQ = sbClient
          .from("question_bank")
          .select("id, question_text, options, correct_index, explanation, topic, subject, difficulty, difficulty_tier, question_type, hints, steps, answer, answer_aliases, question_data, image_url, year_level, curriculum")
          .contains("also_curricula", [dbCurriculum])
          .eq("subject", dbSubject)
          .gte("year_level", yr - 1)
          .lte("year_level", yr + 1)
          .limit(Math.min(count * 2, 40));
        if (allExclude.length > 0) {
          const safe = allExclude.slice(-80);
          crossQ = crossQ.not("id", "in", `(${safe.map(id => `"${id}"`).join(",")})`);
        }
        const { data: crossData } = await crossQ;
        if (crossData?.length) {
          allData = [...allData, ...crossData.filter(r => !existingIds.has(r.id))];
          console.log(`[QuizEngine] ✨ Cross-curriculum boost: +${crossData.length} questions`);
        }
      } catch (_) { /* cross-curriculum is best-effort */ }
    }

    // Filter out questions that reference visual content (charts/tables/diagrams) but have
    // no image_url AND no question_data — these are unanswerable without the missing visual
    const VISUAL_REF_RE = /\b(the chart|the graph|the table|the diagram|the bar chart|the pie chart|the line graph|the histogram|the scatter|the figure|according to the|from the table|from the chart|from the graph|the picture shows|the image shows|look at the|refer to the|based on the chart|based on the graph|based on the table|based on the diagram|shown in the|displayed in the)\b/i;
    const filtered = allData.filter(row => {
      if (!row.image_url && !row.question_data && VISUAL_REF_RE.test(row.question_text || '')) {
        return false; // skip unanswerable visual-reference question
      }
      return true;
    });
    const skipped = allData.length - filtered.length;
    if (skipped > 0) console.log(`[QuizEngine] Filtered out ${skipped} visual-reference questions with no image/data`);

    if (!filtered?.length) {
      console.warn(`[QuizEngine] 0 rows: subject=${dbSubject} curriculum=${dbCurriculum} year=${yr}±1`);
      return [];
    }

    console.log(`[QuizEngine] Got ${filtered.length} rows from DB (${skipped} visual-ref filtered), returning ${count}`);
    return [...filtered].sort(() => Math.random() - 0.5).slice(0, count);

  } catch (err) {
    console.warn("[getSmartQuestions] exception:", err.message);
    return [];
  }
};

const AdvancedQuizWithQR = ({ onSkip }) => (
  <div className="p-4 text-center">
    <h2 className="text-xl font-bold mb-4">Advanced Question Challenge</h2>
    <button onClick={onSkip} className="p-3 bg-indigo-500 text-white rounded-xl font-bold">Skip for now</button>
  </div>
);

// ─── INLINED PROCEDURAL ENGINE ────────────────────────────────────────────────
const shuffle = (array) => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const shuffleTemplate = (t) => {
  const correct  = t.opts[t.a];
  const shuffled = shuffle([...t.opts]);
  return { ...t, opts: shuffled, a: shuffled.indexOf(correct) };
};

const safeQuestionBuilder = (questionText, correctAnswer, shuffledOptions, metadata = {}) => {
  const correct = String(correctAnswer);
  const opts = shuffledOptions.map(opt => String(opt));
  const correctIndex = opts.findIndex(opt => opt === correct);
  if (correctIndex === -1) {
    const uniqueOpts = [correct, ...opts.filter(o => o !== correct)].slice(0, 4);
    return { q: questionText, opts: uniqueOpts, a: 0, correctAnswer: correct, _recovered: true, ...metadata };
  }
  return { q: questionText, opts, a: correctIndex, correctAnswer: correct, ...metadata };
};

const mathsTemplates = {
  addition: {
    detect: (vars) => (vars.a % 10) + (vars.b % 10) < 10,
    computeVars: (a, b) => {
      const units_a = a % 10, tens_a = Math.floor(a / 10);
      const units_b = b % 10, tens_b = Math.floor(b / 10);
      const units_sum = units_a + units_b;
      const answer = a + b;
      return { a, b, units_a, tens_a, units_b, tens_b, units_sum, units_digit: units_sum, tens_sum: tens_a + tens_b, answer, operation: '+' };
    },
    steps: [
      "Add the units: {units_a} + {units_b} = {units_sum}",
      "Write {units_digit} in the units place.",
      "Add the tens: {tens_a} + {tens_b} = {tens_sum}",
      "The answer is {answer}."
    ],
    visual: "place-value-chart"
  },
  addition_with_carry: {
    detect: (vars) => (vars.a % 10) + (vars.b % 10) >= 10,
    computeVars: (a, b) => {
      const units_a = a % 10, tens_a = Math.floor(a / 10);
      const units_b = b % 10, tens_b = Math.floor(b / 10);
      const units_sum   = units_a + units_b;
      const carry       = Math.floor(units_sum / 10);
      const units_digit = units_sum % 10;
      const tens_sum    = tens_a + tens_b + carry;
      const answer      = a + b;
      return { a, b, units_a, tens_a, units_b, tens_b, units_sum, carry, units_digit, tens_sum, answer, operation: '+' };
    },
    steps: [
      "Add the units: {units_a} + {units_b} = {units_sum}",
      "Write {units_digit} in the units place and carry {carry} to the tens column.",
      "Add the tens including the carry: {tens_a} + {tens_b} + {carry} = {tens_sum}",
      "Write {tens_sum} in the tens place. The answer is {answer}."
    ],
    visual: "place-value-chart"
  }
};

const processTemplateString = (str, vars) => {
  if (!str) return str;
  return String(str).replace(/\{([^}]+)\}/g, (match, expr) => {
    let evaluated = expr.trim();
    for (const [key, value] of Object.entries(vars)) {
      const regex = new RegExp(`\\b${key}\\b`, 'g');
      evaluated = evaluated.replace(regex, value);
    }
    if (/[a-zA-Z]/.test(evaluated)) return evaluated;
    try {
      const result = new Function(`return ${evaluated};`)();
      return Number.isFinite(result) ? Math.round(result * 100) / 100 : result;
    } catch { return evaluated; }
  });
};

const getExplanationForQuestion = (question) => {
  if (!question?.vars || !question?.topic || (question.subject !== 'mathematics' && question.subject !== 'maths')) return null;
  const { vars, topic } = question;
  const baseTopic = topic.split('_')[0];
  const availableTemplates = Object.keys(mathsTemplates)
    .filter(k => k.startsWith(baseTopic))
    .map(k => mathsTemplates[k]);
  const selected = availableTemplates.find(t => t.detect?.(vars)) || mathsTemplates[topic];
  if (!selected) return null;
  const computed = selected.computeVars(vars.a, vars.b);
  const steps    = selected.steps.map(step => processTemplateString(step, computed));
  return { steps, visual: selected.visual, computed };
};

const generateLocalMaths = (year) => {
  const r = Math.random();
  let q, ans, exp, topic, a, b;
  
  if (r < 0.3) {
    a = rand(12, 50); b = rand(12, 30); ans = a * b; topic = 'multiplication';
    q   = `Calculate: ${a} × ${b}`;
    exp = `Long multiplication: ${a} × ${b} = ${ans}.`;
  } else if (r < 0.6) {
    const pcts = [10, 20, 25, 50, 75]; const p = pick(pcts);
    const base = rand(2, 8) * 100; ans = base * p / 100; topic = 'percentages';
    q   = `What is ${p}% of £${base}?`;
    exp = `${p}% of ${base} is £${ans}.`;
    a = p; b = base;
  } else {
    a = rand(100, 350); b = rand(50, 200); ans = a + b; topic = 'addition';
    q   = `Calculate: ${a} + ${b}`;
    exp = `Add hundreds first, then tens, then ones. ${a} + ${b} = ${ans}.`;
  }
  
  const w1 = typeof ans === 'number' ? ans + rand(2, 5) : ans;
  const w2 = typeof ans === 'number' ? Math.max(1, ans - rand(1, 3)) : ans;
  const w3 = typeof ans === 'number' ? ans + 10 : ans;
  const opts = shuffle([String(ans), String(w1), String(w2), String(w3)]);
  return safeQuestionBuilder(q, ans, opts, { exp, subject: 'mathematics', hints: ["Think step by step."], vars: { a, b }, topic });
};

const generateLocalEnglish = (year) => {
  const qs = [
    { q: "Which word means HAPPY? (synonym)", opts: ["joyful","sad","angry","tired"], a: 0, exp: "Joyful is a synonym of happy — they mean the same thing." },
    { q: "Identify the ADJECTIVE: 'The fierce dog barked.'", opts: ["fierce","dog","barked","The"], a: 0, exp: "Adjectives describe nouns. 'fierce' describes the dog." },
    { q: "Which word is a NOUN?", opts: ["castle","fierce","quickly","because"], a: 0, exp: "Nouns name people, places or things. 'castle' is a noun." },
    { q: "Which sentence uses PASSIVE voice?", opts: ["The trophy was won by Emma.","Emma won the trophy.","Emma wins trophies.","The trophy belongs to Emma."], a: 0, exp: "Passive: subject receives the action." }
  ];
  return shuffleTemplate({ ...pick(qs), subject: 'english', topic: 'grammar' });
};

const generateLocalVerbal = (year) => {
  const qs = [
    { q: "Which word is the odd one out?", opts: ["Car","Bus","Train","Apple"], a: 3, exp: "Car, Bus, Train are transport. Apple is a fruit." },
    { q: "Happy is to Sad as Hot is to...", opts: ["Cold","Warm","Sun","Fire"], a: 0, exp: "Happy/Sad are opposites. The opposite of Hot is Cold." },
    { q: "Code: shift each letter forward by 1. Code for CAT?", opts: ["DBU","DBS","CBU","ECV"], a: 0, exp: "C+1=D, A+1=B, T+1=U. Code = DBU." }
  ];
  return shuffleTemplate({ ...pick(qs), subject: 'verbal', topic: 'logic' });
};

const generateLocalNVR = (year) => {
  const qs = [
    { q: "A cube has how many FACES?", opts: ["6","4","8","12"], a: 0, exp: "A cube has 6 square faces." },
    { q: "How many lines of symmetry does a rectangle have?", opts: ["2","1","4","0"], a: 0, exp: "A rectangle has 2 lines of symmetry." }
  ];
  return shuffleTemplate({ ...pick(qs), subject: 'nvr', topic: 'shapes' });
};

const generateSessionQuestions = async (student, subject, tier, count) => {
  const qs = [];
  const year = student?.year_level || student?.year || 4;
  for (let i = 0; i < count; i++) {
    if (subject === 'mathematics' || subject === 'maths') qs.push(generateLocalMaths(year));
    else if (subject === 'english') qs.push(generateLocalEnglish(year));
    else if (subject === 'verbal_reasoning' || subject === 'verbal') qs.push(generateLocalVerbal(year));
    else if (subject === 'nvr') qs.push(generateLocalNVR(year));
    else qs.push(generateLocalMaths(year)); // fallback
  }
  return qs;
};

// ─── QUIZ ENGINE NORMALISATION ────────────────────────────────────────────────
function normalizeQuestion(q) {
  const qType = q.type || 'mcq';
  if (!q || qType !== 'mcq' || !q.opts || !q.opts.length) return q;

  const opts = [...q.opts];

  // The AI consistently placed the correct answer at index 0 in the database.
  // We removed the aggressive regex parsing because it caused false positives 
  // (e.g., extracting "2" from the explanation "divide by 2").
  // Now, we safely track the original correct answer and securely shuffle the array.
  const actualA = typeof q.a === 'number' ? q.a : 0;
  const safeA = (actualA >= 0 && actualA < opts.length) ? actualA : 0;
  
  const correctOptText = opts[safeA];
  const shuffledOpts = shuffle([...opts]);
  const newA = shuffledOpts.indexOf(correctOptText);

  return { ...q, opts: shuffledOpts, a: newA, correctAnswer: correctOptText };
}

// ─── ICONS ────────────────────────────────────────────────────────────────────
const CheckCircleIcon = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);
const XCircleIcon = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>
  </svg>
);
const BrainIcon = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.54Z"/>
    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2.54Z"/>
  </svg>
);
const ZapIcon = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>
  </svg>
);
const ArrowRightIcon = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
  </svg>
);
const ArrowLeftIcon = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>
  </svg>
);
const EyeIcon = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);
const FlameIcon = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
  </svg>
);
const StarIcon = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);
const RocketIcon = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
    <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
    <path d="M9 12H4s.5-1 1-4c1.5 0 3 .5 3 .5L9 12Z"/>
    <path d="M12 15v5s1 .5 4 1c0-1.5-.5-3-.5-3L12 15Z"/>
  </svg>
);
const PlanetIcon = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="8"/><path d="M7 21L17 3"/>
  </svg>
);
const XIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18M6 6l12 12"/>
  </svg>
);

// ─── TARA FEEDBACK ────────────────────────────────────────────────────────────
const LOCAL_TARA_FEEDBACK = (text, subject, scholarName, scholarYear) => {
  const name    = scholarName || "Cadet";
  const trimmed = text.trim();
  const lower   = trimmed.toLowerCase();
  const minLen  = scholarYear <= 2 ? 5 : scholarYear <= 4 ? 10 : 15;

  if (trimmed.length < minLen) {
    return scholarYear <= 2
      ? `Tara: Well done, ${name}! Can you tell me a little more? Even one more word helps! 🌟`
      : `Tara: Copy that, ${name}. We need a bit more detail — can you explain *why* that answer is correct? 🤔`;
  }

  const keys = {
    maths:     ["add","plus","total","units","tens","carry","subtract","minus","equals","because","calculate","round","divide","multiply","times","fraction","percent","remainder","factor","multiple","prime","square","cube","ratio","proportion"],
    english:   ["verb","noun","adjective","adverb","action","describes","word","sentence","because","means","grammar","clause","prefix","suffix","tense","formal","informal","metaphor","simile","alliteration","personification","punctuation","synonym","antonym"],
    verbal:    ["pattern","sequence","opposite","similar","letter","next","because","odd","order","skip","code","analogy","alphabet","relationship","category","type","group","connects"],
    nvr:       ["shape","pattern","colour","color","rotate","flip","size","odd","different","same","repeat","mirror","reflect","symmetr","transform","angle","side","face"],
    science:   ["element","atom","force","energy","gravity","cell","organism","reaction","compound","mixture","velocity","mass","weight","current","voltage","photosynthesis","evolution","habitat","ecosystem","circuit","magnet","particle","molecule","friction","pressure","density"],
    geography: ["climate","region","population","migration","erosion","continent","latitude","longitude","urban","rural","river","mountain","plateau","economic","sustainable","environment","weather","land","coast","valley","settlement","resource","trade","development"],
    history:   ["century","decade","era","empire","revolution","conflict","treaty","evidence","source","cause","consequence","change","continuity","chronology","significant","impact","belief","culture","power","rights","independence","democracy","monarchy","parliament"],
  };

  const pos = {
    maths:     [`Tara: Affirmative, ${name}! Your logic is clear for liftoff! 🚀`, `Tara: Excellent calculation, ${name}! That's the mark of a true Commander! 🏆`, `Tara: Flight path confirmed, ${name}! Step-by-step is the right approach! 🧠`],
    english:   [`Tara: Roger that, ${name}! You identified the grammar rules perfectly! 📡✨`, `Tara: Spot on, ${name}! Explaining *why* shows real understanding! 🌟`, `Tara: Log verified, ${name}! Using examples to support your answer is brilliant! 📝`],
    verbal:    [`Tara: Superb, ${name}! You spotted the pattern in the data stream! 🔍`, `Tara: Brilliant decoding, ${name}! Explaining the rule is exactly right! 🧩`, `Tara: Navigation confirmed, ${name}! You identified the connection clearly! 🏆`],
    nvr:       [`Tara: Excellent visual scanning, ${name}! Describing what *changes* is the strategy! 👁️✨`, `Tara: Target acquired, ${name}! Non-verbal reasoning is about noticing differences! 🌟`, `Tara: Brilliant, ${name}! You described the visual rule clearly! 🚀`],
    science:   [`Tara: Outstanding scientific thinking, ${name}! Evidence-based reasoning is key! 🔬`, `Tara: Excellent, ${name}! You applied the scientific concept correctly! ⚗️`, `Tara: Brilliant observation, ${name}! That's exactly how scientists explain phenomena! 🧪`],
    geography: [`Tara: Great geographical analysis, ${name}! Location and context are everything! 🌍`, `Tara: Excellent, ${name}! You connected human and physical geography perfectly! 🗺️`, `Tara: Spot on, ${name}! Understanding patterns across the Earth is real geography! 🌐`],
    history:   [`Tara: Impressive historical thinking, ${name}! Cause and consequence reasoning is perfect! 📜`, `Tara: Excellent, ${name}! Using evidence to support your answer is historian-level thinking! 🏛️`, `Tara: Brilliant, ${name}! You understood the significance of this event clearly! ⚔️`],
  };

  const nudge = {
    maths:     `Tara: Good attempt, ${name}! Try to describe the *steps* — check units, carry digits, or think about rounding. Over! 💪`,
    english:   `Tara: Nice effort, ${name}! Try to name the *type* of word or literary technique to clarify your answer. You're almost there!`,
    verbal:    `Tara: Good thinking, ${name}! Describe the *rule* — are letters skipping? Are words opposites? Keep digging! 🔎`,
    nvr:       `Tara: Nice work, ${name}! Describe *what changes* — shape, size, colour, or position. More detail the better! 🎨`,
    science:   `Tara: Good effort, ${name}! Try using scientific terms — name the process, force, or reaction involved. 🔬`,
    geography: `Tara: Almost there, ${name}! Think about locations, patterns, or human/physical geography terms. 🌍`,
    history:   `Tara: Good thinking, ${name}! Try to mention specific historical evidence, dates, or cause-and-effect relationships. 📜`,
  };

  const sub        = subject in keys ? subject : (subject === "mathematics" && "maths" in keys) ? "maths" : "maths";
  const hasKeyword = keys[sub].some(k => lower.includes(k));
  if (hasKeyword) { const arr = pos[sub]; return arr[Math.floor(Math.random() * arr.length)]; }
  return nudge[sub] || nudge.maths;
};

const fetchTaraFeedback = async ({ text, subject, correctAnswer, scholarName, scholarYear, question }) => {
  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await apiFetch("/api/tara", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({ text, subject, correctAnswer, scholarName, scholarYear, question }),
    });
    clearTimeout(timeoutId);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const raw = await response.text();
    if (!raw) throw new Error("Empty response");
    const data = JSON.parse(raw);
    if (!data.feedback) throw new Error("Missing feedback");
    return data.feedback;
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn("[Tara] fallback:", err.message);
    return LOCAL_TARA_FEEDBACK(text, subject, scholarName, scholarYear);
  }
};

// ─── VISUAL COMPONENTS ────────────────────────────────────────────────────────
const TenFrame = ({ filled, ghost = 0, total = 10, filledColour = "#6366f1", ghostColour = "#fca5a5" }) => (
  <div className="inline-grid gap-1 p-2 bg-white rounded-xl border border-slate-200 shadow-inner"
    style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
    {Array.from({ length: total }).map((_, i) => {
      const isFilled = i < filled;
      const isGhost  = !isFilled && i < filled + ghost;
      return (
        <div key={i} className="w-5 h-5 rounded-full border transition-all" style={{
          backgroundColor: isFilled ? filledColour : isGhost ? ghostColour : "transparent",
          borderColor:     isFilled ? filledColour : isGhost ? "#f87171"   : "#e2e8f0",
          opacity: isGhost ? 0.55 : 1,
        }} />
      );
    })}
  </div>
);

const AdditionVisual = ({ a, b }) => {
  const fs = (a + b) <= 10 ? 10 : 20;
  return (
    <div className="w-full p-3 bg-indigo-50 rounded-xl border border-indigo-100 mb-3">
      <div className="flex justify-center items-center gap-2 mb-2 text-sm">
        <span className="font-black text-indigo-600 bg-indigo-100 rounded px-2 py-0.5">{a}</span>
        <span className="font-black text-slate-400">+</span>
        <span className="font-black text-emerald-600 bg-emerald-100 rounded px-2 py-0.5">{b}</span>
        <span className="font-black text-slate-400">=</span>
        <span className="font-black text-slate-300 bg-slate-100 rounded px-2 py-0.5">?</span>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <div className="flex flex-col items-center">
          <TenFrame filled={Math.min(a, fs)} total={fs} filledColour="#6366f1" />
          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-1">Group A: {a}</span>
        </div>
        <div className="flex flex-col items-center">
          <TenFrame filled={Math.min(b, fs)} total={fs} filledColour="#10b981" />
          <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mt-1">Group B: {b}</span>
        </div>
      </div>
      <p className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Count all counters together 👆</p>
    </div>
  );
};

const SubtractionVisual = ({ a, b, ans }) => {
  const fs = a <= 10 ? 10 : 20;
  return (
    <div className="w-full p-3 bg-rose-50 rounded-xl border border-rose-100 mb-3">
      <div className="flex justify-center items-center gap-2 mb-2 text-sm">
        <span className="font-black text-slate-700 bg-slate-100 rounded px-2 py-0.5">{a}</span>
        <span className="font-black text-slate-400">−</span>
        <span className="font-black text-rose-500 bg-rose-100 rounded px-2 py-0.5">{b}</span>
        <span className="font-black text-slate-400">=</span>
        <span className="font-black text-slate-300 bg-slate-100 rounded px-2 py-0.5">?</span>
      </div>
      <div className="flex flex-wrap justify-center gap-4">
        <div className="flex flex-col items-center">
          <TenFrame filled={ans} ghost={b} total={fs} filledColour="#10b981" ghostColour="#fca5a5" />
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Whole: {a}</span>
        </div>
        <div className="flex flex-col items-center">
          <TenFrame filled={b} total={fs} filledColour="#f87171" />
          <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest mt-1">Taken: {b}</span>
        </div>
      </div>
      <p className="text-center text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-2">🟢 Count the green counters = {ans}</p>
    </div>
  );
};

const BarModelVisual = ({ a, b, ans, operation }) => {
  const whole    = operation === "+" ? a + b : a;
  const leftPct  = operation === "+" ? (a / whole) * 100 : (ans / whole) * 100;
  const rightPct = 100 - leftPct;
  return (
    <div className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 mb-3">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 text-center">Bar Model</p>
      <div className="flex justify-center mb-1">
        <span className="text-xs font-black text-slate-600 bg-slate-200 rounded px-2 py-0.5">Whole: {whole}</span>
      </div>
      <div className="h-6 rounded-lg overflow-hidden bg-slate-200 mb-2 flex">
        <div className="h-full rounded-l-lg" style={{ width: `${leftPct}%`,  background: operation === "+" ? "#6366f1" : "#10b981" }} />
        <div className="h-full rounded-r-lg" style={{ width: `${rightPct}%`, background: operation === "+" ? "#10b981" : "#fca5a5" }} />
      </div>
      <div className="flex justify-between text-[10px] font-black">
        <span style={{ color: operation === "+" ? "#6366f1" : "#059669" }}>{operation === "+" ? a : ans}</span>
        <span style={{ color: operation === "+" ? "#059669" : "#f87171" }}>{b}</span>
      </div>
    </div>
  );
};

const PlaceValueChart = ({ computed, step }) => {
  if (!computed) return null;
  const { a, b, carry, answer, operation } = computed;
  const isUnitsActive = step === 0 || step === 1;
  const isTensActive  = step === 2 || step === 3;
  const maxLen = Math.max(String(a).length, String(b).length, String(answer).length, 2);
  const pad    = n => String(n).padStart(maxLen, " ");
  const aStr   = pad(a); const bStr = pad(b); const ansStr = pad(answer);
  const li = maxLen - 2; const ri = maxLen - 1;
  return (
    <div className="flex flex-col items-center p-3 bg-white rounded-xl border border-slate-100 font-mono text-2xl font-black w-full max-w-xs mx-auto shadow-inner mb-3">
      <div className={`flex w-full mb-1 text-rose-500 text-sm h-5 ${isTensActive && step >= 2 && carry ? "opacity-100" : "opacity-0"}`}>
        <div className="flex-1"/><div className="flex-1 text-center">+{carry}</div><div className="flex-1"/>
      </div>
      <div className="flex w-full text-slate-700 mb-1">
        <div className="flex-1"/>
        <div className={`flex-1 text-center ${isTensActive ? "text-indigo-600" : ""}`}>{aStr[li] !== " " ? aStr[li] : ""}</div>
        <div className={`flex-1 text-center ${isUnitsActive ? "text-indigo-600" : ""}`}>{aStr[ri]}</div>
      </div>
      <div className="flex w-full text-slate-700 mb-2 pb-2 border-b-4 border-slate-300">
        <div className="flex-1 text-center text-slate-400">{operation}</div>
        <div className={`flex-1 text-center ${isTensActive ? "text-indigo-600" : ""}`}>{bStr[li] !== " " ? bStr[li] : ""}</div>
        <div className={`flex-1 text-center ${isUnitsActive ? "text-indigo-600" : ""}`}>{bStr[ri]}</div>
      </div>
      <div className="flex w-full text-slate-800">
        <div className="flex-1"/>
        <div className={`flex-1 text-center ${step >= 3 ? "opacity-100 text-emerald-600" : "opacity-0"}`}>{ansStr[li] !== " " ? ansStr[li] : ""}</div>
        <div className={`flex-1 text-center ${step >= 1 ? "opacity-100 text-emerald-600" : "opacity-0"}`}>{ansStr[ri]}</div>
      </div>
    </div>
  );
};

const FillBlankDisplay = ({ text }) => {
  const BLANK = "___";
  if (!text.includes(BLANK)) return <h3 className="text-lg md:text-xl font-black text-slate-800 mb-3">{text}</h3>;
  const parts = text.split(BLANK);
  return (
    <p className="text-lg md:text-xl font-black text-slate-800 mb-3 leading-relaxed">
      {parts[0]}
      <span className="inline-flex items-center justify-center bg-amber-100 border-b-[3px] border-amber-400 rounded px-4 mx-1 min-w-[64px] text-amber-500 italic">?</span>
      {parts[1]}
    </p>
  );
};

const TopicSummaryCard = ({ topicSummary }) => {
  const entries = Object.entries(topicSummary);
  if (entries.length === 0) return null;
  return (
    <div className="w-full text-left mt-3 space-y-1.5 max-h-40 overflow-y-auto">
      {entries.map(([topic, { correct, total }]) => {
        const pct   = Math.round((correct / total) * 100);
        const color = pct >= 80 ? "bg-emerald-400" : pct >= 50 ? "bg-amber-400" : "bg-rose-400";
        return (
          <div key={topic}>
            <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-0.5">
              <span className="capitalize">{topic?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</span>
              <span>{correct}/{total}</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── DB ROW → QUESTION SHAPE ─────────────────────────────────────────────────
function dbRowToQuestion(row, fallbackSubject) {
  const parse = (val, fallback) => {
    if (Array.isArray(val)) return val;
    if (val && typeof val === "object") return val;
    try { return val ? JSON.parse(val) : fallback; } catch { return fallback; }
  };

  let data = row;
  if (row.question_data) {
    const parsed = parse(row.question_data, {});
    data = {
      ...row,
      question_text: parsed.q || row.question_text,
      options: parsed.opts || row.options,
      correct_index: typeof parsed.a === 'number' ? parsed.a :
                     (parsed.a != null ? parseInt(parsed.a, 10) : row.correct_index),
      explanation: parsed.exp || row.explanation,
      hints: parsed.hints || row.hints,
      passage: parsed.passage || row.passage,
      topic: parsed.topic || row.topic,
      question_type: parsed.question_type || row.question_type,
      steps: parsed.steps || row.steps,
      answer: parsed.answer || row.answer,
      answer_aliases: parsed.answerAliases || row.answer_aliases,
      difficulty: parsed.difficulty || row.difficulty,
      visual: parsed.visual || row.visual,
      image_url: parsed.image_url || row.image_url,
    };
  }

  const opts          = parse(data.options,        []);
  const hints         = parse(data.hints,          []);
  const steps         = parse(data.steps,          null);
  const answerAliases = parse(data.answer_aliases, []);

  const qType = data.question_type ?? "mcq";

  let correctIndex = null;

  // ── PRIMARY: DB `correct_index` is the single source of truth ──
  // Question generation produces `correct_index` atomically with options.
  // Runtime MUST NOT override this value. If it's wrong in the DB, fix the DB.
  // (See scripts/validateCorrectIndex.mjs for AI-powered DB cross-validation.)
  if (data.correct_index != null) {
    const idx = typeof data.correct_index === 'number'
      ? data.correct_index
      : parseInt(data.correct_index, 10);
    if (Number.isInteger(idx) && idx >= 0 && idx < opts.length) {
      correctIndex = idx;
    }
  } else if (row.a != null) {
    const idx = typeof row.a === 'number' ? row.a : parseInt(row.a, 10);
    if (Number.isInteger(idx) && idx >= 0 && idx < opts.length) {
      correctIndex = idx;
    }
  }

  // ── FALLBACK 1: If DB `correct_index` is null/invalid, try `answer` field ──
  // Legacy rows without `correct_index` set. Never runs when DB has a valid index.
  if (correctIndex == null && data.answer != null && String(data.answer).trim()) {
    const ansStr = String(data.answer).trim();
    const exactIdx = opts.findIndex(opt => String(opt).trim() === ansStr);
    if (exactIdx !== -1) correctIndex = exactIdx;
  }

  // ── FALLBACK 2: Extract answer from explanation via smart patterns ──
  // Only for legacy rows with NO `correct_index` AND NO `answer` field.
  // Never runs when DB has a valid `correct_index`.
  if (correctIndex == null && data.explanation) {
    const exp = data.explanation;
    // Pattern A: "the answer is X", "answer is X", "the missing number is X"
    const directPatterns = [
      /(?:the\s+)?answer\s+is\s+[:\-]?\s*(\d+(?:\.\d+)?)/i,
      /(?:the\s+)?missing\s+(?:number|value)\s+is\s+(\d+(?:\.\d+)?)/i,
      /(?:you\s+need|needs?)\s+(\d+)\s+more/i,
      /(?:equals?|=)\s*(\d+(?:\.\d+)?)\s*[.!,]?\s*$/i,
    ];
    for (const pat of directPatterns) {
      const m = exp.match(pat);
      if (m) {
        const val = m[1];
        const idx = opts.findIndex(opt => String(opt).trim() === val);
        if (idx !== -1) { correctIndex = idx; break; }
      }
    }

    // Pattern B: "A + B = C" or "A × B = C" — extract the result C
    if (correctIndex == null) {
      const eqMatch = exp.match(/(\d+)\s*[+\-×x*÷/]\s*(\d+)\s*=\s*(\d+)/);
      if (eqMatch) {
        const result = eqMatch[3];
        const idx = opts.findIndex(opt => String(opt).trim() === result);
        // Also check if the question asks for a missing operand (e.g., "3 + ___ = 10")
        // In that case, the answer might be one of the operands, not the result
        const qText = (data.question_text || "").toLowerCase();
        if (idx !== -1 && !qText.includes("___") && !qText.includes("missing")) {
          correctIndex = idx;
        }
        // For missing-number questions, look for the operand that's NOT in the question
        if (correctIndex == null && (qText.includes("___") || qText.includes("missing"))) {
          // The equation shows the full solution — find which number solves the blank
          const [, numA, numB, numC] = eqMatch.map(Number);
          // If question has the first operand and result, the answer is the second operand
          if (qText.includes(String(numA)) && qText.includes(String(numC))) {
            const missingIdx = opts.findIndex(opt => String(opt).trim() === String(numB));
            if (missingIdx !== -1) correctIndex = missingIdx;
          }
          // If question has the second operand and result, the answer is the first
          if (correctIndex == null && qText.includes(String(numB)) && qText.includes(String(numC))) {
            const missingIdx = opts.findIndex(opt => String(opt).trim() === String(numA));
            if (missingIdx !== -1) correctIndex = missingIdx;
          }
        }
      }
    }
  }

  // Last-ditch: if everything above failed, log a warning and default to 0.
  // This should be extremely rare — it means the DB row has no correct_index,
  // no answer field, and no parseable explanation.
  if (correctIndex == null) {
    if (typeof window !== 'undefined' && row?.id) {
      console.warn(`[Quiz] No correct_index resolvable for question ${row.id} — defaulting to 0. Please audit this row.`);
    }
    correctIndex = 0;
  }

  const correctAnswer =
    qType === "multi_select"
      ? (parse(data.correct_indices, null) ?? [correctIndex])
      : correctIndex;

  return {
    id:            row.id,
    q:             data.question_text  ?? "",
    opts,
    a:             correctAnswer,
    exp:           data.explanation    ?? "",
    subject:       row.subject        ?? fallbackSubject ?? "mathematics",
    topic:         data.topic          ?? "general",
    hints,
    type:          qType,
    visual:        parse(data.visual, null),
    passage:       data.passage        ?? null,
    steps,
    answer:        data.answer         ?? null,
    answerAliases,
    difficulty:    data.difficulty     ?? 50,
    difficultyTier: row.difficulty_tier ?? "developing",
    image_url:     data.image_url      ?? null,
    _raw: row,
  };
}

// ─── VALIDATION HELPERS ───────────────────────────────────────────────────────
const validateAndFixQuestion = (question, questionIndex) => {
  if (!question || typeof question !== 'object') return null;
  if (!question.q || typeof question.q !== 'string') return null;
  if (!Array.isArray(question.opts) || question.opts.length === 0) return null;

  // Filter out broken reading comprehension questions that lack a passage
  const qTextLower = question.q.toLowerCase();
  if ((qTextLower.includes("passage") || qTextLower.includes("the text")) && !question.passage) {
    console.warn(`[Quiz Validation] Discarding question ${questionIndex + 1} - missing passage data.`);
    return null;
  }

  const validated = { ...question };

  validated.opts = validated.opts.map(opt => String(opt));

  if (typeof validated.a !== 'number' || validated.a < 0 || validated.a >= validated.opts.length) {
    if (validated.correctAnswer) {
      const recovered = validated.opts.findIndex(opt => String(opt) === String(validated.correctAnswer));
      if (recovered >= 0) {
        validated.a = recovered;
      } else {
        console.error(`[Quiz Validation] Q${questionIndex + 1}: unfixable answer index`, validated);
        return null;
      }
    } else {
      console.error(`[Quiz Validation] Q${questionIndex + 1}: invalid answer index`, validated);
      return null;
    }
  }

  if (!validated.correctAnswer) {
    validated.correctAnswer = validated.opts[validated.a];
  }

  return validated;
};

// ─── CONCEPT SNAPSHOT — compact inline teaching card (wrong-answer panel) ────
// Lighter than ConceptCardRenderer; shows key concept + one worked example.
const ConceptSnapshot = ({ card, loading }) => {
  if (loading) {
    return (
      <div className="p-3 bg-violet-50 rounded-xl border border-violet-100 animate-pulse">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-3 w-3 bg-violet-200 rounded-full"/>
          <div className="h-2.5 bg-violet-200 rounded w-20"/>
        </div>
        <div className="h-2.5 bg-violet-100 rounded w-full mb-1.5"/>
        <div className="h-2.5 bg-violet-100 rounded w-5/6 mb-1.5"/>
        <div className="h-2.5 bg-violet-100 rounded w-3/4"/>
      </div>
    );
  }
  if (!card) return null;

  const topicLabel = card.topic_label
    || (card.topic_slug || '').replace(/_/g, ' ');
  const ex = card.best_example;

  return (
    <div className="p-3 bg-violet-50 rounded-xl border border-violet-100">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-xs">💡</span>
        <span className="text-[10px] font-black text-violet-600 uppercase tracking-widest">Quick Concept</span>
        {topicLabel && (
          <span className="ml-auto text-[10px] font-bold text-violet-400 capitalize truncate max-w-[120px]">
            {topicLabel}
          </span>
        )}
      </div>
      {card.key_concept && (
        <p className="text-xs font-bold text-slate-700 leading-relaxed mb-2">{card.key_concept}</p>
      )}
      {ex && (
        <div className="bg-white rounded-lg p-2 border border-violet-100 space-y-0.5">
          <p className="text-[11px] font-black text-slate-600">{ex.problem}</p>
          <p className="text-[11px] font-bold text-violet-700">{ex.solution}</p>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
export default function QuizEngine({
  world = "test",
  student = { id: "123", name: "Test Cadet", year: 4, proficiency: 50 },
  subject = "mathematics",
  curriculum: curriculumProp = "uk_national",
  onClose,
  onComplete,
  questionCount = 15,
  previousQuestionIds = [],
}) {
  const [sessionQuestions, setSessionQuestions] = useState([]);
  const [dbQuestionIds,    setDbQuestionIds]    = useState([]);
  const [qIdx,             setQIdx]             = useState(0);
  const [selected,         setSelected]         = useState(null);
  const [timeLeft,         setTimeLeft]         = useState(45);
  const [generating,       setGenerating]       = useState(false);

  const [finished,     setFinished]     = useState(false);
  const [totalScore,   setTotalScore]   = useState(0);
  const [streak,       setStreak]       = useState(0);
  const [results,      setResults]      = useState({ score: 0, answers: [] });
  const [topicSummary, setTopicSummary] = useState({});

  const [showInteractiveExplanation, setShowInteractiveExplanation] = useState(false);
  const [explanationStep,            setExplanationStep]            = useState(0);
  const [explanationData,            setExplanationData]            = useState(null);

  const [eibText,      setEibText]      = useState("");
  const [eibFeedback,  setEibFeedback]  = useState("");
  const [loadingEIB,   setLoadingEIB]   = useState(false);
  const [savingResult, setSavingResult] = useState(false);
  const [eibLocked,    setEibLocked]    = useState(false);
  const [advancedResult, setAdvancedResult] = useState(null);

  const [stepAnswers,  setStepAnswers]  = useState([]);
  const [currentStep,  setCurrentStep]  = useState(0);
  const [stepError,    setStepError]    = useState("");

  const [freeTextInput,     setFreeTextInput]     = useState("");
  const [freeTextSubmitted, setFreeTextSubmitted] = useState(false);

  const [multiSelected,  setMultiSelected]  = useState(new Set());
  const [multiSubmitted, setMultiSubmitted] = useState(false);

  const [remediationShown,    setRemediationShown]    = useState(false);
  const [remediationData,     setRemediationData]     = useState(null);
  const [remediationAnswered, setRemediationAnswered] = useState(false);
  const [remediationResult,   setRemediationResult]   = useState(null);

  const [hintIdx,   setHintIdx]   = useState(-1);
  const [hintsUsed, setHintsUsed] = useState(0);

  // ── Quiz lesson loop ────────────────────────────────────────────────────────
  const [missedQuestions,   setMissedQuestions]   = useState([]); // mistake re-queue (cap 3)
  const [levelUpMsg,        setLevelUpMsg]        = useState(null); // level-up flash message
  const [streakPop,         setStreakPop]         = useState(false); // streak bump animation

  // ── Concept card (wrong-answer panel) ───────────────────────────────────────
  const [conceptCard,       setConceptCard]       = useState(null);
  const [conceptCardLoading,setConceptCardLoading] = useState(false);

  const timerRef          = useRef(null);
  const seenIdsRef        = useRef(new Set(previousQuestionIds));
  const seenTextsRef      = useRef(new Set());
  const fetchingRef       = useRef(false);
  const retriesInjectedRef = useRef(false); // prevent double-injection

  const recordTopicResult = useCallback((topic, isCorrect) => {
    if (!topic) return;
    setTopicSummary(prev => {
      const entry = prev[topic] || { correct: 0, total: 0 };
      return { ...prev, [topic]: { correct: entry.correct + (isCorrect ? 1 : 0), total: entry.total + 1 } };
    });
  }, []);

  // ── Level-up flash: fires on streak milestones ─────────────────────────────
  useEffect(() => {
    const MILESTONES = { 3: "🔥 On Fire!", 5: "⚡ Level Up!", 7: "🌟 Unstoppable!", 10: "💫 Legendary!" };
    if (MILESTONES[streak]) setLevelUpMsg(MILESTONES[streak]);
    if (streak > 1) setStreakPop(true);
  }, [streak]);

  useEffect(() => {
    if (!levelUpMsg) return;
    const t = setTimeout(() => setLevelUpMsg(null), 2200);
    return () => clearTimeout(t);
  }, [levelUpMsg]);

  useEffect(() => {
    if (!streakPop) return;
    const t = setTimeout(() => setStreakPop(false), 500);
    return () => clearTimeout(t);
  }, [streakPop]);

  // ── Mistake re-queue helper ─────────────────────────────────────────────────
  const queueMistake = useCallback((currQ) => {
    if (currQ?._isRetry) return; // never re-queue a retry
    setMissedQuestions(prev => {
      if (prev.length >= 3) return prev;
      const alreadyQueued = prev.some(q => q.id ? q.id === currQ.id : q.q === currQ.q);
      if (alreadyQueued) return prev;
      return [...prev, { ...currQ, _isRetry: true }];
    });
  }, []);

  // ── Concept card fetch (fires on wrong answer) ───────────────────────────────
  const fetchConceptCard = useCallback(async (topic, qSubject) => {
    if (!topic) return;
    setConceptCardLoading(true);
    setConceptCard(null);
    try {
      const year = parseInt(student?.year_level || student?.year, 10) || 4;
      const cur  = (curriculumProp || student?.curriculum || 'uk_national').toLowerCase();
      // Map year + curriculum to year_band
      let yearBand = '';
      if      (cur.startsWith('ng_jss'))     yearBand = 'jss';
      else if (cur.startsWith('ng_sss'))     yearBand = 'sss';
      else if (cur.startsWith('ng_primary')) yearBand = year <= 3 ? 'ks1' : 'ks2';
      else if (year <= 2)                    yearBand = 'ks1';
      else if (year <= 6)                    yearBand = 'ks2';
      else if (year <= 9)                    yearBand = 'ks3';
      else                                   yearBand = 'ks4';

      const slug = (topic || '').toLowerCase().replace(/[\s-]+/g, '_');
      const params = new URLSearchParams({
        topic_slug: slug,
        curriculum: cur,
        subject:    qSubject || subject || 'mathematics',
        year_band:  yearBand,
      });
      const res = await fetch(`/api/concept-cards?${params}`);
      if (res.status === 204 || !res.ok) return; // no card — fail silently
      const data = await res.json();
      setConceptCard(data.card || null);
    } catch {
      // fail silently — never block the scholar
    } finally {
      setConceptCardLoading(false);
    }
  }, [student, curriculumProp, subject]);

  const resetQuestionState = useCallback(() => {
    setSelected(null);       setTimeLeft(45);
    setEibText("");          setEibFeedback("");       setEibLocked(false);
    setStepError("");        setFreeTextInput("");     setFreeTextSubmitted(false);
    setMultiSelected(new Set()); setMultiSubmitted(false);
    setRemediationShown(false);  setRemediationData(null);
    setRemediationAnswered(false); setRemediationResult(null);
    setHintIdx(-1);          setHintsUsed(0);
    setExplanationData(null); setShowInteractiveExplanation(false); setExplanationStep(0);
    setAdvancedResult(null);
    setConceptCard(null);    setConceptCardLoading(false);
  }, []);

  const fetchQuestions = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setGenerating(true);
    
    const year = student?.year_level || student?.year ? parseInt(student.year_level || student.year, 10) : 4;
    const curriculum  = curriculumProp || student?.curriculum || "uk_national";
    const safeSubject = subject || "mathematics";
    
    let questions = [];

    try {
      const dbRows = await getSmartQuestions(supabase, student?.id, safeSubject, curriculum, year, questionCount, [...seenIdsRef.current]);

      if (dbRows.length > 0) {
        const deduped = dbRows.filter(row => {
          if (seenTextsRef.current.has(row.question_text)) return false;
          seenTextsRef.current.add(row.question_text);
          return true;
        });
        questions = deduped.slice(0, questionCount).map(row => dbRowToQuestion(row, safeSubject));
      }
    } catch (err) {
      console.warn("[QuizEngine] DB fetch failed, falling back to procedural");
    }

    if (questions.length < questionCount) {
      try {
        const qs = await generateSessionQuestions(student, safeSubject, 'foundation', questionCount);
        const needed = questionCount - questions.length;
        const extra  = qs.filter(q => !seenTextsRef.current.has(q.q)).slice(0, needed);
        extra.forEach(q => seenTextsRef.current.add(q.q));
        const tagged = extra.map(q => ({ ...q, subject: q.subject || safeSubject }));
        questions    = [...questions, ...tagged];
      } catch (err) {
        console.error("[QuizEngine] Procedural fallback failed:", err);
      }
    }

    // Shuffle options while preserving the correct answer pointer.
    // CRITICAL: For DB questions (q.id set, q.a is a valid index), trust q.a directly —
    // dbRowToQuestion() already set it from correct_index as the single source of truth.
    // Explanation-scanning strategies (last number in text, quoted string) are ONLY used
    // for procedural/legacy questions that have no DB id, because those strategies can
    // produce false positives (e.g. explanation says "don't confuse with 8" → last number
    // is 8 → "8" gets flagged as correct even when the right answer is "9").
    questions = questions.map(q => {
      const qType = q.type || 'mcq';
      if (!q || qType !== 'mcq' || !q.opts || !q.opts.length) return q;

      const opts = q.opts;
      let actualA;

      // DB question: q.id present and q.a is already the validated correct_index.
      // dbRowToQuestion() explicitly states "Runtime MUST NOT override this value."
      const hasValidDbIndex = q.id && typeof q.a === 'number' && q.a >= 0 && q.a < opts.length;

      if (hasValidDbIndex) {
        // Trust DB correct_index — no explanation scanning needed or safe.
        actualA = q.a;
      } else {
        // Procedural / legacy questions without a DB id: attempt text-based matching.
        const explanation = q.exp || q.explanation || '';
        let matchIdx = -1;

        // Strategy 1: correctAnswer or answer field matches an option exactly.
        if (q.correctAnswer || q.answer) {
          const target = String(q.correctAnswer || q.answer).toLowerCase().trim();
          matchIdx = opts.findIndex(opt => String(opt).toLowerCase().trim() === target);
        }

        // Strategy 2: last number in explanation matches an option.
        // Only used for procedural questions — too risky for DB questions because
        // explanations routinely mention wrong answers ("don't confuse with 8…").
        if (matchIdx === -1 && explanation) {
          const numberMatch = explanation.match(/(\d+(?:\.\d+)?)(?!.*\d)/);
          if (numberMatch) {
            const lastNumber = numberMatch[1];
            matchIdx = opts.findIndex(opt => String(opt).includes(lastNumber));
            if (matchIdx === -1) {
              const expNum = parseFloat(lastNumber);
              matchIdx = opts.findIndex(opt => {
                const optNum = parseFloat(String(opt));
                return !isNaN(optNum) && !isNaN(expNum) && Math.abs(optNum - expNum) < 0.001;
              });
            }
          }
        }

        // Strategy 3: quoted option text appears in explanation.
        if (matchIdx === -1 && explanation) {
          for (let i = 0; i < opts.length; i++) {
            const optStr = String(opts[i]);
            if (explanation.includes(`"${optStr}"`) || explanation.includes(`'${optStr}'`)) {
              matchIdx = i; break;
            }
          }
        }

        actualA = matchIdx !== -1 ? matchIdx : (typeof q.a === 'number' ? q.a : 0);
      }

      const safeA = (actualA >= 0 && actualA < opts.length) ? actualA : 0;

      const correctOptText = opts[safeA];
      const shuffledOpts = shuffle([...opts]);
      const newA = shuffledOpts.indexOf(correctOptText);

      return { ...q, opts: shuffledOpts, a: newA, correctAnswer: correctOptText };
    });

    try {
      questions.forEach(q => { if (q.id) seenIdsRef.current.add(q.id); });
      setDbQuestionIds(questions.filter(q => q.id).map(q => q.id));
      const validatedQuestions = questions.map((q, i) => validateAndFixQuestion(q, i)).filter(q => q !== null);
      setSessionQuestions(validatedQuestions.length > 0 ? validatedQuestions : questions);
      setQIdx(0);
      resetQuestionState();
    } finally {
      fetchingRef.current = false;
      setGenerating(false);
    }
  }, [student?.year, student?.curriculum, student?.id, subject, curriculumProp, questionCount, resetQuestionState]);

  useEffect(() => {
    if (!student || !subject) return;
    setFinished(false);
    setResults({ score: 0, answers: [] });
    setTopicSummary({});
    setTotalScore(0);
    setStreak(0);
    fetchQuestions();
  }, [student?.id, subject]);  

  useEffect(() => {
    const q = sessionQuestions[qIdx];
    if (q?.steps) { setStepAnswers(new Array(q.steps.length).fill("")); setCurrentStep(0); }
    else          { setStepAnswers([]); setCurrentStep(0); }
    setEibLocked(false);    setStepError("");
    setFreeTextInput("");   setFreeTextSubmitted(false);
    setMultiSelected(new Set()); setMultiSubmitted(false);
    setRemediationShown(false);  setRemediationData(null);
    setRemediationAnswered(false); setRemediationResult(null);
    setHintIdx(-1); setHintsUsed(0);
  }, [qIdx, sessionQuestions]);

  const handlePick = useCallback((idx) => {
    if (selected !== null) return;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setSelected(idx);
    const currQ     = sessionQuestions[qIdx];
    const isCorrect = idx === currQ?.a;

    const rec = {
      q: currQ.q, isCorrect,
      correct:  currQ?.opts?.[currQ.a] ?? "",
      myAnswer: idx >= 0 ? (currQ?.opts?.[idx] ?? null) : null,
      exp:      currQ.exp    ?? "",
      subject:  currQ.subject ?? subject,
      topic:    currQ.topic   ?? "general",
    };
    if (isCorrect) {
      setResults(r => ({ ...r, score: r.score + 1, answers: [...r.answers, rec] }));
      setTotalScore(p => p + 10);
      setStreak(p => p + 1);
    } else {
      setResults(r => ({ ...r, answers: [...r.answers, rec] }));
      setStreak(0);
      queueMistake(currQ);
      fetchConceptCard(currQ.topic, currQ.subject);
      try { const e = getExplanationForQuestion?.(currQ); if (e) setExplanationData(e); } catch {}
    }
    recordTopicResult(currQ.topic, isCorrect);
  }, [selected, qIdx, sessionQuestions, subject, recordTopicResult, queueMistake, fetchConceptCard]);

  const handleFreeTextSubmit = useCallback(() => {
    if (freeTextSubmitted || !freeTextInput.trim()) return;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setFreeTextSubmitted(true);
    const currQ   = sessionQuestions[qIdx];
    const norm    = v => String(v || "").trim().toLowerCase().replace(/\s+/g, " ").replace(/[.,!?]/g, "");
    const correct = norm(currQ.answer ?? currQ.opts?.[currQ.a] ?? "");
    const user    = norm(freeTextInput);
    const aliases = currQ.answerAliases || [];
    const isCorrect = user === correct || aliases.some(a => norm(a) === user);
    const rec = {
      q: currQ.q, isCorrect,
      correct:  currQ.answer ?? currQ.opts?.[currQ.a] ?? "",
      myAnswer: freeTextInput,
      exp:      currQ.exp ?? "",
      subject:  currQ.subject ?? subject,
      topic:    currQ.topic   ?? "general",
    };
    setSelected(isCorrect ? true : false);
    if (isCorrect) {
      setResults(r => ({ ...r, score: r.score + 1, answers: [...r.answers, rec] }));
      setTotalScore(p => p + 10);
      setStreak(p => p + 1);
    } else {
      setResults(r => ({ ...r, answers: [...r.answers, rec] }));
      setStreak(0);
      queueMistake(currQ);
      fetchConceptCard(currQ.topic, currQ.subject);
    }
    recordTopicResult(currQ.topic, isCorrect);
  }, [freeTextInput, freeTextSubmitted, sessionQuestions, qIdx, subject, recordTopicResult, queueMistake, fetchConceptCard]);

  const handleMultiSubmit = useCallback(() => {
    if (multiSubmitted) return;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setMultiSubmitted(true);
    const currQ      = sessionQuestions[qIdx];
    const correctSet = new Set(Array.isArray(currQ.a) ? currQ.a : [currQ.a]);
    const allCorrect = multiSelected.size === correctSet.size && [...multiSelected].every(i => correctSet.has(i));
    const correctText = [...correctSet].map(i => currQ.opts?.[i] ?? "").join(", ");
    const myText      = [...multiSelected].map(i => currQ.opts?.[i] ?? "").join(", ");
    const rec = {
      q: currQ.q, isCorrect: allCorrect,
      correct: correctText, myAnswer: myText,
      exp: currQ.exp ?? "",
      subject: currQ.subject ?? subject,
      topic:   currQ.topic   ?? "general",
    };
    setSelected(allCorrect ? true : false);
    if (allCorrect) {
      setResults(r => ({ ...r, score: r.score + 1, answers: [...r.answers, rec] }));
      setTotalScore(p => p + 10);
      setStreak(p => p + 1);
    } else {
      setResults(r => ({ ...r, answers: [...r.answers, rec] }));
      setStreak(0);
      queueMistake(currQ);
      fetchConceptCard(currQ.topic, currQ.subject);
    }
    recordTopicResult(currQ.topic, allCorrect);
  }, [multiSubmitted, multiSelected, sessionQuestions, qIdx, subject, recordTopicResult, queueMistake, fetchConceptCard]);

  // Timer: when time expires, auto-advance to next question (don't lock or reveal answer)
  const timeExpiredRef = useRef(false);

  useEffect(() => {
    // Clear any existing timer before starting a new one
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const currQType = sessionQuestions[qIdx]?.type;
    if (selected !== null || finished || !sessionQuestions.length || generating || currQType === 'numerical_input') return;
    timeExpiredRef.current = false;
    timerRef.current = setInterval(() => {
      setTimeLeft(p => {
        if (p <= 1) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          // Mark as timed-out — the effect below will advance
          timeExpiredRef.current = true;
          return 0;
        }
        return p - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [qIdx, selected, finished, sessionQuestions, generating]);

  // Auto-advance when timer hits 0
  useEffect(() => {
    if (timeLeft !== 0 || !timeExpiredRef.current) return;
    timeExpiredRef.current = false;
    // Stop timer definitively before advancing
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    // Skip to next question without revealing answer
    if (qIdx < sessionQuestions.length - 1) {
      setQIdx(p => p + 1);
      resetQuestionState();
    } else {
      // Clear timer on quiz finish
      setFinished(true);
    }
  }, [timeLeft, qIdx, sessionQuestions.length, resetQuestionState]);

  const handleEIB = async () => {
    if (!eibText.trim() || eibLocked) return;
    setLoadingEIB(true);
    const currQ = sessionQuestions[qIdx];
    const fb = await fetchTaraFeedback({
      text: eibText,
      subject: currQ?.subject || subject || "mathematics",
      correctAnswer: currQ?.opts?.[currQ.a] ?? currQ?.answer ?? "",
      scholarName: student?.name,
      scholarYear: parseInt(student?.year || 4),
      question: currQ,
    });
    setEibFeedback(fb);
    setLoadingEIB(false);
    setEibLocked(true);
  };

  const handleKeyDown = e => {
    if (e.key === "Enter" && !e.shiftKey && !eibLocked) { e.preventDefault(); handleEIB(); }
  };

  const showHint = useCallback(() => {
    const hints = sessionQuestions[qIdx]?.hints;
    if (!hints || hintIdx >= hints.length - 1 || selected !== null) return;
    setHintIdx(prev => prev + 1);
    setHintsUsed(prev => prev + 1);
    setTotalScore(prev => Math.max(0, prev - 2));
  }, [hintIdx, qIdx, sessionQuestions, selected]);

  const normaliseStep = v => {
    const n = parseFloat(String(v).trim());
    return !isNaN(n) && isFinite(n) ? String(n) : String(v).trim().toLowerCase();
  };

  const handleStepAnswerChange = val => {
    const next = [...stepAnswers]; next[currentStep] = val; setStepAnswers(next);
    if (stepError) setStepError("");
  };

  const handleStepSubmit = () => {
    const q    = sessionQuestions[qIdx];
    const step = q.steps[currentStep];
    if (normaliseStep(stepAnswers[currentStep] || "") === normaliseStep(step.answer)) {
      setStepError("");
      if (currentStep === q.steps.length - 1) {
        setSelected(true);
        setResults(r => ({
          ...r, score: r.score + 1,
          answers: [...r.answers, {
            q: q.q, isCorrect: true,
            correct: step.answer, myAnswer: stepAnswers[currentStep],
            exp: q.exp ?? "",
            subject: q.subject ?? subject,
            topic:   q.topic   ?? "general",
          }],
        }));
        setTotalScore(p => p + 10);
        setStreak(p => p + 1);
        recordTopicResult(q.topic, true);
      } else { setCurrentStep(currentStep + 1); }
    } else { setStepError("Not quite — check your working and try again! 💡"); }
  };

  const handleRemediation = async () => {
    setRemediationShown(true);
    const currQ = sessionQuestions[qIdx];
    try {
      const res = await apiFetch("/api/remediate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scholar_id: student.id, skill_topic: currQ.topic }),
      });
      setRemediationData(await res.json());
    } catch (err) { console.error("Remediation error:", err); }
  };

  const handleRemediationAnswer = (selectedIdx, correctIdx) => {
    setRemediationAnswered(true);
    setRemediationResult(selectedIdx === correctIdx ? "correct" : "wrong");
  };

  const next = () => {
    if (qIdx < sessionQuestions.length - 1) {
      setQIdx(p => p + 1);
      resetQuestionState();
    } else if (missedQuestions.length > 0 && !retriesInjectedRef.current) {
      // ── Mistake re-queue: inject up to 3 missed questions before finishing ──
      retriesInjectedRef.current = true;
      setSessionQuestions(prev => [...prev, ...missedQuestions]);
      setMissedQuestions([]);
      setQIdx(p => p + 1);
      resetQuestionState();
    } else {
      finishQuest();
    }
  };

  const handleAdvancedSubmit = async (submission) => {
    const currQ = sessionQuestions[qIdx];
    const isCorrect = true; // Simplified for the inline version
    const rec = {
      q: currQ.q, isCorrect,
      correct: currQ._raw?.numerical_answer?.toString() ?? '',
      myAnswer: submission.numericalAnswer?.toString() ?? '',
      exp: currQ.exp ?? '',
      subject: currQ.subject ?? subject,
      topic: currQ.topic ?? 'general',
    };
    setResults(r => ({ ...r, score: r.score + 1, answers: [...r.answers, rec] }));
    setTotalScore(p => p + 10);
    setStreak(p => p + 1);
    recordTopicResult(currQ.topic, isCorrect);
    setAdvancedResult({ isCorrect, xpEarned: 10, aiValidation: { feedback: "Great work!" } });
  };

  const finishQuest = async () => {
    setSavingResult(true);
    try {
      const details = sessionQuestions.map(q => {
        const answered = results.answers.find(a => a.q === q.q);
        return {
          question_id: q.id || null,
          subject:     q.subject || subject,
          topic:       q.topic   || "general",
          correct:     answered?.isCorrect ?? false,
        };
      });
      const finalScore = details.filter(d => d.correct).length;
      const accuracy   = sessionQuestions.length > 0
        ? Math.round((finalScore / sessionQuestions.length) * 100) : 0;

      // ── Persist to DB ────────────────────────────────────────────────────────
      if (student?.id) {
        const curriculum = curriculumProp || student?.curriculum || "uk_national";

        // 1. Insert quiz_results row — canonical column names only
        const topics = [...new Set(details.map(d => d.topic).filter(Boolean))];
        const { data: qrRow } = await supabase.from("quiz_results").insert({
          scholar_id:         student.id,
          subject,
          curriculum,
          score:              finalScore,
          questions_total:    sessionQuestions.length,
          time_spent_seconds: sessionQuestions.length * 45,
          accuracy,
          topics:             JSON.stringify(topics),
        }).select("id").single().catch(e => { console.error("[finishQuest] quiz_results insert:", e.message); return {}; });

        // 2. Award XP
        await supabase.rpc("increment_scholar_xp", {
          s_id: student.id, xp_to_add: totalScore,
        }).catch(e => console.error("[finishQuest] XP rpc:", e.message));

        // 2b. Update daily streak + award coins + update quest progress (non-fatal)
        try {
          let currentStreak = 0;
          try {
            const { data: sv } = await supabase.rpc("update_scholar_streak", { p_scholar_id: student.id });
            currentStreak = sv ?? 0;
          } catch {}
          if (qrRow?.id) {
            const { awardCoinsForQuiz } = await import("../../lib/coins");
            await awardCoinsForQuiz(supabase, {
              scholarId: student.id, quizResultId: qrRow.id,
              score: accuracy, xpEarned: totalScore,
              topic: topics[0] || "general", currentStreak,
            });
          }
          const { updateQuestProgress } = await import("../../lib/questSystem");
          await updateQuestProgress(student.id, {
            subject, totalQuestions: sessionQuestions.length,
            correctCount: finalScore, accuracy, timeSpent: sessionQuestions.length * 45,
          });
        } catch (e) { console.warn("[finishQuest] coin/quest wiring:", e?.message); }

        // 3. Update mastery — use BKT processSession from masteryEngine
        try {
          const { processSession } = await import("../../lib/masteryEngine");
          const year = parseInt(student?.year_level || student?.year || 4, 10);
          const curriculum = curriculumProp || student?.curriculum || "uk_national";

          // Fetch prior mastery so BKT updates from existing state, not cold start
          const { data: existingMastery } = await supabase
            .from("scholar_topic_mastery")
            .select("*")
            .eq("scholar_id", student.id)
            .eq("curriculum", curriculum);

          const masteryMap = {};
          (existingMastery || []).forEach(r => {
            masteryMap[`${r.curriculum}|${r.subject}|${r.topic}`] = r;
          });

          const masteryUpdates = processSession(
            student.id,
            details.map(d => ({ ...d, curriculum, yearLevel: year, questionId: d.question_id })),
            masteryMap
          );
          if (masteryUpdates.length > 0) {
            await supabase
              .from("scholar_topic_mastery")
              .upsert(masteryUpdates, { onConflict: "scholar_id,curriculum,subject,topic" })
              .catch(e => console.error("[finishQuest] mastery upsert:", e.message));
          }
        } catch {
          // masteryEngine not bundled — fall back to server RPC
          await supabase.rpc("update_scholar_skills", {
            p_scholar_id: student.id, p_details: details,
          }).catch(e => console.error("[finishQuest] update_scholar_skills rpc:", e.message));
        }
      }

      setFinished(true);
      if (onComplete) onComplete({ score: finalScore, totalScore, accuracy, answers: results.answers, topicSummary });
    } catch (e) {
      console.error("[finishQuest] unexpected error:", e);
      setFinished(true);
      if (onComplete) onComplete({ score: results.score, totalScore, accuracy: 0, answers: results.answers, topicSummary });
    } finally { setSavingResult(false); }
  };

  if (generating) return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[5000] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl sm:rounded-[40px] p-4 sm:p-6 text-center max-w-xs w-full shadow-2xl">
        <RocketIcon size={48} className="mx-auto text-indigo-500 mb-4 animate-bounce" />
        <h3 className="text-xl font-black text-slate-800 mb-1">Pre-Flight Checks…</h3>
        <p className="text-sm text-slate-500 font-bold">
          Loading {subject ? subject.charAt(0).toUpperCase() + subject.slice(1) : "Mission"} Data.
        </p>
      </div>
    </div>
  );

  if (finished) {
    const finalScore    = results.answers.filter(a => a.isCorrect).length;
    // Count only original questions (not retries) for headline accuracy
    const origTotal     = sessionQuestions.filter(q => !q._isRetry).length || sessionQuestions.length;
    const origCorrect   = results.answers.filter(a => {
      const q = sessionQuestions.find(sq => sq.q === a.q);
      return a.isCorrect && !q?._isRetry;
    }).length;
    const accuracy      = origTotal > 0 ? Math.round((origCorrect / origTotal) * 100) : 0;

    // Per-topic breakdown for wrap-up
    const topicEntries  = Object.entries(topicSummary)
      .sort((a, b) => (a[1].correct / (a[1].total || 1)) - (b[1].correct / (b[1].total || 1)));
    const weakestTopic  = topicEntries[0]?.[0]; // lowest accuracy topic

    const headline =
      accuracy >= 90 ? { emoji: "🚀", text: "Orbit Achieved!" } :
      accuracy >= 70 ? { emoji: "🌟", text: "Stellar Work!" } :
      accuracy >= 50 ? { emoji: "🪐", text: "Keep Climbing!" } :
                       { emoji: "💪", text: "You Got This!" };

    return (
      <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[5000] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl sm:rounded-[40px] p-4 sm:p-6 text-center max-w-sm w-full shadow-2xl border-b-4 border-slate-200 overflow-y-auto max-h-[90vh]">
          <div className="text-4xl mb-2">{headline.emoji}</div>
          <h2 className="text-2xl font-black text-slate-800 mb-1">{headline.text}</h2>
          <p className="text-slate-500 font-bold text-sm mb-1">{origCorrect}/{origTotal} Correct</p>

          {/* Accuracy badge */}
          <div className={`inline-block px-4 py-1.5 rounded-full font-black text-sm mb-3 ${
            accuracy >= 80 ? "bg-emerald-50 text-emerald-600" :
            accuracy >= 50 ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-500"
          }`}>{accuracy}% accuracy</div>

          {/* XP + streak row */}
          <div className="flex justify-center gap-2 mb-4">
            <div className="bg-indigo-50 px-3 py-2 rounded-xl border border-indigo-200 flex items-center gap-1.5">
              <StarIcon size={15} className="text-indigo-500"/>
              <span className="font-black text-indigo-700 text-sm">+{totalScore} XP</span>
            </div>
            {streak > 0 && (
              <div className="bg-amber-50 px-3 py-2 rounded-xl border border-amber-200 flex items-center gap-1.5">
                <FlameIcon size={15} className="text-amber-500"/>
                <span className="font-black text-amber-700 text-sm">{streak} streak</span>
              </div>
            )}
          </div>

          {/* Per-topic performance */}
          {topicEntries.length > 0 && (
            <div className="mb-4 text-left">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Topics this session</p>
              <div className="space-y-1.5">
                {topicEntries.slice(0, 4).map(([topic, data]) => {
                  const pct = Math.round((data.correct / data.total) * 100);
                  const barColor = pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-400" : "bg-rose-400";
                  return (
                    <div key={topic}>
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="text-xs font-bold text-slate-600 truncate max-w-[70%]">{topic.replace(/_/g, " ")}</span>
                        <span className="text-xs font-black text-slate-500">{data.correct}/{data.total}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tomorrow's focus */}
          {weakestTopic && (
            <div className="mb-4 bg-indigo-50 rounded-xl p-3 text-left border border-indigo-100">
              <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-0.5">Focus tomorrow</p>
              <p className="text-sm font-black text-slate-700">{weakestTopic.replace(/_/g, " ")}</p>
            </div>
          )}

          <TopicSummaryCard topicSummary={topicSummary} />

          <div className="flex flex-col gap-2 mt-4">
            <button
              onClick={() => {
                setFinished(false);
                setResults({ score: 0, answers: [] });
                setTopicSummary({});
                setTotalScore(0);
                setStreak(0);
                setMissedQuestions([]);
                retriesInjectedRef.current = false;
                fetchQuestions();
              }}
              className="w-full bg-indigo-600 text-white font-black py-3 rounded-2xl text-sm shadow border-b-4 border-indigo-800 flex items-center justify-center gap-2"
            >
              Next Mission <ArrowRightIcon size={16}/>
            </button>
            <button
              onClick={() => onClose?.()}
              className="w-full bg-slate-100 text-slate-600 font-black py-3 rounded-2xl text-sm border-b-4 border-slate-200"
            >
              Return to Base
            </button>
          </div>
        </div>
      </div>
    );
  }

  const q = sessionQuestions[qIdx];
  if (!q) return null;

  if (q.type === 'numerical_input' || q._raw?.requires_explanation) {
    if (advancedResult) {
      return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[4000] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl sm:rounded-[40px] p-4 sm:p-6 text-center max-w-sm w-full shadow-2xl border-b-4 border-slate-200">
            {advancedResult.isCorrect
              ? <CheckCircleIcon size={56} className="mx-auto text-emerald-500 mb-3" />
              : <XCircleIcon size={56} className="mx-auto text-rose-500 mb-3" />}
            <h2 className="text-2xl font-black text-slate-800 mb-1">
              {advancedResult.isCorrect ? 'Correct!' : 'Not quite!'}
            </h2>
            <p className="text-indigo-600 font-black mb-3">+{advancedResult.xpEarned} XP</p>
            {advancedResult.aiValidation?.feedback && (
              <div className="bg-indigo-50 rounded-xl p-3 text-sm text-left mb-4 text-slate-700">
                <p className="font-bold text-indigo-700 mb-1">AI Feedback:</p>
                <p>{advancedResult.aiValidation.feedback}</p>
              </div>
            )}
            <button
              onClick={() => { setAdvancedResult(null); next(); }}
              className="w-full bg-indigo-600 text-white font-black py-3 rounded-2xl text-sm shadow border-b-4 border-indigo-800 flex items-center justify-center gap-2"
            >
              Continue <ArrowRightIcon size={16}/>
            </button>
          </div>
        </div>
      );
    }
    return (
      <AdvancedQuizWithQR
        question={q._raw || q}
        scholar={student}
        onSubmit={handleAdvancedSubmit}
        onSkip={() => {
          setResults(r => ({ ...r, answers: [...r.answers, { q: q.q, isCorrect: false, correct: '', myAnswer: 'skipped', exp: '', subject: q.subject, topic: q.topic }] }));
          setStreak(0);
          recordTopicResult(q.topic, false);
          next();
        }}
      />
    );
  }

  const qType           = q.type || "mcq";
  const isMultiStep     = !!q.steps;
  const isCorrectAnswer =
    qType === "free_text"    ? selected === true :
    qType === "multi_select" ? selected === true :
    !isMultiStep && selected === q.a;
  const canProceed =
    (isMultiStep && selected === true) ||
    isCorrectAnswer ||
    (selected !== null && !isCorrectAnswer && !!eibFeedback);
  const correctAnswerText =
    qType === "free_text"    ? (q.answer ?? "") :
    qType === "multi_select" ? (Array.isArray(q.a) ? q.a.map(i => q.opts?.[i]).join(", ") : "") :
    (q.opts?.[q.a] ?? "");

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[4000] flex items-center justify-center p-2">
      <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border-b-4 border-slate-200 max-h-[90vh] flex flex-col">

        {/* Progress bar */}
        <div className="h-1.5 bg-slate-100">
          <div className="h-full bg-indigo-500 transition-all"
            style={{ width: `${((qIdx + 1) / sessionQuestions.length) * 100}%` }} />
        </div>

        {/* Header */}
        <div className="p-3 flex justify-between items-center bg-slate-50 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <span className="bg-indigo-50 px-2 py-1 rounded-lg font-black text-indigo-600 text-[10px] uppercase tracking-widest flex items-center gap-1">
              <RocketIcon size={12}/> Mission {qIdx + 1}/{sessionQuestions.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* ── Live streak bar ── */}
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg border transition-transform duration-300 ${
              streak > 0 ? "bg-amber-50 border-amber-200" : "bg-slate-100 border-slate-200"
            } ${streakPop ? "scale-125" : "scale-100"}`}>
              <FlameIcon size={13} className={streak > 0 ? "text-amber-500" : "text-slate-400"}/>
              <span className={`font-black text-xs tabular-nums ${streak > 0 ? "text-amber-700" : "text-slate-400"}`}>{streak}</span>
            </div>
            <div className="flex items-center gap-1 bg-purple-50 px-2 py-1 rounded-lg border border-purple-200">
              <StarIcon size={13} className="text-purple-500"/>
              <span className="font-black text-purple-700 text-xs tabular-nums">{totalScore}</span>
            </div>
            {/* Retry badge */}
            {q._isRetry && (
              <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-200">
                🔄 2nd chance
              </span>
            )}
            <div className={`text-base font-black tabular-nums ${timeLeft < 6 ? "text-rose-500 animate-pulse" : "text-slate-800"}`}>
              00:{timeLeft.toString().padStart(2, "0")}
            </div>
            <button onClick={() => onClose?.()} className="text-slate-400 hover:text-rose-500 p-0.5">
              <XIcon size={20}/>
            </button>
          </div>
        </div>

        {/* Level-up flash overlay */}
        {levelUpMsg && (
          <div className="absolute inset-x-0 top-16 flex justify-center z-50 pointer-events-none">
            <div className="bg-indigo-600 text-white font-black px-5 py-2.5 rounded-2xl shadow-2xl text-base animate-bounce">
              {levelUpMsg}
            </div>
          </div>
        )}

        {/* Body */}
        <div className="p-4 overflow-y-auto flex-1">

          {/* Passage */}
          {q.passage && (
            <div className="mb-4 p-4 bg-indigo-50 rounded-xl border border-indigo-200 text-sm leading-relaxed">
              <div className="font-black text-indigo-800 mb-2 text-xs uppercase tracking-widest">📖 Reading Passage</div>
              <div className="text-slate-700 whitespace-pre-wrap">{q.passage}</div>
            </div>
          )}

          {/* Image */}
          {q.image_url && (
            <div className="mb-4">
              <ImageDisplay src={q.image_url} alt="Question diagram" />
            </div>
          )}

          {/* ── MULTI-STEP ── */}
          {isMultiStep ? (
            <div className="space-y-4">
              <h3 className="text-lg md:text-xl font-black text-slate-800">{q.q}</h3>
              <div className="flex items-center gap-2">
                {q.steps.map((_, idx) => (
                  <div key={idx} className={`h-2 flex-1 rounded-full transition-all ${
                    selected === true ? "bg-emerald-400" :
                    idx < currentStep  ? "bg-emerald-400" :
                    idx === currentStep ? "bg-indigo-500" : "bg-slate-200"
                  }`} />
                ))}
              </div>
              {selected === true ? (
                <div className="space-y-3">
                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                    <p className="font-black text-emerald-700 text-sm mb-1">✅ All steps complete! Well done!</p>
                    {q.exp && <p className="text-xs font-bold text-emerald-600 mt-1 leading-relaxed">{q.exp}</p>}
                  </div>
                  <button onClick={next} disabled={savingResult}
                    className="w-full bg-slate-900 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 text-sm border-b-4 border-black disabled:opacity-60">
                    {savingResult ? "Saving…" : qIdx === sessionQuestions.length - 1 ? "Complete Mission" : "Continue"}
                    {!savingResult && <ArrowRightIcon size={16}/>}
                  </button>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <p className="font-black text-sm text-slate-700">
                    Step {currentStep + 1} of {q.steps.length}: {q.steps[currentStep].prompt}
                  </p>
                  <input
                    type="text"
                    value={stepAnswers[currentStep] || ""}
                    onChange={e => handleStepAnswerChange(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleStepSubmit(); }}
                    className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold outline-none focus:border-indigo-400 text-slate-800"
                    placeholder="Your answer…"
                    autoFocus
                  />
                  {stepError && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-bold text-xs">{stepError}</div>
                  )}
                  <button
                    onClick={handleStepSubmit}
                    disabled={!stepAnswers[currentStep]?.trim()}
                    className="w-full bg-indigo-600 text-white font-black py-2.5 rounded-xl text-sm border-b-4 border-indigo-800 hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {currentStep === q.steps.length - 1 ? "Finish ✓" : "Next Step"} <ArrowRightIcon size={14}/>
                  </button>
                </div>
              )}
            </div>

          /* ── FREE TEXT ── */
          ) : qType === "free_text" ? (
            <div className="space-y-3">
              <h3 className="text-lg md:text-xl font-black text-slate-800 mb-3">{q.q}</h3>
              {!freeTextSubmitted ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={freeTextInput}
                    onChange={e => setFreeTextInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleFreeTextSubmit(); }}
                    className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold outline-none focus:border-indigo-400 text-slate-800"
                    placeholder="Type your answer…"
                    autoFocus
                  />
                  <button
                    onClick={handleFreeTextSubmit}
                    disabled={!freeTextInput.trim()}
                    className="w-full bg-indigo-600 text-white font-black py-2.5 rounded-xl text-sm border-b-4 border-indigo-800 hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Submit Answer ✓
                  </button>
                </div>
              ) : (
                <div className={`p-3 rounded-xl border-2 ${selected === true ? "bg-emerald-50 border-emerald-400" : "bg-rose-50 border-rose-400"}`}>
                  <p className="font-black text-sm mb-1">{selected === true ? "✅ Correct!" : "✗ Not quite"}</p>
                  <p className="text-xs font-bold">Your answer: <span className="italic">{freeTextInput}</span></p>
                  {selected !== true && <p className="text-xs font-bold text-emerald-700 mt-1">Correct: {correctAnswerText}</p>}
                </div>
              )}
              {freeTextSubmitted && (
                <div className="space-y-3 border-t border-slate-100 pt-3">
                  <div className="p-3 bg-slate-50 rounded-xl border-l-4 border-indigo-500 flex gap-2 items-start">
                    <BrainIcon size={18} className="text-indigo-500 shrink-0 mt-0.5"/>
                    <p className="text-xs font-bold text-slate-800 leading-relaxed">{q.exp}</p>
                  </div>
                  {selected !== true && (
                    <div className="bg-amber-50 p-3 rounded-xl border border-amber-200">
                      <p className="text-amber-800 font-bold text-xs mb-2">
                        <span className="font-black">Tara's Challenge:</span> Why is <span className="underline font-black">{correctAnswerText}</span> correct?
                      </p>
                      <textarea
                        value={eibText}
                        onChange={e => setEibText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={eibLocked}
                        className="w-full p-2 rounded-lg border border-amber-100 font-bold text-xs bg-white mb-2 resize-none focus:outline-none focus:border-amber-400"
                        rows={2}
                        placeholder="Type your reasoning…"
                      />
                      <button
                        disabled={loadingEIB || !eibText.trim() || eibLocked}
                        onClick={handleEIB}
                        className="w-full bg-amber-500 text-white font-black py-2 rounded-lg text-xs uppercase tracking-widest border-b-2 border-amber-700 disabled:opacity-50 flex items-center justify-center gap-1"
                      >
                        <ZapIcon size={12}/> {loadingEIB ? "Thinking…" : "Tell Tara ✨"}
                      </button>
                      {eibFeedback && (
                        <div className="mt-2 p-2 bg-white rounded-lg border border-amber-100 text-amber-900 font-bold italic text-xs">{eibFeedback}</div>
                      )}
                    </div>
                  )}
                  {canProceed && (
                    <button onClick={next} disabled={savingResult}
                      className="w-full bg-slate-900 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 text-sm border-b-4 border-black disabled:opacity-60">
                      {savingResult ? "Saving…" : qIdx === sessionQuestions.length - 1 ? "Complete Mission" : "Continue"}
                      {!savingResult && <ArrowRightIcon size={16}/>}
                    </button>
                  )}
                </div>
              )}
            </div>

          /* ── MULTI SELECT ── */
          ) : qType === "multi_select" ? (
            <div className="space-y-3">
              <h3 className="text-lg md:text-xl font-black text-slate-800 mb-1">{q.q}</h3>
              <p className="text-xs font-bold text-slate-400 mb-2">Select all correct answers</p>
              <div className="grid grid-cols-1 gap-2 mb-3">
                {q.opts.map((opt, i) => {
                  const correctSet   = new Set(Array.isArray(q.a) ? q.a : [q.a]);
                  const isChecked    = multiSelected.has(i);
                  const isCorrectOpt = correctSet.has(i);
                  let cls = "bg-white border-slate-200 text-slate-700 hover:border-indigo-400";
                  if (multiSubmitted) {
                    if (isCorrectOpt && isChecked)  cls = "bg-emerald-50 border-emerald-500 text-emerald-700";
                    else if (isCorrectOpt)           cls = "bg-emerald-50 border-emerald-300 text-emerald-600 opacity-80";
                    else if (isChecked)              cls = "bg-rose-50 border-rose-400 text-rose-700";
                    else                             cls = "bg-white border-slate-100 opacity-40";
                  }
                  return (
                    <button key={i} disabled={multiSubmitted}
                      onClick={() => {
                        if (multiSubmitted) return;
                        setMultiSelected(prev => {
                          const n = new Set(prev);
                          n.has(i) ? n.delete(i) : n.add(i);
                          return n;
                        });
                      }}
                      className={`p-3 rounded-xl font-bold border-2 transition-all text-sm text-left flex items-center gap-3 ${cls}`}
                    >
                      <div className={`w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center ${
                        multiSelected.has(i) ? "bg-indigo-600 border-indigo-600" : "border-slate-300"
                      }`}>
                        {multiSelected.has(i) && <CheckCircleIcon size={12} className="text-white"/>}
                      </div>
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>
              {!multiSubmitted ? (
                <button onClick={handleMultiSubmit} disabled={multiSelected.size === 0}
                  className="w-full bg-indigo-600 text-white font-black py-2.5 rounded-xl text-sm border-b-4 border-indigo-800 hover:bg-indigo-700 disabled:opacity-50">
                  Submit Selection ✓
                </button>
              ) : (
                <div className="space-y-3 border-t border-slate-100 pt-3">
                  <div className="p-3 bg-slate-50 rounded-xl border-l-4 border-indigo-500 flex gap-2 items-start">
                    <BrainIcon size={18} className="text-indigo-500 shrink-0 mt-0.5"/>
                    <p className="text-xs font-bold text-slate-800 leading-relaxed">{q.exp}</p>
                  </div>
                  {canProceed && (
                    <button onClick={next} disabled={savingResult}
                      className="w-full bg-slate-900 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 text-sm border-b-4 border-black disabled:opacity-60">
                      {savingResult ? "Saving…" : qIdx === sessionQuestions.length - 1 ? "Complete Mission" : "Continue"}
                      {!savingResult && <ArrowRightIcon size={16}/>}
                    </button>
                  )}
                </div>
              )}
            </div>

          /* ── MCQ / FILL BLANK (default) ── */
          ) : (
            <>
              {qType === "fill_blank"
                ? <FillBlankDisplay text={q.q} />
                : <h3 className="text-lg md:text-xl font-black text-slate-800 mb-3">{q.q}</h3>
              }

              {/* Hints */}
              {selected === null && q.hints && q.hints.length > 0 && (
                <div className="mb-3 space-y-2">
                  {q.hints.slice(0, hintIdx + 1).map((hint, i) => (
                    <div key={i} className="flex items-start gap-2 p-2.5 bg-yellow-50 border border-yellow-200 rounded-xl">
                      <span className="text-yellow-500 shrink-0">💡</span>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-yellow-500 mr-1.5">Hint {i + 1}</span>
                        <span className="text-xs font-bold text-yellow-800">{hint}</span>
                      </div>
                    </div>
                  ))}
                  {hintIdx < q.hints.length - 1 && (
                    <button
                      onClick={showHint}
                      className="flex items-center gap-1.5 text-[11px] font-bold text-yellow-600 hover:text-yellow-700 transition-colors px-2 py-1 rounded-lg hover:bg-yellow-50 border border-transparent hover:border-yellow-200"
                    >
                      💡 {hintIdx === -1 ? "Show hint" : "Next hint"} <span className="text-yellow-400 font-black">−2 XP</span>
                    </button>
                  )}
                </div>
              )}

              {/* Visual aid */}
              {q.visual && (() => {
                const v = q.visual;
                if (typeof v === "object") {
                  if (v.type === "addition-dots")         return <AdditionVisual a={v.a} b={v.b} />;
                  if (v.type === "subtraction-partwhole") return <SubtractionVisual a={v.a} b={v.b} ans={v.ans} />;
                  if (v.type === "bar-model")             return <BarModelVisual a={v.a} b={v.b} ans={v.ans} operation={v.operation} />;
                }
                return (
                  <div className="mb-3 p-3 bg-indigo-50 rounded-xl border border-indigo-100 text-center text-xl font-bold text-indigo-900">{v}</div>
                );
              })()}

              {/* Answer options */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                {(q.opts || []).map((opt, i) => {
                  const isAnswered    = selected !== null;
                  const isOptionCorrect = i === q.a;
                  const isSelected    = selected === i;
                  let cls = "bg-white border-slate-200 hover:border-indigo-500 text-slate-700";
                  if (isAnswered) {
                    if (isOptionCorrect) cls = "bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-100";
                    else if (isSelected) cls = "bg-rose-50 border-rose-500 text-rose-700 ring-2 ring-rose-100";
                    else                 cls = "bg-white border-slate-100 opacity-30 grayscale";
                  }
                  return (
                    <button key={i} disabled={isAnswered} onClick={() => handlePick(i)}
                      className={`p-3 rounded-xl font-bold border-2 transition-all text-sm text-left ${cls}`}>
                      <div className="flex justify-between items-center gap-1">
                        <span>{opt}</span>
                        {isAnswered && isOptionCorrect && <CheckCircleIcon className="text-emerald-500 shrink-0" size={16}/>}
                        {isAnswered && isSelected && !isOptionCorrect && <XCircleIcon className="text-rose-500 shrink-0" size={16}/>}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Post-answer panel */}
              {selected !== null && (
                <div className="space-y-3 border-t border-slate-100 pt-3">

                  {/* Explanation */}
                  <div className="p-3 bg-slate-50 rounded-xl border-l-4 border-indigo-500 flex gap-2 items-start">
                    <BrainIcon size={18} className="text-indigo-500 shrink-0 mt-0.5"/>
                    <p className="text-xs font-bold text-slate-800 leading-relaxed">{q.exp}</p>
                  </div>

                  {/* Concept Snapshot — fetched on wrong answer, skipped gracefully on 204 */}
                  {!isCorrectAnswer && (conceptCardLoading || conceptCard) && (
                    <ConceptSnapshot card={conceptCard} loading={conceptCardLoading} />
                  )}

                  {/* Step-by-step explainer */}
                  {!isCorrectAnswer && !showInteractiveExplanation && explanationData && (
                    <button onClick={() => setShowInteractiveExplanation(true)}
                      className="w-full bg-indigo-100 text-indigo-700 font-black py-2 px-3 rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-200 text-xs border border-indigo-200">
                      <EyeIcon size={14}/> View Flight Data (Step‑by‑Step)
                    </button>
                  )}

                  {showInteractiveExplanation && explanationData && (
                    <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-200">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-black text-indigo-800 text-[10px] uppercase tracking-widest flex items-center gap-1">
                          <EyeIcon size={12}/> Nav Computer
                        </h4>
                        <span className="bg-indigo-200 text-indigo-800 font-bold px-1.5 py-0.5 rounded-full text-[10px]">
                          Step {explanationStep + 1}/{explanationData.steps.length}
                        </span>
                      </div>
                      {explanationData.visual === "place-value-chart" && (
                        <PlaceValueChart computed={explanationData.computed} step={explanationStep}/>
                      )}
                      <div className="bg-white p-2 rounded-lg border border-indigo-100 text-center mb-2">
                        <p className="text-xs font-black text-indigo-900">{explanationData.steps[explanationStep]}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setExplanationStep(s => Math.max(0, s - 1))} disabled={explanationStep === 0}
                          className="flex-1 bg-white text-indigo-600 font-black py-1.5 rounded-lg border border-indigo-200 disabled:opacity-40 text-xs flex items-center justify-center gap-1">
                          <ArrowLeftIcon size={12}/> Prev
                        </button>
                        {explanationStep < explanationData.steps.length - 1 ? (
                          <button onClick={() => setExplanationStep(s => s + 1)}
                            className="flex-[2] bg-indigo-600 text-white font-black py-1.5 rounded-lg text-xs flex items-center justify-center gap-1">
                            Next <ArrowRightIcon size={12}/>
                          </button>
                        ) : (
                          <button onClick={() => setShowInteractiveExplanation(false)}
                            className="flex-[2] bg-emerald-500 text-white font-black py-1.5 rounded-lg text-xs flex items-center justify-center gap-1">
                            <CheckCircleIcon size={12}/> Got It!
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* EIB — wrong answer only */}
                  {!isCorrectAnswer && (
                    <div className="bg-amber-50 p-3 rounded-xl border border-amber-200">
                      <p className="text-amber-800 font-bold text-xs mb-2">
                        <span className="font-black">Tara's Challenge:</span> Why is{" "}
                        <span className="underline font-black">{correctAnswerText}</span> correct?
                      </p>
                      <textarea
                        value={eibText}
                        onChange={e => setEibText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={eibLocked}
                        className="w-full p-2 rounded-lg border border-amber-100 font-bold text-xs bg-white mb-2 resize-none focus:outline-none focus:border-amber-400"
                        rows={2}
                        placeholder="Type your reasoning and press Enter…"
                      />
                      <button
                        disabled={loadingEIB || !eibText.trim() || eibLocked}
                        onClick={handleEIB}
                        className="w-full bg-amber-500 text-white font-black py-2 rounded-lg text-xs uppercase tracking-widest border-b-2 border-amber-700 disabled:opacity-50 flex items-center justify-center gap-1"
                      >
                        <ZapIcon size={12}/> {loadingEIB ? "Thinking…" : "Tell Tara ✨"}
                      </button>
                      {eibFeedback && (
                        <div className="mt-2 p-2 bg-white rounded-lg border border-amber-100 text-amber-900 font-bold italic text-xs">{eibFeedback}</div>
                      )}
                    </div>
                  )}

                  {/* Remediation */}
                  {!isCorrectAnswer && !remediationShown && (
                    <button onClick={handleRemediation}
                      className="text-xs text-indigo-600 underline font-bold">
                      Need more help? Practice this skill.
                    </button>
                  )}

                  {remediationData && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-xl border border-blue-200">
                      <h4 className="font-black text-sm mb-1 text-blue-800">{remediationData.title}</h4>
                      <p className="text-xs mb-3 text-blue-700">{remediationData.description}</p>
                      {remediationData.practice_q && (
                        <>
                          <p className="font-bold text-xs mb-2 text-slate-800">{remediationData.practice_q}</p>
                          <div className="grid grid-cols-2 gap-2">
                            {(remediationData.opts || []).map((opt, i) => (
                              <button key={i} disabled={remediationAnswered}
                                onClick={() => handleRemediationAnswer(i, remediationData.correct)}
                                className={`p-2 rounded-lg text-xs font-bold border-2 transition-all ${
                                  remediationAnswered
                                    ? i === remediationData.correct
                                      ? "bg-emerald-50 border-emerald-400 text-emerald-700"
                                      : "opacity-40 bg-white border-slate-200"
                                    : "bg-white border-slate-200 hover:border-indigo-400 text-slate-700"
                                }`}>
                                {opt}
                              </button>
                            ))}
                          </div>
                          {remediationAnswered && (
                            <p className={`text-xs font-bold mt-2 ${remediationResult === "correct" ? "text-emerald-600" : "text-rose-500"}`}>
                              {remediationResult === "correct"
                                ? "✅ Correct! You're getting it."
                                : `✗ The answer was: ${remediationData.opts?.[remediationData.correct]}`}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/* Continue / Finish button */}
                  {canProceed && (
                    <button onClick={next} disabled={savingResult}
                      className="w-full bg-slate-900 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 text-sm border-b-4 border-black disabled:opacity-60">
                      {savingResult ? "Saving…" : qIdx === sessionQuestions.length - 1 ? "Complete Mission" : "Continue"}
                      {!savingResult && <ArrowRightIcon size={16}/>}
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}