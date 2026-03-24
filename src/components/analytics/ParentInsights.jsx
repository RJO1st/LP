"use client";
/**
 * ParentInsights.jsx
 * Parent-facing analytics dashboard. Exam readiness, weekly summary,
 * topic focus areas, and learning path progress in plain language.
 *
 * → src/components/analytics/ParentInsights.jsx
 */

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import {
  computeWeeklySummary,
  computeSubjectOverview,
  computeProgressTrend,
  estimatePercentile,
} from "@/lib/analyticsEngine";
import { estimateExamReadiness } from "@/lib/learningPathEngine";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from "recharts";
import { getSubjectLabel } from "@/lib/subjectDisplay";

export default function ParentInsights({ parentId }) {
  const [supabase]    = useState(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ));
  const [scholars,    setScholars]    = useState([]);
  const [activeIdx,   setActiveIdx]   = useState(0);
  const [mastery,     setMastery]     = useState([]);
  const [answers,     setAnswers]     = useState([]);
  const [learningPath,setLearningPath]= useState(null);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    if (!parentId) return;
    loadScholars();
  }, [parentId]);

  useEffect(() => {
    if (scholars[activeIdx]) loadScholarData(scholars[activeIdx].id);
  }, [activeIdx, scholars]);

  async function loadScholars() {
    const { data } = await supabase.from("scholars").select("*").eq("parent_id", parentId);
    setScholars(data ?? []);
  }

  async function loadScholarData(scholarId) {
    setLoading(true);
    const [masteryRes, answersRes, pathRes] = await Promise.all([
      supabase.from("scholar_topic_mastery").select("*").eq("scholar_id", scholarId),
      supabase.from("session_answers").select("*").eq("scholar_id", scholarId)
        .gte("answered_at", new Date(Date.now() - 7 * 86400000).toISOString()),
      supabase.from("scholar_learning_path").select("*").eq("scholar_id", scholarId).limit(1),
    ]);
    setMastery(masteryRes.data ?? []);
    setAnswers(answersRes.data ?? []);
    setLearningPath(pathRes.data?.[0] ?? null);
    setLoading(false);
  }

  const scholar = scholars[activeIdx];
  if (!scholar && !loading) return (
    <div className="text-center p-10 text-slate-400">No scholars found. Add a scholar to get started.</div>
  );

  const weekly   = scholar ? computeWeeklySummary(answers, mastery, scholar) : null;
  const subjects = computeSubjectOverview(mastery);

  // Per-subject exam readiness
  const subjectGroups = {};
  for (const r of mastery) {
    if (!subjectGroups[r.subject]) subjectGroups[r.subject] = [];
    subjectGroups[r.subject].push(r);
  }
  const readiness = Object.entries(subjectGroups).map(([subject, records]) => ({
    subject,
    displayName: getSubjectLabel(subject),
    ...estimateExamReadiness(records, subject),
  }));

  // Focus topics (weakest 3)
  const focusTopics = mastery
    .filter(r => r.mastery_score < 0.55)
    .sort((a, b) => a.mastery_score - b.mastery_score)
    .slice(0, 3);

  // Radar chart data
  const radarData = subjects.slice(0, 6).map(s => ({
    subject: s.displayName.length > 10 ? s.displayName.slice(0, 10) + '…' : s.displayName,
    mastery: s.avgMastery,
  }));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 md:p-8">
      {/* ── HEADER ───────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-3xl font-black text-slate-900">Mission Control</h1>
        <p className="text-slate-500 mt-1">Your child's learning journey at a glance</p>
      </div>

      {/* ── SCHOLAR TABS ─────────────────────────────────────────── */}
      {scholars.length > 1 && (
        <div className="flex gap-2 mb-6 flex-wrap">
          {scholars.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setActiveIdx(i)}
              className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                i === activeIdx
                  ? "bg-indigo-600 text-white shadow-md"
                  : "bg-white border border-slate-200 text-slate-600 hover:border-indigo-400"
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-3xl animate-pulse mb-3">🚀</div>
            <p className="text-slate-400">Loading {scholar?.name}'s data…</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">

          {/* ── WEEKLY SUMMARY CARD ────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-xl">📋</div>
              <div>
                <h2 className="font-black text-lg">This Week's Mission Report</h2>
                <p className="text-slate-400 text-sm">Last 7 days</p>
              </div>
            </div>

            {weekly?.isEmpty ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
                {scholar?.name} hasn't completed any sessions this week. A gentle nudge might help! 🚀
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  {[
                    { label: "Questions",    value: weekly.totalQuestions,   icon: "📝", colour: "text-indigo-600" },
                    { label: "Accuracy",     value: `${weekly.accuracy}%`,   icon: "🎯", colour: "text-emerald-600" },
                    { label: "Sessions",     value: weekly.sessionsCount,     icon: "⚡", colour: "text-purple-600" },
                    { label: "Topics Done",  value: weekly.topicsAttempted.length, icon: "📚", colour: "text-pink-600" },
                  ].map(stat => (
                    <div key={stat.label} className="text-center p-3 bg-slate-50 rounded-xl">
                      <div className="text-xl mb-1">{stat.icon}</div>
                      <div className={`text-2xl font-black ${stat.colour}`}>{stat.value}</div>
                      <div className="text-xs text-slate-400">{stat.label}</div>
                    </div>
                  ))}
                </div>

                {weekly.strongestTopic && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                      <p className="text-xs font-bold text-emerald-700 mb-1">💪 Strongest this week</p>
                      <p className="font-bold text-emerald-900 capitalize">
                        {weekly.strongestTopic.topic.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-emerald-600">{weekly.strongestTopic.accuracy}% accuracy</p>
                    </div>
                    {weekly.weakestTopic && weekly.weakestTopic.topic !== weekly.strongestTopic.topic && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                        <p className="text-xs font-bold text-amber-700 mb-1">🔄 Needs more practice</p>
                        <p className="font-bold text-amber-900 capitalize">
                          {weekly.weakestTopic.topic.replace(/_/g, ' ')}
                        </p>
                        <p className="text-xs text-amber-600">{weekly.weakestTopic.accuracy}% accuracy</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── EXAM READINESS ─────────────────────────────────────── */}
          {readiness.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-xl">🎓</div>
                <div>
                  <h2 className="font-black text-lg">Exam Readiness</h2>
                  <p className="text-slate-400 text-sm">Estimated based on current mastery trajectory</p>
                </div>
              </div>
              <div className="space-y-3">
                {readiness.map(r => (
                  <div key={r.subject} className="flex items-center gap-4">
                    <div className="w-32 text-sm font-bold text-slate-600 capitalize">{r.displayName}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <div className="w-full bg-slate-100 rounded-full h-3 mr-3">
                          <div
                            className="h-3 rounded-full transition-all"
                            style={{ width: `${r.score}%`, backgroundColor: r.colour }}
                          />
                        </div>
                        <span className="text-sm font-black w-12 text-right" style={{ color: r.colour }}>
                          {r.score}%
                        </span>
                      </div>
                    </div>
                    <div className="w-28 text-right">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: r.colour + '22', color: r.colour }}>
                        {r.label}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── SUBJECT RADAR CHART ────────────────────────────────── */}
          {radarData.length >= 3 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <h2 className="font-black text-lg mb-4">🕸️ Skills Radar</h2>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11 }} />
                  <Radar name="Mastery" dataKey="mastery" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} />
                  <Tooltip formatter={(v) => [`${v}%`, 'Mastery']} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ── FOCUS AREAS ────────────────────────────────────────── */}
          {focusTopics.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-xl">🎯</div>
                <div>
                  <h2 className="font-black text-lg">Focus Areas</h2>
                  <p className="text-slate-400 text-sm">Topics that need the most attention right now</p>
                </div>
              </div>
              <div className="space-y-3">
                {focusTopics.map(r => (
                  <div key={r.topic} className="flex items-center gap-4 p-3 bg-red-50 rounded-xl border border-red-100">
                    <div className="text-xl">🔄</div>
                    <div className="flex-1">
                      <p className="font-bold capitalize text-sm">{r.topic.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-slate-500 capitalize">{r.subject}</p>
                    </div>
                    <div className="text-sm font-black text-red-500">
                      {Math.round(r.mastery_score * 100)}%
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-sm text-indigo-700">
                💡 <strong>Tip:</strong> Ask {scholar?.name} to explain one of these topics to you tonight.
                Teaching something out loud is one of the most powerful ways to learn it.
              </div>
            </div>
          )}

          {/* ── LEARNING PATH PROGRESS ─────────────────────────────── */}
          {learningPath && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <h2 className="font-black text-lg mb-4">🗺️ Learning Path</h2>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1 bg-slate-100 rounded-full h-4">
                  <div
                    className="h-4 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all"
                    style={{ width: `${learningPath.completion_pct}%` }}
                  />
                </div>
                <span className="font-black text-indigo-600">{learningPath.completion_pct}%</span>
              </div>
              {learningPath.next_milestone && (
                <p className="text-sm text-slate-600">
                  🏁 <strong>Next milestone:</strong> {learningPath.next_milestone}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
