"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";

/**
 * ExamRunner.jsx
 *
 * Full exam-taking interface for LaunchPard scholars.
 * Handles timer, question navigation, answer collection, auto-save, and submission.
 *
 * Props:
 *   sittingId: string (UUID of exam_sittings row)
 *   paper: { id, exam_board, subject, component_code, tier, year, session, total_marks, duration_minutes, calculator_allowed }
 *   questions: array from API (ordered by display_order, answers stripped)
 *   mode: "timed" | "practice" | "topic_focus" | "review"
 *   initialTimeRemaining: number (seconds for timed mode)
 *   onFinish: callback({ sittingId, totalAnswered })
 */

export default function ExamRunner({
  sittingId,
  paper,
  questions,
  mode = "timed",
  initialTimeRemaining = 3600,
  onFinish,
}) {
  // ── STATE ──────────────────────────────────────────────────────────────────────
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState(new Map()); // Map<questionId, { text, data, flagged, timeSpent }>
  const [timeRemaining, setTimeRemaining] = useState(initialTimeRemaining);
  const [saving, setSaving] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [showQuestionPalette, setShowQuestionPalette] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // "saving", "saved", null
  const [examFinished, setExamFinished] = useState(false);

  // ── REFS ───────────────────────────────────────────────────────────────────────
  const timerIntervalRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const questionStartTimeRef = useRef(Date.now());
  const examStartTimeRef = useRef(Date.now());

  const currentQuestion = questions[currentQuestionIndex];
  const isTimed = mode === "timed";
  const isReview = mode === "review";

  // ── TIMER EFFECT ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isTimed || examFinished) return;

    timerIntervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        const next = Math.max(0, prev - 1);
        if (next === 0) {
          // Time's up — auto-submit
          handleFinishExam(true);
        }
        return next;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isTimed, examFinished]);

  // ── AUTO-SAVE EFFECT ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (isReview || !currentQuestion || examFinished) return;

    // Debounced auto-save on answer change
    const autoSave = async () => {
      const answer = answers.get(currentQuestion.id);
      if (!answer) return;

      setSaveStatus("saving");
      try {
        const response = await fetch(`/api/exam-sittings/${sittingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "submit_answer",
            question_id: currentQuestion.id,
            answer_text: answer.text || answer.data || "",
            working: answer.working || null,
            marks_available: currentQuestion.marks || 1,
            time_spent_seconds: answer.timeSpent || 0,
          }),
        });

        if (response.ok) {
          setSaveStatus("saved");
          setTimeout(() => setSaveStatus(null), 2000);
        } else {
          console.error("[ExamRunner] Auto-save failed:", response.statusText);
        }
      } catch (err) {
        console.error("[ExamRunner] Auto-save error:", err);
      }
    };

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(autoSave, 2000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [answers, currentQuestion, sittingId, isReview, examFinished]);

  // ── HANDLERS ───────────────────────────────────────────────────────────────────
  const handleAnswerChange = useCallback(
    (input) => {
      setAnswers((prev) => {
        const updated = new Map(prev);
        const answer = updated.get(currentQuestion.id) || {};
        updated.set(currentQuestion.id, {
          ...answer,
          text: input || answer.data,
          data: input || answer.data,
        });
        return updated;
      });
    },
    [currentQuestion]
  );

  const handleToggleFlag = useCallback(() => {
    setAnswers((prev) => {
      const updated = new Map(prev);
      const answer = updated.get(currentQuestion.id) || {};
      updated.set(currentQuestion.id, {
        ...answer,
        flagged: !answer.flagged,
      });
      return updated;
    });
  }, [currentQuestion]);

  const handleNavigateQuestion = useCallback(
    (index) => {
      // Record time spent on current question
      if (currentQuestion) {
        const timeSpent = Math.round((Date.now() - questionStartTimeRef.current) / 1000);
        setAnswers((prev) => {
          const updated = new Map(prev);
          const answer = updated.get(currentQuestion.id) || {};
          updated.set(currentQuestion.id, {
            ...answer,
            timeSpent: (answer.timeSpent || 0) + timeSpent,
          });
          return updated;
        });
      }

      // Reset timer for new question
      questionStartTimeRef.current = Date.now();
      setCurrentQuestionIndex(Math.max(0, Math.min(index, questions.length - 1)));
    },
    [currentQuestion, questions.length]
  );

  const handlePreviousQuestion = useCallback(() => {
    handleNavigateQuestion(currentQuestionIndex - 1);
  }, [currentQuestionIndex, handleNavigateQuestion]);

  const handleNextQuestion = useCallback(() => {
    handleNavigateQuestion(currentQuestionIndex + 1);
  }, [currentQuestionIndex, handleNavigateQuestion]);

  const handleFinishExam = useCallback(
    async (isAutoSubmit = false) => {
      if (examFinished) return;

      setExamFinished(true);

      if (!isAutoSubmit) {
        // Show confirmation modal first
        setShowFinishModal(true);
        return;
      }

      // Auto-submit or confirmed: submit all answers
      try {
        const totalAnswered = Array.from(answers.values()).filter(
          (a) => a.text || a.data
        ).length;

        setSaving(true);
        const response = await fetch(`/api/exam-sittings/${sittingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "finish",
            time_used_seconds: Math.round((Date.now() - examStartTimeRef.current) / 1000),
          }),
        });

        if (response.ok) {
          setSaving(false);
          onFinish?.({ sittingId, totalAnswered });
        } else {
          console.error("[ExamRunner] Finish failed:", response.statusText);
          setSaving(false);
        }
      } catch (err) {
        console.error("[ExamRunner] Finish error:", err);
        setSaving(false);
      }
    },
    [answers, sittingId, onFinish, examFinished]
  );

  const handleConfirmFinish = useCallback(() => {
    setShowFinishModal(false);
    handleFinishExam(true);
  }, [handleFinishExam]);

  // ── FORMATTERS ─────────────────────────────────────────────────────────────────
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getTimerColor = () => {
    if (timeRemaining <= 60) return "text-red-600";
    if (timeRemaining <= 300) return "text-amber-600";
    return "text-slate-700";
  };

  const getTimerBgColor = () => {
    if (timeRemaining <= 60) return "bg-red-50";
    if (timeRemaining <= 300) return "bg-amber-50";
    return "bg-slate-50";
  };

  const getTimerPulse = () => {
    return timeRemaining <= 60 ? "animate-pulse" : "";
  };

  // ── QUESTION STATS ──────────────────────────────────────────────────────────────
  const answeredCount = Array.from(answers.values()).filter(
    (a) => a.text || a.data
  ).length;
  const flaggedCount = Array.from(answers.values()).filter(
    (a) => a.flagged
  ).length;
  const unansweredCount = questions.length - answeredCount;

  // ── RENDER ANSWER INPUT (by type) ──────────────────────────────────────────────
  const renderAnswerInput = () => {
    if (isReview) {
      // In review mode, show scholar's answer + correct answer
      return (
        <div className="mt-6 space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm font-semibold text-blue-900 mb-2">Scholar's Answer:</p>
            <p className="text-blue-700">
              {answers.get(currentQuestion.id)?.text || "(No answer)"}
            </p>
          </div>
          {currentQuestion.answer && (
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm font-semibold text-green-900 mb-2">Correct Answer:</p>
              <p className="text-green-700">{currentQuestion.answer}</p>
            </div>
          )}
        </div>
      );
    }

    const answer = answers.get(currentQuestion.id) || {};
    const inputValue = answer.text || answer.data || "";

    switch (currentQuestion.answer_input_type) {
      case "text":
        return (
          <textarea
            className="w-full mt-4 p-4 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-base"
            rows={4}
            placeholder="Type your answer here..."
            value={inputValue}
            onChange={(e) => handleAnswerChange(e.target.value)}
          />
        );

      case "number":
        return (
          <div className="mt-4 flex gap-3">
            <input
              type="number"
              className="flex-1 p-4 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-base"
              placeholder="Enter number"
              value={inputValue}
              onChange={(e) => handleAnswerChange(e.target.value)}
            />
            {currentQuestion.unit && (
              <div className="flex items-center px-4 bg-slate-100 rounded-lg font-semibold text-slate-700">
                {currentQuestion.unit}
              </div>
            )}
          </div>
        );

      case "mcq_select":
        return (
          <div className="mt-6 space-y-3">
            {currentQuestion.options?.map((option, idx) => {
              const isSelected = inputValue === String(idx);
              return (
                <label
                  key={idx}
                  className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition ${
                    isSelected
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-300 hover:border-slate-400 bg-white"
                  }`}
                >
                  <input
                    type="radio"
                    name="mcq"
                    value={idx}
                    checked={isSelected}
                    onChange={(e) => handleAnswerChange(e.target.value)}
                    className="mt-1 mr-4"
                  />
                  <div>
                    <p className="font-semibold text-slate-900">
                      {String.fromCharCode(65 + idx)}.
                    </p>
                  </div>
                  <p className="ml-2 text-slate-700">{option}</p>
                </label>
              );
            })}
          </div>
        );

      case "working_area":
        return (
          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Working:
              </label>
              <textarea
                className="w-full p-4 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-base"
                rows={8}
                placeholder="Show your working here..."
                value={inputValue}
                onChange={(e) => handleAnswerChange(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Final Answer:
              </label>
              <input
                type="text"
                className="w-full p-4 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-base"
                placeholder="Enter your final answer..."
              />
            </div>
          </div>
        );

      case "essay":
        return (
          <div className="mt-4 relative">
            <textarea
              className="w-full p-4 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-base"
              rows={12}
              placeholder="Write your response here..."
              value={inputValue}
              onChange={(e) => handleAnswerChange(e.target.value)}
            />
            <div className="mt-2 text-right text-sm text-slate-600">
              {inputValue.split(/\s+/).filter((w) => w.length > 0).length} words
            </div>
          </div>
        );

      case "graph_sketch":
        return (
          <div className="mt-6 p-6 bg-blue-50 rounded-lg border border-blue-200 text-center">
            <p className="text-slate-700 mb-4">
              Graph sketching will be available soon. Please describe your graph in words:
            </p>
            <textarea
              className="w-full p-4 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-base"
              rows={6}
              placeholder="Describe your graph..."
              value={inputValue}
              onChange={(e) => handleAnswerChange(e.target.value)}
            />
          </div>
        );

      case "diagram_label":
        return (
          <div className="mt-6 space-y-4">
            {currentQuestion.diagram_labels?.map((label, idx) => (
              <div key={idx}>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Label {idx + 1}: {label}
                </label>
                <input
                  type="text"
                  className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  placeholder={`Enter label ${idx + 1}...`}
                />
              </div>
            ))}
          </div>
        );

      default:
        return (
          <textarea
            className="w-full mt-4 p-4 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-base"
            rows={6}
            placeholder="Type your answer here..."
            value={inputValue}
            onChange={(e) => handleAnswerChange(e.target.value)}
          />
        );
    }
  };

  if (examFinished) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center max-w-md">
          <p className="text-4xl mb-4">✓</p>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Exam Submitted</h2>
          <p className="text-slate-600 mb-6">
            Your exam has been submitted. You answered {answeredCount} of {questions.length}{" "}
            questions.
          </p>
          {saving && (
            <p className="text-sm text-slate-500 animate-pulse">Saving your work...</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* ── EXAM HEADER (STICKY) ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-slate-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          {/* Left: Paper title */}
          <div className="flex-1">
            <h1 className="text-lg font-bold">
              {paper.display_title || `LaunchPard ${paper.subject?.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")} — Paper ${paper.paper_number || 1}`}
            </h1>
            <p className="text-sm text-slate-400">{paper.session}</p>
          </div>

          {/* Center: Timer */}
          <div
            className={`flex items-center justify-center px-6 py-2 rounded-lg font-mono text-2xl font-bold transition ${getTimerBgColor()} ${getTimerColor()} ${getTimerPulse()}`}
          >
            {isTimed ? (
              formatTime(timeRemaining)
            ) : (
              <span className="text-sm">Practice Mode</span>
            )}
          </div>

          {/* Right: Progress */}
          <div className="flex-1 text-right">
            <p className="text-sm font-semibold">
              Q{currentQuestionIndex + 1} of {questions.length}
            </p>
            <div className="w-48 h-2 bg-slate-700 rounded-full mt-2 mx-auto">
              <div
                className="h-full bg-blue-400 rounded-full transition-all"
                style={{
                  width: `${((currentQuestionIndex + 1) / questions.length) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ──────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Question Display Area */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-3xl mx-auto">
            {/* Question Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold text-slate-900 mb-2">
                  Question {currentQuestionIndex + 1}
                  {currentQuestion.part && ` (${currentQuestion.part})`}
                </h2>
                {currentQuestion.marks && (
                  <p className="text-lg font-semibold text-slate-600">
                    [{currentQuestion.marks} mark{currentQuestion.marks !== 1 ? "s" : ""}]
                  </p>
                )}
              </div>

              {!isReview && (
                <button
                  onClick={handleToggleFlag}
                  className={`px-4 py-2 rounded-lg font-semibold transition ${
                    answers.get(currentQuestion.id)?.flagged
                      ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {answers.get(currentQuestion.id)?.flagged ? "⚠️ Flagged" : "🚩 Flag"}
                </button>
              )}
            </div>

            {/* Question Text */}
            <div className="prose prose-sm max-w-none mb-8">
              <p className="text-lg text-slate-800 whitespace-pre-wrap leading-relaxed">
                {currentQuestion.question_text}
              </p>
            </div>

            {/* Diagram Placeholder */}
            {currentQuestion.diagram_description && (
              <div className="mb-8 p-6 bg-slate-100 rounded-lg border-2 border-slate-300 text-center">
                <p className="text-sm font-semibold text-slate-700 mb-2">Diagram:</p>
                <p className="text-slate-600">{currentQuestion.diagram_description}</p>
              </div>
            )}

            {/* Answer Input */}
            {!isReview && renderAnswerInput()}

            {/* Save Status */}
            {saveStatus === "saving" && (
              <div className="mt-6 flex items-center gap-2 text-blue-600 text-sm">
                <span className="inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                Saving...
              </div>
            )}
            {saveStatus === "saved" && (
              <div className="mt-6 text-green-600 text-sm font-semibold">
                ✓ Saved
              </div>
            )}
          </div>
        </main>

        {/* ── SIDEBAR: QUESTION PALETTE ──────────────────────────────────────── */}
        <aside className="hidden lg:flex flex-col w-64 bg-slate-50 border-l border-slate-200 p-6 overflow-y-auto">
          <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wide">
            Progress
          </h3>
          <div className="grid grid-cols-4 gap-2">
            {questions.map((q, idx) => {
              const qAnswer = answers.get(q.id);
              const answered = qAnswer?.text || qAnswer?.data;
              const isCurrent = idx === currentQuestionIndex;
              const isFlagged = qAnswer?.flagged;

              return (
                <button
                  key={q.id}
                  onClick={() => handleNavigateQuestion(idx)}
                  className={`p-3 rounded-lg font-semibold text-sm transition ${
                    isCurrent
                      ? "ring-2 ring-blue-500 bg-blue-100 text-blue-900"
                      : isFlagged
                      ? "bg-amber-100 text-amber-900 hover:bg-amber-200"
                      : answered
                      ? "bg-green-100 text-green-900 hover:bg-green-200"
                      : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {/* Summary */}
          <div className="mt-8 space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-500" />
              <span className="text-slate-700">
                Answered: <strong>{answeredCount}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-amber-500" />
              <span className="text-slate-700">
                Flagged: <strong>{flaggedCount}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-slate-300" />
              <span className="text-slate-700">
                Unanswered: <strong>{unansweredCount}</strong>
              </span>
            </div>
          </div>
        </aside>
      </div>

      {/* ── FOOTER: NAVIGATION ────────────────────────────────────────────────── */}
      <footer className="bg-slate-50 border-t border-slate-200 px-8 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            onClick={handlePreviousQuestion}
            disabled={currentQuestionIndex === 0}
            className="px-6 py-3 font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed bg-slate-200 text-slate-700 hover:bg-slate-300"
          >
            ← Previous
          </button>

          {/* Mobile: Question Palette Toggle */}
          <button
            onClick={() => setShowQuestionPalette(!showQuestionPalette)}
            className="lg:hidden px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-200 rounded-lg hover:bg-slate-300"
          >
            Questions
          </button>

          <button
            onClick={handleNextQuestion}
            disabled={currentQuestionIndex === questions.length - 1}
            className="px-6 py-3 font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed bg-slate-200 text-slate-700 hover:bg-slate-300"
          >
            Next →
          </button>

          <button
            onClick={() => handleFinishExam(false)}
            className="px-8 py-3 font-bold rounded-lg transition bg-red-600 text-white hover:bg-red-700"
          >
            Finish Exam
          </button>
        </div>
      </footer>

      {/* ── FINISH CONFIRMATION MODAL ─────────────────────────────────────────── */}
      {showFinishModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md">
            <h3 className="text-2xl font-bold text-slate-900 mb-4">Finish Exam?</h3>
            <p className="text-slate-600 mb-6">
              You have <strong>{answeredCount}</strong> answered question
              {answeredCount !== 1 ? "s" : ""} and <strong>{unansweredCount}</strong> unanswered.
              {flaggedCount > 0 && (
                <>
                  <br />
                  You also have <strong>{flaggedCount}</strong> question
                  {flaggedCount !== 1 ? "s" : ""} flagged for review.
                </>
              )}
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowFinishModal(false)}
                className="flex-1 px-4 py-3 font-semibold rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 transition"
              >
                Continue
              </button>
              <button
                onClick={handleConfirmFinish}
                className="flex-1 px-4 py-3 font-bold rounded-lg bg-red-600 text-white hover:bg-red-700 transition"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MOBILE QUESTION PALETTE MODAL ─────────────────────────────────────── */}
      {showQuestionPalette && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end z-50 lg:hidden">
          <div className="bg-white w-full max-h-96 rounded-t-lg p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Questions</h3>
              <button
                onClick={() => setShowQuestionPalette(false)}
                className="text-slate-500 hover:text-slate-700 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="grid grid-cols-6 gap-2">
              {questions.map((q, idx) => {
                const qAnswer = answers.get(q.id);
                const answered = qAnswer?.text || qAnswer?.data;
                const isCurrent = idx === currentQuestionIndex;
                const isFlagged = qAnswer?.flagged;

                return (
                  <button
                    key={q.id}
                    onClick={() => {
                      handleNavigateQuestion(idx);
                      setShowQuestionPalette(false);
                    }}
                    className={`p-2 rounded font-semibold text-xs transition ${
                      isCurrent
                        ? "ring-2 ring-blue-500 bg-blue-100 text-blue-900"
                        : isFlagged
                        ? "bg-amber-100 text-amber-900"
                        : answered
                        ? "bg-green-100 text-green-900"
                        : "bg-slate-100 text-slate-700 border border-slate-300"
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
