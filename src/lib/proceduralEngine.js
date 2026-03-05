import { supabase } from './supabase';

// ─── UTILITIES (declared first — used by every function below) ────────────────
const shuffle = (array) => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};
const pick    = (arr)   => arr[Math.floor(Math.random() * arr.length)];
const rand    = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Shuffle MCQ options so the correct answer isn't always opts[0]
const shuffleTemplate = (t) => {
  const correct  = t.opts[t.a];
  const shuffled = shuffle([...t.opts]);
  return { ...t, opts: shuffled, a: shuffled.indexOf(correct) };
};

// ─── CROSS-SESSION DEDUPLICATION (single unified system) ─────────────────────
const SEEN_KEY = 'lp_seen_questions';
const MAX_SEEN = 300;

const getLocalSeen = () => {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'); } catch { return []; }
};

const addLocalSeen = (ids) => {
  try {
    let seen = [...new Set([...getLocalSeen(), ...ids])];
    if (seen.length > MAX_SEEN) seen = seen.slice(-MAX_SEEN);
    localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
  } catch {}
};

export function clearRecentQuestions() {
  try { localStorage.removeItem(SEEN_KEY); } catch {}
}

// ─── FETCH WITH DEDUP (difficulty-tier API, used by generateSessionQuestions) ─
async function fetchQuestionsWithDedup({ curriculum, subject, yearLevel, difficultyTier, limit = 10 }) {
  try {
    const recentIds  = getLocalSeen();
    const fetchLimit = limit + Math.min(recentIds.length, 50) + 20;

    let query = supabase
      .from('question_bank')
      .select('*')
      .eq('curriculum',     curriculum)
      .eq('subject',        subject)
      .eq('year_level',     yearLevel)
      .eq('difficulty_tier', difficultyTier)
      .limit(fetchLimit);

    if (recentIds.length > 0) {
      query = query.not('id', 'in', `(${recentIds.slice(-100).join(',')})`);
    }

    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) return [];

    const selected = shuffle(data).slice(0, limit);
    const ids      = selected.map(q => q.id).filter(Boolean);
    if (ids.length > 0) addLocalSeen(ids);

    return selected.map(q => {
      try {
        const parsed = typeof q.question_data === 'string'
          ? JSON.parse(q.question_data)
          : q.question_data;
        return {
          ...parsed,
          id:              q.id,
          db_id:           q.id,
          curriculum:      q.curriculum,
          subject:         q.subject,
          year_level:      q.year_level,
          difficulty_tier: q.difficulty_tier,
        };
      } catch (err) {
        console.error('Failed to parse question:', err, q);
        return null;
      }
    }).filter(Boolean);

  } catch (error) {
    console.error('Error fetching questions:', error);
    return [];
  }
}

// ─── GENERATE SESSION QUESTIONS (difficulty-tier based external API) ──────────
export async function generateSessionQuestions(scholar, subject, difficultyTier = 'foundation', count = 10) {
  try {
    const curriculum = scholar.curriculum || 'uk_11plus';
    const yearLevel  = scholar.year_level || scholar.year || 3;

    let questions = await fetchQuestionsWithDedup({ curriculum, subject, yearLevel, difficultyTier, limit: count });

    if (questions.length < count) {
      console.warn(`Only ${questions.length} questions found for ${subject} Y${yearLevel}, trying adjacent years...`);
      const adjacentYears = [yearLevel - 1, yearLevel + 1].filter(y => y >= 1 && y <= 12);
      for (const year of adjacentYears) {
        if (questions.length >= count) break;
        const fallback = await fetchQuestionsWithDedup({
          curriculum, subject, yearLevel: year, difficultyTier, limit: count - questions.length,
        });
        questions = [...questions, ...fallback];
      }
    }

    return questions.slice(0, count);
  } catch (error) {
    console.error('Error generating session questions:', error);
    return [];
  }
}

// ─── DB ROW → QUESTION OBJECT ─────────────────────────────────────────────────
const rowToQuestion = (row, subject) => {
  let parsedOpts;
  try { parsedOpts = JSON.parse(row.options); } catch { parsedOpts = ['A', 'B', 'C', 'D']; }
  return {
    id:      row.id,
    q:       row.question_text,
    opts:    parsedOpts.map(String),
    a:       parseInt(row.correct_index) || 0,
    exp:     row.explanation || 'Correct!',
    subject,
    passage: row.passage || null,
    topic:   row.topic,
    hints:   ['Read carefully.', 'Eliminate wrong answers.'],
  };
};

// ─── AI FALLBACK (Tier 3) ─────────────────────────────────────────────────────
const generateAIFallback = async (subject, year, needed) => {
  if (needed <= 0) return [];
  try {
    const res  = await fetch('/api/generate', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ subject, year, count: needed, proficiency: 50 }),
    });
    const data = await res.json();
    return (data.questions || []).map(q => ({ ...q, subject }));
  } catch { return []; }
};

// ─── 3-TIER SESSION GENERATOR ─────────────────────────────────────────────────
//  Tier 1 — Supabase DB   (AI-generated, LRU-ordered, deduped)
//  Tier 2 — Procedural    (instant, varied, year-appropriate)
//  Tier 3 — On-the-fly AI (last resort, fills remaining gaps)
export const generateSession = async ({
  year, region, subject, count, proficiency,
  previousQuestions, curriculum, supabase: supabaseClient,
}) => {
  const mix = subject === 'mock'
    ? [
        { s: 'maths',   n: Math.ceil(count  * 0.35) },
        { s: 'english', n: Math.ceil(count  * 0.35) },
        { s: 'verbal',  n: Math.floor(count * 0.15) },
        { s: 'nvr',     n: Math.floor(count * 0.15) },
      ]
    : [{ s: subject, n: count }];

  const allQuestions   = [];
  const seenFromCaller = (previousQuestions || []).map(q => q.id ?? q.db_id).filter(Boolean);
  const usedIds        = new Set([...seenFromCaller, ...getLocalSeen()]);

  for (const { s, n } of mix) {
    let subjectQuestions = [];

    // ── TIER 1: Supabase ──────────────────────────────────────────────────────
    try {
      if (supabaseClient) {
        const fetchLimit = Math.max(n * 4, 40);
        const { data, error } = await supabaseClient
          .from('question_bank')
          .select('id, question_text, options, correct_index, explanation, passage, topic, year_level')
          .eq('subject',    s)
          .eq('year_level', year)
          .eq('curriculum', curriculum)
          .order('last_used', { ascending: true, nullsFirst: true })
          .limit(fetchLimit);

        if (!error && data?.length > 0) {
          const candidates = shuffle(data.filter(row => !usedIds.has(row.id))).slice(0, n);
          for (const row of candidates) {
            subjectQuestions.push(rowToQuestion(row, s));
            usedIds.add(row.id);
          }
          const ids = subjectQuestions.map(q => q.id).filter(Boolean);
          if (ids.length > 0) {
            addLocalSeen(ids);
            supabaseClient
              .from('question_bank')
              .update({ last_used: new Date().toISOString() })
              .in('id', ids)
              .then(() => {});
          }
        }
      }
    } catch (err) {
      console.warn('[Tier1] Supabase fetch failed:', err.message);
    }

    // ── TIER 2: Procedural ────────────────────────────────────────────────────
    const afterTier1 = n - subjectQuestions.length;
    if (afterTier1 > 0) {
      for (let i = 0; i < afterTier1; i++) {
        if      (s === 'maths')   subjectQuestions.push(Math.random() > 0.7 ? generateRealWorldMaths(year) : generateLocalMaths(year));
        else if (s === 'english') subjectQuestions.push(generateLocalEnglish(year));
        else if (s === 'verbal')  subjectQuestions.push(generateLocalVerbal(year));
        else if (s === 'nvr')     subjectQuestions.push(generateLocalNVR(year));
        else if (s === 'science')   subjectQuestions.push(generateLocalMaths(year)); // Generic science fallback
        else if (s === 'physics')   subjectQuestions.push(generateLocalPhysics(year));
        else if (s === 'chemistry') subjectQuestions.push(generateLocalChemistry(year));
        else if (s === 'biology')   subjectQuestions.push(generateLocalBiology(year));
      }
    }

    // ── TIER 3: AI fallback ───────────────────────────────────────────────────
    const afterTier2 = n - subjectQuestions.length;
    if (afterTier2 > 0) {
      try {
        const aiQs = await generateAIFallback(s, year, afterTier2);
        subjectQuestions.push(...aiQs.slice(0, afterTier2));
      } catch {
        /* silently ignore */
      }
    }

    allQuestions.push(...subjectQuestions);
  }

  return shuffle(allQuestions).slice(0, count);
}

// ─── DYNAMIC TEMPLATE PARSER ──────────────────────────────────────────────────
const processTemplateString = (str, vars) => {
  if (!str) return str;
  return String(str).replace(/\{([^}]+)\}/g, (match, expr) => {
    let evaluated = expr.trim();
    for (const [key, value] of Object.entries(vars)) {
      const regex = new RegExp(`\\b${key}\\b`, 'g');
      evaluated = evaluated.replace(regex, value);
    }
    if (/[a-zA-Z]/.test(evaluated)) return evaluated;
    if (!/^[\d\s+\-*/().%]+$/.test(evaluated)) return evaluated;
    try {
      const result = new Function(`return ${evaluated};`)();
      return Number.isFinite(result) ? Math.round(result * 100) / 100 : result;
    } catch (e) {
      try {
        const parts = evaluated.match(/(\d+(?:\.\d+)?)\s*([\+\-\*\/])\s*(\d+(?:\.\d+)?)/);
        if (parts) {
          const n1 = parseFloat(parts[1]), op = parts[2], n2 = parseFloat(parts[3]);
          if (op === '+') return n1 + n2;
          if (op === '-') return n1 - n2;
          if (op === '*') return n1 * n2;
          if (op === '/') return Math.round((n1 / n2) * 100) / 100;
        }
      } catch {}
      return evaluated;
    }
  });
};

// ─── INTERACTIVE EXPLANATION TEMPLATES ───────────────────────────────────────
export const mathsTemplates = {
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
  },
  subtraction: {
    detect: (vars) => (vars.a % 10) >= (vars.b % 10),
    computeVars: (a, b) => {
      const units_a = a % 10, tens_a = Math.floor(a / 10);
      const units_b = b % 10, tens_b = Math.floor(b / 10);
      const units_diff = units_a - units_b;
      const tens_diff  = tens_a - tens_b;
      const answer     = a - b;
      return { a, b, units_a, tens_a, units_b, tens_b, units_diff, tens_diff, answer, operation: '-' };
    },
    steps: [
      "Subtract the units: {units_a} - {units_b} = {units_diff}",
      "Write {units_diff} in the units place.",
      "Subtract the tens: {tens_a} - {tens_b} = {tens_diff}",
      "The answer is {answer}."
    ],
    visual: "place-value-chart"
  }
};

