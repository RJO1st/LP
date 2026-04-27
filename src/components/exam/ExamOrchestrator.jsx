"use client";

import React, { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { apiFetch } from "@/lib/apiFetch";

/**
 * ExamOrchestrator.jsx
 *
 * State machine orchestrating the complete exam flow:
 *   "lobby" → "running" → "marking" → "results"
 *
 * Props:
 *   - scholar: { id, year_level, curriculum, name, ... }
 *   - onClose: fn() — callback when exam flow completes/user exits
 */

const ExamLobby      = dynamic(() => import("./ExamLobby"),      { ssr: false });
const ExamBriefing   = dynamic(() => import("./ExamBriefing"),   { ssr: false });
const ExamRunner     = dynamic(() => import("./ExamRunner"),     { ssr: false });
const ExamMarkingScreen = dynamic(() => import("./ExamMarkingScreen"), { ssr: false });
const ExamResults    = dynamic(() => import("./ExamResults"),    { ssr: false });

export default function ExamOrchestrator({ scholar, onClose }) {
  const [state, setState] = useState("lobby"); // "lobby" | "running" | "marking" | "results"
  const [currentSitting, setCurrentSitting] = useState(null); // exam_sittings row
  const [currentPaper, setCurrentPaper] = useState(null); // paper metadata
  const [examQuestions, setExamQuestions] = useState([]); // questions for the current exam
  const [examMode, setExamMode] = useState("timed"); // "timed" | "practice" | "topic_focus" | "review"
  const [markingProgress, setMarkingProgress] = useState(0); // 0–100
  const [examError, setExamError] = useState(null); // error message if transition fails
  const [examResults, setExamResults] = useState(null); // results after marking completes

  // ── LOBBY → RUNNING ──────────────────────────────────────────────────────────
  const scholarId = scholar?.id;

  const handleStartExam = useCallback(async ({ paperId, mode, sittingId }) => {
    try {
      setExamError(null);

      let sitting, questions, paper;

      if (sittingId) {
        // Resuming an exam — fetch from API
        const response = await fetch(`/api/exam-sittings/${sittingId}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch exam sitting");
        }
        const data = await response.json();
        sitting = data.sitting;
        questions = data.questions || [];
        paper = data.paper;
      } else {
        // Create new exam sitting via API
        const response = await apiFetch("/api/exam-sittings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            exam_paper_id: paperId,
            mode,
            scholar_id: scholarId,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to start exam");
        }

        const data = await response.json();
        sitting = data.sitting;
        questions = data.questions || [];
        paper = data.paper;
      }

      setCurrentSitting(sitting);
      setCurrentPaper(paper);
      setExamQuestions(questions);
      setExamMode(mode);

      // Show briefing screen before starting the timer.
      // Review mode skips briefing (scholar has already seen this paper).
      setState(mode === "review" ? "running" : "briefing");
    } catch (err) {
      console.error("Failed to start exam:", err);
      setExamError(err.message || "Failed to start exam. Please try again.");
    }
  }, [scholarId]);

  // ── RUNNING → MARKING ────────────────────────────────────────────────────────
  const handleFinishExam = useCallback(({ sittingId, totalAnswered }) => {
    // Transition to marking state
    // The ExamRunner has already saved answers to exam_sittings.answers
    setState("marking");
  }, []);

  // ── MARKING ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (state === "marking" && currentSitting) {
      const performMarking = async () => {
        try {
          setExamError(null);
          setMarkingProgress(0);

          // POST to /api/exam-sittings/{sittingId}/mark
          const response = await fetch(
            `/api/exam-sittings/${currentSitting.id}/mark`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                answers: currentSitting.answers || {},
              }),
            }
          );

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
              errorData.error || "Failed to mark exam"
            );
          }

          const results = await response.json();
          setExamResults(results);
          setMarkingProgress(100);

          // Wait a moment for UI polish, then transition to results
          setTimeout(() => {
            setState("results");
          }, 500);
        } catch (err) {
          console.error("Marking error:", err);
          setExamError(err.message || "Failed to mark exam. Please try again.");
        }
      };

      performMarking();
    }
  }, [state, currentSitting]);

  const handleRetakeExam = useCallback(() => {
    // Reset state, go back to lobby
    setCurrentSitting(null);
    setCurrentPaper(null);
    setExamQuestions([]);
    setExamMode("timed");
    setMarkingProgress(0);
    setExamError(null);
    setExamResults(null);
    setState("lobby");
  }, []);

  const handleReviewExam = useCallback(() => {
    // Go back to running state in review mode
    setExamMode("review");
    setState("running");
  }, []);

  const handleBackToLobby = useCallback(() => {
    setState("lobby");
  }, []);

  // ── BRIEFING → RUNNING ──────────────────────────────────────────────────────
  const handleBeginFromBriefing = useCallback(() => {
    setState("running");
  }, []);

  // ── RENDER STATE MACHINE ────────────────────────────────────────────────────
  if (state === "lobby") {
    return (
      <ExamLobby
        scholar={scholar}
        onStartExam={handleStartExam}
        onBack={onClose}
      />
    );
  }

  if (state === "briefing") {
    return (
      <ExamBriefing
        paper={currentPaper}
        questions={examQuestions}
        mode={examMode}
        sitting={currentSitting}
        onBegin={handleBeginFromBriefing}
        onBack={() => setState("lobby")}
      />
    );
  }

  if (state === "running") {
    return (
      <ExamRunner
        sittingId={currentSitting?.id}
        paper={currentPaper}
        questions={examQuestions}
        mode={examMode}
        initialTimeRemaining={
          (currentPaper?.duration_minutes || 60) * 60
        }
        onFinish={handleFinishExam}
      />
    );
  }

  if (state === "marking") {
    return (
      <ExamMarkingScreen
        progress={markingProgress}
        totalQuestions={examQuestions.length}
        error={examError}
        onRetry={() => setState("marking")}
      />
    );
  }

  if (state === "results") {
    return (
      <ExamResults
        sittingId={currentSitting?.id}
        onRetake={handleRetakeExam}
        onReviewExam={handleReviewExam}
        onBackToLobby={handleBackToLobby}
      />
    );
  }

  return null;
}
