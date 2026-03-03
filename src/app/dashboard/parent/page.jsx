"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { CURRICULA, SUBJECTS_BY_CURRICULUM } from "@/lib/constants";

// ── Icons ─────────────────────────────────────────────────────────────────────
const RocketIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
    <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
    <path d="M9 12H4s.5-1 1-4c1.5 0 3 .5 3 .5L9 12Z"/>
    <path d="M12 15v5s1 .5 4 1c0-1.5-.5-3-.5-3L12 15Z"/>
  </svg>
);
const PlusIcon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const LogOutIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);
const ChartIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>
  </svg>
);
const CopyIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
  </svg>
);
const StarIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
  </svg>
);
const CheckIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5"/>
  </svg>
);

// ── Subject metadata ──────────────────────────────────────────────────────────
const SUBJECT_META = {
  maths:     { emoji: "🔢", label: "Maths"     },
  english:   { emoji: "📖", label: "English"   },
  verbal:    { emoji: "🧩", label: "Verbal"    },
  nvr:       { emoji: "🔷", label: "NVR"       },
  science:   { emoji: "🔬", label: "Science"   },
  geography: { emoji: "🌍", label: "Geography" },
  history:   { emoji: "📜", label: "History"   },
};

// ── Skeleton ──────────────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="bg-white border-4 border-slate-100 border-b-8 rounded-[32px] p-8 animate-pulse space-y-4">
    <div className="flex justify-between">
      <div className="space-y-2">
        <div className="h-7 w-36 rounded-xl bg-slate-100" />
        <div className="h-5 w-48 rounded-lg bg-slate-100" />
      </div>
      <div className="h-10 w-20 rounded-2xl bg-slate-100" />
    </div>
    <div className="flex gap-2">{[1,2,3].map(i => <div key={i} className="h-6 w-16 rounded-lg bg-slate-100" />)}</div>
    <div className="h-20 rounded-2xl bg-slate-100" />
  </div>
);

// ── Curriculum picker card ────────────────────────────────────────────────────
const CurriculumCard = ({ currKey, curr, selected, onSelect }) => (
  <button
    type="button"
    onClick={() => onSelect(currKey)}
    className={`
      flex flex-col items-center gap-1 p-2.5 rounded-2xl border-2 text-center
      transition-all duration-150 cursor-pointer
      ${selected
        ? "border-indigo-500 bg-indigo-600 text-white shadow-md shadow-indigo-200 scale-[1.03]"
        : "border-indigo-100 bg-white text-slate-600 hover:border-indigo-300 hover:bg-indigo-50"
      }
    `}
  >
    <span className="text-2xl leading-none">{curr.country}</span>
    <span className={`text-[10px] font-black leading-tight ${selected ? "text-indigo-100" : "text-slate-500"}`}>
      {curr.name}
    </span>
  </button>
);