export const getExplanationForQuestion = (question) => {
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

// ─── DATA LISTS ───────────────────────────────────────────────────────────────
const NOUNS   = ["lion","eagle","castle","knight","ocean","mountain","forest","dragon","wizard","river","pirate","astronaut","robot","dinosaur","unicorn","tiger","elephant","magician","queen","king","princess","spacecraft"];
const ADJS    = ["fierce","brave","ancient","mysterious","dark","gleaming","silent","golden","wild","wise","sparkling","enchanted","cosmic","mighty","clever","secret","hidden","magical","flying","whispering"];
const VERBS   = ["roared","soared","crumbled","fought","crashed","stood","whispered","charged","leapt","fell","flew","swam","climbed","discovered","built","created","solved","explored","rescued","guarded"];
const ADVERBS = ["loudly","gracefully","slowly","bravely","violently","firmly","quietly","quickly","cautiously","boldly","suddenly","carefully"];

// ─── MATHS GENERATOR ─────────────────────────────────────────────────────────
export const generateLocalMaths = (year, difficultyMultiplier = 1) => {

  // ── YEAR 1 & 2 ─────────────────────────────────────────────────────────────
  if (year <= 2) {
    const maxNum       = year === 1 ? 10 : 20;
    const questionType = Math.random();
    let q, ans, exp, visual, topic, a, b;

    if (questionType < 0.25) {
      a = rand(1, Math.floor(maxNum / 2)); b = rand(1, maxNum - a);
      ans = a + b; topic = 'addition';
      q   = pick([`What is ${a} + ${b}?`, `Add ${a} and ${b}.`, `${a} plus ${b} equals?`, `How many altogether: ${a} and ${b}?`]);
      exp = `${a} and ${b} make ${ans}.`;
      visual = { type: 'addition-dots', a, b, ans };
    } else if (questionType < 0.5) {
      a = rand(2, maxNum); b = rand(1, a - 1);
      ans = a - b; topic = 'subtraction';
      q   = pick([`What is ${a} - ${b}?`, `Take away ${b} from ${a}.`, `${a} minus ${b} equals?`, `You have ${a} and give away ${b}. How many left?`]);
      exp = `Start with ${a}, remove ${b}, you get ${ans}.`;
      visual = { type: 'subtraction-partwhole', a, b, ans };
    } else if (questionType < 0.7) {
      const total = rand(2, maxNum); a = rand(1, total - 1); b = total - a;
      ans = b; topic = 'missing_number';
      q   = pick([`${a} + ? = ${total}`, `What number makes this true? ${a} + __ = ${total}`, `Find the missing number: ${a} + ☐ = ${total}`]);
      exp = `The missing number is ${b} because ${a} + ${b} = ${total}.`;
    } else if (questionType < 0.85) {
      a = rand(1, maxNum); b = rand(1, maxNum); if (a === b) b = (b % maxNum) + 1;
      const isGreater = Math.random() > 0.5;
      ans = isGreater ? Math.max(a, b) : Math.min(a, b);
      topic = 'comparison';
      q   = isGreater ? `Which is greater, ${a} or ${b}?` : `Which is smaller, ${a} or ${b}?`;
      exp = `${ans} is the ${isGreater ? 'greater' : 'smaller'} number.`;
    } else {
      const items = ["apples","bananas","oranges","toys","stickers","pencils"];
      const item  = pick(items);
      a = rand(1, Math.floor(maxNum / 2)); b = rand(1, Math.floor(maxNum / 2));
      if (Math.random() > 0.5) {
        ans = a + b; topic = 'addition_word';
        q   = `You have ${a} ${item} and get ${b} more. How many now?`;
        exp = `${a} + ${b} = ${ans}.`;
      } else {
        ans = Math.max(0, a - b); topic = 'subtraction_word';
        q   = `You have ${a} ${item} and eat ${b}. How many left?`;
        exp = `${a} - ${b} = ${ans}.`;
      }
    }

    const w1 = ans + 1, w2 = Math.max(0, ans - 1), w3 = ans + 2;
    const options = shuffle([String(ans), String(w1), String(w2), String(w3)]);
    return { q, opts: options, a: options.indexOf(String(ans)), exp, subject: 'maths', visual, hints: ["Count carefully."], vars: { a: a || 0, b: b || 0 }, topic };
  }

  // ── YEAR 3 ──────────────────────────────────────────────────────────────────
  if (year === 3) {
    const r = Math.random();
    let q, ans, exp, topic, a, b, visual;

    if (r < 0.25) {
      const tables = [3, 4, 8]; a = pick(tables); b = rand(2, 12); ans = a * b; topic = 'multiplication';
      q   = pick([`What is ${a} × ${b}?`, `${a} times ${b} = ?`, `${b} groups of ${a} = ?`]);
      exp = `${a} × ${b} = ${ans}. Learn your ${a}× table!`;
    } else if (r < 0.5) {
      a = rand(100, 350); b = rand(50, 200); ans = a + b; topic = 'addition';
      q   = `Calculate: ${a} + ${b}`;
      exp = `Add hundreds first, then tens, then ones. ${a} + ${b} = ${ans}.`;
      visual = { type: 'bar-model', a, b, ans, operation: '+' };
    } else if (r < 0.7) {
      a = rand(200, 499); b = rand(50, a - 50); ans = a - b; topic = 'subtraction';
      q   = `Calculate: ${a} - ${b}`;
      exp = `Subtract hundreds, tens, then ones. ${a} - ${b} = ${ans}.`;
      visual = { type: 'bar-model', a, b, ans, operation: '-' };
    } else if (r < 0.85) {
      const dens  = [2, 4, 8, 10]; const den = pick(dens); const total = den * rand(2, 5);
      ans = total / den; topic = 'fractions';
      q   = `What is 1/${den} of ${total}?`;
      exp = `Divide ${total} by ${den} to find 1/${den} of it. ${total} ÷ ${den} = ${ans}.`;
      const opts = shuffle([String(ans), String(ans + 1), String(ans * 2), String(Math.max(1, ans - 1))]);
      return { q, opts, a: opts.indexOf(String(ans)), exp, subject: 'maths', topic, hints: ["Divide by the denominator."], vars: { a: total, b: den } };
    } else {
      const l = rand(3, 10), w = rand(2, 8); ans = 2 * (l + w); topic = 'perimeter';
      q   = `A rectangle is ${l}cm long and ${w}cm wide. What is its perimeter?`;
      exp = `Perimeter = 2 × (length + width) = 2 × (${l} + ${w}) = 2 × ${l + w} = ${ans}cm.`;
      const opts = shuffle([`${ans}cm`, `${ans + 2}cm`, `${l * w}cm`, `${ans - 4}cm`]);
      return { q, opts, a: opts.indexOf(`${ans}cm`), exp, subject: 'maths', topic, hints: ["Add all sides."], vars: { a: l, b: w } };
    }

    const w1 = ans + rand(2, 5), w2 = Math.max(1, ans - rand(1, 3)), w3 = ans + 10;
    const opts = shuffle([String(ans), String(w1), String(w2), String(w3)]);
    return { q, opts, a: opts.indexOf(String(ans)), exp, subject: 'maths', visual, hints: ["Think step by step."], vars: { a, b }, topic };
  }

  // ── YEAR 4 ──────────────────────────────────────────────────────────────────
  if (year === 4) {
    const r = Math.random();
    let q, ans, exp, topic, a, b;

    if (r < 0.25) {
      a = rand(2, 12); b = rand(2, 12); ans = a * b; topic = 'multiplication';
      q   = `${a} × ${b} = ?`;
      exp = `${a} × ${b} = ${ans}. You should know all times tables 1–12 by Year 4.`;
    } else if (r < 0.45) {
      const pairs = [[1,2,0.5],[1,4,0.25],[3,4,0.75],[1,5,0.2],[2,5,0.4],[1,10,0.1]];
      const [num, den, dec] = pick(pairs); ans = dec; topic = 'fractions';
      q   = `What decimal is equivalent to ${num}/${den}?`;
      exp = `${num}/${den} = ${dec}. Divide ${num} by ${den} to get the decimal.`;
      const fmt = (n) => parseFloat(n.toFixed(3));
      const opts = shuffle([String(dec), String(fmt(dec + 0.1)), String(fmt(dec + 0.25)), String(fmt(Math.max(0.05, dec - 0.1)))]);
      return { q, opts, a: opts.indexOf(String(dec)), exp, subject: 'maths', topic, hints: ["Divide numerator by denominator."], vars: { a: num, b: den } };
    } else if (r < 0.65) {
      const l = rand(3, 12), w = rand(2, 9); ans = l * w; topic = 'area';
      q   = `What is the area of a rectangle ${l}cm × ${w}cm?`;
      exp = `Area = length × width = ${l} × ${w} = ${ans}cm².`;
      const opts = shuffle([`${ans}cm²`, `${2 * (l + w)}cm²`, `${ans + l}cm²`, `${ans - w}cm²`]);
      return { q, opts, a: opts.indexOf(`${ans}cm²`), exp, subject: 'maths', topic, hints: ["Area = length × width."], vars: { a: l, b: w } };
    } else if (r < 0.8) {
      const neg = rand(-9, -1); ans = neg + 3; topic = 'negative_numbers';
      q   = `What number is 3 more than ${neg}?`;
      exp = `${neg} + 3 = ${ans}. Count 3 steps right on the number line.`;
      a = neg; b = 3;
    } else {
      const nums = [12, 16, 18, 20, 24, 30, 36]; const n = pick(nums);
      const factors = []; for (let i = 1; i <= n; i++) if (n % i === 0) factors.push(i);
      const f = pick(factors.filter(f => f > 1 && f < n)); ans = n / f; topic = 'factors';
      q   = `${f} × ? = ${n}`;
      exp = `${f} × ${ans} = ${n}. ${f} and ${ans} are a factor pair of ${n}.`;
      a = f; b = n;
    }

    const w1 = typeof ans === 'number' ? ans + rand(2, 5)          : ans;
    const w2 = typeof ans === 'number' ? Math.max(1, ans - rand(1, 3)) : ans;
    const w3 = typeof ans === 'number' ? ans + 10                  : ans;
    const opts = shuffle([String(ans), String(w1), String(w2), String(w3)]);
    return { q, opts, a: opts.indexOf(String(ans)), exp, subject: 'maths', hints: ["Think step by step."], vars: { a, b }, topic };
  }

  // ── YEAR 5 ──────────────────────────────────────────────────────────────────
  if (year === 5) {
    const r = Math.random();
    let q, ans, exp, topic, a, b;

    if (r < 0.2) {
      a = rand(12, 50); b = rand(12, 30); ans = a * b; topic = 'multiplication';
      q   = `Calculate: ${a} × ${b}`;
      exp = `Long multiplication: ${a} × ${b} = ${ans}. Partition: (${Math.floor(a / 10) * 10} × ${b}) + (${a % 10} × ${b}) = ${Math.floor(a / 10) * 10 * b} + ${(a % 10) * b} = ${ans}.`;
    } else if (r < 0.4) {
      const pcts = [10, 20, 25, 50, 75]; const p = pick(pcts);
      const base = rand(2, 8) * 100; ans = base * p / 100; topic = 'percentages';
      q   = `What is ${p}% of £${base}?`;
      exp = `${p}% of ${base}: ${p === 10 ? `Divide by 10: ${base}÷10=` : `Find 10% first (${base / 10}), then scale up to ${p}%: `}£${ans}.`;
      a = p; b = base;
    } else if (r < 0.55) {
      b = rand(3, 9); const quotient = rand(3, 15); a = b * quotient + rand(1, b - 1);
      const rem = a % b; ans = `${Math.floor(a / b)} r${rem}`; topic = 'division';
      q = `${a} ÷ ${b} = ? (give quotient and remainder)`;
      exp = `${a} ÷ ${b} = ${Math.floor(a / b)} remainder ${rem}. Check: ${b}×${Math.floor(a / b)}=${b * Math.floor(a / b)}, ${b * Math.floor(a / b)}+${rem}=${a}. ✓`;
      const opts = shuffle([ans, `${Math.floor(a / b) + 1} r${rem}`, `${Math.floor(a / b)} r${rem + 1}`, `${Math.floor(a / b) - 1} r${rem}`]);
      return { q, opts, a: opts.indexOf(ans), exp, subject: 'maths', topic, hints: ["Divide, then check the remainder."], vars: { a, b } };
    } else if (r < 0.7) {
      const primes     = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37];
      const composites = [4, 6, 8, 9, 10, 12, 14, 15, 16, 18, 20, 21, 22, 24, 25];
      const p2 = pick(primes); const c1 = pick(composites); const c2 = pick(composites.filter(x => x !== c1));
      topic = 'prime_numbers'; ans = p2; a = p2; b = c1;
      q = `Which of these is a PRIME number?`;
      const opts = shuffle([String(p2), String(c1), String(c2), String(pick(composites.filter(x => x !== c1 && x !== c2)))]);
      return { q, opts, a: opts.indexOf(String(p2)), exp: `A prime has exactly 2 factors: 1 and itself. ${p2} is prime.`, subject: 'maths', topic, hints: ["A prime has exactly 2 factors."], vars: { a, b } };
    } else if (r < 0.85) {
      const base = rand(4, 12), height = rand(3, 10); ans = (base * height) / 2; topic = 'area';
      q   = `A triangle has base ${base}cm and height ${height}cm. What is its area?`;
      exp = `Area of triangle = ½ × base × height = ½ × ${base} × ${height} = ${ans}cm².`;
      const opts = shuffle([`${ans}cm²`, `${base * height}cm²`, `${ans + base}cm²`, `${ans - height > 0 ? ans - height : ans + 3}cm²`]);
      return { q, opts, a: opts.indexOf(`${ans}cm²`), exp, subject: 'maths', topic, hints: ["Area of triangle = ½ × base × height."], vars: { a: base, b: height } };
    } else {
      const dens2 = [[2,4],[3,6],[4,8],[2,6]]; const [d1, d2] = pick(dens2);
      const n1 = rand(1, d1 - 1), n2 = rand(1, d2 - 1);
      const lcm      = d2;
      const equiv1   = n1 * (lcm / d1);
      const num_ans  = equiv1 + n2;
      const whole    = Math.floor(num_ans / lcm);
      const rem2     = num_ans % lcm;
      ans   = rem2 === 0 ? String(whole) : (whole === 0 ? `${num_ans}/${lcm}` : `${whole} ${rem2}/${lcm}`);
      topic = 'fractions'; a = n1; b = n2;
      q   = `${n1}/${d1} + ${n2}/${d2} = ?`;
      exp = `Convert to same denominator (${lcm}): ${n1}/${d1} = ${equiv1}/${lcm}. Then ${equiv1}/${lcm} + ${n2}/${lcm} = ${num_ans}/${lcm}${whole > 0 ? ` = ${ans}` : ""}`;
      const opts = shuffle([ans, `${n1 + n2}/${d1 + d2}`, `${num_ans + 1}/${lcm}`, `${Math.max(1, num_ans - 1)}/${lcm}`]);
      return { q, opts, a: opts.indexOf(ans), exp, subject: 'maths', topic, hints: ["Find a common denominator first."], vars: { a, b } };
    }

    const w1 = typeof ans === 'number' ? ans + rand(3, 8)          : ans;
    const w2 = typeof ans === 'number' ? Math.max(1, ans - rand(2, 5)) : ans;
    const w3 = typeof ans === 'number' ? ans + 15                  : ans;
    const opts = shuffle([String(ans), String(w1), String(w2), String(w3)]);
    return { q, opts, a: opts.indexOf(String(ans)), exp, subject: 'maths', hints: ["Think step by step."], vars: { a, b }, topic };
  }

  // ── YEAR 6 ──────────────────────────────────────────────────────────────────
  const r = Math.random();
  let q, ans, exp, topic, a, b;

  if (r < 0.2) {
    const coeff = rand(2, 6); const x = rand(2, 10); const extra = rand(3, 15); const total = coeff * x + extra;
    a = coeff; b = extra; ans = x; topic = 'algebra';
    q   = `Solve: ${coeff}x + ${extra} = ${total}`;
    exp = `Subtract ${extra}: ${coeff}x = ${total - extra}. Divide by ${coeff}: x = ${x}.`;
  } else if (r < 0.38) {
    const r1 = rand(2, 5), r2 = rand(2, 5), mult = rand(3, 8), total = (r1 + r2) * mult;
    const larger = Math.max(r1, r2) * mult; a = r1; b = r2; ans = larger; topic = 'ratio';
    q   = `£${total} shared in ratio ${r1}:${r2}. What is the larger share?`;
    exp = `Total parts: ${r1 + r2}. 1 part = £${total}÷${r1 + r2} = £${mult}. Larger: ${Math.max(r1, r2)}×£${mult} = £${larger}.`;
  } else if (r < 0.54) {
    const l = rand(3, 8), w = rand(2, 6), h = rand(2, 5), vol = l * w * h;
    a = l; b = w; ans = vol; topic = 'volume';
    q   = `Volume of cuboid ${l}cm × ${w}cm × ${h}cm = ?`;
    exp = `V = l × w × h = ${l} × ${w} × ${h} = ${vol}cm³.`;
    const opts = shuffle([`${vol}cm³`, `${l * w + h}cm³`, `${(l + w + h) * 2}cm³`, `${vol + 10}cm³`]);
    return { q, opts, a: opts.indexOf(`${vol}cm³`), exp, subject: 'maths', topic, hints: ["V = l × w × h."], vars: { a: l, b: w } };
  } else if (r < 0.68) {
    const nums = Array.from({ length: 4 }, () => rand(2, 15));
    const sum  = nums.reduce((a, b) => a + b, 0);
    ans = Math.round((sum / nums.length) * 10) / 10; topic = 'statistics'; a = nums[0]; b = nums[1];
    q   = `Find the mean of: ${nums.join(', ')}`;
    exp = `Add all: ${sum}. Divide by ${nums.length}: ${sum}÷${nums.length} = ${ans}.`;
  } else if (r < 0.82) {
    const pcts = [10, 15, 20, 25, 30, 40, 50, 75]; const p = pick(pcts);
    const base = rand(2, 8) * 100; ans = base * p / 100; topic = 'percentages'; a = p; b = base;
    q   = `What is ${p}% of ${base}?`;
    exp = `10% of ${base} = ${base / 10}. ${p}% = ${p / 10} × ${base / 10} = ${ans}.`;
  } else {
    const x2 = rand(2, 8), y2 = rand(2, 6), z2 = rand(1, 5);
    ans = x2 * y2 + z2; topic = 'bidmas'; a = x2; b = y2;
    q   = `Calculate using correct order of operations: ${x2} × ${y2} + ${z2}`;
    exp = `BIDMAS: multiplication first. ${x2} × ${y2} = ${x2 * y2}. Then + ${z2} = ${ans}.`;
  }

  const w1 = typeof ans === 'number' ? ans + rand(3, 8)          : ans;
  const w2 = typeof ans === 'number' ? Math.max(1, ans - rand(2, 5)) : ans;
  const w3 = typeof ans === 'number' ? ans + 15                  : ans;
  const opts = shuffle([String(ans), String(w1), String(w2), String(w3)]);
  return { q, opts, a: opts.indexOf(String(ans)), exp, subject: 'maths', hints: ["Think step by step."], vars: { a, b }, topic };
};

