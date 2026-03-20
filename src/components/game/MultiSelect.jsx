"use client";
// ─── Deploy to: src/components/game/MultiSelect.jsx ──────────────────────────
// "Choose all that apply" question type. Renders options as checkboxes.
//
// Integration with QuizShell:
//   When question_type === "multi_select", render this component instead of
//   the standard radio-button options.
//
// Props:
//   options: ["Option A", "Option B", "Option C", "Option D"]
//   correctIndices: [0, 2]  — indices of all correct answers
//   onSubmit: (selectedIndices) => void
//   disabled: boolean (after submission)
//   showFeedback: boolean (after submission)
//   theme: { accentHex }

import React, { useState } from "react";
import { CheckCircle, XCircle, Square, CheckSquare } from "lucide-react";

export default function MultiSelect({
  options = [],
  correctIndices = [],
  onSubmit,
  disabled = false,
  showFeedback = false,
  theme = {},
}) {
  const [selected, setSelected] = useState(new Set());
  const [submitted, setSubmitted] = useState(false);

  const toggle = (idx) => {
    if (disabled || submitted) return;
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleSubmit = () => {
    if (selected.size === 0 || submitted) return;
    setSubmitted(true);
    if (onSubmit) onSubmit([...selected]);
  };

  const correctSet = new Set(correctIndices);
  const isFullyCorrect = submitted && selected.size === correctSet.size &&
    [...selected].every(i => correctSet.has(i));

  // Scoring: how many correct selections vs total correct
  const correctSelections = submitted ? [...selected].filter(i => correctSet.has(i)).length : 0;
  const incorrectSelections = submitted ? [...selected].filter(i => !correctSet.has(i)).length : 0;
  const partialScore = submitted
    ? Math.max(0, (correctSelections - incorrectSelections) / correctSet.size)
    : 0;

  const accent = theme.accentHex || "#6366f1";

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Instruction */}
      <div className="flex items-center gap-2 mb-1">
        <div className="w-5 h-5 rounded bg-amber-100 flex items-center justify-center">
          <CheckSquare size={12} className="text-amber-600" />
        </div>
        <p className="text-xs font-bold text-amber-700">
          Select ALL correct answers
        </p>
      </div>

      {/* Options */}
      {options.map((opt, idx) => {
        const isSelected = selected.has(idx);
        const isCorrect = correctSet.has(idx);
        const wasSelectedCorrectly = submitted && isSelected && isCorrect;
        const wasSelectedIncorrectly = submitted && isSelected && !isCorrect;
        const wasMissed = submitted && !isSelected && isCorrect;

        let borderColor = isSelected ? accent : "#e2e8f0";
        let bgColor = isSelected ? `${accent}08` : "white";
        let textColor = "#334155";

        if (showFeedback && submitted) {
          if (wasSelectedCorrectly) {
            borderColor = "#10b981"; bgColor = "#ecfdf5"; textColor = "#065f46";
          } else if (wasSelectedIncorrectly) {
            borderColor = "#ef4444"; bgColor = "#fef2f2"; textColor = "#991b1b";
          } else if (wasMissed) {
            borderColor = "#f59e0b"; bgColor = "#fffbeb"; textColor = "#92400e";
          }
        }

        return (
          <button
            key={idx}
            onClick={() => toggle(idx)}
            disabled={disabled || submitted}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left text-sm font-semibold transition-all
              ${!disabled && !submitted ? "hover:shadow-md active:scale-[0.98]" : ""}
            `}
            style={{ borderColor, background: bgColor, color: textColor }}
          >
            {/* Checkbox */}
            <div className="shrink-0">
              {showFeedback && submitted ? (
                wasSelectedCorrectly ? <CheckCircle size={18} className="text-green-500" /> :
                wasSelectedIncorrectly ? <XCircle size={18} className="text-red-500" /> :
                wasMissed ? <CheckCircle size={18} className="text-amber-400" /> :
                <Square size={18} className="text-slate-300" />
              ) : (
                isSelected
                  ? <CheckSquare size={18} style={{ color: accent }} />
                  : <Square size={18} className="text-slate-300" />
              )}
            </div>

            {/* Option text */}
            <span className="flex-1">{opt}</span>

            {/* Feedback labels */}
            {showFeedback && submitted && (
              <span className="text-[10px] font-bold uppercase shrink-0">
                {wasSelectedCorrectly && <span className="text-green-600">✓ Correct</span>}
                {wasSelectedIncorrectly && <span className="text-red-500">✗ Wrong</span>}
                {wasMissed && <span className="text-amber-500">← Missed</span>}
              </span>
            )}
          </button>
        );
      })}

      {/* Submit button */}
      {!submitted && (
        <button
          onClick={handleSubmit}
          disabled={selected.size === 0}
          className={`w-full mt-2 py-3 rounded-xl font-bold text-sm text-white transition-all active:scale-[0.98]
            ${selected.size > 0 ? "shadow-md" : "opacity-50 cursor-not-allowed"}
          `}
          style={{ background: selected.size > 0 ? accent : "#94a3b8" }}
        >
          Check Answers ({selected.size} selected)
        </button>
      )}

      {/* Score feedback */}
      {showFeedback && submitted && (
        <div className={`rounded-xl p-3 text-center text-sm font-bold ${isFullyCorrect ? "bg-green-50 text-green-700 border border-green-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
          {isFullyCorrect
            ? "🎉 Perfect — all correct!"
            : `${correctSelections}/${correctSet.size} correct ${incorrectSelections > 0 ? `(${incorrectSelections} wrong selection${incorrectSelections > 1 ? "s" : ""})` : ""}`
          }
        </div>
      )}
    </div>
  );
}

// ── Helper: Score a multi-select answer ──────────────────────────────────────
export function scoreMultiSelect(selectedIndices, correctIndices) {
  const correctSet = new Set(correctIndices);
  const selectedSet = new Set(selectedIndices);
  const correct = [...selectedSet].filter(i => correctSet.has(i)).length;
  const incorrect = [...selectedSet].filter(i => !correctSet.has(i)).length;
  const total = correctSet.size;
  // Partial credit: each correct +1, each incorrect -1, min 0, max = total
  const raw = Math.max(0, correct - incorrect);
  return {
    score: raw / total,         // 0.0 to 1.0
    isFullyCorrect: raw === total && incorrect === 0,
    correct,
    incorrect,
    missed: total - correct,
  };
}