"use client";

/**
 * MultiChildComparison — side-by-side stats for families with 2+ scholars.
 *
 * Shows only when `scholars.length >= 2`.
 * Each row: scholar avatar emoji, name, streak, mastery %, readiness score,
 * subjects with progress bars, and a nudge if a scholar hasn't been active.
 *
 * Props:
 *   scholars  [{id, name, curriculum, avatar}]  list of scholars
 *   supabase  object  — browser Supabase client for live data fetch
 */

import React, { useEffect, useState } from "react";

function toDateStr(d) {
  return d.toISOString().slice(0, 10);
}

async function fetchScholarStats(supabase, scholarId) {
  const today = toDateStr(new Date());
  const thirtyAgo = new Date();
  thirtyAgo.setDate(thirtyAgo.getDate() - 30);

  const [masteryRes, snapshotRes, activityRes] = await Promise.all([
    supabase
      .from("scholar_topic_mastery")
      .select("p_mastery, subject")
      .eq("scholar_id", scholarId),
    supabase
      .from("scholar_readiness_snapshot")
      .select("overall_score, snapshot_date")
      .eq("scholar_id", scholarId)
      .order("snapshot_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("exam_answers")
      .select("created_at")
      .eq("scholar_id", scholarId)
      .gte("created_at", thirtyAgo.toISOString()),
  ]);

  const topics = masteryRes.data || [];
  const avgMastery = topics.length
    ? topics.reduce((s, t) => s + (t.p_mastery ?? 0), 0) / topics.length
    : 0;

  // Aggregate mastery per subject
  const bySubject = {};
  topics.forEach(({ subject, p_mastery }) => {
    if (!bySubject[subject]) bySubject[subject] = { sum: 0, count: 0 };
    bySubject[subject].sum += (p_mastery ?? 0);
    bySubject[subject].count++;
  });
  const subjectMastery = Object.entries(bySubject).map(([sub, v]) => ({
    subject: sub,
    avg: v.sum / v.count,
  })).sort((a, b) => b.avg - a.avg);

  // Streak
  const activityMap = {};
  (activityRes.data || []).forEach(({ created_at }) => {
    const d = toDateStr(new Date(created_at));
    activityMap[d] = true;
  });
  let streak = 0;
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    if (activityMap[toDateStr(d)]) streak++;
    else if (i > 0) break;
  }

  // Last active
  const dates = Object.keys(activityMap).sort().reverse();
  const lastActive = dates[0] || null;

  return {
    avgMastery,
    subjectMastery: subjectMastery.slice(0, 4),
    readinessScore: snapshotRes.data?.overall_score ?? null,
    streak,
    lastActive,
    totalTopics: topics.length,
  };
}

const SUBJECT_LABELS = {
  mathematics: "Maths",
  english: "English",
  english_language: "English",
  science: "Science",
  biology: "Biology",
  chemistry: "Chemistry",
  physics: "Physics",
  history: "History",
  geography: "Geography",
  computing: "Computing",
};

