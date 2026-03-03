"use client";
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

// ── Icons ────────────────────────────────────────────────────────────────────
const StarIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const TrophyIcon = () => (
  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M6 9H4a2 2 0 0 1-2-2V5h4" />
    <path d="M18 9h2a2 2 0 0 0 2-2V5h-4" />
    <path d="M12 17v4" />
    <path d="M8 21h8" />
    <path d="M6 5h12v6a6 6 0 0 1-12 0V5Z" />
  </svg>
);

// ── Rank display ─────────────────────────────────────────────────────────────
const MEDALS = ["🥇", "🥈", "🥉"];

const RankBadge = ({ rank }) => {
  if (rank < 3) {
    return (
      <span className="text-2xl leading-none">{MEDALS[rank]}</span>
    );
  }
  return (
    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-500">
      {rank + 1}
    </div>
  );
};

// ── Row skeleton ─────────────────────────────────────────────────────────────
const SkeletonRow = () => (
  <div className="flex items-center justify-between p-6 border-b border-slate-50">
    <div className="flex items-center gap-5">
      <div className="w-10 h-10 rounded-full bg-slate-100 animate-pulse" />
      <div className="space-y-2">
        <div className="h-4 w-32 rounded bg-slate-100 animate-pulse" />
        <div className="h-3 w-16 rounded bg-slate-100 animate-pulse" />
      </div>
    </div>
    <div className="h-9 w-24 rounded-2xl bg-slate-100 animate-pulse" />
  </div>
);

// ── Main component ───────────────────────────────────────────────────────────
export default function GlobalLeaderboard() {
  const [leaders, setLeaders]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [yearFilter, setYearFilter] = useState("all");

  useEffect(() => {
    const fetchLeaders = async () => {
      setLoading(true);
      setError(null);

      let query = supabase
        .from("scholars")
        .select("id, name, total_xp, year, avatar")
        .order("total_xp", { ascending: false })
        .limit(20); // fetch 20 so year filter still gives 10

      if (yearFilter !== "all") {
        query = query.eq("year", Number(yearFilter));
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setLeaders((data ?? []).slice(0, 10));
      }
      setLoading(false);
    };

    fetchLeaders();
  }, [yearFilter]);

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans">
      <div className="max-w-xl mx-auto">

        {/* ── Header ───────────────────────────────────────────────────── */}
        <header className="mb-10 text-center">
          <Link
            href="/dashboard/student"
            className="inline-block mb-5 text-slate-400 font-bold hover:text-indigo-600
                       transition-colors uppercase text-xs tracking-widest"
          >
            ← Back to Hub
          </Link>

          <div className="flex items-center justify-center gap-3 mb-2">
            <span className="text-indigo-500"><TrophyIcon /></span>
            <h1 className="text-5xl font-black tracking-tight text-slate-900">
              Hall of Fame
            </h1>
            <span className="text-indigo-500"><TrophyIcon /></span>
          </div>
          <p className="text-slate-500 font-bold">
            The Academy's Top 10 Scholars — ranked by XP earned.
          </p>
        </header>

        {/* ── Year filter ──────────────────────────────────────────────── */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {["all", "3", "4", "5", "6"].map((y) => (
            <button
              key={y}
              onClick={() => setYearFilter(y)}
              className={`px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wide transition-all
                ${yearFilter === y
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                  : "bg-white text-slate-500 border border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
                }`}
            >
              {y === "all" ? "All Years" : `Year ${y}`}
            </button>
          ))}
        </div>

        {/* ── Board ────────────────────────────────────────────────────── */}
        <div className="bg-white border-b-8 border-slate-200 rounded-[32px] overflow-hidden shadow-2xl">

          {/* Error state */}
          {error && (
            <div className="p-8 text-center">
              <p className="text-2xl mb-2">⚠️</p>
              <p className="font-bold text-slate-600">Could not load leaderboard.</p>
              <p className="text-sm text-slate-400 mt-1">{error}</p>
            </div>
          )}

          {/* Loading state */}
          {loading && !error && (
            <>
              {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
            </>
          )}

          {/* Empty state */}
          {!loading && !error && leaders.length === 0 && (
            <div className="p-12 text-center">
              <p className="text-4xl mb-3">🚀</p>
              <p className="font-black text-lg text-slate-700">No scholars yet!</p>
              <p className="text-slate-400 text-sm mt-1">
                {yearFilter !== "all"
                  ? `No scholars in Year ${yearFilter} have earned XP yet.`
                  : "Complete quests to claim your spot."}
              </p>
            </div>
          )}

          {/* Leaderboard rows */}
          {!loading && !error && leaders.map((scholar, i) => (
            <div
              key={scholar.id}
              className={`flex items-center justify-between p-5 border-b border-slate-50
                last:border-b-0 transition-colors
                ${i === 0 ? "bg-amber-50"  : ""}
                ${i === 1 ? "bg-slate-50"  : ""}
                ${i === 2 ? "bg-orange-50" : ""}
                hover:bg-indigo-50/40`}
            >
              {/* Left: rank + name */}
              <div className="flex items-center gap-4">
                <RankBadge rank={i} />
                <div className="flex flex-col">
                  <p className="font-bold text-slate-900">{scholar.name}</p>
                  <p className="text-sm text-slate-400">Year {scholar.year}</p>
                </div>
              </div>

              {/* Right: XP badge */}
              <div className="flex items-center gap-2 bg-indigo-100 px-4 py-2 rounded-2xl">
                <StarIcon size={16} />
                <span className="font-black text-indigo-600">{scholar.total_xp}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}