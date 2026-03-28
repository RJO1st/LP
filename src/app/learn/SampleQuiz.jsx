/**
 * SampleQuiz.jsx
 * Deploy to: src/app/learn/[slug]/SampleQuiz.jsx
 *
 * Client component — renders 3 interactive sample questions.
 * No auth, no DB, no API calls. Pure client-side.
 */

"use client";
import React, { useState } from "react";
import Link from "next/link";

export default function SampleQuiz({ questions, subject }) {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  if (!questions?.length) return null;

  const q = questions[current];
  const isCorrect = selected === q.a;
  const answered = selected !== null;

  const handlePick = (i) => {
    if (answered) return;
    setSelected(i);
    if (i === q.a) setScore(s => s + 1);
  };

  const handleNext = () => {
    if (current < questions.length - 1) {
      setCurrent(c => c + 1);
      setSelected(null);
    } else {
      setFinished(true);
    }
  };

  if (finished) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center">
        <div className="text-4xl mb-3">{score === questions.length ? "🏆" : score >= 2 ? "⭐" : "🚀"}</div>
        <p className="text-xl font-black text-slate-900 mb-1">{score}/{questions.length} correct</p>
        <p className="text-sm text-slate-500 mb-5">
          {score === questions.length
            ? `Perfect score! Imagine what your child could do with thousands of adaptive questions.`
            : `Nice try! LaunchPard adapts to your child's level — making practice both challenging and achievable.`}
        </p>
        <Link
          href="/signup"
          className="inline-block bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black px-6 py-3 rounded-xl text-sm shadow-lg"
        >
          Get Full Access — Free for 30 Days →
        </Link>
        <button
          onClick={() => { setCurrent(0); setSelected(null); setScore(0); setFinished(false); }}
          className="block mx-auto mt-3 text-sm text-slate-400 font-bold hover:text-slate-600"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* Progress */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50">
        <span className="text-xs font-bold text-slate-400">Question {current + 1} of {questions.length}</span>
        <span className="text-xs font-bold text-indigo-600">{score} correct</span>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-slate-100">
        <div
          className="h-full bg-indigo-500 transition-all duration-300"
          style={{ width: `${((current + (answered ? 1 : 0)) / questions.length) * 100}%` }}
        />
      </div>

      <div className="p-5">
        {/* Question */}
        <p className="text-base font-bold text-slate-900 mb-5 leading-relaxed">{q.q}</p>

        {/* Options */}
        <div className="space-y-2.5 mb-5">
          {q.opts.map((opt, i) => {
            let style = "bg-white border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer";
            if (answered) {
              if (i === q.a) style = "bg-emerald-50 border-emerald-300 text-emerald-800";
              else if (i === selected && !isCorrect) style = "bg-rose-50 border-rose-300 text-rose-700";
              else style = "bg-white border-slate-100 text-slate-400";
            }
            return (
              <button
                key={i}
                onClick={() => handlePick(i)}
                disabled={answered}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 font-bold text-sm transition-all ${style}`}
              >
                <span className="inline-flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-black flex-shrink-0 ${
                    answered && i === q.a ? "bg-emerald-500 border-emerald-500 text-white"
                    : answered && i === selected ? "bg-rose-400 border-rose-400 text-white"
                    : "border-slate-300 text-slate-400"
                  }`}>
                    {answered && i === q.a ? "✓" : answered && i === selected ? "✗" : String.fromCharCode(65 + i)}
                  </span>
                  {opt}
                </span>
              </button>
            );
          })}
        </div>

        {/* Explanation (after answering) */}
        {answered && (
          <div className={`p-4 rounded-xl border-l-4 mb-4 ${isCorrect ? "bg-emerald-50 border-emerald-400" : "bg-amber-50 border-amber-400"}`}>
            <p className={`text-xs font-bold mb-1 ${isCorrect ? "text-emerald-700" : "text-amber-700"}`}>
              {isCorrect ? "Correct!" : "Not quite — here's why:"}
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">{q.exp}</p>
          </div>
        )}

        {/* Next / CTA */}
        {answered && (
          <button
            onClick={handleNext}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-3 rounded-xl text-sm transition-colors"
          >
            {current < questions.length - 1 ? "Next Question →" : "See Your Score →"}
          </button>
        )}
      </div>
    </div>
  );
}