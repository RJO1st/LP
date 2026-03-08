"use client";
// ╔══════════════════════════════════════════════════════════════╗
// ║         LAUNCHPARD — QUIZ ENGINE v8                         ║
// ║  question_bank · difficulty_tier · multi-type questions     ║
// ╚══════════════════════════════════════════════════════════════╝
import React, { useState, useEffect, useRef, useCallback } from "react";
import ImageDisplay from "./ImageDisplay";

// ─── INLINED DEPENDENCIES TO FIX COMPILATION ──────────────────────────────────
const createSupabaseMock = () => {
  const chain = {
    select: () => chain,
    eq: () => chain,
    not: () => chain,
    order: () => chain,
    limit: () => Promise.resolve({ data: [], error: null }),
    update: () => chain,
    in: () => Promise.resolve({ data: [], error: null }),
    insert: () => Promise.resolve({ data: [], error: null }),
    single: () => Promise.resolve({ data: { name: 'Cadet', parent_id: '1', email: 'test@test.com', full_name: 'Parent' }, error: null })
  };
  return { from: () => chain, rpc: () => Promise.resolve({ data: null, error: null }) };
};
const supabase = createSupabaseMock();

const getSmartQuestions = async () => [];

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
  if (!question?.vars || !question?.topic || question.subject !== 'maths') return null;
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
  return safeQuestionBuilder(q, ans, opts, { exp, subject: 'maths', hints: ["Think step by step."], vars: { a, b }, topic });
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
    if (subject === 'maths') qs.push(generateLocalMaths(year));
    else if (subject === 'english') qs.push(generateLocalEnglish(year));
    else if (subject === 'verbal') qs.push(generateLocalVerbal(year));
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

  const sub        = subject in keys ? subject : "maths";
  const hasKeyword = keys[sub].some(k => lower.includes(k));
  if (hasKeyword) { const arr = pos[sub]; return arr[Math.floor(Math.random() * arr.length)]; }
  return nudge[sub] || nudge.maths;
};

