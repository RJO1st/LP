import { supabase } from './supabase';

const shuffle = (array) => [...array].sort(() => Math.random() - 0.5);

export const generateLocalMaths = (year) => {
  const op = Math.random();
  let q, ans, exp;
  const maxNum = year * 25; 
  
  if (op < 0.25) {
    const a = Math.floor(Math.random() * maxNum) + (year * 5);
    const b = Math.floor(Math.random() * maxNum) + 1;
    ans = a + b;
    q = `Calculate: ${a} + ${b}`;
    exp = `Add the units, then the tens. ${a} + ${b} = ${ans}.`;
  } else if (op < 0.5) {
    const a = Math.floor(Math.random() * maxNum) + 30;
    const b = Math.floor(Math.random() * a) + 1;
    ans = a - b;
    q = `Calculate: ${a} - ${b}`;
    exp = `Subtract ${b} from ${a} to get ${ans}.`;
  } else if (op < 0.75) {
    const a = Math.floor(Math.random() * (year + 8)) + 2;
    const b = Math.floor(Math.random() * 12) + 2;
    ans = a * b;
    q = `What is ${a} × ${b}?`;
    exp = `${a} groups of ${b} equals ${ans}.`;
  } else {
    const b = Math.floor(Math.random() * (year + 6)) + 2;
    const ansTemp = Math.floor(Math.random() * 12) + 2;
    const a = b * ansTemp;
    ans = ansTemp;
    q = `Divide ${a} by ${b}`;
    exp = `Since ${b} × ${ans} = ${a}, ${a} ÷ ${b} = ${ans}.`;
  }

  const wrong1 = ans + Math.floor(Math.random() * 5) + 1;
  const wrong2 = ans - (Math.floor(Math.random() * 3) + 1);
  const wrong3 = ans + 10;
  
  const opts = shuffle([String(ans), String(wrong1), String(wrong2), String(wrong3)]);
  return { q, opts, a: opts.indexOf(String(ans)), exp, subject: 'maths' };
};

const NOUNS = ["lion", "eagle", "castle", "knight", "ocean", "mountain", "forest", "wizard", "dragon", "ship", "village", "shadow", "river", "king", "queen"];
const ADJS = ["fierce", "brave", "ancient", "mysterious", "dark", "gleaming", "silent", "massive", "hidden", "swift", "clever", "wild", "frozen", "burning"];
const VERBS = ["roared", "soared", "crumbled", "fought", "crashed", "stood", "whispered", "vanished", "glowed", "ran", "jumped", "flew", "swam", "crawled"];
const ADVERBS = ["loudly", "gracefully", "slowly", "bravely", "violently", "firmly", "quietly", "suddenly", "brightly", "quickly", "softly", "harshly"];

export const generateLocalEnglish = (year) => {
  const type = Math.random();
  let q, ans, exp, wrong;

  const n = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const adj = ADJS[Math.floor(Math.random() * ADJS.length)];
  const v = VERBS[Math.floor(Math.random() * VERBS.length)];
  const adv = ADVERBS[Math.floor(Math.random() * ADVERBS.length)];
  
  const sentence = `The ${adj} ${n} ${v} ${adv}.`;

  if (type < 0.25) {
    q = `Identify the ADJECTIVE in this sentence: "${sentence}"`;
    ans = adj;
    wrong = [n, v, adv];
    exp = `An adjective describes a noun. "${adj}" describes the ${n}.`;
  } else if (type < 0.5) {
    q = `Identify the NOUN in this sentence: "${sentence}"`;
    ans = n;
    wrong = [adj, v, adv];
    exp = `A noun is a person, place, or thing. "${n}" is the thing here.`;
  } else if (type < 0.75) {
    q = `Identify the VERB in this sentence: "${sentence}"`;
    ans = v;
    wrong = [adj, n, adv];
    exp = `A verb is a doing or action word. "${v}" is the action.`;
  } else {
    q = `Identify the ADVERB in this sentence: "${sentence}"`;
    ans = adv;
    wrong = [adj, n, v];
    exp = `An adverb describes how a verb is done. It tells us how the ${n} ${v}.`;
  }

  const opts = shuffle([ans, ...wrong]);
  return { q, opts, a: opts.indexOf(ans), exp, subject: 'english' };
};

