"use client";
// ─── /onboarding/school ──────────────────────────────────────────────────────
// 3-step onboarding wizard for school proprietors.
// Step 1: Confirm school profile (name, type, location, curriculum region)
// Step 2: Create first class (name, year level, curriculum)
// Step 3: Success — show join code + share options
//
// Guards: must be authenticated + have a proprietor/admin school_role.
// On complete: marks schools.onboarding_completed_at, redirects to /dashboard/proprietor
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

// ── Curriculum options (school-facing — grouped by region) ───────────────────
const CURRICULA = [
  { value: "ng_primary",   label: "Nigerian Primary (NERDC / UBEC)",  region: "NG" },
  { value: "ng_jss",       label: "Nigerian JSS (NERDC / WAEC)",       region: "NG" },
  { value: "ng_sss",       label: "Nigerian SSS (WAEC / NECO)",        region: "NG" },
  { value: "uk_national",  label: "UK National Curriculum (KS1–KS4)",  region: "GB" },
  { value: "uk_ks1",       label: "UK KS1 (Year 1–2)",                 region: "GB" },
  { value: "uk_ks2",       label: "UK KS2 (Year 3–6)",                 region: "GB" },
  { value: "uk_ks3",       label: "UK KS3 (Year 7–9)",                 region: "GB" },
  { value: "uk_ks4",       label: "UK KS4 / GCSE (Year 10–11)",        region: "GB" },
];

const SCHOOL_TYPES = [
  "Primary school",
  "Secondary school",
  "Primary + Secondary (all-through)",
  "International school",
  "Private / independent school",
];

// Year levels 1–13 (label adjusted by curriculum region)
function yearOptions(curriculum) {
  const isNG = curriculum?.startsWith("ng_");
  return Array.from({ length: 13 }, (_, i) => {
    const y = i + 1;
    if (isNG) {
      if (y <= 6)  return { value: y, label: `Primary ${y}` };
      if (y <= 9)  return { value: y, label: `JSS ${y - 6}` };
      return          { value: y, label: `SSS ${y - 9}` };
    }
    return { value: y, label: `Year ${y}` };
  });
}