// ─── REAL WORLD MATHS ─────────────────────────────────────────────────────────
export const generateRealWorldMaths = (year, difficultyMultiplier = 1) => {
  const items = ["video game","bicycle","skateboard","book set","toy spaceship","art kit","soccer ball","puzzle","comic books"];
  const item          = pick(items);
  const cost          = rand(20, Math.floor(30 * difficultyMultiplier) + 20);
  const savingsPerWeek = rand(2, 6);
  const weeksNeeded   = Math.ceil(cost / savingsPerWeek);
  const exact         = (cost / savingsPerWeek).toFixed(2);
  const q   = `Real World Challenge: You want to buy a ${item} that costs £${cost}. If you save £${savingsPerWeek} per week, how many weeks will it take?`;
  const exp = `You need £${cost}. After ${weeksNeeded} weeks you'd have £${savingsPerWeek * weeksNeeded}. (${cost} ÷ ${savingsPerWeek} = ${exact}, round up.) Answer: ${weeksNeeded} weeks.`;
  const w1 = weeksNeeded + 1, w2 = Math.max(1, weeksNeeded - 1), w3 = weeksNeeded + 2;
  const opts = shuffle([String(weeksNeeded), String(w1), String(w2), String(w3)]);
  return { q, opts, a: opts.indexOf(String(weeksNeeded)), exp, hints: ["Use division.", "Round up if needed."], subject: 'maths', isRealWorld: true, vars: { a: cost, b: savingsPerWeek }, topic: 'division' };
};

