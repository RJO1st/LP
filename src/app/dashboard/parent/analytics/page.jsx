"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const RocketIcon = ({ size = 24 }) => ( <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.5-1 1-4c1.5 0 3 .5 3 .5L9 12Z"/><path d="M12 15v5s1 .5 4 1c0-1.5-.5-3-.5-3L12 15Z"/></svg>);
const ArrowLeftIcon = ({ size = 24 }) => ( <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>);

export default function ParentAnalytics() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  useEffect(() => {
    const fetchStats = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from("quiz_results")
        .select(`*, scholars(name)`)
        .order('completed_at', { ascending: true });
      if (!error && data) setResults(data);
      setLoading(false);
    };
    fetchStats();
  }, [supabase]);

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-black">Loading LaunchPard Analytics...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-10">
          <Link href="/dashboard/parent" className="flex items-center gap-2 text-slate-400 font-bold hover:text-indigo-600 transition-all uppercase text-sm tracking-widest">
            <ArrowLeftIcon size={18} /> Back to Parent Portal
          </Link>
          <div className="bg-white px-6 py-2 rounded-2xl border-2 border-slate-100 shadow-sm flex items-center gap-3">
            <RocketIcon size={20} className="text-indigo-500" />
            <span className="font-black text-slate-700 uppercase tracking-tight text-sm">LaunchPard Analytics</span>
          </div>
        </header>

        <h1 className="text-4xl font-black text-slate-900 mb-10 tracking-tight">Performance Analytics</h1>
        
        <div className="bg-white p-8 md:p-12 rounded-[56px] shadow-sm border-2 border-slate-100 mb-10">
          <h3 className="text-xl font-black text-slate-800 mb-10 uppercase tracking-widest text-indigo-500 text-center">Accuracy Trend (%)</h3>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={results}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="completed_at" tickFormatter={(str) => new Date(str).toLocaleDateString()} />
                <YAxis domain={[0, 100]} />
                <Tooltip contentStyle={{ borderRadius: '24px' }} />
                <Area type="monotone" dataKey="accuracy" stroke="#4f46e5" strokeWidth={6} fill="#eef2ff" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}