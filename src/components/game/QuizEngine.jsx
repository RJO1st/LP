"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";

// --- INLINED ICONS ---
const CheckCircleIcon = ({ size = 24, className = "" }) => ( <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>);
const XCircleIcon = ({ size = 24, className = "" }) => ( <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>);
const BrainIcon = ({ size = 24, className = "" }) => ( <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M9.5 2A5 5 0 0 1 12 7.33A5 5 0 0 1 14.5 2"/><path d="M17 15a5 5 0 1 1-5 5"/><path d="M2 9a5 5 0 0 1 7-4.5h.5a5 5 0 0 1 4.5 7v.5a5 5 0 0 1-7 4.5H6.5a5 5 0 0 1-4.5-7Z"/><path d="M22 9a5 5 0 0 0-7-4.5h-.5a5 5 0 0 0-4.5 7v.5a5 5 0 0 0 7 4.5h.5a5 5 0 0 0 4.5-7Z"/></svg>);
const ZapIcon = ({ size = 24, className = "" }) => ( <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>);
const ArrowRightIcon = ({ size = 24, className = "" }) => ( <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>);
const EyeIcon = ({ size = 24, className = "" }) => ( <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>);
const ArrowLeftIcon = ({ size = 24, className = "" }) => ( <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>);
const TrophyIcon = ({ size = 24, className = "" }) => ( <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>);
const FlameIcon = ({ size = 24, className = "" }) => ( <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>);
const StarIcon = ({ size = 24, className = "" }) => ( <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>);


// --- PROCEDURAL ENGINE LOGIC (Inlined for standalone compilation) ---
const shuffle = (array) => [...array].sort(() => Math.random() - 0.5);

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
        return evaluated;
    }
  });
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
      "Add the units column: {units_a} + {units_b} = {units_sum}",
      "Write {units_digit} in the units place.",
      "Add the tens column: {tens_a} + {tens_b} = {tens_sum}",
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
      "Add the units column: {units_a} + {units_b} = {units_sum}",
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
      "Subtract the units column: {units_a} - {units_b} = {units_diff}",
      "Write {units_diff} in the units place.",
      "Subtract the tens column: {tens_a} - {tens_b} = {tens_diff}",
      "The answer is {answer}."
    ],
    visual: "place-value-chart"
  }
};