// ─── ENGLISH READING PASSAGES (Year 5–6) ─────────────────────────────────────
const PASSAGES_Y56 = [
  {
    title: "The Deep Sea Expedition",
    text: "Dr Amara Chen gripped the edge of her seat as the submersible descended into the abyss. At 3,000 metres below the surface, the world outside the porthole was entirely black — a darkness so complete it felt almost solid. Then, without warning, a luminescent creature drifted past: a jellyfish trailing ribbons of cold blue light.\n\nAmara had devoted twenty years to studying deep-sea ecosystems, yet every dive still felt like entering another planet. The pressure here was immense — enough to crush an unprotected human like a tin can — but inside the titanium shell of the vessel, she was perfectly safe. She pressed her face to the porthole and whispered, 'Extraordinary.'",
    questions: [
      { q: "What does the word 'luminescent' suggest about the jellyfish?", opts: ["It produces its own light", "It is very large", "It is extremely fast", "It is transparent"], a: 0, exp: "Luminescent means producing light. The jellyfish trails 'cold blue light', confirming it generates its own glow." },
      { q: "Why does Amara compare the submersible to 'another planet'?", opts: ["The deep sea is alien, dark, and unlike the surface world", "She wants to become an astronaut", "The pressure is identical to outer space", "There are no creatures in space or the deep sea"], a: 0, exp: "The deep sea is described as completely dark, under enormous pressure, and full of strange creatures — alien conditions unlike everyday life on the surface." },
      { q: "What does 'the abyss' most likely mean in this context?", opts: ["A very deep, dark place", "A type of deep-sea creature", "The inside of the submersible", "A scientific instrument"], a: 0, exp: "Abyss means an immeasurably deep gulf. Here it refers to the deep ocean — reinforced by the description of darkness and depth." },
      { q: "What is the main purpose of the second paragraph?", opts: ["To show Amara's expertise and sense of wonder", "To describe the submersible's technical features", "To explain why deep-sea missions are dangerous", "To introduce a new character"], a: 0, exp: "The second paragraph focuses on Amara's 20 years of experience yet continued sense of wonder — it develops her character." },
    ]
  },
  {
    title: "The Last Library",
    text: "Nobody visited the library any more. In the time before the screens took over everything, people had queued outside on cold January mornings just to borrow a new novel. Now the shelves stood dusty and patient, waiting for readers who never came.\n\nMrs Okafor, the librarian, refused to give up. Every morning she arrived at half past eight, switched on the lights, and arranged the front display as carefully as if she were dressing a window at Harrods. She believed — she had to believe — that one day, somebody would walk through those doors and remember what it felt like to get lost inside a book.",
    questions: [
      { q: "What has caused people to stop visiting the library?", opts: ["Digital screens have replaced reading books", "The library has poor opening hours", "Mrs Okafor is unfriendly to visitors", "The books are too old and dusty"], a: 0, exp: "The passage states 'in the time before the screens took over everything' — screens are given as the reason people no longer visit." },
      { q: "What does the comparison to 'dressing a window at Harrods' tell us about Mrs Okafor?", opts: ["She takes enormous pride and care in her work", "She used to work in a department store", "She is wasteful with her time", "She wishes the library were more fashionable"], a: 0, exp: "Harrods is a luxury department store known for its elaborate window displays. Comparing her work to this shows she puts great care and artistry into even small tasks." },
      { q: "What does 'patient' suggest about the shelves in the first paragraph?", opts: ["The shelves are personified as waiting quietly for use", "The shelves are old and need replacing", "The shelves contain books about patience", "The shelves are very full of books"], a: 0, exp: "Giving shelves the human quality of 'patience' is personification. It creates a melancholy image of objects waiting to be needed." },
      { q: "Why does the author write 'she had to believe' in the final sentence?", opts: ["To suggest her belief is fragile and she needs it to survive", "To show she is not sure what she believes", "To indicate she is speaking out loud", "To create a list of her beliefs"], a: 0, exp: "The parenthetical 'she had to believe' hints at doubt — her faith is something she clings to out of necessity, making her more sympathetic and complex." },
    ]
  },
  {
    title: "The Iron Giant: An Excerpt",
    text: "The Iron Man came to the top of the cliff. How far had he walked? Nobody knows. Where had he come from? Nobody knows. How was he made? Nobody knows.\n\nTaller than a house, the Iron Man stood at the very brink of the cliff, his great iron head, shaped like a dustbin but as big as a bedroom, slowly turning to the left, slowly turning to the right. His iron ears heard everything: the crashing of the sea below, the distant sounds of the town, the whisper of the wind. And his iron eyes, shaped like headlamps, glowed white — then red — then infrared, searching the cliff-top darkness.",
    questions: [
      { q: "What effect does the repetition of 'Nobody knows' create?", opts: ["Mystery and uncertainty about the Iron Man's origins", "A sense that the character is very famous", "The writer is asking the reader questions", "Frustration that facts are unavailable"], a: 0, exp: "Repeating 'Nobody knows' three times creates a powerful sense of mystery — the Iron Man is unknowable, ancient, and otherworldly." },
      { q: "What type of figurative language is used in 'shaped like a dustbin but as big as a bedroom'?", opts: ["Simile", "Metaphor", "Personification", "Alliteration"], a: 0, exp: "A simile compares using 'like' or 'as'. Both comparisons here use 'as' — making this a double simile that creates a vivid, almost comical scale." },
      { q: "What does the description of the Iron Man's eyes suggest about his nature?", opts: ["He is searching, observant, and possibly threatening", "He is friendly and wants to find people", "He is malfunctioning and needs repair", "He is afraid of the dark cliff"], a: 0, exp: "Eyes that scan and glow in changing colours — white, red, infrared — suggest a mechanical, predatory intelligence that is actively hunting or surveying." },
      { q: "How does the author make the Iron Man seem enormous?", opts: ["By comparing parts of him to familiar large objects like houses and bedrooms", "By saying he walked a very long way", "By describing how loud his footsteps are", "By using very long sentences"], a: 0, exp: "Hughes compares the Iron Man's height to a house and his head to a dustbin 'as big as a bedroom' — household objects scaled up to emphasise his impossible size." },
    ]
  },
  {
    title: "Climate Change: The Facts",
    text: "Earth's climate has changed many times throughout history, but today's warming is happening far faster than any natural process can explain. Scientists have measured an average global temperature rise of about 1.1°C since pre-industrial times — and that number is accelerating.\n\nThe primary cause is the burning of fossil fuels: coal, oil, and natural gas. When these fuels are burned, they release carbon dioxide (CO₂) into the atmosphere. CO₂ acts like a blanket around the planet, trapping heat that would otherwise escape into space. The more CO₂ we produce, the thicker the blanket becomes, and the warmer our planet gets. The consequences — rising sea levels, more frequent extreme weather, and loss of biodiversity — are already being felt around the world.",
    questions: [
      { q: "What is the 'blanket' metaphor used to explain?", opts: ["How CO₂ traps heat in the atmosphere", "How the polar ice caps protect the planet", "Why temperatures drop at night", "How fossil fuels are stored underground"], a: 0, exp: "The passage explicitly explains: CO₂ 'acts like a blanket', trapping heat. It's a metaphor for the greenhouse effect — warming caused by trapped heat." },
      { q: "What is identified as the PRIMARY cause of current climate change?", opts: ["Burning fossil fuels", "Natural climate cycles", "Volcanic eruptions", "Solar activity changes"], a: 0, exp: "The passage states clearly: 'The primary cause is the burning of fossil fuels' — directly naming it before explaining the mechanism." },
      { q: "What does 'accelerating' mean in the context of temperature rise?", opts: ["The rate of warming is speeding up", "The temperature has reached its peak", "Scientists are measuring more accurately", "The rise is smaller than expected"], a: 0, exp: "Accelerating means increasing in speed. Here it tells us the warming is not just continuing but getting faster — a more alarming situation." },
      { q: "Which technique does the author use to make the information clear to the reader?", opts: ["A simple analogy (the blanket)", "A personal story about a scientist", "Rhetorical questions", "A timeline of historical events"], a: 0, exp: "The blanket analogy translates a complex scientific process (the greenhouse effect) into something immediately understandable — a key technique in explanatory writing." },
    ]
  },
  {
    title: "Anansi and the Sky God's Stories",
    text: "Long ago, all the stories in the world belonged to Nyame, the Sky God. Anansi the spider longed to buy them. He climbed the web to the sky and asked Nyame his price.\n\nNyame laughed. 'Many have tried,' he said. 'My price is high: bring me Onini the Python, Osebo the Leopard, and the Mmoboro Hornets.' Anansi bowed and returned to the earth. He did not look afraid. He looked thoughtful.\n\nFor Anansi was small, and weak, and had no weapons. But he had something more powerful than strength. He had a story in his head for each creature — and in the end, it was stories that set him free.",
    questions: [
      { q: "What character trait does Anansi show by not looking afraid?", opts: ["Courage and cunning", "Arrogance and foolishness", "Fear disguised as confidence", "Sadness at an impossible task"], a: 0, exp: "Anansi looks 'thoughtful' rather than afraid — showing he is already planning a clever solution. This reveals his key trait: resourceful intelligence over physical strength." },
      { q: "What is the main theme of this passage?", opts: ["Cleverness can overcome physical weakness", "Hard work always defeats laziness", "The Sky God is unfair and cruel", "Stories are more dangerous than weapons"], a: 0, exp: "The passage ends with 'it was stories that set him free' — intelligence and storytelling triumph over strength. This is the central message." },
      { q: "Why does the author list Anansi's weaknesses before his strength?", opts: ["To create contrast and make his victory feel more impressive", "To explain why Anansi will fail", "To introduce the three creatures he must catch", "To show that the task is truly impossible"], a: 0, exp: "Listing his weaknesses — 'small, weak, no weapons' — creates a dramatic contrast. When he succeeds anyway, the achievement feels greater. This is a classic narrative technique." },
      { q: "What does Nyame's laughter suggest about his attitude?", opts: ["He believes the task is impossible and Anansi will fail", "He finds Anansi amusing and likes him", "He is nervous that Anansi might succeed", "He is testing whether Anansi is worthy"], a: 0, exp: "Nyame laughs and says 'many have tried' — showing he considers the price impossible to pay. He dismisses Anansi's chances completely." },
    ]
  },
];

let _passageIndex = -1;
const getPassageQuestion = (year) => {
  const pool = year >= 5 ? PASSAGES_Y56 : PASSAGES_Y56.slice(0, 3);
  _passageIndex = (_passageIndex + 1) % pool.length;
  const passage = pool[_passageIndex];
  const qIdx    = Math.floor(Math.random() * passage.questions.length);
  const raw     = passage.questions[qIdx];
  return shuffleTemplate({
    q:       raw.q,
    opts:    raw.opts,
    a:       raw.a,
    exp:     raw.exp,
    subject: 'english',
    topic:   'reading_comprehension',
    passage: `**${passage.title}**\n\n${passage.text}`,
  });
};

