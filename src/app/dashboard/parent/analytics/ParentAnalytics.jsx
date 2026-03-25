"use client";

import React from "react";
import Link from "next/link";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import {
  CURRICULA,
  SUBJECT_ICONS,
  formatGradeLabel,
} from "@/lib/gamificationEngine";

const ArrowLeftIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 19-7-7 7-7"/>
    <path d="M19 12H5"/>
  </svg>
);

export default function ParentAnalytics({ scholar, results }) {

  if (!scholar) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-5xl mb-4">📊</p>
          <p className="text-xl font-bold text-slate-700 mb-4">
            No scholar data found
          </p>
          <Link
            href="/dashboard/parent"
            className="inline-flex items-center gap-2 bg-indigo-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-indigo-700 transition-colors"
          >
            <ArrowLeftIcon size={20} />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Use created_at — quiz_results does not have a completed_at column
  const chartData = results.map((r) => ({
    date: new Date(r.created_at).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    }),
    accuracy: r.total_questions > 0
      ? Math.round((r.score / r.total_questions) * 100)
      : 0,
  }));

  const subjectMap = {};
  results.forEach((r) => {
    if (!subjectMap[r.subject]) {
      subjectMap[r.subject] = { scores: [], total: 0 };
    }
    const accuracy = r.total_questions > 0
      ? (r.score / r.total_questions) * 100
      : 0;
    subjectMap[r.subject].scores.push(accuracy);
    subjectMap[r.subject].total++;
  });

  const subjectStats = Object.entries(subjectMap).map(([subject, data]) => ({
    subject,
    avgAccuracy: Math.round(
      data.scores.reduce((a, b) => a + b, 0) / data.scores.length
    ),
    quizzesTaken: data.total,
    // SUBJECT_META[subject].emoji — fall back gracefully if subject not in meta
    icon: SUBJECT_ICONS?.[subject]?.emoji || "📚",
  }));

  // uk_11plus is retired — fall back to uk_national, then a safe default
  const currInfo = CURRICULA[scholar.curriculum]
    || CURRICULA["uk_national"]
    || { country: "🌍", name: scholar.curriculum };

  const yearLevel = scholar.year_level || scholar.year || 1;

  return (
    <div className="min-h-screen bg-slate-50 pb-24">

      <nav className="bg-white border-b border-slate-200 px-3 sm:px-6 py-3 sm:py-4 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <img src="/logo.svg" alt="LaunchPard" className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl" />
            <div>
              <h1 className="font-black text-lg text-slate-900">Analytics</h1>
              <p className="text-xs text-slate-500">{scholar.name}&apos;s Progress</p>
            </div>
          </div>
          <Link
            href="/dashboard/parent"
            className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 font-bold transition-colors"
          >
            <ArrowLeftIcon size={18} />
            <span className="hidden sm:inline">Back</span>
          </Link>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-3 sm:px-6 pt-6 sm:pt-8 space-y-4 sm:space-y-6">

        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-6 text-white">
          <h2 className="text-2xl font-black mb-2">{scholar.name}</h2>
          <div className="flex flex-wrap gap-2">
            <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-bold">
              {currInfo.country} {currInfo.name}
            </span>
            <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-bold">
              {formatGradeLabel(yearLevel, scholar.curriculum)}
            </span>
            <span className="bg-amber-400 text-amber-900 px-3 py-1 rounded-full text-sm font-black">
              ⭐ {scholar.total_xp || 0} XP
            </span>
          </div>
        </div>

        {results.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
            <p className="text-5xl mb-4">📊</p>
            <p className="text-xl font-black text-slate-700 mb-2">No Quiz Data Yet</p>
            <p className="text-slate-500">{scholar.name} hasn&apos;t completed any quizzes yet.</p>
          </div>
        )}

        {results.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200">
                <p className="text-sm font-black text-slate-500 uppercase tracking-wider mb-2">Total Quizzes</p>
                <p className="text-4xl font-black text-indigo-600">{results.length}</p>
              </div>
              <div className="bg-white rounded-2xl p-6 border border-slate-200">
                <p className="text-sm font-black text-slate-500 uppercase tracking-wider mb-2">Average Score</p>
                <p className="text-4xl font-black text-emerald-600">
                  {Math.round(
                    results.reduce(
                      (sum, r) => sum + (r.total_questions > 0 ? (r.score / r.total_questions) * 100 : 0),
                      0
                    ) / results.length
                  )}%
                </p>
              </div>
              <div className="bg-white rounded-2xl p-6 border border-slate-200">
                <p className="text-sm font-black text-slate-500 uppercase tracking-wider mb-2">Subjects</p>
                <p className="text-4xl font-black text-violet-600">{subjectStats.length}</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200">
              <h3 className="text-lg font-black text-slate-700 mb-4">Accuracy Over Time</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorAccuracy" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0"/>
                    <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 12, fontWeight: 700 }} axisLine={false} tickLine={false}/>
                    <YAxis domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 12, fontWeight: 700 }} axisLine={false} tickLine={false}/>
                    <Tooltip />
                    <Area type="monotone" dataKey="accuracy" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorAccuracy)"/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Subject breakdown */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200">
              <h3 className="text-lg font-black text-slate-700 mb-4">By Subject</h3>
              <div className="space-y-3">
                {subjectStats
                  .sort((a, b) => b.avgAccuracy - a.avgAccuracy)
                  .map(({ subject, avgAccuracy, quizzesTaken, icon }) => (
                    <div key={subject} className="flex items-center gap-4">
                      <span className="text-xl w-8 text-center">{icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-bold text-slate-700 capitalize">
                            {subject.replace(/_/g, " ")}
                          </span>
                          <span className="text-sm font-black text-slate-500 ml-2">
                            {avgAccuracy}% · {quizzesTaken} quiz{quizzesTaken !== 1 ? "zes" : ""}
                          </span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${avgAccuracy}%`,
                              background: avgAccuracy >= 75 ? "#10b981" : avgAccuracy >= 50 ? "#6366f1" : "#ef4444",
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}