"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { getCurriculumInfo, formatGradeLabel } from "@/lib/gamificationEngine";

// ═══════════════════════════════════════════════════════════════════
// ICONS
// ═══════════════════════════════════════════════════════════════════
const Icon = ({ d, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
);

const RocketIcon = ({ size = 20 }) => <Icon size={size} d={["M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z","m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"]} />;
const PlusIcon = ({ size = 22 }) => <Icon size={size} d="M12 5v14M5 12h14" />;
const LogOutIcon = ({ size = 18 }) => <Icon size={size} d={["M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4","M16 17l5-5-5-5","M21 12H9"]} />;
const CopyIcon = ({ size = 16 }) => <Icon size={size} d={["M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2","M8 2h8v4H8z"]} />;
const CheckIcon = ({ size = 14 }) => <Icon size={size} d="M20 6 9 17l-5-5" />;
const StarIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
  </svg>
);

// ═══════════════════════════════════════════════════════════════════
// CURRICULA DATA - ALL 10 OPTIONS
// ═══════════════════════════════════════════════════════════════════
const CURRICULA = {
  // UK (2 options)
  uk_national: { 
    country: "🇬🇧", 
    name: "UK National", 
    gradeLabel: "Year",
    grades: [1, 2, 3, 4, 5, 6, 7, 8, 9]
  },
  uk_11plus: { 
    country: "🇬🇧", 
    name: "UK 11+", 
    gradeLabel: "Year",
    grades: [3, 4, 5, 6]
  },
  // US
  us_common_core: { 
    country: "🇺🇸", 
    name: "US Common Core",
    gradeLabel: "Grade", 
    grades: [1, 2, 3, 4, 5, 6, 7, 8]
  },
  // Canada (2 stages)
  ca_primary: {
    country: "🇨🇦",
    name: "Canadian Primary",
    gradeLabel: "Grade",
    grades: [1, 2, 3, 4, 5, 6, 7, 8],
    hasProvinces: true,
  },
  ca_secondary: {
    country: "🇨🇦",
    name: "Canadian Secondary",
    gradeLabel: "Grade",
    grades: [9, 10, 11, 12],
    hasProvinces: true,
  },
  // Australia
  aus_acara: { 
    country: "🇦🇺", 
    name: "Australian",
    gradeLabel: "Year",
    grades: [1, 2, 3, 4, 5, 6, 7, 8, 9]
  },
  // IB (2 options)
  ib_pyp: { 
    country: "🌍", 
    name: "IB PYP",
    gradeLabel: "Year",
    grades: [1, 2, 3, 4, 5, 6]
  },
  ib_myp: { 
    country: "🌍", 
    name: "IB MYP",
    gradeLabel: "Year",
    grades: [1, 2, 3, 4, 5]
  },
  // Nigeria (3 stages)
  ng_primary: { 
    country: "🇳🇬", 
    name: "Nigerian Primary",
    gradeLabel: "Primary",
    grades: [1, 2, 3, 4, 5, 6]
  },
  ng_jss: { 
    country: "🇳🇬", 
    name: "Nigerian JSS",
    gradeLabel: "JSS",
    grades: [1, 2, 3]
  },
  ng_sss: { 
    country: "🇳🇬", 
    name: "Nigerian SSS",
    gradeLabel: "SS",
    grades: [1, 2, 3]
  }
};

const SUBJECTS_BY_CURRICULUM = {
  uk_national: ['maths', 'english', 'science'],
  uk_11plus: ['maths', 'english', 'verbal', 'nvr'],
  us_common_core: ['maths', 'english', 'science'],
  aus_acara: ['maths', 'english', 'science'],
  ib_pyp: ['maths', 'english', 'science'],
  ib_myp: ['maths', 'english', 'science'],
  ng_primary: ['maths', 'english', 'basic_science'],
  ng_jss: ['maths', 'english', 'physics', 'basic_technology', 'business_studies', 'basic_science'],
  ng_sss: ['maths', 'english', 'physics', 'chemistry', 'biology', 'commerce', 'financial_accounting', 'further_mathematics', 'economics', 'government'],
  // Canada
  ca_primary: ['maths', 'english', 'science', 'social_studies', 'french_language', 'physical_education'],
  ca_secondary: ['maths', 'english', 'science', 'canadian_history', 'geography', 'physics', 'chemistry', 'biology', 'computer_science', 'french_language'],
};

