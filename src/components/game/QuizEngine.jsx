"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";

// --- INLINED DEPENDENCIES FOR PREVIEW COMPILATION ---
// These mock functions and icons are included directly in this file 
// so the Canvas preview environment can compile everything successfully.

const TrophyIcon = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
);

const XCircleIcon = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
);

const CheckCircleIcon = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
);

const BrainIcon = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M9.5 2A5 5 0 0 1 12 7.33A5 5 0 0 1 14.5 2"/><path d="M17 15a5 5 0 1 1-5 5"/><path d="M2 9a5 5 0 0 1 7-4.5h.5a5 5 0 0 1 4.5 7v.5a5 5 0 0 1-7 4.5H6.5a5 5 0 0 1-4.5-7Z"/><path d="M22 9a5 5 0 0 0-7-4.5h-.5a5 5 0 0 0-4.5 7v.5a5 5 0 0 0 7 4.5h.5a5 5 0 0 0 4.5-7Z"/></svg>
);

const ZapIcon = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>
);

const ArrowRightIcon = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
);

const SpeechIcon = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
);

const generateSessionQuestions = async (year, region, count, proficiency, subject, mistakes, previousQs) => {
  return [
    {
      q: "What is 8 + 8? (a,b <= 5)",
      opts: ["16", "17", "15", "18"],
      a: 0,
      exp: "Add the numbers together.",
      visual: "🔴🔴🔴🔴🔴🔴🔴🔴 + 🔵🔵🔵🔵🔵🔵🔵🔵",
      passage: null
    },
    {
      q: "What is 4 + 10?",
      opts: ["14", "15", "13", "16"],
      a: 0,
      exp: "Add the units, then the tens.",
      visual: null,
      passage: null
    }
  ];
};

const fetchClaudeResponse = async (prompt, system) => {
  return "Tara says: That's a great effort! Explaining your thinking is the secret to becoming a master scholar. ⭐ Keep going!";
};
// ----------------------------------------------------

export default function App() {
  // Supplying mock props so the preview renders cleanly without crashing
  return (
    <QuizEngine 
      world={{ name: "Meadowlands" }}
      student={{ year: 2, name: "Scholar", region: "UK", proficiency: 50 }}
      subject="maths"
      mistakes={[]}
      onComplete={() => alert("Quest Completed! Check results in your app.")}
      onClose={() => alert("Closing Quiz Engine")}
    />
  );
}

