"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CURRICULA, SUBJECT_ICONS, formatGradeLabel } from "@/lib/gamificationEngine";

const RocketIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
    <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
  </svg>
);

const ArrowLeftIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>
  </svg>
);

export default function ParentAnalytics() {
  const searchParams = useSearchParams();
  const scholarId = searchParams.get('scholar');
  
  const [scholar, setScholar] = useState(null);
  const [results, setResults] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [subjectStats, setSubjectStats] = useState([]);
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  useEffect(() => {
    fetchAnalytics();
  }, [scholarId]);

  const fetchAnalytics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      let scholarQuery = supabase
        .from('scholars')
        .select('*')
        .eq('parent_id', user.id);

      if (scholarId) {
        scholarQuery = scholarQuery.eq('id', scholarId);
      }

      const { data: scholarData } = await scholarQuery.single();

      if (!scholarData) {
        setLoading(false);
        return;
      }

      setScholar(scholarData);

      const { data: resultsData } = await supabase
        .from('quiz_results')
        .select('*')
        .eq('scholar_id', scholarData.id)
        .order('completed_at', { ascending: true });

      setResults(resultsData || []);

      if (resultsData && resultsData.length > 0) {
        const timeData = resultsData.map(r => ({
          date: new Date(r.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
          accuracy: Math.round((r.score / r.total_questions) * 100)
        }));
        setChartData(timeData);

        const subjectMap = {};
        resultsData.forEach(r => {
          if (!subjectMap[r.subject]) {
            subjectMap[r.subject] = { scores: [], total: 0 };
          }
          const accuracy = (r.score / r.total_questions) * 100;
          subjectMap[r.subject].scores.push(accuracy);
          subjectMap[r.subject].total++;
        });

        const stats = Object.entries(subjectMap).map(([subject, data]) => ({
          subject,
          avgAccuracy: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length),
          quizzesTaken: data.total,
          icon: SUBJECT_ICONS[subject] || '📚'
        }));

        setSubjectStats(stats);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-bold">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!scholar) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-xl font-bold text-slate-700 mb-4">No scholar data found</p>
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

  const currInfo = CURRICULA[scholar.curriculum] || CURRICULA.uk_11plus;
  const yearLevel = scholar.year_level || scholar.year || 5;

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      
      <nav className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
              <RocketIcon size={20} />
            </div>
            <div>
              <h1 className="font-black text-lg text-slate-900">Analytics</h1>
              <p className="text-xs text-slate-500">{scholar.name}'s Progress</p>
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

      <main className="max-w-6xl mx-auto px-6 pt-8 space-y-6">
        
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
            <p className="text-slate-500">
              {scholar.name} hasn't completed any quizzes yet.
            </p>
          </div>
        )}

        {results.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200">
                <p className="text-sm font-black text-slate-500 uppercase tracking-wider mb-2">
                  Total Quizzes
                </p>
                <p className="text-4xl font-black text-indigo-600">{results.length}</p>
              </div>
              
              <div className="bg-white rounded-2xl p-6 border border-slate-200">
                <p className="text-sm font-black text-slate-500 uppercase tracking-wider mb-2">
                  Average Score
                </p>
                <p className="text-4xl font-black text-emerald-600">
                  {Math.round(
                    results.reduce((sum, r) => sum + (r.score / r.total_questions) * 100, 0) / results.length
                  )}%
                </p>
              </div>
              
              <div className="bg-white rounded-2xl p-6 border border-slate-200">
                <p className="text-sm font-black text-slate-500 uppercase tracking-wider mb-2">
                  Subjects
                </p>
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
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0"/>
                    <XAxis 
                      dataKey="date" 
                      tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      domain={[0, 100]}
                      tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '12px',
                        border: 'none',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        fontWeight: 700
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="accuracy"
                      stroke="#6366f1"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorAccuracy)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200">
              <h3 className="text-lg font-black text-slate-700 mb-4">Performance by Subject</h3>
              <div className="space-y-4">
                {subjectStats.map(stat => (
                  <div key={stat.subject} className="flex items-center gap-4">
                    <span className="text-3xl">{stat.icon}</span>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="font-bold text-slate-700 capitalize">{stat.subject}</span>
                        <span className="font-black text-indigo-600">{stat.avgAccuracy}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 rounded-full transition-all"
                          style={{ width: `${stat.avgAccuracy}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{stat.quizzesTaken} quizzes</p>
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