const SUBJECT_META = {
  maths: { emoji: "🔢", label: "Maths" },
  english: { emoji: "📖", label: "English" },
  verbal: { emoji: "🧩", label: "Verbal" },
  nvr: { emoji: "🔷", label: "NVR" },
  science: { emoji: "🔬", label: "Science" },
  physics: { emoji: "⚛️", label: "Physics" },
  chemistry: { emoji: "🧪", label: "Chemistry" },
  biology: { emoji: "🧬", label: "Biology" },
  commerce: { emoji: "💰", label: "Commerce" },
  basic_technology: { emoji: "🔧", label: "Basic Tech" },
  financial_accounting: { emoji: "📊", label: "Financial Accounting" },
  further_mathematics: { emoji: "📐", label: "Further Maths" },
  economics: { emoji: "📈", label: "Economics" },
  government: { emoji: "🏛️", label: "Government" },
  social_studies: { emoji: "🌍", label: "Social Studies"},
  business_studies: { emoji: "💼", label: "Business Studies" },
  basic_science: { emoji: "🧪", label: "Basic Science" },
  // Canada-specific
  french_language: { emoji: "🗣️", label: "French" },
  canadian_history: { emoji: "🍁", label: "Canadian History" },
  physical_education: { emoji: "🏃", label: "Physical Education" },
  geography: { emoji: "🗺️", label: "Geography" },
  computer_science: { emoji: "💻", label: "Computer Science" },
};


// ═══════════════════════════════════════════════════════════════════
// CANADIAN PROVINCES & TERRITORIES
// ═══════════════════════════════════════════════════════════════════
const CANADIAN_PROVINCES = [
  { code: "ON", name: "Ontario",                  frenchMandatory: true,  frenchImmersion: true,  note: "French as a Second Language from Grade 4" },
  { code: "BC", name: "British Columbia",          frenchMandatory: false, frenchImmersion: true,  note: "Inquiry-based curriculum; French Immersion widely available" },
  { code: "AB", name: "Alberta",                   frenchMandatory: false, frenchImmersion: true,  note: "Strong STEM focus; French Immersion available" },
  { code: "QC", name: "Québec",                    frenchMandatory: true,  frenchImmersion: false, note: "French is the primary language of instruction" },
  { code: "MB", name: "Manitoba",                  frenchMandatory: true,  frenchImmersion: true,  note: "French mandatory from Grade 4" },
  { code: "SK", name: "Saskatchewan",              frenchMandatory: false, frenchImmersion: true,  note: "French Immersion widely offered" },
  { code: "NS", name: "Nova Scotia",               frenchMandatory: false, frenchImmersion: true,  note: "Atlantic Canada emphasis" },
  { code: "NB", name: "New Brunswick",             frenchMandatory: true,  frenchImmersion: true,  note: "Only officially bilingual province; French mandatory" },
  { code: "NL", name: "Newfoundland & Labrador",   frenchMandatory: false, frenchImmersion: true,  note: "Atlantic Canada; French Immersion in most districts" },
  { code: "PE", name: "Prince Edward Island",      frenchMandatory: false, frenchImmersion: true,  note: "Atlantic Canada; French Immersion available" },
  { code: "NT", name: "Northwest Territories",     frenchMandatory: false, frenchImmersion: false, note: "Indigenous language programmes alongside English" },
  { code: "YT", name: "Yukon",                     frenchMandatory: false, frenchImmersion: true,  note: "Follows BC curriculum framework" },
  { code: "NU", name: "Nunavut",                   frenchMandatory: false, frenchImmersion: false, note: "Inuktitut language instruction available" },
];

