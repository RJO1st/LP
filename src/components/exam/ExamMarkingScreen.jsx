"use client";

import React, { useState, useEffect } from "react";

/**
 * ExamMarkingScreen.jsx
 *
 * Beautiful loading/progress screen shown while exam is being marked.
 * Space theme with animated progress and motivational messages.
 *
 * Props:
 *   - progress: number (0–100)
 *   - totalQuestions: number
 *   - error: string | null
 *   - onRetry: fn() — callback to retry marking if error occurs
 */

const MOTIVATIONAL_MESSAGES = [
  "Checking your algebra...",
  "Reviewing your method marks...",
  "Grading your explanations...",
  "Analyzing your reasoning...",
  "Almost done...",
  "Just a few more seconds...",
  "Your tutor Tara is impressed...",
  "Finalizing your score...",
];

export default function ExamMarkingScreen({
  progress = 0,
  totalQuestions = 24,
  error = null,
  onRetry,
}) {
  const [messageIdx, setMessageIdx] = useState(0);
  const [displayedProgress, setDisplayedProgress] = useState(0);

  // Animate progress bar
  useEffect(() => {
    if (displayedProgress >= progress) return;
    const timer = setTimeout(() => {
      setDisplayedProgress((p) => Math.min(p + Math.random() * 15, progress));
    }, 300);
    return () => clearTimeout(timer);
  }, [displayedProgress, progress]);

  // Cycle motivational messages
  useEffect(() => {
    if (error || displayedProgress >= 100) return;
    const timer = setTimeout(() => {
      setMessageIdx((idx) => (idx + 1) % MOTIVATIONAL_MESSAGES.length);
    }, 2000);
    return () => clearTimeout(timer);
  }, [messageIdx, error, displayedProgress]);

  return (
    <div className="fixed inset-0 bg-slate-900 flex items-center justify-center z-50 overflow-hidden">
      {/* Starfield background */}
      <div className="absolute inset-0">
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white pointer-events-none"
            style={{
              width: Math.random() * 2 + 0.5,
              height: Math.random() * 2 + 0.5,
              opacity: Math.random() * 0.7 + 0.3,
              left: Math.random() * 100 + "%",
              top: Math.random() * 100 + "%",
              animation: `twinkle ${2 + Math.random() * 3}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Central card */}
      <div className="relative z-10 max-w-md w-full mx-4">
        <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl p-8 shadow-2xl border border-slate-700">
          {/* Tara avatar / icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <div className="text-4xl">🤖</div>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-center text-white font-black text-xl mb-2">
            Marking Your Exam
          </h2>
          <p className="text-center text-slate-400 text-sm mb-6">
            Tara is reviewing your answers...
          </p>

          {/* Error state */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6 text-center">
              <p className="text-red-400 text-sm font-semibold mb-3">
                {error}
              </p>
              <button
                onClick={onRetry}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Progress section */}
          {!error && (
            <>
              {/* Question progress */}
              <div className="text-center mb-6">
                <p className="text-slate-300 text-sm font-bold mb-2">
                  Marking Question {Math.floor((displayedProgress / 100) * totalQuestions)} of {totalQuestions}
                </p>

                {/* Progress bar */}
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300 rounded-full"
                    style={{ width: `${displayedProgress}%` }}
                  />
                </div>

                {/* Percentage */}
                <p className="text-slate-400 text-xs mt-2">
                  {Math.round(displayedProgress)}% complete
                </p>
              </div>

              {/* Motivational message */}
              <div className="text-center mb-4 h-12 flex items-center justify-center">
                <p className="text-slate-300 text-sm italic">
                  {MOTIVATIONAL_MESSAGES[messageIdx]}
                </p>
              </div>

              {/* Animated dots */}
              <div className="flex justify-center gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full bg-indigo-400"
                    style={{
                      animation: `pulse 1.5s ease-in-out infinite`,
                      animationDelay: `${i * 0.3}s`,
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* CSS animations */}
      <style jsx>{`
        @keyframes twinkle {
          0%, 100% {
            opacity: 0.3;
          }
          50% {
            opacity: 0.9;
          }
        }
        @keyframes pulse {
          0%, 100% {
            opacity: 0.3;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.2);
          }
        }
      `}</style>
    </div>
  );
}
