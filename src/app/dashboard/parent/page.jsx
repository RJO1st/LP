"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";

// Icons (keep your existing icon definitions)
const RocketIcon = ({ size = 24 }) => ( <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.13v-5.36a2 2 0 0 0-1.17-1.78L13 5.13v-2a1 1 0 0 0-2 0v1.56l-7.83 4.86a2 2 0 0 0-1.17 1.78v5.36c0 .56.31 1.08.82 1.35l7.83 4.86a2 2 0 0 0 2.1 0l7.83-4.86c.51-.27.82-.79.82-1.35z"/><path d="M12 10v4"/><path d="M9 13h6"/></svg> );
const PlusIcon = ({ size = 24 }) => ( <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> );
const LogOutIcon = ({ size = 20 }) => ( <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg> );
const ChartIcon = ({ size = 20 }) => ( <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg> );
const CopyIcon = ({ size = 16 }) => ( <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg> );
const StarIcon = ({ size = 20 }) => ( <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg> );

export default function ParentDashboard() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const [user, setUser] = useState(null);
  const [scholars, setScholars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newYear, setNewYear] = useState("4");
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        router.push("/");
        return;
      }
      setUser(user);

      const { data: scholarsData, error: scholarsError } = await supabase
        .from("scholars")
        .select("*")
        .eq("parent_id", user.id)
        .order("created_at", { ascending: true });

      if (!scholarsError && scholarsData) setScholars(scholarsData);
      setLoading(false);
    };
    fetchDashboardData();
  }, [router, supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleAddScholar = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setIsAdding(true);

    const randomCode = `QUEST-${Math.floor(1000 + Math.random() * 9000)}`;
    const { data, error } = await supabase
      .from("scholars")
      .insert([{
        parent_id: user.id,
        name: newName.trim(),
        year: parseInt(newYear),
        access_code: randomCode,
        total_xp: 0
      }])
      .select()
      .single();

    if (!error && data) {
      setScholars([...scholars, data]);
      setNewName("");
      setNewYear("4");
    } else {
      alert("Failed to add scholar. Please try again.");
    }
    setIsAdding(false);
  };

  const copyToClipboard = (code) => {
    navigator.clipboard.writeText(code);
    alert(`Copied code: ${code}`);
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center text-indigo-600 font-black text-2xl">
      Loading LaunchPard...
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col pb-24">
      {/* NAV */}
      <nav className="bg-white border-b-4 border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3 font-black text-xl tracking-tight text-slate-900">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md border-b-4 border-indigo-800">
            <RocketIcon size={20} />
          </div>
          <span className="hidden sm:inline">Parent Portal</span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={handleSignOut} className="flex items-center gap-2 text-slate-500 font-bold hover:text-rose-500 transition-colors px-4 py-2">
            <LogOutIcon size={18} /> <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 pt-12 w-full">
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">Your Scholars</h1>
          <p className="text-xl text-slate-500 font-semibold">Manage profiles, share access codes, and track progress.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {scholars.map((scholar) => (
            <div key={scholar.id} className="bg-white border-4 border-slate-100 border-b-8 rounded-[32px] p-8 hover:border-indigo-200 transition-colors relative overflow-hidden group">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-3xl font-black text-slate-800 mb-1">{scholar.name}</h3>
                  <span className="inline-block bg-slate-100 text-slate-600 font-bold px-3 py-1 rounded-lg text-sm">Year {scholar.year}</span>
                </div>
                <div className="bg-amber-100 text-amber-700 font-black px-4 py-2 rounded-2xl flex items-center gap-2">
                  <StarIcon size={18} /> {scholar.total_xp || 0}
                </div>
              </div>

              <div className="bg-slate-50 p-5 rounded-2xl border-2 border-slate-200 flex justify-between items-center">
                <div>
                  <div className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Access Code</div>
                  <div className="text-2xl font-black text-indigo-600 tracking-widest">{scholar.access_code}</div>
                </div>
                <button onClick={() => copyToClipboard(scholar.access_code)} className="p-3 bg-white border-2 border-slate-200 rounded-xl text-slate-500 hover:text-indigo-600 hover:border-indigo-300 transition-colors shadow-sm active:translate-y-1">
                  <CopyIcon size={20} />
                </button>
              </div>

              {/* Link to detailed insights page */}
              <Link href={`/dashboard/parent/scholar/${scholar.id}`} className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity bg-indigo-600 text-white p-3 rounded-xl shadow-lg border-b-4 border-indigo-800">
                <ChartIcon size={20} />
              </Link>
            </div>
          ))}

          {/* ADD SCHOLAR CARD */}
          <div className="bg-indigo-50 border-4 border-indigo-100 border-b-8 rounded-[32px] p-8 flex flex-col justify-center">
            <h3 className="text-2xl font-black text-indigo-900 mb-2 flex items-center gap-2"><PlusIcon size={28}/> Add New Scholar</h3>
            <p className="text-indigo-700/80 font-semibold mb-6">Generate a new profile and access code.</p>
            <form onSubmit={handleAddScholar} className="space-y-4">
              <input type="text" placeholder="Scholar's Name" required value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full p-4 bg-white border-2 border-indigo-100 rounded-2xl font-bold text-lg outline-none focus:border-indigo-400" />
              <div className="flex gap-4">
                <select value={newYear} onChange={(e) => setNewYear(e.target.value)} className="p-4 bg-white border-2 border-indigo-100 rounded-2xl font-bold text-lg outline-none focus:border-indigo-400">
                  {[1,2,3,4,5,6].map(y => <option key={y} value={y}>Year {y}</option>)}
                </select>
                <button type="submit" disabled={isAdding} className="flex-grow bg-indigo-600 text-white font-black text-lg rounded-2xl shadow-sm border-b-4 border-indigo-800 hover:bg-indigo-700 disabled:opacity-50">
                  {isAdding ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="mt-12 sm:hidden">
          {/* Mobile fallback link (optional) */}
        </div>
      </main>
    </div>
  );
}