// ─── ENGLISH GENERATOR ───────────────────────────────────────────────────────
export const generateLocalEnglish = (year) => {
  const r = Math.random();

  if (year <= 2) {
    const templates = [
      { q: "Which word rhymes with CAT?",              opts: ["BAT","DOG","PIG","SUN"],                  a: 0, exp: "CAT and BAT share the -AT sound at the end." },
      { q: "Which word rhymes with BIG?",              opts: ["PIG","CAT","SUN","HAT"],                  a: 0, exp: "BIG and PIG share the -IG sound." },
      { q: "Missing letter: D _ G (barks)",            opts: ["O","A","E","I"],                          a: 0, exp: "D-O-G spells DOG." },
      { q: "Which is spelled correctly?",              opts: ["Apple","Appul","Aple","Appple"],           a: 0, exp: "Apple: A-P-P-L-E." },
      { q: "Capital letters go at the...",             opts: ["Start of a sentence","Middle","End","Anywhere"], a: 0, exp: "Every sentence starts with a capital letter." },
      { q: "Which sentence has correct punctuation?",  opts: ["The cat sat.","the cat sat","The cat sat","the cat Sat."], a: 0, exp: "A sentence needs a capital letter at the start and a full stop at the end." },
    ];
    return shuffleTemplate({ ...pick(templates), subject: 'english', topic: 'phonics' });
  }

  if (year === 3) {
    if (r < 0.35) {
      const qs = [
        { q: "Identify the ADVERB: 'She ran quickly to the door.'",   opts: ["She","ran","quickly","door"],    a: 2, exp: "Adverbs describe verbs. 'quickly' tells us HOW she ran." },
        { q: "Identify the ADJECTIVE: 'The fierce dog barked.'",      opts: ["fierce","dog","barked","The"],    a: 0, exp: "Adjectives describe nouns. 'fierce' describes the dog." },
        { q: "Identify the VERB: 'The children laughed loudly.'",     opts: ["children","laughed","loudly","The"], a: 1, exp: "Verbs are doing/being words. 'laughed' is the action." },
        { q: "Which word is a NOUN?",                                  opts: ["castle","fierce","quickly","because"], a: 0, exp: "Nouns name people, places or things. 'castle' is a noun." },
      ];
      return shuffleTemplate({ ...pick(qs), subject: 'english', topic: 'grammar' });
    }
    if (r < 0.65) {
      const qs = [
        { q: "Which prefix means NOT? ('__ happy')",                   opts: ["un-","re-","mis-","pre-"],                             a: 0, exp: "The prefix 'un-' means not. Unhappy = not happy." },
        { q: "Which word uses the prefix 're-' (meaning again)?",     opts: ["replay","unhappy","misread","preview"],                 a: 0, exp: "Re- means again. Replay = play again." },
        { q: "Add the suffix '-ful' to 'wonder':",                    opts: ["wonderful","wonderless","wonderment","wonderly"],       a: 0, exp: "-ful means full of. Wonderful = full of wonder." },
        { q: "Which word uses the prefix 'mis-' (meaning wrongly)?",  opts: ["misread","unhappy","replay","preview"],                 a: 0, exp: "Mis- means wrongly. Misread = to read wrongly." },
      ];
      return shuffleTemplate({ ...pick(qs), subject: 'english', topic: 'word_structure' });
    }
    const qs = [
      { q: "Which conjunction explains a reason? 'I was late ___ I missed the bus.'", opts: ["because","but","and","or"], a: 0, exp: "'Because' is a causal conjunction — it explains why." },
      { q: "Which is a PREPOSITION? 'The cat sat ___ the mat.'",                      opts: ["on","cat","sat","the"],     a: 0, exp: "Prepositions show position. 'on' shows where the cat is." },
      { q: "Which word is an ADVERB? Choose the one that describes HOW:",             opts: ["carefully","careless","care","carer"], a: 0, exp: "Adverbs often end in -ly. 'carefully' describes how an action is done." },
    ];
    return shuffleTemplate({ ...pick(qs), subject: 'english', topic: 'conjunctions' });
  }

  if (year === 4) {
    if (r < 0.35) {
      const qs = [
        { q: "Which sentence has a FRONTED ADVERBIAL?",            opts: ["Carefully, she opened the box.","She opened the box carefully.","She was careful.","The box was opened."], a: 0, exp: "A fronted adverbial comes before the subject and needs a comma after it." },
        { q: "Which apostrophe shows POSSESSION (singular)?",      opts: ["the dog's bone","the dogs bone","the dog's' bone","the dogs' bone"], a: 0, exp: "Singular possession: noun + apostrophe + s. 'The dog's bone' = bone belonging to one dog." },
        { q: "Which sentence uses Standard English?",              opts: ["We were tired.","We was tired.","We is tired.","Us was tired."], a: 0, exp: "Standard English: 'we' takes 'were', not 'was'." },
      ];
      return shuffleTemplate({ ...pick(qs), subject: 'english', topic: 'grammar' });
    }
    if (r < 0.65) {
      const qs = [
        { q: "What is the ROOT WORD of 'unhelpful'?",                         opts: ["help","unhelpful","helpful","un"],    a: 0, exp: "Remove prefix 'un-' and suffix '-ful' to find the root: 'help'." },
        { q: "What does 'ancient' mean in 'The ancient castle crumbled'?",    opts: ["Very old","Very tall","Broken","Mysterious"], a: 0, exp: "Ancient means extremely old." },
        { q: "Which word means HAPPY? (synonym)",                             opts: ["joyful","sad","angry","tired"],       a: 0, exp: "Joyful is a synonym of happy — they mean the same thing." },
        { q: "Which word means the OPPOSITE of 'hot'? (antonym)",            opts: ["cold","warm","fire","boiling"],       a: 0, exp: "Cold is the antonym (opposite) of hot." },
      ];
      return shuffleTemplate({ ...pick(qs), subject: 'english', topic: 'vocabulary' });
    }
    const qs = [
      { q: "Which sentence uses correct punctuation for DIRECT SPEECH?",  opts: ['"Come here," she said.','Come here, she said.','\\"Come here\\" she said.','"Come here" she said'], a: 0, exp: "Direct speech: opening inverted commas, speech, comma before closing inverted commas, then the reporting clause." },
      { q: "Which is an EXPANDED NOUN PHRASE?",                           opts: ["the enormous, ancient dragon","dragon","the dragon flew","flew quickly"], a: 0, exp: "An expanded noun phrase has a noun with adjectives giving more detail." },
    ];
    return shuffleTemplate({ ...pick(qs), subject: 'english', topic: 'punctuation' });
  }

  if (year === 5) {
    if (r < 0.4) return getPassageQuestion(5);
    const r2 = Math.random();
    if (r2 < 0.3) {
      const qs = [
        { q: "Identify the RELATIVE CLAUSE: 'The boy who scored the goal cheered.'", opts: ["who scored the goal","The boy","cheered","the goal"], a: 0, exp: "A relative clause starts with who/which/that and gives more info about the noun." },
        { q: "Which uses PARENTHESIS correctly?",                                     opts: ["The dog (a spaniel) barked.","The dog, a spaniel barked.","The dog — a spaniel barked.","The (dog) a spaniel barked."], a: 0, exp: "Parenthesis adds extra info using brackets, dashes, or commas in matching pairs." },
        { q: "Which sentence uses PASSIVE voice?",                                   opts: ["The trophy was won by Emma.","Emma won the trophy.","Emma wins trophies.","The trophy belongs to Emma."], a: 0, exp: "Passive: subject receives the action. 'The trophy was won' — trophy is acted upon." },
        { q: "Which uses a MODAL VERB?",                                             opts: ["She could swim well.","She swam well.","She swims well.","She swimming well."], a: 0, exp: "Modal verbs (could/should/might/must/will) express possibility or obligation." },
      ];
      return shuffleTemplate({ ...pick(qs), subject: 'english', topic: 'grammar' });
    }
    if (r2 < 0.6) {
      const qs = [
        { q: "Which is a METAPHOR?",       opts: ["Life is a rollercoaster.","Life is like a rollercoaster.","Life goes up and down.","Life can be exciting."], a: 0, exp: "A metaphor says something IS something else. A simile uses 'like' or 'as'." },
        { q: "Which is PERSONIFICATION?",  opts: ["The wind whispered secrets.","The wind blew hard.","It was very windy.","A strong wind howled."], a: 0, exp: "Personification gives human qualities to non-human things. Wind cannot whisper — it's personified." },
        { q: "Which is ALLITERATION?",     opts: ["Peter picked peppers","She sells shoes","Round the rock","All of the above"], a: 3, exp: "Alliteration repeats the same initial consonant sound. All three examples use it." },
        { q: "Which is a SIMILE?",         opts: ["She ran like the wind.","She was the wind.","She ran quickly.","The wind ran."], a: 0, exp: "A simile compares using 'like' or 'as'. 'Like the wind' = simile." },
      ];
      return shuffleTemplate({ ...pick(qs), subject: 'english', topic: 'figurative_language' });
    }
    const qs = [
      { q: "Which is FORMAL language?",   opts: ["I would be grateful for your assistance.","Can you help me please?","Give us a hand, yeah?","Help needed!"], a: 0, exp: "Formal language avoids contractions and slang. It uses polite, complete sentences." },
      { q: "Which is INFORMAL language?", opts: ["Wanna come to mine?","Would you like to visit?","I would be delighted.","Please attend at your convenience."], a: 0, exp: "Informal language is casual, like speaking to a friend. 'Wanna' is informal." },
    ];
    return shuffleTemplate({ ...pick(qs), subject: 'english', topic: 'register' });
  }

  // Year 6
  if (r < 0.4) return getPassageQuestion(6);
  const r6 = Math.random();
  if (r6 < 0.3) {
    const qs = [
      { q: "Which correctly uses a COLON?",      opts: ["I need three things: bread, milk, and eggs.","I need: three things, bread, milk.","I need things: bread and milk and eggs.","I need bread: milk and eggs."], a: 0, exp: "A colon introduces a list or explanation after a complete clause." },
      { q: "Which correctly uses a SEMICOLON?",  opts: ["She was tired; she went to bed.","She was tired, she went to bed.","She was tired: she went to bed.","She was tired — she went."], a: 0, exp: "A semicolon joins two closely related independent clauses without a conjunction." },
      { q: "Which uses the SUBJUNCTIVE correctly?", opts: ["If I were taller, I'd play.","If I was taller, I'd play.","If I am taller, I'd play.","If I be taller, I'd play."], a: 0, exp: "Subjunctive uses 'were' (not 'was') for hypothetical situations." },
    ];
    return shuffleTemplate({ ...pick(qs), subject: 'english', topic: 'punctuation' });
  }
  if (r6 < 0.6) {
    const qs = [
      { q: "Which is a RHETORICAL QUESTION?", opts: ["Isn't it obvious we need change?","What time is it?","Where did you go?","Can you help me?"], a: 0, exp: "A rhetorical question is asked for effect, not to get an answer." },
      { q: "What does ELLIPSIS (...) suggest in narrative?", opts: ["Suspense or a trailing thought","A list","A definition","A quotation"], a: 0, exp: "Ellipsis creates suspense or shows a thought trailing off, building tension..." },
      { q: "Which is a RULE OF THREE?", opts: ["Veni, vidi, vici (I came, I saw, I conquered)","She went to the shop.","He was fast, slow.","It was a dark, cold night."], a: 0, exp: "Rule of three: grouping things in threes for rhetorical effect." },
    ];
    return shuffleTemplate({ ...pick(qs), subject: 'english', topic: 'writing_techniques' });
  }
  const qs = [
    { q: "What does 'benevolent' mean?",    opts: ["Kind and generous","Angry and fierce","Sad and quiet","Brave and bold"], a: 0, exp: "Benevolent: having goodwill toward others. From Latin bene (well) + volent (wishing)." },
    { q: "'Malicious' means:",              opts: ["Intending harm","Very tasty","Extremely brave","Feeling sad"], a: 0, exp: "Malicious: intending to harm. 'Mal-' = bad/evil (malnutrition, malfunction)." },
    { q: "What does 'ambiguous' mean?",     opts: ["Having more than one meaning","Clearly understood","Very exciting","Extremely old"], a: 0, exp: "Ambiguous = unclear, open to more than one interpretation." },
  ];
  return shuffleTemplate({ ...pick(qs), subject: 'english', topic: 'vocabulary' });
};

