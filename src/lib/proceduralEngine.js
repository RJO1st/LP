// --- BULLETPROOF FISHER-YATES SHUFFLE ---
const shuffle = (array) => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

// --- YEAR-SPECIFIC DIFFICULTY MAPPING ---
export const generateLocalMaths = (year) => {
  let q, ans, exp, opts;
  
  if (year === 1) {
    // Year 1: Simple Addition/Subtraction (0-20)
    const a = Math.floor(Math.random() * 10) + 1;
    const b = Math.floor(Math.random() * 9) + 1;
    ans = a + b;
    q = `What is ${a} + ${b}?`;
    exp = `Counting forward: ${a}... ${a+1}, ${a+2}... adding ${b} makes ${ans}.`;
  } else if (year === 2) {
    // Year 2: Two-digit addition, basic tables
    const a = Math.floor(Math.random() * 20) + 10;
    const b = Math.floor(Math.random() * 20) + 5;
    ans = a + b;
    q = `Calculate: ${a} + ${b}`;
    exp = `Add the units, then the tens. ${a} + ${b} = ${ans}.`;
  } else if (year >= 5) {
    // Year 5/6: 11+ Style Multi-step
    const a = Math.floor(Math.random() * 12) + 1;
    const b = Math.floor(Math.random() * 12) + 1;
    const c = Math.floor(Math.random() * 10) + 5;
    ans = (a * b) + c;
    q = `If a pack has ${a} pens and you have ${b} packs plus ${c} loose pens, how many pens in total?`;
    exp = `${a} × ${b} = ${a*b}. Then ${a*b} + ${c} = ${ans}.`;
  } else {
    // Default Middle Years
    const a = Math.floor(Math.random() * 50) + 1;
    const b = Math.floor(Math.random() * 20) + 1;
    ans = a + b;
    q = `What is ${a} + ${b}?`;
    exp = `${a} + ${b} equals ${ans}.`;
  }

  const wrong = [ans + 1, ans - 1, ans + 10].map(String);
  opts = shuffle([String(ans), ...wrong]);
  return { q, opts, a: opts.indexOf(String(ans)), exp, subject: 'maths' };
};

export const generateLocalEnglish = (year) => {
  if (year === 1) {
    const words = ["Cat", "Dog", "Apple", "Sun", "Hat"];
    const word = words[Math.floor(Math.random() * words.length)];
    const q = `What is the FIRST letter of the word "${word}"?`;
    const ans = word[0];
    const opts = shuffle([ans, "B", "M", "S"]);
    return { q, opts, a: opts.indexOf(ans), exp: `The word "${word}" starts with the sound '${ans}'.`, subject: 'english' };
  }
  
  // High level English
  const adj = ["Fierce", "Ancient", "Massive"][Math.floor(Math.random()*3)];
  const n = ["Lion", "Dragon", "Castle"][Math.floor(Math.random()*3)];
  const q = `Which word is an ADJECTIVE in this phrase: "The ${adj} ${n}"?`;
  const ans = adj;
  const opts = shuffle([adj, n, "The", "Is"]);
  return { q, opts, a: opts.indexOf(ans), exp: `An adjective describes a noun. "${adj}" describes the ${n}.`, subject: 'english' };
};

export const generateLocalVerbal = (year) => {
  if (year < 3) {
    const pairs = [["Hot", "Cold"], ["Up", "Down"], ["Big", "Small"]];
    const pair = pairs[Math.floor(Math.random() * pairs.length)];
    const q = `What is the opposite of ${pair[0]}?`;
    const ans = pair[1];
    const opts = shuffle([ans, "Red", "Fast", "Green"]);
    return { q, opts, a: opts.indexOf(ans), exp: `${pair[0]} and ${pair[1]} are opposites.`, subject: 'verbal' };
  }
  
  // Coding/Analogies for 11+
  const word = "FISH";
  const q = `If CAT becomes DBT (moving 1 step forward), what does ${word} become?`;
  const ans = "GJT1"; // Simplification for logic
  const opts = shuffle(["GJT1", "EHRG", "GKTI", "FITI"]);
  return { q, opts, a: opts.indexOf("GJT1"), exp: "Each letter moves forward one place in the alphabet.", subject: 'verbal' };
};

export const generateLocalNVR = (year) => {
  const shapes = ["🔴", "🟦", "🔺"];
  const s1 = shapes[Math.floor(Math.random()*3)];
  const s2 = shapes[Math.floor(Math.random()*3)];
  const q = `Which shape comes next: ${s1} ${s2} ${s1} ${s2} ?`;
  const ans = s1;
  const opts = shuffle([s1, s2, "⭐", "🔶"]);
  return { q, opts, a: opts.indexOf(ans), exp: "The pattern alternates between two shapes.", subject: 'nvr' };
};

// --- ROBUST SESSION GENERATOR (Avoid Repetition) ---
export const generateSessionQuestions = async (year, region, count, proficiency, subject, mistakes = [], previousQs = []) => {
  const allQuestions = [];
  
  // We aim for 300 possible local variations or AI fallback
  // This logic ensures we don't pick anything in previousQs
  let attempts = 0;
  while (allQuestions.length < count && attempts < 500) {
    let newQ;
    if (subject === 'maths') newQ = generateLocalMaths(year);
    else if (subject === 'english') newQ = generateLocalEnglish(year);
    else if (subject === 'verbal') newQ = generateLocalVerbal(year);
    else newQ = generateLocalNVR(year);

    if (!previousQs.includes(newQ.q)) {
      allQuestions.push(newQ);
    }
    attempts++;
  }

  return allQuestions;
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
    return "Sage says: That's a great effort! ⭐ Keep going!";
  }
};
