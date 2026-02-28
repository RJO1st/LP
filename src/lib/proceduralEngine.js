import { supabase } from './supabase';

const shuffle = (array) => [...array].sort(() => Math.random() - 0.5);

// --- DYNAMIC TEMPLATE PARSER ---
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
    } catch (e) {
        try {
           const parts = evaluated.match(/(\d+(?:\.\d+)?)\s*([\+\-\*\/])\s*(\d+(?:\.\d+)?)/);
           if (parts) {
               const n1 = parseFloat(parts[1]);
               const op = parts[2];
               const n2 = parseFloat(parts[3]);
               if (op === '+') return n1 + n2;
               if (op === '-') return n1 - n2;
               if (op === '*') return n1 * n2;
               if (op === '/') return Math.round((n1 / n2) * 100) / 100;
           }
        } catch (fallbackErr) {}
        return evaluated;
    }
  });
};

// --- INTERACTIVE EXPLANATION TEMPLATES ---
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
      const units_sum = units_a + units_b;
      const carry = Math.floor(units_sum / 10);
      const units_digit = units_sum % 10;
      const tens_sum = tens_a + tens_b + carry;
      const answer = a + b;
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
      const tens_diff = tens_a - tens_b;
      const answer = a - b;
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
  
  // Base topic resolution (e.g. if topic is 'addition', check for 'addition_with_carry' via detect)
  const baseTopic = topic.split('_')[0]; 
  const availableTemplates = Object.keys(mathsTemplates)
       .filter(k => k.startsWith(baseTopic))
       .map(k => mathsTemplates[k]);
       
  const selected = availableTemplates.find(t => t.detect?.(vars)) || mathsTemplates[topic];
  if (!selected) return null;
  
  const computed = selected.computeVars(vars.a, vars.b);
  const steps = selected.steps.map(step => processTemplateString(step, computed));
  return { steps, visual: selected.visual, computed };
};

// --- DATA LISTS ---
const NOUNS = ["lion", "eagle", "castle", "knight", "ocean", "mountain", "forest"];
const ADJS = ["fierce", "brave", "ancient", "mysterious", "dark", "gleaming", "silent"];
const VERBS = ["roared", "soared", "crumbled", "fought", "crashed", "stood", "whispered"];
const ADVERBS = ["loudly", "gracefully", "slowly", "bravely", "violently", "firmly"];

// --- UPGRADED LOCAL GENERATORS ---
export const generateLocalMaths = (year, difficultyMultiplier = 1) => {
  const op = Math.random();
  let q, ans, exp, visual, hints, topic;
  const maxNum = Math.floor(year * 25 * difficultyMultiplier); 
  let a, b;

  if (op < 0.25) {
    a = Math.floor(Math.random() * maxNum) + (year * 5);
    b = Math.floor(Math.random() * maxNum) + 1;
    ans = a + b;
    topic = 'addition';
    q = `Calculate: ${a} + ${b}`;
    exp = `Add the units, then the tens. ${a} + ${b} = ${ans}.`;
    hints = [`Try adding ${b} to ${a}.`, `Add the tens first, then the units.`, `The answer is ${ans}.`];
    if (year <= 2 && ans <= 20) visual = `${Array(a).fill("🟦").join("")} + ${Array(b).fill("🟧").join("")}`;
  } else if (op < 0.5) {
    a = Math.floor(Math.random() * maxNum) + 30;
    b = Math.floor(Math.random() * a) + 1;
    ans = a - b;
    topic = 'subtraction';
    q = `Calculate: ${a} - ${b}`;
    exp = `Subtract ${b} from ${a} to get ${ans}.`;
    hints = [`You are taking ${b} away from ${a}.`, `Count backwards.`, `The answer is ${ans}.`];
  } else if (op < 0.75) {
    a = Math.floor(Math.random() * (year + 8 * difficultyMultiplier)) + 2;
    b = Math.floor(Math.random() * 12) + 2;
    ans = a * b;
    topic = 'multiplication';
    q = `What is ${a} × ${b}?`;
    exp = `${a} groups of ${b} equals ${ans}.`;
    hints = [`Think of ${a} groups of ${b}.`, `The answer is ${ans}.`];
  } else {
    b = Math.floor(Math.random() * (year + 6 * difficultyMultiplier)) + 2;
    const ansTemp = Math.floor(Math.random() * 12) + 2;
    a = b * ansTemp;
    ans = ansTemp;
    topic = 'division';
    q = `Divide ${a} by ${b}`;
    exp = `Since ${b} × ${ans} = ${a}, ${a} ÷ ${b} = ${ans}.`;
    hints = [`How many times does ${b} fit into ${a}?`, `The answer is ${ans}.`];
  }

  const wrong1 = ans + Math.floor(Math.random() * 5) + 1;
  const wrong2 = ans - (Math.floor(Math.random() * 3) + 1);
  const wrong3 = ans + 10;
  const opts = shuffle([String(ans), String(wrong1), String(wrong2), String(wrong3)]);
  
  return { q, opts, a: opts.indexOf(String(ans)), exp, subject: 'maths', visual, hints, vars: { a, b }, topic };
};

