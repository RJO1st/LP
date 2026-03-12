"use client";
/**
 * MockTestHub.jsx
 * Deploy to: src/components/MockTestHub.jsx
 *
 * Dashboard section for browsing and launching mock tests / papers.
 * Filters tests by scholar's year level and curriculum.
 * Handles question fetching and hands off to PaperEngine.
 *
 * Usage in StudentDashboard:
 *   import MockTestHub from "../../components/MockTestHub";
 *   // In the main render, add a "Mock Tests" tab/section
 *   <MockTestHub scholar={scholar} supabase={supabase} onBack={() => setView("dashboard")} />
 */

import React, { useState, useEffect, useCallback } from "react";
import { getTestsForScholar, getTestById, resolveTestCurriculum, CATEGORIES, PAPER_CONFIGS } from "../lib/mockTestCatalogue";
import PaperEngine from "./game/PaperEngine";

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const DIFFICULTY_STYLES = {
  foundation:   { bg: "#dcfce7", color: "#166534", label: "Foundation" },
  standard:     { bg: "#dbeafe", color: "#1e40af", label: "Standard"   },
  challenging:  { bg: "#fef3c7", color: "#92400e", label: "Challenging" },
  exam:         { bg: "#ede9fe", color: "#4c1d95", label: "Exam Level"  },
};

function pluralise(n, word) {
  return `${n} ${word}${n !== 1 ? "s" : ""}`;
}

// ─── TEST CARD ────────────────────────────────────────────────────────────────

function TestCard({ test, onStart, loading }) {
  const catDef   = CATEGORIES[test.category] ?? CATEGORIES.subject_practice;
  const diffStyle = DIFFICULTY_STYLES[test.difficulty] ?? DIFFICULTY_STYLES.standard;
  const paperCfg  = PAPER_CONFIGS[test.paperSize] ?? PAPER_CONFIGS.standard;
  const isLoading = loading === test.id;

  return (
    <div style={{
      background: "white",
      borderRadius: 16,
      border: "1.5px solid #e2e8f0",
      overflow: "hidden",
      transition: "box-shadow 0.2s, transform 0.2s",
      cursor: "pointer",
      position: "relative",
    }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = "0 8px 32px rgba(99,102,241,0.12)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {/* Category strip */}
      <div style={{
        height: 4,
        background: `linear-gradient(90deg, ${catDef.color}, ${catDef.color}88)`,
      }} />

      <div style={{ padding: "16px" }}>
        {/* Top row */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ fontSize: 28 }}>{test.badge}</div>
          <div style={{
            fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
            background: diffStyle.bg, color: diffStyle.color, textTransform: "uppercase", letterSpacing: "0.06em",
          }}>
            {diffStyle.label}
          </div>
        </div>

        {/* Title & description */}
        <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", marginBottom: 4, lineHeight: 1.3 }}>
          {test.label}
        </div>
        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 14, lineHeight: 1.5 }}>
          {test.description}
        </div>

        {/* Meta chips */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 99,
            background: catDef.color + "14", color: catDef.color,
          }}>{catDef.emoji} {catDef.label}</span>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 99,
            background: "#f1f5f9", color: "#475569",
          }}>
            {paperCfg.questions}q
          </span>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 99,
            background: "#f1f5f9", color: "#475569",
          }}>
            {paperCfg.minutes ? `${paperCfg.minutes} min` : "No timer"}
          </span>
        </div>

        {/* Start button */}
        <button
          onClick={() => onStart(test)}
          disabled={isLoading}
          style={{
            width: "100%", padding: "10px", borderRadius: 10, border: "none",
            background: isLoading
              ? "#f1f5f9"
              : `linear-gradient(135deg, ${catDef.color}, ${catDef.color}cc)`,
            color: isLoading ? "#94a3b8" : "white",
            fontSize: 13, fontWeight: 700, cursor: isLoading ? "wait" : "pointer",
            transition: "opacity 0.2s",
          }}
        >
          {isLoading ? "Loading paper…" : "Start Test →"}
        </button>
      </div>
    </div>
  );
}

// ─── CATEGORY FILTER BAR ──────────────────────────────────────────────────────

