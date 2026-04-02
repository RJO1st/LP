"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/components/theme/ThemeProvider";

/**
 * ExamResults.jsx
 *
 * Professional exam results dashboard inspired by SaveMyExams.
 * Displays:
 *   - Overall score with grade prediction
 *   - Grade boundary visualization
 *   - Question-by-question breakdown (expandable)
 *   - Topic performance breakdown
 *   - Areas to improve with revision links
 *   - Action buttons (retake, review, back to lobby)
 *   - Progress over time chart
 *
 * Props:
 *   sittingId:     string (UUID of exam_sittings row)
 *   onRetake:      function() — start a new attempt
 *   onBackToLobby: function() — navigate back
 *   onReviewExam:  function(sittingId) — open review mode
 *
 * Styling:
 *   - Light professional theme (white backgrounds, clean borders)
 *   - No gamification or space themes
 *   - Color-coded marks: green (full), amber (partial), red (zero)
 *   - Print-friendly layout
 *   - Mobile-first responsive design
 */

export default function ExamResults({ sittingId, onRetake, onBackToLobby, onReviewExam }) {
  // ── STATE ──────────────────────────────────────────────────────────────────
  const [sitting, setSitting] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [gradeBoundaries, setGradeBoundaries] = useState(null);
  const [progressHistory, setProgressHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedQuestion, setExpandedQuestion] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all"); // all, incorrect, flagged
  const [topicFilter, setTopicFilter] = useState(null);
  const [copied, setCopied] = useState(false);

  const { isDark } = useTheme();

  // ── FETCH SITTING & ANSWERS ────────────────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch sitting details + answers + questions from API
        const response = await fetch(`/api/exam-sittings/${sittingId}`);
        if (!response.ok) throw new Error("Failed to fetch sitting");
        const { sitting: sittingData, answers: answersData, questions: questionsData } = await response.json();

        setSitting(sittingData);
        setAnswers(answersData || []);
        setQuestions(questionsData || []);

        // Fetch grade boundaries if available via API
        // TODO: Implement /api/exam-analytics/grade-boundaries endpoint
        // For now, use default LaunchPard grade mappings
        setGradeBoundaries(getDefaultGradeBoundaries(sittingData.total_marks_available));

        // Fetch previous attempts of same paper for progress chart
        if (sittingData?.exam_paper_id) {
          const { data: prevAttempts } = await supabase
            .from("exam_sittings")
            .select("total_score, percentage, finished_at")
            .eq("exam_paper_id", sittingData.exam_paper_id)
            .order("finished_at", { ascending: true });

          if (prevAttempts) {
            setProgressHistory(prevAttempts || []);
          }
        }
      } catch (err) {
        console.error("[ExamResults] Fetch error:", err);
        setError(err.message || "Failed to load results");
      } finally {
        setLoading(false);
      }
    };

    if (sittingId) {
      fetchData();
    }
  }, [sittingId]);

  // ── HELPERS ────────────────────────────────────────────────────────────────

  /**
   * Default grade boundaries (LaunchPard standard grading)
   * Scaled to actual total_marks_available
   */
  function getDefaultGradeBoundaries(maxScore) {
    const scale = maxScore / 240; // Standard GCSE maths is 240
    return {
      grades: [
        { grade: 9, threshold: 0.9 * maxScore, label: "9" },
        { grade: 8, threshold: 0.81 * maxScore, label: "8" },
        { grade: 7, threshold: 0.71 * maxScore, label: "7" },
        { grade: 6, threshold: 0.61 * maxScore, label: "6" },
        { grade: 5, threshold: 0.51 * maxScore, label: "5" },
        { grade: 4, threshold: 0.41 * maxScore, label: "4" },
        { grade: 3, threshold: 0.31 * maxScore, label: "3" },
        { grade: 2, threshold: 0.21 * maxScore, label: "2" },
        { grade: 1, threshold: 0.01 * maxScore, label: "1" },
      ],
      maxScore,
    };
  }

  /**
   * Get predicted grade from score
   */
  function getPredictedGrade(score, maxScore) {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 90) return { grade: 9, color: "bg-green-600" };
    if (percentage >= 81) return { grade: 8, color: "bg-green-500" };
    if (percentage >= 71) return { grade: 7, color: "bg-green-400" };
    if (percentage >= 61) return { grade: 6, color: "bg-emerald-500" };
    if (percentage >= 51) return { grade: 5, color: "bg-amber-500" };
    if (percentage >= 41) return { grade: 4, color: "bg-amber-600" };
    if (percentage >= 31) return { grade: 3, color: "bg-orange-500" };
    if (percentage >= 21) return { grade: 2, color: "bg-red-500" };
    return { grade: 1, color: "bg-red-700" };
  }

  /**
   * Get color for mark status
   */
  function getMarkColor(marksAwarded, marksPossible) {
    if (!marksPossible || marksPossible === 0) return "text-gray-500";
    const percentage = (marksAwarded / marksPossible) * 100;
    if (percentage === 100) return "text-green-600";
    if (percentage >= 50) return "text-amber-600";
    return "text-red-600";
  }

  /**
   * Get row color for mark status
   */
  function getRowColor(marksAwarded, marksPossible) {
    if (!marksPossible || marksPossible === 0) return "";
    const percentage = (marksAwarded / marksPossible) * 100;
    if (percentage === 100) return "bg-green-50 border-l-4 border-l-green-600";
    if (percentage >= 50) return "bg-amber-50 border-l-4 border-l-amber-600";
    return "bg-red-50 border-l-4 border-l-red-600";
  }

  /**
   * Group answers by topic_slug
   */
  function groupByTopic(answersArr, questionsArr) {
    const topicMap = new Map();

    answersArr.forEach((answer) => {
      const question = questionsArr.find((q) => q.id === answer.question_id);
      if (!question) return;

      const topic = question.topic_slug || "Uncategorized";
      if (!topicMap.has(topic)) {
        topicMap.set(topic, { topic, questions: [], totalMarks: 0, marksEarned: 0 });
      }

      const topicData = topicMap.get(topic);
      topicData.questions.push({ question, answer });
      topicData.totalMarks += question.marks || 0;
      topicData.marksEarned += answer.marks_awarded || 0;
    });

    return Array.from(topicMap.values()).sort((a, b) => {
      // Sort by percentage (ascending — worst first)
      const aPerc = a.totalMarks > 0 ? (a.marksEarned / a.totalMarks) * 100 : 0;
      const bPerc = b.totalMarks > 0 ? (b.marksEarned / b.totalMarks) * 100 : 0;
      return aPerc - bPerc;
    });
  }

  /**
   * Filter answers based on current filter
   */
  function getFilteredAnswers() {
    let filtered = answers;

    if (activeFilter === "incorrect") {
      filtered = filtered.filter((a) => a.marks_awarded < a.marks_available);
    } else if (activeFilter === "flagged") {
      filtered = filtered.filter((a) => a.flagged_for_review);
    }

    if (topicFilter) {
      const q = questions.find(
        (qu) => qu.topic_slug === topicFilter && answers.some((a) => a.question_id === qu.id)
      );
      filtered = filtered.filter((a) => questions.find((qu) => qu.id === a.question_id)?.topic_slug === topicFilter);
    }

    return filtered;
  }

  /**
   * Copy results to clipboard
   */
  function copyToClipboard() {
    const percentage = sitting?.percentage || 0;
    const score = sitting?.total_score || 0;
    const maxScore = sitting?.total_marks_available || 0;
    const text = `I scored ${percentage}% (${score}/${maxScore}) on the exam!`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── RENDER ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className={`min-h-screen ${isDark ? "bg-gray-900" : "bg-white"} p-4 sm:p-8 flex items-center justify-center`}>
        <div className="w-full max-w-4xl">
          <div className="animate-pulse space-y-8">
            <div className={`h-48 ${isDark ? "bg-gray-800" : "bg-gray-100"} rounded-lg`} />
            <div className={`h-32 ${isDark ? "bg-gray-800" : "bg-gray-100"} rounded-lg`} />
            <div className={`h-64 ${isDark ? "bg-gray-800" : "bg-gray-100"} rounded-lg`} />
          </div>
        </div>
      </div>
    );
  }

  if (error || !sitting) {
    return (
      <div className={`min-h-screen ${isDark ? "bg-gray-900" : "bg-white"} p-4 sm:p-8 flex items-center justify-center`}>
        <div className="w-full max-w-4xl text-center">
          <p className={`text-lg font-semibold ${isDark ? "text-red-400" : "text-red-600"}`}>
            {error || "Results not available"}
          </p>
          <button
            onClick={onBackToLobby}
            className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Exams
          </button>
        </div>
      </div>
    );
  }

  const score = sitting.total_score || 0;
  const maxScore = sitting.total_marks_available || 100;
  const percentage = sitting.percentage || 0;
  const predictedGrade = getPredictedGrade(score, maxScore);
  const topicGroups = groupByTopic(answers, questions);
  const filteredAnswers = getFilteredAnswers();
  const weakAreas = topicGroups.slice(0, 5); // Top 5 weakest areas

  return (
    <div className={`min-h-screen ${isDark ? "bg-gray-900" : "bg-white"} ${isDark ? "text-gray-100" : "text-gray-900"}`}>
      {/* ──────────────────────────────────────────────────────────────────────
          HEADER / RESULTS HERO
          ────────────────────────────────────────────────────────────────────── */}
      <div className={`${isDark ? "bg-gray-800" : "bg-gray-50"} border-b ${isDark ? "border-gray-700" : "border-gray-200"} sticky top-0 z-10`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Exam Results</h1>
          <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
            {sitting.finished_at ? new Date(sitting.finished_at).toLocaleDateString() : "In progress"} • {sitting.mode === "timed" ? "Timed exam" : "Practice"}
          </p>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────
          RESULTS HERO SECTION
          ────────────────────────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 sm:py-12 grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
        {/* Score Circle + Percentage */}
        <div className="flex flex-col items-center justify-center">
          <div className="relative w-40 h-40 sm:w-48 sm:h-48 mb-6">
            <svg className="w-full h-full" viewBox="0 0 200 200">
              {/* Background circle */}
              <circle cx="100" cy="100" r="90" fill="none" stroke={isDark ? "#374151" : "#e5e7eb"} strokeWidth="8" />
              {/* Progress circle */}
              <circle
                cx="100"
                cy="100"
                r="90"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="8"
                strokeDasharray={`${2 * Math.PI * 90}`}
                strokeDashoffset={`${2 * Math.PI * 90 * (1 - percentage / 100)}`}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 0.5s ease" }}
                transform="rotate(-90 100 100)"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-4xl sm:text-5xl font-bold">{percentage}%</div>
              <div className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                {score}/{maxScore}
              </div>
            </div>
          </div>
          <div className={`text-center text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
            {percentage >= 80 && "Excellent work!"}
            {percentage >= 60 && percentage < 80 && "Good effort"}
            {percentage >= 40 && percentage < 60 && "Keep practising"}
            {percentage < 40 && "More practice needed"}
          </div>
        </div>

        {/* Grade Badge + Stats */}
        <div className="space-y-6">
          {/* Grade Badge */}
          <div>
            <p className={`text-sm font-semibold ${isDark ? "text-gray-400" : "text-gray-600"} mb-2`}>PREDICTED GRADE</p>
            <div className={`${predictedGrade.color} text-white rounded-lg p-6 text-center`}>
              <div className="text-5xl sm:text-6xl font-bold">{predictedGrade.grade}</div>
              <div className="text-sm mt-2 opacity-90">
                {predictedGrade.grade >= 7 && "Strong Pass"}
                {predictedGrade.grade >= 5 && predictedGrade.grade < 7 && "Secure Pass"}
                {predictedGrade.grade >= 4 && predictedGrade.grade < 5 && "Standard Pass"}
                {predictedGrade.grade < 4 && "Below Pass"}
              </div>
            </div>
          </div>

          {/* Comparison to Average */}
          <div className={`${isDark ? "bg-gray-800" : "bg-blue-50"} rounded-lg p-4 border ${isDark ? "border-gray-700" : "border-blue-200"}`}>
            <p className={`text-sm font-semibold ${isDark ? "text-blue-400" : "text-blue-700"}`}>
              {percentage >= 70 ? "✓ You scored above average" : percentage >= 50 ? "• Average performance" : "• Below average — keep practising"}
            </p>
          </div>

          {/* Time Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className={`${isDark ? "bg-gray-800" : "bg-gray-100"} rounded-lg p-4`}>
              <p className={`text-xs font-semibold ${isDark ? "text-gray-400" : "text-gray-600"} mb-1`}>TIME TAKEN</p>
              <p className="text-lg font-bold">
                {sitting.time_used_seconds ? Math.round(sitting.time_used_seconds / 60) : "—"} min
              </p>
            </div>
            <div className={`${isDark ? "bg-gray-800" : "bg-gray-100"} rounded-lg p-4`}>
              <p className={`text-xs font-semibold ${isDark ? "text-gray-400" : "text-gray-600"} mb-1`}>QUESTIONS</p>
              <p className="text-lg font-bold">{answers.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────
          GRADE BOUNDARY BAR
          ────────────────────────────────────────────────────────────────────── */}
      {gradeBoundaries && (
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 border-t border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}">
          <p className={`text-sm font-semibold ${isDark ? "text-gray-400" : "text-gray-600"} mb-4`}>GRADE BOUNDARIES</p>
          <div className="relative h-12 bg-gradient-to-r from-red-500 via-amber-500 to-green-600 rounded-lg overflow-hidden">
            {/* Score pin */}
            <div
              className="absolute top-0 h-full w-1 bg-black flex items-center justify-center"
              style={{ left: `${(score / maxScore) * 100}%` }}
            >
              <div className="absolute -top-6 w-6 h-6 bg-black rounded-full border-2 border-white" />
            </div>
          </div>
          <div className="mt-4 flex justify-between text-xs font-semibold">
            {gradeBoundaries.grades.slice(0, 3).map((g) => (
              <div key={g.grade}>
                <p className={isDark ? "text-gray-400" : "text-gray-600"}>Grade {g.label}</p>
                <p className={isDark ? "text-gray-300" : "text-gray-900"}>{Math.round(g.threshold)} marks</p>
              </div>
            ))}
            <div>
              <p className={isDark ? "text-gray-400" : "text-gray-600"}>Your Score</p>
              <p className={isDark ? "text-gray-300" : "text-gray-900"}>{score} marks</p>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────
          QUESTION-BY-QUESTION BREAKDOWN
          ────────────────────────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8">
        <h2 className="text-xl sm:text-2xl font-bold mb-6">Question Breakdown</h2>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {["all", "incorrect", "flagged"].map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeFilter === filter
                  ? "bg-blue-600 text-white"
                  : isDark
                    ? "bg-gray-800 text-gray-300 hover:bg-gray-700"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {filter === "all" && `All (${answers.length})`}
              {filter === "incorrect" && `Incorrect (${answers.filter((a) => a.marks_awarded < a.marks_available).length})`}
              {filter === "flagged" && `Flagged (${answers.filter((a) => a.flagged_for_review).length})`}
            </button>
          ))}
        </div>

        {/* Questions Table */}
        <div className={`border ${isDark ? "border-gray-700" : "border-gray-200"} rounded-lg overflow-hidden`}>
          {filteredAnswers.length === 0 ? (
            <div className={`p-8 text-center ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
              <p className={isDark ? "text-gray-400" : "text-gray-600"}>No questions to display</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredAnswers.map((answer, idx) => {
                const question = questions.find((q) => q.id === answer.question_id);
                if (!question) return null;

                const isExpanded = expandedQuestion === answer.id;

                return (
                  <div
                    key={answer.id}
                    className={`${getRowColor(answer.marks_awarded, answer.marks_available)}`}
                  >
                    {/* Question Summary Row */}
                    <button
                      onClick={() => setExpandedQuestion(isExpanded ? null : answer.id)}
                      className="w-full p-4 sm:p-6 flex items-center justify-between hover:bg-opacity-75 transition-colors text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`text-sm font-semibold ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                            Q{idx + 1}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded ${isDark ? "bg-gray-700" : "bg-gray-200"}`}>
                            {question.topic_slug || "General"}
                          </span>
                        </div>
                        <p className="text-sm truncate">{question.question_text?.substring(0, 100)}...</p>
                      </div>
                      <div className="flex items-center gap-4 ml-4 flex-shrink-0">
                        <div className="text-right">
                          <p className={`text-lg font-bold ${getMarkColor(answer.marks_awarded, answer.marks_available)}`}>
                            {answer.marks_awarded}/{answer.marks_available}
                          </p>
                          <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                            {answer.marks_available > 0
                              ? `${Math.round((answer.marks_awarded / answer.marks_available) * 100)}%`
                              : "—"}
                          </p>
                        </div>
                        <svg
                          className={`w-5 h-5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                      </div>
                    </button>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className={`border-t ${isDark ? "border-gray-600" : "border-gray-200"} p-4 sm:p-6 bg-opacity-50 space-y-4`}>
                        {/* Scholar's Answer */}
                        <div>
                          <p className="text-sm font-semibold mb-2">Your Answer</p>
                          <div className={`${isDark ? "bg-gray-700" : "bg-gray-100"} rounded p-3 text-sm`}>
                            {answer.scholar_answer || answer.scholar_working || "(Not answered)"}
                          </div>
                        </div>

                        {/* Correct Answer */}
                        {question.acceptable_answers && (
                          <div>
                            <p className="text-sm font-semibold mb-2">Correct Answer</p>
                            <div className={`${isDark ? "bg-green-900 bg-opacity-30" : "bg-green-50"} rounded p-3 text-sm border ${isDark ? "border-green-700" : "border-green-200"}`}>
                              {(() => {
                                const aa = question.acceptable_answers;
                                const primary = aa.primary || aa.exact || [];
                                return Array.isArray(primary) ? primary.join(", ") : String(primary);
                              })()}
                            </div>
                          </div>
                        )}

                        {/* AI Feedback */}
                        {answer.ai_feedback && (
                          <div>
                            <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                              <span className={`text-xs px-2 py-1 rounded font-mono ${
                                answer.marking_tier === "ai_marking" ? (isDark ? "bg-purple-900 text-purple-300" : "bg-purple-100 text-purple-700") : (isDark ? "bg-gray-700" : "bg-gray-200")
                              }`}>
                                {answer.marking_tier === "ai_marking" ? "AI Marked" : "Auto"}
                              </span>
                            </p>
                            <div className={`${isDark ? "bg-gray-700 bg-opacity-50" : "bg-gray-50"} rounded p-3 text-sm`}>
                              {answer.ai_feedback}
                            </div>
                            {answer.ai_confidence && (
                              <p className={`text-xs mt-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                                Confidence: {(answer.ai_confidence * 100).toFixed(0)}%
                              </p>
                            )}
                          </div>
                        )}

                        {/* Needs Human Review */}
                        {answer.needs_human_review && (
                          <div className={`${isDark ? "bg-amber-900 bg-opacity-30" : "bg-amber-50"} rounded p-3 border ${isDark ? "border-amber-700" : "border-amber-200"}`}>
                            <p className="text-sm font-semibold text-amber-600">
                              This answer is flagged for human review
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────
          TOPIC PERFORMANCE
          ────────────────────────────────────────────────────────────────────── */}
      {topicGroups.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}">
          <h2 className="text-xl sm:text-2xl font-bold mb-6">Topic Performance</h2>
          <div className="space-y-4">
            {topicGroups.map((group) => {
              const percentage = group.totalMarks > 0 ? (group.marksEarned / group.totalMarks) * 100 : 0;
              const barColor =
                percentage >= 80 ? "bg-green-500" : percentage >= 50 ? "bg-amber-500" : "bg-red-500";

              return (
                <button
                  key={group.topic}
                  onClick={() => setTopicFilter(topicFilter === group.topic ? null : group.topic)}
                  className={`w-full p-4 rounded-lg text-left transition-colors ${
                    topicFilter === group.topic
                      ? isDark
                        ? "bg-blue-900 bg-opacity-30"
                        : "bg-blue-50"
                      : isDark
                        ? "bg-gray-800 hover:bg-gray-700"
                        : "bg-gray-50 hover:bg-gray-100"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold">{group.topic}</p>
                    <p className="font-bold">
                      {group.marksEarned}/{group.totalMarks} ({Math.round(percentage)}%)
                    </p>
                  </div>
                  <div className={`w-full h-2 ${isDark ? "bg-gray-700" : "bg-gray-200"} rounded-full overflow-hidden`}>
                    <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${percentage}%` }} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────
          AREAS TO IMPROVE
          ────────────────────────────────────────────────────────────────────── */}
      {weakAreas.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}">
          <h2 className="text-xl sm:text-2xl font-bold mb-6">Areas to Improve</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {weakAreas.map((area) => {
              const percentage = area.totalMarks > 0 ? (area.marksEarned / area.totalMarks) * 100 : 0;
              const worstQuestion = area.questions.sort((a, b) => {
                const aPerc = (a.answer.marks_awarded / a.question.marks) * 100;
                const bPerc = (b.answer.marks_awarded / b.question.marks) * 100;
                return aPerc - bPerc;
              })[0];

              return (
                <div
                  key={area.topic}
                  className={`${isDark ? "bg-gray-800" : "bg-red-50"} rounded-lg p-6 border ${isDark ? "border-gray-700" : "border-red-200"}`}
                >
                  <h3 className="font-bold text-lg mb-2">{area.topic}</h3>
                  <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"} mb-4`}>
                    Scored {area.marksEarned}/{area.totalMarks} ({Math.round(percentage)}%)
                  </p>
                  {worstQuestion?.answer?.ai_feedback && (
                    <p className={`text-sm mb-4 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                      {worstQuestion.answer.ai_feedback.substring(0, 120)}...
                    </p>
                  )}
                  <button
                    onClick={() => onReviewExam(sittingId)}
                    className={`text-sm font-semibold px-4 py-2 rounded transition-colors ${
                      isDark
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    }`}
                  >
                    Practice This Topic
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────
          PROGRESS OVER TIME
          ────────────────────────────────────────────────────────────────────── */}
      {progressHistory.length > 1 && (
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}">
          <h2 className="text-xl sm:text-2xl font-bold mb-6">Progress Over Time</h2>
          <div className={`${isDark ? "bg-gray-800" : "bg-gray-50"} rounded-lg p-6 overflow-x-auto`}>
            <svg width="100%" height="200" viewBox="0 0 600 200" className="min-w-full">
              {/* Grid lines */}
              {[0, 25, 50, 75, 100].map((pct) => (
                <line
                  key={pct}
                  x1="40"
                  y1={(200 - (pct / 100) * 160) - 20}
                  x2="590"
                  y2={(200 - (pct / 100) * 160) - 20}
                  stroke={isDark ? "#374151" : "#e5e7eb"}
                  strokeWidth="1"
                  strokeDasharray="4"
                />
              ))}

              {/* Y-axis labels */}
              {[0, 25, 50, 75, 100].map((pct) => (
                <text
                  key={`label-${pct}`}
                  x="30"
                  y={(200 - (pct / 100) * 160) - 12}
                  fontSize="12"
                  fill={isDark ? "#9ca3af" : "#6b7280"}
                  textAnchor="end"
                >
                  {pct}%
                </text>
              ))}

              {/* Line path */}
              {progressHistory.length > 1 && (
                <polyline
                  points={progressHistory
                    .map((attempt, idx) => {
                      const x = 50 + (idx / (progressHistory.length - 1)) * 530;
                      const y = 200 - 20 - ((attempt.percentage || 0) / 100) * 160;
                      return `${x},${y}`;
                    })
                    .join(" ")}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="2"
                />
              )}

              {/* Data points */}
              {progressHistory.map((attempt, idx) => {
                const x = 50 + (idx / (progressHistory.length - 1)) * 530;
                const y = 200 - 20 - ((attempt.percentage || 0) / 100) * 160;
                return (
                  <circle
                    key={idx}
                    cx={x}
                    cy={y}
                    r="4"
                    fill="#3b82f6"
                    stroke={isDark ? "#111827" : "#ffffff"}
                    strokeWidth="2"
                  />
                );
              })}
            </svg>
            <p className={`text-xs mt-4 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              {progressHistory.length} attempt{progressHistory.length !== 1 ? "s" : ""} of this paper
            </p>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────
          ACTION BUTTONS
          ────────────────────────────────────────────────────────────────────── */}
      <div className={`${isDark ? "bg-gray-800" : "bg-gray-50"} border-t ${isDark ? "border-gray-700" : "border-gray-200"} sticky bottom-0`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 flex flex-col sm:flex-row gap-3">
          <button
            onClick={onBackToLobby}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-colors ${
              isDark
                ? "bg-gray-700 text-white hover:bg-gray-600"
                : "bg-gray-300 text-gray-900 hover:bg-gray-400"
            }`}
          >
            Back to Exams
          </button>
          <button
            onClick={() => onReviewExam(sittingId)}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-colors ${
              isDark
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            Review Answers
          </button>
          <button
            onClick={onRetake}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-colors ${
              isDark
                ? "bg-green-600 text-white hover:bg-green-700"
                : "bg-green-600 text-white hover:bg-green-700"
            }`}
          >
            Retake Paper
          </button>
          <button
            onClick={copyToClipboard}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-colors ${
              copied
                ? isDark
                  ? "bg-emerald-600 text-white"
                  : "bg-emerald-600 text-white"
                : isDark
                  ? "bg-gray-700 text-white hover:bg-gray-600"
                  : "bg-gray-200 text-gray-900 hover:bg-gray-300"
            }`}
          >
            {copied ? "Copied!" : "Share Results"}
          </button>
        </div>
      </div>
    </div>
  );
}
