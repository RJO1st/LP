"use client";
/**
 * ScholarStartGuide.jsx
 * Deploy to: src/components/ScholarStartGuide.jsx
 *
 * Shows after a parent adds a scholar. Gives clear next steps.
 * Usage:
 *   <ScholarStartGuide scholarName="Yele" codename="STARFOX" pin="1234" onDismiss={() => {}} />
 */

import React, { useState } from "react";

export default function ScholarStartGuide({ scholarName, codename, pin, onDismiss }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const text = `Your LaunchPard login:\nCodename: ${codename}\nPIN: ${pin}\n\nGo to launchpard.com and click "Scholar" to sign in.`;
    try { await navigator.clipboard.writeText(text); } catch {
      const el = document.createElement("textarea"); el.value = text;
      document.body.appendChild(el); el.select(); document.execCommand("copy"); document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-[6000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5 text-white text-center">
          <div className="text-4xl mb-2">🎉</div>
          <h2 className="text-xl font-black">{scholarName} is ready to learn!</h2>
          <p className="text-indigo-200 text-sm mt-1">Here's how to get started</p>
        </div>

        <div className="px-6 py-5 space-y-4">

          {/* Step 1: Login credentials */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center">1</span>
              <span className="text-sm font-black text-indigo-900">Scholar login details</span>
            </div>
            <div className="bg-white rounded-xl p-3 border border-indigo-100 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-bold">Codename</span>
                <span className="text-sm font-black text-slate-800 tracking-wider">{codename}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-bold">PIN</span>
                <span className="text-sm font-black text-slate-800 tracking-[0.3em]">{pin}</span>
              </div>
            </div>
            <button onClick={handleCopy}
              className={`mt-2 w-full py-2 rounded-xl text-xs font-bold transition-all ${
                copied
                  ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                  : "bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border border-indigo-200"
              }`}>
              {copied ? "Copied! ✓" : "Copy login details"}
            </button>
          </div>

          {/* Step 2 */}
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">2</span>
            <div>
              <p className="text-sm font-black text-slate-800">Let them sign in</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Go to <span className="font-bold text-indigo-600">launchpard.com</span> → Login → tap <span className="font-bold">Scholar</span> → enter codename and PIN
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">3</span>
            <div>
              <p className="text-sm font-black text-slate-800">Start their first quest</p>
              <p className="text-xs text-slate-500 mt-0.5">
                They'll see a personalised dashboard. Tap <span className="font-bold">Start Adventure</span> to begin. 
                Tara (the AI tutor) will guide them through each question.
              </p>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3">
            <p className="text-xs font-black text-amber-800 mb-1.5">Tips for parents</p>
            <ul className="text-xs text-amber-700 space-y-1">
              <li className="flex items-start gap-1.5">
                <span className="shrink-0">📱</span>
                <span>Works on phone, tablet, or laptop — no app download needed</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="shrink-0">⏰</span>
                <span>10–15 minutes daily is enough — consistency beats long sessions</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="shrink-0">📊</span>
                <span>Check your parent dashboard for progress reports and weekly summaries</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="shrink-0">🎯</span>
                <span>The AI adapts to their level — no need to choose difficulty</span>
              </li>
            </ul>
          </div>

          {/* CTA */}
          <button onClick={onDismiss}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black text-sm transition-all">
            Got it — go to dashboard
          </button>
        </div>
      </div>
    </div>
  );
}