// ── Step indicators ───────────────────────────────────────────────────────────
function StepDot({ n, active, done }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black transition-colors
        ${done  ? "bg-green-500 text-white"
        : active ? "bg-indigo-600 text-white ring-4 ring-indigo-200 dark:ring-indigo-500/30"
        :          "bg-slate-200 dark:bg-white/10 text-slate-400"}`}>
        {done ? "✓" : n}
      </div>
    </div>
  );
}

function Steps({ step }) {
  const labels = ["School profile", "First class", "Share & go"];
  return (
    <div className="flex items-center gap-0 mb-8">
      {labels.map((l, i) => (
        <div key={i} className="flex items-center">
          <div className="flex flex-col items-center">
            <StepDot n={i + 1} active={step === i + 1} done={step > i + 1} />
            <span className={`text-[10px] font-bold mt-1 w-20 text-center leading-tight
              ${step === i + 1 ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"}`}>
              {l}
            </span>
          </div>
          {i < labels.length - 1 && (
            <div className={`h-0.5 w-12 mx-1 mb-4 rounded transition-colors
              ${step > i + 1 ? "bg-green-400" : "bg-slate-200 dark:bg-white/10"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Copy helper ───────────────────────────────────────────────────────────────
function CopyButton({ value, label = "Copy" }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button onClick={copy}
      className="px-3 py-1.5 text-xs font-black rounded-lg border border-indigo-200 dark:border-indigo-500/30
        bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300
        hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors">
      {copied ? "✓ Copied!" : label}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function SchoolOnboardingPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" /></div>}>
      <SchoolOnboardingPage />
    </Suspense>
  );
}

function SchoolOnboardingPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const claimId      = searchParams.get("schoolId"); // set when admin provisions + sends invite

  const [step, setStep]       = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");

  // School data (from DB)
  const [schoolId,   setSchoolId]   = useState(null);
  const [schoolName, setSchoolName] = useState("");
  const [schoolType, setSchoolType] = useState(SCHOOL_TYPES[0]);
  const [state,      setState]      = useState("");
  const [country,    setCountry]    = useState("Nigeria");

  // Class form
  const [className,   setClassName]   = useState("");
  const [curriculum,  setCurriculum]  = useState("ng_primary");
  const [yearLevel,   setYearLevel]   = useState(1);

  // Result
  const [joinCode,  setJoinCode]  = useState("");
  const [classId,   setClassId]   = useState("");
  const [joinLink,  setJoinLink]  = useState("");

  // newSchool = true when the user has no school yet (self-serve sign-up path)
  const [newSchool, setNewSchool] = useState(false);

  // ── Auth + load school ────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/school-login?redirect=/onboarding/school");
        return;
      }

      const { data: roles } = await supabase
        .from("school_roles")
        .select("school_id, role")
        .eq("user_id", session.user.id)
        .in("role", ["proprietor", "admin"])
        .limit(1);

      // ── Admin-provisioned claim: schoolId in URL, no role yet ─────────────
      if (!roles?.length && claimId) {
        // Claim the pre-created school via API (creates school_roles)
        const res = await fetch("/api/schools/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ schoolId: claimId }),
        });
        if (res.ok) {
          const data = await res.json();
          setSchoolId(data.schoolId);
          setSchoolName(data.schoolName || "");
          setLoading(false);
          return; // proceed to step 1 with pre-filled name
        }
        // Claim failed — fall through to new-school mode
      }

      // ── New school: no existing role row → self-serve creation ────────────
      if (!roles?.length) {
        setNewSchool(true);
        setLoading(false);
        return;
      }

      const sid = roles[0].school_id;
      setSchoolId(sid);

      const { data: school } = await supabase
        .from("schools")
        .select("name, school_type, region, country, onboarding_completed_at")
        .eq("id", sid)
        .single();

      if (school) {
        setSchoolName(school.name || "");
        setSchoolType(school.school_type || SCHOOL_TYPES[0]);
        setState(school.region || "");
        setCountry(school.country || "Nigeria");

        // Infer default curriculum from country
        if (school.country === "United Kingdom" || school.country === "UK") {
          setCurriculum("uk_national");
        }

        // If already onboarded, redirect to dashboard
        if (school.onboarding_completed_at) {
          router.push("/dashboard/proprietor");
          return;
        }
      }

      setLoading(false);
    }
    init();
  }, [router]);

  // ── Step 1 → Step 2: save school profile ─────────────────────────────────
  const saveSchoolProfile = useCallback(async () => {
    if (!schoolName.trim()) { setError("School name is required."); return; }
    setSaving(true); setError("");
    try {
      if (newSchool) {
        // Self-serve path: create school + proprietor role via API
        const res = await fetch("/api/schools/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name:       schoolName.trim(),
            schoolType,
            state:      state.trim() || null,
            country:    country.trim() || "Nigeria",
          }),
        });
        const data = await res.json();
        // 409 = school already exists for this user (race / double-click)
        if (res.status === 409 && data.schoolId) {
          setSchoolId(data.schoolId);
          setNewSchool(false);
          setStep(2);
          return;
        }
        if (!res.ok) throw new Error(data.error || "Could not create school.");
        setSchoolId(data.schoolId);
        setNewSchool(false);
      } else {
        // Existing school: update profile
        const { error: upErr } = await supabase
          .from("schools")
          .update({
            name:        schoolName.trim(),
            school_type: schoolType,
            region:      state.trim() || null,
            country:     country.trim() || null,
          })
          .eq("id", schoolId);
        if (upErr) throw upErr;
      }
      setStep(2);
    } catch (e) {
      setError(e.message || "Could not save school profile.");
    } finally {
      setSaving(false);
    }
  }, [newSchool, schoolId, schoolName, schoolType, state, country]);

  // ── Step 2 → Step 3: create class ────────────────────────────────────────
  const createClass = useCallback(async () => {
    if (!className.trim()) { setError("Class name is required."); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/schools/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId,
          className: className.trim(),
          curriculum,
          yearLevel: Number(yearLevel),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create class.");

      setJoinCode(data.joinCode);
      setClassId(data.classId);
      setJoinLink(`${window.location.origin}/join/${data.joinCode}`);
      setStep(3);
    } catch (e) {
      setError(e.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }, [schoolId, className, curriculum, yearLevel]);

  // ── Finish: mark onboarding complete + redirect ───────────────────────────
  const finish = useCallback(async () => {
    await supabase
      .from("schools")
      .update({ onboarding_completed_at: new Date().toISOString() })
      .eq("id", schoolId);
    router.push("/dashboard/proprietor");
  }, [schoolId, router]);

  // ─────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-start px-4 py-12">

      {/* Logo */}
      <div className="mb-8 flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-white text-sm">L</div>
        <span className="font-black text-lg text-white tracking-tight">LaunchPard</span>
        <span className="text-xs px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded-full font-bold ml-1">Schools</span>
      </div>

      <div className="w-full max-w-md">
        <Steps step={step} />

        {/* ── STEP 1: School Profile ────────────────────────────────────── */}
        {step === 1 && (
          <div className="bg-slate-900 rounded-2xl border border-white/10 p-6">
            <h1 className="text-xl font-black text-white mb-1">Let's set up your school</h1>
            <p className="text-sm text-slate-400 mb-6">Confirm a few details so parents can find you.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">School name</label>
                <input
                  value={schoolName}
                  onChange={e => setSchoolName(e.target.value)}
                  placeholder="e.g. Greenfield Academy"
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">School type</label>
                <select
                  value={schoolType}
                  onChange={e => setSchoolType(e.target.value)}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors">
                  {SCHOOL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">State / county</label>
                  <input
                    value={state}
                    onChange={e => setState(e.target.value)}
                    placeholder="e.g. Lagos"
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Country</label>
                  <select
                    value={country}
                    onChange={e => setCountry(e.target.value)}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors">
                    <option>Nigeria</option>
                    <option>United Kingdom</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>
            </div>

            {error && <p className="mt-3 text-xs text-red-400 font-semibold">{error}</p>}

            <button
              onClick={saveSchoolProfile}
              disabled={saving || !schoolName.trim()}
              className="mt-6 w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 font-black text-sm transition-colors">
              {saving ? "Saving…" : "Continue →"}
            </button>
          </div>
        )}

        {/* ── STEP 2: Create First Class ────────────────────────────────── */}
        {step === 2 && (
          <div className="bg-slate-900 rounded-2xl border border-white/10 p-6">
            <h1 className="text-xl font-black text-white mb-1">Create your first class</h1>
            <p className="text-sm text-slate-400 mb-6">You can add more classes from your dashboard later.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">Class name</label>
                <input
                  value={className}
                  onChange={e => setClassName(e.target.value)}
                  placeholder='e.g. "JSS 2A" or "Year 4 Blue"'
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">Curriculum</label>
                <select
                  value={curriculum}
                  onChange={e => { setCurriculum(e.target.value); setYearLevel(1); }}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors">
                  {CURRICULA.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                {(curriculum === "uk_national" || curriculum?.startsWith("uk_")) && (
                  <p className="mt-1.5 text-xs text-amber-400 font-semibold">
                    🇬🇧 British curriculum — students can also access Nigerian history topics (hybrid mode).
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">Year level</label>
                <select
                  value={yearLevel}
                  onChange={e => setYearLevel(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors">
                  {yearOptions(curriculum).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>

            {error && <p className="mt-3 text-xs text-red-400 font-semibold">{error}</p>}

            <div className="flex gap-3 mt-6">
              <button onClick={() => setStep(1)}
                className="flex-1 py-3 rounded-xl border border-white/10 hover:border-white/20 font-bold text-sm text-slate-400 hover:text-white transition-colors">
                ← Back
              </button>
              <button
                onClick={createClass}
                disabled={saving || !className.trim()}
                className="flex-[2] py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 font-black text-sm transition-colors">
                {saving ? "Creating…" : "Create class →"}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Success + Join Code ───────────────────────────────── */}
        {step === 3 && (
          <div className="bg-slate-900 rounded-2xl border border-white/10 p-6">
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">🎉</div>
              <h1 className="text-xl font-black text-white mb-1">Your class is live!</h1>
              <p className="text-sm text-slate-400">Share the join code with parents — they enter it at launchpard.com/join</p>
            </div>

            {/* Join code display */}
            <div className="bg-slate-800 border border-indigo-500/30 rounded-2xl p-5 mb-5 text-center">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Class join code</p>
              <div className="text-4xl font-black text-indigo-400 tracking-[0.25em] mb-3 font-mono">
                {joinCode}
              </div>
              <div className="flex items-center justify-center gap-2">
                <CopyButton value={joinCode} label="Copy code" />
                <CopyButton value={joinLink} label="Copy link" />
              </div>
            </div>

            {/* Share instructions */}
            <div className="bg-slate-800/50 rounded-xl p-4 mb-5 space-y-2">
              <p className="text-xs font-black text-slate-300 uppercase tracking-widest">How parents join</p>
              <ol className="space-y-1.5">
                {[
                  "Parent downloads or visits launchpard.com",
                  `They tap "Join a class" and enter code: ${joinCode}`,
                  "They create or log in to their account",
                  "Their child is linked to your class — you see their data instantly",
                ].map((step, i) => (
                  <li key={i} className="flex gap-2 text-xs text-slate-400">
                    <span className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-400 flex-shrink-0 flex items-center justify-center font-bold text-[10px]">{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>

            {/* WhatsApp share */}
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Join ${schoolName} on LaunchPard!\n\nUse class code: *${joinCode}*\n\nOr go directly to: ${joinLink}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-green-600 hover:bg-green-500 font-bold text-sm text-white transition-colors mb-3">
              <span>📱</span> Share via WhatsApp
            </a>

            <button
              onClick={finish}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-black text-sm transition-colors">
              Go to dashboard →
            </button>

            <p className="text-center text-xs text-slate-500 mt-3">
              You can add more classes and upload CSVs from your dashboard.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
