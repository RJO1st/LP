"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
// Ensure correct import path in your project
import { generateSessionQuestions, fetchClaudeResponse, getExplanationForQuestion } from './procedural_engine'; 

// --- INLINED ICONS ---
const CheckCircleIcon = ({ size = 24, className = "" }) => ( <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>);
const XCircleIcon = ({ size = 24, className = "" }) => ( <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>);
const BrainIcon = ({ size = 24, className = "" }) => ( <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M9.5 2A5 5 0 0 1 12 7.33A5 5 0 0 1 14.5 2"/><path d="M17 15a5 5 0 1 1-5 5"/><path d="M2 9a5 5 0 0 1 7-4.5h.5a5 5 0 0 1 4.5 7v.5a5 5 0 0 1-7 4.5H6.5a5 5 0 0 1-4.5-7Z"/><path d="M22 9a5 5 0 0 0-7-4.5h-.5a5 5 0 0 0-4.5 7v.5a5 5 0 0 0 7 4.5h.5a5 5 0 0 0 4.5-7Z"/></svg>);
const ZapIcon = ({ size = 24, className = "" }) => ( <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>);
const ArrowRightIcon = ({ size = 24, className = "" }) => ( <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>);
const EyeIcon = ({ size = 24, className = "" }) => ( <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>);
const ArrowLeftIcon = ({ size = 24, className = "" }) => ( <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>);

// --- INTERACTIVE VISUAL COMPONENT ---
const PlaceValueChart = ({ computed, step }) => {
  if (!computed) return null;
  const { a, b, carry, answer, operation } = computed;

  // Step 0: Calculate Units. Step 1: Write Units/Carry. Step 2: Calculate Tens. Step 3: Write Tens.
  const isUnitsActive = step === 0 || step === 1;
  const isTensActive = step === 2 || step === 3;
  
  // Dynamically pad strings based on the largest number to align columns safely
  const maxLen = Math.max(String(a).length, String(b).length, String(answer).length, 2);
  const aStr = String(a).padStart(maxLen, ' ');
  const bStr = String(b).padStart(maxLen, ' ');
  const ansStr = String(answer).padStart(maxLen, ' ');

  // Extract the specific digits being worked on (right-to-left indexing)
  const leftIdx = maxLen - 2; // Tens place
  const rightIdx = maxLen - 1; // Units place

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl shadow-inner border-2 border-slate-100 font-mono text-4xl md:text-5xl font-black w-full max-w-sm mx-auto">
      {/* Carry Row */}
      <div className="flex w-full mb-2 text-indigo-400 text-2xl h-8">
        <div className="flex-1"></div>
        <div className={`flex-1 text-center transition-all ${isTensActive && step >= 2 && carry ? 'opacity-100 scale-110 text-rose-500' : 'opacity-0'}`}>
          {carry ? `+${carry}` : ''}
        </div>
        <div className="flex-1 text-center"></div>
      </div>

      {/* Top Number (A) */}
      <div className="flex w-full text-slate-700 mb-2">
        <div className="flex-1 text-center text-transparent">-</div>
        <div className={`flex-1 text-center transition-colors ${isTensActive ? 'text-indigo-600' : ''}`}>{aStr[leftIdx] !== ' ' ? aStr[leftIdx] : ''}</div>
        <div className={`flex-1 text-center transition-colors ${isUnitsActive ? 'text-indigo-600' : ''}`}>{aStr[rightIdx]}</div>
      </div>

      {/* Bottom Number (B) & Operator */}
      <div className="flex w-full text-slate-700 mb-4 pb-4 border-b-4 border-slate-300">
        <div className="flex-1 text-center text-slate-400">{operation}</div>
        <div className={`flex-1 text-center transition-colors ${isTensActive ? 'text-indigo-600' : ''}`}>{bStr[leftIdx] !== ' ' ? bStr[leftIdx] : ''}</div>
        <div className={`flex-1 text-center transition-colors ${isUnitsActive ? 'text-indigo-600' : ''}`}>{bStr[rightIdx]}</div>
      </div>

      {/* Answer Row */}
      <div className="flex w-full text-slate-800">
        <div className="flex-1"></div>
        <div className={`flex-1 text-center transition-all ${step >= 3 ? 'opacity-100 text-emerald-600 transform scale-110' : 'opacity-0'}`}>{ansStr[leftIdx] !== ' ' ? ansStr[leftIdx] : ''}</div>
        <div className={`flex-1 text-center transition-all ${step >= 1 ? 'opacity-100 text-emerald-600 transform scale-110' : 'opacity-0'}`}>{ansStr[rightIdx]}</div>
      </div>
    </div>
  );
};


