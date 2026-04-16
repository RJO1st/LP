"use client";

/**
 * StreakHeatmap — GitHub-style 90-day activity contribution graph.
 *
 * Streak Shield: one missed day per week (Mon–Sun) is forgiven.
 * Shield state is stored in localStorage to survive page reloads.
 *
 * Props:
 *   scholarId   {string}
 *   supabase    {object}  - browser supabase client
 */

import React, { useEffect, useState, useRef } from "react";

const SHIELD_KEY = (id) => `lp_streak_shield_${id}`;

// Returns "YYYY-MM-DD" for a Date
function toDateStr(d) {
  return d.toISOString().slice(0, 10);
}

// Returns a map: "YYYY-MM-DD" → activityCount
async function fetchActivityMap(supabase, scholarId) {
  const since = new Date();
  since.setDate(since.getDate() - 89); // last 90 days

  const { data } = await supabase
    .from("exam_answers")
    .select("created_at")
    .eq("scholar_id", scholarId)
    .gte("created_at", since.toISOString());

  const map = {};
  (data || []).forEach(({ created_at }) => {
    const d = toDateStr(new Date(created_at));
    map[d] = (map[d] || 0) + 1;
  });
  return map;
}

// Compute streak from activityMap (shieldUsed flag consumed here)
function computeStreak(activityMap, shieldWeek) {
  const today = new Date();
  let streak = 0;
  let shieldConsumedThisWeek = false;

  for (let i = 0; i < 90; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const ds = toDateStr(d);
    const active = !!(activityMap[ds]);

    if (active) {
      streak++;
    } else if (i === 0) {
      // Today not active yet — grace: don't break streak for today
      continue;
    } else {
      // Missed day — check shield
      const weekStr = getWeekStr(d);
      if (!shieldConsumedThisWeek && shieldWeek !== weekStr) {
        shieldConsumedThisWeek = true;
        // Forgiven — continue streak
        streak++;
      } else {
        break;
      }
    }
  }
  return { streak, shieldConsumedThisWeek };
}

function getWeekStr(date) {
  const d = new Date(date);
  const day = d.getDay() === 0 ? 6 : d.getDay() - 1; // Mon = 0
  d.setDate(d.getDate() - day);
  return toDateStr(d); // Monday of week
}

// Build the 90 day cells in rows of 7 (newest on the right)
function buildGrid(activityMap) {
  const today = new Date();
  const cells = [];
  for (let i = 89; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const ds = toDateStr(d);
    cells.push({ ds, count: activityMap[ds] || 0, isToday: i === 0 });
  }
  return cells;
}

function cellColour(count) {
  if (count === 0)   return "#1e293b";  // dark slate — empty
  if (count < 5)     return "#312e81";  // indigo-900
  if (count < 15)    return "#4338ca";  // indigo-700
  if (count < 30)    return "#6366f1";  // indigo-500
  return "#a5b4fc";                     // indigo-300 — very active
}

export default function StreakHeatmap({ scholarId, supabase }) {
  const [activityMap, setActivityMap]   = useState({});
  const [streak, setStreak]             = useState(0);
  const [shieldAvailable, setShieldAvail] = useState(true);
  const [loading, setLoading]           = useState(true);
  const [tooltip, setTooltip]           = useState(null); // { ds, count, x, y }
  const tooltipRef                      = useRef(null);

  useEffect(() => {
    if (!scholarId || !supabase) return;

    (async () => {
      const map = await fetchActivityMap(supabase, scholarId);
      setActivityMap(map);

      // Load shield state from localStorage
      let shieldWeek = null;
      try {
        const raw = localStorage.getItem(SHIELD_KEY(scholarId));
        if (raw) shieldWeek = JSON.parse(raw).week;
      } catch {}

      const today = new Date();
      const currentWeek = getWeekStr(today);
      const { streak: s, shieldConsumedThisWeek } = computeStreak(map, shieldWeek);
      setStreak(s);

      // Shield is available if not yet used this week
      const used = shieldWeek === currentWeek;
      if (shieldConsumedThisWeek && !used) {
        // Auto-consume shield
        localStorage.setItem(SHIELD_KEY(scholarId), JSON.stringify({ week: currentWeek }));
        setShieldAvail(false);
      } else {
        setShieldAvail(!used);
      }

      setLoading(false);
    })();
  }, [scholarId, supabase]);

  const cells = buildGrid(activityMap);

  // Weeks: group cells into columns of 7
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  const currentWeek = getWeekStr(new Date());

  if (loading) {
    return (
      <div className="bg-slate-900/60 border border-white/10 rounded-xl p-4 animate-pulse">
        <div className="h-4 w-32 bg-slate-700 rounded mb-3" />
        <div className="h-20 bg-slate-800 rounded" />
      </div>
    );
  }

  return (
    <div className="bg-slate-900/60 border border-white/10 rounded-xl p-4 relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔥</span>
          <div>
            <p className="text-sm font-black text-white leading-none">{streak} day streak</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Last 90 days</p>
          </div>
        </div>

        {/* Shield indicator */}
        <div
          title={shieldAvailable
            ? "Streak Shield available — one missed day this week is forgiven"
            : "Shield used this week"}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition-all ${
            shieldAvailable
              ? "bg-amber-500/20 border border-amber-500/40 text-amber-400"
              : "bg-slate-800 border border-slate-700 text-slate-500"
          }`}
        >
          <span>{shieldAvailable ? "🛡️" : "🔓"}</span>
          <span className="hidden sm:inline">{shieldAvailable ? "Shield ready" : "Shield used"}</span>
        </div>
      </div>

      {/* Heatmap grid */}
      <div
        className="overflow-x-auto pb-1"
        onMouseLeave={() => setTooltip(null)}
      >
        <div style={{ display: "flex", gap: 3 }}>
          {weeks.map((week, wi) => (
            <div key={wi} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {week.map((cell) => (
                <div
                  key={cell.ds}
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setTooltip({ ds: cell.ds, count: cell.count, x: rect.left, y: rect.top });
                  }}
                  style={{
                    width: 11,
                    height: 11,
                    borderRadius: 2,
                    backgroundColor: cellColour(cell.count),
                    border: cell.isToday ? "1.5px solid #6366f1" : "1px solid rgba(255,255,255,0.04)",
                    cursor: "default",
                    flexShrink: 0,
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          ref={tooltipRef}
          className="fixed z-50 pointer-events-none bg-slate-800 border border-slate-700 text-white text-[11px] font-semibold px-2 py-1 rounded-lg shadow-lg"
          style={{ left: tooltip.x + 16, top: tooltip.y - 8 }}
        >
          <span className="text-slate-300">{tooltip.ds}</span>
          {" — "}
          {tooltip.count === 0
            ? <span className="text-slate-500">No activity</span>
            : <span className="text-indigo-300">{tooltip.count} answers</span>
          }
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-2 mt-3 justify-end">
        <span className="text-[10px] text-slate-500">Less</span>
        {["#1e293b", "#312e81", "#4338ca", "#6366f1", "#a5b4fc"].map((c) => (
          <div key={c} style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: c }} />
        ))}
        <span className="text-[10px] text-slate-500">More</span>
      </div>
    </div>
  );
}