// ═══════════════════════════════════════════════════════════════════
// CURRICULUM CARD
// ═══════════════════════════════════════════════════════════════════
const CurriculumCard = ({ currKey, curr, selected, onSelect }) => (
  <button
    type="button"
    onClick={() => onSelect(currKey)}
    className={`flex flex-col items-center gap-1 p-3 rounded-2xl border-2 text-center transition-all cursor-pointer
      ${selected
        ? "border-indigo-500 bg-indigo-600 text-white shadow-lg scale-105"
        : "border-indigo-100 bg-white text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:scale-102"
      }`}
  >
    <span className="text-3xl">{curr.country}</span>
    <span className={`text-[11px] font-black leading-tight ${selected ? "text-indigo-100" : "text-slate-500"}`}>
      {curr.name}
    </span>
  </button>
);

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════
export default function ParentDashboard() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const [user, setUser] = useState(null);
  const [parent, setParent] = useState(null);
  const [scholars, setScholars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState(null);

  // Form state
  const [newName, setNewName] = useState("");
  const [newCurriculum, setNewCurriculum] = useState("uk_national");
  const [newGrade, setNewGrade] = useState(1);
  const [newProvince, setNewProvince] = useState("");

  const currDef    = CURRICULA[newCurriculum];
  const isCanadian = !!currDef?.hasProvinces;
  const provInfo   = isCanadian && newProvince
    ? CANADIAN_PROVINCES.find(p => p.code === newProvince)
    : null;

  const handleCurriculumChange = (key) => {
    setNewCurriculum(key);
    const grades = CURRICULA[key].grades;
    setNewGrade(grades[0]);
    if (!CURRICULA[key]?.hasProvinces) setNewProvince("");
  };

  // ═══════════════════════════════════════════════════════════════
  // FETCH USER AND SCHOLARS
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    const init = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        router.push("/");
        return;
      }

      setUser(user);

      // Fetch parent data with fallback creation
      let { data: parentData, error: fetchError } = await supabase
        .from("parents")
        .select("*")
        .eq("id", user.id)
        .single();

      // If parent doesn't exist, create it
      if (fetchError && fetchError.code === 'PGRST116') {
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 7);
        
        const { data: newParent } = await supabase
          .from("parents")
          .upsert({
            id: user.id,
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Parent',
            email: user.email,
            subscription_status: "trial",
            trial_end: trialEnd.toISOString(),
            max_children: 3,
            billing_cycle: "monthly"
          }, {
            onConflict: 'id'
          })
          .select()
          .single();
        
        if (newParent) parentData = newParent;
      }

      if (parentData) setParent(parentData);

      // Fetch scholars
      const { data: scholarData, error: scholarError } = await supabase
        .from("scholars")
        .select("*")
        .eq("parent_id", user.id)
        .order("created_at", { ascending: true });

      if (!scholarError && scholarData) {
        setScholars(scholarData);
      }

      setLoading(false);
    };

    init();
  }, [router, supabase]);

  // ═══════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleAddScholar = async (e) => {
    e.preventDefault();
    if (!newName.trim()) {
      setError("Please enter a name");
      return;
    }

    setIsAdding(true);
    setError(null);

    try {
      const code = `QUEST-${Math.floor(1000 + Math.random() * 9000)}`;
      
      const { data, error: insertError } = await supabase
        .from("scholars")
        .insert([{
          parent_id: user.id,
          name: newName.trim(),
          year_level: newGrade,
          year: newGrade,
          curriculum: newCurriculum,
          province: newProvince || null,
          access_code: code,
          total_xp: 0,
          coins: 0,
          streak: 0,
          personal_best: 0,
          codename: null,
          avatar: {
            base: "astronaut",
            background: "🌌"
          }
        }])
        .select()
        .single();

      if (insertError) {
        console.error("Insert error:", insertError);
        setError(`Failed to create scholar: ${insertError.message}`);
        return;
      }

      if (data) {
        try {
          await fetch('/api/emails/send-scholar-created', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              parentEmail: user.email,
              parentName:  user.user_metadata?.full_name || 'Parent',
              scholarName: data.name,
              questCode:   data.access_code,
              curriculum:  getCurriculumInfo(data.curriculum).name,
              yearLevel:   formatGradeLabel(data.year_level, data.curriculum),
            }),
          });
        } catch (emailError) {
          console.error('Email send failed:', emailError);
        }

        setScholars(prev => [...prev, data]);
        setNewName("");
        setNewCurriculum("uk_national");
        setNewGrade(1);
        setNewProvince("");
        setError(null);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsAdding(false);
    }
  };

  const copyCode = (scholar) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(scholar.access_code).then(() => {
        setCopied(scholar.id);
        setTimeout(() => setCopied(null), 2000);
      }).catch(err => {
        alert(`Copy this code: ${scholar.access_code}`);
      });
    } else {
      alert(`Access Code: ${scholar.access_code}`);
    }
  };

  const getCurr = (s) => CURRICULA[s.curriculum] || CURRICULA.uk_national;
  const getSubjects = (s) => SUBJECTS_BY_CURRICULUM[s.curriculum] || [];

  // ═══════════════════════════════════════════════════════════════
  // LOADING STATE
  // ═══════════════════════════════════════════════════════════════
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-bold">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col pb-24">
      
      {/* Navigation */}
      <nav className="bg-white border-b-4 border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3 font-black text-xl">
          <img src="/logo.svg" alt="LaunchPard" width={40} height={40} style={{ objectFit: "contain" }} />
          <span className="hidden sm:inline">Parent Portal</span>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/dashboard/parent/analytics" className="text-slate-500 hover:text-indigo-600 font-bold text-sm transition-colors">
            Analytics
          </Link>
          <Link href="/dashboard/parent/billing" className="text-slate-500 hover:text-indigo-600 font-bold text-sm transition-colors">
            Billing
          </Link>
          <Link href="/dashboard/parent/account" className="text-slate-500 hover:text-indigo-600 font-bold text-sm transition-colors">
            Account
          </Link>
          <span className="hidden sm:block text-sm font-bold text-slate-400 max-w-[220px] truncate">
            {user?.email}
          </span>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-slate-500 font-bold hover:text-rose-500 hover:bg-rose-50 px-4 py-2 rounded-xl transition-all"
          >
            <LogOutIcon /> <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 pt-12 w-full">
        
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-black mb-3">Your Scholars</h1>
          <p className="text-xl text-slate-500 font-semibold">
            Manage profiles, share access codes, and track progress.
          </p>
          
          {/* Trial Banner */}
          {parent?.subscription_status === 'trial' && parent?.trial_end && (
            <div className="mt-4 bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 flex items-start gap-3">
              <span className="text-2xl">🎉</span>
              <div className="flex-1">
                <p className="font-black text-blue-900 mb-1">Free Trial Active</p>
                <p className="text-sm text-blue-700">
                  Your trial ends on {new Date(parent.trial_end).toLocaleDateString('en-GB', { 
                    day: 'numeric', month: 'long', year: 'numeric' 
                  })}
                </p>
              </div>
              <Link
                href="/subscribe"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors"
              >
                Subscribe
              </Link>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-rose-50 border-2 border-rose-200 rounded-2xl p-4 text-rose-700 font-bold">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Scholar cards */}
          {scholars.length === 0 ? (
            <div className="md:col-span-2 bg-white border-4 border-dashed border-slate-200 rounded-[32px] p-16 text-center">
              <p className="text-5xl mb-4">🚀</p>
              <p className="font-black text-2xl text-slate-700 mb-2">No scholars yet</p>
              <p className="text-slate-400 font-bold">Add your first scholar using the form →</p>
            </div>
          ) : (
            scholars.map(scholar => {
              const curr = getCurr(scholar);
              const subjects = getSubjects(scholar);
              const isCopied = copied === scholar.id;
              const yearLevel = scholar.year_level || scholar.year || 1;

              return (
                <div
                  key={scholar.id}
                  className="bg-white border-4 border-slate-100 border-b-8 rounded-[32px] p-8 hover:border-indigo-200 transition-all flex flex-col gap-5"
                >
                  {/* Name + XP */}
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-3xl font-black text-slate-800 mb-2">{scholar.name}</h3>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 font-bold px-3 py-1.5 rounded-xl text-sm">
                          {curr.country} {curr.name}
                        </span>
                        <span className="bg-indigo-100 text-indigo-700 font-bold px-3 py-1.5 rounded-xl text-sm">
                          {curr.gradeLabel} {yearLevel}
                        </span>
                        {scholar.province && (
                          <span className="bg-red-50 text-red-700 border border-red-100 font-bold px-3 py-1.5 rounded-xl text-sm">
                            🍁 {CANADIAN_PROVINCES.find(p => p.code === scholar.province)?.name || scholar.province}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="bg-amber-100 text-amber-700 font-black px-3 py-2 rounded-2xl flex items-center gap-1.5">
                      <StarIcon size={14} />
                      <span className="text-sm">{(scholar.total_xp || 0).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Subjects */}
                  <div className="flex flex-wrap gap-1.5">
                    {subjects.map(s => {
                      const m = SUBJECT_META[s] || { emoji: "📚", label: s };
                      return (
                        <span key={s} className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 text-slate-600 text-xs font-bold px-2.5 py-1 rounded-lg">
                          {m.emoji} {m.label}
                        </span>
                      );
                    })}
                  </div>

                  {/* Access code */}
                  <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-200 flex justify-between items-center">
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
                      title={isCopied ? "Copied!" : "Copy code"}
                    >
                      {isCopied ? <CheckIcon size={18} /> : <CopyIcon size={18} />}
                    </button>
                  </div>

                  {/* View Analytics Button */}
                  <Link
                    href={`/dashboard/parent/analytics?scholar=${scholar.id}`}
                    className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-3 px-4 rounded-2xl text-center transition-colors border-2 border-indigo-100 hover:border-indigo-200"
                  >
                    📊 View Analytics
                  </Link>
                </div>
              );
            })
          )}

          {/* Add Scholar Form */}
          <div className="bg-indigo-50 border-4 border-indigo-100 border-b-8 rounded-[32px] p-8 flex flex-col">
            <h3 className="text-2xl font-black text-indigo-900 mb-1 flex items-center gap-2">
              <PlusIcon size={24} /> Add New Scholar
            </h3>
            <p className="text-indigo-700/70 font-semibold mb-6 text-sm">
              Generate a profile and unique access code.
            </p>

            <form onSubmit={handleAddScholar} className="flex flex-col gap-4 flex-grow">
              
              {/* Name */}
              <div>
                <input
                  type="text"
                  required
                  placeholder="Scholar's First Name"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full p-4 bg-white border-2 border-indigo-100 rounded-2xl font-bold text-lg outline-none focus:border-indigo-400 placeholder:text-slate-300 transition-colors"
                />
              </div>

              {/* Curriculum - 3x3 Grid */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-2 ml-1">
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

              {/* Province selector — only for Canadian curricula */}
              {isCanadian && (
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-1.5 ml-1">
                    🍁 Province / Territory
                  </label>
                  <select
                    value={newProvince}
                    onChange={e => setNewProvince(e.target.value)}
                    className="w-full p-4 bg-white border-2 border-indigo-100 rounded-2xl font-bold text-base outline-none focus:border-indigo-400 cursor-pointer transition-colors"
                  >
                    <option value="">Select province or territory…</option>
                    {CANADIAN_PROVINCES.map(p => (
                      <option key={p.code} value={p.code}>
                        {p.name}{p.frenchMandatory ? " · French required" : ""}
                      </option>
                    ))}
                  </select>
                  {provInfo && (
                    <div className="mt-2 bg-white/80 border border-indigo-100 rounded-xl px-3 py-2 text-xs font-semibold text-indigo-700 leading-relaxed flex items-start gap-1.5">
                      <span className="mt-0.5">📌</span>
                      <span>
                        {provInfo.note}
                        {provInfo.frenchImmersion && <span className="text-blue-600 ml-1">· French Immersion available</span>}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Grade + Submit */}
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-1.5 ml-1">
                    {currDef.gradeLabel}
                  </label>
                  <select
                    value={newGrade}
                    onChange={e => setNewGrade(Number(e.target.value))}
                    className="w-full p-4 bg-white border-2 border-indigo-100 rounded-2xl font-bold text-base outline-none focus:border-indigo-400 cursor-pointer transition-colors"
                  >
                    {currDef.grades.map(g => (
                      <option key={g} value={g}>{currDef.gradeLabel} {g}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isAdding || !newName.trim()}
                  className="px-7 py-4 bg-indigo-600 text-white font-black text-lg rounded-2xl border-b-4 border-indigo-800 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed active:translate-y-1 active:border-b-0 transition-all whitespace-nowrap"
                >
                  {isAdding ? "Creating…" : "Create ✓"}
                </button>
              </div>

              {/* Subjects preview */}
              <div className="bg-white/70 rounded-2xl p-3 border border-indigo-100 mt-auto">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2">
                  Subjects included
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(SUBJECTS_BY_CURRICULUM[newCurriculum] || []).map(s => {
                    const m = SUBJECT_META[s] || { emoji: "📚", label: s };
                    return (
                      <span key={s} className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-lg">
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