function CategoryBar({ active, onChange, counts, allCategories }) {
  const ALL_CATEGORY_ORDER = [
    null,
    "exam_prep",
    "subject_practice",
    "gcse",
    "a_level",
    "waec",
    "sat",
    "diagnostic",
  ];

  const options = [{ key: null, label: "All", emoji: "🗂" }];
  ALL_CATEGORY_ORDER.slice(1).forEach(key => {
    if (counts[key]) options.push({ key, ...CATEGORIES[key] });
  });

  const totalCount = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
      {options.map(opt => {
        const isActive = active === opt.key;
        const count = opt.key === null ? totalCount : counts[opt.key] ?? 0;
        return (
          <button
            key={String(opt.key)}
            onClick={() => onChange(opt.key)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 14px", borderRadius: 99, border: "none",
              background: isActive ? (CATEGORIES[opt.key]?.color ?? "#6366f1") : "white",
              color: isActive ? "white" : "#475569",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
              boxShadow: isActive
                ? `0 4px 12px ${(CATEGORIES[opt.key]?.color ?? "#6366f1")}44`
                : "0 1px 3px rgba(0,0,0,0.08)",
              transition: "all 0.15s",
            }}
          >
            <span>{opt.emoji}</span>
            <span>{opt.label}</span>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: "1px 6px", borderRadius: 99,
              background: isActive ? "rgba(255,255,255,0.25)" : "#f1f5f9",
              color: isActive ? "white" : "#94a3b8",
            }}>{count}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── EMPTY STATE ──────────────────────────────────────────────────────────────

function EmptyState({ category }) {
  return (
    <div style={{
      textAlign: "center", padding: "60px 20px",
      background: "white", borderRadius: 16, border: "1.5px dashed #e2e8f0",
    }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: "#374151", marginBottom: 8 }}>
        No tests available
      </div>
      <div style={{ fontSize: 13, color: "#94a3b8" }}>
        {category === "exam_prep"
          ? "Exam prep tests unlock as you progress through year levels."
          : "Check back soon — more tests are being added."}
      </div>
    </div>
  );
}

// ─── MAIN EXPORT ──────────────────────────────────────────────────────────────

export default function MockTestHub({ scholar, supabase, onBack }) {
  const [category,       setCategory]       = useState(null);
  const [activePaper,    setActivePaper]     = useState(null); // { testConfig, questions }
  const [loadingTestId,  setLoadingTestId]   = useState(null);
  const [recentResults,  setRecentResults]   = useState([]);   // last 3 results this session

  const year       = parseInt(scholar?.year_level || scholar?.year || 1, 10);
  const curriculum = scholar?.curriculum ?? "uk_national";

  // All tests eligible for this scholar
  const allTests = getTestsForScholar(year, curriculum);

  // Category counts
  const counts = allTests.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] ?? 0) + 1;
    return acc;
  }, {});

  // Filtered list
  const visibleTests = category ? allTests.filter(t => t.category === category) : allTests;

  // ── Question fetching ──────────────────────────────────────────────────────

  const fetchQuestionsForTest = useCallback(async (test) => {
    const resolvedCurriculum = resolveTestCurriculum(test, curriculum);
    const subjects = test.subjects ?? [test.subject];
    const questionsPerSubject = Math.ceil(
      (PAPER_CONFIGS[test.paperSize]?.questions ?? 20) / subjects.length
    );

    const allRows = [];

    for (const subj of subjects) {
      let query = supabase
        .from("question_bank")
        .select("id, question_text, options, correct_index, explanation, passage, subject, topic, difficulty_tier, exam_tag, question_data")
        .eq("curriculum", resolvedCurriculum)
        .eq("subject", subj)
        .eq("year_level", year)
        .limit(questionsPerSubject * 4); // overfetch for shuffle

      if (test.examTag) {
        query = query.eq("exam_tag", test.examTag);
      }

      const { data, error } = await query;
      if (error) console.warn(`[MockTestHub] fetch error for ${subj}:`, error.message);
      if (data?.length) allRows.push(...data);
    }

    // Shuffle
    const shuffled = [...allRows].sort(() => Math.random() - 0.5);
    const targetCount = PAPER_CONFIGS[test.paperSize]?.questions ?? 20;

    // If we got enough from DB, use them
    if (shuffled.length >= targetCount) {
      return shuffled.slice(0, targetCount);
    }

    // Thin coverage — try without year filter, then without exam tag
    if (shuffled.length < targetCount) {
      console.warn(`[MockTestHub] Only ${shuffled.length}/${targetCount} questions found for ${test.id}. Relaxing year filter.`);

      for (const subj of subjects) {
        const needed = targetCount - shuffled.length;
        const { data } = await supabase
          .from("question_bank")
          .select("id, question_text, options, correct_index, explanation, passage, subject, topic, difficulty_tier, question_data")
          .eq("curriculum", resolvedCurriculum)
          .eq("subject", subj)
          .gte("year_level", Math.max(1, year - 1))
          .lte("year_level", year + 1)
          .limit(needed * 3);

        if (data?.length) {
          const ids = new Set(shuffled.map(r => r.id));
          shuffled.push(...data.filter(r => !ids.has(r.id)));
        }
      }
    }

    // Still not enough — last resort: drop exam_tag entirely, any year ±2
    if (shuffled.length < targetCount) {
      console.warn(`[MockTestHub] Still ${shuffled.length}/${targetCount}. Dropping exam_tag filter.`);
      for (const subj of subjects) {
        const needed = targetCount - shuffled.length;
        const { data } = await supabase
          .from("question_bank")
          .select("id, question_text, options, correct_index, explanation, passage, subject, topic, difficulty_tier, question_data")
          .eq("curriculum", resolvedCurriculum)
          .eq("subject", subj)
          .gte("year_level", Math.max(1, year - 2))
          .lte("year_level", year + 2)
          .limit(needed * 4);

        if (data?.length) {
          const ids = new Set(shuffled.map(r => r.id));
          shuffled.push(...data.filter(r => !ids.has(r.id)));
        }
      }
    }

    return shuffled.slice(0, targetCount);
  }, [supabase, year, curriculum]);

  // ── Normalise question rows for PaperEngine ────────────────────────────────
  // Handles two DB layouts:
  //   Layout A: options / correct_index / explanation stored as top-level columns
  //   Layout B: data stored in question_data JSONB, other columns null
  const normaliseQuestions = (rows) => rows.map(r => {
    const parse = (val, fallback) => {
      if (Array.isArray(val)) return val;
      if (val && typeof val === "object") return Object.keys(val).length ? val : fallback;
      try { return val ? JSON.parse(val) : fallback; } catch { return fallback; }
    };

    // Unpack question_data if present (Layout B)
    let data = r;
    if (r.question_data) {
      const qd = parse(r.question_data, {});
      if (qd && typeof qd === "object") {
        data = {
          ...r,
          question_text: qd.q  || r.question_text,
          options:       qd.opts || r.options,
          correct_index: qd.a  != null ? Number(qd.a) : r.correct_index,
          explanation:   qd.exp || r.explanation,
          passage:       qd.passage || r.passage,
          topic:         qd.topic   || r.topic,
        };
      }
    }

    const opts = parse(data.options, []);
    const correctIndex = data.correct_index != null ? Number(data.correct_index) : 0;

    return {
      ...data,
      q:    data.question_text ?? "",
      opts,
      a:    Math.max(0, Math.min(correctIndex, opts.length - 1)),
      exp:  data.explanation ?? "",
    };
  });

  // ── Start a test ───────────────────────────────────────────────────────────

  const handleStart = async (test) => {
    setLoadingTestId(test.id);
    try {
      const rows      = await fetchQuestionsForTest(test);
      const questions = normaliseQuestions(rows);
      setActivePaper({ testConfig: test, questions });
    } catch (err) {
      console.error("[MockTestHub] Failed to load test:", err);
      alert("Couldn't load questions for this test. Please try again.");
    } finally {
      setLoadingTestId(null);
    }
  };

  // ── Handle completion ──────────────────────────────────────────────────────

  const handleComplete = useCallback(async (result) => {
    // Save to session history
    setRecentResults(prev => [
      { ...result, testId: activePaper?.testConfig?.id, label: activePaper?.testConfig?.label, timestamp: Date.now() },
      ...prev.slice(0, 2),
    ]);

    // Save to quiz_results in DB (best-effort — don't block)
    try {
      await supabase.from("quiz_results").insert({
        scholar_id:     scholar.id,
        subject:        activePaper?.testConfig?.subject ?? "mixed",
        curriculum:     resolveTestCurriculum(activePaper?.testConfig, curriculum),
        score:          result.score,
        correct_count:  result.correct,
        total_questions: result.total,
        time_taken_secs: result.timeTaken,
        session_type:   "mock_test",
        exam_tag:       activePaper?.testConfig?.examTag ?? null,
        metadata:       { testId: activePaper?.testConfig?.id },
      });
    } catch (err) {
      console.warn("[MockTestHub] Failed to save result:", err.message);
    }
  }, [activePaper, scholar, supabase, curriculum]);

  // ── If a paper is active, render PaperEngine ──────────────────────────────

  if (activePaper) {
    return (
      <PaperEngine
        testConfig={activePaper.testConfig}
        questions={activePaper.questions}
        onClose={() => setActivePaper(null)}
        onComplete={handleComplete}
      />
    );
  }

  // ── Hub view ───────────────────────────────────────────────────────────────

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
      fontFamily: "system-ui, sans-serif",
    }}>

      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #312e81 100%)",
        padding: "24px 20px 28px",
        position: "relative", overflow: "hidden",
      }}>
        {/* Decorative dots */}
        {["top-3 left-1/4", "top-6 right-1/3", "bottom-4 left-1/3", "top-4 right-1/4"].map((pos, i) => (
          <div key={i} style={{
            position: "absolute",
            top: [12, 24, "auto", 16][i], bottom: [, , 16][i],
            left: i === 0 ? "25%" : i === 2 ? "33%" : undefined,
            right: i === 1 ? "33%" : i === 3 ? "25%" : undefined,
            width: [6, 4, 8, 5][i], height: [6, 4, 8, 5][i],
            borderRadius: "50%",
            background: "white",
            opacity: [0.15, 0.08, 0.12, 0.1][i],
          }} />
        ))}

        <div style={{ maxWidth: 680, margin: "0 auto", position: "relative", zIndex: 1 }}>
          {/* Back */}
          <button
            onClick={onBack}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)",
              color: "#94a3b8", borderRadius: 8, padding: "5px 12px",
              fontSize: 12, fontWeight: 600, cursor: "pointer", marginBottom: 20,
            }}
          >← Back to Dashboard</button>

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14, flexShrink: 0,
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 26, boxShadow: "0 8px 20px rgba(99,102,241,0.4)",
            }}>📋</div>
            <div>
              <div style={{ fontSize: 11, color: "#6366f1", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>
                Mock Tests
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 900, color: "white", margin: 0, lineHeight: 1.2 }}>
                Test Centre
              </h1>
              <p style={{ fontSize: 13, color: "#94a3b8", margin: "4px 0 0", fontWeight: 500 }}>
                {pluralise(allTests.length, "paper")} available · Year {year}
              </p>
            </div>
          </div>

          {/* Recent results */}
          {recentResults.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                Recent Results
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {recentResults.map((r, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 10, padding: "8px 12px",
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%",
                      background: r.score >= 70 ? "#10b981" : r.score >= 55 ? "#f59e0b" : "#ef4444",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 900, color: "white",
                    }}>{r.score}%</div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "white" }}>{r.label}</div>
                      <div style={{ fontSize: 10, color: "#64748b" }}>{r.correct}/{r.total} correct</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 16px" }}>

        {/* Category filter */}
        <CategoryBar active={category} onChange={setCategory} counts={counts} allCategories={Object.keys(counts)} />

        {/* Test grid */}
        {visibleTests.length === 0 ? (
          <EmptyState category={category} />
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 14,
          }}>
            {visibleTests.map(test => (
              <TestCard
                key={test.id}
                test={test}
                onStart={handleStart}
                loading={loadingTestId}
              />
            ))}
          </div>
        )}

        {/* Footer note */}
        <div style={{
          marginTop: 32, padding: "14px 16px", borderRadius: 12,
          background: "white", border: "1px solid #e2e8f0",
          fontSize: 12, color: "#94a3b8", textAlign: "center",
        }}>
          📌 Test results are saved to your profile. Tara's explanations are available after each paper.
        </div>
      </div>
    </div>
  );
}