// ─── VERBAL REASONING GENERATOR ──────────────────────────────────────────────
export const generateLocalVerbal = (year) => {
  const r = Math.random();

  if (year <= 2) {
    const templates = [
      { q: "Which word is the odd one out?",             opts: ["Car","Bus","Train","Apple"],   a: 3, exp: "Car, Bus, Train are transport. Apple is a fruit." },
      { q: "Happy is to Sad as Hot is to...",            opts: ["Cold","Warm","Sun","Fire"],    a: 0, exp: "Happy/Sad are opposites. The opposite of Hot is Cold." },
      { q: "Which doesn't belong?",                      opts: ["Red","Blue","Green","Circle"], a: 3, exp: "Red, Blue, Green are colours. Circle is a shape." },
      { q: "What comes next? A, B, C, ?",                opts: ["D","E","F","G"],               a: 0, exp: "The alphabet in order: A, B, C, D." },
    ];
    return shuffleTemplate({ ...pick(templates), subject: 'verbal', topic: 'analogies' });
  }

  if (year === 3) {
    if (r < 0.4) {
      const start = rand(1, 20), step = pick([2, 3, 4, 5, 10]);
      const seq   = [start, start + step, start + step * 2, start + step * 3];
      const ans   = String(start + step * 4);
      const opts  = shuffle([ans, String(start + step * 4 + 1), String(start + step * 3), String(start + step * 5)]);
      return { q: `What comes next? ${seq.join(', ')}, ?`, opts, a: opts.indexOf(ans), exp: `The sequence adds ${step} each time. ${seq[3]} + ${step} = ${start + step * 4}.`, subject: 'verbal', topic: 'number_sequences' };
    }
    if (r < 0.7) {
      const letterCode = [['A',1],['E',5],['J',10],['M',13],['T',20],['Z',26]];
      const [letter, num] = pick(letterCode);
      const opts = shuffle([String(num), String(num + 1), String(num - 1), String(num + 2)]);
      return { q: `If A=1, B=2, C=3... what number is ${letter}?`, opts, a: opts.indexOf(String(num)), exp: `Count through the alphabet. ${letter} is letter number ${num}.`, subject: 'verbal', topic: 'letter_codes' };
    }
    const qs = [
      { q: "Which is the odd one out? Cat, Dog, Rose, Fish", opts: ["Rose","Cat","Dog","Fish"],             a: 0, exp: "Cat, Dog, Fish are animals. Rose is a plant." },
      { q: "Odd one out: Run, Jump, Red, Swim",              opts: ["Red","Run","Jump","Swim"],             a: 0, exp: "Run, Jump, Swim are actions (verbs). Red is a colour (adjective)." },
      { q: "Dog is to puppy as cat is to...?",               opts: ["kitten","cub","foal","calf"],          a: 0, exp: "A baby dog is a puppy. A baby cat is a kitten." },
    ];
    return shuffleTemplate({ ...pick(qs), subject: 'verbal', topic: 'analogies' });
  }

  if (year === 4) {
    if (r < 0.35) {
      const types = [
        () => { const s = rand(2, 15), st = pick([3, 4, 5, 6, 7]); const seq = [s, s + st, s + st * 2, s + st * 3]; const ans = String(s + st * 4); return { seq: `${seq.join(', ')}, ?`, ans, wrong: [String(s + st * 4 + 1), String(s + st * 3), String(s + st * 5)], exp: `+${st} each time.` }; },
        () => { const s = rand(1, 5); const seq = [s, s * 2, s * 4, s * 8]; const ans = String(s * 16); return { seq: `${seq.join(', ')}, ?`, ans, wrong: [String(s * 12), String(s * 16 + s), String(s * 10)], exp: `Doubles each time (×2).` }; },
      ];
      const { seq, ans, wrong, exp } = pick(types)();
      const opts = shuffle([ans, ...wrong]);
      return { q: `Find the next number: ${seq}`, opts, a: opts.indexOf(ans), exp, subject: 'verbal', topic: 'sequences' };
    }
    if (r < 0.65) {
      const qs = [
        { q: "Find the HIDDEN WORD: 'She was at her best.'", opts: ["wash","heat","best","shat"],   a: 0, exp: "'was' is hidden across words: 'She WAS at'." },
        { q: "Big is to small as fast is to...?",            opts: ["slow","quick","speed","run"],  a: 0, exp: "Big/small are opposites. The opposite of fast is slow." },
        { q: "Book is to read as song is to...?",            opts: ["sing","hear","write","play"],  a: 0, exp: "You read a book; you sing a song." },
        { q: "Find the next letter: A, C, E, G, ?",         opts: ["H","I","J","K"],               a: 1, exp: "Skip one letter each time: A(skip B)C(skip D)E(skip F)G→I." },
      ];
      return shuffleTemplate({ ...pick(qs), subject: 'verbal', topic: 'analogies' });
    }
    const qs = [
      { q: "Code: shift each letter forward by 1. Code for CAT?", opts: ["DBU","DBS","CBU","ECV"], a: 0, exp: "C+1=D, A+1=B, T+1=U. Code = DBU." },
      { q: "If 123 = CAT, what is 321?",                          opts: ["TAC","ACT","CTA","ATC"], a: 0, exp: "1=C, 2=A, 3=T. Reversing gives 321 = T, A, C = TAC." },
    ];
    return shuffleTemplate({ ...pick(qs), subject: 'verbal', topic: 'letter_codes' });
  }

  if (year === 5) {
    if (r < 0.3) {
      const anagrams = [
        { word: "LEMON", ans: "MELON" }, { word: "NIGHT", ans: "THING" }, { word: "OCEAN", ans: "CANOE" },
        { word: "STEAM", ans: "MATES" }, { word: "SPARE", ans: "PEARS" }, { word: "STARE", ans: "TEARS" },
      ];
      const { word, ans } = pick(anagrams);
      const opts = shuffle([ans, word, word.split('').reverse().join(''), ans.slice(1) + ans[0]]);
      return { q: `Rearrange ${word} to make a new word:`, opts, a: opts.indexOf(ans), exp: `${word} rearranged = ${ans}.`, subject: 'verbal', topic: 'anagrams' };
    }
    if (r < 0.6) {
      const qs = [
        { q: "Which word means the SAME as 'enormous'?",        opts: ["huge","tiny","quick","dark"],       a: 0, exp: "Enormous and huge both mean very large." },
        { q: "Which word means the SAME as 'ancient'?",         opts: ["old","new","fast","cold"],          a: 0, exp: "Ancient and old both refer to something from a long time ago." },
        { q: "Which word is the OPPOSITE of 'transparent'?",   opts: ["opaque","clear","shiny","bright"],  a: 0, exp: "Transparent lets light through; opaque does not." },
        { q: "Which is a synonym for 'furious'?",               opts: ["enraged","calm","happy","tired"],   a: 0, exp: "Furious and enraged both mean extremely angry." },
      ];
      return shuffleTemplate({ ...pick(qs), subject: 'verbal', topic: 'synonyms_antonyms' });
    }
    const qs = [
      { q: "Find the next: A, Z, B, Y, C, ?",              opts: ["X","D","W","B"], a: 0, exp: "Two interleaved sequences: A,B,C... and Z,Y,X... Next from Z,Y,X sequence is X." },
      { q: "Continue: 2, 5, 10, 17, 26, ?",               opts: ["37","35","36","38"], a: 0, exp: "Differences: +3,+5,+7,+9,+11... Next difference is +11. 26+11=37." },
    ];
    return shuffleTemplate({ ...pick(qs), subject: 'verbal', topic: 'sequences' });
  }

  // Year 6
  if (r < 0.3) {
    const qs = [
      { q: "If A=Z, B=Y, C=X... what does CAT become?",                opts: ["XZG","XAT","CAT","ZXG"],   a: 0, exp: "C→X, A→Z, T→G (each letter mirrors its position from the other end of the alphabet)." },
      { q: "Code: each letter +2. What is the code for DOG?",          opts: ["FQI","EPI","FOH","FQH"],   a: 0, exp: "D+2=F, O+2=Q, G+2=I. The code is FQI." },
      { q: "Code: A=2, B=4, C=6... (×2). What is the code for CAB?",  opts: ["6-2-4","3-1-2","C-A-B","6-1-2"], a: 0, exp: "C=6, A=2, B=4. Code = 6-2-4." },
      { q: "What is the next term? 1, 4, 9, 16, 25, ?",               opts: ["36","30","35","32"],        a: 0, exp: "These are square numbers: 1²=1, 2²=4, 3²=9, 4²=16, 5²=25, 6²=36." },
    ];
    return shuffleTemplate({ ...pick(qs), subject: 'verbal', topic: 'letter_codes' });
  }
  if (r < 0.55) {
    const qs = [
      { q: "All Bloops are Razzles. All Razzles are Lazzles. Are all Bloops Lazzles?",                opts: ["Yes","No","Sometimes","Cannot tell"], a: 0, exp: "By transitivity: Bloops→Razzles and Razzles→Lazzles, so Bloops→Lazzles. Yes." },
      { q: "Six-letter anagram of DANGER:",                                                           opts: ["GARDEN","GANDER","RANGED","All of the above"], a: 3, exp: "DANGER can be rearranged to GARDEN, GANDER, and RANGED — all are valid!" },
      { q: "All Flinks are Bips. Some Bips are Flops. Can we be CERTAIN all Flinks are Flops?",      opts: ["No, only some Bips are Flops","Yes","Sometimes","Need more information"], a: 0, exp: "Flinks are ALL Bips, but only SOME Bips are Flops. So some Flinks might not be Flops. We cannot be certain." },
      { q: "Find the word that means the same as both: 'a step' and 'to walk carefully'",            opts: ["tread","step","pace","march"], a: 0, exp: "'Tread' means both a step (the tread of a stair) and to walk carefully (tread softly). It's a homonym." },
    ];
    return shuffleTemplate({ ...pick(qs), subject: 'verbal', topic: 'logic' });
  }
  if (r < 0.75) {
    const pairs = [
      { q: "Find the next pair: AB, DE, GH, JK, ?",    opts: ["MN","LM","NO","OP"], a: 0, exp: "Each pair skips 1 letter: AB(skip C)DE(skip F)GH(skip I)JK(skip L)MN." },
      { q: "Continue: AZ, BY, CX, DW, ?",              opts: ["EV","FU","EW","DX"], a: 0, exp: "Two sequences: A,B,C,D,E... forward, and Z,Y,X,W,V... backward. Next: EV." },
      { q: "Find the next number: 3, 6, 11, 18, 27, ?", opts: ["38","36","40","35"], a: 0, exp: "Differences: +3, +5, +7, +9, +11 (odd numbers increasing). 27+11=38." },
      { q: "What completes the series: 2, 3, 5, 8, 13, 21, ?", opts: ["34","29","31","27"], a: 0, exp: "Fibonacci sequence: each number = sum of previous two. 13+21=34." },
    ];
    return shuffleTemplate({ ...pick(pairs), subject: 'verbal', topic: 'sequences' });
  }
  const qs = [
    { q: "Which pair are ANTONYMS (opposites)?",        opts: ["ascend/descend","fast/rapid","happy/joyful","big/large"], a: 0, exp: "Antonyms are opposites. Ascend (go up) and descend (go down) are antonyms." },
    { q: "Which pair are SYNONYMS (same meaning)?",     opts: ["brave/courageous","hot/cold","fast/slow","old/young"],   a: 0, exp: "Synonyms mean the same. Brave and courageous both mean showing courage." },
    { q: "'Melancholy' is a SYNONYM of:",               opts: ["sadness","anger","happiness","bravery"],                 a: 0, exp: "Melancholy means a feeling of pensive sadness — a synonym of sadness or sorrow." },
    { q: "'Benevolent' is an ANTONYM of:",              opts: ["malicious","kind","generous","helpful"],                 a: 0, exp: "Benevolent means kind and generous. Its antonym is malicious — intending harm." },
    { q: "Which word has the closest meaning to 'dilapidated'?", opts: ["crumbling","ancient","enormous","dangerous"],  a: 0, exp: "Dilapidated means in a state of disrepair or ruin — crumbling is the closest synonym." },
  ];
  return shuffleTemplate({ ...pick(qs), subject: 'verbal', topic: 'synonyms_antonyms' });
};