function subjectLabel(s) {
  return SUBJECT_LABELS[s] || s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function MasteryBar({ pct }) {
  const colour = pct >= 0.8 ? "#34d399" : pct >= 0.55 ? "#6366f1" : pct >= 0.3 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.round(pct * 100)}%`, backgroundColor: colour }}
        />
      </div>
      <span className="text-[10px] font-bold text-slate-400 w-7 text-right">
        {Math.round(pct * 100)}%
      </span>
    </div>
  );
}

function ScholarCard({ scholar }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Data fetching is done by the parent and passed down — this is a display-only card
    setLoading(false);
  }, [scholar]);

  const s = scholar.stats;
  const inactive = s?.lastActive
    ? (new Date() - new Date(s.lastActive)) / 86400000 > 3
    : true;

  const gradeColour =
    s?.readinessScore == null ? "#64748b"
      : s.readinessScore >= 85 ? "#34d399"
      : s.readinessScore >= 70 ? "#6366f1"
      : s.readinessScore >= 50 ? "#f59e0b"
      : "#ef4444";

  return (
    <div className="bg-slate-900/60 border border-white/10 rounded-xl p-4 flex flex-col gap-3 min-w-[200px]">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-xl">
          {scholar.avatar?.base ? "🚀" : "👤"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-white truncate">{scholar.name}</p>
          <p className="text-[10px] text-slate-400 font-semibold capitalize">
            {scholar.curriculum?.replace(/_/g, " ") || "—"}
          </p>
        </div>
        {inactive && (
          <span title="No activity in 3+ days" className="text-base">⚠️</span>
        )}
      </div>

      {/* Stats row */}
      {s && (
        <>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-base font-black" style={{ color: "#f59e0b" }}>
                {s.streak}
              </p>
              <p className="text-[10px] text-slate-500">🔥 Streak</p>
            </div>
            <div>
              <p className="text-base font-black text-indigo-400">
                {Math.round((s.avgMastery ?? 0) * 100)}%
              </p>
              <p className="text-[10px] text-slate-500">Mastery</p>
            </div>
            <div>
              <p
                className="text-base font-black"
                style={{ color: gradeColour }}
              >
                {s.readinessScore != null ? Math.round(s.readinessScore) : "—"}
              </p>
              <p className="text-[10px] text-slate-500">Ready</p>
            </div>
          </div>

          {/* Subject breakdown */}
          {s.subjectMastery.length > 0 && (
            <div className="space-y-1.5">
              {s.subjectMastery.map(({ subject, avg }) => (
                <div key={subject}>
                  <p className="text-[10px] text-slate-400 mb-0.5">{subjectLabel(subject)}</p>
                  <MasteryBar pct={avg} />
                </div>
              ))}
            </div>
          )}

          {/* Nudge */}
          {inactive && (
            <div className="bg-amber-500/10 border border-amber-500/25 rounded-lg px-2.5 py-2">
              <p className="text-[11px] text-amber-400 font-bold">
                No activity in {s.lastActive
                  ? `${Math.floor((new Date() - new Date(s.lastActive)) / 86400000)} days`
                  : "a while"
                } — give them a nudge! 💬
              </p>
            </div>
          )}
        </>
      )}

      {!s && (
        <div className="text-center py-4 text-slate-500 text-xs">No data yet</div>
      )}
    </div>
  );
}

export default function MultiChildComparison({ scholars = [], supabase }) {
  const [enriched, setEnriched] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!scholars.length || !supabase) { setLoading(false); return; }

    (async () => {
      const results = await Promise.all(
        scholars.map(async (sc) => ({
          ...sc,
          stats: await fetchScholarStats(supabase, sc.id).catch(() => null),
        }))
      );
      setEnriched(results);
      setLoading(false);
    })();
  }, [scholars.map(s => s.id).join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  if (scholars.length < 2) return null;

  if (loading) {
    return (
      <div className="mb-6">
        <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">
          Family Overview
        </p>
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(scholars.length, 3)}, 1fr)` }}>
          {scholars.map((s) => (
            <div key={s.id} className="bg-slate-900/60 border border-white/10 rounded-xl p-4 h-48 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // Sort: least active first (needs attention)
  const sorted = [...enriched].sort((a, b) => {
    const aStreak = a.stats?.streak ?? 0;
    const bStreak = b.stats?.streak ?? 0;
    return aStreak - bStreak;
  });

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">👨‍👩‍👧‍👦</span>
        <p className="text-xs font-black text-slate-200 uppercase tracking-wider">Family Overview</p>
        <span className="text-[10px] text-slate-500 font-semibold">{scholars.length} scholars</span>
      </div>

      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: `repeat(${Math.min(scholars.length, 3)}, 1fr)` }}
      >
        {sorted.map((sc) => (
          <ScholarCard key={sc.id} scholar={sc} />
        ))}
      </div>
    </div>
  );
}
