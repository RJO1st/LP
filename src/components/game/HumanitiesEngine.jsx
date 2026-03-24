"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Globe, Scroll, Landmark, ArrowRight, CheckCircle, XCircle, Zap, MapPin, BookOpen, FileSearch } from "lucide-react";
import { supabase } from "../../lib/supabase";
import ContextPanel from "./ContextPanel";
import { getSubjectLabel } from "@/lib/subjectDisplay";

export default function HumanitiesEngine({
  student,
  subject, 
  sourceMaterial,
  questions,
  onComplete,
  onClose
}) {
  const [qIdx, setQIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [results, setResults] = useState({ score: 0, answers: [] });
  const [finished, setFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(420); // 7 minutes
  const [topicSummary, setTopicSummary] = useState({});

  const timerRef   = useRef(null);
  // Refs so timer-triggered finishQuest reads live state, not stale closure
  const answersRef  = useRef([]);
  const scoreRef    = useRef(0);

  const normalizedQuestions = React.useMemo(() => {
    if (!questions) return [];
    return questions.map(q => {
      const opts = [...q.opts];
      const actualA = typeof q.a === 'number' ? q.a : 0;
      const safeA = (actualA >= 0 && actualA < opts.length) ? actualA : 0;
      const correctOptText = opts[safeA];
      
      const shuffledOpts = [...opts];
      for (let i = shuffledOpts.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledOpts[i], shuffledOpts[j]] = [shuffledOpts[j], shuffledOpts[i]];
      }
      const newA = shuffledOpts.indexOf(correctOptText);
      return { ...q, opts: shuffledOpts, a: newA, correctAnswer: correctOptText };
    });
  }, [questions]);

  const currentQ = normalizedQuestions[qIdx];

  const theme = {
    history:        { color: "amber", Icon: Scroll,   bg: "bg-amber-50", border: "border-amber-100", text: "text-amber-900", accent: "text-amber-600", btn: "bg-amber-600 hover:bg-amber-700" },
    geography:      { color: "blue",  Icon: Globe,    bg: "bg-blue-50",  border: "border-blue-100",  text: "text-blue-900",  accent: "text-blue-600",  btn: "bg-blue-600 hover:bg-blue-700" },
    social_studies: { color: "cyan",  Icon: Landmark, bg: "bg-cyan-50",  border: "border-cyan-100",  text: "text-cyan-900",  accent: "text-cyan-600",  btn: "bg-cyan-600 hover:bg-cyan-700" }
  }[subject] || { color: "slate", Icon: BookOpen, bg: "bg-slate-50", border: "border-slate-100", text: "text-slate-900", accent: "text-slate-600", btn: "bg-slate-600 hover:bg-slate-700" };

  const SubjectIcon = theme.Icon;

  useEffect(() => {
    if (finished || !currentQ) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setFinished(true);
          finishQuest(answersRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [finished, currentQ]);

  const recordTopicResult = useCallback((topic, isCorrect) => {
    if (!topic) return;
    setTopicSummary(prev => {
      const entry = prev[topic] || { correct: 0, total: 0 };
      return { ...prev, [topic]: { correct: entry.correct + (isCorrect ? 1 : 0), total: entry.total + 1 } };
    });
  }, []);

  const handlePick = (idx) => {
    if (selected !== null) return;
    setSelected(idx);
    
    const isCorrect = idx === currentQ.a;
    setResults(r => {
      const next = { ...r, score: r.score + (isCorrect ? 1 : 0), answers: [...r.answers, { q: currentQ.q, isCorrect, correct: currentQ.opts[currentQ.a], myAnswer: currentQ.opts[idx] }] };
      answersRef.current = next.answers;
      return next;
    });
    recordTopicResult(currentQ.topic || subject, isCorrect);
  };

  const finishQuest = useCallback(async (overrideAnswers) => {
    const answers    = overrideAnswers ?? results.answers;
    const finalScore = answers.filter(a => a.isCorrect).length;
    const accuracy   = normalizedQuestions.length > 0
      ? Math.round((finalScore / normalizedQuestions.length) * 100) : 0;
    const totalScore = finalScore * 10;

    if (student?.id) {
      const details = normalizedQuestions.map((q, i) => {
        const answered = results.answers[i];
        return {
          question_id: q.id || null,
          subject: subject,
          topic: q.topic || "humanities",
          correct: answered?.isCorrect ?? false,
        };
      });

      await supabase.from("quiz_results").insert({
        scholar_id: student.id,
        subject: subject,
        score: finalScore,
        total_questions: normalizedQuestions.length,
        completed_at: new Date().toISOString(),
        details,
      });
      await supabase.rpc("update_scholar_skills",  { p_scholar_id: student.id, p_details: details });
      await supabase.rpc("increment_scholar_xp",   { s_id: student.id, xp_to_add: totalScore });
    }

    if (onComplete) onComplete({ score: finalScore, totalScore, accuracy, answers, topicSummary });
  }, [results, normalizedQuestions, student, subject, onComplete, topicSummary]);

  const next = () => {
    if (qIdx < normalizedQuestions.length - 1) {
      setQIdx(p => p + 1);
      setSelected(null);
    } else {
      setFinished(true);
      finishQuest();
    }
  };

  if (!currentQ) {
    return (
      <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[5000] flex items-center justify-center p-4">
        <div className="bg-white rounded-[40px] p-6 text-center max-w-xs w-full shadow-2xl">
          <SubjectIcon size={48} className={`mx-auto mb-4 animate-bounce ${theme.accent}`} />
          <h3 className="text-xl font-black text-slate-800 mb-1">Loading Source...</h3>
          <p className="text-sm text-slate-500 font-bold">Unearthing historical documents.</p>
        </div>
      </div>
    );
  }

  if (finished) {
    const finalScore = results.answers.filter(a => a.isCorrect).length;
    return (
      <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[5000] flex items-center justify-center p-4">
        <div className="bg-white rounded-[40px] p-8 text-center max-w-sm w-full shadow-2xl border-b-4 border-slate-200">
          <FileSearch size={56} className={`mx-auto mb-4 ${theme.accent}`} />
          <h2 className={`text-2xl font-black mb-2 ${theme.text}`}>Analysis Complete!</h2>
          <p className="text-slate-500 font-bold mb-6">You scored {finalScore} out of {normalizedQuestions.length}</p>
          <button
            onClick={() => onClose?.()}
            className={`w-full text-white font-black py-4 rounded-2xl text-base shadow border-b-4 transition-all active:border-b-0 active:translate-y-1 ${theme.btn} border-black/20`}
          >
            Return to Base
          </button>
        </div>
      </div>
    );
  }

  const isCorrectAnswer = selected === currentQ.a;

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[4000] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-6xl h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border-b-4 border-slate-200">
        
        {/* Header */}
        <div className={`h-16 px-6 ${theme.bg} border-b ${theme.border} flex items-center justify-between shrink-0`}>
          <div className="flex items-center gap-3">
            <div className={`${theme.btn} text-white p-2 rounded-xl`}>
              <SubjectIcon size={20} />
            </div>
            <div>
              <h2 className={`font-black leading-none uppercase tracking-wide ${theme.text}`}>
                {getSubjectLabel(subject)} Source Analysis
              </h2>
              <span className={`text-xs font-bold uppercase tracking-widest ${theme.accent}`}>
                Question {qIdx + 1} of {normalizedQuestions.length}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className={`text-xl font-black tabular-nums ${timeLeft < 60 ? "text-rose-500 animate-pulse" : "text-slate-700"}`}>
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </div>
            <button onClick={() => onClose?.()} className="text-slate-400 hover:text-rose-500 transition-colors">
              <XCircle size={28} />
            </button>
          </div>
        </div>

        {/* Split Content */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left: Context Anchor — stays frozen while questions change */}
          <div className="hidden sm:flex w-[45%] flex-col overflow-hidden shrink-0">
            <ContextPanel
              anchor={{
                title:         sourceMaterial?.title       || "Source Material",
                description:   sourceMaterial?.context     || sourceMaterial?.sourceText || null,
                image_url:     sourceMaterial?.image_url   || currentQ?.image_url   || null,
                latex_formulas: sourceMaterial?.formulas   || currentQ?.latex_formulas || [],
                svg_content:   sourceMaterial?.svg_content || currentQ?.svg_content || null,
                data_table:    sourceMaterial?.data_table  || currentQ?.data_table  || null,
              }}
              theme={theme}
              className="flex-1"
            />
          </div>

          {/* Right: Question Engine */}
          <div className="w-1/2 p-8 overflow-y-auto bg-white flex flex-col">
            <div className="max-w-lg mx-auto w-full flex-1">
              
              <h3 className="text-xl font-black text-slate-800 mb-6">{currentQ.q}</h3>

              <div className="space-y-3 mb-6">
                {currentQ.opts.map((opt, i) => {
                  const isAnswered = selected !== null;
                  const isOptionCorrect = i === currentQ.a;
                  const isSelected = selected === i;
                  
                  let cls = "bg-white border-slate-200 hover:border-slate-400 text-slate-700";
                  if (isAnswered) {
                    if (isOptionCorrect) cls = "bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-100";
                    else if (isSelected) cls = "bg-rose-50 border-rose-500 text-rose-700 ring-2 ring-rose-100";
                    else cls = "bg-white border-slate-100 opacity-40 grayscale";
                  }

                  return (
                    <button 
                      key={i} 
                      disabled={isAnswered} 
                      onClick={() => handlePick(i)}
                      className={`w-full p-4 rounded-2xl font-bold border-2 transition-all text-left flex justify-between items-center ${cls}`}
                    >
                      <span className="text-[15px]">{opt}</span>
                      {isAnswered && isOptionCorrect && <CheckCircle className="text-emerald-500 shrink-0" size={20}/>}
                      {isAnswered && isSelected && !isOptionCorrect && <XCircle className="text-rose-500 shrink-0" size={20}/>}
                    </button>
                  );
                })}
              </div>

              {/* Feedback Area */}
              {selected !== null && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 mt-6 pt-6 border-t border-slate-100">
                  <div className={`p-4 rounded-2xl border-l-4 flex gap-3 items-start mb-4 ${theme.bg} ${theme.border} text-slate-800`}>
                    <Zap size={24} className={`shrink-0 ${theme.accent}`}/>
                    <p className="text-sm font-bold leading-relaxed">{currentQ.exp}</p>
                  </div>

                  <button 
                    onClick={next}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 text-base border-b-4 border-black transition-all active:border-b-0 active:translate-y-1"
                  >
                    {qIdx === normalizedQuestions.length - 1 ? "Complete Analysis" : "Next Question"}
                    <ArrowRight size={20}/>
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}