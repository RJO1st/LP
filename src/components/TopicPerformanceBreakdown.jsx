"use client";
// src/components/TopicPerformanceBreakdown.jsx
// Tier 1 Feature 3 — Per-Topic Performance Breakdown
// Shows horizontal mastery bars per topic within a subject.
// Matches the visual pattern from Atom Learning's "performance by topic" panel.
//
// Props:
//   scholarId   — string
//   subject     — string (e.g. "mathematics")
//   supabase    — supabase client instance
//   daysBack    — number (default 30, how far back to look)

import React, { useEffect, useState, useMemo } from "react";

// Mastery tier thresholds
function getMasteryTier(pct) {
  if (pct >= 85) return { label: "Mastered",    color: "#10b981", bg: "#ecfdf5", border: "#6ee7b7" };
  if (pct >= 70) return { label: "Strong",      color: "#6366f1", bg: "#eef2ff", border: "#a5b4fc" };
  if (pct >= 50) return { label: "Developing",  color: "#f59e0b", bg: "#fffbeb", border: "#fcd34d" };
  return            { label: "Needs work",   color: "#ef4444", bg: "#fef2f2", border: "#fca5a5" };
}

// ─── Supabase query helper ────────────────────────────────────────────────────
// Reads from quiz_results → answers JSONB array
// Each answer should have { topic: string, isCorrect: boolean }
// If your schema differs, adjust the query below.

async function fetchTopicStats(supabase, scholarId, subject, daysBack) {
  const since = new Date();
  since.setDate(since.getDate() - daysBack);

  const { data, error } = await supabase
    .from("quiz_results")
    .select("answers, topic_summary")
    .eq("scholar_id", scholarId)
    .eq("subject", subject)
    .gte("created_at", since.toISOString());

  if (error) { console.error("[TopicBreakdown]", error); return []; }

  // Aggregate across sessions
  const agg = {}; // { topic: { correct, total } }

  (data || []).forEach((row) => {
    // Prefer topic_summary if available (set by QuestOrchestrator)
    if (row.topic_summary && typeof row.topic_summary === "object") {
      Object.entries(row.topic_summary).forEach(([topic, stats]) => {
        if (!agg[topic]) agg[topic] = { correct: 0, total: 0 };
        agg[topic].correct += stats.correct || 0;
        agg[topic].total   += stats.total   || 0;
      });
      return;
    }
    // Fall back to answers array
    const answers = Array.isArray(row.answers) ? row.answers : [];
    answers.forEach(({ topic, isCorrect }) => {
      if (!topic) return;
      if (!agg[topic]) agg[topic] = { correct: 0, total: 0 };
      agg[topic].correct += isCorrect ? 1 : 0;
      agg[topic].total   += 1;
    });
  });

  return Object.entries(agg)
    .filter(([, s]) => s.total >= 3) // min 3 questions to show
    .map(([topic, s]) => ({
      topic,
      correct: s.correct,
      total: s.total,
      pct: Math.round((s.correct / s.total) * 100),
    }))
    .sort((a, b) => b.pct - a.pct); // highest first
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function TopicPerformanceBreakdown({
  scholarId,
  subject,
  supabase,
  daysBack = 30,
  maxTopics = 12,
}) {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all | needs_work | mastered

  useEffect(() => {
    if (!scholarId || !subject || !supabase) return;
    setLoading(true);
    fetchTopicStats(supabase, scholarId, subject, daysBack).then((data) => {
      setTopics(data);
      setLoading(false);
    });
  }, [scholarId, subject, supabase, daysBack]);

  const displayed = useMemo(() => {
    let list = topics;
    if (filter === "needs_work") list = topics.filter((t) => t.pct < 70);
    if (filter === "mastered")   list = topics.filter((t) => t.pct >= 85);
    return list.slice(0, maxTopics);
  }, [topics, filter, maxTopics]);

  const counts = useMemo(() => ({
    needs_work: topics.filter((t) => t.pct < 70).length,
    mastered:   topics.filter((t) => t.pct >= 85).length,
  }), [topics]);

  const subjectLabel = subject?.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "";

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse">
        <div className="h-4 bg-slate-100 rounded w-48 mb-6" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="mb-4">
            <div className="flex justify-between mb-1.5">
              <div className="h-3 bg-slate-100 rounded w-32" />
              <div className="h-3 bg-slate-100 rounded w-8" />
            </div>
            <div className="h-2.5 bg-slate-100 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (topics.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
        <div className="text-3xl mb-2">📊</div>
        <h4 className="font-bold text-slate-700 mb-1">{subjectLabel} performance</h4>
        <p className="text-sm text-slate-400">Complete more {subjectLabel} missions to see your topic breakdown.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-100">
        <h3 className="font-black text-slate-900 text-base mb-3">
          {subjectLabel} performance by topic
        </h3>
        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {[
            { key: "all",        label: `All (${topics.length})` },
            { key: "needs_work", label: `Needs work (${counts.needs_work})` },
            { key: "mastered",   label: `Mastered (${counts.mastered})` },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${
                filter === key
                  ? "bg-indigo-600 border-indigo-600 text-white"
                  : "bg-white border-slate-200 text-slate-500 hover:border-indigo-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Topic bars */}
      <div className="p-6 space-y-4">
        {displayed.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">No topics match this filter.</p>
        ) : (
          displayed.map(({ topic, pct, correct, total }) => {
            const tier = getMasteryTier(pct);
            return (
              <div key={topic}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-semibold text-slate-700 capitalize">
                    {topic.replace(/_/g, " ")}
                  </span>
                  <div className="flex items-center gap-2 ml-2">
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full border"
                      style={{ color: tier.color, background: tier.bg, borderColor: tier.border }}
                    >
                      {tier.label}
                    </span>
                    <span className="text-xs font-black text-slate-500 tabular-nums w-10 text-right">
                      {pct}%
                    </span>
                  </div>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, background: tier.color }}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {correct} of {total} correct
                </p>
              </div>
            );
          })
        )}
      </div>

      {/* Legend */}
      <div className="px-6 pb-5 flex flex-wrap gap-3">
        {[
          { label: "Mastered",   color: "#10b981" },
          { label: "Strong",     color: "#6366f1" },
          { label: "Developing", color: "#f59e0b" },
          { label: "Needs work", color: "#ef4444" },
        ].map(({ label, color }) => (
          <div key={label} className="flex items-center gap-1.5 text-xs text-slate-500">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}