// ─── NVR GENERATOR ───────────────────────────────────────────────────────────
export const generateLocalNVR = (year) => {
  const r = Math.random();

  if (year <= 2) {
    const templates = [
      { q: "What comes next? 🔵 🔴 🔵 🔴 ?",             opts: ["🔵","🔴","🟢","🟡"], a: 0, exp: "The pattern alternates blue and red. Next is blue." },
      { q: "What comes next? 🟦 🟦 🟧 🟦 🟦 ?",          opts: ["🟧","🟦","🟩","🟪"], a: 0, exp: "Two blues then one orange. Next is orange." },
      { q: "How many sides does a triangle have?",         opts: ["3","4","5","6"],      a: 0, exp: "A triangle has 3 sides and 3 corners." },
      { q: "Which shape has 4 equal sides?",               opts: ["Square","Rectangle","Triangle","Circle"], a: 0, exp: "A square has 4 equal sides and 4 right angles." },
      { q: "Which of these is the odd one out?",           opts: ["🔺","🟥","🔴","🐶"], a: 3, exp: "The dog is an animal; the others are shapes or colours." },
    ];
    return shuffleTemplate({ ...pick(templates), subject: 'nvr', topic: 'patterns' });
  }

  if (year === 3) {
    const qs = [
      { q: "How many lines of symmetry does a rectangle have?",   opts: ["2","1","4","0"],                             a: 0, exp: "A rectangle has 2 lines of symmetry — one horizontal, one vertical." },
      { q: "Which shape has the most lines of symmetry?",          opts: ["Circle","Square","Rectangle","Triangle"],    a: 0, exp: "A circle has infinite lines of symmetry." },
      { q: "A regular hexagon has how many lines of symmetry?",   opts: ["6","3","4","2"],                             a: 0, exp: "A regular hexagon has 6 lines of symmetry." },
      { q: "Which arrow shows → rotated 90° clockwise?",          opts: ["↓","↑","←","→"],                            a: 0, exp: "Rotating a right-pointing arrow 90° clockwise gives a downward arrow." },
    ];
    return shuffleTemplate({ ...pick(qs), subject: 'nvr', topic: 'symmetry' });
  }

  if (year === 4) {
    const qs = [
      { q: "A cube has how many FACES?",                          opts: ["6","4","8","12"],  a: 0, exp: "A cube has 6 square faces." },
      { q: "A cube has how many VERTICES (corners)?",             opts: ["8","6","4","12"],  a: 0, exp: "A cube has 8 vertices — one at each corner." },
      { q: "A cube has how many EDGES?",                          opts: ["12","6","8","10"], a: 0, exp: "A cube has 12 edges — 4 on top, 4 on bottom, 4 connecting them." },
      { q: "What is the reflection of 'd' in a vertical mirror?", opts: ["b","p","q","d"],   a: 0, exp: "Reflecting 'd' in a vertical line gives 'b' — it flips left-right." },
      { q: "Which net folds to make a cube?",                     opts: ["A cross of 6 squares","4 squares in a row","A 2×2 grid","A 3×2 grid"], a: 0, exp: "A cross shape with 6 squares is the classic net of a cube." },
    ];
    return shuffleTemplate({ ...pick(qs), subject: 'nvr', topic: '3d_shapes' });
  }

  if (year === 5) {
    const qs = [
      { q: "A shape is rotated 180°. Which property is preserved?",                         opts: ["Size and shape","Position","Colour only","None"], a: 0, exp: "Rotation preserves size and shape (congruence). Only orientation changes." },
      { q: "A figure is reflected across a horizontal axis. The top becomes the...",        opts: ["Bottom","Left","Right","Same"],                   a: 0, exp: "Horizontal reflection swaps top and bottom." },
      { q: "Which has rotational symmetry of order 4?",                                     opts: ["Square","Rectangle","Equilateral triangle","Regular pentagon"], a: 0, exp: "A square looks identical after 90°, 180°, 270°, and 360° rotations — order 4." },
      { q: "Which 2D shape has exactly 3 lines of symmetry?",                              opts: ["Equilateral triangle","Square","Rectangle","Rhombus"], a: 0, exp: "An equilateral triangle has exactly 3 lines of symmetry." },
    ];
    return shuffleTemplate({ ...pick(qs), subject: 'nvr', topic: 'transformations' });
  }

  // Year 6
  const r6nvr = Math.random();
  if (r6nvr < 0.35) {
    const qs = [
      { q: "In a series, each shape gains one side: triangle→square→pentagon→?",   opts: ["Hexagon","Heptagon","Circle","Octagon"],                              a: 0, exp: "3→4→5 sides. Next is 6 sides = Hexagon." },
      { q: "Which shape has rotational symmetry of order 6?",                       opts: ["Regular hexagon","Square","Regular pentagon","Equilateral triangle"], a: 0, exp: "A regular hexagon looks the same after every 60° rotation — order 6." },
      { q: "Which has rotational symmetry of order 8?",                             opts: ["Regular octagon","Square","Equilateral triangle","Regular pentagon"],  a: 0, exp: "A regular octagon has 8 equal sides — it looks the same every 45° rotation, giving order 8." },
      { q: "A regular pentagon has rotational symmetry of order:",                  opts: ["5","4","3","6"],                                                       a: 0, exp: "A regular pentagon has 5 equal sides — it maps to itself 5 times per full rotation." },
    ];
    return shuffleTemplate({ ...pick(qs), subject: 'nvr', topic: 'rotational_symmetry' });
  }
  if (r6nvr < 0.65) {
    const qs = [
      { q: "Which of these is a property of ALL parallelograms?",                         opts: ["Opposite sides are parallel","All angles are 90°","All sides are equal","Diagonals are equal"], a: 0, exp: "All parallelograms (including squares, rectangles, rhombuses) have opposite sides parallel." },
      { q: "In a shape analogy A:B :: C:D, what rule applies?",                           opts: ["The same transformation applied to A gives B, applied to C gives D","A and D are the same","B and C are reflections","C is larger than A"], a: 0, exp: "Shape analogies: find what changed from A to B, then apply the same change from C to get D." },
      { q: "Which shape is a special case of BOTH a rectangle AND a rhombus?",            opts: ["Square","Parallelogram","Trapezium","Kite"],                                                                                                   a: 0, exp: "A square has all the properties of a rectangle (all angles 90°) AND a rhombus (all sides equal)." },
      { q: "A trapezium has exactly one pair of:",                                        opts: ["Parallel sides","Equal sides","Right angles","Lines of symmetry"],                                                                            a: 0, exp: "A trapezium has exactly one pair of parallel sides — this is its defining property." },
    ];
    return shuffleTemplate({ ...pick(qs), subject: 'nvr', topic: 'shape_properties' });
  }
  const qs = [
    { q: "If you rotate a shape 270° clockwise, it is the same as rotating it how far anticlockwise?", opts: ["90°","270°","180°","45°"],          a: 0, exp: "270° clockwise = 360° - 270° = 90° anticlockwise. They reach the same position." },
    { q: "A shape is translated 3 right, 2 down. To return to the start, translate it:",               opts: ["3 left, 2 up","3 right, 2 up","3 left, 2 down","2 left, 3 up"], a: 0, exp: "Translation is reversed by going the opposite direction in both axes: 3 left, 2 up." },
    { q: "Which transformation changes a shape's position but NOT its size, shape, or orientation?",   opts: ["Translation","Rotation","Reflection","Enlargement"], a: 0, exp: "Translation slides a shape without turning or flipping it — position changes, nothing else." },
    { q: "After reflecting a shape in a vertical mirror line, which property CHANGES?",                opts: ["Orientation (it is mirrored)","Size","Shape","Number of sides"], a: 0, exp: "Reflection reverses orientation — like a mirror image. Size, shape, and number of sides are preserved." },
  ];
  return shuffleTemplate({ ...pick(qs), subject: 'nvr', topic: 'transformations' });
};

