"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";
import SkillHeatmap from "@/components/parent/SkillHeatmap";
import TimeChart from "./TimeChart";
import Goals from "./Goals";

// Icons
const ArrowLeftIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>
  </svg>
);

export default function ScholarInsights({ params }) {
  const { id } = React.use(params);
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const [scholar, setScholar] = useState(null);
  const [skills, setSkills] = useState([]);
  const [timeData, setTimeData] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch scholar details
      const { data: scholarData, error: scholarError } = await supabase
        .from('scholars')
        .select('*')
        .eq('id', id)
        .single();
      if (scholarError || !scholarData) {
        router.push('/dashboard/parent');
        return;
      }
      setScholar(scholarData);

      // Fetch analytics
      const [skillsRes, timeRes, goalsRes] = await Promise.all([
        fetch(`/api/parent/skills?scholar_id=${id}`),
        fetch(`/api/parent/time?scholar_id=${id}&period=week`),
        fetch(`/api/parent/goals?scholar_id=${id}`)
      ]);
      if (skillsRes.ok) setSkills(await skillsRes.json());
      if (timeRes.ok) setTimeData(await timeRes.json());
      if (goalsRes.ok) setGoals(await goalsRes.json());
      setLoading(false);
    };
    fetchData();
  }, [id, supabase, router]);

  const handleAddGoal = async (goal) => {
    const { data: { user } } = await supabase.auth.getUser();
    const res = await fetch('/api/parent/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...goal, parent_id: user?.id })
    });
    if (res.ok) {
      const newGoal = await res.json();
      setGoals([newGoal, ...goals]);
    }
  };

  const handleToggleGoal = async (goalId, achieved) => {
    const res = await fetch(`/api/parent/goals/${goalId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ achieved })
    });
    if (res.ok) {
      setGoals(goals.map(g => g.id === goalId ? { ...g, achieved, achieved_at: achieved ? new Date().toISOString() : null } : g));
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex items-center sticky top-0 z-50">
        <Link href="/dashboard/parent" className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 transition-colors">
          <ArrowLeftIcon size={20} />
          <span className="font-bold">Back to Parent Portal</span>
        </Link>
        <div className="ml-auto flex items-center gap-3">
          <span className="font-black text-xl text-slate-800">Insights for {scholar?.name}</span>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 pt-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SkillHeatmap skills={skills} />
          <TimeChart data={timeData} />
          <div className="col-span-2">
            <Goals
              scholarId={id}
              goals={goals}
              onAdd={handleAddGoal}
              onToggleAchieved={handleToggleGoal}
            />
          </div>
        </div>
      </main>
    </div>
  );
}