export const generateLocalVerbal = (year) => {
  const type = Math.random();
  let q, ans, exp, wrong;

  if (type < 0.33) {
    const start = Math.floor(Math.random() * 50) + 1;
    const step = Math.floor(Math.random() * 12) + 2;
    const seq = [start, start+step, start+(step*2), start+(step*3)];
    ans = start + (step*4);
    q = `Find the next number in the sequence: ${seq.join(", ")}, ?`;
    wrong = [ans + 1, ans - 1, ans + step];
    exp = `The rule is to add ${step} each time. ${seq[3]} + ${step} = ${ans}.`;
  } else if (type < 0.66) {
    const word = Array.from({length: 4}, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join('');
    let shift = Math.floor(Math.random() * 10) + 1;
    if (Math.random() > 0.5) shift *= -1; 
    
    const shiftChar = (char, s) => String.fromCharCode(((char.charCodeAt(0) - 65 + s + 26) % 26) + 65);
    const code = word.split('').map(c => shiftChar(c, shift)).join('');
    
    ans = code;
    const shiftDir = shift > 0 ? "forward" : "backward";
    q = `If the secret code shifts every letter ${shiftDir} by ${Math.abs(shift)} in the alphabet, what is the code for ${word}?`;
    
    wrong = [
      word.split('').map(c => shiftChar(c, shift + 1)).join(''),
      word.split('').map(c => shiftChar(c, -shift)).join(''),
      word.split('').map(c => shiftChar(c, shift - 1)).join('')
    ];
    exp = `Shift each letter ${shiftDir} by ${Math.abs(shift)}. ${word[0]} becomes ${code[0]}, and so on.`;
  } else {
    const startCode = Math.floor(Math.random() * 20) + 65;
    const step = Math.floor(Math.random() * 3) + 1;
    const seq = [
      String.fromCharCode(startCode) + String.fromCharCode(startCode + 1),
      String.fromCharCode(startCode + step) + String.fromCharCode(startCode + step + 1),
      String.fromCharCode(startCode + step*2) + String.fromCharCode(startCode + step*2 + 1)
    ];
    ans = String.fromCharCode(startCode + step*3) + String.fromCharCode(startCode + step*3 + 1);
    q = `What comes next: ${seq.join(", ")}, ?`;
    wrong = [
      String.fromCharCode(startCode + step*3 + 1) + String.fromCharCode(startCode + step*3 + 2),
      String.fromCharCode(startCode + step*4) + String.fromCharCode(startCode + step*4 + 1),
      String.fromCharCode(startCode + step*3 - 1) + String.fromCharCode(startCode + step*3)
    ];
    exp = `Both letters skip forward by ${step} each time in the alphabet.`;
  }

  const opts = shuffle([String(ans), ...wrong.map(String)]);
  return { q, opts, a: opts.indexOf(String(ans)), exp, subject: 'verbal' };
};

export const generateLocalNVR = (year) => {
  const shapes = ["🔴", "🟦", "🔺", "⭐", "🔶", "🟩", "🟪", "🔷"];
  
  const s1 = shapes[Math.floor(Math.random() * shapes.length)];
  let s2 = shapes[Math.floor(Math.random() * shapes.length)];
  while(s2 === s1) s2 = shapes[Math.floor(Math.random() * shapes.length)];
  
  const q = `Which shape does not belong in this sequence? ${s1} ${s1} ${s2} ${s1} ${s1}`;
  const ans = s2;
  const wrong = shapes.filter(s => s !== s2 && s !== s1).slice(0, 3);
  const exp = `All shapes are ${s1} except for the odd one out, ${s2}.`;

  const opts = shuffle([ans, ...wrong]);
  return { q, opts, a: opts.indexOf(ans), exp, subject: 'nvr' };
};

export const generateAIQuestions = async ({ year, region, subject, count, proficiency, previousQuestions }) => {
  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year, region, subject, count, proficiency, previousQuestions })
    });
    if (!response.ok) throw new Error("Generation failed");
    const data = await response.json();
    return data.questions.map(q => ({...q, subject}));
  } catch (e) {
    console.error("AI Generation failed, falling back to local procedural bank.");
    return []; 
  }
};