const getExplanationForQuestion = (question) => {
  if (!question?.vars || !question?.topic || question.subject !== 'maths') return null;
  const { vars, topic } = question;
  
  // Year 1/2 don't need complex steppers
  if (topic === 'simple_maths') return null;

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

const generateLocalMaths = (year = 4, difficultyMultiplier = 1) => {
  const op = Math.random();
  let q, ans, exp, topic, visual;
  let a, b;

  // AGE APPROPRIATE BRANCHING
  if (year <= 2) {
    if (op < 0.5) {
      // Y1/Y2 Addition (up to 20 max)
      const max = year === 1 ? 10 : 20;
      a = Math.floor(Math.random() * (max/2)) + 1;
      b = Math.floor(Math.random() * (max/2)) + 1;
      ans = a + b;
      topic = 'simple_maths';
      q = `What is ${a} + ${b}?`;
      exp = `Count the items together: ${a} and ${b} more makes ${ans}.`;
      visual = `${Array(a).fill("🍎").join("")} + ${Array(b).fill("🍏").join("")}`;
    } else {
      // Y1/Y2 Subtraction (up to 15 max)
      a = Math.floor(Math.random() * 10) + 5; 
      b = Math.floor(Math.random() * (a - 1)) + 1;
      ans = a - b;
      topic = 'simple_maths';
      q = `What is ${a} - ${b}?`;
      exp = `Start with ${a} and take away ${b}, leaving ${ans}.`;
      visual = `${Array(ans).fill("🍎").join("")}${Array(b).fill("❌").join("")}`;
    }
  } else {
    // Y3+ Advanced Maths
    const maxNum = Math.floor(year * 25 * difficultyMultiplier); 
    if (op < 0.5) {
      a = Math.floor(Math.random() * maxNum) + (year * 5);
      b = Math.floor(Math.random() * maxNum) + 1;
      ans = a + b;
      topic = 'addition';
      q = `Calculate: ${a} + ${b}`;
      exp = `Add the units, then the tens. ${a} + ${b} = ${ans}.`;
    } else {
      a = Math.floor(Math.random() * maxNum) + 30;
      b = Math.floor(Math.random() * a) + 1;
      ans = a - b;
      topic = 'subtraction';
      q = `Calculate: ${a} - ${b}`;
      exp = `Subtract ${b} from ${a} to get ${ans}.`;
    }
  }

  // Generate plausible string options and ensure absolute uniqueness
  let rawOptions = [ans, ans + 1, Math.max(0, ans - 1), ans + 2];
  if (year > 2) {
     rawOptions = [ans, ans + Math.floor(Math.random() * 5) + 1, ans - (Math.floor(Math.random() * 3) + 1), ans + 10];
  }
  let uniqueOpts = Array.from(new Set(rawOptions));
  while(uniqueOpts.length < 4) { uniqueOpts.push(uniqueOpts[0] + Math.floor(Math.random()*5) + 3); uniqueOpts = Array.from(new Set(uniqueOpts)); }
  
  const opts = shuffle(uniqueOpts.map(String));
  return { q, opts, a: opts.indexOf(String(ans)), exp, subject: 'maths', visual, vars: { a, b }, topic };
};

const generateLocalEnglish = (year = 4) => {
  let types = [];
  
  // AGE APPROPRIATE BRANCHING
  if (year <= 2) {
    types = [
      { q: "Which word rhymes with CAT?", opts: ["BAT", "DOG", "PIG", "SUN"], a: 0, exp: "CAT and BAT sound the same at the end." },
      { q: "What is the missing letter? D _ G (an animal that barks)", opts: ["O", "A", "E", "I"], a: 0, exp: "D-O-G spells DOG." },
      { q: "Choose the correct spelling:", opts: ["Apple", "Appul", "Aple", "Aplle"], a: 0, exp: "The fruit is spelled A-P-P-L-E." }
    ];
  } else {
    types = [
      { q: "Identify the VERB in this sentence: The brave knight fought bravely.", opts: ["brave", "knight", "fought", "bravely"], a: 2, exp: "A verb is a doing or action word. 'fought' is the action here." },
      { q: "Identify the ADJECTIVE in this sentence: The ancient castle stood silently.", opts: ["ancient", "castle", "stood", "silently"], a: 0, exp: "An adjective describes a noun. 'ancient' describes the castle." },
      { q: "Identify the ADVERB in this sentence: The mysterious wizard whispered quietly.", opts: ["mysterious", "wizard", "whispered", "quietly"], a: 3, exp: "An adverb describes how a verb is done. 'quietly' describes how he whispered." }
    ];
  }
  
  const selected = types[Math.floor(Math.random() * types.length)];
  return { ...selected, subject: 'english', topic: year <= 2 ? 'phonics' : 'grammar' };
};

const generateLocalVerbal = (year = 4) => {
  let types = [];
  
  // AGE APPROPRIATE BRANCHING
  if (year <= 2) {
    types = [
      { q: "Which word is the odd one out?", opts: ["Car", "Bus", "Train", "Apple"], a: 3, exp: "Car, Bus, and Train are for traveling. Apple is a fruit." },
      { q: "Happy is to Sad, as Hot is to...", opts: ["Cold", "Warm", "Sun", "Fire"], a: 0, exp: "Happy and Sad are opposites. The opposite of Hot is Cold." }
    ];
  } else {
    types = [
      { q: "Find the next letter in the sequence: A, C, E, G, ?", opts: ["H", "I", "J", "K"], a: 1, exp: "The sequence skips one letter forward each time in the alphabet (+2)." },
      { q: "If the secret code shifts every letter forward by 1, what is the code for CAT?", opts: ["DBS", "DBU", "BZS", "CBU"], a: 1, exp: "C + 1 = D, A + 1 = B, T + 1 = U. The code is DBU." }
    ];
  }
  
  const selected = types[Math.floor(Math.random() * types.length)];
  return { ...selected, subject: 'verbal', topic: year <= 2 ? 'vocab' : 'sequences' };
};

const generateLocalNVR = (year = 4) => {
  let types = [];
  
  if (year <= 2) {
    types = [
      { q: "Which of these is the odd one out?", opts: ["🔺", "🟥", "🔴", "🐶"], a: 3, exp: "The dog is an animal, while the others are shapes." },
      { q: "What comes next? 🟦 🟧 🟦 🟧 ?", opts: ["🟦", "🟧", "🟩", "🟪"], a: 0, exp: "The pattern simply alternates between Blue and Orange. Next is Blue." }
    ];
  } else {
     types = [
      { q: "Which shape does not belong in this sequence?", opts: ["Triangle", "Square", "Circle", "Red"], a: 3, exp: "Red is a color, while the others are all shapes." },
      { q: "What comes next in the visual pattern? Square, Circle, Triangle, Square, Circle, ?", opts: ["Triangle", "Square", "Circle", "Diamond"], a: 0, exp: "The pattern repeats." }
    ];
  }
  
  const selected = types[Math.floor(Math.random() * types.length)];
  return { ...selected, subject: 'nvr', topic: 'patterns' };
};

const generateSessionQuestions = async (year, region, count, proficiency, subject) => {
  const allQuestions = [];
  
  for (let i = 0; i < count; i++) {
    if (subject === 'english') {
      allQuestions.push(generateLocalEnglish(year));
    } else if (subject === 'verbal') {
      allQuestions.push(generateLocalVerbal(year));
    } else if (subject === 'nvr') {
      allQuestions.push(generateLocalNVR(year));
    } else if (subject === 'mock') {
      const rand = Math.random();
      if (rand < 0.25) allQuestions.push(generateLocalMaths(year));
      else if (rand < 0.5) allQuestions.push(generateLocalEnglish(year));
      else if (rand < 0.75) allQuestions.push(generateLocalVerbal(year));
      else allQuestions.push(generateLocalNVR(year));
    } else {
      // Default to maths
      allQuestions.push(generateLocalMaths(year));
    }
  }
  return allQuestions;
};

const fetchClaudeResponse = async () => {
  return "Tara says: That's a great effort! Explaining your thinking is the secret to becoming a master scholar. ✨ Keep going!";
};

// --- INTERACTIVE VISUAL COMPONENT (For Year 3+) ---
const PlaceValueChart = ({ computed, step }) => {
  if (!computed) return null;
  const { a, b, carry, answer, operation } = computed;

  const isUnitsActive = step === 0 || step === 1;
  const isTensActive = step === 2 || step === 3;
  
  const maxLen = Math.max(String(a).length, String(b).length, String(answer).length, 2);
  const aStr = String(a).padStart(maxLen, ' ');
  const bStr = String(b).padStart(maxLen, ' ');
  const ansStr = String(answer).padStart(maxLen, ' ');

  const leftIdx = maxLen - 2;
  const rightIdx = maxLen - 1;

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl shadow-inner border-2 border-slate-100 font-mono text-4xl md:text-5xl font-black w-full max-w-sm mx-auto">
      <div className="flex w-full mb-2 text-indigo-400 text-2xl h-8">
        <div className="flex-1"></div>
        <div className={`flex-1 text-center transition-all ${isTensActive && step >= 2 && carry ? 'opacity-100 scale-110 text-rose-500' : 'opacity-0'}`}>
          {carry ? `+${carry}` : ''}
        </div>
        <div className="flex-1 text-center"></div>
      </div>
      <div className="flex w-full text-slate-700 mb-2">
        <div className="flex-1 text-center text-transparent">-</div>
        <div className={`flex-1 text-center transition-colors ${isTensActive ? 'text-indigo-600' : ''}`}>{aStr[leftIdx] !== ' ' ? aStr[leftIdx] : ''}</div>
        <div className={`flex-1 text-center transition-colors ${isUnitsActive ? 'text-indigo-600' : ''}`}>{aStr[rightIdx]}</div>
      </div>
      <div className="flex w-full text-slate-700 mb-4 pb-4 border-b-4 border-slate-300">
        <div className="flex-1 text-center text-slate-400">{operation}</div>
        <div className={`flex-1 text-center transition-colors ${isTensActive ? 'text-indigo-600' : ''}`}>{bStr[leftIdx] !== ' ' ? bStr[leftIdx] : ''}</div>
        <div className={`flex-1 text-center transition-colors ${isUnitsActive ? 'text-indigo-600' : ''}`}>{bStr[rightIdx]}</div>
      </div>
      <div className="flex w-full text-slate-800">
        <div className="flex-1"></div>
        <div className={`flex-1 text-center transition-all ${step >= 3 ? 'opacity-100 text-emerald-600 transform scale-110' : 'opacity-0'}`}>{ansStr[leftIdx] !== ' ' ? ansStr[leftIdx] : ''}</div>
        <div className={`flex-1 text-center transition-all ${step >= 1 ? 'opacity-100 text-emerald-600 transform scale-110' : 'opacity-0'}`}>{ansStr[rightIdx]}</div>
      </div>
    </div>
  );
};