// ─── AI QUESTION GENERATION ───────────────────────────────────────────────────
export const generateAIQuestions = async ({ year, region, subject, count, proficiency, previousQuestions }) => {
  try {
    const response = await fetch("/api/generate", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ year, region, subject, count, proficiency, previousQuestions }),
    });
    const data = await response.json();
    return data.questions.map(q => ({ ...q, subject }));
  } catch (e) {
    console.error("AI Generation failed");
    return [];
  }
};
// ─── PHYSICS GENERATOR ─────────────────────────────────────────────────────
export const generateLocalPhysics = (year) => {
  const physicsTopics = {
    // SS 1 (Basic Physics)
    1: [
      {
        q: 'What is the SI unit of force?',
        opts: ['Newton (N)', 'Joule (J)', 'Watt (W)', 'Pascal (Pa)'],
        a: 0,
        exp: 'The Newton (N) is the SI unit of force, named after Isaac Newton.',
      },
      {
        q: 'What force pulls objects towards Earth?',
        opts: ['Gravity', 'Magnetism', 'Friction', 'Tension'],
        a: 0,
        exp: 'Gravity is the force that attracts objects with mass towards each other.',
      },
      {
        q: 'Which of these is a form of energy?',
        opts: ['Heat', 'Iron', 'Oxygen', 'Glass'],
        a: 0,
        exp: 'Heat is a form of energy that can be transferred between objects.',
      },
      {
        q: 'What happens to the volume of a gas when pressure increases (temperature constant)?',
        opts: ['Decreases', 'Increases', 'Stays the same', 'Becomes liquid'],
        a: 0,
        exp: 'According to Boyle\'s Law, when pressure increases, volume decreases if temperature is constant.',
      },
    ],
    // SS 2 (Intermediate Physics)
    2: [
      {
        q: 'What is the formula for calculating speed?',
        opts: ['Distance ÷ Time', 'Force × Distance', 'Mass × Velocity', 'Time × Distance'],
        a: 0,
        exp: 'Speed is calculated by dividing distance traveled by time taken.',
      },
      {
        q: 'What type of energy does a moving object have?',
        opts: ['Kinetic', 'Potential', 'Chemical', 'Nuclear'],
        a: 0,
        exp: 'Kinetic energy is the energy of motion.',
      },
      {
        q: 'Which material is the best conductor of electricity?',
        opts: ['Copper', 'Plastic', 'Wood', 'Rubber'],
        a: 0,
        exp: 'Copper is an excellent conductor of electricity due to its free electrons.',
      },
      {
        q: 'What is the unit of electrical resistance?',
        opts: ['Ohm (Ω)', 'Ampere (A)', 'Volt (V)', 'Coulomb (C)'],
        a: 0,
        exp: 'The Ohm (Ω) is the SI unit of electrical resistance.',
      },
    ],
    // SS 3 (Advanced Physics)
    3: [
      {
        q: 'What is Newton\'s Second Law of Motion?',
        opts: ['F = ma', 'E = mc²', 'V = IR', 'PV = nRT'],
        a: 0,
        exp: 'Newton\'s Second Law states that Force equals mass times acceleration (F = ma).',
      },
      {
        q: 'What is the speed of light in a vacuum?',
        opts: ['3 × 10⁸ m/s', '3 × 10⁶ m/s', '3 × 10⁴ m/s', '3 × 10² m/s'],
        a: 0,
        exp: 'Light travels at approximately 300,000 kilometers per second (3 × 10⁸ m/s) in a vacuum.',
      },
      {
        q: 'Which law states that energy cannot be created or destroyed?',
        opts: ['Law of Conservation of Energy', 'Newton\'s First Law', 'Ohm\'s Law', 'Law of Inertia'],
        a: 0,
        exp: 'The Law of Conservation of Energy states that energy can only be transformed from one form to another.',
      },
      {
        q: 'What is the relationship between frequency and wavelength?',
        opts: ['Inversely proportional', 'Directly proportional', 'Independent', 'Exponentially related'],
        a: 0,
        exp: 'Frequency and wavelength are inversely proportional: as one increases, the other decreases.',
      },
    ],
  };

  const topicsForYear = physicsTopics[year] || physicsTopics[1];
  const template = pick(topicsForYear);
  
  return {
    ...shuffleTemplate(template),
    subject: 'physics',
    topic: 'general_physics',
    id: `phys_${Math.random().toString(36).substr(2, 9)}`,
  };
};

// ─── CHEMISTRY GENERATOR ───────────────────────────────────────────────────
export const generateLocalChemistry = (year) => {
  const chemistryTopics = {
    // SS 1 (Basic Chemistry)
    1: [
      {
        q: 'What is the chemical symbol for water?',
        opts: ['H₂O', 'CO₂', 'O₂', 'N₂'],
        a: 0,
        exp: 'Water is composed of two hydrogen atoms and one oxygen atom (H₂O).',
      },
      {
        q: 'What is the pH of pure water?',
        opts: ['7', '0', '14', '3'],
        a: 0,
        exp: 'Pure water has a neutral pH of 7.',
      },
      {
        q: 'Which element has the chemical symbol "O"?',
        opts: ['Oxygen', 'Gold', 'Silver', 'Iron'],
        a: 0,
        exp: 'O is the chemical symbol for Oxygen.',
      },
      {
        q: 'What do we call a substance made of only one type of atom?',
        opts: ['Element', 'Compound', 'Mixture', 'Solution'],
        a: 0,
        exp: 'An element is a pure substance made of only one type of atom.',
      },
    ],
    // SS 2 (Intermediate Chemistry)
    2: [
      {
        q: 'What is the most common gas in Earth\'s atmosphere?',
        opts: ['Nitrogen', 'Oxygen', 'Carbon dioxide', 'Argon'],
        a: 0,
        exp: 'Nitrogen makes up about 78% of Earth\'s atmosphere.',
      },
      {
        q: 'What type of bond forms when atoms share electrons?',
        opts: ['Covalent bond', 'Ionic bond', 'Metallic bond', 'Hydrogen bond'],
        a: 0,
        exp: 'A covalent bond forms when atoms share pairs of electrons.',
      },
      {
        q: 'What is the chemical formula for table salt?',
        opts: ['NaCl', 'KCl', 'CaCl₂', 'MgCl₂'],
        a: 0,
        exp: 'Table salt is sodium chloride (NaCl).',
      },
      {
        q: 'Which acid is found in the stomach?',
        opts: ['Hydrochloric acid', 'Sulfuric acid', 'Nitric acid', 'Acetic acid'],
        a: 0,
        exp: 'The stomach produces hydrochloric acid (HCl) to help digest food.',
      },
    ],
    // SS 3 (Advanced Chemistry)
    3: [
      {
        q: 'What is Avogadro\'s number?',
        opts: ['6.022 × 10²³', '3.14 × 10⁸', '9.81 × 10²', '1.60 × 10⁻¹⁹'],
        a: 0,
        exp: 'Avogadro\'s number (6.022 × 10²³) is the number of particles in one mole of a substance.',
      },
      {
        q: 'What is the process of a solid changing directly to a gas called?',
        opts: ['Sublimation', 'Evaporation', 'Condensation', 'Melting'],
        a: 0,
        exp: 'Sublimation is when a substance changes from solid to gas without becoming liquid first.',
      },
      {
        q: 'What is the most reactive group in the periodic table?',
        opts: ['Alkali metals', 'Noble gases', 'Transition metals', 'Halogens'],
        a: 0,
        exp: 'Alkali metals (Group 1) are the most reactive metals in the periodic table.',
      },
      {
        q: 'What is the pH range of an acid?',
        opts: ['0-6.9', '7', '7.1-14', '8-14'],
        a: 0,
        exp: 'Acids have a pH less than 7 (0-6.9 range).',
      },
    ],
  };

  const topicsForYear = chemistryTopics[year] || chemistryTopics[1];
  const template = pick(topicsForYear);
  
  return {
    ...shuffleTemplate(template),
    subject: 'chemistry',
    topic: 'general_chemistry',
    id: `chem_${Math.random().toString(36).substr(2, 9)}`,
  };
};

// ─── BIOLOGY GENERATOR ─────────────────────────────────────────────────────
export const generateLocalBiology = (year) => {
  const biologyTopics = {
    // SS 1 (Basic Biology)
    1: [
      {
        q: 'What is the powerhouse of the cell?',
        opts: ['Mitochondria', 'Nucleus', 'Ribosome', 'Vacuole'],
        a: 0,
        exp: 'Mitochondria produce energy (ATP) for the cell through cellular respiration.',
      },
      {
        q: 'What process do plants use to make food?',
        opts: ['Photosynthesis', 'Respiration', 'Transpiration', 'Digestion'],
        a: 0,
        exp: 'Photosynthesis is how plants use sunlight to convert carbon dioxide and water into glucose.',
      },
      {
        q: 'What is the basic unit of life?',
        opts: ['Cell', 'Tissue', 'Organ', 'Organism'],
        a: 0,
        exp: 'The cell is the smallest unit that can carry out all the processes of life.',
      },
      {
        q: 'Which pigment gives plants their green color?',
        opts: ['Chlorophyll', 'Carotene', 'Xanthophyll', 'Anthocyanin'],
        a: 0,
        exp: 'Chlorophyll is the green pigment that captures light energy for photosynthesis.',
      },
    ],
    // SS 2 (Intermediate Biology)
    2: [
      {
        q: 'How many chambers does the human heart have?',
        opts: ['Four', 'Two', 'Three', 'Five'],
        a: 0,
        exp: 'The human heart has four chambers: two atria and two ventricles.',
      },
      {
        q: 'What is the largest organ in the human body?',
        opts: ['Skin', 'Liver', 'Heart', 'Brain'],
        a: 0,
        exp: 'The skin is the largest organ, covering the entire body.',
      },
      {
        q: 'What type of blood vessel carries blood away from the heart?',
        opts: ['Artery', 'Vein', 'Capillary', 'Lymph vessel'],
        a: 0,
        exp: 'Arteries carry oxygenated blood away from the heart to the body.',
      },
      {
        q: 'What is the process of cell division called?',
        opts: ['Mitosis', 'Photosynthesis', 'Respiration', 'Osmosis'],
        a: 0,
        exp: 'Mitosis is the process where one cell divides into two identical daughter cells.',
      },
    ],
    // SS 3 (Advanced Biology)
    3: [
      {
        q: 'What molecule carries genetic information?',
        opts: ['DNA', 'RNA', 'Protein', 'Lipid'],
        a: 0,
        exp: 'DNA (deoxyribonucleic acid) stores and transmits genetic information.',
      },
      {
        q: 'What is the process of water movement through a plant called?',
        opts: ['Transpiration', 'Photosynthesis', 'Respiration', 'Germination'],
        a: 0,
        exp: 'Transpiration is the loss of water vapor from plant leaves to the atmosphere.',
      },
      {
        q: 'Which system controls body functions through hormones?',
        opts: ['Endocrine system', 'Nervous system', 'Digestive system', 'Respiratory system'],
        a: 0,
        exp: 'The endocrine system produces hormones that regulate body processes.',
      },
      {
        q: 'What is the term for an organism that makes its own food?',
        opts: ['Autotroph', 'Heterotroph', 'Decomposer', 'Omnivore'],
        a: 0,
        exp: 'Autotrophs (like plants) produce their own food through photosynthesis.',
      },
    ],
  };

  const topicsForYear = biologyTopics[year] || biologyTopics[1];
  const template = pick(topicsForYear);
  
  return {
    ...shuffleTemplate(template),
    subject: 'biology',
    topic: 'general_biology',
    id: `bio_${Math.random().toString(36).substr(2, 9)}`,
  };
};
// ─── FETCH CLAUDE RESPONSE ────────────────────────────────────────────────────
export const fetchClaudeResponse = async (prompt, system) => {
  try {
    const response = await fetch("/api/chat", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        model:     "claude-sonnet-4-20250514",
        max_tokens: 300,
        system,
        messages:  [{ role: "user", content: prompt }],
      }),
    });
    const data = await response.json();
    return data?.content?.[0]?.text ?? "Tara says: That's a great effort! Explaining your thinking is the secret to becoming a master scholar. ✨ Keep going!";
  } catch (err) {
    return "Tara says: That's a great effort! Explaining your thinking is the secret to becoming a master scholar. ✨ Keep going!";
  }
};