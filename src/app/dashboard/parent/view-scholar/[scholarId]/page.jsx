// ─── Deploy to: src/app/dashboard/parent/view-scholar/[scholarId]/page.jsx ────
// Parent proxy-navigation view of a scholar's live dashboard.
// Uses the parent's existing Supabase session — no re-login needed.
// Verifies ownership via scholars.parent_id = user.id before rendering.
//
// KS1 / proxy-navigation mode:
//   All interactive features are enabled — a parent can launch quests
//   on behalf of their scholar (e.g. a KS1 child who needs guidance).
//   Quiz results are saved normally under the scholar's ID.
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import dynamic from "next/dynamic";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import AdaptiveDashboardLayout from "@/components/dashboard/AdaptiveDashboardLayout";
import useDashboardData from "@/hooks/useDashboardData";
import { getSubjectsForCurriculum } from "@/lib/gamificationEngine";

// ── Quest engine (lazy — only loaded when a quest is launched) ─────────────
const QuestOrchestrator = dynamic(
  () => import("@/components/game/QuestOrchestrator"),
  { loading: () => <LoadingScreen message="Loading Quest Environment…" /> }
);

// ── Loading screen ────────────────────────────────────────────────────────────
function LoadingScreen({ message = "Loading…" }) {
  return (
    <div className="fixed inset-0 bg-slate-900 flex flex-col items-center justify-center z-50">
      <div className="relative">
        <div className="w-16 h-16 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <img src="/logo.svg" alt="" width={24} height={24} style={{ objectFit: "contain" }} />
        </div>
      </div>
      <p className="text-slate-400 font-bold mt-4 text-sm uppercase tracking-widest">{message}</p>
    </div>
  );
}

