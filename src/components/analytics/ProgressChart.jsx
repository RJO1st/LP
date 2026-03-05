"use client";
// src/components/analytics/ProgressChart.jsx
// Dynamic — reads scholar.joined_at and scholar.curriculum, no hardcoded Y1–Y6
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { getCurriculum, getSubjectMeta } from "../../lib/curriculumConfig";

function getMonthsBetween(start, end) {
  const months = [];
  const cur    = new Date(start.getFullYear(), start.getMonth(), 1);
  const finish = new Date(end.getFullYear(),   end.getMonth(),   1);
  while (cur <= finish) {
    months.push({
      key:   `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}`,
      label: cur.toLocaleDateString("en-GB", { month: "short", year: "2-digit" }),
    });
    cur.setMonth(cur.getMonth() + 1);
  }
  return months;
}

export default function ProgressChart({ scholar }) {
  const [data,    setData]    = useState({});
  const [loading, setLoading] = useState(true);

  const curriculum = scholar?.curriculum ?? "uk_11plus";
  const currConfig = getCurriculum(curriculum);
  const subjects   = currConfig.subjects;
  const joinedAt   = scholar?.joined_at ? new Date(scholar.joined_at) : new Date(Date.now() - 4 * 30 * 864e5);
  const months     = getMonthsBetween(joinedAt, new Date());

  useEffect(() => {
    if (!scholar?.id) return;
    fetchChartData();
  }, [scholar?.id]);

  const fetchChartData = async () => {
    setLoading(true);
    const { data: results } = await supabase
      .from("quiz_results")
      .select("score, total_questions, completed_at, details")
      .eq("scholar_id", scholar.id)
      .gte("completed_at", joinedAt.toISOString())
      .order("completed_at");

    // Build map: month → subject → { correct, total }
    const map = {};
    for (const r of results ?? []) {
      const month = r.completed_at.slice(0, 7);
      let details = r.details;
      if (typeof details === "string") { try { details = JSON.parse(details); } catch { continue; } }
      for (const d of details ?? []) {
        const sub = d.subject;
        if (!subjects.includes(sub)) continue;
        if (!map[month]) map[month] = {};
        if (!map[month][sub]) map[month][sub] = { correct: 0, total: 0 };
        map[month][sub].total  += 1;
        if (d.correct) map[month][sub].correct += 1;
      }
    }
    setData(map);
    setLoading(false);
  };

  if (loading) return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 h-48 flex items-center justify-center animate-pulse">
      <span className="text-slate-300 font-black text-sm">Loading chart…</span>
    </div>
  );

  if (months.length === 0 || Object.keys(data).length === 0) return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 text-center">
      <p className="text-4xl mb-2">📈</p>
      <p className="font-black text-slate-700">No quiz data yet</p>
      <p className="text-sm text-slate-400 mt-1">Complete sessions to see your progress chart</p>
    </div>
  );

  const BAR_H = 120;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-black text-slate-800 text-sm">📈 Progress Over Time</h3>
          <p className="text-[10px] font-bold text-slate-400">
            Since {joinedAt.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
            {" · "}{currConfig.name}
          </p>
        </div>
        {/* Legend */}
        <div className="flex flex-wrap gap-2 justify-end">
          {subjects.map(s => {
            const m = getSubjectMeta(s);
            return (
              <div key={s} className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${m.tw.dot}`}/>
                <span className="text-[9px] font-bold text-slate-500">{m.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chart */}
      <div className="overflow-x-auto">
        <div className="flex items-end gap-2 min-w-max" style={{ height: BAR_H + 32 }}>
          {months.map(({ key, label }) => {
            const monthData = data[key] || {};
            return (
              <div key={key} className="flex flex-col items-center gap-0.5">
                <div className="flex items-end gap-0.5" style={{ height: BAR_H }}>
                  {subjects.map(sub => {
                    const sd  = monthData[sub];
                    const pct = sd?.total > 0 ? Math.round((sd.correct / sd.total) * 100) : 0;
                    const h   = sd ? Math.max(4, (pct / 100) * BAR_H) : 0;
                    const m   = getSubjectMeta(sub);
                    return (
                      <div
                        key={sub}
                        title={sd ? `${m.label}: ${pct}% (${sd.correct}/${sd.total})` : "No data"}
                        className={`w-4 rounded-t-sm transition-all ${sd ? m.tw.dot : "bg-slate-100"}`}
                        style={{ height: h > 0 ? h : 2 }}
                      />
                    );
                  })}
                </div>
                <span className="text-[9px] font-bold text-slate-400 rotate-45 origin-top-left ml-2">
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-3 mt-3 pt-3 border-t border-slate-50">
        {subjects.map(sub => {
          const totals = Object.values(data)
            .flatMap(m => m[sub] ? [m[sub]] : [])
            .reduce((a, c) => ({ correct: a.correct + c.correct, total: a.total + c.total }), { correct: 0, total: 0 });
          const pct  = totals.total > 0 ? Math.round((totals.correct / totals.total) * 100) : null;
          const meta = getSubjectMeta(sub);
          return (
            <div key={sub} className={`flex-1 text-center p-2 rounded-xl ${meta.tw.bg} border ${meta.tw.border}`}>
              <div className={`text-sm font-black ${meta.tw.text}`}>{pct !== null ? `${pct}%` : "—"}</div>
              <div className={`text-[9px] font-bold ${meta.tw.text} opacity-70`}>{meta.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}