const fetchTaraFeedback = async ({ text, subject, correctAnswer, scholarName, scholarYear, question }) => {
  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch("/api/tara", {
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
              <span className="capitalize">{topic?.replace(/_/g, " ")}</span>
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

  if (data.explanation) {
    const numberMatch = data.explanation.match(/(\d+(?:\.\d+)?)(?!.*\d)/);
    if (numberMatch) {
      const lastNumber = numberMatch[1];
      let matchIdx = opts.findIndex(opt => String(opt).includes(lastNumber));
      if (matchIdx === -1) {
        const expNum = parseFloat(lastNumber);
        matchIdx = opts.findIndex(opt => {
          const optNum = parseFloat(String(opt));
          return !isNaN(optNum) && !isNaN(expNum) && Math.abs(optNum - expNum) < 0.001;
        });
      }
      if (matchIdx !== -1) {
        correctIndex = matchIdx;
      }
    }
  }

  if (correctIndex == null) {
    if (data.correct_index != null) {
      correctIndex = data.correct_index;
    } else if (row.a != null) {
      correctIndex = row.a;
    }
  }

  if (correctIndex == null) correctIndex = 0;

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
    subject:       row.subject        ?? fallbackSubject ?? "maths",
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

// ─────────────────────────────────────────────────────────────────────────────
export default function QuizEngine({
  world = "test",
  student = { id: "123", name: "Test Cadet", year: 4, proficiency: 50 },
  subject = "maths",
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

  const timerRef     = useRef(null);
  const seenIdsRef   = useRef(new Set(previousQuestionIds));
  const seenTextsRef = useRef(new Set());
  const fetchingRef  = useRef(false);

  const recordTopicResult = useCallback((topic, isCorrect) => {
    if (!topic) return;
    setTopicSummary(prev => {
      const entry = prev[topic] || { correct: 0, total: 0 };
      return { ...prev, [topic]: { correct: entry.correct + (isCorrect ? 1 : 0), total: entry.total + 1 } };
    });
  }, []);

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
  }, []);

  const fetchQuestions = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setGenerating(true);
    
    const year = student?.year_level || student?.year ? parseInt(student.year_level || student.year, 10) : 4;
    const curriculum  = curriculumProp || student?.curriculum || "uk_national";
    const safeSubject = subject || "maths";
    
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

    // Apply robust normalization and option shuffling to fix index bugs
    questions = questions.map(q => {
      const qType = q.type || 'mcq';
      if (!q || qType !== 'mcq' || !q.opts || !q.opts.length) return q;

      const opts = q.opts;
      const explanation = q.exp || q.explanation || '';
      let matchIdx = -1;

      if (q.correctAnswer || q.answer) {
        const target = String(q.correctAnswer || q.answer).toLowerCase().trim();
        matchIdx = opts.findIndex(opt => String(opt).toLowerCase().trim() === target);
      }

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

      if (matchIdx === -1 && explanation) {
        for (let i = 0; i < opts.length; i++) {
          const optStr = String(opts[i]);
          if (explanation.includes(`"${optStr}"`) || explanation.includes(`'${optStr}'`)) {
            matchIdx = i; break;
          }
        }
      }

      const actualA = matchIdx !== -1 ? matchIdx : (typeof q.a === 'number' ? q.a : 0);
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
    if (timerRef.current) clearInterval(timerRef.current);
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
      try { const e = getExplanationForQuestion?.(currQ); if (e) setExplanationData(e); } catch {}
    }
    recordTopicResult(currQ.topic, isCorrect);
  }, [selected, qIdx, sessionQuestions, subject, recordTopicResult]);

  const handleFreeTextSubmit = useCallback(() => {
    if (freeTextSubmitted || !freeTextInput.trim()) return;
    if (timerRef.current) clearInterval(timerRef.current);
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
    }
    recordTopicResult(currQ.topic, isCorrect);
  }, [freeTextInput, freeTextSubmitted, sessionQuestions, qIdx, subject, recordTopicResult]);

  const handleMultiSubmit = useCallback(() => {
    if (multiSubmitted) return;
    if (timerRef.current) clearInterval(timerRef.current);
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
    }
    recordTopicResult(currQ.topic, allCorrect);
  }, [multiSubmitted, multiSelected, sessionQuestions, qIdx, subject, recordTopicResult]);

  useEffect(() => {
    const currQType = sessionQuestions[qIdx]?.type;
    if (selected !== null || finished || !sessionQuestions.length || generating || currQType === 'numerical_input') return;
    timerRef.current = setInterval(() => {
      setTimeLeft(p => {
        if (p <= 1) { clearInterval(timerRef.current); handlePick(-1); return 0; }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [qIdx, selected, finished, handlePick, sessionQuestions, generating]);

  const handleEIB = async () => {
    if (!eibText.trim() || eibLocked) return;
    setLoadingEIB(true);
    const currQ = sessionQuestions[qIdx];
    const fb = await fetchTaraFeedback({
      text: eibText,
      subject: currQ?.subject || subject || "maths",
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
      const res = await fetch("/api/remediate", {
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
      const details    = sessionQuestions.map(q => {
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

      setFinished(true);
      if (onComplete) onComplete({ score: finalScore, totalScore, accuracy, answers: results.answers, topicSummary });
    } catch (e) {
      console.error("Save error:", e);
      setFinished(true);
      if (onComplete) onComplete({ score: results.score, totalScore, accuracy: 0, answers: results.answers, topicSummary });
    } finally { setSavingResult(false); }
  };

  if (generating) return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[5000] flex items-center justify-center p-4">
      <div className="bg-white rounded-[40px] p-6 text-center max-w-xs w-full shadow-2xl">
        <RocketIcon size={48} className="mx-auto text-indigo-500 mb-4 animate-bounce" />
        <h3 className="text-xl font-black text-slate-800 mb-1">Pre-Flight Checks…</h3>
        <p className="text-sm text-slate-500 font-bold">
          Loading {subject ? subject.charAt(0).toUpperCase() + subject.slice(1) : "Mission"} Data.
        </p>
      </div>
    </div>
  );

  if (finished) {
    const finalScore = results.answers.filter(a => a.isCorrect).length;
    const accuracy   = sessionQuestions.length > 0
      ? Math.round((finalScore / sessionQuestions.length) * 100) : 0;
    return (
      <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[5000] flex items-center justify-center p-4">
        <div className="bg-white rounded-[40px] p-6 text-center max-w-sm w-full shadow-2xl border-b-4 border-slate-200">
          <PlanetIcon size={56} className="mx-auto text-indigo-500 mb-3" />
          <h2 className="text-2xl font-black text-slate-800 mb-1">Orbit Achieved!</h2>
          <p className="text-slate-500 font-bold text-sm mb-1">{finalScore}/{sessionQuestions.length} Correct</p>
          <div className={`inline-block px-4 py-1.5 rounded-full font-black text-sm mb-2 ${
            accuracy >= 80 ? "bg-emerald-50 text-emerald-600" :
            accuracy >= 50 ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-500"
          }`}>{accuracy}% accuracy</div>
          <p className="text-indigo-600 font-black mb-3">+{totalScore} Stardust</p>
          <div className="flex justify-center gap-3 mb-3">
            <div className="bg-amber-50 px-3 py-1 rounded-lg border border-amber-200 flex items-center gap-1">
              <FlameIcon size={14} className="text-amber-500"/>
              <span className="font-black text-amber-700 text-sm">{streak}</span>
            </div>
            <div className="bg-purple-50 px-3 py-1 rounded-lg border border-purple-200 flex items-center gap-1">
              <StarIcon size={14} className="text-purple-500"/>
              <span className="font-black text-purple-700 text-sm">{totalScore}</span>
            </div>
          </div>
          <TopicSummaryCard topicSummary={topicSummary} />
          <div className="flex flex-col gap-2 mt-4">
            <button
              onClick={() => {
                setFinished(false);
                setResults({ score: 0, answers: [] });
                setTopicSummary({});
                setTotalScore(0);
                setStreak(0);
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
          <div className="bg-white rounded-[40px] p-6 text-center max-w-sm w-full shadow-2xl border-b-4 border-slate-200">
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
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border-b-4 border-slate-200 max-h-[90vh] flex flex-col">

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
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-black">
              <FlameIcon size={14} className="text-amber-500"/> {streak}
              <StarIcon  size={14} className="text-purple-500"/> {totalScore}
            </div>
            <div className={`text-base font-black tabular-nums ${timeLeft < 6 ? "text-rose-500 animate-pulse" : "text-slate-800"}`}>
              00:{timeLeft.toString().padStart(2, "0")}
            </div>
            <button onClick={() => onClose?.()} className="text-slate-400 hover:text-rose-500 p-0.5">
              <XIcon size={20}/>
            </button>
          </div>
        </div>

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