// ── Parent proxy banner ───────────────────────────────────────────────────────
// Stays visible even during an active quest (z-index 9999).
function ParentProxyBanner({ scholarName, onReturn, questActive }) {
  return (
    <div
      style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999,
        background: questActive
          ? "linear-gradient(135deg, #065f46, #047857)"   // green while quest is running
          : "linear-gradient(135deg, #4f46e5, #7c3aed)",  // indigo on dashboard
        padding: "10px 16px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
        transition: "background 0.4s ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 18 }}>{questActive ? "🎮" : "🧑‍👩‍👦"}</span>
        <div>
          <p style={{ color: "white", fontWeight: 800, fontSize: 13, margin: 0, lineHeight: 1.2 }}>
            {questActive
              ? `Running quest for ${scholarName}`
              : `Navigating for ${scholarName}`}
          </p>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, margin: 0 }}>
            {questActive
              ? "Results will be saved to the scholar's account"
              : "Parent proxy mode — you can launch quests on their behalf"}
          </p>
        </div>
      </div>
      <button
        onClick={onReturn}
        style={{
          background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)",
          borderRadius: 8, padding: "6px 14px", color: "white",
          fontWeight: 700, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap",
          backdropFilter: "blur(4px)",
        }}
      >
        ← Return to Dashboard
      </button>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ViewScholarPage() {
  const router    = useRouter();
  const params    = useParams();
  const scholarId = params?.scholarId;

  const [supabase] = useState(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
  );

  const [authState, setAuthState] = useState("loading"); // loading | verified | denied | error
  const [scholar,   setScholar]   = useState(null);

  // ── Active quest state (null = dashboard, string = subject being quizzed) ──
  const [activeSubject, setActiveSubject] = useState(null);

  // ── Verify parent owns this scholar ────────────────────────────────────────
  useEffect(() => {
    if (!scholarId || !supabase) return;
    (async () => {
      try {
        const { data: { user }, error: authErr } = await supabase.auth.getUser();
        if (authErr || !user) {
          router.replace("/login");
          return;
        }

        const { data: scholarData, error: scholarErr } = await supabase
          .from("scholars")
          .select("*")
          .eq("id", scholarId)
          .eq("parent_id", user.id)
          .single();

        if (scholarErr || !scholarData) {
          setAuthState("denied");
          return;
        }

        setScholar(scholarData);
        setAuthState("verified");
      } catch (e) {
        console.error("[view-scholar] auth check failed", e);
        setAuthState("error");
      }
    })();
  }, [scholarId, supabase, router]);

  // ── Dashboard data via parent's Supabase session ────────────────────────
  const {
    stats, topics, journal, dailyAdventure, encouragement,
    careerTopic, examData, masteryData, peerComparisons, pastMocks,
    loading: dataLoading, refetch,
  } = useDashboardData(scholar, supabase);

  // ── Derived values — all hooks BEFORE any conditional returns ───────────
  const yearLevel  = parseInt(scholar?.year_level || scholar?.year, 10) || 4;
  const curriculum = scholar?.curriculum || "uk_national";
  const subjects   = useMemo(
    () => getSubjectsForCurriculum(curriculum),
    [curriculum]
  );

  // ── Quest event handlers ────────────────────────────────────────────────
  const launchQuest = useCallback((subject) => {
    const subj = subject || subjects[0] || "mathematics";
    setActiveSubject(subj);
  }, [subjects]);

  const handleQuestClose = useCallback(() => {
    setActiveSubject(null);
  }, []);

  const handleQuestComplete = useCallback(async () => {
    setActiveSubject(null);
    // Re-fetch dashboard data so progress is reflected immediately
    await refetch();
    // Also refresh the scholar record (coins/XP may have changed)
    if (scholarId && supabase) {
      const { data: fresh } = await supabase
        .from("scholars")
        .select("*")
        .eq("id", scholarId)
        .single();
      if (fresh) setScholar(fresh);
    }
  }, [scholarId, supabase, refetch]);

  // ── Proxy handlers wired to real quest launch ───────────────────────────
  const proxyHandlers = useMemo(() => ({
    onStartQuest:         (subj)  => launchQuest(subj || subjects[0] || "mathematics"),
    onTopicClick:         (topic) => launchQuest(topic?.subject || subjects[0] || "mathematics"),
    onStartAdventure:     (subj)  => launchQuest(subj || subjects[0] || "mathematics"),
    onStartRevisionTopic: (topic) => launchQuest(topic || subjects[0] || "mathematics"),
    // These remain benign no-ops (mock tests & exam mode require scholar session)
    onStartMock:          () => {},
    onExamModeSwitch:     () => {},
    // Dismissals are fine
    onDismissEncourage:   () => {},
    onDismissCareer:      () => {},
    // Avatar / sign-out route back to parent dashboard
    onAvatar:             () => {},
    onSignOut:            () => router.push("/dashboard/parent"),
  }), [launchQuest, subjects, router]);

  const handleReturn = useCallback(() => router.push("/dashboard/parent"), [router]);

  // ── Render states ───────────────────────────────────────────────────────
  if (authState === "loading") return <LoadingScreen message="Verifying access…" />;

  if (authState === "denied") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-sm text-center shadow-lg">
          <div className="text-4xl mb-4">🔒</div>
          <h2 className="text-xl font-black text-slate-900 mb-2">Access Denied</h2>
          <p className="text-sm text-slate-500 mb-6">
            This scholar is not linked to your account.
          </p>
          <button
            onClick={handleReturn}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl text-sm transition-colors"
          >
            Return to Parent Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (authState === "error") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-sm text-center shadow-lg">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-black text-slate-900 mb-2">Something went wrong</h2>
          <p className="text-sm text-slate-500 mb-6">
            Unable to load this scholar&apos;s dashboard.
          </p>
          <button
            onClick={handleReturn}
            className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-xl text-sm transition-colors"
          >
            Return to Parent Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!scholar) return <LoadingScreen message="Loading scholar…" />;

  return (
    <>
      {/* Fixed proxy banner — always above everything including the quest engine */}
      <ParentProxyBanner
        scholarName={scholar.name || "Scholar"}
        onReturn={handleReturn}
        questActive={!!activeSubject}
      />

      {/* Active quest — full screen takeover (sits below banner via z-index) */}
      {activeSubject && (
        <div style={{ paddingTop: 52, position: "fixed", inset: 0, zIndex: 9000, overflow: "auto" }}>
          <QuestOrchestrator
            key={`${activeSubject}-${scholar.id}`}
            student={{
              ...scholar,
              name:       scholar.name || scholar.codename || "Scholar",
              year_level: yearLevel,
              curriculum,
            }}
            subject={activeSubject}
            curriculum={curriculum}
            onClose={handleQuestClose}
            onComplete={handleQuestComplete}
          />
        </div>
      )}

      {/* Dashboard — always mounted, hidden behind quest overlay when quest is active */}
      <div style={{ paddingTop: 52, visibility: activeSubject ? "hidden" : "visible" }}>
        <ThemeProvider yearLevel={yearLevel} curriculum={curriculum}>
          {dataLoading ? (
            <LoadingScreen message={`Loading ${scholar.name}'s dashboard…`} />
          ) : (
            <AdaptiveDashboardLayout
              scholar={{
                ...scholar,
                name:       scholar.name || scholar.codename || "Scholar",
                year_level: yearLevel,
                curriculum,
              }}
              stats={stats}
              topics={topics}
              subjects={subjects}
              subject={subjects[0] || "mathematics"}
              journalEntries={journal}
              dailyAdventure={dailyAdventure}
              encouragement={encouragement}
              careerTopic={careerTopic}
              examData={examData}
              masteryData={masteryData}
              peerComparisons={peerComparisons}
              pastMocks={pastMocks}
              leaderboard={[]}
              scholarId={scholarId}
              supabase={supabase}
              coins={scholar.coins ?? 0}
              todayQCount={0}
              effectiveTier="pro"
              earnedBadgeIds={[]}
              {...proxyHandlers}
            />
          )}
        </ThemeProvider>
      </div>
    </>
  );
}