// ─────────────────────────────────────────────────────────────────────────────
export default function ParentDashboard() {
  const router   = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const [user,     setUser]     = useState(null);
  const [scholars, setScholars] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [copied,   setCopied]   = useState(null);
  const [isAdding, setIsAdding] = useState(false);

  // ── Form state ────────────────────────────────────────────────────────────
  const [newName,       setNewName]       = useState("");
  const [newCurriculum, setNewCurriculum] = useState("uk_11plus");
  const [newGrade,      setNewGrade]      = useState(4);

  const currDef = CURRICULA[newCurriculum];

  const handleCurriculumChange = (key) => {
    setNewCurriculum(key);
    const grades = CURRICULA[key].grades;
    // pick the middle grade as sensible default
    setNewGrade(grades[Math.floor(grades.length / 2)]);
  };

  // ── Fetch ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) { router.push("/"); return; }
      setUser(user);

      const { data, error: e } = await supabase
        .from("scholars")
        .select("*")
        .eq("parent_id", user.id)
        .order("created_at", { ascending: true });

      if (!e && data) setScholars(data);
      setLoading(false);
    };
    init();
  }, [router, supabase]);

  // ── Sign out ──────────────────────────────────────────────────────────────
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  // ── Add scholar ───────────────────────────────────────────────────────────
  const handleAddScholar = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setIsAdding(true);

    const code = `QUEST-${Math.floor(1000 + Math.random() * 9000)}`;
    const { data, error } = await supabase
      .from("scholars")
      .insert([{
        parent_id:   user.id,
        name:        newName.trim(),
        year:        newGrade,
        curriculum:  newCurriculum,
        access_code: code,
        total_xp:    0,
      }])
      .select()
      .single();

    if (!error && data) {
      setScholars(prev => [...prev, data]);
      setNewName("");
      setNewCurriculum("uk_11plus");
      setNewGrade(CURRICULA.uk_11plus.grades[Math.floor(CURRICULA.uk_11plus.grades.length / 2)]);
    } else {
      console.error(error);
      alert("Failed to add scholar. Check the console for details.");
    }
    setIsAdding(false);
  };

  // ── Copy code ─────────────────────────────────────────────────────────────
  const copyCode = (scholar) => {
    navigator.clipboard.writeText(scholar.access_code).then(() => {
      setCopied(scholar.id);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getCurr     = (s) => CURRICULA[s.curriculum]             || CURRICULA.uk_11plus;
  const getSubjects = (s) => SUBJECTS_BY_CURRICULUM[s.curriculum] || SUBJECTS_BY_CURRICULUM.uk_11plus;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col pb-24">

      {/* ── NAV ────────────────────────────────────────────────────────────── */}
      <nav className="bg-white border-b-4 border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3 font-black text-xl tracking-tight">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md border-b-4 border-indigo-800">
            <RocketIcon size={20} />
          </div>
          <span className="hidden sm:inline text-slate-900">Parent Portal</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:block text-sm font-bold text-slate-400 truncate max-w-[220px]">
            {user?.email}
          </span>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-slate-500 font-bold hover:text-rose-500 hover:bg-rose-50 transition-all px-4 py-2 rounded-xl"
          >
            <LogOutIcon /> <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 pt-12 w-full">

        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-black mb-3 tracking-tight">Your Scholars</h1>
          <p className="text-xl text-slate-500 font-semibold">
            Manage profiles, share access codes, and track every child's progress.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* ── Skeletons ────────────────────────────────────────────────── */}
          {loading && [1, 2].map(i => <SkeletonCard key={i} />)}

          {/* ── Scholar cards ─────────────────────────────────────────────── */}
          {!loading && scholars.map(scholar => {
            const curr     = getCurr(scholar);
            const subjects = getSubjects(scholar);
            const isCopied = copied === scholar.id;

            return (
              <div
                key={scholar.id}
                className="bg-white border-4 border-slate-100 border-b-8 rounded-[32px] p-8
                           hover:border-indigo-200 transition-all group flex flex-col gap-5"
              >
                {/* Name + XP */}
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-3xl font-black text-slate-800 mb-2">{scholar.name}</h3>
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Curriculum badge */}
                      <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700
                                       font-bold px-3 py-1.5 rounded-xl text-sm">
                        {curr.country} {curr.name}
                      </span>
                      {/* Grade badge */}
                      <span className="bg-indigo-100 text-indigo-700 font-bold px-3 py-1.5 rounded-xl text-sm">
                        {curr.gradeLabel} {scholar.year}
                      </span>
                    </div>
                  </div>
                  {/* XP pill */}
                  <div className="bg-amber-100 text-amber-700 font-black px-3 py-2 rounded-2xl
                                  flex items-center gap-1.5 shrink-0">
                    <StarIcon size={14} />
                    <span className="text-sm">{(scholar.total_xp || 0).toLocaleString()}</span>
                  </div>
                </div>

                {/* Subject chips */}
                <div className="flex flex-wrap gap-1.5">
                  {subjects.map(s => {
                    const m = SUBJECT_META[s] || { emoji: "📚", label: s };
                    return (
                      <span
                        key={s}
                        className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200
                                   text-slate-600 text-xs font-bold px-2.5 py-1 rounded-lg"
                      >
                        {m.emoji} {m.label}
                      </span>
                    );
                  })}
                </div>

                {/* Access code */}
                <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-200
                                flex justify-between items-center">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                      Access Code
                    </div>
                    <div className="text-xl font-black text-indigo-600 tracking-widest">
                      {scholar.access_code}
                    </div>
                  </div>
                  <button
                    onClick={() => copyCode(scholar)}
                    className={`p-3 rounded-xl border-2 transition-all
                      ${isCopied
                        ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                        : "bg-white border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-300"
                      }`}
                  >
                    {isCopied ? <CheckIcon size={18} /> : <CopyIcon size={18} />}
                  </button>
                </div>

                {/* Insights link — visible on hover (desktop) / always (mobile) */}
                <Link
                  href={`/dashboard/parent/scholar/${scholar.id}`}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl
                             bg-indigo-50 text-indigo-600 font-black text-sm
                             md:opacity-0 md:group-hover:opacity-100
                             transition-all hover:bg-indigo-100 border-2
                             border-transparent hover:border-indigo-200"
                >
                  <ChartIcon /> View Insights
                </Link>
              </div>
            );
          })}

          {/* ── Empty state ──────────────────────────────────────────────── */}
          {!loading && scholars.length === 0 && (
            <div className="col-span-2 bg-white border-4 border-dashed border-slate-200
                            rounded-[32px] p-16 text-center">
              <p className="text-5xl mb-4">🚀</p>
              <p className="font-black text-2xl text-slate-700 mb-2">No scholars yet</p>
              <p className="text-slate-400 font-bold">Add your first scholar using the form →</p>
            </div>
          )}

          {/* ── ADD SCHOLAR CARD ─────────────────────────────────────────── */}
          <div className="bg-indigo-50 border-4 border-indigo-100 border-b-8 rounded-[32px] p-8 flex flex-col">
            <h3 className="text-2xl font-black text-indigo-900 mb-1 flex items-center gap-2">
              <PlusIcon size={24} /> Add New Scholar
            </h3>
            <p className="text-indigo-700/70 font-semibold mb-6 text-sm">
              Generate a profile and unique access code.
            </p>

            <form onSubmit={handleAddScholar} className="flex flex-col gap-4 flex-grow">

              {/* ① Name */}
              <input
                type="text"
                required
                placeholder="Scholar's First Name"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="w-full p-4 bg-white border-2 border-indigo-100 rounded-2xl
                           font-bold text-lg outline-none focus:border-indigo-400
                           placeholder:text-slate-300"
              />

              {/* ② Curriculum — visual flag grid */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest
                                  text-indigo-500 mb-2 ml-1">
                  Curriculum
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(CURRICULA).map(([key, c]) => (
                    <CurriculumCard
                      key={key}
                      currKey={key}
                      curr={c}
                      selected={newCurriculum === key}
                      onSelect={handleCurriculumChange}
                    />
                  ))}
                </div>
              </div>

              {/* ③ Grade + Submit */}
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-[10px] font-black uppercase tracking-widest
                                    text-indigo-500 mb-1.5 ml-1">
                    {currDef.gradeLabel}
                  </label>
                  <select
                    value={newGrade}
                    onChange={e => setNewGrade(Number(e.target.value))}
                    className="w-full p-4 bg-white border-2 border-indigo-100 rounded-2xl
                               font-bold text-base outline-none focus:border-indigo-400 cursor-pointer"
                  >
                    {currDef.grades.map(g => (
                      <option key={g} value={g}>{currDef.gradeLabel} {g}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isAdding || !newName.trim()}
                  className="px-7 py-4 bg-indigo-600 text-white font-black text-lg rounded-2xl
                             border-b-4 border-indigo-800 hover:bg-indigo-700 disabled:opacity-50
                             active:translate-y-1 active:border-b-0 transition-all whitespace-nowrap"
                >
                  {isAdding ? "Creating…" : "Create ✓"}
                </button>
              </div>

              {/* ④ Subjects preview */}
              <div className="bg-white/70 rounded-2xl p-3 border border-indigo-100 mt-auto">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2">
                  Subjects included
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(SUBJECTS_BY_CURRICULUM[newCurriculum] || []).map(s => {
                    const m = SUBJECT_META[s] || { emoji: "📚", label: s };
                    return (
                      <span
                        key={s}
                        className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700
                                   text-xs font-bold px-2.5 py-1 rounded-lg"
                      >
                        {m.emoji} {m.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            </form>
          </div>

        </div>
      </main>
    </div>
  );
}