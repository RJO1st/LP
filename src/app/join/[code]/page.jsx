"use client";
// ─── /join/[code] ─────────────────────────────────────────────────────────────
// Public page — no auth required to view.
// Shows class + school info, lets a parent log in and link their scholar.
//
// Flow:
//   1. Load class info from GET /api/classes/info?code=XXX (public)
//   2. If not logged in → redirect to /login?redirectTo=/join/[code]
//   3. If logged in → load their scholars, pick one, POST /api/classes/join
//   4. Success — scholar enrolled and school_id set
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createBrowserClient } from "@supabase/ssr";
import { apiFetch } from "@/lib/apiFetch";
import { supabaseKeys } from "@/lib/env";

const supabase = createBrowserClient(
  supabaseKeys.url(),
  supabaseKeys.publishable(),
);

function yearLabel(yearLevel, curriculum) {
  if (!yearLevel) return "";
  const isNG = curriculum?.startsWith("ng_");
  if (isNG) {
    if (yearLevel <= 6) return `Primary ${yearLevel}`;
    if (yearLevel <= 9) return `JSS ${yearLevel - 6}`;
    return `SSS ${yearLevel - 9}`;
  }
  return `Year ${yearLevel}`;
}

export default function JoinClassPage({ params }) {
  const { code } = use(params);
  const router = useRouter();

  const [pageState, setPageState] = useState("loading"); // loading | ready | success | error | invalid
  const [classInfo, setClassInfo] = useState(null);
  const [user,      setUser]      = useState(null);
  const [scholars,  setScholars]  = useState([]);
  const [selected,  setSelected]  = useState(null);
  const [joining,   setJoining]   = useState(false);
  const [joinError, setJoinError] = useState("");

  // ── Load class info + auth state ─────────────────────────────────────────
  useEffect(() => {
    async function init() {
      // 1. Fetch class info (public endpoint)
      const res = await fetch(`/api/classes/info?code=${encodeURIComponent(code)}`);
      if (!res.ok) {
        setPageState(res.status === 404 ? "invalid" : "error");
        return;
      }
      const info = await res.json();
      setClassInfo(info);

      // 2. Check auth
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setPageState("ready"); // show "sign in" CTA
        return;
      }
      setUser(session.user);

      // 3. Load parent's scholars
      const { data: myScholars } = await supabase
        .from("scholars")
        .select("id, name, year_level, curriculum, archived_at, school_id")
        .eq("parent_id", session.user.id)
        .is("archived_at", null);

      setScholars(myScholars || []);
      setPageState("ready");
    }
    init();
  }, [code]);

  // ── Join action ───────────────────────────────────────────────────────────
  const handleJoin = async () => {
    if (!selected) { setJoinError("Please select a scholar to enrol."); return; }
    setJoining(true); setJoinError("");
    try {
      const res = await apiFetch("/api/classes/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, scholarId: selected }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not join class.");
      setPageState("success");
    } catch (e) {
      setJoinError(e.message || "Something went wrong. Please try again.");
    } finally {
      setJoining(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  const enrolledScholarIds = scholars
    .filter(s => s.school_id === classInfo?.schoolId)
    .map(s => s.id);

  // ── Render states ────────────────────────────────────────────────────────
  if (pageState === "loading") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (pageState === "invalid") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-slate-900 rounded-2xl border border-white/10 p-8 text-center">
          <div className="text-4xl mb-3">🔍</div>
          <h1 className="text-lg font-black text-white mb-2">Code not found</h1>
          <p className="text-sm text-slate-400 mb-6">
            That join code doesn't match any active class. Check with your school and try again.
          </p>
          <Link href="/" className="text-sm font-bold text-indigo-400 hover:text-indigo-300">← Back to LaunchPard</Link>
        </div>
      </div>
    );
  }

  if (pageState === "success") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-slate-900 rounded-2xl border border-green-500/30 p-8 text-center">
          <div className="text-4xl mb-3">🎉</div>
          <h1 className="text-lg font-black text-white mb-2">You're in!</h1>
          <p className="text-sm text-slate-400 mb-2">
            <strong className="text-white">{scholars.find(s => s.id === selected)?.name}</strong> has been enrolled in{" "}
            <strong className="text-white">{classInfo?.className}</strong>.
          </p>
          <p className="text-xs text-slate-500 mb-6">
            Your child's teacher can now see their progress. You can review and withdraw consent anytime from your dashboard.
          </p>
          <Link
            href="/dashboard/parent"
            className="block py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-black text-sm text-white transition-colors">
            Go to dashboard →
          </Link>
        </div>
      </div>
    );
  }

  // ── Main join page ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-start px-4 py-12">

      {/* Logo */}
      <div className="mb-8 flex items-center gap-2.5">
        <Image src="/logo192.png" alt="LaunchPard" width={34} height={34} priority style={{ width: 34, height: 34 }} />
        <span className="font-black text-lg tracking-tight">LaunchPard</span>
      </div>

      <div className="w-full max-w-sm">

        {/* Class card */}
        {classInfo && (
          <div className="bg-slate-900 rounded-2xl border border-white/10 p-6 mb-4">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-2xl flex-shrink-0">
                🏫
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">You've been invited to join</p>
                <h1 className="text-lg font-black text-white leading-tight">{classInfo.className}</h1>
                <p className="text-sm text-slate-400 mt-0.5">{classInfo.schoolName}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <span className="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300 font-semibold">
                {yearLabel(classInfo.yearLevel, classInfo.curriculum)}
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300 font-semibold">
                {classInfo.curriculum?.replace("ng_", "Nigerian ").replace("uk_", "UK ").replace(/_/g, " ")}
              </span>
            </div>
          </div>
        )}

        {/* Not logged in */}
        {!user && (
          <div className="bg-slate-900 rounded-2xl border border-white/10 p-6 text-center">
            <p className="text-sm text-slate-300 mb-5">
              Sign in to link your child to this class and start tracking their progress.
            </p>
            <Link
              href={`/login?redirectTo=${encodeURIComponent(`/join/${code}`)}`}
              className="block py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-black text-sm transition-colors mb-3">
              Sign in to join
            </Link>
            <Link
              href={`/signup?redirectTo=${encodeURIComponent(`/join/${code}`)}`}
              className="block py-3 rounded-xl border border-white/10 hover:border-white/20 font-bold text-sm text-slate-400 hover:text-white transition-colors">
              Create a free account
            </Link>
          </div>
        )}

        {/* Logged in — scholar picker */}
        {user && (
          <div className="bg-slate-900 rounded-2xl border border-white/10 p-6">
            <h2 className="text-base font-black text-white mb-1">Which child is in this class?</h2>
            <p className="text-xs text-slate-400 mb-4">
              Select a scholar to enrol. By joining, you consent to {classInfo?.schoolName || "the school"} seeing their progress data.
            </p>

            {scholars.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-slate-400 mb-4">You don't have any scholars yet.</p>
                <Link href="/dashboard/parent" className="text-sm font-bold text-indigo-400 hover:text-indigo-300">
                  Add a scholar first →
                </Link>
              </div>
            ) : (
              <div className="space-y-2 mb-4">
                {scholars.map(s => {
                  const alreadyLinked = s.school_id === classInfo?.schoolId;
                  const isSelected   = selected === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => !alreadyLinked && setSelected(s.id)}
                      disabled={alreadyLinked}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors
                        ${alreadyLinked
                          ? "border-green-500/30 bg-green-500/5 cursor-default"
                          : isSelected
                          ? "border-indigo-500 bg-indigo-500/10"
                          : "border-white/10 bg-slate-800 hover:border-white/20"}`}>
                      <div className="w-9 h-9 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center font-black text-indigo-300 text-sm flex-shrink-0">
                        {s.name?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-white">{s.name}</p>
                        <p className="text-xs text-slate-400">
                          {yearLabel(s.year_level, s.curriculum)}
                        </p>
                      </div>
                      {alreadyLinked && (
                        <span className="text-xs font-bold text-green-400">✓ Already enrolled</span>
                      )}
                      {isSelected && !alreadyLinked && (
                        <span className="w-4 h-4 rounded-full bg-indigo-500 flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Consent note */}
            <p className="text-[10px] text-slate-500 mb-4 leading-relaxed">
              By enrolling, you grant {classInfo?.schoolName || "the school"} permission to view your child's learning progress in line with NDPR/UK GDPR. You can withdraw consent at any time from your dashboard.
            </p>

            {joinError && <p className="text-xs text-red-400 font-semibold mb-3">{joinError}</p>}

            <button
              onClick={handleJoin}
              disabled={joining || !selected}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 font-black text-sm transition-colors">
              {joining ? "Enrolling…" : "Enrol in this class →"}
            </button>
          </div>
        )}

        <p className="text-center text-xs text-slate-600 mt-4">
          <Link href="/" className="hover:text-slate-400 transition-colors">LaunchPard</Link>
          {" · "}
          <Link href="/privacy" className="hover:text-slate-400 transition-colors">Privacy policy</Link>
        </p>
      </div>
    </div>
  );
}
