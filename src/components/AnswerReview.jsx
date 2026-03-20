/**
 * AnswerReview.jsx
 * Deploy to: src/components/AnswerReview.jsx
 *
 * Post-quest answer review. Shows every question with:
 *  - The scholar's answer (green if correct, red if wrong)
 *  - The correct answer highlighted
 *  - The explanation
 *  - Topic tag
 *
 * Used inside EngineFinished or as a standalone review page.
 *
 * Props:
 *   answers      — array of { q, opts, correctIdx, chosenIdx, isCorrect, exp, topic }
 *   scholarName  — for display
 *   subject      — subject key
 *   onClose      — callback to dismiss
 */

"use client";
import React, { useState } from "react";

function topicLabel(t) {
  return (t || "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
    .replace(/\bOf\b/g, "of").replace(/\bAnd\b/g, "&").slice(0, 30);
}

export default function AnswerReview({ answers = [], scholarName = "Scholar", subject, onClose }) {
  const [filter, setFilter] = useState("all"); // "all" | "wrong" | "correct"

  if (!answers.length) return null;

  const filtered = filter === "all" ? answers
    : filter === "wrong" ? answers.filter(a => !a.isCorrect)
    : answers.filter(a => a.isCorrect);

  const correctCount = answers.filter(a => a.isCorrect).length;
  const wrongCount = answers.length - correctCount;
  const pct = Math.round((correctCount / answers.length) * 100);

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[6000] flex items-center justify-center p-3">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-black text-slate-900 text-lg">Answer Review</h2>
            <p className="text-xs text-slate-400 font-bold">{scholarName} · {correctCount}/{answers.length} correct ({pct}%)</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Summary bar */}
        <div className="px-5 py-3 border-b border-slate-50 flex items-center gap-3 shrink-0">
          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex gap-1.5">
            {[
              { key: "all", label: `All (${answers.length})`, color: "slate" },
              { key: "wrong", label: `Wrong (${wrongCount})`, color: "rose" },
              { key: "correct", label: `Correct (${correctCount})`, color: "emerald" },
            ].map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all ${
                  filter === f.key
                    ? f.color === "rose" ? "bg-rose-100 text-rose-700"
                      : f.color === "emerald" ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-200 text-slate-700"
                    : "text-slate-400 hover:text-slate-600"
                }`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Questions list */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {filtered.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-3xl block mb-2">{filter === "wrong" ? "🎉" : "📝"}</span>
              <p className="text-sm text-slate-500 font-bold">
                {filter === "wrong" ? "No wrong answers — perfect score!" : "No questions to show"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((a, i) => {
                const qNum = answers.indexOf(a) + 1;
                return (
                  <div key={i} className={`rounded-xl border overflow-hidden ${
                    a.isCorrect ? "border-emerald-100" : "border-rose-100"
                  }`}>
                    {/* Question header */}
                    <div className={`px-4 py-2.5 flex items-start gap-2.5 ${
                      a.isCorrect ? "bg-emerald-50" : "bg-rose-50"
                    }`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-black ${
                        a.isCorrect ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
                      }`}>
                        {a.isCorrect ? "✓" : "✗"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 leading-relaxed">{a.q}</p>
                        {a.topic && (
                          <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded mt-1 inline-block">
                            {topicLabel(a.topic)}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-slate-300 shrink-0">Q{qNum}</span>
                    </div>

                    {/* Options */}
                    {a.opts && (
                      <div className="px-4 py-2 space-y-1">
                        {a.opts.map((opt, oi) => {
                          const isCorrectOpt = oi === a.correctIdx;
                          const isChosenOpt = oi === a.chosenIdx;
                          const isWrongChoice = isChosenOpt && !a.isCorrect;

                          let optStyle = "bg-white text-slate-500 border-slate-100";
                          if (isCorrectOpt) optStyle = "bg-emerald-50 text-emerald-800 border-emerald-200 font-bold";
                          if (isWrongChoice) optStyle = "bg-rose-50 text-rose-700 border-rose-200 font-bold";

                          return (
                            <div key={oi} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[11px] ${optStyle}`}>
                              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 ${
                                isCorrectOpt ? "bg-emerald-500 text-white"
                                : isWrongChoice ? "bg-rose-400 text-white"
                                : "bg-slate-100 text-slate-400"
                              }`}>
                                {isCorrectOpt ? "✓" : isWrongChoice ? "✗" : String.fromCharCode(65 + oi)}
                              </span>
                              <span className="flex-1">{opt}</span>
                              {isChosenOpt && !isCorrectOpt && (
                                <span className="text-[8px] text-rose-400 font-bold uppercase">Your answer</span>
                              )}
                              {isCorrectOpt && (
                                <span className="text-[8px] text-emerald-500 font-bold uppercase">Correct</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Explanation */}
                    {a.exp && (
                      <div className="px-4 py-2.5 border-t border-slate-50 bg-slate-50">
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          <span className="font-black text-indigo-600">Why: </span>{a.exp}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 shrink-0">
          <button onClick={onClose}
            className="w-full py-2.5 rounded-xl font-bold text-sm bg-slate-900 hover:bg-slate-800 text-white transition-colors">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}