export const generateRealWorldMaths = (year, difficultyMultiplier = 1) => {
  const items = ["video game", "bicycle", "skateboard", "book set"];
  const item = items[Math.floor(Math.random() * items.length)];
  const cost = Math.floor(Math.random() * 30 * difficultyMultiplier) + 20;
  const savingsPerWeek = Math.floor(Math.random() * 5) + 2;
  const weeksNeeded = Math.ceil(cost / savingsPerWeek);
  
  const q = `Real World Challenge: You want to buy a ${item} that costs £${cost}. If you save £${savingsPerWeek} per week, how many weeks will it take to save enough money?`;
  const exp = `Divide the total cost (£${cost}) by your weekly savings (£${savingsPerWeek}). ${cost} ÷ ${savingsPerWeek} = ${weeksNeeded}.`;
  
  const opts = shuffle([String(weeksNeeded), String(weeksNeeded + 1), String(weeksNeeded - 1), String(weeksNeeded + 2)]);
  // Real world uses division conceptually, but visualizer isn't needed here.
  return { q, opts, a: opts.indexOf(String(weeksNeeded)), exp, hints: ["Use division."], subject: 'maths', isRealWorld: true, vars: { a: cost, b: savingsPerWeek }, topic: 'division' };
};

export const generateLocalEnglish = (year) => { return { q: "English Sample", opts: ["A","B","C","D"], a: 0, exp: "Exp", subject: 'english' }; };
export const generateLocalVerbal = (year) => { return { q: "Verbal Sample", opts: ["A","B","C","D"], a: 0, exp: "Exp", subject: 'verbal' }; };
export const generateLocalNVR = (year) => { return { q: "NVR Sample", opts: ["A","B","C","D"], a: 0, exp: "Exp", subject: 'nvr' }; };

export const generateAIQuestions = async ({ year, region, subject, count, proficiency, previousQuestions }) => {
  try {
    const response = await fetch("/api/generate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year, region, subject, count, proficiency, previousQuestions })
    });
    const data = await response.json();
    return data.questions.map(q => ({...q, subject}));
  } catch (e) {
    console.error("AI Generation failed"); return []; 
  }
};

// --- SESSION GENERATOR ---
export const generateSessionQuestions = async (year, region, count, proficiency, subject, mistakes = [], previousQs = []) => {
  const mix = subject === "mock" 
    ? [ { s: "maths", n: Math.ceil(count * 0.35) }, { s: "english", n: Math.ceil(count * 0.35) }, { s: "verbal", n: Math.floor(count * 0.15) }, { s: "nvr", n: Math.floor(count * 0.15) } ]
    : [ { s: subject, n: count } ];

  const allQuestions = [];
  
  for (const { s, n } of mix) {
    let dbQuestions = [];

    // TIER 1: Fetch from Supabase
    try {
      if (supabase) {
        const { data, error } = await supabase.from('question_bank').select('*').ilike('subject', `%${s}%`).lte('year_level', year);

        if (data && !error) {
          const availableDbQs = data.filter(row => !previousQs.includes(row.question_text));
          const processedDbQs = availableDbQs.map(row => {
            let parsedOpts;
            try { parsedOpts = JSON.parse(row.options); } catch(e) { parsedOpts = ["A", "B", "C", "D"]; }
            
            const vars = {
              a: Math.floor(Math.random() * (year * 10)) + 5,
              b: Math.floor(Math.random() * (year * 10)) + 2,
              noun: NOUNS[Math.floor(Math.random() * NOUNS.length)],
              adj: ADJS[Math.floor(Math.random() * ADJS.length)],
              verb: VERBS[Math.floor(Math.random() * VERBS.length)],
              adv: ADVERBS[Math.floor(Math.random() * ADVERBS.length)]
            };
            
            let processedQ = processTemplateString(row.question_text, vars);
            return {
              q: processedQ,
              opts: parsedOpts.map(opt => String(processTemplateString(opt, vars))),
              a: parseInt(row.correct_index) || 0,
              exp: processTemplateString(row.explanation, vars) || "Correct answer.",
              subject: s,
              passage: row.passage ? processTemplateString(row.passage, vars) : null,
              hints: ["Read the question carefully.", "Eliminate impossible answers."],
              vars,             // <-- Inject variables for visualizer
              topic: row.topic  // <-- Inject topic for visualizer
            };
          });
          dbQuestions = shuffle(processedDbQs).slice(0, n);
          allQuestions.push(...dbQuestions);
        }
      }
    } catch (err) { console.warn("Vault fetch failed, relying on procedural engine:", err); }

    // TIER 2 & 3: Fill any remaining questions with AI & Procedural
    const remainingNeeded = n - dbQuestions.length;
    if (remainingNeeded > 0) {
      const aiCount = Math.floor(remainingNeeded * 0.20); 
      const localCount = remainingNeeded - aiCount;
      
      if (aiCount > 0) {
        const aiQs = await generateAIQuestions({ year, region, subject: s, count: aiCount, proficiency, previousQuestions: [...previousQs, ...allQuestions.map(q=>q.q)] });
        allQuestions.push(...aiQs);
      }
      
      const neededLocals = localCount + (aiCount > 0 ? aiCount - allQuestions.filter(q => q.subject === s).length + dbQuestions.length : 0);
      for (let i = 0; i < neededLocals; i++) {
        if (s === "maths") {
          if (Math.random() > 0.8) allQuestions.push(generateRealWorldMaths(year));
          else allQuestions.push(generateLocalMaths(year));
        }
        else if (s === "english") allQuestions.push(generateLocalEnglish(year));
        else if (s === "verbal") allQuestions.push(generateLocalVerbal(year));
        else if (s === "nvr") allQuestions.push(generateLocalNVR(year));
      }
    }
  }

  return shuffle(allQuestions).slice(0, count);
};

export const fetchClaudeResponse = async (prompt, system) => {
  try {
    const response = await fetch("/api/chat", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 300, system, messages: [{ role: "user", content: prompt }] })
    });
    const data = await response.json();
    return data.content[0].text;
  } catch (err) {
    return "Tara says: That's a great effort! Explaining your thinking is the secret to becoming a master scholar. ✨ Keep going!";
  }
};
