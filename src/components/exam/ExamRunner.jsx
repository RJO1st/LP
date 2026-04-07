"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";

/**
 * ExamRunner.jsx
 *
 * Full exam-taking interface for LaunchPard scholars.
 * Handles timer, question navigation, answer collection, auto-save, and submission.
 *
 * Props:
 *   sittingId: string (UUID of exam_sittings row)
 *   paper: { id, exam_board, subject, component_code, tier, year, session, total_marks, duration_minutes, calculator_allowed, display_title }
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
  const [saveStatus, setSaveStatus] = useState(null); // "saving", "saved", "error", null
  const [examFinished, setExamFinished] = useState(false);

  // ── REFS ───────────────────────────────────────────────────────────────────────
  const timerIntervalRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const questionStartTimeRef = useRef(Date.now());
  const examStartTimeRef = useRef(Date.now());
  const isSubmittingRef = useRef(false);

  const currentQuestion = questions[currentQuestionIndex];
  const isTimed = mode === "timed";
  const isReview = mode === "review";

  // ── DETECT MULTI-SELECT QUESTIONS ──────────────────────────────────────────────
  const isMultiSelect = useMemo(() => {
    if (!currentQuestion) return false;
    const text = (currentQuestion.question_text || "").toLowerCase();
    return /tick\s*\(?\s*[✓✔]\s*\)?\s*two\s+box/i.test(text) ||
           /select\s+two/i.test(text) ||
           /choose\s+two/i.test(text);
  }, [currentQuestion]);

  // ── TIMER EFFECT ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isTimed || examFinished) return;

    timerIntervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        const next = Math.max(0, prev - 1);
        if (next === 0) {
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

    const autoSave = async () => {
      const answer = answers.get(currentQuestion.id);
      if (!answer || (!answer.text && !answer.data)) return;

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
          let detail = response.statusText;
          try { const d = await response.json(); detail = d.details || d.error || detail; } catch {}
          console.error("[ExamRunner] Auto-save failed:", response.status, detail);
          setSaveStatus("error");
          setTimeout(() => setSaveStatus(null), 4000);
        }
      } catch (err) {
        console.error("[ExamRunner] Auto-save error:", err);
        setSaveStatus("error");
        setTimeout(() => setSaveStatus(null), 4000);
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
          text: input,
          data: input,
        });
        return updated;
      });
    },
    [currentQuestion]
  );

  // Multi-select toggle handler (for "Tick two boxes" style questions)
  const handleMultiSelectToggle = useCallback(
    (idx) => {
      setAnswers((prev) => {
        const updated = new Map(prev);
        const answer = updated.get(currentQuestion.id) || {};
        const currentSelections = answer.text ? answer.text.split(",").filter(Boolean) : [];
        const idxStr = String(idx);

        let newSelections;
        if (currentSelections.includes(idxStr)) {
          newSelections = currentSelections.filter((s) => s !== idxStr);
        } else {
          newSelections = [...currentSelections, idxStr];
        }

        const val = newSelections.join(",");
        updated.set(currentQuestion.id, {
          ...answer,
          text: val,
          data: val,
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

  /**
   * FIXED: Exam finish flow
   * - Clicking "Finish Exam" shows confirmation modal WITHOUT setting examFinished
   * - Only after confirmation (or auto-submit) do we actually call the API
   * - examFinished is set AFTER the API call succeeds
   */
  const handleFinishExam = useCallback(
    async (isAutoSubmit = false) => {
      if (isSubmittingRef.current) return;

      if (!isAutoSubmit) {
        // Show confirmation modal — do NOT set examFinished yet
        setShowFinishModal(true);
        return;
      }

      // Auto-submit or confirmed: submit all answers
      isSubmittingRef.current = true;
      try {
        const totalAnswered = Array.from(answers.values()).filter(
          (a) => a.text || a.data
        ).length;

        setSaving(true);

        // Retry up to 2 times for transient server errors
        let response;
        for (let attempt = 0; attempt < 3; attempt++) {
          response = await fetch(`/api/exam-sittings/${sittingId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "finish",
              time_used_seconds: Math.round((Date.now() - examStartTimeRef.current) / 1000),
            }),
          });
          if (response.ok || response.status < 500) break;
          // Server error — wait and retry
          if (attempt < 2) {
            console.warn(`[ExamRunner] Finish attempt ${attempt + 1} got ${response.status}, retrying...`);
            await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          }
        }

        if (response.ok) {
          setSaving(false);
          setExamFinished(true);
          // Notify orchestrator to transition to marking
          onFinish?.({ sittingId, totalAnswered });
        } else {
          let detail = response.statusText;
          try { const d = await response.json(); detail = d.details || d.error || detail; } catch {}
          console.error("[ExamRunner] Finish failed:", response.status, detail);
          // If 403/401, skip retry — auth issue
          if (response.status === 403 || response.status === 401) {
            alert("Session expired. Please refresh and try again.");
          }
          setSaving(false);
          isSubmittingRef.current = false;
        }
      } catch (err) {
        console.error("[ExamRunner] Finish error:", err);
        setSaving(false);
        isSubmittingRef.current = false;
      }
    },
    [answers, sittingId, onFinish]
  );

  const handleConfirmFinish = useCallback(() => {
    setShowFinishModal(false);
    handleFinishExam(true);
  }, [handleFinishExam]);

  const handleCancelFinish = useCallback(() => {
    setShowFinishModal(false);
  }, []);

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

  // ── PARSE & RENDER QUESTION TEXT (with inline table detection) ──────────────
  const renderQuestionText = (text) => {
    if (!text) return null;

    // Split text into lines
    const lines = text.split("\n");
    const segments = []; // { type: "text" | "table", content }
    let currentTextLines = [];
    let currentTableLines = [];
    let inTable = false;

    const isPipeLine = (line) => {
      // Line contains 2+ pipe characters with content between them
      const trimmed = line.trim();
      const pipeCount = (trimmed.match(/\|/g) || []).length;
      return pipeCount >= 2;
    };

    const isWhitespaceTableLine = (line, prevLine) => {
      // Detects whitespace-aligned tables like "Name          Formula"
      // Must have 3+ consecutive spaces creating columns
      const trimmed = line.trim();
      if (!trimmed || trimmed.length < 5) return false;
      const multiSpaceGaps = (trimmed.match(/\S+\s{3,}\S+/g) || []).length;
      return multiSpaceGaps >= 1;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (isPipeLine(line)) {
        // Pipe-delimited table line
        if (!inTable && currentTextLines.length > 0) {
          segments.push({ type: "text", content: currentTextLines.join("\n") });
          currentTextLines = [];
        }
        inTable = true;
        currentTableLines.push(line);
      } else if (
        inTable === false &&
        isWhitespaceTableLine(line) &&
        i + 1 < lines.length &&
        isWhitespaceTableLine(lines[i + 1])
      ) {
        // Start of whitespace-aligned table (need 2+ consecutive matching lines)
        if (currentTextLines.length > 0) {
          segments.push({ type: "text", content: currentTextLines.join("\n") });
          currentTextLines = [];
        }
        inTable = true;
        currentTableLines.push(line);
      } else if (inTable && isWhitespaceTableLine(line)) {
        currentTableLines.push(line);
      } else {
        // Not a table line
        if (inTable && currentTableLines.length >= 2) {
          segments.push({ type: "table", content: currentTableLines });
          currentTableLines = [];
          inTable = false;
        } else if (inTable) {
          // Only 1 line — not really a table, push as text
          currentTextLines.push(...currentTableLines);
          currentTableLines = [];
          inTable = false;
        }
        currentTextLines.push(line);
      }
    }

    // Flush remaining
    if (inTable && currentTableLines.length >= 2) {
      segments.push({ type: "table", content: currentTableLines });
    } else if (inTable) {
      currentTextLines.push(...currentTableLines);
    }
    if (currentTextLines.length > 0) {
      segments.push({ type: "text", content: currentTextLines.join("\n") });
    }

    return segments.map((seg, idx) => {
      if (seg.type === "table") {
        return renderInlineTable(seg.content, idx);
      }
      // Text segment
      return (
        <p
          key={`text-${idx}`}
          className="text-lg text-slate-800 whitespace-pre-wrap leading-relaxed mb-4"
        >
          {seg.content}
        </p>
      );
    });
  };

  // ── RENDER INLINE TABLE FROM LINES ──────────────────────────────────────────
  const renderInlineTable = (lines, key) => {
    let rows = [];

    // Check if pipe-delimited
    const isPipe = lines.some((l) => (l.match(/\|/g) || []).length >= 2);

    if (isPipe) {
      rows = lines
        .filter((l) => l.trim().length > 0)
        .filter((l) => !/^[\s|:-]+$/.test(l.trim())) // Skip separator lines like |---|---|
        .map((l) => {
          // Split by pipe, trim each cell
          return l
            .split("|")
            .map((cell) => cell.trim())
            .filter((cell, i, arr) => {
              // Remove empty first/last cells from leading/trailing pipes
              if (i === 0 && cell === "") return false;
              if (i === arr.length - 1 && cell === "") return false;
              return true;
            });
        });
    } else {
      // Whitespace-aligned: split by 3+ spaces
      rows = lines
        .filter((l) => l.trim().length > 0)
        .map((l) => {
          return l
            .trim()
            .split(/\s{3,}/)
            .map((cell) => cell.trim());
        });
    }

    if (rows.length === 0) return null;

    // First row is the header
    const headerRow = rows[0];
    const dataRows = rows.slice(1);

    return (
      <div key={`table-${key}`} className="mb-6 overflow-x-auto">
        <table className="w-full border-collapse border border-slate-400 bg-white text-base">
          <thead>
            <tr className="bg-slate-100">
              {headerRow.map((cell, ci) => (
                <th
                  key={ci}
                  className="border border-slate-400 px-4 py-3 text-left font-bold text-slate-900"
                >
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataRows.map((row, ri) => (
              <tr key={ri} className={ri % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    className="border border-slate-400 px-4 py-3 text-slate-800"
                  >
                    {cell || "\u00A0"}
                  </td>
                ))}
                {/* Pad cells if row is shorter than header */}
                {row.length < headerRow.length &&
                  Array.from({ length: headerRow.length - row.length }).map(
                    (_, ci) => (
                      <td
                        key={`pad-${ci}`}
                        className="border border-slate-400 px-4 py-3 text-slate-400"
                      >
                        {"\u00A0"}
                      </td>
                    )
                  )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // ── SMART VISUAL GENERATORS ─────────────────────────────────────────────────
  // These generate actual visual content from diagram_description text

  const renderPunnettSquare = (desc) => {
    // Extract allele symbols from description or question text
    const qText = currentQuestion.question_text || "";
    const combined = desc + " " + qText;

    // Try to extract allele symbols like "N" and "n", "H" and "h", "X" and "Y"
    const alleleMatch = combined.match(/(\w)\s*=\s*allele\s+for/gi);
    let alleles = [];
    if (alleleMatch) {
      alleles = alleleMatch.map(m => m.charAt(0));
    }

    // Check if it's sex inheritance (X/Y)
    const isSexInheritance = /sex\s+inherit|use the symbols x and y/i.test(combined);

    let parentLabels, rowHeaders, colHeaders;
    if (isSexInheritance) {
      parentLabels = { mother: "Mother (XX)", father: "Father (XY)" };
      colHeaders = ["X", "Y"];
      rowHeaders = ["X", "X"];
    } else if (alleles.length >= 2) {
      const dom = alleles[0];
      const rec = alleles.find(a => a !== alleles[0]) || alleles[1];
      parentLabels = { mother: `Parent 1 (${dom}${rec})`, father: `Parent 2 (${dom}${rec})` };
      colHeaders = [dom, rec];
      rowHeaders = [dom, rec];
    } else {
      parentLabels = { mother: "Parent 1", father: "Parent 2" };
      colHeaders = ["", ""];
      rowHeaders = ["", ""];
    }

    return (
      <div className="mb-8 p-6 bg-emerald-50 rounded-lg border-2 border-emerald-300">
        <p className="text-sm font-bold text-emerald-800 uppercase tracking-wide mb-4">Punnett Square</p>
        <div className="flex justify-center">
          <table className="border-collapse">
            <thead>
              <tr>
                <td className="w-24 h-10"></td>
                <td colSpan={2} className="text-center font-bold text-emerald-900 pb-2 text-sm">{parentLabels.father}</td>
              </tr>
              <tr>
                <td className="w-24 h-10"></td>
                {colHeaders.map((h, i) => (
                  <td key={i} className="w-20 h-10 text-center font-bold text-emerald-800 border border-emerald-400 bg-emerald-100 text-lg">{h}</td>
                ))}
              </tr>
            </thead>
            <tbody>
              {rowHeaders.map((rh, ri) => (
                <tr key={ri}>
                  {ri === 0 && (
                    <td rowSpan={2} className="text-center font-bold text-emerald-900 pr-2 text-sm" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
                      {parentLabels.mother}
                    </td>
                  )}
                  <td className="w-20 h-10 text-center font-bold text-emerald-800 border border-emerald-400 bg-emerald-100 text-lg">{rh}</td>
                  {colHeaders.map((ch, ci) => (
                    <td key={ci} className="w-20 h-16 text-center border-2 border-emerald-400 bg-white text-lg font-mono text-slate-400">
                      {rh && ch ? `${rh}${ch}` : "?"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-emerald-600 mt-4 text-center italic">
          Complete the Punnett square using the allele symbols given in the question.
        </p>
      </div>
    );
  };

  const renderNumberLine = (desc) => {
    // Extract range: "from 2 to 3", "from 0 to 10"
    const rangeMatch = desc.match(/from\s+([\d.-]+)\s+to\s+([\d.-]+)/i);
    const min = rangeMatch ? parseFloat(rangeMatch[1]) : 0;
    const max = rangeMatch ? parseFloat(rangeMatch[2]) : 10;
    const step = max - min <= 2 ? 0.1 : max - min <= 10 ? 1 : Math.ceil((max - min) / 10);
    const majorTicks = [];
    for (let v = min; v <= max + step * 0.01; v += step) {
      majorTicks.push(Math.round(v * 100) / 100);
    }
    // Limit ticks
    const displayTicks = majorTicks.length > 20 ? majorTicks.filter((_, i) => i % Math.ceil(majorTicks.length / 10) === 0 || _ === min || _ === max) : majorTicks;

    // Extract point labels: "point A marked"
    const pointMatch = desc.match(/point\s+(\w)\s+marked/i);

    return (
      <div className="mb-8 p-6 bg-indigo-50 rounded-lg border-2 border-indigo-300">
        <p className="text-sm font-bold text-indigo-800 uppercase tracking-wide mb-4">Number Line</p>
        <div className="flex justify-center overflow-x-auto">
          <svg viewBox={`-10 0 320 60`} className="w-full max-w-lg" style={{ minWidth: 280 }}>
            {/* Main line */}
            <line x1="10" y1="30" x2="300" y2="30" stroke="#4338ca" strokeWidth="2" />
            {/* Arrowheads */}
            <polygon points="300,30 294,26 294,34" fill="#4338ca" />
            <polygon points="10,30 16,26 16,34" fill="#4338ca" />
            {/* Ticks */}
            {displayTicks.map((val, i) => {
              const x = 20 + ((val - min) / (max - min)) * 270;
              return (
                <g key={i}>
                  <line x1={x} y1="24" x2={x} y2="36" stroke="#4338ca" strokeWidth="1.5" />
                  <text x={x} y="50" textAnchor="middle" fontSize="10" fill="#312e81">{val}</text>
                </g>
              );
            })}
            {/* Point marker if described */}
            {pointMatch && (
              <g>
                <circle cx="155" cy="30" r="5" fill="#dc2626" stroke="#991b1b" strokeWidth="1.5" />
                <text x="155" y="18" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#dc2626">{pointMatch[1]}</text>
              </g>
            )}
          </svg>
        </div>
        <p className="text-xs text-indigo-600 mt-3 text-center italic">{desc}</p>
      </div>
    );
  };

  const renderBarChart = (desc) => {
    // Extract axis info from description
    const yMatch = desc.match(/y-axis\s+(?:for|labeled?)\s+['"]?([^'",.]+)/i);
    const xMatch = desc.match(/x-axis\s+(?:for|labeled?)\s+['"]?([^'",.]+)/i);
    const yLabel = yMatch ? yMatch[1].trim() : "";
    const xLabel = xMatch ? xMatch[1].trim() : "";

    // Extract categories from "for X, Y, and Z" or "for X and Y"
    const catMatch = desc.match(/(?:for|showing)\s+(.+?)(?:\.|$)/i);
    let categories = [];
    if (catMatch) {
      categories = catMatch[1].split(/,\s*|\s+and\s+/).map(s => s.trim()).filter(s => s.length > 0 && s.length < 30);
    }
    if (categories.length === 0) categories = ["A", "B", "C"];
    if (categories.length > 8) categories = categories.slice(0, 8);

    return (
      <div className="mb-8 p-6 bg-sky-50 rounded-lg border-2 border-sky-300">
        <p className="text-sm font-bold text-sky-800 uppercase tracking-wide mb-4">Bar Chart</p>
        <div className="flex justify-center">
          <svg viewBox="0 0 300 200" className="w-full max-w-md">
            {/* Y axis */}
            <line x1="50" y1="20" x2="50" y2="160" stroke="#0c4a6e" strokeWidth="1.5" />
            {/* X axis */}
            <line x1="50" y1="160" x2="280" y2="160" stroke="#0c4a6e" strokeWidth="1.5" />
            {/* Y label */}
            {yLabel && <text x="10" y="90" transform="rotate(-90 10 90)" textAnchor="middle" fontSize="9" fill="#0c4a6e">{yLabel.slice(0, 30)}</text>}
            {/* X label */}
            {xLabel && <text x="165" y="190" textAnchor="middle" fontSize="9" fill="#0c4a6e">{xLabel.slice(0, 30)}</text>}
            {/* Grid lines */}
            {[0.25, 0.5, 0.75, 1].map((frac, i) => (
              <line key={i} x1="50" y1={160 - frac * 130} x2="280" y2={160 - frac * 130} stroke="#bae6fd" strokeWidth="0.5" strokeDasharray="4,4" />
            ))}
            {/* Empty bars (placeholder) */}
            {categories.map((cat, i) => {
              const barW = Math.min(35, 200 / categories.length - 8);
              const gap = 220 / categories.length;
              const x = 60 + i * gap + (gap - barW) / 2;
              return (
                <g key={i}>
                  <rect x={x} y="60" width={barW} height="100" fill="#bae6fd" stroke="#0284c7" strokeWidth="1" strokeDasharray="3,3" rx="2" />
                  <text x={x + barW / 2} y="175" textAnchor="middle" fontSize="8" fill="#0c4a6e">{cat.slice(0, 12)}</text>
                </g>
              );
            })}
            {/* "Data to be read" note */}
            <text x="165" y="45" textAnchor="middle" fontSize="9" fill="#64748b" fontStyle="italic">Read values from this chart</text>
          </svg>
        </div>
        <p className="text-xs text-sky-600 mt-3 text-center italic">{desc}</p>
      </div>
    );
  };

  const renderGraphGrid = (desc) => {
    // Extract axis labels
    const xMatch = desc.match(/x-axis\s+(?:for|labeled?)\s+['"]?([^'",.]+)/i);
    const yMatch = desc.match(/y-axis\s+(?:for|labeled?)\s+['"]?([^'",.]+)/i);
    // Or axis labels from format "'Label' and 'Label'"
    const quotedAxes = desc.match(/labeled?\s+['"]([^'"]+)['"]\s+and\s+['"]([^'"]+)['"]/i);
    const xLabel = xMatch ? xMatch[1].trim() : (quotedAxes ? quotedAxes[1] : "x");
    const yLabel = yMatch ? yMatch[1].trim() : (quotedAxes ? quotedAxes[2] : "y");
    // Extract equation if present
    const eqMatch = desc.match(/plotting\s+([\w\s=^+\-*/().0-9]+)/i);

    return (
      <div className="mb-8 p-6 bg-violet-50 rounded-lg border-2 border-violet-300">
        <p className="text-sm font-bold text-violet-800 uppercase tracking-wide mb-4">Graph Grid</p>
        <div className="flex justify-center">
          <svg viewBox="0 0 260 220" className="w-full max-w-sm">
            {/* Grid */}
            {Array.from({ length: 11 }).map((_, i) => (
              <g key={i}>
                <line x1={40 + i * 20} y1="10" x2={40 + i * 20} y2="190" stroke="#ddd6fe" strokeWidth="0.5" />
                <line x1="40" y1={10 + i * 18} x2="240" y2={10 + i * 18} stroke="#ddd6fe" strokeWidth="0.5" />
              </g>
            ))}
            {/* Axes */}
            <line x1="40" y1="190" x2="240" y2="190" stroke="#5b21b6" strokeWidth="1.5" />
            <line x1="40" y1="10" x2="40" y2="190" stroke="#5b21b6" strokeWidth="1.5" />
            {/* Arrowheads */}
            <polygon points="240,190 234,186 234,194" fill="#5b21b6" />
            <polygon points="40,10 36,16 44,16" fill="#5b21b6" />
            {/* Labels */}
            <text x="140" y="210" textAnchor="middle" fontSize="10" fill="#5b21b6">{xLabel.slice(0, 30)}</text>
            <text x="12" y="100" transform="rotate(-90 12 100)" textAnchor="middle" fontSize="10" fill="#5b21b6">{yLabel.slice(0, 30)}</text>
            {eqMatch && <text x="140" y="105" textAnchor="middle" fontSize="11" fill="#7c3aed" fontWeight="bold">{eqMatch[1].trim()}</text>}
          </svg>
        </div>
        <p className="text-xs text-violet-600 mt-3 text-center italic">Plot your graph on the grid. {desc}</p>
      </div>
    );
  };

  const renderCircuitDiagram = (desc, hideLabels = false) => {
    const descLower = desc.toLowerCase();
    // Detect parallel configuration
    const isParallel = /parallel|(?:two|2|three|3|multiple|several)\s+(?:resistor|lamp|heating\s+element|heater)/i.test(desc) ||
      ((desc.match(/resistor/gi) || []).length > 1) ||
      ((desc.match(/lamp/gi) || []).length > 1) ||
      /heating\s+element/i.test(desc);

    const hasAmmeter = /ammeter/i.test(desc);
    const hasVoltmeter = /voltmeter/i.test(desc);
    const hasSwitch = /switch/i.test(desc);
    const loadLabel = hideLabels ? "" : (/lamp/i.test(desc) ? "L" : /heating/i.test(desc) ? "H" : "R");
    const loadName = /lamp/i.test(desc) ? "Lamp" : /heating/i.test(desc) ? "Heater" : "Resistor";

    // Numbered marker helper for hideLabels mode
    const _cm = (cx, cy, num) => (
      <g key={`cm${num}`}>
        <circle cx={cx} cy={cy} r="9" fill="#1e40af" stroke="#fff" strokeWidth="1.5" />
        <text x={cx} y={cy + 3.5} textAnchor="middle" fontSize="8" fontWeight="bold" fill="#fff">{num}</text>
      </g>
    );

    return (
      <div className="mb-8 p-6 bg-amber-50 rounded-lg border-2 border-amber-300">
        <p className="text-sm font-bold text-amber-800 uppercase tracking-wide mb-4">Circuit Diagram</p>
        <div className="flex justify-center">
          {isParallel ? (
            <svg viewBox="0 0 340 220" className="w-full max-w-md">
              {/* Main horizontal bus — top */}
              <line x1="30" y1="40" x2="310" y2="40" stroke="#92400e" strokeWidth="2" />
              {/* Main horizontal bus — bottom */}
              <line x1="30" y1="180" x2="310" y2="180" stroke="#92400e" strokeWidth="2" />
              {/* Left vertical */}
              <line x1="30" y1="40" x2="30" y2="180" stroke="#92400e" strokeWidth="2" />
              {/* Right vertical */}
              <line x1="310" y1="40" x2="310" y2="180" stroke="#92400e" strokeWidth="2" />

              {/* Battery on left side */}
              <line x1="25" y1="90" x2="35" y2="90" stroke="#92400e" strokeWidth="4" />
              <line x1="22" y1="100" x2="38" y2="100" stroke="#92400e" strokeWidth="2" />
              <text x="15" y="80" fontSize="8" fill="#92400e" fontWeight="bold">+</text>
              <text x="15" y="115" fontSize="8" fill="#92400e" fontWeight="bold">−</text>

              {/* Ammeter in series (top wire) */}
              {hasAmmeter && (
                <g>
                  <circle cx="80" cy="40" r="12" fill="#fff" stroke="#92400e" strokeWidth="1.5" />
                  {hideLabels ? _cm(80, 40, 4) : <text x="80" y="44" textAnchor="middle" fontSize="10" fill="#92400e" fontWeight="bold">A</text>}
                </g>
              )}

              {/* Switch on top wire */}
              {hasSwitch && (
                <g>
                  <circle cx="140" cy="40" r="3" fill="#92400e" />
                  <line x1="140" y1="40" x2="160" y2="30" stroke="#92400e" strokeWidth="2" />
                  <circle cx="165" cy="40" r="3" fill="#92400e" />
                </g>
              )}

              {/* Parallel branches */}
              {[0, 1, 2].map((i) => {
                const x = 150 + i * 60;
                return (
                  <g key={`branch${i}`}>
                    <line x1={x} y1="40" x2={x} y2="85" stroke="#92400e" strokeWidth="2" />
                    <rect x={x - 15} y="85" width="30" height="30" fill="#fef3c7" stroke="#92400e" strokeWidth="2" rx="3" />
                    {hideLabels ? _cm(x, 100, i + 1) : <text x={x} y="104" textAnchor="middle" fontSize="10" fill="#92400e" fontWeight="bold">{loadLabel}{i + 1}</text>}
                    <line x1={x} y1="115" x2={x} y2="180" stroke="#92400e" strokeWidth="2" />
                  </g>
                );
              })}

              {/* Voltmeter across parallel section */}
              {hasVoltmeter && (
                <g>
                  <circle cx="290" cy="110" r="12" fill="#fff" stroke="#92400e" strokeWidth="1.5" />
                  {hideLabels ? _cm(290, 110, 5) : <text x="290" y="114" textAnchor="middle" fontSize="10" fill="#92400e" fontWeight="bold">V</text>}
                  <line x1="290" y1="98" x2="290" y2="50" stroke="#92400e" strokeWidth="1" strokeDasharray="3 2" />
                  <line x1="290" y1="122" x2="290" y2="170" stroke="#92400e" strokeWidth="1" strokeDasharray="3 2" />
                </g>
              )}

              {!hideLabels && <text x="170" y="210" textAnchor="middle" fontSize="9" fill="#78350f" fontWeight="bold">Parallel Circuit — {loadName}s</text>}
            </svg>
          ) : (
            <svg viewBox="0 0 300 160" className="w-full max-w-sm">
              {/* Series circuit loop */}
              <rect x="30" y="20" width="240" height="120" rx="10" fill="none" stroke="#92400e" strokeWidth="2" />

              {/* Battery symbol (left side) */}
              <line x1="25" y1="60" x2="35" y2="60" stroke="#92400e" strokeWidth="4" />
              <line x1="22" y1="70" x2="38" y2="70" stroke="#92400e" strokeWidth="2" />
              <text x="15" y="52" fontSize="8" fill="#92400e" fontWeight="bold">+</text>
              <text x="15" y="85" fontSize="8" fill="#92400e" fontWeight="bold">−</text>

              {/* Switch (top-left) */}
              {hasSwitch && (
                <g>
                  <circle cx="80" cy="20" r="3" fill="#92400e" />
                  <line x1="80" y1="20" x2="100" y2="10" stroke="#92400e" strokeWidth="2" />
                  <circle cx="105" cy="20" r="3" fill="#92400e" />
                </g>
              )}

              {/* Load component (top-right) */}
              <rect x="165" y="8" width="40" height="24" fill="#fef3c7" stroke="#92400e" strokeWidth="2" rx="3" />
              {hideLabels ? _cm(185, 20, 1) : <text x="185" y="24" textAnchor="middle" fontSize="10" fill="#92400e" fontWeight="bold">{loadLabel}</text>}

              {/* Ammeter (bottom) */}
              {hasAmmeter && (
                <g>
                  <circle cx="150" cy="140" r="12" fill="#fff" stroke="#92400e" strokeWidth="1.5" />
                  {hideLabels ? _cm(150, 140, 2) : <text x="150" y="144" textAnchor="middle" fontSize="10" fill="#92400e" fontWeight="bold">A</text>}
                </g>
              )}

              {/* Voltmeter (right, parallel across load) */}
              {hasVoltmeter && (
                <g>
                  <circle cx="280" cy="80" r="12" fill="#fff" stroke="#92400e" strokeWidth="1.5" />
                  {hideLabels ? _cm(280, 80, 3) : <text x="280" y="84" textAnchor="middle" fontSize="10" fill="#92400e" fontWeight="bold">V</text>}
                  <line x1="280" y1="68" x2="280" y2="30" stroke="#92400e" strokeWidth="1" strokeDasharray="3 2" />
                  <line x1="280" y1="92" x2="280" y2="130" stroke="#92400e" strokeWidth="1" strokeDasharray="3 2" />
                </g>
              )}

              {!hideLabels && <text x="150" y="155" textAnchor="middle" fontSize="9" fill="#78350f" fontWeight="bold">Series Circuit</text>}
            </svg>
          )}
        </div>
        <p className="text-xs text-amber-600 mt-3 text-center italic">{desc}</p>
      </div>
    );
  };

  const renderGeometryDiagram = (desc) => {
    const descLower = desc.toLowerCase();
    // Extract dimensions if present
    const dimMatches = desc.match(/(\d+(?:\.\d+)?)\s*cm/gi) || [];
    const dims = dimMatches.map(m => parseFloat(m));

    let shape = null;
    if (/triangle/i.test(desc)) {
      shape = (
        <polygon points="120,30 40,150 200,150" fill="#ede9fe" stroke="#7c3aed" strokeWidth="2" />
      );
      // Add dimension labels if available
    } else if (/rectangle|square/i.test(desc)) {
      shape = (
        <rect x="50" y="40" width="140" height="100" fill="#ede9fe" stroke="#7c3aed" strokeWidth="2" rx="2" />
      );
    } else if (/hexagon/i.test(desc)) {
      shape = (
        <polygon points="120,30 190,60 190,120 120,150 50,120 50,60" fill="#ede9fe" stroke="#7c3aed" strokeWidth="2" />
      );
    } else if (/prism/i.test(desc)) {
      shape = (
        <g>
          <polygon points="60,130 140,130 180,50" fill="#ede9fe" stroke="#7c3aed" strokeWidth="2" />
          <polygon points="60,130 90,110 170,110 180,50" fill="none" stroke="#7c3aed" strokeWidth="1.5" strokeDasharray="4,3" />
          <line x1="140" y1="130" x2="170" y2="110" stroke="#7c3aed" strokeWidth="2" />
          <line x1="180" y1="50" x2="170" y2="110" stroke="#7c3aed" strokeWidth="1.5" strokeDasharray="4,3" />
        </g>
      );
    } else if (/circle/i.test(desc)) {
      shape = (
        <circle cx="120" cy="90" r="60" fill="#ede9fe" stroke="#7c3aed" strokeWidth="2" />
      );
    } else {
      // Quadrilateral
      shape = (
        <polygon points="60,40 190,50 180,140 40,130" fill="#ede9fe" stroke="#7c3aed" strokeWidth="2" />
      );
    }

    return (
      <div className="mb-8 p-6 bg-violet-50 rounded-lg border-2 border-violet-300">
        <p className="text-sm font-bold text-violet-800 uppercase tracking-wide mb-4">Diagram</p>
        <div className="flex justify-center">
          <svg viewBox="0 0 240 180" className="w-full max-w-xs">
            {/* Grid for centimetre grid descriptions */}
            {/grid/i.test(desc) && Array.from({ length: 13 }).map((_, i) => (
              <g key={i}>
                <line x1={i * 20} y1="0" x2={i * 20} y2="180" stroke="#e2e8f0" strokeWidth="0.5" />
                <line x1="0" y1={i * 15} x2="240" y2={i * 15} stroke="#e2e8f0" strokeWidth="0.5" />
              </g>
            ))}
            {shape}
            {/* Dimension labels */}
            {dims.map((d, i) => (
              <text key={i} x={i === 0 ? 120 : 200} y={i === 0 ? 170 : 90} textAnchor="middle" fontSize="11" fill="#5b21b6" fontWeight="bold">{d} cm</text>
            ))}
            {/* Angle labels if present */}
            {/angles?\s+labeled/i.test(desc) && (
              <g>
                <text x="70" y="60" fontSize="12" fill="#7c3aed" fontWeight="bold">a</text>
                <text x="170" y="60" fontSize="12" fill="#7c3aed" fontWeight="bold">b</text>
                <text x="165" y="135" fontSize="12" fill="#7c3aed" fontWeight="bold">x</text>
                <text x="55" y="135" fontSize="12" fill="#7c3aed" fontWeight="bold">y</text>
              </g>
            )}
          </svg>
        </div>
        <p className="text-xs text-violet-600 mt-3 text-center italic">{desc}</p>
      </div>
    );
  };

  const renderDotAndCross = (desc) => {
    // Dot-and-cross diagrams for bonding (H2O, HCl, NH3 etc)
    const moleculeName = desc.match(/(?:for|of)\s+(?:a\s+)?(\w[\w\s()]+?)(?:\s+molecule)?\.?$/i)?.[1] || "molecule";

    return (
      <div className="mb-8 p-6 bg-cyan-50 rounded-lg border-2 border-cyan-300">
        <p className="text-sm font-bold text-cyan-800 uppercase tracking-wide mb-4">Dot and Cross Diagram</p>
        <div className="flex justify-center">
          <svg viewBox="0 0 200 140" className="w-full max-w-xs">
            {/* Central atom */}
            <circle cx="100" cy="70" r="35" fill="none" stroke="#0e7490" strokeWidth="2" />
            <text x="100" y="75" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#0e7490">Central atom</text>
            {/* Outer electron shells */}
            <circle cx="55" cy="45" r="20" fill="none" stroke="#06b6d4" strokeWidth="1.5" strokeDasharray="4,3" />
            <circle cx="145" cy="45" r="20" fill="none" stroke="#06b6d4" strokeWidth="1.5" strokeDasharray="4,3" />
            {/* Legend */}
            <circle cx="30" cy="125" r="4" fill="#0e7490" />
            <text x="40" y="128" fontSize="9" fill="#0e7490">= electron from atom 1</text>
            <text x="30" y="118" fontSize="9" fill="#06b6d4">× = electron from atom 2</text>
          </svg>
        </div>
        <p className="text-sm text-cyan-700 mt-3 text-center">
          Complete the dot and cross diagram for <strong>{moleculeName}</strong>.
          Show the outer electron shells and shared electron pairs.
        </p>
      </div>
    );
  };

  // ── ANATOMY DIAGRAM RENDERER ──────────────────────────────────────────────────
  const renderAnatomyDiagram = (desc, hideLabels = false) => {
    const descLower = desc.toLowerCase();

    // Numbered circle marker helper for hideLabels mode
    const _am = (cx, cy, num) => (
      <g key={`am${num}`}>
        <circle cx={cx} cy={cy} r="10" fill="#1e40af" stroke="#fff" strokeWidth="1.5" />
        <text x={cx} y={cy + 3.5} textAnchor="middle" fontSize="9" fontWeight="bold" fill="#fff">{num}</text>
      </g>
    );

    // ── ENDOCRINE SYSTEM ──────────────────────────────────────────
    if (/endocrine|gland/i.test(descLower)) {
      // Extract labels from description or sibling question text
      const parentNum = currentQuestion.question_number?.split('.')[0];
      const siblingTexts = questions
        .filter(q => q.question_number?.startsWith(parentNum))
        .map(q => (q.question_text || '') + ' ' + (q.diagram_description || ''))
        .join(' ');

      const glandLabels = [];
      const glandMap = [
        { name: 'Pituitary gland', regex: /pituitary/i, cx: 200, cy: 62 },
        { name: 'Thyroid gland', regex: /thyroid/i, cx: 200, cy: 108 },
        { name: 'Adrenal gland', regex: /adrenal/i, cx: 168, cy: 195 },
        { name: 'Pancreas', regex: /pancreas/i, cx: 220, cy: 225 },
        { name: 'Ovary', regex: /ovar/i, cx: 200, cy: 295 },
        { name: 'Testis', regex: /test(?:is|es)/i, cx: 200, cy: 310 },
        { name: 'Thymus', regex: /thymus/i, cx: 200, cy: 145 },
      ];

      glandMap.forEach(g => {
        if (g.regex.test(siblingTexts) || g.regex.test(desc)) glandLabels.push(g);
      });
      // If none found, show the 4 most common
      if (glandLabels.length === 0) {
        glandLabels.push(glandMap[0], glandMap[1], glandMap[2], glandMap[3]);
      }

      const letters = 'ABCDEFG';

      return (
        <div className="mb-8 p-5 bg-emerald-50 rounded-lg border-2 border-emerald-300">
          <div className="flex items-center gap-2 mb-3">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-emerald-700">
              <circle cx="10" cy="5" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
              <path d="M10 8v8M6 20l4-4 4 4M4 13h12" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round" />
            </svg>
            <p className="text-sm font-bold text-emerald-800 uppercase tracking-wide">Human Body — Endocrine System</p>
          </div>
          <svg viewBox="0 0 400 380" className="w-full mx-auto" style={{ maxWidth: 360, maxHeight: 380 }}>
            {/* Body outline */}
            <ellipse cx="200" cy="50" rx="30" ry="35" fill="#fde68a" stroke="#92400e" strokeWidth="1.5" />
            <rect x="175" y="80" width="50" height="4" rx="2" fill="#fbbf24" stroke="#92400e" strokeWidth="1" />
            <path d="M175 84 Q160 84 155 100 L150 170 Q148 180 158 180 L175 180 Z" fill="#bfdbfe" stroke="#1e40af" strokeWidth="1.2" />
            <path d="M225 84 Q240 84 245 100 L250 170 Q252 180 242 180 L225 180 Z" fill="#bfdbfe" stroke="#1e40af" strokeWidth="1.2" />
            <path d="M175 84 L170 200 Q165 280 175 320 L180 340 Q182 350 190 350 L210 350 Q218 350 220 340 L225 320 Q235 280 230 200 L225 84 Z" fill="#bfdbfe" stroke="#1e40af" strokeWidth="1.2" />
            <line x1="200" y1="200" x2="200" y2="340" stroke="#1e40af" strokeWidth="0.5" strokeDasharray="3 3" />

            {/* Brain indicator */}
            <ellipse cx="200" cy="42" rx="18" ry="12" fill="#ddd6fe" stroke="#6d28d9" strokeWidth="1" />
            <text x="200" y="46" textAnchor="middle" fontSize="7" fill="#6d28d9" fontWeight="bold">Brain</text>

            {/* Gland labels with lines */}
            {glandLabels.map((gland, i) => {
              const labelX = i % 2 === 0 ? 50 : 310;
              const labelY = 55 + i * 42;
              return (
                <g key={i}>
                  <circle cx={gland.cx} cy={gland.cy} r="8" fill="#f59e0b" stroke="#92400e" strokeWidth="1.5" opacity="0.85" />
                  <text x={gland.cx} y={gland.cy + 4} textAnchor="middle" fontSize="9" fontWeight="bold" fill="#fff">{letters[i]}</text>
                  <line x1={gland.cx + (labelX < 200 ? -8 : 8)} y1={gland.cy} x2={labelX + (labelX < 200 ? 70 : -10)} y2={labelY} stroke="#92400e" strokeWidth="1" strokeDasharray="3 2" />
                  <rect x={labelX - (labelX < 200 ? 5 : 5)} y={labelY - 10} width="90" height="20" rx="4" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1" />
                  <text x={labelX + 40} y={labelY + 4} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#92400e">Gland {letters[i]}</text>
                </g>
              );
            })}
          </svg>
          <p className="text-sm text-emerald-700 mt-3 text-center">
            The diagram shows the human body with endocrine glands labelled {glandLabels.map((_, i) => letters[i]).join(', ')}.
          </p>
        </div>
      );
    }

    // ── HUMAN HEART ──────────────────────────────────────────────
    if (/heart|chamber|ventricle|atri/i.test(descLower)) {
      return (
        <div className="mb-8 p-5 bg-red-50 rounded-lg border-2 border-red-300">
          <div className="flex items-center gap-2 mb-3">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-red-700">
              <path d="M10 18s-7-5-7-10a4 4 0 018 0 4 4 0 018 0c0 5-7 10-7 10z" stroke="currentColor" strokeWidth="1.5" fill="none" />
            </svg>
            <p className="text-sm font-bold text-red-800 uppercase tracking-wide">The Heart</p>
          </div>
          <svg viewBox="0 0 400 340" className="w-full mx-auto" style={{ maxWidth: 380, maxHeight: 340 }}>
            {/* Outer heart shape */}
            <path d="M200 40 Q120 20 100 80 Q80 140 100 200 L200 300 L300 200 Q320 140 300 80 Q280 20 200 40Z" fill="#fecaca" stroke="#991b1b" strokeWidth="2" />
            {/* Septum */}
            <line x1="200" y1="60" x2="200" y2="280" stroke="#991b1b" strokeWidth="2.5" />
            {/* Horizontal divide */}
            <line x1="110" y1="160" x2="290" y2="160" stroke="#991b1b" strokeWidth="2" />
            {/* Chamber labels */}
            <text x="150" y="120" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#991b1b">A</text>
            {!hideLabels && <><text x="150" y="136" textAnchor="middle" fontSize="9" fill="#7f1d1d">Right</text><text x="150" y="147" textAnchor="middle" fontSize="9" fill="#7f1d1d">atrium</text></>}
            <text x="250" y="120" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#991b1b">B</text>
            {!hideLabels && <><text x="250" y="136" textAnchor="middle" fontSize="9" fill="#7f1d1d">Left</text><text x="250" y="147" textAnchor="middle" fontSize="9" fill="#7f1d1d">atrium</text></>}
            <text x="150" y="210" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#991b1b">C</text>
            {!hideLabels && <><text x="150" y="226" textAnchor="middle" fontSize="9" fill="#7f1d1d">Right</text><text x="150" y="237" textAnchor="middle" fontSize="9" fill="#7f1d1d">ventricle</text></>}
            <text x="250" y="210" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#991b1b">D</text>
            {!hideLabels && <><text x="250" y="226" textAnchor="middle" fontSize="9" fill="#7f1d1d">Left</text><text x="250" y="237" textAnchor="middle" fontSize="9" fill="#7f1d1d">ventricle</text></>}
            {/* Valves */}
            <ellipse cx="150" cy="160" rx="18" ry="5" fill="#fca5a5" stroke="#991b1b" strokeWidth="1" />
            <ellipse cx="250" cy="160" rx="18" ry="5" fill="#fca5a5" stroke="#991b1b" strokeWidth="1" />
            {/* Blood vessels */}
            <path d="M130 60 Q120 30 100 25 L80 25" stroke="#2563eb" strokeWidth="2.5" fill="none" />
            {hideLabels ? _am(55, 25, 1) : <text x="55" y="29" fontSize="8" fill="#2563eb" fontWeight="bold">Vena cava</text>}
            <path d="M270 60 Q290 40 310 30" stroke="#dc2626" strokeWidth="2.5" fill="none" />
            {hideLabels ? _am(318, 30, 2) : <text x="312" y="34" fontSize="8" fill="#dc2626" fontWeight="bold">Aorta</text>}
            <path d="M220 55 Q230 30 250 20" stroke="#dc2626" strokeWidth="2" fill="none" />
            {hideLabels ? _am(265, 14, 3) : <text x="252" y="17" fontSize="7" fill="#dc2626">Pulmonary vein</text>}
            <path d="M170 55 Q160 30 140 20" stroke="#2563eb" strokeWidth="2" fill="none" />
            {hideLabels ? _am(100, 14, 4) : <text x="90" y="17" fontSize="7" fill="#2563eb">Pulmonary artery</text>}
            {/* Flow arrows */}
            <path d="M150 140 L150 170" stroke="#991b1b" strokeWidth="1.5" markerEnd="url(#arrowRed)" />
            <path d="M250 140 L250 170" stroke="#991b1b" strokeWidth="1.5" markerEnd="url(#arrowRed)" />
            <defs>
              <marker id="arrowRed" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
                <path d="M0 0 L6 2 L0 4Z" fill="#991b1b" />
              </marker>
            </defs>
          </svg>
          <p className="text-sm text-red-700 mt-3 text-center">
            The diagram shows a cross-section of the human heart with four chambers labelled A–D.
          </p>
        </div>
      );
    }

    // ── BREATHING / RESPIRATORY SYSTEM ───────────────────────────
    if (/breathing|respiratory|lung|diaphragm|trachea/i.test(descLower)) {
      return (
        <div className="mb-8 p-5 bg-sky-50 rounded-lg border-2 border-sky-300">
          <div className="flex items-center gap-2 mb-3">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-sky-700">
              <path d="M10 2v8M6 6l4 4 4-4M4 14c0-3 3-4 6-4s6 1 6 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round" />
            </svg>
            <p className="text-sm font-bold text-sky-800 uppercase tracking-wide">Breathing System</p>
          </div>
          <svg viewBox="0 0 400 320" className="w-full mx-auto" style={{ maxWidth: 380 }}>
            {/* Trachea */}
            <rect x="190" y="20" width="20" height="80" rx="5" fill="#bae6fd" stroke="#0369a1" strokeWidth="1.5" />
            {hideLabels ? _am(165, 55, 1) : (<><text x="170" y="55" fontSize="9" fill="#0c4a6e" textAnchor="end" fontWeight="bold">Trachea</text><line x1="172" y1="52" x2="190" y2="55" stroke="#0369a1" strokeWidth="0.8" strokeDasharray="2 2" /></>)}
            {/* Bronchi */}
            <path d="M195 100 Q180 115 155 130" stroke="#0369a1" strokeWidth="2" fill="none" />
            <path d="M205 100 Q220 115 245 130" stroke="#0369a1" strokeWidth="2" fill="none" />
            {hideLabels ? _am(128, 118, 2) : <text x="130" y="122" fontSize="8" fill="#0c4a6e" textAnchor="end">Bronchus</text>}
            {/* Lungs */}
            <ellipse cx="140" cy="195" rx="65" ry="80" fill="#dbeafe" stroke="#1d4ed8" strokeWidth="1.5" />
            <ellipse cx="260" cy="195" rx="65" ry="80" fill="#dbeafe" stroke="#1d4ed8" strokeWidth="1.5" />
            {hideLabels ? (<>{_am(140, 195, 3)}{_am(260, 195, 4)}</>) : (<><text x="140" y="195" textAnchor="middle" fontSize="11" fill="#1e3a5f" fontWeight="bold">Left lung</text><text x="260" y="195" textAnchor="middle" fontSize="11" fill="#1e3a5f" fontWeight="bold">Right lung</text></>)}
            {/* Bronchioles inside lungs */}
            <path d="M155 135 Q140 155 130 175 Q125 190 135 200" stroke="#0369a1" strokeWidth="1" fill="none" strokeDasharray="3 2" />
            <path d="M245 135 Q260 155 270 175 Q275 190 265 200" stroke="#0369a1" strokeWidth="1" fill="none" strokeDasharray="3 2" />
            {/* Alveoli clusters */}
            {[{ cx: 125, cy: 215 }, { cx: 145, cy: 230 }, { cx: 155, cy: 210 }, { cx: 250, cy: 215 }, { cx: 270, cy: 230 }, { cx: 240, cy: 210 }].map((a, i) => (
              <circle key={i} cx={a.cx} cy={a.cy} r="8" fill="#93c5fd" stroke="#1d4ed8" strokeWidth="0.8" opacity="0.7" />
            ))}
            {hideLabels ? _am(140, 250, 5) : <text x="140" y="255" textAnchor="middle" fontSize="7" fill="#1d4ed8">Alveoli</text>}
            {/* Diaphragm */}
            <path d="M65 280 Q200 250 335 280" stroke="#dc2626" strokeWidth="2.5" fill="none" />
            {hideLabels ? _am(350, 274, 6) : <text x="350" y="280" fontSize="9" fill="#dc2626" fontWeight="bold">Diaphragm</text>}
            {/* Ribs */}
            <path d="M80 140 Q200 120 320 140" stroke="#9ca3af" strokeWidth="1" fill="none" />
            <path d="M70 175 Q200 155 330 175" stroke="#9ca3af" strokeWidth="1" fill="none" />
            <path d="M65 210 Q200 190 335 210" stroke="#9ca3af" strokeWidth="1" fill="none" />
            {hideLabels ? _am(340, 172, 7) : <text x="340" y="178" fontSize="7" fill="#6b7280">Ribs</text>}
          </svg>
          <p className="text-sm text-sky-700 mt-3 text-center">
            The diagram shows the human breathing system including the trachea, bronchi, lungs, and diaphragm.
          </p>
        </div>
      );
    }

    // ── DIGESTIVE SYSTEM ─────────────────────────────────────────
    if (/digestive|stomach|intestine|oesophagus|gullet/i.test(descLower)) {
      return (
        <div className="mb-8 p-5 bg-amber-50 rounded-lg border-2 border-amber-300">
          <div className="flex items-center gap-2 mb-3">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-amber-700">
              <path d="M10 2v4M8 6h4v3c0 2-1 3-2 4s-2 2-2 4v1h4v-1c0-2-1-3-2-4s-2-2-2-4V6" stroke="currentColor" strokeWidth="1.2" fill="none" />
            </svg>
            <p className="text-sm font-bold text-amber-800 uppercase tracking-wide">Digestive System</p>
          </div>
          <svg viewBox="0 0 340 400" className="w-full mx-auto" style={{ maxWidth: 340 }}>
            {/* Mouth */}
            <ellipse cx="170" cy="28" rx="22" ry="12" fill="#fecaca" stroke="#991b1b" strokeWidth="1.2" />
            {hideLabels ? _am(170, 28, 1) : <text x="170" y="32" textAnchor="middle" fontSize="8" fill="#991b1b" fontWeight="bold">Mouth</text>}
            {/* Oesophagus */}
            <rect x="164" y="40" width="12" height="50" rx="4" fill="#fed7aa" stroke="#c2410c" strokeWidth="1.2" />
            {hideLabels ? _am(125, 65, 2) : (<><text x="125" y="68" fontSize="8" fill="#9a3412" fontWeight="bold" textAnchor="end">Oesophagus</text><line x1="127" y1="65" x2="164" y2="65" stroke="#c2410c" strokeWidth="0.8" strokeDasharray="2 2" /></>)}
            {/* Stomach */}
            <path d="M160 90 Q130 95 125 120 Q120 155 150 165 Q170 170 185 160 Q200 145 195 115 Q190 90 175 88 Z" fill="#fde68a" stroke="#92400e" strokeWidth="1.5" />
            {hideLabels ? _am(158, 130, 3) : <text x="158" y="132" textAnchor="middle" fontSize="9" fill="#78350f" fontWeight="bold">Stomach</text>}
            {/* Small intestine (coiled) */}
            <path d="M160 168 Q120 180 130 200 Q140 220 180 215 Q220 210 210 230 Q200 250 150 245 Q110 240 120 260 Q130 275 180 270" stroke="#c2410c" strokeWidth="3" fill="none" strokeLinecap="round" />
            {hideLabels ? _am(250, 222, 4) : (<><text x="250" y="225" fontSize="8" fill="#9a3412" fontWeight="bold">Small intestine</text><line x1="218" y1="222" x2="248" y2="222" stroke="#c2410c" strokeWidth="0.8" strokeDasharray="2 2" /></>)}
            {/* Large intestine */}
            <path d="M100 185 L90 280 Q88 310 120 315 L230 315 Q260 315 258 290 L255 200" stroke="#a16207" strokeWidth="4" fill="none" strokeLinecap="round" />
            {hideLabels ? _am(58, 252, 5) : (<><text x="60" y="250" fontSize="8" fill="#854d0e" fontWeight="bold" textAnchor="end">Large</text><text x="60" y="262" fontSize="8" fill="#854d0e" fontWeight="bold" textAnchor="end">intestine</text></>)}
            {/* Rectum */}
            <rect x="165" y="320" width="18" height="30" rx="4" fill="#fbbf24" stroke="#92400e" strokeWidth="1.2" />
            {hideLabels ? _am(200, 337, 6) : <text x="200" y="340" fontSize="8" fill="#78350f" fontWeight="bold">Rectum</text>}
            {/* Liver */}
            <ellipse cx="225" cy="105" rx="35" ry="22" fill="#bbf7d0" stroke="#166534" strokeWidth="1.2" />
            {hideLabels ? _am(225, 105, 7) : <text x="225" y="109" textAnchor="middle" fontSize="8" fill="#166534" fontWeight="bold">Liver</text>}
            {/* Pancreas */}
            <ellipse cx="230" cy="160" rx="30" ry="10" fill="#e9d5ff" stroke="#7c3aed" strokeWidth="1" />
            {hideLabels ? _am(230, 160, 8) : <text x="230" y="164" textAnchor="middle" fontSize="7" fill="#6d28d9" fontWeight="bold">Pancreas</text>}
          </svg>
          <p className="text-sm text-amber-700 mt-3 text-center">
            The diagram shows the human digestive system with key organs labelled.
          </p>
        </div>
      );
    }

    // ── GENERIC ANATOMY FALLBACK ─────────────────────────────────
    return (
      <div className="mb-8 p-5 bg-emerald-50 rounded-lg border-2 border-emerald-300">
        <div className="flex items-center gap-2 mb-3">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-emerald-700">
            <circle cx="10" cy="5" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
            <path d="M10 8v8M6 20l4-4 4 4M4 13h12" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round" />
          </svg>
          <p className="text-sm font-bold text-emerald-800 uppercase tracking-wide">Anatomy Diagram</p>
        </div>
        <p className="text-emerald-900 text-base leading-relaxed">{desc}</p>
        <p className="text-xs text-emerald-600 mt-3 italic">
          The anatomy diagram from the original exam paper is described above.
        </p>
      </div>
    );
  };

  // ── CLASSIFICATION TABLE RENDERER ─────────────────────────────────────────────
  const renderClassificationTable = (desc) => {
    const levels = ['Kingdom', 'Phylum', 'Class', 'Order', 'Family', 'Genus', 'Species'];

    // Try extracting species/groups from description and sibling questions
    const parentNum = currentQuestion.question_number?.split('.')[0];
    const siblingTexts = questions
      .filter(q => q.question_number?.startsWith(parentNum))
      .map(q => (q.question_text || '') + ' ' + (q.diagram_description || ''))
      .join(' ');
    const combinedText = desc + ' ' + siblingTexts;

    // Extract column headers (species/organisms)
    const organisms = [];
    const orgPatterns = [
      /silverfish/i, /dragonfl/i, /grasshopper/i, /beetle/i, /butterfl/i, /moth/i,
      /spider/i, /scorpion/i, /crab/i, /lobster/i, /ant/i, /bee/i, /wasp/i,
      /fish/i, /frog/i, /toad/i, /lizard/i, /snake/i, /bird/i, /mammal/i,
      /cat/i, /dog/i, /horse/i, /whale/i, /dolphin/i, /bat/i, /rat/i, /mouse/i,
      /human/i, /chimpanzee/i, /gorilla/i, /lion/i, /tiger/i, /bear/i, /wolf/i,
      /eagle/i, /hawk/i, /robin/i, /sparrow/i, /salmon/i, /trout/i, /shark/i,
      /rose/i, /oak/i, /daisy/i, /tulip/i, /moss/i, /fern/i, /pine/i,
    ];
    orgPatterns.forEach(p => {
      const m = combinedText.match(p);
      if (m) {
        const name = m[0].charAt(0).toUpperCase() + m[0].slice(1).toLowerCase();
        if (!organisms.includes(name)) organisms.push(name);
      }
    });

    // If no organisms found, check for generic column count
    const colCount = Math.max(organisms.length, 2);
    const cols = organisms.length > 0 ? organisms : Array.from({ length: colCount }, (_, i) => `Organism ${i + 1}`);

    return (
      <div className="mb-8 p-5 bg-indigo-50 rounded-lg border-2 border-indigo-300">
        <div className="flex items-center gap-2 mb-3">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-indigo-700">
            <rect x="2" y="2" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
            <line x1="2" y1="7" x2="18" y2="7" stroke="currentColor" strokeWidth="1" />
            <line x1="2" y1="11" x2="18" y2="11" stroke="currentColor" strokeWidth="1" />
            <line x1="2" y1="15" x2="18" y2="15" stroke="currentColor" strokeWidth="1" />
            <line x1="8" y1="2" x2="8" y2="18" stroke="currentColor" strokeWidth="1" />
          </svg>
          <p className="text-sm font-bold text-indigo-800 uppercase tracking-wide">Classification Table</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border-2 border-indigo-400 bg-indigo-200 text-indigo-900 px-3 py-2 text-left font-bold" style={{ minWidth: 100 }}>
                  Classification level
                </th>
                {cols.map((org, i) => (
                  <th key={i} className="border-2 border-indigo-400 bg-indigo-200 text-indigo-900 px-3 py-2 text-center font-bold" style={{ minWidth: 90 }}>
                    {org}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {levels.map((level, li) => (
                <tr key={li} className={li % 2 === 0 ? 'bg-white' : 'bg-indigo-50/50'}>
                  <td className="border-2 border-indigo-300 px-3 py-2 font-semibold text-indigo-900">{level}</td>
                  {cols.map((_, ci) => (
                    <td key={ci} className="border-2 border-indigo-300 px-3 py-2 text-center text-slate-400 italic text-xs">
                      —
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-indigo-600 mt-3 italic">
          Use the classification table above to answer this question. Fill in the taxonomy levels as required.
        </p>
      </div>
    );
  };

  // ── EVOLUTIONARY TREE RENDERER ────────────────────────────────────────────────
  const renderEvolutionaryTree = (desc) => {
    // Scan sibling questions for species names to reconstruct the tree
    const parentNum = currentQuestion.question_number?.split('.')[0];
    const siblingTexts = questions
      .filter(q => q.question_number?.startsWith(parentNum + '.'))
      .map(q => (q.question_text || '') + ' ' + (q.diagram_description || ''))
      .join(' ');

    // Check for the AQA insect evolutionary tree (very common GCSE question)
    if (/insect/i.test(desc) || (/insect/i.test(siblingTexts) && /ancestor/i.test(siblingTexts))) {
      return (
        <div className="mb-8 p-5 bg-green-50 rounded-lg border-2 border-green-400">
          <p className="text-sm font-bold text-green-800 uppercase tracking-wide mb-4">Evolutionary Tree — Insect Group</p>
          <div className="flex justify-center overflow-x-auto pb-2">
            <svg viewBox="0 0 560 310" className="w-full" style={{ minWidth: 340, maxWidth: 600 }}>
              {/* Time label */}
              <text x="18" y="165" fontSize="10" fill="#166534" fontWeight="bold" transform="rotate(-90 18 165)" textAnchor="middle">Millions of years ago</text>
              <text x="42" y="22" fontSize="9" fill="#15803d">Present</text>
              <text x="42" y="298" fontSize="9" fill="#15803d">Past</text>
              <line x1="46" y1="30" x2="46" y2="290" stroke="#15803d" strokeWidth="1" strokeDasharray="4,3" />
              <polygon points="46,30 43,38 49,38" fill="#15803d" />

              {/* Main trunk — vertical line */}
              <line x1="90" y1="278" x2="90" y2="85" stroke="#166534" strokeWidth="3" strokeLinecap="round" />

              {/* ── Branch A → Silverfish (earliest divergence) ── */}
              <line x1="90" y1="252" x2="130" y2="252" stroke="#166534" strokeWidth="2" />
              <line x1="130" y1="252" x2="130" y2="52" stroke="#22c55e" strokeWidth="2" />
              <circle cx="90" cy="252" r="12" fill="#bbf7d0" stroke="#166534" strokeWidth="2" />
              <text x="90" y="256" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#14532d">A</text>
              <text x="130" y="42" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#14532d">Silverfish</text>
              <text x="130" y="55" textAnchor="middle" fontSize="8" fill="#16a34a">(wingless)</text>

              {/* ── Branch B → Dragonflies ── */}
              <line x1="90" y1="208" x2="220" y2="208" stroke="#166534" strokeWidth="2" />
              <line x1="220" y1="208" x2="220" y2="52" stroke="#22c55e" strokeWidth="2" />
              <circle cx="90" cy="208" r="12" fill="#bbf7d0" stroke="#166534" strokeWidth="2" />
              <text x="90" y="212" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#14532d">B</text>
              <text x="220" y="42" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#14532d">Dragonflies</text>
              <text x="220" y="55" textAnchor="middle" fontSize="8" fill="#16a34a">(wings don&apos;t fold)</text>

              {/* ── Branch C → Grasshoppers ── */}
              <line x1="90" y1="162" x2="320" y2="162" stroke="#166534" strokeWidth="2" />
              <line x1="320" y1="162" x2="320" y2="52" stroke="#22c55e" strokeWidth="2" />
              <circle cx="90" cy="162" r="12" fill="#bbf7d0" stroke="#166534" strokeWidth="2" />
              <text x="90" y="166" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#14532d">C</text>
              <text x="320" y="42" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#14532d">Grasshoppers</text>
              <text x="320" y="55" textAnchor="middle" fontSize="8" fill="#16a34a">(folding wings)</text>

              {/* ── Branch D → Beetles + Butterflies ── */}
              <line x1="90" y1="115" x2="415" y2="115" stroke="#166534" strokeWidth="2" />
              <circle cx="90" cy="115" r="12" fill="#bbf7d0" stroke="#166534" strokeWidth="2" />
              <text x="90" y="119" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#14532d">D</text>
              {/* Beetles sub-branch */}
              <line x1="415" y1="115" x2="415" y2="52" stroke="#22c55e" strokeWidth="2" />
              <text x="415" y="42" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#14532d">Beetles</text>
              {/* Butterflies sub-branch */}
              <line x1="415" y1="115" x2="515" y2="115" stroke="#166534" strokeWidth="2" />
              <line x1="515" y1="115" x2="515" y2="52" stroke="#22c55e" strokeWidth="2" />
              <text x="515" y="36" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#14532d">Butterflies</text>
              <text x="515" y="50" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#14532d">&amp; Moths</text>

              {/* Common ancestor label at bottom */}
              <circle cx="90" cy="278" r="4" fill="#166534" />
              <text x="90" y="298" textAnchor="middle" fontSize="10" fill="#166534" fontWeight="bold">Common ancestor</text>
            </svg>
          </div>
          <p className="text-xs text-green-700 mt-2 text-center">
            A, B, C and D represent ancestors of present day insects. Branches higher up evolved more recently.
          </p>
        </div>
      );
    }

    // Generic evolutionary tree — extract species from sibling questions
    const speciesMatch = siblingTexts.match(/(?:evolved|ancestor|group).*?(?:of\s+(?:both\s+)?)([\w\s]+?)(?:\s+and\s+)([\w\s]+?)(?:\?|\.)/i);
    const speciesNames = [];
    if (speciesMatch) {
      speciesNames.push(speciesMatch[1].trim(), speciesMatch[2].trim());
    }

    return (
      <div className="mb-8 p-5 bg-green-50 rounded-lg border-2 border-green-400">
        <p className="text-sm font-bold text-green-800 uppercase tracking-wide mb-4">Evolutionary Tree</p>
        <div className="flex justify-center">
          <svg viewBox="0 0 280 180" className="w-full max-w-sm">
            {/* Generic tree structure */}
            <line x1="140" y1="165" x2="140" y2="100" stroke="#166534" strokeWidth="3" strokeLinecap="round" />
            <line x1="140" y1="100" x2="70" y2="100" stroke="#166534" strokeWidth="2" />
            <line x1="70" y1="100" x2="70" y2="30" stroke="#22c55e" strokeWidth="2" />
            <line x1="140" y1="100" x2="140" y2="60" stroke="#166534" strokeWidth="2" />
            <line x1="140" y1="60" x2="140" y2="30" stroke="#22c55e" strokeWidth="2" />
            <line x1="140" y1="60" x2="210" y2="60" stroke="#166534" strokeWidth="2" />
            <line x1="210" y1="60" x2="210" y2="30" stroke="#22c55e" strokeWidth="2" />
            {/* Labels */}
            <text x="70" y="22" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#14532d">{speciesNames[0] || "Species 1"}</text>
            <text x="140" y="22" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#14532d">{speciesNames[1] || "Species 2"}</text>
            <text x="210" y="22" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#14532d">Species 3</text>
            <text x="140" y="178" textAnchor="middle" fontSize="9" fill="#166534">Common ancestor</text>
          </svg>
        </div>
        <p className="text-sm text-green-800 mt-3 text-center">{desc}</p>
        <p className="text-xs text-green-600 mt-1 text-center italic">Use this tree to identify evolutionary relationships between organisms.</p>
      </div>
    );
  };

  // ── FREQUENCY / PROBABILITY TREE RENDERER ───────────────────────────────────
  const renderFrequencyTree = (desc) => {
    // Extract event names from description
    const eventMatch = desc.match(/(?:for|showing)\s+['"]?(.+?)['"]?(?:\s+and\s+['"]?(.+?)['"]?)?\.?$/i);
    const event1 = eventMatch?.[1]?.replace(/number of people who /i, '') || "Event A";
    const event2 = eventMatch?.[2] || "";

    return (
      <div className="mb-8 p-5 bg-purple-50 rounded-lg border-2 border-purple-300">
        <p className="text-sm font-bold text-purple-800 uppercase tracking-wide mb-4">Probability Tree</p>
        <div className="flex justify-center overflow-x-auto">
          <svg viewBox="0 0 340 200" className="w-full" style={{ minWidth: 280, maxWidth: 400 }}>
            {/* Root */}
            <circle cx="30" cy="100" r="5" fill="#7c3aed" />
            {/* First branch - Yes */}
            <line x1="35" y1="100" x2="140" y2="50" stroke="#7c3aed" strokeWidth="2" />
            <circle cx="140" cy="50" r="5" fill="#7c3aed" />
            <text x="80" y="65" fontSize="9" fill="#6d28d9" textAnchor="middle">Yes</text>
            {/* First branch - No */}
            <line x1="35" y1="100" x2="140" y2="150" stroke="#7c3aed" strokeWidth="2" />
            <circle cx="140" cy="150" r="5" fill="#7c3aed" />
            <text x="80" y="140" fontSize="9" fill="#6d28d9" textAnchor="middle">No</text>
            {/* Second level from Yes */}
            <line x1="145" y1="50" x2="260" y2="25" stroke="#a78bfa" strokeWidth="1.5" />
            <line x1="145" y1="50" x2="260" y2="75" stroke="#a78bfa" strokeWidth="1.5" />
            <rect x="260" y="15" width="60" height="20" rx="4" fill="#ede9fe" stroke="#a78bfa" strokeWidth="1" />
            <rect x="260" y="65" width="60" height="20" rx="4" fill="#ede9fe" stroke="#a78bfa" strokeWidth="1" />
            <text x="290" y="29" fontSize="8" fill="#6d28d9" textAnchor="middle">Yes</text>
            <text x="290" y="79" fontSize="8" fill="#6d28d9" textAnchor="middle">No</text>
            {/* Second level from No */}
            <line x1="145" y1="150" x2="260" y2="125" stroke="#a78bfa" strokeWidth="1.5" />
            <line x1="145" y1="150" x2="260" y2="175" stroke="#a78bfa" strokeWidth="1.5" />
            <rect x="260" y="115" width="60" height="20" rx="4" fill="#ede9fe" stroke="#a78bfa" strokeWidth="1" />
            <rect x="260" y="165" width="60" height="20" rx="4" fill="#ede9fe" stroke="#a78bfa" strokeWidth="1" />
            <text x="290" y="129" fontSize="8" fill="#6d28d9" textAnchor="middle">Yes</text>
            <text x="290" y="179" fontSize="8" fill="#6d28d9" textAnchor="middle">No</text>
            {/* Event labels */}
            <text x="90" y="15" fontSize="9" fill="#4c1d95" fontWeight="bold" textAnchor="middle">{event1.slice(0, 25)}</text>
            {event2 && <text x="210" y="15" fontSize="9" fill="#4c1d95" fontWeight="bold" textAnchor="middle">{event2.slice(0, 25)}</text>}
          </svg>
        </div>
        <p className="text-xs text-purple-600 mt-3 text-center italic">Fill in the probabilities/frequencies on each branch. {desc}</p>
      </div>
    );
  };

  // ── QUADRAT DIAGRAM RENDERER ────────────────────────────────────────────────
  const renderQuadratDiagram = (desc) => {
    // Extract dimensions from description
    const dimMatch = desc.match(/([\d.]+)\s*m?\s*[x×]\s*([\d.]+)\s*m/i);
    const w = dimMatch ? dimMatch[1] : "0.5";
    const h = dimMatch ? dimMatch[2] : "0.5";

    return (
      <div className="mb-8 p-5 bg-lime-50 rounded-lg border-2 border-lime-400">
        <p className="text-sm font-bold text-lime-800 uppercase tracking-wide mb-4">Quadrat Diagram</p>
        <div className="flex justify-center">
          <svg viewBox="0 0 220 240" className="w-full max-w-xs">
            {/* Grid lines */}
            {Array.from({ length: 6 }).map((_, i) => (
              <g key={`grid-${i}`}>
                <line x1={40 + i * 30} y1="30" x2={40 + i * 30} y2="180" stroke="#a3e635" strokeWidth="0.5" />
                <line x1="40" y1={30 + i * 30} x2="190" y2={30 + i * 30} stroke="#a3e635" strokeWidth="0.5" />
              </g>
            ))}
            {/* Quadrat border */}
            <rect x="40" y="30" width="150" height="150" fill="none" stroke="#4d7c0f" strokeWidth="3" />
            {/* Plant dots (randomised but seeded positions) */}
            {[{x:65,y:55},{x:120,y:70},{x:85,y:110},{x:155,y:90},{x:70,y:155},{x:140,y:140},{x:100,y:60},{x:165,y:160}].map((p, i) => (
              <g key={`plant-${i}`}>
                <circle cx={p.x} cy={p.y} r="6" fill="#22c55e" opacity="0.7" />
                <circle cx={p.x} cy={p.y} r="3" fill="#15803d" />
                {/* Tiny leaf shapes */}
                <ellipse cx={p.x - 4} cy={p.y - 5} rx="3" ry="1.5" fill="#4ade80" transform={`rotate(-30 ${p.x - 4} ${p.y - 5})`} />
                <ellipse cx={p.x + 4} cy={p.y - 5} rx="3" ry="1.5" fill="#4ade80" transform={`rotate(30 ${p.x + 4} ${p.y - 5})`} />
              </g>
            ))}
            {/* Dimension labels */}
            <text x="115" y="205" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#4d7c0f">{w} m</text>
            <line x1="40" y1="195" x2="190" y2="195" stroke="#4d7c0f" strokeWidth="1.5" />
            <line x1="40" y1="190" x2="40" y2="200" stroke="#4d7c0f" strokeWidth="1.5" />
            <line x1="190" y1="190" x2="190" y2="200" stroke="#4d7c0f" strokeWidth="1.5" />
            {/* Vertical dimension */}
            <text x="22" y="110" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#4d7c0f" transform="rotate(-90 22 110)">{h} m</text>
            <line x1="28" y1="30" x2="28" y2="180" stroke="#4d7c0f" strokeWidth="1.5" />
            <line x1="23" y1="30" x2="33" y2="30" stroke="#4d7c0f" strokeWidth="1.5" />
            <line x1="23" y1="180" x2="33" y2="180" stroke="#4d7c0f" strokeWidth="1.5" />
            {/* Legend */}
            <circle cx="55" cy="225" r="4" fill="#22c55e" />
            <text x="65" y="228" fontSize="9" fill="#4d7c0f">= plant (e.g. buttercup)</text>
          </svg>
        </div>
        <p className="text-xs text-lime-700 mt-2 text-center italic">{desc}</p>
      </div>
    );
  };

  // ── OPTION BOX RENDERER ─────────────────────────────────────────────────────
  const renderOptionBox = (desc) => {
    // Extract the options from "Box with options: A, B, C, D" or similar
    const optionsMatch = desc.match(/(?:options?|words?|terms?):\s*(.+)/i);
    const optionsList = optionsMatch
      ? optionsMatch[1].split(/,\s*/).map(s => s.trim()).filter(Boolean)
      : [];

    if (optionsList.length === 0) return null;

    return (
      <div className="mb-8 p-5 bg-indigo-50 rounded-lg border-2 border-indigo-300">
        <p className="text-sm font-bold text-indigo-800 uppercase tracking-wide mb-3">Choose from these options:</p>
        <div className="flex flex-wrap gap-2 justify-center">
          {optionsList.map((opt, i) => (
            <span key={i} className="px-4 py-2 bg-white border-2 border-indigo-300 rounded-lg text-indigo-900 font-semibold text-sm shadow-sm">
              {opt}
            </span>
          ))}
        </div>
      </div>
    );
  };

  // ── TWO-WAY TABLE RENDERER ──────────────────────────────────────────────────
  const renderTwoWayTable = (desc) => {
    // Parse "rows for X, Y, Z; columns for A, B, C" from description
    const rowMatch = desc.match(/rows?\s+(?:for|:)\s+(.+?)(?:;|\.|\band\b\s+columns)/i);
    const colMatch = desc.match(/columns?\s+(?:for|:)\s+(.+?)(?:\.|$)/i);
    const rows = rowMatch ? rowMatch[1].split(/,\s*|\s+and\s+/).map(s => s.trim()).filter(Boolean) : [];
    const cols = colMatch ? colMatch[1].split(/,\s*|\s+and\s+/).map(s => s.trim()).filter(Boolean) : [];

    if (rows.length === 0 && cols.length === 0) return null;

    return (
      <div className="mb-8 p-5 bg-amber-50 rounded-lg border-2 border-amber-400">
        <p className="text-sm font-bold text-amber-800 uppercase tracking-wide mb-4">Data Table</p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border-2 border-amber-400 bg-amber-100 p-2 text-left text-amber-900 font-bold"></th>
                {cols.map((col, i) => (
                  <th key={i} className="border-2 border-amber-400 bg-amber-100 p-2 text-center text-amber-900 font-bold text-xs">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri}>
                  <td className="border-2 border-amber-400 bg-amber-50 p-2 font-semibold text-amber-900 text-xs">{row}</td>
                  {cols.map((_, ci) => (
                    <td key={ci} className="border-2 border-amber-400 p-2 text-center text-slate-400 text-xs min-w-[50px]">
                      &mdash;
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-amber-600 mt-3 text-center italic">Use the values from the table to answer this question.</p>
      </div>
    );
  };

  // ── TABLE WITH DATA FROM QUESTION CONTEXT ───────────────────────────────────
  // ── INLINE DATA TABLE for questions that reference "Table X" in their text ──
  const renderInlineDataTable = (tableLabel, tableNum, qText) => {
    const qLower = qText.toLowerCase();

    // ── KNOWN TABLE PATTERNS ────────────────────────────────────────────────
    // Isotope half-life table (radioactivity questions)
    if (/isotope|half-?life|radioactive|decay|beta|alpha|gamma/i.test(qLower)) {
      return (
        <div className="mb-6 p-5 bg-slate-50 rounded-lg border-2 border-slate-300">
          <div className="flex items-center gap-2 mb-3">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="1" y="2" width="16" height="14" rx="2" stroke="#475569" strokeWidth="1.5" fill="none" />
              <line x1="1" y1="6" x2="17" y2="6" stroke="#475569" strokeWidth="1.5" />
              <line x1="1" y1="10" x2="17" y2="10" stroke="#475569" strokeWidth="1" />
              <line x1="1" y1="14" x2="17" y2="14" stroke="#475569" strokeWidth="1" />
              <line x1="9" y1="6" x2="9" y2="16" stroke="#475569" strokeWidth="1" />
            </svg>
            <p className="text-sm font-bold text-slate-700 uppercase tracking-wide">{tableLabel}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border-2 border-slate-300 bg-slate-200 px-4 py-2 text-left text-slate-800 font-bold">Isotope</th>
                  <th className="border-2 border-slate-300 bg-slate-200 px-4 py-2 text-left text-slate-800 font-bold">Half-life</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border-2 border-slate-300 px-4 py-2 text-slate-800">Carbon-14</td>
                  <td className="border-2 border-slate-300 px-4 py-2 text-slate-800 font-mono">5700 years</td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="border-2 border-slate-300 px-4 py-2 text-slate-800">Fluorine-17</td>
                  <td className="border-2 border-slate-300 px-4 py-2 text-slate-800 font-mono">64.49 seconds</td>
                </tr>
                <tr>
                  <td className="border-2 border-slate-300 px-4 py-2 text-slate-800">Nitrogen-18</td>
                  <td className="border-2 border-slate-300 px-4 py-2 text-slate-800 font-mono">0.624 seconds</td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="border-2 border-slate-300 px-4 py-2 text-slate-800">Sodium-22</td>
                  <td className="border-2 border-slate-300 px-4 py-2 text-slate-800 font-mono">2.6 years</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    // Radiation penetration table (alpha/beta/gamma through materials)
    if (/penetrat|alpha.*beta.*gamma|paper.*aluminium.*lead|material.*stop/i.test(qLower)) {
      return (
        <div className="mb-6 p-5 bg-slate-50 rounded-lg border-2 border-slate-300">
          <div className="flex items-center gap-2 mb-3">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="1" y="2" width="16" height="14" rx="2" stroke="#475569" strokeWidth="1.5" fill="none" />
              <line x1="1" y1="6" x2="17" y2="6" stroke="#475569" strokeWidth="1.5" />
              <line x1="1" y1="10" x2="17" y2="10" stroke="#475569" strokeWidth="1" />
              <line x1="1" y1="14" x2="17" y2="14" stroke="#475569" strokeWidth="1" />
              <line x1="6" y1="6" x2="6" y2="16" stroke="#475569" strokeWidth="1" />
              <line x1="9.5" y1="6" x2="9.5" y2="16" stroke="#475569" strokeWidth="1" />
              <line x1="13" y1="6" x2="13" y2="16" stroke="#475569" strokeWidth="1" />
            </svg>
            <p className="text-sm font-bold text-slate-700 uppercase tracking-wide">{tableLabel}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm text-center">
              <thead>
                <tr>
                  <th className="border-2 border-slate-300 bg-slate-200 px-3 py-2 text-slate-800 font-bold text-left">Radiation</th>
                  <th className="border-2 border-slate-300 bg-slate-200 px-3 py-2 text-slate-800 font-bold">Paper</th>
                  <th className="border-2 border-slate-300 bg-slate-200 px-3 py-2 text-slate-800 font-bold">0.5 cm aluminium</th>
                  <th className="border-2 border-slate-300 bg-slate-200 px-3 py-2 text-slate-800 font-bold">10 cm lead</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border-2 border-slate-300 px-3 py-2 text-slate-800 font-semibold text-left">Alpha (α)</td>
                  <td className="border-2 border-slate-300 px-3 py-2 text-slate-700">No</td>
                  <td className="border-2 border-slate-300 px-3 py-2 text-slate-400 font-bold">?</td>
                  <td className="border-2 border-slate-300 px-3 py-2 text-slate-400 font-bold">?</td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="border-2 border-slate-300 px-3 py-2 text-slate-800 font-semibold text-left">Beta (β)</td>
                  <td className="border-2 border-slate-300 px-3 py-2 text-slate-400 font-bold">?</td>
                  <td className="border-2 border-slate-300 px-3 py-2 text-slate-400 font-bold">?</td>
                  <td className="border-2 border-slate-300 px-3 py-2 text-slate-400 font-bold">?</td>
                </tr>
                <tr>
                  <td className="border-2 border-slate-300 px-3 py-2 text-slate-800 font-semibold text-left">Gamma (γ)</td>
                  <td className="border-2 border-slate-300 px-3 py-2 text-slate-700">Yes</td>
                  <td className="border-2 border-slate-300 px-3 py-2 text-slate-700">Yes</td>
                  <td className="border-2 border-slate-300 px-3 py-2 text-slate-400 font-bold">?</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500 mt-2 italic text-center">Yes = radiation passes through. Complete the table using Yes or No.</p>
        </div>
      );
    }

    // Rock density table
    if (/rock|density|chalk|flint|granite|marble|slate/i.test(qLower)) {
      return (
        <div className="mb-6 p-5 bg-slate-50 rounded-lg border-2 border-slate-300">
          <div className="flex items-center gap-2 mb-3">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="1" y="2" width="16" height="14" rx="2" stroke="#475569" strokeWidth="1.5" fill="none" />
              <line x1="1" y1="6" x2="17" y2="6" stroke="#475569" strokeWidth="1.5" />
              <line x1="9" y1="6" x2="9" y2="16" stroke="#475569" strokeWidth="1" />
            </svg>
            <p className="text-sm font-bold text-slate-700 uppercase tracking-wide">{tableLabel}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border-2 border-slate-300 bg-slate-200 px-4 py-2 text-left text-slate-800 font-bold">Type of rock</th>
                  <th className="border-2 border-slate-300 bg-slate-200 px-4 py-2 text-left text-slate-800 font-bold">Density (g/cm³)</th>
                </tr>
              </thead>
              <tbody>
                {[["Chalk", "2.50"], ["Flint", "2.60"], ["Granite", "2.70"], ["Marble", "2.71"], ["Slate", "2.80"]].map(([name, d], idx) => (
                  <tr key={name} className={idx % 2 ? "bg-slate-50" : ""}>
                    <td className="border-2 border-slate-300 px-4 py-2 text-slate-800">{name}</td>
                    <td className="border-2 border-slate-300 px-4 py-2 text-slate-800 font-mono">{d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    // Energy resources (renewable/non-renewable) table
    if (/renewable|non-?renewable|biofuel|coal|nuclear|tides|energy\s+resource/i.test(qLower)) {
      return (
        <div className="mb-6 p-5 bg-slate-50 rounded-lg border-2 border-slate-300">
          <div className="flex items-center gap-2 mb-3">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="1" y="2" width="16" height="14" rx="2" stroke="#475569" strokeWidth="1.5" fill="none" />
              <line x1="1" y1="6" x2="17" y2="6" stroke="#475569" strokeWidth="1.5" />
              <line x1="9" y1="6" x2="9" y2="16" stroke="#475569" strokeWidth="1" />
            </svg>
            <p className="text-sm font-bold text-slate-700 uppercase tracking-wide">{tableLabel}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm text-center">
              <thead>
                <tr>
                  <th className="border-2 border-slate-300 bg-slate-200 px-4 py-2 text-left text-slate-800 font-bold">Energy resource</th>
                  <th className="border-2 border-slate-300 bg-slate-200 px-4 py-2 text-slate-800 font-bold">Renewable</th>
                  <th className="border-2 border-slate-300 bg-slate-200 px-4 py-2 text-slate-800 font-bold">Non-renewable</th>
                </tr>
              </thead>
              <tbody>
                {["Biofuel", "Coal", "Nuclear fuel", "Tidal"].map((res, idx) => (
                  <tr key={res} className={idx % 2 ? "bg-slate-50" : ""}>
                    <td className="border-2 border-slate-300 px-4 py-2 text-slate-800 text-left font-medium">{res}</td>
                    <td className="border-2 border-slate-300 px-4 py-2"><span className="inline-block w-4 h-4 border-2 border-slate-400 rounded-sm" /></td>
                    <td className="border-2 border-slate-300 px-4 py-2"><span className="inline-block w-4 h-4 border-2 border-slate-400 rounded-sm" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500 mt-2 italic text-center">Tick one box in each row.</p>
        </div>
      );
    }

    // Fallback — generic table reference card
    return (
      <div className="mb-6 p-5 bg-slate-50 rounded-lg border-2 border-slate-300">
        <div className="flex items-center gap-2 mb-2">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="1" y="2" width="16" height="14" rx="2" stroke="#475569" strokeWidth="1.5" fill="none" />
            <line x1="1" y1="6" x2="17" y2="6" stroke="#475569" strokeWidth="1.5" />
            <line x1="9" y1="6" x2="9" y2="16" stroke="#475569" strokeWidth="1" />
          </svg>
          <p className="text-sm font-bold text-slate-700 uppercase tracking-wide">{tableLabel}</p>
        </div>
        <p className="text-sm text-slate-600 italic text-center">Refer to the exam paper for the data in {tableLabel}.</p>
      </div>
    );
  };

  const renderTableFromContext = (desc) => {
    // Look at acceptable_answers for numeric clues
    const aa = currentQuestion.acceptable_answers;
    const exactAnswers = aa?.exact || [];

    // Check if question_text has embedded table data (pipe format)
    const qText = currentQuestion.question_text || "";
    const pipeLines = qText.split('\n').filter(l => l.includes('|') && l.trim().length > 3);

    if (pipeLines.length >= 2) {
      // We have pipe-delimited table data in question_text — renderQuestionText handles it
      // Just show a minimal diagram hint, the table is already rendered above
      return null; // Let renderQuestionText handle it
    }

    // Try to reconstruct table structure from description + answers
    // "Table showing height of bean plants in cm for acid and neutral soil"
    const colMatch = desc.match(/(?:for|showing|of)\s+(.+?)(?:\s+(?:in|at|over)\s+|$)/i);
    const unitMatch = desc.match(/in\s+([\w°%²³]+(?:\s*\/\s*[\w°%²³]+)?)/i);
    const unit = unitMatch ? unitMatch[1] : "";

    // If we have calculation clues in acceptable_answers (e.g. "11+12+11+17+19 / 5")
    const calcMatch = exactAnswers.find(a => /[\d+]+\s*[/÷]/.test(a));
    let dataValues = [];
    if (calcMatch) {
      const numsMatch = calcMatch.match(/^([\d+\s]+)/);
      if (numsMatch) {
        dataValues = numsMatch[1].split('+').map(n => n.trim()).filter(Boolean);
      }
    }

    return (
      <div className="mb-8 p-5 bg-amber-50 rounded-lg border-2 border-amber-400">
        <div className="flex items-center gap-2 mb-3">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-amber-700">
            <rect x="2" y="3" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
            <line x1="2" y1="7" x2="18" y2="7" stroke="currentColor" strokeWidth="1.5" />
            <line x1="2" y1="11" x2="18" y2="11" stroke="currentColor" strokeWidth="1.2" />
            <line x1="8" y1="7" x2="8" y2="17" stroke="currentColor" strokeWidth="1.2" />
            <line x1="13" y1="7" x2="13" y2="17" stroke="currentColor" strokeWidth="1.2" />
          </svg>
          <p className="text-sm font-bold text-amber-800 uppercase tracking-wide">Data Table</p>
        </div>
        {dataValues.length > 0 ? (
          <div className="overflow-x-auto mb-3">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border-2 border-amber-400 bg-amber-100 p-2 text-center text-amber-900 font-bold text-xs">Sample</th>
                  {dataValues.map((_, i) => (
                    <th key={i} className="border-2 border-amber-400 bg-amber-100 p-2 text-center text-amber-900 font-bold text-xs">{i + 1}</th>
                  ))}
                  <th className="border-2 border-amber-400 bg-amber-200 p-2 text-center text-amber-900 font-bold text-xs">Mean</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border-2 border-amber-400 bg-amber-50 p-2 font-semibold text-amber-900 text-xs">Value{unit ? ` (${unit})` : ""}</td>
                  {dataValues.map((v, i) => (
                    <td key={i} className="border-2 border-amber-400 p-2 text-center text-slate-800 font-mono text-sm">{v}</td>
                  ))}
                  <td className="border-2 border-amber-400 bg-amber-100 p-2 text-center text-amber-600 font-bold text-sm">X</td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-amber-900 text-base leading-relaxed mb-3">{desc}</p>
        )}
        <p className="text-xs text-amber-600 mt-1 text-center italic">
          {dataValues.length > 0 ? "Calculate the mean value X from the data shown." : "Refer to the table data to answer this question."}
        </p>
      </div>
    );
  };

  // ── PHYSICS SCENE SVG RENDERER ──────────────────────────────────────────────
  const renderPhysicsScene = (sceneType, desc, hideLabels = false) => {
    // Numbered circle marker helper for hideLabels mode
    const _m = (cx, cy, num) => (
      <g key={`pm${num}`}>
        <circle cx={cx} cy={cy} r="9" fill="#1e40af" stroke="#fff" strokeWidth="1.5" />
        <text x={cx} y={cy + 3.5} textAnchor="middle" fontSize="8" fontWeight="bold" fill="#fff">{num}</text>
      </g>
    );
    const scenes = {
      trampoline: (
        <svg viewBox="0 0 400 300" className="w-full mx-auto" style={{ maxWidth: 400 }}>
          {/* Frame legs */}
          <line x1="60" y1="280" x2="90" y2="180" stroke="#475569" strokeWidth="4" />
          <line x1="340" y1="280" x2="310" y2="180" stroke="#475569" strokeWidth="4" />
          {/* Springs */}
          {[100, 140, 180, 220, 260, 300].map((x, i) => (
            <path key={i} d={`M${x} 180 L${x-6} 190 L${x+6} 200 L${x-6} 210 L${x+6} 220 L${x-6} 230 L${x} 240`}
              stroke="#3b82f6" strokeWidth="2" fill="none" />
          ))}
          {/* Trampoline mat */}
          <path d="M85 180 Q200 170 315 180" stroke="#1e293b" strokeWidth="3" fill="none" />
          {/* Mat surface */}
          <path d="M85 180 Q200 190 315 180" stroke="#64748b" strokeWidth="1.5" fill="#e2e8f0" fillOpacity="0.5" />
          {/* Frame bottom bar */}
          <line x1="85" y1="240" x2="315" y2="240" stroke="#475569" strokeWidth="3" />
          {/* Ground */}
          <line x1="30" y1="280" x2="370" y2="280" stroke="#94a3b8" strokeWidth="2" />
          {/* Boy figure */}
          <circle cx="200" cy="95" r="18" fill="#fde68a" stroke="#92400e" strokeWidth="1.5" />
          <line x1="200" y1="113" x2="200" y2="155" stroke="#1e40af" strokeWidth="3" />
          <line x1="200" y1="125" x2="175" y2="145" stroke="#1e40af" strokeWidth="2.5" />
          <line x1="200" y1="125" x2="225" y2="145" stroke="#1e40af" strokeWidth="2.5" />
          <line x1="200" y1="155" x2="182" y2="178" stroke="#1e40af" strokeWidth="2.5" />
          <line x1="200" y1="155" x2="218" y2="178" stroke="#1e40af" strokeWidth="2.5" />
          {/* Eyes + smile */}
          <circle cx="193" cy="91" r="2" fill="#1e293b" />
          <circle cx="207" cy="91" r="2" fill="#1e293b" />
          <path d="M193 99 Q200 104 207 99" stroke="#1e293b" strokeWidth="1.2" fill="none" />
          {/* Spring labels */}
          <text x="90" y="215" fontSize="9" fill="#3b82f6" fontWeight="bold">Springs</text>
          {/* Arrow showing bounce */}
          <path d="M235 100 L235 75 L230 80 M235 75 L240 80" stroke="#ef4444" strokeWidth="1.5" fill="none" />
          <text x="245" y="82" fontSize="9" fill="#ef4444" fontWeight="bold">Bounce</text>
        </svg>
      ),
      stairs: (
        <svg viewBox="0 0 400 300" className="w-full mx-auto" style={{ maxWidth: 400 }}>
          {/* Stairs */}
          <path d="M50 270 L50 230 L120 230 L120 190 L190 190 L190 150 L260 150 L260 110 L330 110 L330 70 L370 70"
            stroke="#475569" strokeWidth="2.5" fill="none" />
          {/* Step fills */}
          <rect x="50" y="230" width="70" height="40" fill="#e2e8f0" stroke="#475569" strokeWidth="1" />
          <rect x="120" y="190" width="70" height="40" fill="#e2e8f0" stroke="#475569" strokeWidth="1" />
          <rect x="190" y="150" width="70" height="40" fill="#e2e8f0" stroke="#475569" strokeWidth="1" />
          <rect x="260" y="110" width="70" height="40" fill="#e2e8f0" stroke="#475569" strokeWidth="1" />
          {/* Girl running (at top) */}
          <circle cx="310" cy="68" r="14" fill="#fde68a" stroke="#92400e" strokeWidth="1.5" />
          <line x1="310" y1="82" x2="310" y2="105" stroke="#dc2626" strokeWidth="2.5" />
          <line x1="310" y1="90" x2="293" y2="100" stroke="#dc2626" strokeWidth="2" />
          <line x1="310" y1="90" x2="327" y2="80" stroke="#dc2626" strokeWidth="2" />
          <line x1="310" y1="105" x2="298" y2="110" stroke="#dc2626" strokeWidth="2" />
          <line x1="310" y1="105" x2="325" y2="110" stroke="#dc2626" strokeWidth="2" />
          {/* Hair */}
          <path d="M300 60 Q310 50 320 60" stroke="#92400e" strokeWidth="2" fill="#92400e" />
          {/* Height arrow */}
          <line x1="25" y1="270" x2="25" y2="70" stroke="#2563eb" strokeWidth="1.5" strokeDasharray="4 3" />
          <path d="M25 70 L20 80 M25 70 L30 80" stroke="#2563eb" strokeWidth="1.5" />
          <path d="M25 270 L20 260 M25 270 L30 260" stroke="#2563eb" strokeWidth="1.5" />
          <text x="12" y="175" fontSize="11" fill="#2563eb" fontWeight="bold" transform="rotate(-90, 12, 175)" textAnchor="middle">Height</text>
          {/* Ground */}
          <line x1="30" y1="270" x2="380" y2="270" stroke="#94a3b8" strokeWidth="2" />
          {/* Direction arrow */}
          <path d="M150 140 L200 110" stroke="#ef4444" strokeWidth="1.5" fill="none" markerEnd="url(#arrowR)" />
          <defs><marker id="arrowR" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto"><path d="M0 0L6 2L0 4Z" fill="#ef4444" /></marker></defs>
        </svg>
      ),
      stopclocks: (() => {
        // Three stop-clocks with distinct readable times on a 0-30 second dial
        // A = 14.40s, B = 4.41s, C = 1.44s (C is the correct answer for Q02.4)
        const clockData = [
          { label: "A", seconds: 14.40, display: "14.40" },
          { label: "B", seconds: 4.41,  display: "04.41" },
          { label: "C", seconds: 1.44,  display: "01.44" },
        ];
        return (
          <svg viewBox="0 0 480 230" className="w-full mx-auto" style={{ maxWidth: 480 }}>
            {clockData.map(({ label, seconds, display }, i) => {
              const cx = 80 + i * 160;
              const cy = 90;
              const r = 60;
              // Hand angle: 0s = top (–90°), full rotation = 30s
              const handAngle = (seconds / 30) * 360 - 90;
              const handRad = handAngle * Math.PI / 180;
              const handLen = r - 14;
              const handX = cx + handLen * Math.cos(handRad);
              const handY = cy + handLen * Math.sin(handRad);
              // Tail (opposite side, short)
              const tailLen = 10;
              const tailX = cx - tailLen * Math.cos(handRad);
              const tailY = cy - tailLen * Math.sin(handRad);
              return (
                <g key={label}>
                  {/* Outer ring */}
                  <circle cx={cx} cy={cy} r={r} fill="#f8fafc" stroke="#1e293b" strokeWidth="2.5" />
                  <circle cx={cx} cy={cy} r={r - 2} fill="none" stroke="#e2e8f0" strokeWidth="0.8" />
                  {/* Start/stop button */}
                  <rect x={cx - 7} y={cy - r - 16} width="14" height="16" rx="3" fill="#64748b" stroke="#334155" strokeWidth="1.2" />
                  <circle cx={cx} cy={cy - r - 16} r="2" fill="#94a3b8" />
                  {/* Minor tick marks — every 1 second (30 ticks) */}
                  {Array.from({ length: 30 }, (_, t) => {
                    const a = (t * 12 - 90) * Math.PI / 180;
                    const isMajor = t % 5 === 0;
                    const inner = isMajor ? r - 14 : r - 9;
                    const outer = r - 4;
                    return <line key={t} x1={cx + inner * Math.cos(a)} y1={cy + inner * Math.sin(a)}
                      x2={cx + outer * Math.cos(a)} y2={cy + outer * Math.sin(a)}
                      stroke={isMajor ? "#1e293b" : "#94a3b8"} strokeWidth={isMajor ? "1.8" : "0.8"} />;
                  })}
                  {/* Numbers: 0, 5, 10, 15, 20, 25 */}
                  {[0, 5, 10, 15, 20, 25].map((n) => {
                    const a = (n / 30 * 360 - 90) * Math.PI / 180;
                    const nr = r - 22;
                    return <text key={n} x={cx + nr * Math.cos(a)} y={cy + nr * Math.sin(a) + 4}
                      textAnchor="middle" fontSize="10" fill="#334155" fontWeight="bold">{n}</text>;
                  })}
                  {/* "seconds" label inside face */}
                  <text x={cx} y={cy + 22} textAnchor="middle" fontSize="6.5" fill="#94a3b8" fontWeight="500">seconds</text>
                  {/* Main hand (red) */}
                  <line x1={tailX} y1={tailY} x2={handX} y2={handY}
                    stroke="#dc2626" strokeWidth="1.8" strokeLinecap="round" />
                  {/* Center dot */}
                  <circle cx={cx} cy={cy} r="3.5" fill="#1e293b" />
                  <circle cx={cx} cy={cy} r="1.5" fill="#dc2626" />
                  {/* Digital readout box */}
                  <rect x={cx - 24} y={cy + r + 4} width="48" height="18" rx="3" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" />
                  <text x={cx} y={cy + r + 17} textAnchor="middle" fontSize="11" fill="#1e293b" fontFamily="monospace" fontWeight="bold">{display}</text>
                  {/* Label */}
                  <text x={cx} y={cy + r + 38} textAnchor="middle" fontSize="13" fontWeight="bold" fill="#1e293b">Stop-clock {label}</text>
                </g>
              );
            })}
          </svg>
        );
      })(),
      static: (
        <svg viewBox="0 0 400 220" className="w-full mx-auto" style={{ maxWidth: 400 }}>
          {/* Rod */}
          <rect x="80" y="90" width="180" height="20" rx="10" fill="#a78bfa" stroke="#6d28d9" strokeWidth="2" />
          <text x="170" y="104" textAnchor="middle" fontSize="10" fill="#fff" fontWeight="bold">Plastic rod</text>
          {/* Cloth */}
          <path d="M280 70 Q310 65 320 80 Q330 100 310 115 Q290 125 270 110 Q265 95 280 70Z" fill="#fca5a5" stroke="#dc2626" strokeWidth="1.5" />
          <text x="295" y="97" textAnchor="middle" fontSize="9" fill="#991b1b" fontWeight="bold">Cloth</text>
          {/* Rubbing arrows */}
          <path d="M265 80 L285 75" stroke="#f59e0b" strokeWidth="1.5" markerEnd="url(#arrowY)" />
          <path d="M285 115 L265 110" stroke="#f59e0b" strokeWidth="1.5" markerEnd="url(#arrowY)" />
          <defs><marker id="arrowY" markerWidth="5" markerHeight="4" refX="4" refY="2" orient="auto"><path d="M0 0L5 2L0 4Z" fill="#f59e0b" /></marker></defs>
          {/* Negative charges on rod */}
          {[110, 140, 170, 200, 230].map((x, i) => (
            <g key={i}>
              <circle cx={x} cy={120} r="6" fill="#dbeafe" stroke="#2563eb" strokeWidth="1" />
              <text x={x} y={124} textAnchor="middle" fontSize="10" fill="#2563eb" fontWeight="bold">−</text>
            </g>
          ))}
          {/* Positive charges leaving */}
          {[290, 310, 325].map((x, i) => (
            <g key={i}>
              <circle cx={x} cy={130 + i * 12} r="5" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1" />
              <text x={x} y={134 + i * 12} textAnchor="middle" fontSize="9" fill="#f59e0b" fontWeight="bold">+</text>
            </g>
          ))}
          {/* Labels */}
          <text x="170" y="145" textAnchor="middle" fontSize="9" fill="#6d28d9">Negatively charged</text>
          <text x="65" y="165" fontSize="9" fill="#475569">Electrons transferred</text>
          <path d="M140 160 Q160 175 200 155" stroke="#475569" strokeWidth="0.8" strokeDasharray="3 2" />
          <text x="170" y="195" textAnchor="middle" fontSize="10" fill="#334155" fontStyle="italic">
            Rubbing transfers electrons from cloth to rod
          </text>
        </svg>
      ),
      lever: (
        <svg viewBox="0 0 400 200" className="w-full mx-auto" style={{ maxWidth: 380 }}>
          {/* Fulcrum triangle */}
          <polygon points="200,160 185,190 215,190" fill="#f59e0b" stroke="#92400e" strokeWidth="2" />
          <text x="200" y="208" textAnchor="middle" fontSize="10" fill="#92400e" fontWeight="bold">Pivot</text>
          {/* Beam */}
          <line x1="60" y1="155" x2="340" y2="155" stroke="#475569" strokeWidth="4" />
          {/* Weight left */}
          <rect x="75" y="155" width="30" height="25" fill="#3b82f6" stroke="#1e40af" strokeWidth="1.5" rx="2" />
          <text x="90" y="172" textAnchor="middle" fontSize="9" fill="#fff" fontWeight="bold">Load</text>
          {/* Effort right */}
          <path d="M320 155 L320 120 L315 125 M320 120 L325 125" stroke="#dc2626" strokeWidth="2" fill="none" />
          <text x="320" y="112" textAnchor="middle" fontSize="9" fill="#dc2626" fontWeight="bold">Effort</text>
          {/* Ground */}
          <line x1="40" y1="190" x2="360" y2="190" stroke="#94a3b8" strokeWidth="1.5" />
        </svg>
      ),
      magnet: (
        <svg viewBox="0 0 360 200" className="w-full mx-auto" style={{ maxWidth: 360 }}>
          {/* Bar magnet */}
          <rect x="100" y="80" width="80" height="40" fill="#ef4444" stroke="#991b1b" strokeWidth="2" rx="4" />
          <rect x="180" y="80" width="80" height="40" fill="#3b82f6" stroke="#1e3a8a" strokeWidth="2" rx="4" />
          <text x="140" y="105" textAnchor="middle" fontSize="14" fill="#fff" fontWeight="bold">N</text>
          <text x="220" y="105" textAnchor="middle" fontSize="14" fill="#fff" fontWeight="bold">S</text>
          {/* Field lines */}
          {[-30, -15, 0, 15, 30].map((dy, i) => (
            <path key={i} d={`M90 ${100+dy} Q60 ${100+dy*2.5} 90 ${100+dy*0.2+40} M270 ${100+dy} Q300 ${100+dy*2.5} 270 ${100+dy*0.2+40}`}
              stroke="#94a3b8" strokeWidth="0.8" fill="none" strokeDasharray="3 2" />
          ))}
        </svg>
      ),
      optics: (
        <svg viewBox="0 0 400 200" className="w-full mx-auto" style={{ maxWidth: 400 }}>
          {/* Mirror */}
          <line x1="200" y1="30" x2="200" y2="170" stroke="#6366f1" strokeWidth="3" />
          <line x1="203" y1="30" x2="203" y2="170" stroke="#a5b4fc" strokeWidth="1" strokeDasharray="4 4" />
          {/* Incident ray */}
          <line x1="60" y1="50" x2="200" y2="100" stroke="#f59e0b" strokeWidth="2" markerEnd="url(#arrowO)" />
          {/* Reflected ray */}
          <line x1="200" y1="100" x2="340" y2="50" stroke="#ef4444" strokeWidth="2" markerEnd="url(#arrowO)" />
          {/* Normal */}
          <line x1="130" y1="100" x2="270" y2="100" stroke="#94a3b8" strokeWidth="1" strokeDasharray="4 3" />
          <text x="275" y="98" fontSize="9" fill="#64748b">Normal</text>
          {/* Angle arcs */}
          <path d="M180 100 A20 20 0 0 1 188 85" stroke="#f59e0b" strokeWidth="1.2" fill="none" />
          <path d="M220 100 A20 20 0 0 0 212 85" stroke="#ef4444" strokeWidth="1.2" fill="none" />
          <text x="168" y="88" fontSize="8" fill="#f59e0b">i</text>
          <text x="226" y="88" fontSize="8" fill="#ef4444">r</text>
          <defs><marker id="arrowO" markerWidth="5" markerHeight="4" refX="4" refY="2" orient="auto"><path d="M0 0L5 2L0 4Z" fill="currentColor" /></marker></defs>
        </svg>
      ),
      pendulum: (
        <svg viewBox="0 0 300 250" className="w-full mx-auto" style={{ maxWidth: 300 }}>
          {/* Support */}
          <rect x="120" y="20" width="60" height="10" fill="#475569" rx="2" />
          {/* String + bob (center) */}
          <line x1="150" y1="30" x2="150" y2="180" stroke="#334155" strokeWidth="1.5" />
          <circle cx="150" cy="190" r="15" fill="#3b82f6" stroke="#1e40af" strokeWidth="2" />
          {/* Ghost positions */}
          <line x1="150" y1="30" x2="95" y2="170" stroke="#94a3b8" strokeWidth="0.8" strokeDasharray="3 3" />
          <circle cx="90" cy="178" r="12" fill="none" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="150" y1="30" x2="205" y2="170" stroke="#94a3b8" strokeWidth="0.8" strokeDasharray="3 3" />
          <circle cx="210" cy="178" r="12" fill="none" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 3" />
          {/* Swing arrow */}
          <path d="M100 200 Q150 220 200 200" stroke="#ef4444" strokeWidth="1.2" fill="none" markerEnd="url(#arrowP)" />
          <defs><marker id="arrowP" markerWidth="5" markerHeight="4" refX="4" refY="2" orient="auto"><path d="M0 0L5 2L0 4Z" fill="#ef4444" /></marker></defs>
        </svg>
      ),
      radioactive: (
        <svg viewBox="0 0 380 200" className="w-full mx-auto" style={{ maxWidth: 380 }}>
          {/* Source */}
          <circle cx="60" cy="100" r="25" fill="#ef4444" stroke="#991b1b" strokeWidth="2" />
          <text x="60" y="103" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#fff">Source</text>
          {/* Radiation emanating */}
          {[0, 60, 120, 180, 240, 300].map((angle) => {
            const rad = (angle * Math.PI) / 180;
            const x1 = 60 + 25 * Math.cos(rad);
            const y1 = 100 + 25 * Math.sin(rad);
            const x2 = 60 + 80 * Math.cos(rad);
            const y2 = 100 + 80 * Math.sin(rad);
            return <line key={angle} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#fbbf24" strokeWidth="2" markerEnd="url(#arrowRad)" />;
          })}
          {/* Absorber box */}
          <rect x="200" y="70" width="60" height="60" fill="#3b82f6" stroke="#1e40af" strokeWidth="2" rx="4" />
          <text x="230" y="95" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#fff">Absorber</text>
          <text x="230" y="108" textAnchor="middle" fontSize="8" fill="#fff">(lead)</text>
          {/* Detector */}
          <circle cx="320" cy="100" r="20" fill="#10b981" stroke="#059669" strokeWidth="2" />
          <text x="320" y="103" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#fff">Detector</text>
          <defs><marker id="arrowRad" markerWidth="5" markerHeight="4" refX="4" refY="2" orient="auto"><path d="M0 0L5 2L0 4Z" fill="#fbbf24" /></marker></defs>
        </svg>
      ),
      transformer: (
        <svg viewBox="0 0 380 220" className="w-full mx-auto" style={{ maxWidth: 380 }}>
          {/* Primary coil */}
          {[40, 70, 100, 130].map((y, i) => (
            <circle key={`p${i}`} cx="80" cy={y} r="15" fill="none" stroke="#3b82f6" strokeWidth="2" />
          ))}
          <text x="80" y="170" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#1e40af">Primary</text>

          {/* Iron core */}
          <rect x="150" y="40" width="20" height="140" fill="#475569" stroke="#1e293b" strokeWidth="2" rx="3" />
          <text x="160" y="125" textAnchor="middle" fontSize="9" fill="#fff" fontWeight="bold">Fe</text>

          {/* Secondary coil */}
          {[40, 70, 100, 130].map((y, i) => (
            <circle key={`s${i}`} cx="240" cy={y} r="15" fill="none" stroke="#ef4444" strokeWidth="2" />
          ))}
          <text x="240" y="170" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#991b1b">Secondary</text>

          {/* Wires */}
          <line x1="20" y1="100" x2="65" y2="100" stroke="#3b82f6" strokeWidth="2" />
          <line x1="95" y1="100" x2="150" y2="100" stroke="#3b82f6" strokeWidth="2" />
          <line x1="170" y1="100" x2="225" y2="100" stroke="#ef4444" strokeWidth="2" />
          <line x1="255" y1="100" x2="340" y2="100" stroke="#ef4444" strokeWidth="2" />

          {/* AC labels */}
          <text x="20" y="85" fontSize="9" fontWeight="bold" fill="#1e40af">AC</text>
          <text x="340" y="85" fontSize="9" fontWeight="bold" fill="#991b1b">AC</text>

          {/* Voltage labels */}
          <text x="20" y="195" fontSize="8" fill="#1e40af">V₁</text>
          <text x="340" y="195" fontSize="8" fill="#991b1b">V₂</text>
        </svg>
      ),
      motor: (
        <svg viewBox="0 0 380 220" className="w-full mx-auto" style={{ maxWidth: 380 }}>
          {/* Magnetic field */}
          <rect x="100" y="60" width="180" height="100" fill="#e0f2fe" stroke="#0284c7" strokeWidth="2" rx="4" />
          {/* Pole labels */}
          <text x="130" y="85" fontSize="11" fontWeight="bold" fill="#0284c7">N</text>
          <text x="280" y="175" fontSize="11" fontWeight="bold" fill="#0284c7">S</text>

          {/* Current-carrying wire (loop) */}
          <circle cx="190" cy="110" r="25" fill="none" stroke="#ef4444" strokeWidth="2.5" />
          <text x="200" y="115" fontSize="9" fill="#991b1b" fontWeight="bold">I</text>

          {/* Force arrows */}
          <path d="M165 110 L120 110" stroke="#10b981" strokeWidth="2.5" fill="none" markerEnd="url(#arrowM)" />
          <text x="145" y="98" fontSize="9" fontWeight="bold" fill="#059669">F</text>

          <path d="M215 110 L260 110" stroke="#10b981" strokeWidth="2.5" fill="none" markerEnd="url(#arrowM)" />
          <text x="240" y="98" fontSize="9" fontWeight="bold" fill="#059669">F</text>

          {/* Rotation indicator */}
          <path d="M190 145 A30 30 0 0 1 220 160" stroke="#f59e0b" strokeWidth="2" fill="none" markerEnd="url(#arrowRot)" />
          <text x="210" y="175" fontSize="9" fontWeight="bold" fill="#f59e0b">Rotation</text>

          <defs>
            <marker id="arrowM" markerWidth="5" markerHeight="4" refX="4" refY="2" orient="auto"><path d="M0 0L5 2L0 4Z" fill="#10b981" /></marker>
            <marker id="arrowRot" markerWidth="5" markerHeight="4" refX="4" refY="2" orient="auto"><path d="M0 0L5 2L0 4Z" fill="#f59e0b" /></marker>
          </defs>
        </svg>
      ),
      wave_tank: (
        <svg viewBox="0 0 380 200" className="w-full mx-auto" style={{ maxWidth: 380 }}>
          {/* Tank */}
          <rect x="40" y="80" width="300" height="100" fill="#a7f3d0" stroke="#059669" strokeWidth="2.5" rx="4" />
          <text x="190" y="145" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#065f46">Water</text>

          {/* Wave source (left) */}
          <rect x="50" y="100" width="15" height="60" fill="#475569" stroke="#1e293b" strokeWidth="1.5" rx="3" />
          <path d="M57 95 L57 75" stroke="#475569" strokeWidth="2" />

          {/* Waves */}
          {[90, 130, 170, 210].map((x, i) => (
            <circle key={i} cx={x} cy="130" r={20 - i * 3} fill="none" stroke="#0284c7" strokeWidth="1.5" opacity={1 - i * 0.2} />
          ))}

          {/* Barrier with gap */}
          <rect x="270" y="80" width="12" height="35" fill="#64748b" stroke="#334155" strokeWidth="2" />
          <rect x="270" y="125" width="12" height="55" fill="#64748b" stroke="#334155" strokeWidth="2" />
          <text x="276" y="115" textAnchor="middle" fontSize="7" fill="#fff" fontWeight="bold">Gap</text>

          {/* Diffracted waves */}
          <path d="M282 115 Q310 100 340 125" stroke="#0284c7" strokeWidth="1.5" fill="none" strokeDasharray="2 3" />
          <text x="350" y="110" fontSize="8" fill="#0284c7" fontWeight="bold">Diffraction</text>
        </svg>
      ),
      thermal: (
        <svg viewBox="0 0 360 200" className="w-full mx-auto" style={{ maxWidth: 360 }}>
          {/* Hot object (left) */}
          <rect x="40" y="80" width="60" height="50" fill="#ef4444" stroke="#991b1b" strokeWidth="2" rx="4" />
          <text x="70" y="108" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#fff">Hot</text>
          {/* Heat radiations */}
          {[-15, 0, 15].map((angle, i) => {
            const rad = (angle * Math.PI) / 180;
            const x = 100 + 40 * Math.cos(rad);
            const y = 105 + 40 * Math.sin(rad);
            return <line key={`h${i}`} x1="100" y1="105" x2={x} y2={y} stroke="#fbbf24" strokeWidth="2" markerEnd="url(#arrowT)" />;
          })}

          {/* Cold object (right) */}
          <rect x="260" y="80" width="60" height="50" fill="#3b82f6" stroke="#1e40af" strokeWidth="2" rx="4" />
          <text x="290" y="108" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#fff">Cold</text>

          {/* Heat transfer arrow */}
          <path d="M160 105 L240 105" stroke="#f97316" strokeWidth="2.5" fill="none" markerEnd="url(#arrowTH)" />
          <text x="200" y="90" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#f97316">Heat transfer</text>

          {/* Temperature labels */}
          <text x="70" y="145" textAnchor="middle" fontSize="8" fill="#991b1b" fontWeight="bold">T₁</text>
          <text x="290" y="145" textAnchor="middle" fontSize="8" fill="#1e40af" fontWeight="bold">T₂</text>

          <defs>
            <marker id="arrowT" markerWidth="5" markerHeight="4" refX="4" refY="2" orient="auto"><path d="M0 0L5 2L0 4Z" fill="#fbbf24" /></marker>
            <marker id="arrowTH" markerWidth="5" markerHeight="4" refX="4" refY="2" orient="auto"><path d="M0 0L5 2L0 4Z" fill="#f97316" /></marker>
          </defs>
        </svg>
      ),
      national_grid: (
        <svg viewBox="0 0 480 200" className="w-full mx-auto" style={{ maxWidth: 480 }}>
          {/* Power station */}
          <rect x="10" y="55" width="55" height="65" fill="#3b82f6" stroke="#1e40af" strokeWidth="2" rx="3" />
          <rect x="20" y="35" width="15" height="20" fill="#6b7280" stroke="#374151" strokeWidth="1.5" rx="1" />
          {hideLabels ? _m(37, 88, 1) : (<><text x="37" y="85" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#fff">Power</text><text x="37" y="95" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#fff">Station</text></>)}
          {!hideLabels && <text x="37" y="135" textAnchor="middle" fontSize="7" fill="#1e40af" fontWeight="bold">25 kV</text>}

          {/* Wire to step-up */}
          <line x1="65" y1="87" x2="95" y2="87" stroke="#64748b" strokeWidth="2" />

          {/* Step-up transformer */}
          <rect x="95" y="72" width="50" height="30" fill="#fde68a" stroke="#b45309" strokeWidth="2" rx="3" />
          {hideLabels ? _m(120, 87, 2) : <text x="120" y="91" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#92400e">Step-up</text>}
          {!hideLabels && <text x="120" y="115" textAnchor="middle" fontSize="7" fill="#b45309" fontWeight="bold">↑ 400 kV</text>}

          {/* High voltage transmission */}
          <line x1="145" y1="87" x2="295" y2="87" stroke="#ef4444" strokeWidth="3" />
          {/* Pylons */}
          {[180, 220, 260].map((px) => (
            <g key={px}>
              <line x1={px} y1="60" x2={px} y2="87" stroke="#475569" strokeWidth="2" />
              <line x1={px - 8} y1="60" x2={px + 8} y2="60" stroke="#475569" strokeWidth="1.5" />
              <line x1={px - 12} y1="65" x2={px + 12} y2="65" stroke="#475569" strokeWidth="1.5" />
              <line x1={px} y1="87" x2={px} y2="140" stroke="#475569" strokeWidth="1.5" />
              <line x1={px - 6} y1="140" x2={px + 6} y2="140" stroke="#475569" strokeWidth="1.5" />
            </g>
          ))}
          {hideLabels ? _m(220, 50, 3) : <text x="220" y="50" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#ef4444">400 kV Transmission</text>}

          {/* Wire to step-down */}
          <line x1="295" y1="87" x2="325" y2="87" stroke="#64748b" strokeWidth="2" />

          {/* Step-down transformer */}
          <rect x="325" y="72" width="50" height="30" fill="#fde68a" stroke="#b45309" strokeWidth="2" rx="3" />
          {hideLabels ? _m(350, 87, 4) : <text x="350" y="91" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#92400e">Step-down</text>}
          {!hideLabels && <text x="350" y="115" textAnchor="middle" fontSize="7" fill="#b45309" fontWeight="bold">↓ 230 V</text>}

          {/* Wire to consumers */}
          <line x1="375" y1="87" x2="405" y2="87" stroke="#64748b" strokeWidth="2" />

          {/* Consumer buildings */}
          <rect x="405" y="60" width="30" height="35" fill="#e0f2fe" stroke="#0284c7" strokeWidth="2" rx="2" />
          <polygon points="405,60 420,45 450,60" fill="#bae6fd" stroke="#0284c7" strokeWidth="1.5" />
          <rect x="440" y="70" width="25" height="25" fill="#e0f2fe" stroke="#0284c7" strokeWidth="2" rx="2" />
          <polygon points="440,70 452,58 465,70" fill="#bae6fd" stroke="#0284c7" strokeWidth="1.5" />
          {hideLabels ? _m(440, 110, 5) : (<><text x="440" y="115" textAnchor="middle" fontSize="7" fill="#0284c7" fontWeight="bold">Consumers</text><text x="440" y="135" textAnchor="middle" fontSize="7" fill="#0284c7" fontWeight="bold">230 V</text></>)}

          {/* Flow arrows */}
          <defs>
            <marker id="arrowNG" markerWidth="5" markerHeight="4" refX="4" refY="2" orient="auto"><path d="M0 0L5 2L0 4Z" fill="#64748b" /></marker>
          </defs>
          <text x="240" y="170" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#475569">The National Grid</text>
        </svg>
      ),
      spring: (
        <svg viewBox="0 0 260 320" className="w-full mx-auto" style={{ maxWidth: 260 }}>
          {/* Support */}
          <rect x="100" y="20" width="60" height="15" fill="#475569" stroke="#1e293b" strokeWidth="2" rx="3" />

          {/* Spring */}
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const y = 35 + i * 20;
            return (
              <path key={i} d={`M130 ${y} L115 ${y + 8} L145 ${y + 8} L130 ${y + 16}`}
                stroke="#334155" strokeWidth="2" fill="none" />
            );
          })}

          {/* Weight */}
          <rect x="100" y="160" width="60" height="50" fill="#3b82f6" stroke="#1e40af" strokeWidth="2" rx="4" />
          <text x="130" y="190" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#fff">Mass</text>

          {/* Extension ruler (right side) */}
          <line x1="190" y1="35" x2="190" y2="220" stroke="#94a3b8" strokeWidth="1.5" />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <g key={`tick${i}`}>
              <line x1="185" y1={35 + i * 37} x2="195" y2={35 + i * 37} stroke="#475569" strokeWidth="1.5" />
              <text x="210" y={40 + i * 37} fontSize="8" fill="#475569" fontWeight="bold">{i}</text>
            </g>
          ))}
          <text x="210" y="25" fontSize="8" fill="#475569" fontWeight="bold">Length</text>

          {/* Extension amount */}
          <line x1="175" y1="160" x2="175" y2="210" stroke="#dc2626" strokeWidth="2" strokeDasharray="2 3" />
          <path d="M170 160 L180 160 M170 210 L180 210" stroke="#dc2626" strokeWidth="2" />
          <text x="155" y="190" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#dc2626">Δx</text>
        </svg>
      ),
    };

    const sceneSvg = scenes[sceneType];

    return (
      <div className="mb-8 p-5 bg-violet-50 rounded-lg border-2 border-violet-300">
        <div className="flex items-center gap-2 mb-3">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-violet-700">
            <circle cx="10" cy="8" r="5" stroke="currentColor" strokeWidth="1.5" fill="none" />
            <path d="M10 13v4M7 17h6" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          <p className="text-sm font-bold text-violet-800 uppercase tracking-wide">Diagram</p>
        </div>
        {sceneSvg || <p className="text-violet-900 text-base leading-relaxed">{desc}</p>}
        <p className="text-xs text-violet-600 mt-3 italic text-center">{desc}</p>
      </div>
    );
  };

  // ── NEW RENDERERS (COMPREHENSIVE) ──────────────────────────────────────────────

  const renderLineGraph = (desc) => {
    // Unit abbreviation lookup for physics/science graphs
    const UNIT_ABBREV = {
      amps: "A", amperes: "A", milliamps: "mA",
      volts: "V", millivolts: "mV", kilovolts: "kV",
      ohms: "Ω", kilohms: "kΩ",
      watts: "W", kilowatts: "kW", megawatts: "MW",
      joules: "J", kilojoules: "kJ", megajoules: "MJ",
      newtons: "N", kilonewtons: "kN",
      metres: "m", meters: "m", centimetres: "cm", centimeters: "cm", millimetres: "mm", kilometres: "km",
      seconds: "s", milliseconds: "ms", minutes: "min", hours: "h",
      kilograms: "kg", grams: "g", milligrams: "mg",
      celsius: "°C", fahrenheit: "°F", kelvin: "K",
      pascals: "Pa", kilopascals: "kPa",
      hertz: "Hz", kilohertz: "kHz",
      percent: "%", percentage: "%",
    };
    const abbrevUnit = (u) => UNIT_ABBREV[u.toLowerCase()] || u;

    // Extract axis labels from description — try explicit axis labels first
    const xMatch = desc.match(/x-?axis.*?(?:for|labeled?|shows?)\s+['"]?([^'",.]+?)['"]?(?:\.|,|$)/i);
    const yMatch = desc.match(/y-?axis.*?(?:for|labeled?|shows?)\s+['"]?([^'",.]+?)['"]?(?:\.|,|$)/i);
    let xLabel = xMatch ? xMatch[1].trim() : "";
    let yLabel = yMatch ? yMatch[1].trim() : "";
    let xUnit = "";
    let yUnit = "";

    // Pattern: "between X in units and Y in units" (e.g. "between current in amps and potential difference in volts")
    if (!xLabel || !yLabel) {
      const betweenUnits = desc.match(/between\s+(.+?)\s+in\s+(\w+)\s+and\s+(.+?)\s+in\s+(\w+)/i);
      if (betweenUnits) {
        yLabel = yLabel || betweenUnits[1].trim();
        yUnit = yUnit || ` (${abbrevUnit(betweenUnits[2])})`;
        xLabel = xLabel || betweenUnits[3].trim();
        xUnit = xUnit || ` (${abbrevUnit(betweenUnits[4])})`;
      }
    }

    // Pattern: "between X and Y" without explicit units
    if (!xLabel || !yLabel) {
      const betweenSimple = desc.match(/between\s+(.+?)\s+and\s+(.+?)(?:\s+for|\s+of|\.|,|$)/i);
      if (betweenSimple) {
        yLabel = yLabel || betweenSimple[1].trim();
        xLabel = xLabel || betweenSimple[2].trim();
      }
    }

    // Pattern: "showing X over/against/vs Y" or "of X over Y"
    if (!xLabel || !yLabel) {
      const overMatch = desc.match(/(?:showing|of)\s+(.+?)\s+(?:over|against|vs|versus|with)\s+(.+?)(?:\.|,|$)/i);
      if (overMatch) {
        yLabel = yLabel || overMatch[1].trim();
        xLabel = xLabel || overMatch[2].trim();
      }
      const changeMatch = desc.match(/(\w+(?:\s+\w+)?)\s+change\s+over\s+(\w+)/i);
      if (changeMatch) {
        yLabel = yLabel || changeMatch[1].trim();
        xLabel = xLabel || changeMatch[2].trim();
      }
    }

    // Pattern: "X (unit) against/vs Y (unit)" e.g. "temperature (°C) against time (minutes)"
    if (!xLabel || !yLabel) {
      const vsParens = desc.match(/(\w[\w\s]*?)\s*\(([^)]+)\)\s+(?:against|vs|versus)\s+(\w[\w\s]*?)\s*\(([^)]+)\)/i);
      if (vsParens) {
        yLabel = yLabel || vsParens[1].trim();
        yUnit = yUnit || ` (${vsParens[2].trim()})`;
        xLabel = xLabel || vsParens[3].trim();
        xUnit = xUnit || ` (${vsParens[4].trim()})`;
      }
    }

    // Strip trailing "in <unit>" from labels and extract unit if not already set
    [["yLabel", "yUnit"], ["xLabel", "xUnit"]].forEach(([lbl, unt]) => {
      const ref = { yLabel, yUnit, xLabel, xUnit };
      const inUnitMatch = ref[lbl].match(/^(.+?)\s+in\s+(\w+)$/i);
      if (inUnitMatch && !ref[unt]) {
        if (lbl === "yLabel") { yLabel = inUnitMatch[1].trim(); yUnit = ` (${abbrevUnit(inUnitMatch[2])})`; }
        else { xLabel = inUnitMatch[1].trim(); xUnit = ` (${abbrevUnit(inUnitMatch[2])})`; }
      }
    });

    // Fallback unit extraction from anywhere in the description
    if (!yUnit && !xUnit) {
      const unitMatch = desc.match(/in\s+([\w°/%]+(?:\s*\/\s*[\w°/%]+)?)/i);
      if (unitMatch) yUnit = ` (${unitMatch[1]})`;
    }

    if (!xLabel) xLabel = "X-axis";
    if (!yLabel) yLabel = "Y-axis";

    // Capitalise first letter
    yLabel = yLabel.charAt(0).toUpperCase() + yLabel.slice(1);
    xLabel = xLabel.charAt(0).toUpperCase() + xLabel.slice(1);

    // Truncate if too long
    if (xLabel.length > 25) xLabel = xLabel.substring(0, 25) + "...";
    if (yLabel.length > 25) yLabel = yLabel.substring(0, 25) + "...";

    return (
      <div className="mb-8 p-6 bg-white rounded-lg border-2 border-slate-200 shadow-sm">
        <p className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4 flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 14V2M2 14H14M4 10L7 6L10 8L13 4" stroke="#334155" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Graph
        </p>
        <div className="flex justify-center overflow-x-auto">
          <svg viewBox="0 0 420 290" className="w-full max-w-md" style={{ minWidth: 320 }}>
            {/* Light grid lines */}
            {[...Array(6)].map((_, i) => (
              <line key={`gx${i}`} x1={60 + i * 60} y1="30" x2={60 + i * 60} y2="220" stroke="#f1f5f9" strokeWidth="1" />
            ))}
            {[...Array(5)].map((_, i) => (
              <line key={`gy${i}`} x1="60" y1={220 - i * 48} x2="380" y2={220 - i * 48} stroke="#f1f5f9" strokeWidth="1" />
            ))}
            {/* Axes */}
            <line x1="60" y1="220" x2="380" y2="220" stroke="#334155" strokeWidth="2" />
            <line x1="60" y1="220" x2="60" y2="30" stroke="#334155" strokeWidth="2" />
            {/* Arrowheads */}
            <polygon points="380,220 374,216 374,224" fill="#334155" />
            <polygon points="60,30 56,36 64,36" fill="#334155" />
            {/* Tick marks only — no numeric values (we don't know the real scale) */}
            {[1, 2, 3, 4, 5].map((i) => (
              <line key={`xt${i}`} x1={60 + i * 60} y1="218" x2={60 + i * 60} y2="224" stroke="#334155" strokeWidth="1.5" />
            ))}
            {[1, 2, 3, 4].map((i) => (
              <line key={`yt${i}`} x1="57" y1={220 - i * 48} x2="63" y2={220 - i * 48} stroke="#334155" strokeWidth="1.5" />
            ))}
            {/* Y-axis label (rotated) */}
            <text x="18" y="125" textAnchor="middle" fontSize="12" fill="#334155" fontWeight="600" transform="rotate(-90 18 125)">{yLabel}{yUnit}</text>
            {/* X-axis label */}
            <text x="220" y="255" textAnchor="middle" fontSize="12" fill="#334155" fontWeight="600">{xLabel}{xUnit}</text>
            {/* "Refer to exam paper" note where data would be */}
            <text x="220" y="120" textAnchor="middle" fontSize="11" fill="#94a3b8" fontStyle="italic">Refer to the exam paper for data</text>
            <text x="220" y="138" textAnchor="middle" fontSize="11" fill="#94a3b8" fontStyle="italic">shown in this graph.</text>
          </svg>
        </div>
        <p className="text-xs text-slate-500 mt-4 text-center italic">
          {desc}
        </p>
      </div>
    );
  };

  const renderPhysicsEnergyDiagram = (desc) => {
    const descLower = desc.toLowerCase();

    // Detect Sankey diagram (energy transfer with percentages)
    if (/sankey|energy\s+flow|efficiency|percentage|percent|%|input|output|wast/i.test(descLower)) {
      return (
        <div className="mb-8 p-6 bg-emerald-50 rounded-lg border-2 border-emerald-300">
          <p className="text-sm font-bold text-emerald-800 uppercase tracking-wide mb-4">Energy Transfer Diagram</p>
          <div className="flex justify-center">
            <svg viewBox="0 0 380 220" className="w-full max-w-sm">
              {/* Input energy box */}
              <rect x="10" y="85" width="60" height="50" fill="#10b981" stroke="#059669" strokeWidth="2" rx="4" />
              <text x="40" y="115" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#fff">Input</text>
              <text x="40" y="128" textAnchor="middle" fontSize="10" fill="#fff">100 J</text>

              {/* Arrow to splitter */}
              <path d="M70 110 L110 110" stroke="#059669" strokeWidth="2.5" fill="none" markerEnd="url(#arrowE)" />

              {/* Splitter (invisible) at x=120 */}

              {/* Useful energy arrow (wider) */}
              <path d="M120 110 Q200 80 260 60" stroke="#06b6d4" strokeWidth="5" fill="none" markerEnd="url(#arrowE1)" opacity="0.8" />
              <rect x="260" y="40" width="70" height="40" fill="#06b6d4" stroke="#0891b2" strokeWidth="2" rx="4" />
              <text x="295" y="63" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#fff">Useful</text>
              <text x="295" y="75" textAnchor="middle" fontSize="9" fill="#fff">~75 J</text>

              {/* Wasted energy arrow (narrower) */}
              <path d="M120 110 Q200 140 260 160" stroke="#f87171" strokeWidth="3" fill="none" markerEnd="url(#arrowE2)" opacity="0.8" />
              <rect x="260" y="145" width="70" height="40" fill="#f87171" stroke="#dc2626" strokeWidth="2" rx="4" />
              <text x="295" y="168" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#fff">Wasted</text>
              <text x="295" y="180" textAnchor="middle" fontSize="9" fill="#fff">~25 J</text>

              {/* Legend */}
              <defs>
                <marker id="arrowE" markerWidth="5" markerHeight="4" refX="4" refY="2" orient="auto"><path d="M0 0L5 2L0 4Z" fill="#059669" /></marker>
                <marker id="arrowE1" markerWidth="5" markerHeight="4" refX="4" refY="2" orient="auto"><path d="M0 0L5 2L0 4Z" fill="#06b6d4" /></marker>
                <marker id="arrowE2" markerWidth="5" markerHeight="4" refX="4" refY="2" orient="auto"><path d="M0 0L5 2L0 4Z" fill="#f87171" /></marker>
              </defs>
            </svg>
          </div>
          <p className="text-xs text-emerald-600 mt-3 text-center italic">Energy input splits into useful and wasted outputs.</p>
        </div>
      );
    }

    // Generic energy transfer
    return (
      <div className="mb-8 p-6 bg-orange-50 rounded-lg border-2 border-orange-300">
        <p className="text-sm font-bold text-orange-800 uppercase tracking-wide mb-4">Energy Diagram</p>
        <div className="flex justify-center">
          <svg viewBox="0 0 360 180" className="w-full max-w-sm">
            {/* Energy boxes */}
            <rect x="20" y="65" width="60" height="50" fill="#f97316" stroke="#ea580c" strokeWidth="2" rx="4" />
            <text x="50" y="95" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#fff">Chemical</text>

            <path d="M80 90 L120 90" stroke="#ea580c" strokeWidth="2.5" fill="none" markerEnd="url(#arrowEN)" />

            <rect x="120" y="65" width="60" height="50" fill="#ec4899" stroke="#be185d" strokeWidth="2" rx="4" />
            <text x="150" y="95" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#fff">Kinetic</text>

            <path d="M180 90 L220 90" stroke="#be185d" strokeWidth="2.5" fill="none" markerEnd="url(#arrowEN)" />

            <rect x="220" y="65" width="60" height="50" fill="#f59e0b" stroke="#d97706" strokeWidth="2" rx="4" />
            <text x="250" y="95" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#fff">Thermal</text>

            {/* Heat loss indicator */}
            <path d="M280 65 L310 20 M290 65 L320 25 M300 65 L330 30" stroke="#d97706" strokeWidth="1.5" fill="none" strokeDasharray="2 2" />
            <text x="320" y="18" fontSize="9" fill="#d97706" fontWeight="bold">Heat loss</text>

            <defs>
              <marker id="arrowEN" markerWidth="5" markerHeight="4" refX="4" refY="2" orient="auto"><path d="M0 0L5 2L0 4Z" fill="currentColor" /></marker>
            </defs>
          </svg>
        </div>
        <p className="text-xs text-orange-600 mt-3 text-center italic">Energy transformation through different forms.</p>
      </div>
    );
  };

  const renderPhysicsWaveDiagram = (desc) => {
    const descLower = desc.toLowerCase();

    // EM spectrum
    if (/em\s+spectrum|electromagnetic\s+spectrum|gamma|x-?ray|ultraviolet|infrared|microwave|radio/i.test(descLower)) {
      return (
        <div className="mb-8 p-6 bg-purple-50 rounded-lg border-2 border-purple-300">
          <p className="text-sm font-bold text-purple-800 uppercase tracking-wide mb-4">EM Spectrum</p>
          <div className="flex justify-center">
            <svg viewBox="0 0 440 140" className="w-full max-w-md">
              {/* Spectrum bar */}
              <defs>
                <linearGradient id="specGrad" x1="0%" x2="100%">
                  <stop offset="0%" stopColor="#991b1b" />
                  <stop offset="16%" stopColor="#dc2626" />
                  <stop offset="32%" stopColor="#f97316" />
                  <stop offset="48%" stopColor="#fbbf24" />
                  <stop offset="64%" stopColor="#6366f1" />
                  <stop offset="80%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#1e3a8a" />
                </linearGradient>
              </defs>
              <rect x="20" y="40" width="400" height="30" fill="url(specGrad)" stroke="#4c1d95" strokeWidth="2" rx="4" />

              {/* Labels below */}
              {[
                { x: 40, label: "Radio", long: true },
                { x: 100, label: "Microwave", long: true },
                { x: 160, label: "IR", long: false },
                { x: 220, label: "Visible", long: false },
                { x: 280, label: "UV", long: false },
                { x: 340, label: "X-ray", long: false },
                { x: 400, label: "Gamma", long: false }
              ].map((item, i) => (
                <g key={i}>
                  <line x1={item.x} y1="70" x2={item.x} y2="80" stroke="#4c1d95" strokeWidth="1.5" />
                  <text x={item.x} y="95" textAnchor="middle" fontSize="10" fill="#4c1d95" fontWeight="bold">{item.label}</text>
                </g>
              ))}

              {/* Wavelength scale */}
              <text x="220" y="125" textAnchor="middle" fontSize="9" fill="#6b21a8" fontStyle="italic">Increasing frequency →</text>
            </svg>
          </div>
          <p className="text-xs text-purple-600 mt-3 text-center italic">Electromagnetic spectrum showing wavelength and frequency ranges.</p>
        </div>
      );
    }

    // Wave diagram (sine wave)
    return (
      <div className="mb-8 p-6 bg-blue-50 rounded-lg border-2 border-blue-300">
        <p className="text-sm font-bold text-blue-800 uppercase tracking-wide mb-4">Wave Diagram</p>
        <div className="flex justify-center">
          <svg viewBox="0 0 420 200" className="w-full max-w-md">
            {/* Grid */}
            <line x1="20" y1="100" x2="400" y2="100" stroke="#e0f2fe" strokeWidth="1.5" />

            {/* Wave */}
            <path d="M20,100 Q40,60 60,100 T100,100 T140,100 T180,100 T220,100 T260,100 T300,100 T340,100 T380,100 T400,100"
              stroke="#0369a1" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />

            {/* Wavelength annotation */}
            <line x1="60" y1="130" x2="140" y2="130" stroke="#0571c1" strokeWidth="1.5" strokeDasharray="3 2" />
            <line x1="60" y1="125" x2="60" y2="135" stroke="#0571c1" strokeWidth="1.5" />
            <line x1="140" y1="125" x2="140" y2="135" stroke="#0571c1" strokeWidth="1.5" />
            <text x="100" y="150" textAnchor="middle" fontSize="11" fill="#0571c1" fontWeight="bold">Wavelength (λ)</text>

            {/* Amplitude annotation */}
            <line x1="10" y1="60" x2="10" y2="100" stroke="#dc2626" strokeWidth="1.5" strokeDasharray="3 2" />
            <line x1="5" y1="60" x2="15" y2="60" stroke="#dc2626" strokeWidth="1.5" />
            <line x1="5" y1="100" x2="15" y2="100" stroke="#dc2626" strokeWidth="1.5" />
            <text x="-35" y="82" textAnchor="middle" fontSize="11" fill="#dc2626" fontWeight="bold" transform="rotate(-90 -35 82)">Amplitude (A)</text>

            {/* Frequency label */}
            <text x="220" y="25" textAnchor="middle" fontSize="10" fill="#0571c1" fontStyle="italic">f = v / λ</text>
          </svg>
        </div>
        <p className="text-xs text-blue-600 mt-3 text-center italic">Wave showing wavelength, amplitude, and frequency relationship.</p>
      </div>
    );
  };

  const renderCellDiagram = (desc) => {
    const descLower = desc.toLowerCase();
    const isPlant = /plant\s+cell|cell\s+wall|chloroplast|vacuole/i.test(descLower);

    return (
      <div className="mb-8 p-6 bg-lime-50 rounded-lg border-2 border-lime-300">
        <p className="text-sm font-bold text-lime-800 uppercase tracking-wide mb-4">
          {isPlant ? "Plant Cell" : "Animal Cell"}
        </p>
        <div className="flex justify-center">
          <svg viewBox="0 0 300 280" className="w-full max-w-xs">
            {isPlant ? (
              <>
                {/* Cell wall */}
                <rect x="30" y="20" width="240" height="240" fill="none" stroke="#15803d" strokeWidth="2.5" rx="8" />
                {/* Cell membrane */}
                <rect x="40" y="30" width="220" height="220" fill="#dcfce7" stroke="#16a34a" strokeWidth="2" rx="8" />
                {/* Large vacuole */}
                <ellipse cx="150" cy="140" rx="70" ry="80" fill="#e0e7ff" stroke="#6366f1" strokeWidth="2" />
                <text x="150" y="145" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#4f46e5">Vacuole</text>

                {/* Nucleus */}
                <circle cx="100" cy="90" r="22" fill="#fecaca" stroke="#dc2626" strokeWidth="1.5" />
                <circle cx="100" cy="90" r="10" fill="#fca5a5" stroke="#b91c1c" strokeWidth="1" />
                <text x="100" y="108" textAnchor="middle" fontSize="8" fill="#7f1d1d">Nucleus</text>

                {/* Chloroplasts */}
                {[120, 180].map((y, i) => (
                  <g key={`chloro${i}`}>
                    <ellipse cx={80} cy={y} rx="12" ry="15" fill="#22c55e" stroke="#16a34a" strokeWidth="1.5" />
                    <text x={80} y={y + 22} textAnchor="middle" fontSize="7" fill="#15803d">Chloro.</text>
                  </g>
                ))}

                {/* Mitochondria */}
                {[200, 220].map((x, i) => (
                  <ellipse key={`mito${i}`} cx={x} cy="70" rx="10" ry="8" fill="#facc15" stroke="#ca8a04" strokeWidth="1" />
                ))}
                <text x="220" y="55" textAnchor="middle" fontSize="7" fill="#92400e">Mito.</text>
              </>
            ) : (
              <>
                {/* Cell membrane */}
                <circle cx="150" cy="140" r="110" fill="#fce7f3" stroke="#ec4899" strokeWidth="2.5" />

                {/* Nucleus */}
                <circle cx="150" cy="140" r="35" fill="#fecaca" stroke="#dc2626" strokeWidth="2" />
                <circle cx="150" cy="140" r="18" fill="#fca5a5" stroke="#b91c1c" strokeWidth="1" />
                <text x="150" y="175" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#7f1d1d">Nucleus</text>

                {/* Mitochondria */}
                {[80, 220, 100, 180].map((x, i) => (
                  <ellipse key={`amito${i}`} cx={x} cy={80 + (i % 2) * 120} rx="12" ry="16" fill="#facc15" stroke="#ca8a04" strokeWidth="1.5" />
                ))}

                {/* Ribosomes */}
                {[110, 190, 120, 180].map((x, i) => (
                  <circle key={`ribo${i}`} cx={x} cy={100 + (i % 2) * 80} r="4" fill="#f472b6" stroke="#be185d" strokeWidth="1" />
                ))}
                <text x="185" y="88" textAnchor="middle" fontSize="7" fill="#be185d">Ribo.</text>
              </>
            )}
          </svg>
        </div>
        <p className="text-xs text-lime-600 mt-3 text-center italic">
          {isPlant ? "Plant cell showing cell wall, vacuole, and chloroplasts." : "Animal cell showing nucleus and organelles."}
        </p>
      </div>
    );
  };

  const renderPhysicsForceDiagram = (desc) => {
    // Simple free body diagram
    return (
      <div className="mb-8 p-6 bg-red-50 rounded-lg border-2 border-red-300">
        <p className="text-sm font-bold text-red-800 uppercase tracking-wide mb-4">Force Diagram</p>
        <div className="flex justify-center">
          <svg viewBox="0 0 300 280" className="w-full max-w-xs">
            {/* Object */}
            <rect x="120" y="110" width="60" height="60" fill="#ef4444" stroke="#991b1b" strokeWidth="2" rx="4" />
            <text x="150" y="145" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#fff">Object</text>

            {/* Weight (downward) */}
            <line x1="150" y1="170" x2="150" y2="220" stroke="#0284c7" strokeWidth="2.5" markerEnd="url(#arrowFD)" />
            <text x="165" y="200" fontSize="10" fontWeight="bold" fill="#0284c7">Weight</text>
            <text x="165" y="212" fontSize="9" fill="#0284c7">(mg)</text>

            {/* Normal force (upward) */}
            <line x1="150" y1="110" x2="150" y2="60" stroke="#16a34a" strokeWidth="2.5" markerEnd="url(#arrowFN)" />
            <text x="165" y="78" fontSize="10" fontWeight="bold" fill="#16a34a">Normal</text>

            {/* Friction (left) */}
            <line x1="120" y1="140" x2="50" y2="140" stroke="#ea580c" strokeWidth="2.5" markerEnd="url(#arrowFF)" />
            <text x="40" y="125" fontSize="10" fontWeight="bold" fill="#ea580c">Friction</text>

            {/* Applied force (right) */}
            <line x1="180" y1="140" x2="250" y2="140" stroke="#dc2626" strokeWidth="2.5" markerEnd="url(#arrowFA)" />
            <text x="260" y="125" fontSize="10" fontWeight="bold" fill="#dc2626">Applied</text>
            <text x="260" y="137" fontSize="9" fill="#dc2626">Force</text>

            <defs>
              <marker id="arrowFD" markerWidth="5" markerHeight="4" refX="4" refY="2" orient="auto"><path d="M0 0L5 2L0 4Z" fill="#0284c7" /></marker>
              <marker id="arrowFN" markerWidth="5" markerHeight="4" refX="4" refY="2" orient="auto"><path d="M0 0L5 2L0 4Z" fill="#16a34a" /></marker>
              <marker id="arrowFF" markerWidth="5" markerHeight="4" refX="4" refY="2" orient="auto"><path d="M0 0L5 2L0 4Z" fill="#ea580c" /></marker>
              <marker id="arrowFA" markerWidth="5" markerHeight="4" refX="4" refY="2" orient="auto"><path d="M0 0L5 2L0 4Z" fill="#dc2626" /></marker>
            </defs>
          </svg>
        </div>
        <p className="text-xs text-red-600 mt-3 text-center italic">Free body diagram showing all forces acting on an object.</p>
      </div>
    );
  };

  const renderMotionGraph = (desc) => {
    const descLower = desc.toLowerCase();
    const isVelocityTime = /velocity|speed/i.test(descLower) && /time/i.test(descLower);

    return (
      <div className="mb-8 p-6 bg-violet-50 rounded-lg border-2 border-violet-300">
        <p className="text-sm font-bold text-violet-800 uppercase tracking-wide mb-4">
          {isVelocityTime ? "Velocity-Time Graph" : "Distance-Time Graph"}
        </p>
        <div className="flex justify-center">
          <svg viewBox="0 0 360 260" className="w-full max-w-sm">
            {/* Grid */}
            {[...Array(4)].map((_, i) => (
              <line key={`gx${i}`} x1={60 + i * 75} y1="30" x2={60 + i * 75} y2="200" stroke="#f3e8ff" strokeWidth="1" />
            ))}
            {[...Array(4)].map((_, i) => (
              <line key={`gy${i}`} x1="60" y1={200 - i * 50} x2="310" y2={200 - i * 50} stroke="#f3e8ff" strokeWidth="1" />
            ))}

            {/* Axes */}
            <line x1="60" y1="200" x2="310" y2="200" stroke="#7c3aed" strokeWidth="2.5" />
            <line x1="60" y1="200" x2="60" y2="30" stroke="#7c3aed" strokeWidth="2.5" />
            <polygon points="310,200 304,196 304,204" fill="#7c3aed" />
            <polygon points="60,30 56,36 64,36" fill="#7c3aed" />

            {/* Axis labels */}
            <text x="185" y="235" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#6d28d9">Time (s)</text>
            <text x="-70" y="20" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#6d28d9" transform="rotate(-90 -70 20)">
              {isVelocityTime ? "Velocity (m/s)" : "Distance (m)"}
            </text>

            {/* Sample curve - acceleration then constant speed */}
            <polyline points="60,200 120,160 180,120 240,120 310,120"
              stroke="#7c3aed" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />

            {/* Regions */}
            <rect x="60" y="210" width="60" height="18" fill="#6d28d9" opacity="0.1" rx="2" />
            <text x="90" y="223" textAnchor="middle" fontSize="8" fill="#6d28d9" fontWeight="bold">Accel</text>

            <rect x="180" y="210" width="60" height="18" fill="#7c3aed" opacity="0.1" rx="2" />
            <text x="210" y="223" textAnchor="middle" fontSize="8" fill="#6d28d9" fontWeight="bold">Constant</text>
          </svg>
        </div>
        <p className="text-xs text-violet-600 mt-3 text-center italic">
          {isVelocityTime ? "Velocity-time graph showing acceleration and constant motion." : "Distance-time graph showing speed and distance."}
        </p>
      </div>
    );
  };

  const renderAtomicModel = (desc) => {
    const descLower = desc.toLowerCase();
    const isDecay = /decay|alpha|beta|emission|parent|daughter/i.test(descLower);

    if (isDecay) {
      return (
        <div className="mb-8 p-6 bg-amber-50 rounded-lg border-2 border-amber-300">
          <p className="text-sm font-bold text-amber-800 uppercase tracking-wide mb-4">Nuclear Decay</p>
          <div className="flex justify-center">
            <svg viewBox="0 0 360 160" className="w-full max-w-sm">
              {/* Parent nucleus */}
              <circle cx="60" cy="80" r="30" fill="#dc2626" stroke="#991b1b" strokeWidth="2" />
              <text x="60" y="75" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#fff">Parent</text>
              <text x="60" y="88" textAnchor="middle" fontSize="9" fill="#fff">Nucleus</text>

              {/* Decay arrow */}
              <path d="M90 80 L140 80" stroke="#991b1b" strokeWidth="2.5" fill="none" markerEnd="url(#arrowD)" />
              <text x="115" y="65" textAnchor="middle" fontSize="9" fill="#991b1b" fontWeight="bold">β decay</text>

              {/* Daughter nucleus */}
              <circle cx="200" cy="80" r="28" fill="#3b82f6" stroke="#1e40af" strokeWidth="2" />
              <text x="200" y="75" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#fff">Daughter</text>
              <text x="200" y="87" textAnchor="middle" fontSize="9" fill="#fff">Nucleus</text>

              {/* Emitted particle */}
              <path d="M200 50 L230 20" stroke="#ef4444" strokeWidth="2.5" fill="none" markerEnd="url(#arrowP)" />
              <text x="240" y="22" fontSize="9" fill="#ef4444" fontWeight="bold">e⁻</text>

              {/* Antineutrino */}
              <path d="M200 110 L230 140" stroke="#f59e0b" strokeWidth="2.5" fill="none" markerEnd="url(#arrowAn)" />
              <text x="240" y="142" fontSize="9" fill="#f59e0b" fontWeight="bold">ν̄</text>

              <defs>
                <marker id="arrowD" markerWidth="5" markerHeight="4" refX="4" refY="2" orient="auto"><path d="M0 0L5 2L0 4Z" fill="#991b1b" /></marker>
                <marker id="arrowP" markerWidth="5" markerHeight="4" refX="4" refY="2" orient="auto"><path d="M0 0L5 2L0 4Z" fill="#ef4444" /></marker>
                <marker id="arrowAn" markerWidth="5" markerHeight="4" refX="4" refY="2" orient="auto"><path d="M0 0L5 2L0 4Z" fill="#f59e0b" /></marker>
              </defs>
            </svg>
          </div>
          <p className="text-xs text-amber-600 mt-3 text-center italic">Nuclear decay showing parent nucleus emitting particles.</p>
        </div>
      );
    }

    // Regular atom model
    return (
      <div className="mb-8 p-6 bg-sky-50 rounded-lg border-2 border-sky-300">
        <p className="text-sm font-bold text-sky-800 uppercase tracking-wide mb-4">Atomic Model</p>
        <div className="flex justify-center">
          <svg viewBox="0 0 240 240" className="w-full max-w-xs">
            {/* Electron shells */}
            <circle cx="120" cy="120" r="35" fill="none" stroke="#0ea5e9" strokeWidth="1.5" strokeDasharray="2 3" />
            <circle cx="120" cy="120" r="60" fill="none" stroke="#0ea5e9" strokeWidth="1.5" strokeDasharray="2 3" />
            <circle cx="120" cy="120" r="85" fill="none" stroke="#0ea5e9" strokeWidth="1.5" strokeDasharray="2 3" />

            {/* Nucleus */}
            <circle cx="120" cy="120" r="15" fill="#ef4444" stroke="#991b1b" strokeWidth="2" />
            <text x="120" y="125" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#fff">Nucleus</text>

            {/* Electrons on shells */}
            {[0, 120, 240].map((angle) => {
              const rad = (angle * Math.PI) / 180;
              const x1 = 120 + 35 * Math.cos(rad);
              const y1 = 120 + 35 * Math.sin(rad);
              return <circle key={`e1-${angle}`} cx={x1} cy={y1} r="4" fill="#0284c7" stroke="#0c4a6e" strokeWidth="1" />;
            })}
            {[45, 180].map((angle) => {
              const rad = (angle * Math.PI) / 180;
              const x2 = 120 + 60 * Math.cos(rad);
              const y2 = 120 + 60 * Math.sin(rad);
              return <circle key={`e2-${angle}`} cx={x2} cy={y2} r="4" fill="#0284c7" stroke="#0c4a6e" strokeWidth="1" />;
            })}

            {/* Labels */}
            <text x="35" y="120" fontSize="9" fill="#0c4a6e" fontWeight="bold">Shell 1</text>
            <text x="195" y="195" fontSize="9" fill="#0c4a6e" fontWeight="bold">Shell 2</text>
          </svg>
        </div>
        <p className="text-xs text-sky-600 mt-3 text-center italic">Atom showing nucleus with electron shells and electrons.</p>
      </div>
    );
  };

  const renderPhysicsSpaceDiagram = (desc) => {
    const descLower = desc.toLowerCase();

    if (/galaxy|star|lifecycle|nebula|giant|dwarf|sequence/i.test(descLower)) {
      // HR diagram / stellar lifecycle
      return (
        <div className="mb-8 p-6 bg-slate-800 rounded-lg border-2 border-slate-600">
          <p className="text-sm font-bold text-slate-100 uppercase tracking-wide mb-4">Stellar Lifecycle</p>
          <div className="flex justify-center">
            <svg viewBox="0 0 360 240" className="w-full max-w-sm">
              {/* Background */}
              <rect width="360" height="240" fill="#1e293b" />

              {/* Main sequence (diagonal line) */}
              <line x1="50" y1="200" x2="300" y2="50" stroke="#60a5fa" strokeWidth="2.5" strokeDasharray="4 2" />

              {/* Stars as circles */}
              <circle cx="100" cy="170" r="12" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1.5" />
              <text x="100" y="195" textAnchor="middle" fontSize="9" fill="#fbbf24" fontWeight="bold">Red Dwarf</text>

              <circle cx="180" cy="110" r="16" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1.5" />
              <text x="180" y="135" textAnchor="middle" fontSize="9" fill="#fbbf24" fontWeight="bold">Sun</text>

              <circle cx="260" cy="80" r="20" fill="#ff6b6b" stroke="#dc2626" strokeWidth="1.5" />
              <text x="260" y="110" textAnchor="middle" fontSize="9" fill="#ff6b6b" fontWeight="bold">Red Giant</text>

              {/* Evolution arrows */}
              <path d="M130 150 Q180 130 240 90" stroke="#a5f3fc" strokeWidth="2" fill="none" markerEnd="url(#arrowS)" />
              <text x="140" y="140" fontSize="8" fill="#a5f3fc" fontWeight="bold">Evolution</text>

              <defs>
                <marker id="arrowS" markerWidth="5" markerHeight="4" refX="4" refY="2" orient="auto"><path d="M0 0L5 2L0 4Z" fill="#a5f3fc" /></marker>
              </defs>
            </svg>
          </div>
          <p className="text-xs text-slate-400 mt-3 text-center italic">Stellar evolution showing lifecycle stages of stars.</p>
        </div>
      );
    }

    // Orbital diagram
    return (
      <div className="mb-8 p-6 bg-slate-900 rounded-lg border-2 border-slate-700">
        <p className="text-sm font-bold text-slate-100 uppercase tracking-wide mb-4">Orbital Mechanics</p>
        <div className="flex justify-center">
          <svg viewBox="0 0 320 280" className="w-full max-w-sm">
            {/* Background */}
            <rect width="320" height="280" fill="#0f172a" />

            {/* Starfield */}
            {[...Array(20)].map((_, i) => {
              const x = (i * 73 + 17) % 320;
              const y = (i * 127 + 23) % 280;
              return <circle key={`star${i}`} cx={x} cy={y} r="1" fill="#e0f2fe" opacity="0.6" />;
            })}

            {/* Orbital path */}
            <ellipse cx="160" cy="140" rx="90" ry="50" fill="none" stroke="#06b6d4" strokeWidth="1.5" strokeDasharray="3 2" />

            {/* Central body (planet) */}
            <circle cx="160" cy="140" r="18" fill="#3b82f6" stroke="#1e40af" strokeWidth="2" />
            <text x="160" y="145" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#fff">Earth</text>

            {/* Satellite */}
            <circle cx="245" cy="140" r="6" fill="#facc15" stroke="#ca8a04" strokeWidth="1.5" />

            {/* Velocity vector */}
            <line x1="245" y1="146" x2="245" y2="190" stroke="#ef4444" strokeWidth="2" markerEnd="url(#arrowOrb)" />
            <text x="255" y="165" fontSize="8" fill="#ef4444" fontWeight="bold">v</text>

            {/* Radius line */}
            <line x1="160" y1="140" x2="245" y2="140" stroke="#a5f3fc" strokeWidth="1" strokeDasharray="2 2" />
            <text x="200" y="130" fontSize="8" fill="#a5f3fc" fontWeight="bold">r</text>

            <defs>
              <marker id="arrowOrb" markerWidth="5" markerHeight="4" refX="4" refY="2" orient="auto"><path d="M0 0L5 2L0 4Z" fill="#ef4444" /></marker>
            </defs>
          </svg>
        </div>
        <p className="text-xs text-slate-400 mt-3 text-center italic">Satellite in circular orbit around planet.</p>
      </div>
    );
  };

  const renderStatsDiagram = (desc) => {
    const descLower = desc.toLowerCase();

    // Box plot
    if (/box\s+plot|quartile/i.test(descLower)) {
      return (
        <div className="mb-8 p-6 bg-pink-50 rounded-lg border-2 border-pink-300">
          <p className="text-sm font-bold text-pink-800 uppercase tracking-wide mb-4">Box Plot</p>
          <div className="flex justify-center">
            <svg viewBox="0 0 380 160" className="w-full max-w-md">
              {/* Number line */}
              <line x1="40" y1="100" x2="350" y2="100" stroke="#be185d" strokeWidth="2" />
              <polygon points="350,100 344,96 344,104" fill="#be185d" />

              {/* Tick marks */}
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <g key={i}>
                  <line x1={40 + i * 62} y1="96" x2={40 + i * 62} y2="104" stroke="#be185d" strokeWidth="1.5" />
                  <text x={40 + i * 62} y="120" textAnchor="middle" fontSize="10" fill="#831843">{i * 20}</text>
                </g>
              ))}

              {/* Whiskers */}
              <line x1="50" y1="85" x2="50" y2="115" stroke="#ec4899" strokeWidth="1.5" />
              <line x1="50" y1="100" x2="85" y2="100" stroke="#ec4899" strokeWidth="1.5" />
              <text x="50" y="135" textAnchor="middle" fontSize="8" fill="#be185d">Min</text>

              <line x1="310" y1="85" x2="310" y2="115" stroke="#ec4899" strokeWidth="1.5" />
              <line x1="310" y1="100" x2="275" y2="100" stroke="#ec4899" strokeWidth="1.5" />
              <text x="310" y="135" textAnchor="middle" fontSize="8" fill="#be185d">Max</text>

              {/* Box Q1-Q3 */}
              <rect x="120" y="80" width="100" height="40" fill="#f472b6" stroke="#be185d" strokeWidth="2" rx="2" />

              {/* Median line */}
              <line x1="165" y1="80" x2="165" y2="120" stroke="#ec4899" strokeWidth="2.5" />
              <text x="165" y="140" textAnchor="middle" fontSize="8" fill="#be185d">Q2 (Median)</text>
            </svg>
          </div>
          <p className="text-xs text-pink-600 mt-3 text-center italic">Box plot showing quartiles, median, and range.</p>
        </div>
      );
    }

    // Pie chart
    if (/pie\s+chart|percentage|percent|%/i.test(descLower)) {
      return (
        <div className="mb-8 p-6 bg-orange-50 rounded-lg border-2 border-orange-300">
          <p className="text-sm font-bold text-orange-800 uppercase tracking-wide mb-4">Pie Chart</p>
          <div className="flex justify-center">
            <svg viewBox="0 0 260 260" className="w-full max-w-xs">
              {/* Pie slices */}
              <circle cx="130" cy="130" r="80" fill="none" stroke="#f97316" strokeWidth="2" />

              {/* Slice 1 (30%) */}
              <path d="M 130 50 A 80 80 0 0 1 186.5 65.5 L 165.4 115.7 A 40 40 0 0 0 130 90 Z" fill="#f97316" stroke="#ea580c" strokeWidth="1.5" />
              <text x="155" y="60" fontSize="9" fontWeight="bold" fill="#fff">30%</text>

              {/* Slice 2 (25%) */}
              <path d="M 186.5 65.5 A 80 80 0 0 1 205.8 130 L 182.9 115 A 40 40 0 0 0 165.4 115.7 Z" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1.5" />
              <text x="200" y="85" fontSize="9" fontWeight="bold" fill="#000">25%</text>

              {/* Slice 3 (25%) */}
              <path d="M 205.8 130 A 80 80 0 0 1 186.5 194.5 L 165.4 144.3 A 40 40 0 0 0 182.9 115 Z" fill="#fb923c" stroke="#ea580c" strokeWidth="1.5" />
              <text x="200" y="175" fontSize="9" fontWeight="bold" fill="#fff">25%</text>

              {/* Slice 4 (20%) */}
              <path d="M 186.5 194.5 A 80 80 0 0 1 130 210 L 130 155 A 40 40 0 0 0 165.4 144.3 Z" fill="#fed7aa" stroke="#f59e0b" strokeWidth="1.5" />
              <text x="155" y="190" fontSize="9" fontWeight="bold" fill="#000">20%</text>
            </svg>
          </div>
          <p className="text-xs text-orange-600 mt-3 text-center italic">Pie chart showing percentage distribution.</p>
        </div>
      );
    }

    // Scatter with trend line
    return (
      <div className="mb-8 p-6 bg-indigo-50 rounded-lg border-2 border-indigo-300">
        <p className="text-sm font-bold text-indigo-800 uppercase tracking-wide mb-4">Scatter Graph</p>
        <div className="flex justify-center">
          <svg viewBox="0 0 340 260" className="w-full max-w-sm">
            {/* Grid */}
            {[...Array(4)].map((_, i) => (
              <line key={`gx${i}`} x1={60 + i * 70} y1="30" x2={60 + i * 70} y2="200" stroke="#e0e7ff" strokeWidth="1" />
            ))}
            {[...Array(4)].map((_, i) => (
              <line key={`gy${i}`} x1="60" y1={200 - i * 50} x2="310" y2={200 - i * 50} stroke="#e0e7ff" strokeWidth="1" />
            ))}

            {/* Axes */}
            <line x1="60" y1="200" x2="310" y2="200" stroke="#4f46e5" strokeWidth="2.5" />
            <line x1="60" y1="200" x2="60" y2="30" stroke="#4f46e5" strokeWidth="2.5" />
            <polygon points="310,200 304,196 304,204" fill="#4f46e5" />

            {/* Data points */}
            {[[80, 160], [120, 140], [160, 120], [200, 100], [240, 80], [280, 60]].map((p, i) => (
              <circle key={i} cx={p[0]} cy={p[1]} r="3.5" fill="#4f46e5" stroke="#fff" strokeWidth="1.5" />
            ))}

            {/* Line of best fit */}
            <line x1="70" y1="170" x2="300" y2="55" stroke="#6366f1" strokeWidth="2" strokeDasharray="4 2" opacity="0.7" />

            {/* Labels */}
            <text x="185" y="230" textAnchor="middle" fontSize="10" fill="#4f46e5" fontWeight="bold">Variable X</text>
            <text x="-60" y="20" textAnchor="middle" fontSize="10" fill="#4f46e5" fontWeight="bold" transform="rotate(-90 -60 20)">Variable Y</text>
          </svg>
        </div>
        <p className="text-xs text-indigo-600 mt-3 text-center italic">Scatter graph with line of best fit showing correlation.</p>
      </div>
    );
  };

  const renderChemistryStructure = (desc) => {
    const descLower = desc.toLowerCase();

    // Chromatography
    if (/chromatography|rf\s+value|solvent\s+front/i.test(descLower)) {
      return (
        <div className="mb-8 p-6 bg-teal-50 rounded-lg border-2 border-teal-300">
          <p className="text-sm font-bold text-teal-800 uppercase tracking-wide mb-4">Paper Chromatography</p>
          <div className="flex justify-center">
            <svg viewBox="0 0 200 280" className="w-full max-w-xs">
              {/* Paper */}
              <rect x="40" y="20" width="120" height="230" fill="#f5f5f5" stroke="#14b8a6" strokeWidth="2" rx="4" />

              {/* Solvent front */}
              <line x1="40" y1="50" x2="160" y2="50" stroke="#06b6d4" strokeWidth="2" strokeDasharray="2 3" />
              <text x="170" y="55" fontSize="9" fontWeight="bold" fill="#06b6d4">Solvent front</text>

              {/* Baseline */}
              <line x1="40" y1="220" x2="160" y2="220" stroke="#0f766e" strokeWidth="2" />
              <text x="170" y="225" fontSize="9" fontWeight="bold" fill="#0f766e">Baseline</text>

              {/* Spots */}
              <circle cx="80" cy="180" r="5" fill="#ef4444" opacity="0.6" />
              <circle cx="100" cy="120" r="5" fill="#3b82f6" opacity="0.6" />
              <circle cx="120" cy="100" r="5" fill="#10b981" opacity="0.6" />

              {/* Rf distance line */}
              <line x1="130" y1="220" x2="130" y2="100" stroke="#f97316" strokeWidth="1.5" strokeDasharray="2 2" />
              <text x="140" y="165" fontSize="9" fill="#f97316" fontWeight="bold">Rf distance</text>

              {/* Solvent traveled */}
              <line x1="130" y1="220" x2="130" y2="50" stroke="#06b6d4" strokeWidth="1.5" strokeDasharray="2 2" />
            </svg>
          </div>
          <p className="text-xs text-teal-600 mt-3 text-center italic">Paper chromatography showing separation of dyes by Rf value.</p>
        </div>
      );
    }

    // Electrolysis setup
    if (/electrolysis|electrode|anode|cathode|solution|circuit|power/i.test(descLower)) {
      return (
        <div className="mb-8 p-6 bg-yellow-50 rounded-lg border-2 border-yellow-300">
          <p className="text-sm font-bold text-yellow-800 uppercase tracking-wide mb-4">Electrolysis Setup</p>
          <div className="flex justify-center">
            <svg viewBox="0 0 340 240" className="w-full max-w-sm">
              {/* Container */}
              <rect x="60" y="100" width="200" height="100" fill="#fffacd" stroke="#ca8a04" strokeWidth="2" rx="4" />
              <text x="160" y="160" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#92400e">Solution</text>

              {/* Anode (positive) */}
              <rect x="80" y="60" width="10" height="50" fill="#ef4444" stroke="#991b1b" strokeWidth="2" rx="2" />
              <text x="85" y="50" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#991b1b">+</text>
              <text x="85" y="200" textAnchor="middle" fontSize="9" fill="#991b1b" fontWeight="bold">Anode</text>

              {/* Cathode (negative) */}
              <rect x="250" y="60" width="10" height="50" fill="#3b82f6" stroke="#1e40af" strokeWidth="2" rx="2" />
              <text x="255" y="50" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#1e40af">−</text>
              <text x="255" y="200" textAnchor="middle" fontSize="9" fill="#1e40af" fontWeight="bold">Cathode</text>

              {/* Wires to power supply */}
              <line x1="85" y1="60" x2="85" y2="20" stroke="#475569" strokeWidth="2" />
              <line x1="255" y1="60" x2="255" y2="20" stroke="#475569" strokeWidth="2" />
              <rect x="130" y="5" width="100" height="15" fill="#475569" stroke="#1e293b" strokeWidth="1.5" rx="2" />
              <text x="180" y="15" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#fff">Power supply</text>

              {/* Bubbles */}
              <circle cx="80" cy="115" r="3" fill="#06b6d4" opacity="0.6" />
              <circle cx="75" cy="130" r="2.5" fill="#06b6d4" opacity="0.5" />
              <circle cx="255" cy="120" r="3" fill="#f97316" opacity="0.6" />
              <circle cx="260" cy="135" r="2.5" fill="#f97316" opacity="0.5" />
            </svg>
          </div>
          <p className="text-xs text-yellow-600 mt-3 text-center italic">Electrolysis cell with anode and cathode in solution.</p>
        </div>
      );
    }

    // Generic molecular structure
    return (
      <div className="mb-8 p-6 bg-green-50 rounded-lg border-2 border-green-300">
        <p className="text-sm font-bold text-green-800 uppercase tracking-wide mb-4">Molecular Structure</p>
        <div className="flex justify-center">
          <svg viewBox="0 0 280 220" className="w-full max-w-xs">
            {/* Central atom */}
            <circle cx="140" cy="110" r="12" fill="#10b981" stroke="#059669" strokeWidth="2" />
            <text x="140" y="115" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#fff">C</text>

            {/* Bonding atoms */}
            {[0, 90, 180, 270].map((angle) => {
              const rad = (angle * Math.PI) / 180;
              const x = 140 + 60 * Math.cos(rad);
              const y = 110 + 60 * Math.sin(rad);
              const atoms = ["H", "O", "H", "H"];
              const idx = angle / 90;

              return (
                <g key={angle}>
                  {/* Bond */}
                  <line x1="140" y1="110" x2={x} y2={y} stroke="#059669" strokeWidth="2" />
                  {/* Atom */}
                  <circle cx={x} cy={y} r="8" fill="#f59e0b" stroke="#d97706" strokeWidth="1.5" />
                  <text x={x} y={y + 3} textAnchor="middle" fontSize="8" fontWeight="bold" fill="#fff">{atoms[idx]}</text>
                </g>
              );
            })}
          </svg>
        </div>
        <p className="text-xs text-green-600 mt-3 text-center italic">Ball-and-stick model showing molecular bonds.</p>
      </div>
    );
  };

  // ── EXTEND renderPhysicsScene WITH NEW TYPES ─────────────────────────────────────

  // Update the renderPhysicsScene function to include new scene types
  // (Insert these INSIDE the existing renderPhysicsScene function before the scenes object)

  // ── NEW RENDERERS: Venn, Probability Tree, Circle Theorem, Number Machine, etc. ────

  const renderVennDiagram = (desc) => {
    // Detect if 3-way or 2-way Venn from description
    const is3Way = /three|triple|(?:a|b|c)\s+and|three\s+(?:sets?|circles?)/i.test(desc);

    if (is3Way) {
      return (
        <div className="mb-8 p-6 bg-violet-50 rounded-lg border-2 border-violet-300">
          <p className="text-sm font-bold text-violet-800 uppercase tracking-wide mb-4">Venn Diagram (3-way)</p>
          <div className="flex justify-center">
            <svg viewBox="0 0 360 320" className="w-full max-w-md">
              {/* Three circles */}
              <circle cx="120" cy="140" r="70" fill="rgba(139, 92, 246, 0.15)" stroke="#a78bfa" strokeWidth="2" />
              <circle cx="240" cy="140" r="70" fill="rgba(139, 92, 246, 0.15)" stroke="#a78bfa" strokeWidth="2" />
              <circle cx="180" cy="220" r="70" fill="rgba(139, 92, 246, 0.15)" stroke="#a78bfa" strokeWidth="2" />

              {/* Labels */}
              <text x="90" y="80" fontSize="12" fontWeight="bold" fill="#7c3aed">A</text>
              <text x="260" y="80" fontSize="12" fontWeight="bold" fill="#7c3aed">B</text>
              <text x="180" y="270" fontSize="12" fontWeight="bold" fill="#7c3aed">C</text>

              {/* Center point */}
              <circle cx="180" cy="150" r="3" fill="#7c3aed" />
            </svg>
          </div>
          <p className="text-xs text-violet-600 mt-3 text-center italic">Three-way Venn diagram showing relationships between sets A, B, and C.</p>
        </div>
      );
    }

    return (
      <div className="mb-8 p-6 bg-violet-50 rounded-lg border-2 border-violet-300">
        <p className="text-sm font-bold text-violet-800 uppercase tracking-wide mb-4">Venn Diagram</p>
        <div className="flex justify-center">
          <svg viewBox="0 0 280 240" className="w-full max-w-xs">
            {/* Two circles */}
            <circle cx="100" cy="120" r="60" fill="rgba(139, 92, 246, 0.15)" stroke="#a78bfa" strokeWidth="2" />
            <circle cx="180" cy="120" r="60" fill="rgba(139, 92, 246, 0.15)" stroke="#a78bfa" strokeWidth="2" />

            {/* Labels */}
            <text x="70" y="120" fontSize="13" fontWeight="bold" fill="#7c3aed">A</text>
            <text x="210" y="120" fontSize="13" fontWeight="bold" fill="#7c3aed">B</text>

            {/* Intersection marker */}
            <circle cx="140" cy="120" r="2.5" fill="#7c3aed" />
          </svg>
        </div>
        <p className="text-xs text-violet-600 mt-3 text-center italic">Venn diagram showing two overlapping sets with shared region.</p>
      </div>
    );
  };

  const renderProbabilityTree = (desc) => {
    return (
      <div className="mb-8 p-6 bg-amber-50 rounded-lg border-2 border-amber-300">
        <p className="text-sm font-bold text-amber-800 uppercase tracking-wide mb-4">Probability Tree</p>
        <div className="flex justify-center">
          <svg viewBox="0 0 340 260" className="w-full max-w-sm">
            {/* Start point */}
            <circle cx="40" cy="130" r="5" fill="#b45309" />

            {/* First level branches */}
            <line x1="45" y1="125" x2="100" y2="90" stroke="#d97706" strokeWidth="2" />
            <line x1="45" y1="135" x2="100" y2="170" stroke="#d97706" strokeWidth="2" />

            {/* First level outcomes */}
            <circle cx="100" cy="90" r="4" fill="#b45309" />
            <circle cx="100" cy="170" r="4" fill="#b45309" />

            {/* Labels on first branches */}
            <text x="65" y="105" fontSize="10" fontWeight="bold" fill="#b45309">p</text>
            <text x="65" y="155" fontSize="10" fontWeight="bold" fill="#b45309">1-p</text>

            {/* Second level branches from first outcome */}
            <line x1="105" y1="85" x2="160" y2="60" stroke="#d97706" strokeWidth="2" />
            <line x1="105" y1="95" x2="160" y2="120" stroke="#d97706" strokeWidth="2" />

            {/* Second level from second outcome */}
            <line x1="105" y1="165" x2="160" y2="140" stroke="#d97706" strokeWidth="2" />
            <line x1="105" y1="175" x2="160" y2="200" stroke="#d97706" strokeWidth="2" />

            {/* Second level outcomes */}
            <circle cx="160" cy="60" r="3" fill="#b45309" />
            <circle cx="160" cy="120" r="3" fill="#b45309" />
            <circle cx="160" cy="140" r="3" fill="#b45309" />
            <circle cx="160" cy="200" r="3" fill="#b45309" />

            {/* Result labels */}
            <text x="170" y="65" fontSize="10" fill="#b45309">Outcome 1</text>
            <text x="170" y="125" fontSize="10" fill="#b45309">Outcome 2</text>
            <text x="170" y="145" fontSize="10" fill="#b45309">Outcome 3</text>
            <text x="170" y="205" fontSize="10" fill="#b45309">Outcome 4</text>
          </svg>
        </div>
        <p className="text-xs text-amber-600 mt-3 text-center italic">Probability tree diagram showing branches with probabilities.</p>
      </div>
    );
  };

  const renderCircleTheorem = (desc) => {
    const descLower = desc.toLowerCase();
    const isTangent = /tangent/i.test(descLower);
    const isInscribed = /inscribed\s+angle|angle\s+at\s+(?:centre|center)/i.test(descLower);
    const isCyclic = /cyclic\s+quadrilateral/i.test(descLower);
    const isAlternate = /alternate\s+segment/i.test(descLower);

    if (isTangent) {
      return (
        <div className="mb-8 p-6 bg-indigo-50 rounded-lg border-2 border-indigo-300">
          <p className="text-sm font-bold text-indigo-800 uppercase tracking-wide mb-4">Circle Theorem: Tangent</p>
          <div className="flex justify-center">
            <svg viewBox="0 0 280 280" className="w-full max-w-xs">
              {/* Circle */}
              <circle cx="140" cy="140" r="80" fill="none" stroke="#4f46e5" strokeWidth="2.5" />

              {/* Tangent line */}
              <line x1="60" y1="220" x2="220" y2="220" stroke="#4f46e5" strokeWidth="2" />

              {/* Radius to tangent point */}
              <line x1="140" y1="140" x2="140" y2="220" stroke="#6366f1" strokeWidth="2" />

              {/* Right angle marker */}
              <rect x="135" y="210" width="10" height="10" fill="none" stroke="#6366f1" strokeWidth="1.5" />

              {/* Labels */}
              <text x="155" y="225" fontSize="11" fontWeight="bold" fill="#4f46e5">Tangent</text>
              <text x="100" y="175" fontSize="11" fontWeight="bold" fill="#6366f1">Radius</text>
              <text x="145" y="95" fontSize="11" fontWeight="bold" fill="#4f46e5">90°</text>
            </svg>
          </div>
          <p className="text-xs text-indigo-600 mt-3 text-center italic">Tangent to a circle is perpendicular to the radius at the point of contact.</p>
        </div>
      );
    }

    if (isInscribed) {
      return (
        <div className="mb-8 p-6 bg-indigo-50 rounded-lg border-2 border-indigo-300">
          <p className="text-sm font-bold text-indigo-800 uppercase tracking-wide mb-4">Circle Theorem: Inscribed Angle</p>
          <div className="flex justify-center">
            <svg viewBox="0 0 280 280" className="w-full max-w-xs">
              {/* Circle */}
              <circle cx="140" cy="140" r="80" fill="none" stroke="#4f46e5" strokeWidth="2.5" />

              {/* Points on circle */}
              <circle cx="140" cy="60" r="3" fill="#4f46e5" />
              <circle cx="220" cy="140" r="3" fill="#4f46e5" />
              <circle cx="140" cy="220" r="3" fill="#4f46e5" />
              <circle cx="60" cy="140" r="3" fill="#4f46e5" />

              {/* Center point */}
              <circle cx="140" cy="140" r="3" fill="#f97316" />

              {/* Inscribed angle (from circumference) */}
              <line x1="60" y1="140" x2="220" y2="140" stroke="#6366f1" strokeWidth="2" />
              <line x1="220" y1="140" x2="140" y2="60" stroke="#6366f1" strokeWidth="2" />
              <line x1="140" y1="60" x2="60" y2="140" stroke="#6366f1" strokeWidth="2" />

              {/* Central angle */}
              <line x1="140" y1="140" x2="220" y2="140" stroke="#f97316" strokeWidth="1.5" strokeDasharray="3 2" />
              <line x1="140" y1="140" x2="140" y2="60" stroke="#f97316" strokeWidth="1.5" strokeDasharray="3 2" />

              <text x="180" y="160" fontSize="10" fontWeight="bold" fill="#6366f1">θ</text>
              <text x="160" y="105" fontSize="10" fontWeight="bold" fill="#f97316">2θ</text>
            </svg>
          </div>
          <p className="text-xs text-indigo-600 mt-3 text-center italic">Angle at centre is twice the inscribed angle subtending the same arc.</p>
        </div>
      );
    }

    if (isCyclic) {
      return (
        <div className="mb-8 p-6 bg-indigo-50 rounded-lg border-2 border-indigo-300">
          <p className="text-sm font-bold text-indigo-800 uppercase tracking-wide mb-4">Cyclic Quadrilateral</p>
          <div className="flex justify-center">
            <svg viewBox="0 0 280 280" className="w-full max-w-xs">
              {/* Circle */}
              <circle cx="140" cy="140" r="80" fill="none" stroke="#4f46e5" strokeWidth="2.5" />

              {/* Quadrilateral points */}
              <circle cx="140" cy="60" r="4" fill="#4f46e5" />
              <circle cx="220" cy="120" r="4" fill="#4f46e5" />
              <circle cx="180" cy="220" r="4" fill="#4f46e5" />
              <circle cx="60" cy="160" r="4" fill="#4f46e5" />

              {/* Quadrilateral sides */}
              <line x1="140" y1="60" x2="220" y2="120" stroke="#6366f1" strokeWidth="2.5" />
              <line x1="220" y1="120" x2="180" y2="220" stroke="#6366f1" strokeWidth="2.5" />
              <line x1="180" y1="220" x2="60" y2="160" stroke="#6366f1" strokeWidth="2.5" />
              <line x1="60" y1="160" x2="140" y2="60" stroke="#6366f1" strokeWidth="2.5" />

              {/* Angle labels */}
              <text x="125" y="50" fontSize="11" fontWeight="bold" fill="#6366f1">A</text>
              <text x="235" y="130" fontSize="11" fontWeight="bold" fill="#6366f1">B</text>
              <text x="190" y="240" fontSize="11" fontWeight="bold" fill="#6366f1">C</text>
              <text x="40" y="170" fontSize="11" fontWeight="bold" fill="#6366f1">D</text>
            </svg>
          </div>
          <p className="text-xs text-indigo-600 mt-3 text-center italic">All four vertices of the quadrilateral lie on the circle. Opposite angles sum to 180°.</p>
        </div>
      );
    }

    // Default: generic circle theorem
    return (
      <div className="mb-8 p-6 bg-indigo-50 rounded-lg border-2 border-indigo-300">
        <p className="text-sm font-bold text-indigo-800 uppercase tracking-wide mb-4">Circle Theorem</p>
        <div className="flex justify-center">
          <svg viewBox="0 0 280 280" className="w-full max-w-xs">
            {/* Circle */}
            <circle cx="140" cy="140" r="80" fill="none" stroke="#4f46e5" strokeWidth="2.5" />

            {/* Center point */}
            <circle cx="140" cy="140" r="3" fill="#4f46e5" />

            {/* Chord */}
            <line x1="80" y1="100" x2="200" y2="100" stroke="#6366f1" strokeWidth="2" />

            {/* Arc */}
            <path d="M 80 100 A 80 80 0 0 1 200 100" fill="none" stroke="#f97316" strokeWidth="2" opacity="0.7" />

            <text x="140" y="60" fontSize="11" fontWeight="bold" fill="#4f46e5" textAnchor="middle">Centre</text>
            <text x="140" y="115" fontSize="11" fontWeight="bold" fill="#6366f1" textAnchor="middle">Chord</text>
          </svg>
        </div>
        <p className="text-xs text-indigo-600 mt-3 text-center italic">Circle theorem diagram with chord and arc.</p>
      </div>
    );
  };

  const renderNumberMachine = (desc) => {
    return (
      <div className="mb-8 p-6 bg-cyan-50 rounded-lg border-2 border-cyan-300">
        <p className="text-sm font-bold text-cyan-800 uppercase tracking-wide mb-4">Number Machine (Function Machine)</p>
        <div className="flex justify-center">
          <svg viewBox="0 0 380 160" className="w-full max-w-sm">
            {/* Input box */}
            <rect x="20" y="50" width="60" height="60" fill="#e0f7fa" stroke="#0097a7" strokeWidth="2" rx="4" />
            <text x="50" y="90" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#0097a7">Input</text>

            {/* Arrow to operation 1 */}
            <line x1="80" y1="80" x2="120" y2="80" stroke="#0891b2" strokeWidth="2.5" markerEnd="url(#arrowhead)" />

            {/* Operation 1 box */}
            <rect x="120" y="50" width="70" height="60" fill="#a7f3d0" stroke="#047857" strokeWidth="2" rx="4" />
            <text x="155" y="85" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#047857">× 2</text>

            {/* Arrow to operation 2 */}
            <line x1="190" y1="80" x2="230" y2="80" stroke="#0891b2" strokeWidth="2.5" markerEnd="url(#arrowhead)" />

            {/* Operation 2 box */}
            <rect x="230" y="50" width="70" height="60" fill="#fed7aa" stroke="#b45309" strokeWidth="2" rx="4" />
            <text x="265" y="85" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#b45309">+ 3</text>

            {/* Arrow to output */}
            <line x1="300" y1="80" x2="340" y2="80" stroke="#0891b2" strokeWidth="2.5" markerEnd="url(#arrowhead)" />

            {/* Output box */}
            <rect x="340" y="50" width="60" height="60" fill="#dbeafe" stroke="#1e40af" strokeWidth="2" rx="4" />
            <text x="370" y="90" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#1e40af">Output</text>

            {/* Arrow marker definition */}
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                <polygon points="0 0, 10 3, 0 6" fill="#0891b2" />
              </marker>
            </defs>

            {/* Example */}
            <text x="50" y="130" textAnchor="middle" fontSize="10" fill="#0891b2" fontWeight="bold">e.g. 5</text>
            <text x="155" y="130" textAnchor="middle" fontSize="10" fill="#047857" fontWeight="bold">→ 10</text>
            <text x="265" y="130" textAnchor="middle" fontSize="10" fill="#b45309" fontWeight="bold">→ 13</text>
          </svg>
        </div>
        <p className="text-xs text-cyan-600 mt-3 text-center italic">Function machine showing input transformed through operations to output.</p>
      </div>
    );
  };

  const renderReactionProfile = (desc) => {
    const descLower = desc.toLowerCase();
    const isExothermic = /exothermic/i.test(descLower);
    const isEndothermic = /endothermic/i.test(descLower);
    const hasCatalyst = /catalyst/i.test(descLower);

    return (
      <div className="mb-8 p-6 bg-rose-50 rounded-lg border-2 border-rose-300">
        <p className="text-sm font-bold text-rose-800 uppercase tracking-wide mb-4">Reaction Profile Energy Diagram</p>
        <div className="flex justify-center">
          <svg viewBox="0 0 320 260" className="w-full max-w-sm">
            {/* Axes */}
            <line x1="50" y1="200" x2="300" y2="200" stroke="#be123c" strokeWidth="2.5" />
            <line x1="50" y1="200" x2="50" y2="40" stroke="#be123c" strokeWidth="2.5" />

            {/* Axis labels */}
            <text x="260" y="225" fontSize="10" fontWeight="bold" fill="#be123c">Progress of reaction →</text>
            <text x="20" y="60" fontSize="10" fontWeight="bold" fill="#be123c" textAnchor="middle">Energy</text>

            {/* Reactants level */}
            <line x1="50" y1="160" x2="100" y2="160" stroke="#f43f5e" strokeWidth="3" />
            <text x="25" y="165" fontSize="9" fill="#be123c" fontWeight="bold">R</text>

            {/* Activation energy peak */}
            <path d="M 100 160 L 150 60 L 200 160" fill="none" stroke="#be123c" strokeWidth="2.5" />

            {/* Activation energy arrow and label */}
            <line x1="210" y1="160" x2="210" y2="60" stroke="#f97316" strokeWidth="2" markerEnd="url(#arrowEa)" />
            <text x="220" y="115" fontSize="10" fontWeight="bold" fill="#f97316">Ea</text>

            {/* Products level - exothermic or endothermic */}
            const productsY = isExothermic ? 140 : isEndothermic ? 100 : 140;
            <line x1="200" y1={productsY} x2="250" y2={productsY} stroke="#0ea5e9" strokeWidth="3" />
            <text x="275" y={productsY + 5} fontSize="9" fill="#0369a1" fontWeight="bold">{isExothermic ? "P (lower)" : isEndothermic ? "P (higher)" : "P"}</text>

            {/* Energy difference label */}
            {isExothermic && <text x="265" y="170" fontSize="9" fill="#059669" fontWeight="bold">ΔH (−)</text>}
            {isEndothermic && <text x="265" y="95" fontSize="9" fill="#dc2626" fontWeight="bold">ΔH (+)</text>}

            {/* Catalyst curve (lower peak) if present */}
            {hasCatalyst && (
              <>
                <path d="M 100 160 L 130 100 L 200 160" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeDasharray="3 3" opacity="0.8" />
                <text x="145" y="50" fontSize="8" fill="#8b5cf6" fontWeight="bold" textAnchor="middle">with catalyst</text>
              </>
            )}

            <defs>
              <marker id="arrowEa" markerWidth="10" markerHeight="10" refX="0" refY="3" orient="auto">
                <polygon points="10 0, 10 6, 0 3" fill="#f97316" />
              </marker>
            </defs>
          </svg>
        </div>
        <p className="text-xs text-rose-600 mt-3 text-center italic">{isExothermic ? "Exothermic reaction: products lower in energy than reactants." : isEndothermic ? "Endothermic reaction: products higher in energy than reactants." : "Reaction profile showing activation energy and energy change."}</p>
      </div>
    );
  };

  const renderMatchingExercise = (desc) => {
    return (
      <div className="mb-8 p-6 bg-emerald-50 rounded-lg border-2 border-emerald-300">
        <p className="text-sm font-bold text-emerald-800 uppercase tracking-wide mb-4">Matching Exercise</p>
        <div className="flex justify-center w-full">
          <svg viewBox="0 0 320 200" className="w-full max-w-sm">
            {/* Left column items */}
            <text x="30" y="25" fontSize="11" fontWeight="bold" fill="#047857">Items:</text>
            {[0, 1, 2, 3].map((i) => (
              <g key={`left-${i}`}>
                <rect x="20" y={40 + i * 35} width="80" height="25" fill="#d1fae5" stroke="#047857" strokeWidth="1.5" rx="3" />
                <text x="60" y={60 + i * 35} textAnchor="middle" fontSize="10" fill="#047857" fontWeight="bold">Item {i + 1}</text>
              </g>
            ))}

            {/* Right column items */}
            <text x="240" y="25" fontSize="11" fontWeight="bold" fill="#047857">Answers:</text>
            {[0, 1, 2, 3].map((i) => (
              <g key={`right-${i}`}>
                <rect x="220" y={40 + i * 35} width="80" height="25" fill="#d1fae5" stroke="#047857" strokeWidth="1.5" rx="3" />
                <text x="260" y={60 + i * 35} textAnchor="middle" fontSize="10" fill="#047857" fontWeight="bold">Answer {i + 1}</text>
              </g>
            ))}

            {/* Connection lines (implied) */}
            <line x1="100" y1="52" x2="220" y2="75" stroke="#10b981" strokeWidth="1.5" opacity="0.4" strokeDasharray="2 2" />
            <line x1="100" y1="87" x2="220" y2="110" stroke="#10b981" strokeWidth="1.5" opacity="0.4" strokeDasharray="2 2" />
          </svg>
        </div>
        <p className="text-xs text-emerald-600 mt-3 text-center italic">Match each item on the left to the correct answer on the right.</p>
      </div>
    );
  };

  const renderFlowDiagram = (desc) => {
    return (
      <div className="mb-8 p-6 bg-sky-50 rounded-lg border-2 border-sky-300">
        <p className="text-sm font-bold text-sky-800 uppercase tracking-wide mb-4">Process Flow Diagram</p>
        <div className="flex justify-center">
          <svg viewBox="0 0 300 280" className="w-full max-w-sm">
            {/* Vertical flow */}
            {[0, 1, 2, 3].map((i) => (
              <g key={`step-${i}`}>
                {/* Box */}
                <rect x="80" y={30 + i * 60} width="140" height="40" fill="#e0f2fe" stroke="#0369a1" strokeWidth="2" rx="4" />
                <text x="150" y={58 + i * 60} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#0369a1">Step {i + 1}</text>

                {/* Arrow to next step */}
                {i < 3 && (
                  <>
                    <line x1="150" y1={70 + i * 60} x2="150" y2={85 + i * 60} stroke="#0284c7" strokeWidth="2.5" markerEnd="url(#arrowSky)" />
                  </>
                )}
              </g>
            ))}

            <defs>
              <marker id="arrowSky" markerWidth="10" markerHeight="10" refX="0" refY="3" orient="auto">
                <polygon points="0 0, 10 3, 0 6" fill="#0284c7" />
              </marker>
            </defs>
          </svg>
        </div>
        <p className="text-xs text-sky-600 mt-3 text-center italic">Flow diagram showing sequential steps in a process (e.g., Haber process, distillation).</p>
      </div>
    );
  };

  const renderPeriodicTableOutline = (desc) => {
    return (
      <div className="mb-8 p-6 bg-purple-50 rounded-lg border-2 border-purple-300">
        <p className="text-sm font-bold text-purple-800 uppercase tracking-wide mb-4">Periodic Table Outline</p>
        <div className="flex justify-center overflow-x-auto">
          <svg viewBox="0 0 340 200" className="w-full max-w-sm">
            {/* Group labels */}
            {[1, 2, 3, 4, 5, 6, 7, 8].map((g) => (
              <text key={`grp${g}`} x={20 + g * 35} y="20" fontSize="9" fill="#6b21a8" fontWeight="bold" textAnchor="middle">Group {g}</text>
            ))}

            {/* Period labels and cells */}
            {[1, 2, 3, 4].map((p) => (
              <g key={`period${p}`}>
                <text x="10" y={55 + p * 40} fontSize="9" fill="#6b21a8" fontWeight="bold">P{p}</text>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((g) => (
                  <rect key={`cell-${p}-${g}`} x={20 + g * 35} y={40 + p * 40} width="32" height="30" fill="#f3e8ff" stroke="#d8b4fe" strokeWidth="1" rx="2" />
                ))}
              </g>
            ))}

            {/* Sample element highlight */}
            <rect x={20 + 1 * 35} y={40 + 2 * 40} width="32" height="30" fill="#e9d5ff" stroke="#a78bfa" strokeWidth="2" rx="2" />
          </svg>
        </div>
        <p className="text-xs text-purple-600 mt-3 text-center italic">Simplified periodic table grid showing groups and periods.</p>
      </div>
    );
  };

  const renderFoodChain = (desc) => {
    return (
      <div className="mb-8 p-6 bg-green-50 rounded-lg border-2 border-green-300">
        <p className="text-sm font-bold text-green-800 uppercase tracking-wide mb-4">Food Chain</p>
        <div className="flex justify-center">
          <svg viewBox="0 0 360 160" className="w-full max-w-sm">
            {/* Producer */}
            <g>
              <circle cx="40" cy="80" r="20" fill="#22c55e" stroke="#16a34a" strokeWidth="2" />
              <text x="40" y="85" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#fff">Plant</text>
            </g>

            {/* Arrow */}
            <line x1="60" y1="80" x2="100" y2="80" stroke="#15803d" strokeWidth="2.5" markerEnd="url(#arrowGreen)" />
            <text x="80" y="70" textAnchor="middle" fontSize="8" fill="#15803d" fontWeight="bold">eats</text>

            {/* Primary consumer */}
            <g>
              <circle cx="130" cy="80" r="20" fill="#84cc16" stroke="#65a30d" strokeWidth="2" />
              <text x="130" y="85" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#fff">Herbivore</text>
            </g>

            {/* Arrow */}
            <line x1="150" y1="80" x2="190" y2="80" stroke="#15803d" strokeWidth="2.5" markerEnd="url(#arrowGreen)" />
            <text x="170" y="70" textAnchor="middle" fontSize="8" fill="#15803d" fontWeight="bold">eats</text>

            {/* Secondary consumer */}
            <g>
              <circle cx="220" cy="80" r="20" fill="#ca8a04" stroke="#92400e" strokeWidth="2" />
              <text x="220" y="85" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#fff">Carnivore</text>
            </g>

            {/* Arrow */}
            <line x1="240" y1="80" x2="280" y2="80" stroke="#15803d" strokeWidth="2.5" markerEnd="url(#arrowGreen)" />
            <text x="260" y="70" textAnchor="middle" fontSize="8" fill="#15803d" fontWeight="bold">eats</text>

            {/* Tertiary consumer */}
            <g>
              <circle cx="310" cy="80" r="20" fill="#dc2626" stroke="#991b1b" strokeWidth="2" />
              <text x="310" y="85" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#fff">Apex</text>
            </g>

            {/* Energy flow label */}
            <text x="180" y="130" textAnchor="middle" fontSize="10" fill="#16a34a" fontWeight="bold">Energy flow →</text>

            <defs>
              <marker id="arrowGreen" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                <polygon points="0 0, 10 3, 0 6" fill="#15803d" />
              </marker>
            </defs>
          </svg>
        </div>
        <p className="text-xs text-green-600 mt-3 text-center italic">Food chain showing energy transfer from producer through consumers.</p>
      </div>
    );
  };

  const renderFlowchart = (desc) => {
    return (
      <div className="mb-8 p-6 bg-blue-50 rounded-lg border-2 border-blue-300">
        <p className="text-sm font-bold text-blue-800 uppercase tracking-wide mb-4">Flowchart / Decision Tree</p>
        <div className="flex justify-center">
          <svg viewBox="0 0 300 280" className="w-full max-w-sm">
            {/* Start/End (rounded) */}
            <rect x="90" y="10" width="120" height="35" fill="#e0e7ff" stroke="#3b82f6" strokeWidth="2" rx="17" />
            <text x="150" y="33" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#3b82f6">Start</text>

            {/* Arrow down */}
            <line x1="150" y1="45" x2="150" y2="65" stroke="#3b82f6" strokeWidth="2" markerEnd="url(#arrowBlue)" />

            {/* Decision diamond (Yes/No) */}
            <polygon points="150,65 190,105 150,145 110,105" fill="#fef3c7" stroke="#f59e0b" strokeWidth="2" />
            <text x="150" y="110" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#b45309">Decision?</text>

            {/* Yes branch (left) */}
            <line x1="110" y1="105" x2="70" y2="105" stroke="#10b981" strokeWidth="2" />
            <text x="85" y="100" fontSize="9" fill="#10b981" fontWeight="bold">Yes</text>
            <rect x="20" y="85" width="70" height="40" fill="#d1fae5" stroke="#10b981" strokeWidth="2" rx="4" />
            <text x="55" y="110" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#047857">Process</text>

            {/* No branch (right) */}
            <line x1="190" y1="105" x2="230" y2="105" stroke="#ef4444" strokeWidth="2" />
            <text x="210" y="100" fontSize="9" fill="#ef4444" fontWeight="bold">No</text>
            <rect x="230" y="85" width="70" height="40" fill="#fee2e2" stroke="#ef4444" strokeWidth="2" rx="4" />
            <text x="265" y="110" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#991b1b">Other Path</text>

            {/* Merge lines down */}
            <line x1="55" y1="125" x2="55" y2="155" stroke="#3b82f6" strokeWidth="2" />
            <line x1="265" y1="125" x2="265" y2="155" stroke="#3b82f6" strokeWidth="2" />
            <line x1="55" y1="155" x2="150" y2="155" stroke="#3b82f6" strokeWidth="2" />
            <line x1="265" y1="155" x2="150" y2="155" stroke="#3b82f6" strokeWidth="2" />
            <line x1="150" y1="155" x2="150" y2="175" stroke="#3b82f6" strokeWidth="2" markerEnd="url(#arrowBlue)" />

            {/* Result */}
            <rect x="100" y="175" width="100" height="35" fill="#e0e7ff" stroke="#3b82f6" strokeWidth="2" rx="4" />
            <text x="150" y="198" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#3b82f6">Result</text>

            <defs>
              <marker id="arrowBlue" markerWidth="10" markerHeight="10" refX="0" refY="3" orient="auto">
                <polygon points="0 0, 10 3, 0 6" fill="#3b82f6" />
              </marker>
            </defs>
          </svg>
        </div>
        <p className="text-xs text-blue-600 mt-3 text-center italic">Flowchart with decision nodes and process steps (dichotomous key, classification).</p>
      </div>
    );
  };

  const renderPedigreeChart = (desc) => {
    return (
      <div className="mb-8 p-6 bg-fuchsia-50 rounded-lg border-2 border-fuchsia-300">
        <p className="text-sm font-bold text-fuchsia-800 uppercase tracking-wide mb-4">Pedigree Chart (Genetics)</p>
        <div className="flex justify-center">
          <svg viewBox="0 0 320 240" className="w-full max-w-sm">
            {/* Generation I (Parents) */}
            {/* Father - square, unaffected */}
            <rect x="50" y="40" width="25" height="25" fill="#fff" stroke="#a855f7" strokeWidth="2" />
            <text x="63" y="57" textAnchor="middle" fontSize="8" fill="#6b21a8" fontWeight="bold">Male</text>

            {/* Mother - circle, unaffected */}
            <circle cx="170" cy="52" r="12.5" fill="#fff" stroke="#a855f7" strokeWidth="2" />
            <text x="170" y="70" textAnchor="middle" fontSize="8" fill="#6b21a8" fontWeight="bold">Female</text>

            {/* Marriage line */}
            <line x1="75" y1="40" x2="145" y2="40" stroke="#a855f7" strokeWidth="2" />

            {/* Vertical line down from marriage */}
            <line x1="110" y1="40" x2="110" y2="80" stroke="#a855f7" strokeWidth="2" />

            {/* Generation II (Children) */}
            {/* Child 1 - square, affected (filled) */}
            <rect x="60" y="100" width="25" height="25" fill="#a855f7" stroke="#6b21a8" strokeWidth="2" />
            <text x="73" y="130" textAnchor="middle" fontSize="8" fill="#6b21a8" fontWeight="bold">Child 1</text>

            {/* Child 2 - circle, unaffected */}
            <circle cx="155" cy="112" r="12.5" fill="#fff" stroke="#a855f7" strokeWidth="2" />
            <text x="155" y="140" textAnchor="middle" fontSize="8" fill="#6b21a8" fontWeight="bold">Child 2</text>

            {/* Horizontal sibling line */}
            <line x1="73" y1="100" x2="143" y2="100" stroke="#a855f7" strokeWidth="2" />
            <line x1="73" y1="100" x2="73" y2="100" stroke="#a855f7" strokeWidth="2" />
            <line x1="143" y1="100" x2="143" y2="100" stroke="#a855f7" strokeWidth="2" />

            {/* Legend */}
            <text x="20" y="200" fontSize="9" fill="#6b21a8" fontWeight="bold">Legend:</text>
            <rect x="20" y="210" width="15" height="15" fill="#fff" stroke="#a855f7" strokeWidth="1.5" />
            <text x="40" y="222" fontSize="8" fill="#6b21a8">Unaffected male</text>

            <circle cx="27" cy="250" r="7.5" fill="#fff" stroke="#a855f7" strokeWidth="1.5" />
            <text x="40" y="255" fontSize="8" fill="#6b21a8">Unaffected female</text>
          </svg>
        </div>
        <p className="text-xs text-fuchsia-600 mt-3 text-center italic">Pedigree chart showing inheritance patterns across generations. Filled shapes = affected, empty = unaffected.</p>
      </div>
    );
  };

  const renderPetriDish = (desc) => {
    const hasZones = /zone|inhibition|clear/i.test(desc);

    return (
      <div className="mb-8 p-6 bg-lime-50 rounded-lg border-2 border-lime-300">
        <p className="text-sm font-bold text-lime-800 uppercase tracking-wide mb-4">Petri Dish / Agar Plate</p>
        <div className="flex justify-center">
          <svg viewBox="0 0 280 280" className="w-full max-w-xs">
            {/* Dish outline (circle) */}
            <circle cx="140" cy="140" r="110" fill="#fafaf0" stroke="#65a30d" strokeWidth="2.5" />

            {/* Agar surface */}
            <circle cx="140" cy="140" r="105" fill="#f4e4c1" stroke="#84cc16" strokeWidth="1.5" opacity="0.8" />

            {/* Bacterial colonies (small circles) */}
            <circle cx="90" cy="100" r="8" fill="#ef4444" opacity="0.7" />
            <circle cx="130" cy="80" r="7" fill="#f97316" opacity="0.7" />
            <circle cx="180" cy="110" r="6" fill="#eab308" opacity="0.7" />
            <circle cx="160" cy="170" r="8" fill="#84cc16" opacity="0.7" />
            <circle cx="100" cy="180" r="7" fill="#10b981" opacity="0.7" />

            {hasZones && (
              <>
                {/* Antibiotic disc in center */}
                <circle cx="140" cy="140" r="8" fill="#e5e7eb" stroke="#6b7280" strokeWidth="1" />
                <text x="140" y="145" textAnchor="middle" fontSize="7" fill="#374151" fontWeight="bold">Disc</text>

                {/* Zone of inhibition (clear zone around disc) */}
                <circle cx="140" cy="140" r="30" fill="none" stroke="#fbbf24" strokeWidth="2" strokeDasharray="3 2" />
                <text x="180" y="150" fontSize="9" fill="#b45309" fontWeight="bold">Zone</text>
              </>
            )}

            {/* Dish label */}
            <text x="140" y="260" textAnchor="middle" fontSize="10" fill="#65a30d" fontWeight="bold">Petri Dish</text>
          </svg>
        </div>
        <p className="text-xs text-lime-600 mt-3 text-center italic">{hasZones ? "Petri dish showing bacterial colonies and zone of inhibition around antibiotic disc." : "Petri dish with bacterial/fungal colonies on agar plate."}</p>
      </div>
    );
  };

  const renderMicroscope = (desc) => {
    return (
      <div className="mb-8 p-6 bg-slate-50 rounded-lg border-2 border-slate-300">
        <p className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-4">Microscope Diagram</p>
        <div className="flex justify-center">
          <svg viewBox="0 0 180 300" className="w-full max-w-xs">
            {/* Eyepiece (top) */}
            <ellipse cx="90" cy="30" rx="20" ry="12" fill="#e5e7eb" stroke="#4b5563" strokeWidth="2" />
            <text x="90" y="35" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#1f2937">Eyepiece</text>

            {/* Tube (long cylinder) */}
            <rect x="75" y="40" width="30" height="120" fill="#d1d5db" stroke="#4b5563" strokeWidth="2" rx="3" />

            {/* Objective turret */}
            <circle cx="90" cy="165" r="15" fill="#c084fc" stroke="#6b21a8" strokeWidth="2" />
            <text x="90" y="170" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#fff">Objective</text>

            {/* Stage (where slide goes) */}
            <rect x="50" y="185" width="80" height="50" fill="#9ca3af" stroke="#4b5563" strokeWidth="2" rx="3" />
            <rect x="60" y="200" width="60" height="20" fill="#f3f4f6" stroke="#6b7280" strokeWidth="1" />
            <text x="90" y="213" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#4b5563">Slide</text>

            {/* Mirror/light source */}
            <ellipse cx="90" cy="255" rx="30" ry="12" fill="#fbbf24" stroke="#b45309" strokeWidth="2" />
            <text x="90" y="260" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#92400e">Mirror/Light</text>

            {/* Focus knobs (left side) */}
            <circle cx="55" cy="120" r="6" fill="#6b7280" stroke="#374151" strokeWidth="1.5" />
            <circle cx="55" cy="150" r="6" fill="#6b7280" stroke="#374151" strokeWidth="1.5" />
            <text x="35" y="125" fontSize="7" fill="#4b5563" fontWeight="bold">Fine</text>
            <text x="32" y="155" fontSize="7" fill="#4b5563" fontWeight="bold">Coarse</text>

            {/* Arm (support structure) */}
            <path d="M 60 100 Q 20 150 40 240" fill="none" stroke="#9ca3af" strokeWidth="8" />

            {/* Base */}
            <ellipse cx="90" cy="290" rx="50" ry="12" fill="#4b5563" stroke="#1f2937" strokeWidth="2" />
          </svg>
        </div>
        <p className="text-xs text-slate-600 mt-3 text-center italic">Microscope diagram showing key parts: eyepiece, objective, stage, focus knobs, and light source.</p>
      </div>
    );
  };

  const renderCoordinateGrid = (desc) => {
    return (
      <div className="mb-8 p-6 bg-blue-50 rounded-lg border-2 border-blue-300">
        <p className="text-sm font-bold text-blue-800 uppercase tracking-wide mb-4">Coordinate Grid / Axes</p>
        <div className="flex justify-center">
          <svg viewBox="0 0 280 280" className="w-full max-w-xs">
            {/* Grid background */}
            {[...Array(9)].map((_, i) => (
              <line key={`vgrid${i}`} x1={30 + i * 30} y1="30" x2={30 + i * 30} y2="250" stroke="#dbeafe" strokeWidth="1" />
            ))}
            {[...Array(8)].map((_, i) => (
              <line key={`hgrid${i}`} x1="30" y1={30 + i * 30} x2="270" y2={30 + i * 30} stroke="#dbeafe" strokeWidth="1" />
            ))}

            {/* X-axis */}
            <line x1="30" y1="150" x2="270" y2="150" stroke="#1e40af" strokeWidth="2.5" />

            {/* Y-axis */}
            <line x1="150" y1="30" x2="150" y2="250" stroke="#1e40af" strokeWidth="2.5" />

            {/* Axis arrows */}
            <polygon points="270,150 260,145 260,155" fill="#1e40af" />
            <polygon points="150,30 145,40 155,40" fill="#1e40af" />

            {/* Axis labels */}
            <text x="265" y="165" fontSize="10" fontWeight="bold" fill="#1e40af">x</text>
            <text x="130" y="25" fontSize="10" fontWeight="bold" fill="#1e40af">y</text>

            {/* Origin */}
            <circle cx="150" cy="150" r="3" fill="#1e40af" />
            <text x="145" y="168" fontSize="9" fill="#1e40af" fontWeight="bold">O</text>

            {/* Scale numbers */}
            {[1, 2, 3, 4].map((i) => (
              <g key={`scale${i}`}>
                <text x={150 + i * 30} y="170" textAnchor="middle" fontSize="8" fill="#3b82f6">{i}</text>
                <text x={150 - i * 30} y="170" textAnchor="middle" fontSize="8" fill="#3b82f6">{-i}</text>
                <text x="135" y={150 - i * 30 + 3} textAnchor="middle" fontSize="8" fill="#3b82f6">{i}</text>
                <text x="135" y={150 + i * 30 + 3} textAnchor="middle" fontSize="8" fill="#3b82f6">{-i}</text>
              </g>
            ))}

            {/* Sample point */}
            <circle cx="210" cy="90" r="2.5" fill="#dc2626" />
            <text x="220" y="95" fontSize="9" fill="#dc2626" fontWeight="bold">(2, 3)</text>
          </svg>
        </div>
        <p className="text-xs text-blue-600 mt-3 text-center italic">Coordinate grid with x and y axes for plotting points, transformations, and graphs.</p>
      </div>
    );
  };

  // ── RENDER DIAGRAM / TABLE / FIGURE ────────────────────────────────────────────
  const renderDiagram = () => {
    if (!currentQuestion) return null;

    // ── SMART DIAGRAM INHERITANCE GATE ─────────────────────────────────────────
    // Sub-questions should only inherit a parent diagram if they explicitly
    // reference it (e.g. "Use Figure 4", "the circuit", "the apparatus").
    // Otherwise sub-questions about different topics (e.g. latent heat under a
    // circuit parent) get an irrelevant diagram. This replaces the old
    // "pure calc" check which was too narrow.
    const _qNum = currentQuestion.question_number || "";
    const _parentNum = _qNum.split(".")[0];
    const _isSubQ = _parentNum && _qNum.includes(".");

    if (_isSubQ) {
      const _parentQ = questions.find((q) => q.question_number === _parentNum);
      const _isInherited =
        !currentQuestion.diagram_asset_url &&
        !currentQuestion.diagram_description &&
        (_parentQ?.diagram_asset_url || _parentQ?.diagram_description);

      if (_isInherited) {
        // Only show inherited diagram if this sub-question explicitly references
        // a figure, diagram, graph, table, circuit, or apparatus
        const _qText = (currentQuestion.question_text || "");
        const _referencesDiagram =
          /\b(?:figure\s+\d|diagram|graph|circuit|apparatus|image|drawing|sketch|table\s+\d|the\s+(?:equipment|setup|arrangement|resistor|lamp|battery))\b/i.test(_qText);

        if (!_referencesDiagram) {
          return null;
        }
      }
    }

    // ── HIDE LABELS DETECTION ────────────────────────────────────────────────
    // If this question (or its parent) uses diagram_label input type, the SVG
    // renderers must NOT show text labels (they reveal the answers). Instead
    // they show numbered circle markers that correspond to the answer fields.
    const _parentStem = _isSubQ
      ? questions.find((q) => q.question_number === _parentNum)
      : null;
    const _hideLabels =
      currentQuestion.answer_input_type === "diagram_label" ||
      (_parentStem?.answer_input_type === "diagram_label" &&
        currentQuestion.answer_input_type === "diagram_label");

    let hasImageUrl = currentQuestion.diagram_asset_url;
    let hasDescription = currentQuestion.diagram_description;

    // ── DIAGRAM INHERITANCE ──────────────────────────────────────
    // If this sub-question (e.g. 04.1) has no diagram, check if the parent
    // question group (04) or any sibling shares one. Also check if the
    // question_text references a figure/table that a sibling has.
    if (!hasImageUrl && !hasDescription) {
      const qNum = currentQuestion.question_number || "";
      const parentNum = qNum.split(".")[0]; // e.g. "04"

      if (parentNum && qNum.includes(".")) {
        // Look for diagram on the parent stem question (e.g. question_number === "04")
        const parentQ = questions.find(
          (q) => q.question_number === parentNum
        );
        if (parentQ) {
          hasImageUrl = parentQ.diagram_asset_url || hasImageUrl;
          hasDescription = parentQ.diagram_description || hasDescription;
        }

        // Still nothing? Check if question_text references a figure/table and a
        // sibling owns it
        if (!hasImageUrl && !hasDescription) {
          const figRef = currentQuestion.question_text?.match(
            /(?:figure|table|graph|diagram|chart)\s+(\d+)/i
          );
          if (figRef) {
            const figLabel = figRef[0].toLowerCase(); // e.g. "figure 7"
            const sibWithDiagram = questions.find(
              (q) =>
                q.question_number?.startsWith(parentNum) &&
                q.id !== currentQuestion.id &&
                (q.diagram_description || q.diagram_asset_url) &&
                (q.diagram_description || "").toLowerCase().includes(figLabel)
            );
            if (sibWithDiagram) {
              hasImageUrl = sibWithDiagram.diagram_asset_url || hasImageUrl;
              hasDescription = sibWithDiagram.diagram_description || hasDescription;
            }
          }
        }

        // Last resort: grab any diagram from the parent group
        if (!hasImageUrl && !hasDescription) {
          const anySibWithDiagram = questions.find(
            (q) =>
              q.question_number?.startsWith(parentNum) &&
              q.id !== currentQuestion.id &&
              (q.diagram_description || q.diagram_asset_url)
          );
          if (anySibWithDiagram) {
            hasImageUrl = anySibWithDiagram.diagram_asset_url || hasImageUrl;
            hasDescription = anySibWithDiagram.diagram_description || hasDescription;
          }
        }
      }
    }

    // ── TABLE REFERENCE IN QUESTION TEXT (no diagram_description) ──────────
    // Questions like Q05.4 reference "Table 1" with data but have no diagram.
    // Detect "Table X" in question_text and render contextual data tables.
    if (!hasImageUrl && !hasDescription) {
      const qText = currentQuestion.question_text || "";
      const tableRef = qText.match(/\bTable\s+(\d+)\b/i);
      if (tableRef) {
        return renderInlineDataTable(tableRef[0], tableRef[1], qText);
      }
      return null;
    }

    // If we have an actual image URL, render it
    if (hasImageUrl) {
      return (
        <div className="mb-8">
          <img
            src={hasImageUrl}
            alt={hasDescription || "Exam diagram"}
            className="max-w-full mx-auto rounded-lg border border-slate-200 shadow-sm"
            style={{ maxHeight: "400px", objectFit: "contain" }}
          />
          {hasDescription && (
            <p className="text-sm text-slate-500 text-center mt-2 italic">
              {hasDescription}
            </p>
          )}
        </div>
      );
    }

    // No image URL — try to render structured visual from description
    const desc = hasDescription || "";
    const descLower = desc.toLowerCase();

    // ── SMART VISUAL MATCHING (most specific first) ──────────────────────────

    // 1. Punnett square
    if (/punnett/i.test(descLower)) {
      return renderPunnettSquare(desc);
    }

    // 2. Number line
    if (/number\s*line/i.test(descLower)) {
      return renderNumberLine(desc);
    }

    // 3. Dot and cross diagram (chemistry bonding)
    if (/dot\s+and\s+cross/i.test(descLower)) {
      return renderDotAndCross(desc);
    }

    // 4. Evolutionary tree (biology)
    if (/evolutionary\s+tree/i.test(descLower)) {
      return renderEvolutionaryTree(desc);
    }

    // 4b. Classification table (taxonomy)
    if (/classif/i.test(descLower) && /table/i.test(descLower)) {
      return renderClassificationTable(desc);
    }

    // 4c. Anatomy diagrams (endocrine, heart, breathing, digestive)
    if (/endocrine|gland|heart|chamber|ventricle|atri|breathing|respiratory|lung|diaphragm|trachea|digestive|stomach|intestine|oesophagus|gullet/i.test(descLower)) {
      return renderAnatomyDiagram(desc, _hideLabels);
    }

    // 5. Frequency tree / probability tree / tree diagram
    if (/frequency\s+tree|tree\s+diagram|probability\s+tree/i.test(descLower)) {
      return renderFrequencyTree(desc);
    }

    // 6. Quadrat
    if (/quadrat/i.test(descLower)) {
      return renderQuadratDiagram(desc);
    }

    // 7. Box with options (word bank)
    if (/box\s+with\s+options/i.test(descLower)) {
      return renderOptionBox(desc);
    }

    // 8. Bar chart
    if (/bar\s*chart/i.test(descLower)) {
      return renderBarChart(desc);
    }

    // 9. Graph grid (for plotting)
    if (/graph\s+grid|grid\s+for\s+plotting/i.test(descLower)) {
      return renderGraphGrid(desc);
    }

    // 10. Circuit diagram
    if (/circuit/i.test(descLower)) {
      return renderCircuitDiagram(desc, _hideLabels);
    }

    // 11. Geometry shapes
    if (/triangle|rectangle|prism|hexagon|quadrilateral|pentagon|cuboid|cube|cylinder|hemisphere|cone|sphere|parallelogram|trapezium|rhombus|polygon|square|circle|kite/i.test(descLower) ||
        (/grid/i.test(descLower) && /draw|shape|side|diagonal/i.test(descLower))) {
      return renderGeometryDiagram(desc);
    }

    // 12. Two-way table (has row/column structure in description)
    if (/(?:rows?\s+for|columns?\s+for)/i.test(descLower) && /(?:table|rows?|columns?)/i.test(descLower)) {
      const twoWay = renderTwoWayTable(desc);
      if (twoWay) return twoWay;
    }

    // 13. [REMOVED — old text-only graph card replaced by renderLineGraph below]

    // 14. Table descriptions — try to reconstruct from context
    if (/table\s+(showing|of|with|\d)/i.test(descLower) || /data\s+table|results\s+table|cumulative\s+frequency\s+table/i.test(descLower)) {
      return renderTableFromContext(desc);
    }

    // 15. Apparatus / experimental setup — with SVG diagrams for common experiments
    if (/apparatus|experimental\s+setup|equipment|(?:^|\W)(?:burette|gas\s+syringe|measuring\s+cylinder|boiling\s+tube|evaporating\s+dish|conical\s+flask|round.?bottom\s+flask|bunsen\s+burner)(?:\W|$)/i.test(descLower) ||
        (/(?:power\s+supply|joulemeter).*(?:heater|block|thermometer)/i.test(descLower)) ||
        (/(?:stop.?clock|stopwatch).*(?:joule|heater|block|power)/i.test(descLower))) {
      const equipment = [];
      const eqPatterns = [
        /flask/i, /beaker/i, /thermometer/i, /condenser/i, /burette/i, /syringe/i,
        /stopper/i, /tube/i, /measuring\s+cylinder/i, /bunsen/i, /tripod/i, /clamp/i,
        /joulemeter/i, /power\s+supply/i, /heater/i, /stop.?clock/i
      ];
      eqPatterns.forEach(p => { if (p.test(desc)) equipment.push(desc.match(p)[0]); });

      // Detect experiment type for SVG
      const isHeatingExp = /(?:heater|heating|block|joulemeter).*(?:thermometer|temperature)/i.test(descLower) ||
        /(?:power\s+supply).*(?:heater|block)/i.test(descLower) ||
        /(?:iron|metal|aluminium)\s+block/i.test(descLower);
      const isDistillation = /distill|condenser.*flask|flask.*condenser/i.test(descLower);
      const isTitration = /burette.*(?:flask|stand)|titrat/i.test(descLower);

      let apparatusSvg = null;

      // Helper: numbered circle marker for hideLabels mode
      const _marker = (cx, cy, num) => (
        <g key={`m${num}`}>
          <circle cx={cx} cy={cy} r="9" fill="#1e40af" stroke="#fff" strokeWidth="1.5" />
          <text x={cx} y={cy + 3.5} textAnchor="middle" fontSize="8" fontWeight="bold" fill="#fff">{num}</text>
        </g>
      );

      if (isHeatingExp) {
        apparatusSvg = (
          <svg viewBox="0 0 400 200" className="w-full max-w-sm">
            {/* Power supply */}
            <rect x="15" y="70" width="55" height="45" fill="#e0e7ff" stroke="#4338ca" strokeWidth="2" rx="4" />
            {_hideLabels ? _marker(42, 92, 1) : (<><text x="42" y="90" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#4338ca">Power</text><text x="42" y="102" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#4338ca">Supply</text></>)}
            {/* Wires */}
            <line x1="70" y1="82" x2="100" y2="82" stroke="#dc2626" strokeWidth="2" />
            <line x1="70" y1="102" x2="100" y2="102" stroke="#1e40af" strokeWidth="2" />
            {/* Joulemeter */}
            <rect x="100" y="72" width="40" height="38" fill="#dbeafe" stroke="#0284c7" strokeWidth="2" rx="3" />
            {_hideLabels ? _marker(120, 92, 2) : (<><text x="120" y="88" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#0284c7">Joule-</text><text x="120" y="100" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#0284c7">meter</text></>)}
            {/* Wires to block */}
            <line x1="140" y1="92" x2="165" y2="92" stroke="#dc2626" strokeWidth="2" />
            {/* Metal block with heater hole */}
            <rect x="165" y="62" width="70" height="60" fill="#d4d4d8" stroke="#52525b" strokeWidth="2" rx="4" />
            {_hideLabels ? _marker(200, 68, 3) : <text x="200" y="98" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#3f3f46">Metal Block</text>}
            {/* Heater inside block */}
            <rect x="175" y="78" width="50" height="12" fill="#fbbf24" stroke="#b45309" strokeWidth="1.5" rx="2" />
            {_hideLabels ? _marker(200, 114, 4) : <text x="200" y="88" textAnchor="middle" fontSize="6" fontWeight="bold" fill="#92400e">Heater</text>}
            {/* Thermometer in block */}
            <line x1="220" y1="40" x2="220" y2="65" stroke="#6b7280" strokeWidth="3" strokeLinecap="round" />
            <circle cx="220" cy="65" r="4" fill="#ef4444" stroke="#b91c1c" strokeWidth="1" />
            {_hideLabels ? _marker(245, 44, 5) : <text x="240" y="48" fontSize="7" fill="#6b7280" fontWeight="bold">Thermometer</text>}
            {/* Stopclock */}
            <circle cx="310" cy="92" r="25" fill="#f8fafc" stroke="#334155" strokeWidth="2" />
            <rect x="306" y="63" width="8" height="8" rx="2" fill="#64748b" stroke="#334155" strokeWidth="1" />
            <line x1="310" y1="92" x2="310" y2="76" stroke="#1e293b" strokeWidth="1.5" />
            <line x1="310" y1="92" x2="322" y2="85" stroke="#dc2626" strokeWidth="1" />
            <circle cx="310" cy="92" r="2" fill="#1e293b" />
            {_hideLabels ? _marker(310, 128, 6) : <text x="310" y="130" textAnchor="middle" fontSize="8" fill="#334155" fontWeight="bold">Stopclock</text>}
            {/* Insulation */}
            <rect x="160" y="125" width="80" height="10" fill="#fef3c7" stroke="#d97706" strokeWidth="1" rx="2" />
            {!_hideLabels && <text x="200" y="150" textAnchor="middle" fontSize="7" fill="#92400e">Insulation (optional)</text>}
          </svg>
        );
      } else if (isDistillation) {
        apparatusSvg = (
          <svg viewBox="0 0 360 220" className="w-full max-w-sm">
            {/* Round bottom flask */}
            <circle cx="80" cy="140" r="35" fill="#fce7f3" stroke="#ec4899" strokeWidth="2" />
            <line x1="80" y1="105" x2="80" y2="80" stroke="#ec4899" strokeWidth="2" />
            {_hideLabels ? _marker(80, 140, 1) : <text x="80" y="145" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#be185d">Flask</text>}
            {/* Bunsen burner */}
            <rect x="65" y="180" width="30" height="15" fill="#f97316" stroke="#c2410c" strokeWidth="1.5" rx="2" />
            <path d="M75 180 Q80 168 85 180" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1" />
            {_hideLabels ? _marker(80, 206, 2) : <text x="80" y="208" textAnchor="middle" fontSize="7" fill="#c2410c">Bunsen</text>}
            {/* Side arm to condenser */}
            <line x1="115" y1="120" x2="155" y2="80" stroke="#6b7280" strokeWidth="3" />
            {/* Condenser tube */}
            <rect x="155" y="55" width="80" height="16" fill="#e0f2fe" stroke="#0369a1" strokeWidth="2" rx="3" transform="rotate(25 195 63)" />
            {_hideLabels ? _marker(195, 48, 3) : <text x="195" y="50" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#0369a1">Condenser</text>}
            {/* Water in/out arrows */}
            {!_hideLabels && <text x="160" y="95" fontSize="6" fill="#0369a1">Water in</text>}
            {!_hideLabels && <text x="220" y="42" fontSize="6" fill="#0369a1">Water out</text>}
            {/* Collection flask */}
            <ellipse cx="280" cy="140" rx="25" ry="20" fill="#ecfdf5" stroke="#059669" strokeWidth="2" />
            {_hideLabels ? _marker(280, 140, 4) : <text x="280" y="145" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#059669">Collect</text>}
            {/* Thermometer at top */}
            <line x1="80" y1="80" x2="80" y2="50" stroke="#6b7280" strokeWidth="2.5" />
            <circle cx="80" cy="80" r="3" fill="#ef4444" />
            {_hideLabels ? _marker(62, 48, 5) : <text x="65" y="45" fontSize="7" fill="#6b7280" fontWeight="bold">Therm.</text>}
          </svg>
        );
      } else if (isTitration) {
        apparatusSvg = (
          <svg viewBox="0 0 300 240" className="w-full max-w-xs">
            {/* Clamp stand */}
            <rect x="40" y="220" width="80" height="8" fill="#9ca3af" stroke="#4b5563" strokeWidth="1.5" rx="1" />
            <line x1="80" y1="220" x2="80" y2="20" stroke="#4b5563" strokeWidth="4" />
            {/* Clamp arm */}
            <line x1="80" y1="35" x2="130" y2="35" stroke="#6b7280" strokeWidth="3" />
            {/* Burette */}
            <rect x="125" y="30" width="12" height="120" fill="#fef3c7" stroke="#b45309" strokeWidth="1.5" rx="1" />
            {_hideLabels ? _marker(155, 85, 1) : <text x="131" y="95" textAnchor="middle" fontSize="6" fontWeight="bold" fill="#92400e" transform="rotate(-90 131 95)">Burette</text>}
            {/* Tap at bottom */}
            <rect x="128" y="148" width="6" height="8" fill="#64748b" stroke="#374151" strokeWidth="1" />
            {/* Drip */}
            <line x1="131" y1="156" x2="131" y2="168" stroke="#3b82f6" strokeWidth="1" strokeDasharray="2 2" />
            {/* Conical flask */}
            <polygon points="100,220 131,170 162,220" fill="#ede9fe" stroke="#7c3aed" strokeWidth="2" />
            <line x1="115" y1="170" x2="147" y2="170" stroke="#7c3aed" strokeWidth="2" />
            {_hideLabels ? _marker(131, 200, 2) : <text x="131" y="205" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#7c3aed">Flask</text>}
            {/* Scale markings on burette */}
            {[0, 1, 2, 3, 4].map((i) => (
              <g key={`bs${i}`}>
                <line x1="138" y1={40 + i * 25} x2="145" y2={40 + i * 25} stroke="#92400e" strokeWidth="1" />
                <text x="150" y={43 + i * 25} fontSize="6" fill="#92400e">{i * 10}</text>
              </g>
            ))}
            {/* White tile */}
            <rect x="105" y="220" width="52" height="6" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1" />
            {_hideLabels ? _marker(131, 234, 3) : <text x="131" y="238" textAnchor="middle" fontSize="6" fill="#64748b">White tile</text>}
            {/* Clamp stand label */}
            {_hideLabels && _marker(80, 15, 4)}
          </svg>
        );
      }

      return (
        <div className="mb-8 p-5 bg-teal-50 rounded-lg border-2 border-teal-300">
          <div className="flex items-center gap-2 mb-3">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-teal-700">
              <path d="M7 2h6v6l3 8H4l3-8V2z" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round" />
              <line x1="6" y1="2" x2="14" y2="2" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            <p className="text-sm font-bold text-teal-800 uppercase tracking-wide">Apparatus Setup</p>
          </div>
          {apparatusSvg && (
            <div className="mb-4 flex justify-center">{apparatusSvg}</div>
          )}
          <p className="text-teal-900 text-sm leading-relaxed">{desc}</p>
          {equipment.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {equipment.map((eq, i) => (
                <span key={i} className="px-3 py-1 bg-teal-100 text-teal-800 text-xs font-semibold rounded-full border border-teal-300">
                  {eq}
                </span>
              ))}
            </div>
          )}
        </div>
      );
    }

    // 16. Structural / displayed formulae
    if (/structural\s+formula|displayed\s+formula/i.test(descLower)) {
      const compound = desc.match(/(?:of|for)\s+(.+?)(?:\s+with|\s+and|\.|$)/i)?.[1] || "the compound";
      return (
        <div className="mb-8 p-5 bg-orange-50 rounded-lg border-2 border-orange-300">
          <div className="flex items-center gap-2 mb-3">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-orange-700">
              <circle cx="6" cy="10" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
              <circle cx="14" cy="10" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
              <line x1="9" y1="10" x2="11" y2="10" stroke="currentColor" strokeWidth="2" />
            </svg>
            <p className="text-sm font-bold text-orange-800 uppercase tracking-wide">Structural Formula</p>
          </div>
          <p className="text-orange-900 text-base leading-relaxed">
            The displayed structural formula of <strong>{compound}</strong> is shown in the original exam paper.
          </p>
          <p className="text-xs text-orange-600 mt-3 italic">
            Use the structural formula to answer this question. Show bonds between atoms clearly.
          </p>
        </div>
      );
    }

    // 17. Figure reference — suppress if only a bare reference, else show subtle notice
    if (/figure\s+\d/i.test(descLower)) {
      // If description is ONLY a figure reference with minimal text (e.g., "Figure 1." or "Figure 1: A diagram"),
      // and no useful structural detail, suppress it entirely
      const strippedDesc = desc.replace(/figure\s+\d+[:.]?\s*/i, '').trim();
      if (strippedDesc.length < 15 || !strippedDesc) {
        // Bare figure reference with no substantive description — don't show anything
        return null;
      }

      // If we reach here, there IS meaningful description alongside the figure reference
      // Render a subtle inline notice rather than a prominent card
      const figNum = desc.match(/figure\s+(\d+)/i)?.[0] || "Figure";
      return (
        <div className="mb-6 p-3 bg-slate-100 rounded border border-slate-300">
          <p className="text-xs text-slate-600 italic">
            [{figNum} — referenced in original exam paper] {strippedDesc}
          </p>
        </div>
      );
    }

    // 18. [REMOVED — duplicate classification table, already handled by matcher 4b]

    // 19. Motion graphs (velocity-time, distance-time) — MORE SPECIFIC, fires before generic line graph
    if (/(?:velocity|speed|distance)\s*[-–]\s*time|acceleration|motion\s+graph|graph\s+showing\s+(?:speed|distance|velocity)/i.test(descLower)) {
      return renderMotionGraph(desc);
    }

    // 20. Line graph / generic graph — catches "graph showing", "line graph", "plot on graph"
    if (/line\s+graph|plot\s+on\s+graph|graph\s+with\s+axes|axes.*x.*y|graph\s+showing/i.test(descLower)) {
      return renderLineGraph(desc);
    }

    // 21. Physics energy diagrams (Sankey, energy transfer)
    if (/energy\s+(?:transfer|diagram|flow|diagram)|sankey|efficiency|percentage.*energy|useful.*wasted/i.test(descLower)) {
      return renderPhysicsEnergyDiagram(desc);
    }

    // 22. Wave diagrams (EM spectrum, sine wave)
    if (/wave|frequency|wavelength|amplitude|spectrum|oscillat|hertz|hz/i.test(descLower)) {
      return renderPhysicsWaveDiagram(desc);
    }

    // 23. Cell diagrams (plant/animal)
    if (/cell\s+(?:diagram|structure)|plant\s+cell|animal\s+cell|nucleus|mitochondria|chloroplast|vacuole/i.test(descLower)) {
      return renderCellDiagram(desc);
    }

    // 24. Physics force diagrams (free body)
    if (/force\s+(?:diagram|vector)|free\s+body|forces\s+acting|normal\s+force|applied\s+force|friction/i.test(descLower)) {
      return renderPhysicsForceDiagram(desc);
    }

    // 25. Atomic models (Bohr, decay chains)
    if (/atom|atomic\s+(?:model|structure)|nucleus|electron\s+shell|decay|alpha|beta|emission/i.test(descLower)) {
      return renderAtomicModel(desc);
    }

    // 26. Space diagrams (orbits, galaxy, lifecycle)
    if (/orbit|satellite|planet|galaxy|star|space|eclipse|moon|comet|asteroid|red\s+(?:giant|shift)|lifecycle/i.test(descLower)) {
      return renderPhysicsSpaceDiagram(desc);
    }

    // 27. Statistical diagrams (box plot, pie chart, scatter)
    if (/box\s+plot|quartile|median|interquartile|pie\s+chart|scatter|bar\s+graph|data\s+representation/i.test(descLower)) {
      return renderStatsDiagram(desc);
    }

    // 28. Chemistry structures (chromatography, electrolysis, molecular)
    if (/chromatography|rf\s+value|solvent\s+front|electrolysis|electrode|anode|cathode|molecular\s+structure|molecule|amino\s+acid|ionic\s+(?:structure|bonding|lattice|compound)|metallic\s+bonding|giant\s+(?:covalent|ionic)|polymer\s+structure/i.test(descLower)) {
      return renderChemistryStructure(desc);
    }

    // 29. Physics scenario illustrations (old scenes - updated)
    if (/trampoline|spring(?!\s+equation)/i.test(descLower)) {
      return renderPhysicsScene('trampoline', desc, _hideLabels);
    }
    if (/stair|running\s+up|height\s+indicat/i.test(descLower)) {
      return renderPhysicsScene('stairs', desc, _hideLabels);
    }
    if (/stop.?clock|stopwatch/i.test(descLower) && !/power\s+supply|joulemeter|heater|apparatus|setup|method|thermometer.*block/i.test(descLower)) {
      return renderPhysicsScene('stopclocks', desc, _hideLabels);
    }
    if (/plastic\s+rod|rubbed|static|charged|cloth/i.test(descLower)) {
      return renderPhysicsScene('static', desc, _hideLabels);
    }
    if (/pulley|lever|pivot|fulcrum/i.test(descLower)) {
      return renderPhysicsScene('lever', desc, _hideLabels);
    }
    if (/magnet|magnetic\s+field|iron\s+filing/i.test(descLower)) {
      return renderPhysicsScene('magnet', desc, _hideLabels);
    }
    if (/ray|mirror|reflect|refract|lens|prism/i.test(descLower)) {
      return renderPhysicsScene('optics', desc, _hideLabels);
    }
    if (/pendulum|oscillat(?!ing\s+wave)/i.test(descLower)) {
      return renderPhysicsScene('pendulum', desc, _hideLabels);
    }
    if (/radioactive|source|absorber|detector|radiation/i.test(descLower)) {
      return renderPhysicsScene('radioactive', desc, _hideLabels);
    }
    if (/national\s+grid|transmission\s+(?:cable|line)|power\s+station.*(?:transformer|consumer)|step.?up.*step.?down/i.test(descLower)) {
      return renderPhysicsScene('national_grid', desc, _hideLabels);
    }
    if (/transformer|coil|primary|secondary/i.test(descLower) && !/national\s+grid|transmission/i.test(descLower)) {
      return renderPhysicsScene('transformer', desc, _hideLabels);
    }
    if (/motor|wire\s+in\s+(?:field|magnet)|current\s+carrying|force\s+on\s+wire/i.test(descLower)) {
      return renderPhysicsScene('motor', desc, _hideLabels);
    }
    if (/wave\s+tank|water\s+wave|diffraction|gap|barrier/i.test(descLower)) {
      return renderPhysicsScene('wave_tank', desc, _hideLabels);
    }
    if (/thermal\s+(?:energy|conduct|insulat)|heat\s+(?:transfer|loss|exchange|conduction|convection|radiation)|(?:conduction|convection|radiation)\s+(?:of|through)/i.test(descLower)) {
      return renderPhysicsScene('thermal', desc, _hideLabels);
    }

    // 29a. Venn diagram
    if (/venn/i.test(descLower)) return renderVennDiagram(desc);

    // 29b. Probability tree (not frequency tree — that's already handled at step 5)
    if (/probability\s+tree/i.test(descLower) && !/frequency/i.test(descLower)) return renderProbabilityTree(desc);

    // 29c. Circle theorem
    if (/circle\s+theorem|tangent\s+(?:to|at)\s+(?:a\s+)?circle|inscribed\s+angle|cyclic\s+quadrilateral|alternate\s+segment|angle\s+(?:at|in)\s+(?:the\s+)?(?:centre|semicircle)|chord/i.test(descLower)) return renderCircleTheorem(desc);

    // 29d. Number machine
    if (/number\s+machine|function\s+machine|input.*output.*(?:machine|box)|in\s+→\s+out/i.test(descLower)) return renderNumberMachine(desc);

    // 29e. Reaction profile / energy diagram (chemistry)
    if (/reaction\s+profile|energy\s+(?:level\s+)?diagram.*(?:react|exo|endo)|activation\s+energy\s+diagram|enthalpy/i.test(descLower)) return renderReactionProfile(desc);

    // 29f. Matching exercise
    if (/match(?:ing)?\s+(?:exercise|activity|the\s+following)|draw\s+(?:a\s+)?line.*match|connect.*correct/i.test(descLower)) return renderMatchingExercise(desc);

    // 29g. Flow diagram / process diagram
    if (/flow\s*(?:chart|diagram)|process\s+diagram|(?:haber|contact|born.?haber)\s+process|fractional\s+distill|(?:carbon|nitrogen|water|rock)\s+cycle/i.test(descLower)) return renderFlowDiagram(desc);

    // 29h. Periodic table
    if (/periodic\s+table/i.test(descLower)) return renderPeriodicTableOutline(desc);

    // 29i. Food chain / food web
    if (/food\s+(?:chain|web)|producer.*consumer|trophic/i.test(descLower)) return renderFoodChain(desc);

    // 29j. Flowchart / dichotomous key (biology)
    if (/dichotomous\s+key|identification\s+key|(?:yes|no)\s+→/i.test(descLower)) return renderFlowchart(desc);

    // 29k. Pedigree chart (genetics)
    if (/pedigree|family\s+tree.*(?:genetic|inherit|allele|dominant|recessive)/i.test(descLower)) return renderPedigreeChart(desc);

    // 29l. Petri dish
    if (/petri\s+dish|agar\s+plate|bacterial\s+colon|zone\s+of\s+inhibition|antibiotic\s+disc/i.test(descLower)) return renderPetriDish(desc);

    // 29m. Microscope diagram
    if (/microscope\s+(?:diagram|labelled|drawing)|parts\s+of\s+(?:a\s+)?microscope/i.test(descLower)) return renderMicroscope(desc);

    // 29n. Coordinate grid (for transformations, plotting)
    if (/coordinate\s+(?:grid|axes|plane)|x.*y\s+(?:axis|axes)|plot\s+(?:the\s+)?(?:point|coordinate)|(?:translation|rotation|reflection|enlargement)\s+(?:on|of)/i.test(descLower)) return renderCoordinateGrid(desc);

    // 30. Generic fallback — still useful context
    return (
      <div className="mb-8 p-5 bg-slate-100 rounded-lg border-2 border-slate-300">
        <div className="flex items-center gap-2 mb-3">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-slate-600">
            <rect x="2" y="2" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
            <path d="M6 8h8M6 12h5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          <p className="text-sm font-bold text-slate-700 uppercase tracking-wide">Reference Material</p>
        </div>
        <p className="text-slate-700 text-base leading-relaxed">{desc}</p>
      </div>
    );
  };

  // ── RENDER ANSWER INPUT (by type) ──────────────────────────────────────────────
  const renderAnswerInput = () => {
    if (isReview) {
      return (
        <div className="mt-6 space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm font-semibold text-blue-900 mb-2">Scholar&apos;s Answer:</p>
            <p className="text-blue-700">
              {answers.get(currentQuestion.id)?.text || "(No answer)"}
            </p>
          </div>
          {currentQuestion.acceptable_answers && (
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm font-semibold text-green-900 mb-2">Acceptable Answer(s):</p>
              <p className="text-green-700">
                {typeof currentQuestion.acceptable_answers === "object"
                  ? JSON.stringify(currentQuestion.acceptable_answers)
                  : currentQuestion.acceptable_answers}
              </p>
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

      case "mcq_select": {
        // Read from mcq_options (JSONB array of {text, label} objects)
        const options = currentQuestion.mcq_options || [];

        if (isMultiSelect) {
          // Multi-select: checkboxes for "Tick two boxes" style questions
          const selectedIndices = inputValue ? inputValue.split(",").filter(Boolean) : [];

          return (
            <div className="mt-6 space-y-3">
              {options.map((option, idx) => {
                const optionText = typeof option === "object" ? option.text : option;
                const optionLabel = typeof option === "object" ? option.label : null;
                const isSelected = selectedIndices.includes(String(idx));

                // Skip empty options (malformed data)
                if (!optionText && !optionLabel) return null;

                return (
                  <label
                    key={idx}
                    className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition ${
                      isSelected
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-300 hover:border-slate-400 bg-white"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleMultiSelectToggle(idx)}
                      className="w-5 h-5 mr-4 rounded border-slate-400 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-slate-900">
                      {optionLabel && optionLabel !== optionText && (
                        <span className="font-semibold mr-2">{optionLabel}.</span>
                      )}
                      {optionText || optionLabel}
                    </span>
                  </label>
                );
              })}
            </div>
          );
        }

        // Single-select: radio buttons for "Tick one box" style questions
        return (
          <div className="mt-6 space-y-3">
            {options.map((option, idx) => {
              const optionText = typeof option === "object" ? option.text : option;
              const optionLabel = typeof option === "object" ? option.label : null;
              const isSelected = inputValue === String(idx);

              // Skip empty options (malformed data where both text and label are empty)
              if (!optionText && !optionLabel) return null;

              return (
                <label
                  key={idx}
                  className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition ${
                    isSelected
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-300 hover:border-slate-400 bg-white"
                  }`}
                >
                  <input
                    type="radio"
                    name={`mcq-${currentQuestion.id}`}
                    value={idx}
                    checked={isSelected}
                    onChange={(e) => handleAnswerChange(e.target.value)}
                    className="w-5 h-5 mr-4 border-slate-400 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-slate-900">
                    {optionLabel && optionLabel !== optionText && (
                      <span className="font-semibold mr-2">{optionLabel}.</span>
                    )}
                    {optionText || optionLabel}
                  </span>
                </label>
              );
            })}
          </div>
        );
      }

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

      case "diagram_label": {
        // Determine number of label fields from: explicit diagram_labels, marks count, or letter labels in description
        const descText = currentQuestion.diagram_description || "";
        const qText2 = currentQuestion.question_text || "";

        // Check for letter labels in description like "labeled A, B, C, D"
        const letterLabelsMatch = descText.match(/labeled?\s+([A-Z](?:\s*,\s*[A-Z])*(?:\s*(?:and|,)\s*[A-Z])?)/i);
        let labelNames = [];
        if (currentQuestion.diagram_labels && currentQuestion.diagram_labels.length > 0) {
          labelNames = currentQuestion.diagram_labels;
        } else if (letterLabelsMatch) {
          labelNames = letterLabelsMatch[1].split(/\s*[,]\s*|\s+and\s+/i).map(s => s.trim()).filter(Boolean);
        }

        // Fallback: use marks count as hint for number of fields (marks often = number of labels)
        const fieldCount = labelNames.length > 0 ? labelNames.length : Math.max(1, currentQuestion.marks || 3);

        // Determine if this is a "draw/complete/mark" task vs "label parts" task
        const isDrawTask = /draw|complete|reflect|mark with|plot|show the set/i.test(qText2);

        if (isDrawTask) {
          // For drawing tasks (complete bar chart, reflect shape, mark point), show a text input
          return (
            <div className="mt-6">
              <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200 mb-4">
                <p className="text-sm text-indigo-700">
                  This question asks you to draw or complete a diagram. Describe your answer below:
                </p>
              </div>
              <textarea
                className="w-full p-4 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-base"
                rows={4}
                placeholder="Describe what you would draw or complete..."
                value={inputValue}
                onChange={(e) => handleAnswerChange(e.target.value)}
              />
            </div>
          );
        }

        return (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-slate-600 mb-2">
              {/line from each/i.test(qText2)
                ? "Match each label to the correct answer:"
                : "Label the parts indicated in the diagram:"}
            </p>
            {Array.from({ length: fieldCount }).map((_, idx) => {
              const labelName = labelNames[idx] || null;
              return (
                <div key={idx} className="flex items-center gap-3">
                  <span className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full bg-slate-200 text-slate-700 text-sm font-bold">
                    {labelName || idx + 1}
                  </span>
                  <input
                    type="text"
                    className="flex-1 p-3 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    placeholder={labelName ? `What is ${labelName}?` : `Enter answer ${idx + 1}...`}
                    value={(inputValue.split("|")[idx]) || ""}
                    onChange={(e) => {
                      const parts = inputValue ? inputValue.split("|") : [];
                      parts[idx] = e.target.value;
                      handleAnswerChange(parts.join("|"));
                    }}
                  />
                </div>
              );
            })}
          </div>
        );
      }

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

  // ── FINISHED STATE ─────────────────────────────────────────────────────────────
  if (examFinished) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-green-600">
              <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Exam Submitted</h2>
          <p className="text-slate-600 mb-6">
            Your exam has been submitted. You answered {answeredCount} of {questions.length}{" "}
            questions.
          </p>
          {saving && (
            <p className="text-sm text-slate-500 animate-pulse mb-4">Saving your work...</p>
          )}
          <p className="text-sm text-slate-500 mb-6">Your exam is now being marked...</p>
          <button
            onClick={() => onFinish?.({ sittingId, totalAnswered: answeredCount })}
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
          >
            View Results
          </button>
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
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate">
              {paper.display_title ||
                `LaunchPard ${paper.subject
                  ?.split("_")
                  .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                  .join(" ")} — Paper ${paper.paper_number || 1}`}
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
              <span className="text-sm font-sans">Practice Mode</span>
            )}
          </div>

          {/* Right: Progress */}
          <div className="flex-1 text-right">
            <p className="text-sm font-semibold">
              Q{currentQuestionIndex + 1} of {questions.length}
            </p>
            <div className="w-48 h-2 bg-slate-700 rounded-full mt-2 ml-auto">
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
                  Question {currentQuestion.question_number || currentQuestionIndex + 1}
                  {currentQuestion.part && ` (${currentQuestion.part})`}
                </h2>
                {currentQuestion.marks > 0 && (
                  <p className="text-lg font-semibold text-slate-600">
                    [{currentQuestion.marks} mark{currentQuestion.marks !== 1 ? "s" : ""}]
                  </p>
                )}
              </div>

              {!isReview && currentQuestion.marks > 0 && (
                <button
                  onClick={handleToggleFlag}
                  className={`px-4 py-2 rounded-lg font-semibold transition flex-shrink-0 ${
                    answers.get(currentQuestion.id)?.flagged
                      ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {answers.get(currentQuestion.id)?.flagged ? "Flagged" : "Flag"}
                </button>
              )}
            </div>

            {/* Question Text */}
            <div className="prose prose-sm max-w-none mb-8">
              {renderQuestionText(currentQuestion.question_text)}
            </div>

            {/* Diagram / Table / Figure */}
            {renderDiagram()}

            {/* Supplementary table — when question_text references a Table but renderDiagram rendered something else (e.g., apparatus SVG) */}
            {(() => {
              const qText = currentQuestion.question_text || "";
              const tRef = qText.match(/\b(?:Complete\s+)?Table\s+(\d+)\b/i);
              // Only render if: there IS a table reference, AND diagram_description does NOT already mention "table" (avoiding double render)
              if (tRef && currentQuestion.diagram_description && !/table/i.test(currentQuestion.diagram_description || "")) {
                return renderInlineDataTable(tRef[0].replace(/^Complete\s+/i, "Table "), tRef[1], qText);
              }
              return null;
            })()}

            {/* Answer Input — suppress for parent stem (0 marks context-only) */}
            {currentQuestion.marks > 0 ? renderAnswerInput() : (
              <div className="mt-2 mb-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700 font-medium">
                  Read the information above, then answer the questions that follow.
                </p>
              </div>
            )}

            {/* Save Status */}
            {saveStatus === "saving" && (
              <div className="mt-6 flex items-center gap-2 text-blue-600 text-sm">
                <span className="inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                Saving...
              </div>
            )}
            {saveStatus === "saved" && (
              <div className="mt-6 text-green-600 text-sm font-semibold">Saved</div>
            )}
            {saveStatus === "error" && (
              <div className="mt-6 text-amber-600 text-sm font-semibold">
                Could not save — your answer is stored locally and will be submitted when you finish.
              </div>
            )}
          </div>
        </main>

        {/* ── SIDEBAR: QUESTION PALETTE ──────────────────────────────────────── */}
        <aside className="hidden lg:flex flex-col w-64 bg-slate-50 border-l border-slate-200 p-6 overflow-y-auto">
          <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wide">
            Progress
          </h3>
          <div className="grid grid-cols-5 gap-1.5">
            {questions.map((q, idx) => {
              const qAnswer = answers.get(q.id);
              const answered = qAnswer?.text || qAnswer?.data;
              const isCurrent = idx === currentQuestionIndex;
              const isFlagged = qAnswer?.flagged;

              return (
                <button
                  key={q.id}
                  onClick={() => handleNavigateQuestion(idx)}
                  className={`aspect-square w-full flex items-center justify-center rounded-md font-semibold text-xs leading-none transition ${
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
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <button
            onClick={handlePreviousQuestion}
            disabled={currentQuestionIndex === 0}
            className="px-6 py-3 font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed bg-slate-200 text-slate-700 hover:bg-slate-300"
          >
            Previous
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
            Next
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
                onClick={handleCancelFinish}
                className="flex-1 px-4 py-3 font-semibold rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 transition"
              >
                Continue Exam
              </button>
              <button
                onClick={handleConfirmFinish}
                disabled={saving}
                className="flex-1 px-4 py-3 font-bold rounded-lg bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-50"
              >
                {saving ? "Submitting..." : "Submit Exam"}
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