function QuizEngine({ world, student, subject, mistakes, onComplete, onClose }) {
  // Dynamic timer based on Scholar's Year Level
  const initialTime = parseInt(student?.year) <= 1 ? 45 :
                      parseInt(student?.year) === 2 ? 40 :
                      parseInt(student?.year) === 3 ? 35 :
                      parseInt(student?.year) === 4 ? 30 :
                      parseInt(student?.year) === 5 ? 25 : 20;

  const [sessionQuestions, setSessionQuestions] = useState([]);
  const [qIdx, setQIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [eibText, setEibText] = useState("");
  const [eibFeedback, setEibFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(true);
  const [genError, setGenError] = useState(false);
  
  const [results, setResults] = useState({ score: 0, newMistakes: [] });
  const [answers, setAnswers] = useState([]); 
  const [finished, setFinished] = useState(false);
  
  const timerRef = useRef(null);
  const questionsRef = useRef([]);
  const eibCache = useRef({}); 
  const startTimeRef = useRef(Date.now()); 

  const proficiency = student.proficiency || 50;

  // --- ROBUST TTS VOICE ENGINE ---
  useEffect(() => {
    // Force browser to load voices early
    const loadVoices = () => { window.speechSynthesis.getVoices(); };
    loadVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const speakText = useCallback((text) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel(); // Stop current speech
    
    // Clean text to avoid reading developer hints in brackets (like "a,b <=5")
    const cleanText = text.replace(/\([^)]*\)/g, '').trim();
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'en-GB';
    utterance.rate = 0.85; // Calm pace
    utterance.pitch = 1.05; // Warmer tone
    
    const voices = window.speechSynthesis.getVoices();
    
    // Aggressive hunt for the best UK female voice on the device
    const ukFemale = voices.find(v => 
      v.lang.includes('en-GB') && (
        v.name.toLowerCase().includes('female') || 
        v.name.includes('Siri') || 
        v.name.includes('Hazel') ||
        v.name.includes('Google UK English Female') ||
        v.name.includes('Martha')
      )
    );
    
    // Fallbacks if no specific UK female is found
    const anyUk = voices.find(v => v.lang.includes('en-GB'));
    const anyFemale = voices.find(v => v.name.toLowerCase().includes('female'));
    
    if (ukFemale) utterance.voice = ukFemale;
    else if (anyUk) utterance.voice = anyUk;
    else if (anyFemale) utterance.voice = anyFemale;
    
    window.speechSynthesis.speak(utterance);
  }, []);

  useEffect(() => {
    // Stop speaking if they move to the next question
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [qIdx]);

  useEffect(() => {
    setGenerating(true);
    setGenError(false);
    startTimeRef.current = Date.now(); 
    
    const previousQs = questionsRef.current.map(q => q.q);
    generateSessionQuestions(
      parseInt(student.year),
      student.region,
      15,
      proficiency,
      subject,
      mistakes,
      previousQs
    ).then(qs => {
      if (qs.length === 0) { setGenError(true); setGenerating(false); return; }
      setSessionQuestions(qs);
      questionsRef.current = qs;
      setGenerating(false);
    }).catch(() => { setGenError(true); setGenerating(false); });
  }, [world, subject, student.year, student.region, proficiency, mistakes]);

  const handlePick = useCallback((idx) => {
    if (selected !== null) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setSelected(idx);
    
    const currQ = questionsRef.current[qIdx];
    if (!currQ) return;

    if (idx === currQ.a) {
      setResults(r => ({ ...r, score: r.score + 1 }));
    } else if (idx !== -1) { 
      // Log as mistake if they actively picked wrong (not just timeout)
      setResults(r => ({ ...r, newMistakes: [...r.newMistakes, { q: currQ.q, correct: currQ.opts[currQ.a], exp: currQ.exp }] }));
    }

    setAnswers(prev => [...prev, {
      selectedOption: idx,
      correctOption: currQ.a,
      questionId: currQ.q
    }]);

  }, [selected, qIdx]);

  useEffect(() => {
    if (selected !== null || finished || sessionQuestions.length === 0 || generating) return;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handlePick(-1); // -1 signifies a timeout
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [qIdx, selected, finished, handlePick, sessionQuestions, generating]);

  // Auto-read answers/explanation when selection is made
  useEffect(() => {
    if (selected !== null && sessionQuestions[qIdx]) {
      const currQ = sessionQuestions[qIdx];
      if (selected === -1) {
        speakText(`Time is up! The correct answer is ${currQ.opts[currQ.a]}. ${currQ.exp}`);
      } else if (selected === currQ.a) {
        speakText(`Spot on! ${currQ.exp}`);
      } else {
        speakText(`Not quite. The correct answer is ${currQ.opts[currQ.a]}. ${currQ.exp}`);
      }
    }
  }, [selected, qIdx, sessionQuestions, speakText]);

  const handleEIB = async () => {
    const currQ = sessionQuestions[qIdx];
    const cacheKey = `${currQ.q}-${eibText}`;
    
    if (eibCache.current[cacheKey]) {
      setEibFeedback(eibCache.current[cacheKey]);
      return;
    }

    setLoading(true);
    const feedback = await fetchClaudeResponse(
      `Student ${student.name} (Year ${student.year}, ${student.region} 11+ exam) explained why "${currQ.opts[currQ.a]}" is correct for: "${currQ.q}". Their explanation: "${eibText}"`,
      `You are Tara, a warm encouraging UK 11+ tutor. Address the student directly by name. Give 2-3 sentences of specific feedback. Start positively, gently correct any misunderstanding, end with '⭐ Keep going!'`
    );
    
    eibCache.current[cacheKey] = feedback;
    setEibFeedback(feedback);
    setLoading(false);
  };

  const next = () => {
    if (qIdx < sessionQuestions.length - 1) {
      setQIdx(qIdx + 1); 
      setSelected(null); 
      setTimeLeft(initialTime); 
      setEibText(""); 
      setEibFeedback("");
    } else {
      setFinished(true);
    }
  };

  const completeQuest = () => {
    const timeSpent = (Date.now() - startTimeRef.current) / 1000;
    onComplete({ ...results, answers, timeSpent });
  };

  if (generating) return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[4000] flex items-center justify-center p-6 text-slate-900">
      <div className="bg-white rounded-[40px] p-12 shadow-2xl text-center max-w-sm w-full">
        <div className="text-6xl mb-6 animate-bounce">🧙</div>
        <h3 className="text-2xl font-black text-slate-800 mb-3">Tara is preparing your quest...</h3>
        <p className="text-slate-500 font-bold mb-8">Generating fresh questions tailored just for you!</p>
      </div>
    </div>
  );

  if (genError) return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[4000] flex items-center justify-center p-6 text-slate-900">
      <div className="bg-white rounded-[40px] p-12 shadow-2xl text-center max-w-sm w-full">
        <div className="text-6xl mb-6">😔</div>
        <h3 className="text-2xl font-black text-slate-800 mb-3">Couldn't connect to Tara</h3>
        <p className="text-slate-500 font-bold mb-8">Check your internet connection and try again.</p>
        <button onClick={() => window.location.reload()} className="w-full py-4 rounded-2xl bg-indigo-600 font-black text-white">Retry</button>
      </div>
    </div>
  );
  
  const q = sessionQuestions[qIdx];

  if (finished) return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[5000] flex items-center justify-center p-6 text-slate-900 text-center">
      <div className="bg-white w-full max-w-md rounded-[40px] p-12 shadow-2xl border-b-8 border-indigo-200">
        <TrophyIcon size={80} className="mx-auto text-amber-400 mb-6" />
        <h2 className="text-5xl font-black mb-2">{results.score} / {sessionQuestions.length}</h2>
        <p className="text-slate-500 font-bold mb-10 leading-tight">Quest Complete! Verifying results securely...</p>
        <button onClick={completeQuest} className="w-full bg-indigo-600 text-white font-black py-5 rounded-3xl shadow-xl active:scale-95 transition-all text-lg">Collect Rewards</button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[4000] flex items-center justify-center p-4 md:p-8 text-slate-900">
      <div className="bg-white w-full max-w-3xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] border-t-8 border-indigo-500 relative">
        <div className="h-2 bg-slate-100"><div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${((qIdx + 1) / sessionQuestions.length) * 100}%` }} /></div>
        <div className="p-6 md:p-12 overflow-y-auto">
          
          <div className="flex justify-between items-center mb-8">
            <span className="font-black text-indigo-500 uppercase tracking-widest text-xs md:text-sm">{world.name} • {subject === 'mock' ? 'Weekly Mock Test' : `${subject} Quest`} • Q{qIdx + 1}</span>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-rose-500 transition-colors"><XCircleIcon size={28}/></button>
          </div>

          <div className="bg-slate-100 rounded-2xl p-4 md:p-5 mb-6 flex justify-between items-center border border-slate-200">
            <span className="font-black text-slate-500 uppercase tracking-widest text-xs">Time Remaining</span>
            <div className={`text-2xl md:text-3xl font-black ${timeLeft < 5 ? "text-rose-500 animate-pulse" : "text-slate-800"}`}>
              00:{timeLeft.toString().padStart(2, '0')}
            </div>
          </div>

          {q.passage && (
            <div className="mb-6 p-6 bg-slate-50 rounded-2xl border-2 border-slate-200">
              <h4 className="font-black text-slate-800 mb-4">Read the passage:</h4>
              <p className="text-slate-600 font-medium leading-relaxed">{q.passage}</p>
            </div>
          )}

          {/* Question Text and Read Aloud Button on the SAME layer */}
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
            <h3 className="text-2xl md:text-4xl font-black leading-tight text-slate-800 text-balance">
              {q.isReview && <span className="text-rose-500 mr-2">[REVIEW]</span>}
              {q.q}
            </h3>
            <button 
              onClick={() => speakText(`${q.q}. The options are: ${q.opts.join(", or, ")}`)} 
              className="flex items-center gap-2 px-4 py-3 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 font-black shrink-0 transition-all self-start shadow-sm border-2 border-indigo-100"
              title="Read Question & Options Aloud"
            >
              <SpeechIcon size={20} /> Read Aloud
            </button>
          </div>

          {/* Visual Aids placed clearly BELOW the question text */}
          {q.visual && (
            <div className="mb-8 p-6 bg-slate-50 rounded-2xl border-2 border-slate-200 text-center text-3xl md:text-4xl tracking-widest shadow-inner whitespace-pre-wrap break-words">
              {q.visual}
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {q.opts.map((opt, i) => {
              const isSelected = selected === i;
              const isCorrect = i === q.a;
              const isAnswered = selected !== null;

              // Explicit styling logic to fix highlight bugs
              let btnClasses = "bg-white border-slate-200 hover:border-indigo-500 hover:shadow-md text-slate-700";
              if (isAnswered) {
                if (isCorrect) {
                  btnClasses = "bg-emerald-50 border-emerald-500 text-emerald-700 ring-4 ring-emerald-100 z-10";
                } else if (isSelected) {
                  btnClasses = "bg-rose-50 border-rose-500 text-rose-700 ring-4 ring-rose-100 z-10";
                } else {
                  btnClasses = "bg-white border-slate-200 opacity-40";
                }
              }

              return (
                <button 
                  key={i} 
                  disabled={isAnswered} 
                  onClick={() => handlePick(i)} 
                  className={`w-full text-left p-6 md:p-8 rounded-2xl font-black border-2 transition-all text-lg md:text-xl relative ${btnClasses}`}
                >
                  <div className="flex justify-between items-center">
                    <span>{opt}</span>
                    {isAnswered && isCorrect && <CheckCircleIcon className="text-emerald-500" size={28} />}
                    {isAnswered && isSelected && !isCorrect && <XCircleIcon className="text-rose-500" size={28} />}
                  </div>
                </button>
              );
            })}
          </div>

          {selected !== null && (
            <div className="mt-10 space-y-6 animate-in slide-in-from-bottom-4">
              <div className="p-6 md:p-8 bg-indigo-50 rounded-[24px] border-l-8 border-indigo-500 flex gap-5 items-center">
                <BrainIcon size={32} className="text-indigo-500 shrink-0" />
                <div>
                  {selected === -1 && <p className="font-black text-rose-500 uppercase tracking-widest text-sm mb-1">Time's Up!</p>}
                  <p className="font-bold text-indigo-900 text-lg md:text-xl">{q.exp}</p>
                </div>
              </div>
              
              {selected !== q.a && !eibFeedback && (
                <div className="p-6 md:p-8 bg-amber-50 rounded-[32px] border-2 border-amber-200">
                  <h4 className="text-amber-900 font-black text-sm uppercase mb-4 tracking-widest flex items-center gap-2"><ZapIcon size={18}/> Explain It Back</h4>
                  <p className="text-amber-800 font-bold mb-4 text-lg">Why is <span className="underline font-black">{q.opts[q.a]}</span> correct? Teach Tara:</p>
                  <textarea value={eibText} onChange={e => setEibText(e.target.value)} className="w-full p-5 rounded-2xl border-2 border-amber-100 font-bold mb-4 focus:outline-none focus:border-amber-400 bg-white shadow-inner text-lg" rows={3} placeholder="Explain your thinking here..." />
                  <button disabled={loading || !eibText.trim()} onClick={handleEIB} className="w-full bg-amber-500 text-white font-black py-5 rounded-2xl shadow-lg transition-all hover:scale-[1.02] text-lg disabled:opacity-50 disabled:hover:scale-100">{loading ? "Tara is listening..." : "Explain it Back ✨"}</button>
                </div>
              )}

              {eibFeedback && (
                <>
                  <div className="p-6 md:p-8 bg-purple-50 rounded-[32px] border-2 border-purple-100 text-purple-700 font-bold italic text-lg shadow-sm">{eibFeedback}</div>
                  <button onClick={next} className="w-full bg-slate-900 text-white font-black py-6 rounded-2xl flex items-center justify-center gap-3 shadow-xl hover:bg-black transition-all text-xl mt-6">
                    {qIdx === sessionQuestions.length - 1 ? "Complete Journey" : "Next Quest"} <ArrowRightIcon size={24} />
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
