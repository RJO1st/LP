"use client";

import React from "react";
// Icons inlined — avoids fragile ../ui/Icons dependency
// If you have src/components/ui/Icons.jsx you can swap to:
//   import { BookIcon, XCircleIcon } from "../ui/Icons";

const BookIcon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
  </svg>
);

const XCircleIcon = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="m15 9-6 6"/><path d="m9 9 6 6"/>
  </svg>
);

const SUBJECT_BORDER = {
  maths:   "border-l-indigo-500",
  english: "border-l-blue-500",
  verbal:  "border-l-purple-500",
  nvr:     "border-l-teal-500",
};

/**
 * MistakeJournal
 *
 * Each `mistake` item shape (produced by QuizEngine's onComplete answers array):
 * {
 *   q:        string   — question text
 *   correct:  string   — correct answer TEXT  ← string, NOT boolean
 *   myAnswer: string   — what the student chose (optional)
 *   exp:      string   — explanation
 *   subject:  string   — "maths" | "english" | "verbal" | "nvr" (optional)
 *   isCorrect: false   — always false for mistakes
 * }
 */
export default function MistakeJournal({ mistakes, onClose }) {
  const safeMistakes = mistakes || [];

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[5000] flex items-center justify-center p-4 md:p-8">
      <div className="bg-white w-full max-w-3xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="p-6 md:p-8 bg-rose-50 border-b border-rose-100 flex justify-between items-center">
          <h2 className="text-2xl font-black text-rose-600 flex items-center gap-3">
            <BookIcon /> Mistake Journal
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-rose-400 hover:bg-rose-100 hover:text-rose-600 transition-all"
          >
            <XCircleIcon size={28} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 md:p-8 overflow-y-auto space-y-5 text-slate-900">

          {safeMistakes.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">🌟</div>
              <p className="text-slate-400 font-bold italic text-lg">
                Your journal is clean! Keep training to reach mastery.
              </p>
            </div>
          ) : (
            <>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                {safeMistakes.length} mistake{safeMistakes.length !== 1 ? "s" : ""} to review
              </p>

              {safeMistakes.map((m, i) => {
                const borderCls = SUBJECT_BORDER[m.subject] || "border-l-rose-400";
                return (
                  <div
                    key={i}
                    className={`p-5 bg-slate-50 rounded-2xl border-2 border-l-4 border-slate-100 ${borderCls}
                                shadow-sm hover:border-rose-200 transition-colors`}
                  >
                    {/* Question */}
                    <p className="font-black text-slate-800 text-base mb-3 leading-relaxed">
                      {m.q}
                    </p>

                    {/* Answers row */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {/* Student's wrong answer */}
                      {m.myAnswer && (
                        // ✅ inline-flex (not flex + inline-block — those conflict)
                        <div className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 font-bold px-3 py-1.5 rounded-xl text-sm">
                          ✗ Your answer: <span className="font-black">{m.myAnswer}</span>
                        </div>
                      )}
                      {/* Correct answer — m.correct is always the answer TEXT, not a boolean */}
                      <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 font-bold px-3 py-1.5 rounded-xl text-sm">
                        ✓ Correct: <span className="font-black">{m.correct}</span>
                      </div>
                    </div>

                    {/* Explanation */}
                    {m.exp && (
                      <div className="bg-white p-4 rounded-xl border border-slate-200">
                        <p className="text-indigo-600 font-black text-[10px] uppercase tracking-widest mb-1">
                          Logic Coach
                        </p>
                        <p className="text-slate-600 font-bold text-sm leading-relaxed">{m.exp}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>

      </div>
    </div>
  );
}