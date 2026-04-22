"use client";
/**
 * ProgressDashboard.jsx
 * Scholar-facing analytics dashboard. Shows mastery per subject/topic,
 * learning path progress, narrative realm map, and activity calendar.
 *
 * → src/components/analytics/ProgressDashboard.jsx
 */

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { supabaseKeys } from "@/lib/env";
import {
  computeSubjectOverview,
  computeTopicHeatmap,
  computeProgressTrend,
  buildActivityCalendar,
} from "@/lib/analyticsEngine";
import {
  REALMS,
  getRealmForSubject,
  getCurrentChapter,
  getUnlockedRealms,
} from "@/lib/narrativeEngine";
import { estimateExamReadiness } from "@/lib/learningPathEngine";

// Mini recharts import for trend line
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function ProgressDashboard({ scholar }) {
  const [supabase]       = useState(() => createBrowserClient(
    supabaseKeys.url(),
    supabaseKeys.publishable()
  ));
  const [mastery,        setMastery]        = useState([]);
  const [sessionAnswers, setSessionAnswers] = useState([]);
  const [narrativeState, setNarrativeState] = useState(null);
  const [learningPath,   setLearningPath]   = useState(null);
  const [activeSubject,  setActiveSubject]  = useState(null);
  const [loading,        setLoading]        = useState(true);

  useEffect(() => {
    if (!scholar?.id) return;
    loadData();
  }, [scholar?.id]);

  async function loadData() {
    setLoading(true);
    const [masteryRes, answersRes, narrativeRes, pathRes] = await Promise.all([
      supabase.from("scholar_topic_mastery").select("*").eq("scholar_id", scholar.id),
      supabase.from("session_answers").select("*").eq("scholar_id", scholar.id)
        .gte("answered_at", new Date(Date.now() - 30 * 86400000).toISOString()),
      supabase.from("narrative_state").select("*").eq("scholar_id", scholar.id).single(),
      supabase.from("scholar_learning_path").select("*").eq("scholar_id", scholar.id),
    ]);

    setMastery(masteryRes.data ?? []);
    setSessionAnswers(answersRes.data ?? []);
    setNarrativeState(narrativeRes.data);
    setLearningPath(pathRes.data?.[0]);
    setActiveSubject(
      (masteryRes.data?.[0]?.subject) ?? null
    );
    setLoading(false);
  }

  if (loading) return <LoadingState />;

  const subjectOverview  = computeSubjectOverview(mastery);
  const trend            = computeProgressTrend(sessionAnswers);
  const calendar         = buildActivityCalendar(sessionAnswers);
  const unlockedRealms   = getUnlockedRealms(narrativeState?.story_points ?? 0);

  const activeMastery    = mastery.filter(r => r.subject === activeSubject);
  const heatmap          = computeTopicHeatmap(activeMastery);
  const examReadiness    = estimateExamReadiness(activeMastery, activeSubject);

  const totalQuestions   = sessionAnswers.length;
  const accuracy         = totalQuestions
    ? Math.round(sessionAnswers.filter(a => a.answered_correctly).length / totalQuestions * 100)
    : 0;

  return (
    <div className="min-h-screen bg-[#0a0e27] text-white p-4 md:p-6 space-y-6">

      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Mission Control</h1>
          <p className="text-slate-400 text-sm">{scholar?.name}'s progress across all subjects</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black text-yellow-400">
            ⭐ {narrativeState?.story_points ?? 0}
          </div>
          <div className="text-xs text-slate-400">Story Points</div>
        </div>
      </div>

      {/* ── QUICK STATS ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Questions",   value: totalQuestions,               icon: "📝", colour: "from-indigo-500 to-purple-600" },
          { label: "Accuracy",    value: `${accuracy}%`,               icon: "🎯", colour: "from-emerald-500 to-teal-600"  },
          { label: "Topics",      value: mastery.length,               icon: "📚", colour: "from-pink-500 to-rose-600"     },
          { label: "Mastered",    value: mastery.filter(r => r.mastery_score >= 0.8).length, icon: "⭐", colour: "from-amber-400 to-orange-500" },
        ].map(stat => (
          <div key={stat.label} className={`bg-gradient-to-br ${stat.colour} rounded-2xl p-4 text-center`}>
            <div className="text-2xl mb-1">{stat.icon}</div>
            <div className="text-2xl font-black">{stat.value}</div>
            <div className="text-xs opacity-80">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* ── NARRATIVE WORLD MAP ─────────────────────────────────────── */}
      <div className="bg-slate-900/80 rounded-2xl border border-slate-700 p-5">
        <h2 className="font-black text-lg mb-4">🗺️ My Universe</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.values(REALMS).map(realm => {
            const unlocked  = unlockedRealms.includes(realm.id);
            const realmMastery = mastery.filter(r => realm.subjects.includes(r.subject));
            const avgScore  = realmMastery.length
              ? realmMastery.reduce((s, r) => s + r.mastery_score, 0) / realmMastery.length
              : 0;
            const pct       = Math.round(avgScore * 100);

            return (
              <div
                key={realm.id}
                onClick={() => unlocked && setActiveSubject(realm.subjects[0])}
                className={`relative rounded-xl border p-3 cursor-pointer transition-all ${
                  unlocked
                    ? "border-slate-600 hover:border-indigo-400 bg-slate-800/60"
                    : "border-slate-700 bg-slate-900/40 opacity-50"
                }`}
              >
                <div className="text-2xl mb-2">{realm.icon}</div>
                <div className="font-bold text-sm">{realm.name}</div>
                <div className="text-xs text-slate-400 mb-2">{realm.tagline}</div>
                {unlocked ? (
                  <>
                    <div className="w-full bg-slate-700 rounded-full h-1.5 mb-1">
                      <div
                        className="h-1.5 rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: realm.colour }}
                      />
                    </div>
                    <div className="text-xs text-slate-300">{pct}% explored</div>
                  </>
                ) : (
                  <div className="text-xs text-slate-500">
                    🔒 {realm.unlockAt} story points
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── SUBJECT OVERVIEW ────────────────────────────────────────── */}
      <div className="bg-slate-900/80 rounded-2xl border border-slate-700 p-5">
        <h2 className="font-black text-lg mb-4">📊 Subject Mastery</h2>
        <div className="space-y-3">
          {subjectOverview.map(s => (
            <div
              key={s.subject}
              onClick={() => setActiveSubject(s.subject)}
              className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all ${
                activeSubject === s.subject
                  ? "bg-indigo-500/20 border border-indigo-500/50"
                  : "hover:bg-slate-800/60"
              }`}
            >
              <div className="text-2xl w-8 text-center">{s.emoji}</div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm">{s.displayName}</span>
                  <span className="text-sm font-black" style={{ color: s.colour }}>
                    {s.avgMastery}%
                  </span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{ width: `${s.avgMastery}%`, backgroundColor: s.colour }}
                  />
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  {s.topicsMastered}/{s.topicsTotal} topics mastered
                </div>
              </div>
            </div>
          ))}
          {!subjectOverview.length && (
            <p className="text-slate-500 text-sm text-center py-4">
              Complete your first quiz to see subject mastery here.
            </p>
          )}
        </div>
      </div>

      {/* ── TOPIC HEATMAP (active subject) ──────────────────────────── */}
      {activeSubject && heatmap.length > 0 && (
        <div className="bg-slate-900/80 rounded-2xl border border-slate-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-black text-lg">
              🔬 {activeSubject.replace(/_/g, ' ')} — Topic Detail
            </h2>
            <div className="text-sm font-bold px-3 py-1 rounded-full"
              style={{ backgroundColor: examReadiness.colour + '33', color: examReadiness.colour }}>
              {examReadiness.label} — {examReadiness.score}%
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {heatmap.map(t => (
              <div key={t.topic} className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/40">
                <div className="text-lg">{t.emoji}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold capitalize">{t.displayName}</span>
                    <span className="text-xs font-black" style={{ color: t.colour }}>{t.mastery}%</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-1 mt-1">
                    <div
                      className="h-1 rounded-full"
                      style={{ width: `${t.mastery}%`, backgroundColor: t.colour }}
                    />
                  </div>
                </div>
                <div className="text-xs text-slate-500 w-8 text-center">{t.timeSeen}×</div>
              </div>
            ))}
          </div>
          {examReadiness.topicsNeeded.length > 0 && (
            <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
              <p className="text-xs text-amber-300 font-bold mb-1">📋 Topics to focus on:</p>
              <p className="text-xs text-slate-300">
                {examReadiness.topicsNeeded.slice(0, 4).join(" · ")}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── ACCURACY TREND ──────────────────────────────────────────── */}
      {trend.length > 2 && (
        <div className="bg-slate-900/80 rounded-2xl border border-slate-700 p-5">
          <h2 className="font-black text-lg mb-4">📈 Accuracy Trend (30 days)</h2>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={trend}>
              <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10 }} unit="%" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                labelStyle={{ color: '#e2e8f0' }}
                formatter={(v) => [`${v}%`, 'Accuracy']}
              />
              <Line
                type="monotone" dataKey="accuracy" stroke="#6366f1"
                strokeWidth={2} dot={{ fill: '#6366f1', r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── ACTIVITY CALENDAR ───────────────────────────────────────── */}
      <div className="bg-slate-900/80 rounded-2xl border border-slate-700 p-5">
        <h2 className="font-black text-lg mb-4">📅 Activity (Last 52 Weeks)</h2>
        <ActivityCalendar data={calendar} />
      </div>

    </div>
  );
}

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

function ActivityCalendar({ data }) {
  const colours = ['#1e293b', '#312e81', '#4338ca', '#6366f1', '#a5b4fc'];

  // Group into weeks
  const weeks = [];
  for (let i = 0; i < data.length; i += 7) {
    weeks.push(data.slice(i, i + 7));
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-0.5 min-w-max">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-0.5">
            {week.map((day, di) => (
              <div
                key={di}
                title={`${day.date}: ${day.count} questions`}
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: colours[day.intensity] }}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-3 text-xs text-slate-400">
        <span>Less</span>
        {colours.map((c, i) => (
          <div key={i} className="w-3 h-3 rounded-sm" style={{ backgroundColor: c }} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-[#0a0e27] flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-3 animate-pulse">🚀</div>
        <p className="text-slate-400">Loading mission data...</p>
      </div>
    </div>
  );
}
