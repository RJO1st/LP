"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { generateSessionQuestions, fetchClaudeResponse } from "../../lib/proceduralEngine";
import {
  TrophyIcon, XCircleIcon, CheckCircleIcon, BrainIcon, ZapIcon, ArrowRightIcon, SpeechIcon
} from "../ui/Icons";

export default function QuizEngine({ world, student, subject, mistakes, onComplete, onClose }) {
  const [sessionQuestions, setSessionQuestions] = useState([]);
  const [qIdx, setQIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [timeLeft, setTimeLeft] = useState(15);
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

  // --- TTS VOICE ENGINE ---
  useEffect(() => {
    // Pre-load voices on component mount
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
    }
  }, []);

  const speakText = (text) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-GB';
    utterance.rate = 0.85; // Calm and readable pace
    utterance.pitch = 1.05; // Warm intonation
    
    const voices = window.speechSynthesis.getVoices();
    // Hunt for a UK Female voice
    const ukFemale = voices.find(v => 
      v.lang === 'en-GB' && (
        v.name.toLowerCase().includes('female') || 
        v.name.includes('Google UK English Female') || 
        v.name.includes('Hazel') ||
        v.name.includes('Siri')
      )
    );
    const anyUk = voices.find(v => v.lang === 'en-GB');
    
    if (ukFemale) utterance.voice = ukFemale;
    else if (anyUk) utterance.voice = anyUk;
    
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    // Stop reading if they move to the next question or exit
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
    } else {
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
          handlePick(-1);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [qIdx, selected, finished, handlePick, sessionQuestions, generating]);

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
      setQIdx(qIdx + 1); setSelected(null); setTimeLeft(15); setEibText(""); setEibFeedback("");
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
        <div className="flex justify-center gap-2">
          {[0,1,2].map(i => <div key={i} className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce" style={{animationDelay:`${i*0.15}s`}}/>)}
        </div>
      </div>
    </div>
  );

  if (genError) return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[4000] flex items-center justify-center p-6 text-slate-900">
      <div className="bg-white rounded-[40px] p-12 shadow-2xl text-center max-w-sm w-full">
        <div className="text-6xl mb-6">😔</div>
        <h3 className="text-2xl font-black text-slate-800 mb-3">Couldn't connect to Tara</h3>
        <p className="text-slate-500 font-bold mb-8">Check your internet connection and try again.</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-4 rounded-2xl border-2 border-slate-200 font-black text-slate-600">Close</button>
          <button onClick={() => window.location.reload()} className="flex-1 py-4 rounded-2xl bg-indigo-600 font-black text-white">Retry</button>
        </div>
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
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-black text-slate-800">Read the passage:</h4>
                <button onClick={() => speakText(q.passage)} className="flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-xl hover:bg-indigo-200 font-black transition-all text-sm shadow-sm" title="Read Passage Aloud">
                  <SpeechIcon size={18} /> Read Passage
                </button>
              </div>
              <p className="text-slate-600 font-medium leading-relaxed">{q.passage}</p>
            </div>
          )}

          {q.visual && (
            <div className="mb-8 p-6 bg-slate-50 rounded-2xl border-2 border-slate-200 text-center text-3xl md:text-4xl tracking-widest shadow-inner">
              {q.visual}
            </div>
          )}

          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-10">
            <h3 className="text-2xl md:text-4xl font-black leading-tight text-slate-800">
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {q.opts.map((opt, i) => (
              <button key={i} disabled={selected !== null} onClick={() => handlePick(i)} className={`w-full text-left p-6 md:p-8 rounded-2xl font-black border-2 transition-all text-lg md:text-xl ${selected === null ? "bg-white border-slate-200 hover:border-indigo-500 hover:shadow-md" : i === q.a ? "bg-emerald-50 border-emerald-500 text-emerald-700 ring-4 ring-emerald-100" : selected === i ? "bg-rose-50 border-rose-500 text-rose-700" : "opacity-40"}`}>
                <div className="flex justify-between items-center">
                  <span>{opt}</span>
                  {selected !== null && i === q.a && <CheckCircleIcon className="text-emerald-500" size={28} />}
                  {selected === i && i !== q.a && <XCircleIcon className="text-rose-500" size={28} />}
                </div>
              </button>
            ))}
          </div>

          {selected !== null && (
            <div className="mt-10 space-y-6 animate-in slide-in-from-bottom-4">
              <div className="p-6 md:p-8 bg-indigo-50 rounded-[24px] border-l-8 border-indigo-500 flex gap-5 items-center">
                <BrainIcon size={32} className="text-indigo-500 shrink-0" />
                <p className="font-bold text-indigo-900 text-lg md:text-xl">{q.exp}</p>
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