// --- MAIN QUIZ ENGINE ---
export default function QuizEngine({ world, student, subject, onClose, onComplete }) {
  const [sessionQuestions, setSessionQuestions] = useState([]);
  const [qIdx, setQIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [timeLeft, setTimeLeft] = useState(45);
  const [generating, setGenerating] = useState(true);
  const [finished, setFinished] = useState(false);
  const [results, setResults] = useState({ score: 0, answers: [] });
  
  // Explanation & Interactive Stepper State
  const [showInteractiveExplanation, setShowInteractiveExplanation] = useState(false);
  const [explanationStep, setExplanationStep] = useState(0);
  const [explanationData, setExplanationData] = useState(null);
  
  const [eibText, setEibText] = useState("");
  const [eibFeedback, setEibFeedback] = useState("");
  const [loadingEIB, setLoadingEIB] = useState(false);

  const timerRef = useRef(null);

  useEffect(() => {
    // Generate prototype mock session
    generateSessionQuestions(4, "UK", 5, 50, "maths").then(qs => {
      setSessionQuestions(qs); setGenerating(false);
    });
  }, []);

  const handlePick = useCallback((idx) => {
    if (selected !== null) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setSelected(idx);
    
    const currQ = sessionQuestions[qIdx];
    
    if (idx === currQ.a) {
       setResults(r => ({ ...r, score: r.score + 1, answers: [...r.answers, { q: currQ.q, correct: true }] }));
    } else {
       setResults(r => ({ ...r, answers: [...r.answers, { q: currQ.q, correct: false }] }));
       
       // Answered incorrectly. Compute the explanation steps ready for the button click.
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
      setQIdx(qIdx + 1); setSelected(null); setTimeLeft(45);
      setExplanationData(null); setShowInteractiveExplanation(false); setExplanationStep(0);
      setEibText(""); setEibFeedback("");
    } else {
      setFinished(true);
      if (onComplete) onComplete(results);
    }
  };

  if (generating) return <div className="p-10 text-center text-xl font-bold">Generating...</div>;
  if (finished) return <div className="p-10 text-center text-3xl font-black text-indigo-600">Quest Complete!</div>;

  const q = sessionQuestions[qIdx];

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[4000] flex items-center justify-center p-4 md:p-8 text-slate-900">
      <div className="bg-white w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] relative">
        
        {/* Progress Bar */}
        <div className="h-3 bg-slate-100">
          <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${((qIdx + 1) / sessionQuestions.length) * 100}%` }} />
        </div>

        <div className="p-6 md:p-10 overflow-y-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
             <span className="font-black text-indigo-500 uppercase tracking-widest text-sm bg-indigo-50 px-4 py-2 rounded-xl">Q{qIdx + 1} of {sessionQuestions.length}</span>
             <div className={`text-2xl font-black ${timeLeft < 5 ? "text-rose-500 animate-pulse" : "text-slate-800"}`}>00:{timeLeft.toString().padStart(2, '0')}</div>
          </div>

          {/* Question Text */}
          <h3 className="text-3xl md:text-5xl font-black leading-tight text-slate-800 mb-10">{q.q}</h3>

          {/* Options Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {q.opts.map((opt, i) => {
              const isSelected = selected === i;
              const isCorrect = i === q.a;
              const isAnswered = selected !== null;

              let btnClasses = "bg-white border-slate-200 hover:border-indigo-500 text-slate-700";
              if (isAnswered) {
                if (isCorrect) btnClasses = "bg-emerald-50 border-emerald-500 text-emerald-700 ring-4 ring-emerald-100 z-10 scale-[1.02]";
                else if (isSelected) btnClasses = "bg-rose-50 border-rose-500 text-rose-700 ring-4 ring-rose-100 z-10 scale-[1.02]";
                else btnClasses = "bg-white border-slate-200 opacity-40 grayscale";
              }

              return (
                <button key={i} disabled={isAnswered} onClick={() => handlePick(i)} className={`w-full text-left p-6 md:p-8 rounded-[24px] font-black border-2 transition-all duration-300 text-2xl relative ${btnClasses}`}>
                  <div className="flex justify-between items-center">
                    <span>{opt}</span>
                    {isAnswered && isCorrect && <CheckCircleIcon className="text-emerald-500" size={32} />}
                    {isAnswered && isSelected && !isCorrect && <XCircleIcon className="text-rose-500" size={32} />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* POST-ANSWER FEEDBACK ZONE */}
          {selected !== null && (
            <div className="mt-8 animate-in slide-in-from-bottom-4 space-y-6 border-t-2 border-slate-100 pt-8">
              
              <div className="p-6 md:p-8 bg-slate-50 rounded-[24px] border-l-8 border-indigo-500 flex gap-5 items-center">
                <BrainIcon size={32} className="text-indigo-500 shrink-0" />
                <p className="font-bold text-slate-800 text-xl">{q.exp}</p>
              </div>

              {/* BRANCHING: Student got it wrong -> Show Help Options */}
              {selected !== q.a && !showInteractiveExplanation && (
                <div className="flex flex-col md:flex-row gap-4">
                   {/* Scaffolded Interactive Visuaization (Only shows if templates exist for this topic) */}
                   {explanationData && (
                     <button 
                       onClick={() => setShowInteractiveExplanation(true)} 
                       className="flex-1 bg-indigo-100 text-indigo-700 font-black py-5 px-6 rounded-2xl flex items-center justify-center gap-3 hover:bg-indigo-200 transition-colors text-lg border-2 border-indigo-200"
                     >
                       <EyeIcon size={24} /> Show Me How (Step-by-Step)
                     </button>
                   )}
                   
                   {/* Active Recall / Claude API */}
                   <button 
                     onClick={() => { document.getElementById('eib-box').focus(); }} 
                     className="flex-1 bg-amber-100 text-amber-800 font-black py-5 px-6 rounded-2xl flex items-center justify-center gap-3 hover:bg-amber-200 transition-colors text-lg border-2 border-amber-200"
                   >
                     <ZapIcon size={24} /> Explain It Back
                   </button>
                </div>
              )}

              {/* INTERACTIVE EXPLANATION STEPPER UI */}
              {showInteractiveExplanation && explanationData && (
                <div className="bg-indigo-50 p-6 md:p-10 rounded-[32px] border-2 border-indigo-200 shadow-inner animate-in zoom-in-95 duration-300">
                  <div className="flex justify-between items-center mb-6">
                     <h4 className="font-black text-indigo-800 uppercase tracking-widest text-sm flex items-center gap-2"><EyeIcon size={18}/> Step-by-Step Guide</h4>
                     <span className="bg-indigo-200 text-indigo-800 font-bold px-3 py-1 rounded-full text-sm">Step {explanationStep + 1} of {explanationData.steps.length}</span>
                  </div>

                  {/* Visual Renderer */}
                  <div className="mb-8">
                    {explanationData.visual === "place-value-chart" && (
                      <PlaceValueChart computed={explanationData.computed} step={explanationStep} />
                    )}
                  </div>

                  {/* Step Text */}
                  <div className="bg-white p-6 rounded-2xl border-2 border-indigo-100 text-center mb-8 shadow-sm">
                    <p className="text-2xl font-black text-indigo-900">{explanationData.steps[explanationStep]}</p>
                  </div>

                  {/* Stepper Controls */}
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

              {/* TRADITIONAL EXPLAIN IT BACK UI */}
              {selected !== q.a && !showInteractiveExplanation && (
                <div className="p-6 md:p-8 bg-amber-50 rounded-[32px] border-2 border-amber-200 mt-4">
                  <p className="text-amber-800 font-bold mb-4 text-lg">Or, try teaching Tara why <span className="underline font-black">{q.opts[q.a]}</span> is correct:</p>
                  <textarea id="eib-box" value={eibText} onChange={e => setEibText(e.target.value)} className="w-full p-5 rounded-2xl border-2 border-amber-100 font-bold mb-4 focus:outline-none focus:border-amber-400 bg-white shadow-inner text-lg" rows={3} placeholder="Explain your thinking here..." />
                  <button disabled={loadingEIB || !eibText.trim()} onClick={handleEIB} className="w-full bg-amber-500 text-white font-black py-5 rounded-2xl shadow-lg transition-all hover:scale-[1.02] text-lg disabled:opacity-50">
                    {loadingEIB ? "Tara is listening..." : "Explain it Back ✨"}
                  </button>
                  {eibFeedback && <div className="mt-6 p-6 bg-white rounded-2xl border-2 border-amber-100 text-amber-900 font-bold italic text-lg shadow-sm">{eibFeedback}</div>}
                </div>
              )}

              {/* NEXT QUEST BUTTON */}
              {((selected === q.a) || (selected !== q.a && (eibFeedback || (showInteractiveExplanation && explanationStep === explanationData.steps.length - 1)))) && (
                <button onClick={next} className="w-full bg-slate-900 text-white font-black py-6 rounded-[24px] flex items-center justify-center gap-3 shadow-xl hover:bg-black transition-all text-xl mt-6">
                  {qIdx === sessionQuestions.length - 1 ? "Complete Journey" : "Next Quest"} <ArrowRightIcon size={24} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