// --- MAIN QUIZ ENGINE ---
export default function QuizEngine({ world, student, subject, onClose, onComplete, questionCount = 10 }) {
  const [sessionQuestions, setSessionQuestions] = useState([]);
  const [qIdx, setQIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [timeLeft, setTimeLeft] = useState(45);
  const [generating, setGenerating] = useState(true);
  
  // Continuous Checkpoint State & Gamification
  const [finished, setFinished] = useState(false);
  const [totalScore, setTotalScore] = useState(0); // Cumulative points
  const [streak, setStreak] = useState(0); // Current correct streak
  const [sessionCount, setSessionCount] = useState(0); // Quests completed this sitting
  
  const [results, setResults] = useState({ score: 0, answers: [] });
  
  // Scaffolding State
  const [showInteractiveExplanation, setShowInteractiveExplanation] = useState(false);
  const [explanationStep, setExplanationStep] = useState(0);
  const [explanationData, setExplanationData] = useState(null);
  
  const [eibText, setEibText] = useState("");
  const [eibFeedback, setEibFeedback] = useState("");
  const [loadingEIB, setLoadingEIB] = useState(false);

  const timerRef = useRef(null);

  // Fetch logic abstracted so we can re-call it for continuous journeys
  const fetchQuestions = useCallback(() => {
    setGenerating(true);
    // Explicitly parse the student year to an integer so the logic branches work perfectly
    const parsedYear = student?.year ? parseInt(student.year, 10) : 4;
    
    generateSessionQuestions(
      parsedYear, 
      student?.region || "UK", 
      questionCount, 
      student?.proficiency || 50, 
      subject || "maths"
    ).then(qs => {
      setSessionQuestions(qs); 
      setQIdx(0);
      setSelected(null);
      setExplanationData(null);
      setShowInteractiveExplanation(false);
      setExplanationStep(0);
      setEibText("");
      setEibFeedback("");
      setTimeLeft(45);
      setGenerating(false);
    });
  }, [student?.year, student?.region, student?.proficiency, subject, questionCount]);

  // Reset state when props change (re-mounts & topic switches)
  useEffect(() => {
    setFinished(false);
    setResults({ score: 0, answers: [] });
    setTotalScore(0);
    setStreak(0);
    setSessionCount(0);
    fetchQuestions();
  }, [student?.year, student?.region, student?.proficiency, subject, questionCount, fetchQuestions]);

  const handlePick = useCallback((idx) => {
    if (selected !== null) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setSelected(idx);
    
    const currQ = sessionQuestions[qIdx];
    const isCorrect = idx === currQ.a;
    
    if (isCorrect) {
       setResults(r => ({ ...r, score: r.score + 1, answers: [...r.answers, { q: currQ.q, correct: true }] }));
       setTotalScore(prev => prev + 10); // Award 10 points
       setStreak(prev => prev + 1); // Increase streak
    } else {
       setResults(r => ({ ...r, answers: [...r.answers, { q: currQ.q, correct: false }] }));
       setStreak(0); // Reset streak
       
       const expData = getExplanationForQuestion(currQ);
       if (expData) setExplanationData(expData);
    }
  }, [selected, qIdx, sessionQuestions]);

  useEffect(() => {
    if (selected !== null || finished || sessionQuestions.length === 0 || generating) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); handlePick(-1); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [qIdx, selected, finished, handlePick, sessionQuestions, generating]);

  const handleEIB = async () => {
    setLoadingEIB(true);
    const feedback = await fetchClaudeResponse();
    setEibFeedback(feedback);
    setLoadingEIB(false);
  };

  const next = () => {
    if (qIdx < sessionQuestions.length - 1) {
      setQIdx(qIdx + 1); 
      setSelected(null); 
      setTimeLeft(45);
      setExplanationData(null); 
      setShowInteractiveExplanation(false); 
      setExplanationStep(0);
      setEibText(""); 
      setEibFeedback("");
    } else {
      setSessionCount(prev => prev + 1);
      setFinished(true);
    }
  };

  if (generating) return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[4000] flex items-center justify-center p-4">
      <div className="bg-white rounded-[40px] p-10 text-center max-w-sm w-full shadow-2xl animate-pulse">
         <BrainIcon size={64} className="mx-auto text-indigo-500 mb-6" />
         <h3 className="text-2xl font-black text-slate-800 mb-2">Preparing Quest...</h3>
         <p className="text-slate-500 font-bold">Summoning new challenges.</p>
      </div>
    </div>
  );

  // --- The Continuous Checkpoint Screen ---
  if (finished) return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[4000] flex items-center justify-center p-4">
      <div className="bg-white rounded-[40px] p-8 md:p-12 text-center max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300 relative overflow-hidden">
        
        {/* Century Club Badge Celebration */}
        {totalScore >= 100 && (
           <div className="absolute top-0 left-0 right-0 bg-amber-400 text-amber-900 font-black py-2 uppercase tracking-widest text-xs flex justify-center items-center gap-2 shadow-sm">
             <StarIcon size={14}/> Century Club Achieved! <StarIcon size={14}/>
           </div>
        )}

        <TrophyIcon size={80} className={`mx-auto mb-6 drop-shadow-md mt-4 ${totalScore >= 100 ? 'text-amber-500' : 'text-indigo-400'}`} />
        <h2 className="text-4xl font-black text-slate-800 mb-2 tracking-tight">Checkpoint Reached!</h2>
        
        <p className="text-slate-500 font-bold mb-6 text-lg">
          You scored {results.score} out of {sessionQuestions.length} this round.
        </p>

        <div className="flex justify-center gap-4 mb-8">
           <div className="bg-amber-50 px-4 py-2 rounded-xl border border-amber-200 flex items-center gap-2">
              <FlameIcon size={20} className="text-amber-500"/>
              <div className="text-left leading-tight">
                 <div className="text-[10px] font-black uppercase text-amber-600 tracking-wider">Current Streak</div>
                 <div className="font-black text-amber-700 text-xl">{streak}</div>
              </div>
           </div>
           <div className="bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-200 flex items-center gap-2">
              <StarIcon size={20} className="text-emerald-500"/>
              <div className="text-left leading-tight">
                 <div className="text-[10px] font-black uppercase text-emerald-600 tracking-wider">Total Points</div>
                 <div className="font-black text-emerald-700 text-xl">{totalScore}</div>
              </div>
           </div>
        </div>
        
        <div className="flex flex-col gap-4">
          <button 
            onClick={() => {
              setFinished(false);
              setResults({ score: 0, answers: [] });
              fetchQuestions(); // Retains totalScore and streak for continuous play!
            }} 
            className="w-full bg-indigo-600 text-white font-black py-5 rounded-[24px] hover:bg-indigo-700 hover:scale-[1.02] transition-all text-xl shadow-xl flex items-center justify-center gap-2"
          >
            Practice Again <ArrowRightIcon size={24}/>
          </button>
          
          <button 
            onClick={() => onClose ? onClose() : null} 
            className="w-full bg-slate-100 text-slate-600 font-black py-4 rounded-[24px] hover:bg-slate-200 transition-all text-lg"
          >
            Change Topic / Exit
          </button>
        </div>
      </div>
    </div>
  );

  const q = sessionQuestions[qIdx];
  if (!q) return null;

  const isCorrectAnswer = selected === q.a;
  const finishedExplanation = showInteractiveExplanation && explanationData && explanationStep === explanationData.steps.length - 1;
  const hasEIBFeedback = !!eibFeedback;
  const canProceed = isCorrectAnswer || (selected !== null && !isCorrectAnswer && (hasEIBFeedback || finishedExplanation));

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[4000] flex items-center justify-center p-4 md:p-8 text-slate-900">
      <div className="bg-white w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] relative">
        
        <div className="h-3 bg-slate-100 shrink-0">
          <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${((qIdx + 1) / sessionQuestions.length) * 100}%` }} />
        </div>

        <div className="p-6 md:p-10 pb-24 flex-1 overflow-y-auto">
          {/* Enhanced Header with Live Stats */}
          <div className="flex justify-between items-center mb-8 border-b-2 border-slate-100 pb-6">
             <div className="flex items-center gap-3">
               <span className="font-black text-indigo-500 uppercase tracking-widest text-sm bg-indigo-50 px-4 py-2 rounded-xl">Q{qIdx + 1} of {sessionQuestions.length}</span>
               
               {/* Live Gamification HUD */}
               <div className="hidden md:flex items-center gap-4 ml-4 px-4 py-2 border-l-2 border-slate-200">
                 <div className="flex items-center gap-1 font-black text-amber-500 text-sm"><FlameIcon size={18}/> {streak}</div>
                 <div className="flex items-center gap-1 font-black text-emerald-500 text-sm"><StarIcon size={18}/> {totalScore}</div>
               </div>
             </div>
             
             <div className="flex items-center gap-4">
               <div className={`text-2xl font-black ${timeLeft < 5 ? "text-rose-500 animate-pulse" : "text-slate-800"}`}>00:{timeLeft.toString().padStart(2, '0')}</div>
               <button onClick={onClose} className="text-slate-400 hover:text-rose-500 transition-colors p-2 bg-slate-50 rounded-full" title="Save & Exit">
                 <XCircleIcon size={24}/>
               </button>
             </div>
          </div>

          <h3 className="text-3xl md:text-5xl font-black leading-tight text-slate-800 mb-10">{q.q}</h3>

          {q.visual && <div className="mb-8 p-6 bg-slate-50 rounded-2xl border-2 border-slate-200 text-center text-4xl tracking-widest">{q.visual}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {q.opts.map((opt, i) => {
              const isSelected = selected === i;
              const isOptionCorrect = i === q.a;
              const isAnswered = selected !== null;

              let btnClasses = "bg-white border-slate-200 hover:border-indigo-500 text-slate-700";
              if (isAnswered) {
                if (isOptionCorrect) btnClasses = "bg-emerald-50 border-emerald-500 text-emerald-700 ring-4 ring-emerald-100 z-10 scale-[1.02]";
                else if (isSelected) btnClasses = "bg-rose-50 border-rose-500 text-rose-700 ring-4 ring-rose-100 z-10 scale-[1.02]";
                else btnClasses = "bg-white border-slate-200 opacity-40 grayscale";
              }

              return (
                <button key={i} disabled={isAnswered} onClick={() => handlePick(i)} className={`w-full text-left p-6 md:p-8 rounded-[24px] font-black border-2 transition-all duration-300 text-2xl relative ${btnClasses}`}>
                  <div className="flex justify-between items-center">
                    <span>{opt}</span>
                    {isAnswered && isOptionCorrect && <CheckCircleIcon className="text-emerald-500" size={32} />}
                    {isAnswered && isSelected && !isOptionCorrect && <XCircleIcon className="text-rose-500" size={32} />}
                  </div>
                </button>
              );
            })}
          </div>

          {selected !== null && (
            <div className="mt-8 animate-in slide-in-from-bottom-4 space-y-6 border-t-2 border-slate-100 pt-8">
              
              <div className="p-6 md:p-8 bg-slate-50 rounded-[24px] border-l-8 border-indigo-500 flex gap-5 items-center">
                <BrainIcon size={32} className="text-indigo-500 shrink-0" />
                <p className="font-bold text-slate-800 text-xl">{q.exp}</p>
              </div>

              {!isCorrectAnswer && !showInteractiveExplanation && (
                <div className="flex flex-col md:flex-row gap-4">
                   {explanationData && (
                     <button 
                       onClick={() => setShowInteractiveExplanation(true)} 
                       className="flex-1 bg-indigo-100 text-indigo-700 font-black py-5 px-6 rounded-2xl flex items-center justify-center gap-3 hover:bg-indigo-200 transition-colors text-lg border-2 border-indigo-200"
                     >
                       <EyeIcon size={24} /> Show Me How (Step-by-Step)
                     </button>
                   )}
                   
                   <button 
                     onClick={() => { document.getElementById('eib-box')?.focus(); }} 
                     className="flex-1 bg-amber-100 text-amber-800 font-black py-5 px-6 rounded-2xl flex items-center justify-center gap-3 hover:bg-amber-200 transition-colors text-lg border-2 border-amber-200"
                   >
                     <ZapIcon size={24} /> Explain It Back
                   </button>
                </div>
              )}

              {showInteractiveExplanation && explanationData && (
                <div className="bg-indigo-50 p-6 md:p-10 rounded-[32px] border-2 border-indigo-200 shadow-inner animate-in zoom-in-95 duration-300">
                  <div className="flex justify-between items-center mb-6">
                     <h4 className="font-black text-indigo-800 uppercase tracking-widest text-sm flex items-center gap-2"><EyeIcon size={18}/> Step-by-Step Guide</h4>
                     <span className="bg-indigo-200 text-indigo-800 font-bold px-3 py-1 rounded-full text-sm">Step {explanationStep + 1} of {explanationData.steps.length}</span>
                  </div>

                  <div className="mb-8">
                    {explanationData.visual === "place-value-chart" && (
                      <PlaceValueChart computed={explanationData.computed} step={explanationStep} />
                    )}
                  </div>

                  <div className="bg-white p-6 rounded-2xl border-2 border-indigo-100 text-center mb-8 shadow-sm">
                    <p className="text-2xl font-black text-indigo-900">{explanationData.steps[explanationStep]}</p>
                  </div>

                  <div className="flex gap-4">
                    <button 
                      onClick={() => setExplanationStep(s => Math.max(0, s - 1))}
                      disabled={explanationStep === 0}
                      className="flex-1 bg-white text-indigo-600 font-black py-4 rounded-xl border-2 border-indigo-200 disabled:opacity-50 hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2"
                    >
                      <ArrowLeftIcon size={20}/> Prev
                    </button>
                    {explanationStep < explanationData.steps.length - 1 ? (
                      <button 
                        onClick={() => setExplanationStep(s => s + 1)}
                        className="flex-[2] bg-indigo-600 text-white font-black py-4 rounded-xl hover:bg-indigo-700 shadow-md transition-all flex items-center justify-center gap-2"
                      >
                        Next Step <ArrowRightIcon size={20}/>
                      </button>
                    ) : (
                      <button 
                         onClick={() => setShowInteractiveExplanation(false)}
                         className="flex-[2] bg-emerald-500 text-white font-black py-4 rounded-xl hover:bg-emerald-600 shadow-md transition-all flex items-center justify-center gap-2"
                      >
                         <CheckCircleIcon size={20}/> I Understand Now
                      </button>
                    )}
                  </div>
                </div>
              )}

              {!isCorrectAnswer && !showInteractiveExplanation && (
                <div className="p-6 md:p-8 bg-amber-50 rounded-[32px] border-2 border-amber-200 mt-4">
                  <p className="text-amber-800 font-bold mb-4 text-lg">Or, try teaching Tara why <span className="underline font-black">{q.opts[q.a]}</span> is correct:</p>
                  <textarea id="eib-box" value={eibText} onChange={e => setEibText(e.target.value)} className="w-full p-5 rounded-2xl border-2 border-amber-100 font-bold mb-4 focus:outline-none focus:border-amber-400 bg-white shadow-inner text-lg" rows={3} placeholder="Explain your thinking here..." />
                  <button disabled={loadingEIB || !eibText.trim()} onClick={handleEIB} className="w-full bg-amber-500 text-white font-black py-5 rounded-2xl shadow-lg transition-all hover:scale-[1.02] text-lg disabled:opacity-50">
                    {loadingEIB ? "Tara is listening..." : "Explain it Back ✨"}
                  </button>
                  {eibFeedback && <div className="mt-6 p-6 bg-white rounded-2xl border-2 border-amber-100 text-amber-900 font-bold italic text-lg shadow-sm">{eibFeedback}</div>}
                </div>
              )}

              {canProceed && (
                <div className="pt-6 mt-6 border-t-2 border-slate-100 animate-in fade-in zoom-in-95 duration-300">
                  <button onClick={next} className="w-full bg-slate-900 text-white font-black py-6 rounded-[24px] flex items-center justify-center gap-3 shadow-xl hover:bg-black transition-all text-xl">
                    {qIdx === sessionQuestions.length - 1 ? "Complete Checkpoint" : "Next Question"} <ArrowRightIcon size={24} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