// --- THE NEW DATABASE-FIRST GENERATOR ---
export const generateSessionQuestions = async (year, region, count, proficiency, subject, mistakes = [], previousQs = []) => {
  const mix = subject === "mock" 
    ? [ { s: "maths", n: Math.ceil(count * 0.35) }, { s: "english", n: Math.ceil(count * 0.35) }, { s: "verbal", n: Math.floor(count * 0.15) }, { s: "nvr", n: Math.floor(count * 0.15) } ]
    : [ { s: subject, n: count } ];

  const allQuestions = [];
  
  for (const { s, n } of mix) {
    let dbQuestions = [];

    // TIER 1: Fetch from your Supabase CSV upload first!
    try {
      const { data, error } = await supabase
        .from('question_bank')
        .select('*')
        .ilike('subject', `%${s}%`) // Case-insensitive match just in case
        .lte('year_level', year);   // Ensure it's age appropriate

      if (data && !error) {
        // Filter out questions the student has already seen in this session
        const availableDbQs = data.filter(row => !previousQs.includes(row.question_text));

        // Format the database row into our App's format
        dbQuestions = availableDbQs.map(row => {
          let parsedOpts = row.options;
          // Ensure options are an array (Supabase JSONB usually handles this, but we parse just in case)
          if (typeof parsedOpts === 'string') {
             try { parsedOpts = JSON.parse(parsedOpts); } catch(e) { parsedOpts = ["A", "B", "C", "D"]; }
          }

          return {
            q: row.question_text,
            opts: parsedOpts || ["A", "B", "C", "D"],
            a: parseInt(row.correct_index) || 0,
            exp: row.explanation || "Correct answer based on the curriculum.",
            subject: s,
            passage: row.passage || null
          };
        });

        // Shuffle the database questions so they don't get the same ones in order, and slice out exactly what we need
        dbQuestions = shuffle(dbQuestions).slice(0, n);
        allQuestions.push(...dbQuestions);
      }
    } catch (err) {
      console.warn("Vault fetch failed, relying on procedural engine:", err);
    }

    // TIER 2 & 3: If the database didn't have enough questions, fill the rest with Local/AI procedural logic
    const remainingNeeded = n - dbQuestions.length;
    
    if (remainingNeeded > 0) {
      const aiCount = Math.floor(remainingNeeded * 0.20); 
      const localCount = remainingNeeded - aiCount;
      
      // Fallback to AI for 20% of remaining
      if (aiCount > 0) {
        const aiQs = await generateAIQuestions({ year, region, subject: s, count: aiCount, proficiency, previousQuestions: [...previousQs, ...allQuestions.map(q=>q.q)] });
        allQuestions.push(...aiQs);
      }
      
      // Fallback to Local Engine for the rest
      const neededLocals = localCount + (aiCount > 0 ? aiCount - allQuestions.filter(q => q.subject === s).length + dbQuestions.length : 0);
      for (let i = 0; i < neededLocals; i++) {
        if (s === "maths") allQuestions.push(generateLocalMaths(year));
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
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 300, system, messages: [{ role: "user", content: prompt }] })
    });
    const data = await response.json();
    return data.content[0].text;
  } catch (err) {
    return "Sage says: Explaining your thinking is the secret to becoming a master scholar. ⭐ Keep going!";
  }
};
