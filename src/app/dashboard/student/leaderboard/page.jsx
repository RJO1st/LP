"use client";
import React, { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import Link from "next/link";

const StarIcon = ({ size = 20 }) => ( <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>);

export default function GlobalLeaderboard() {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaders = async () => {
      const { data, error } = await supabase
        .from('scholars')
        .select('name, total_xp, year')
        .order('total_xp', { ascending: false })
        .limit(10);
      if (!error && data) setLeaders(data);
      setLoading(false);
    };
    fetchLeaders();
  }, []);

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-black">Summoning Champions...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans">
      <div className="max-w-xl mx-auto">
        <header className="mb-12 text-center">
          <Link href="/student/dashboard" className="text-slate-400 font-bold hover:text-indigo-600 transition-colors uppercase text-xs tracking-widest mb-4 inline-block">← Back to Hub</Link>
          <h1 className="text-5xl font-black tracking-tight text-slate-900">Hall of Fame</h1>
          <p className="text-slate-500 font-bold">The Top 10 Scholars in the Academy.</p>
        </header>

        <div className="bg-white border-b-8 border-slate-200 rounded-[40px] overflow-hidden shadow-2xl">
          {leaders.map((s, i) => (
            <div key={i} className={`flex items-center justify-between p-6 border-b border-slate-50 ${i === 0 ? 'bg-amber-50' : i === 1 ? 'bg-slate-50' : ''}`}>
              <div className="flex items-center gap-5">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg ${i === 0 ? 'bg-amber-400 text-amber-900' : 'bg-slate-200 text-slate-500'}`}>{i + 1}</div>
                <div>
                  <div className="font-black text-xl text-slate-800">{s.name}</div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Year {s.year}</div>
                </div>
              </div>
              <div className="bg-indigo-50 text-indigo-600 font-black px-4 py-2 rounded-2xl flex items-center gap-2">
                <StarIcon /> {s.total_xp}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}