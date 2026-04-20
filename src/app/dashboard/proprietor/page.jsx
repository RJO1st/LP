"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

// ═══════════════════════════════════════════════════════════════════
// ICONS
// ═══════════════════════════════════════════════════════════════════
const Icon = ({ d, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
);

const BuildingIcon  = ({ size = 20 }) => <Icon size={size} d={["M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z","M9 22V12h6v10"]} />;
const UsersIcon     = ({ size = 20 }) => <Icon size={size} d={["M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2","M16 3.13a4 4 0 0 1 0 7.75M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"]} />;
const ChartIcon     = ({ size = 20 }) => <Icon size={size} d={["M3 3v18h18","M18 17V9M13 17v-4M8 17v-7"]} />;
const TrendIcon     = ({ size = 20 }) => <Icon size={size} d={["M23 6l-9.5 9.5-5-5L1 18M17 6h6v6"]} />;
const UploadIcon    = ({ size = 20 }) => <Icon size={size} d={["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4","M17 8l-5-5-5 5","M12 3v12"]} />;
const DownloadIcon  = ({ size = 20 }) => <Icon size={size} d={["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4","M7 10l5 5 5-5","M12 15V3"]} />;
const LinkIcon      = ({ size = 20 }) => <Icon size={size} d={["M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71","M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"]} />;
const CheckIcon     = ({ size = 14 }) => <Icon size={size} d="M20 6 9 17l-5-5" />;
const ChevronRight  = ({ size = 16 }) => <Icon size={size} d="m9 18 6-6-6-6" />;
const ArrowLeftIcon = ({ size = 16 }) => <Icon size={size} d={["M19 12H5","M12 5l-7 7 7 7"]} />;
const AlertIcon     = ({ size = 20 }) => <Icon size={size} d={["M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3.05h16.94a2 2 0 0 0 1.71-3.05L13.71 3.86a2 2 0 0 0-3.42 0z","M12 9v6m0 3v.01"]} />;
const ShieldIcon    = ({ size = 16 }) => <Icon size={size} d={["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"]} />;
const LogOutIcon    = ({ size = 16 }) => <Icon size={size} d={["M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4","M16 17l5-5-5-5","M21 12H9"]} />;

// ═══════════════════════════════════════════════════════════════════
// READINESS HELPERS
// ═══════════════════════════════════════════════════════════════════
function getReadinessColor(pct) {
  if (pct >= 70) return { bar: "bg-emerald-500", text: "text-emerald-400" };
  if (pct >= 50) return { bar: "bg-amber-500",   text: "text-amber-400" };
  return           { bar: "bg-red-500",           text: "text-red-400" };
}

function getBandLabel(pct) {
  if (pct >= 85) return { label: "Exceptional", badge: "bg-emerald-500/20 text-emerald-200 border-emerald-500/30" };
  if (pct >= 70) return { label: "Ready",       badge: "bg-indigo-500/20 text-indigo-200 border-indigo-500/30" };
  if (pct >= 50) return { label: "Developing",  badge: "bg-amber-500/20 text-amber-200 border-amber-500/30" };
  return           { label: "Needs Support",    badge: "bg-red-500/20 text-red-200 border-red-500/30" };
}

// ═══════════════════════════════════════════════════════════════════
// SKELETON LOADERS
// ═══════════════════════════════════════════════════════════════════
function SkeletonCard() {
  return (
    <div className="bg-slate-800/50 rounded-lg p-4 animate-pulse">
      <div className="h-4 bg-slate-600/30 rounded w-3/4 mb-3" />
      <div className="h-6 bg-slate-600/30 rounded w-1/2" />
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="border-b border-white/5 py-3 animate-pulse flex items-center gap-4">
      <div className="h-4 bg-slate-600/30 rounded w-32" />
      <div className="h-4 bg-slate-600/30 rounded w-16" />
      <div className="h-4 bg-slate-600/30 rounded w-20" />
      <div className="h-4 bg-slate-600/30 rounded w-24" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// CLASS DETAIL PANEL  (teacher-level view for proprietors)
// ═══════════════════════════════════════════════════════════════════
function ClassDetailPanel({ classInfo, data, loading, onBack }) {
  const [filter, setFilter]   = useState("all");
  const [sortBy, setSortBy]   = useState("readiness");
  const [expandedId, setExp]  = useState(null);

  if (loading) {
    return (
      <div className="space-y-4">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
          <ArrowLeftIcon size={14} /> All Classes
        </button>
        <div className="space-y-2">{Array(6).fill(0).map((_, i) => <SkeletonRow key={i} />)}</div>
      </div>
    );
  }

  if (!data) return null;

  const students = data.students ?? [];

  // Counts for filter pills
  const counts = {
    all:        students.length,
    struggling: students.filter(s => s.readiness < 50).length,
    developing: students.filter(s => s.readiness >= 50 && s.readiness < 70).length,
    ready:      students.filter(s => s.readiness >= 70).length,
  };

  const visible = students
    .filter(s => {
      if (filter === "struggling") return s.readiness < 50;
      if (filter === "developing") return s.readiness >= 50 && s.readiness < 70;
      if (filter === "ready")      return s.readiness >= 70;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "name") return (a.name || "").localeCompare(b.name || "");
      return (b.readiness ?? 0) - (a.readiness ?? 0);
    });

  const subjectAverages = data.subjectAverages ?? {};

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeftIcon size={14} /> All Classes
      </button>

      {/* Class Header */}
      <div className="bg-slate-800/50 border border-white/10 rounded-lg p-5">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold">{classInfo?.name || "Class Detail"}</h2>
            <p className="text-sm text-slate-400 mt-0.5">
              Year {classInfo?.year_level || "—"} · {students.length} students · Curriculum: {classInfo?.curriculum || "—"}
            </p>
          </div>
          <div className="flex gap-4 text-center">
            <div>
              <p className="text-2xl font-black text-emerald-400">{data.classAverage?.toFixed(0) ?? "—"}%</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Class Avg</p>
            </div>
            <div>
              <p className="text-2xl font-black text-indigo-400">{counts.ready}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Ready</p>
            </div>
            <div>
              <p className="text-2xl font-black text-red-400">{counts.struggling}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">At Risk</p>
            </div>
          </div>
        </div>

        {/* Subject Averages */}
        {Object.keys(subjectAverages).length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-4 border-t border-white/5">
            {Object.entries(subjectAverages).map(([subj, avg]) => {
              const label = { mathematics: "Maths", english: "English", verbal_reasoning: "Verbal R.", nvr: "Non-verbal R." }[subj] ?? subj;
              const col = getReadinessColor(avg);
              return (
                <div key={subj} className="bg-slate-700/30 rounded p-2">
                  <p className="text-[11px] text-slate-400">{label}</p>
                  <p className={`text-base font-bold ${col.text}`}>{avg?.toFixed(0)}%</p>
                  <div className="mt-1 h-1 bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full ${col.bar}`} style={{ width: `${avg}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Two-column: Student List + Topic Gaps */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Student List */}
        <div className="lg:col-span-2 bg-slate-800/50 border border-white/10 rounded-lg p-4">
          {/* Filter + Sort toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-sm font-semibold">Students</p>
              <p className="text-xs text-slate-500">Click a student to see their subject scores</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {[
                { key: "all",        label: `All (${counts.all})` },
                { key: "struggling", label: `At Risk (${counts.struggling})` },
                { key: "developing", label: `Developing (${counts.developing})` },
                { key: "ready",      label: `Ready (${counts.ready})` },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`px-2.5 py-1 text-xs rounded-full transition-all ${
                    filter === f.key
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-700/50 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  {f.label}
                </button>
              ))}
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="px-2.5 py-1 text-xs rounded bg-slate-700/50 border border-white/10 text-white focus:outline-none"
              >
                <option value="readiness">Sort: Readiness</option>
                <option value="name">Sort: Name</option>
              </select>
            </div>
          </div>

          {/* Consent legend */}
          <div className="flex items-center gap-4 text-[11px] text-slate-500 mb-3 pb-3 border-b border-white/5">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />Consent granted</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />Pending consent</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />Revoked</span>
          </div>

          <div className="max-h-96 overflow-y-auto space-y-0">
            {visible.length === 0 ? (
              <p className="text-sm text-slate-400 py-4">No students in this filter.</p>
            ) : (
              visible.map(student => {
                const col   = getReadinessColor(student.readiness ?? 0);
                const band  = getBandLabel(student.readiness ?? 0);
                const isExp = expandedId === student.id;

                return (
                  <div key={student.id}>
                    <div
                      onClick={() => setExp(isExp ? null : student.id)}
                      className="border-b border-white/5 py-3 px-2 cursor-pointer hover:bg-slate-700/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {/* Consent dot */}
                        <span
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            student.consentStatus === "granted" ? "bg-emerald-500" :
                            student.consentStatus === "revoked" ? "bg-red-400" : "bg-amber-500"
                          }`}
                          title={student.consentStatus}
                        />
                        <p className="flex-1 text-sm font-medium truncate">{student.name}</p>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-slate-700/50 rounded-full overflow-hidden hidden sm:block">
                            <div className={`h-full ${col.bar}`} style={{ width: `${student.readiness ?? 0}%` }} />
                          </div>
                          <span className={`text-xs font-bold w-9 text-right ${col.text}`}>{student.readiness ?? 0}%</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] border ${band.badge} hidden sm:inline`}>{band.label}</span>
                        </div>
                        <ChevronRight size={14} className={`text-slate-400 transition-transform ${isExp ? "rotate-90" : ""}`} />
                      </div>
                    </div>

                    {/* Expanded: subject scores */}
                    {isExp && (
                      <div className="bg-slate-700/20 px-4 py-3 border-b border-white/5">
                        {student.consentStatus !== "granted" ? (
                          <div className="flex items-center gap-2 text-amber-300/80 text-sm">
                            <ShieldIcon size={14} />
                            {student.consentStatus === "revoked"
                              ? "Parent has withdrawn consent. Detailed scores are hidden."
                              : "Awaiting parental consent to display detailed scores."}
                          </div>
                        ) : student.subjectScores && Object.keys(student.subjectScores).length > 0 ? (
                          <div className="grid grid-cols-2 gap-2">
                            {Object.entries(student.subjectScores).map(([subj, score]) => {
                              const label = { mathematics: "Maths", english: "English", verbal_reasoning: "Verbal R.", nvr: "Non-verbal R." }[subj] ?? subj;
                              const c = getReadinessColor(score);
                              return (
                                <div key={subj} className="bg-slate-700/50 p-2 rounded">
                                  <p className="text-[11px] text-slate-400">{label}</p>
                                  <p className={`text-sm font-bold ${c.text}`}>{score}%</p>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-400">No subject data yet.</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Topic Gaps */}
        <div className="bg-slate-800/50 border border-white/10 rounded-lg p-4">
          <p className="text-sm font-semibold mb-1">Top Topic Gaps</p>
          <p className="text-xs text-slate-500 mb-4">Where the class is weakest — prioritise these in lessons</p>
          {data.topicWeaknesses?.length > 0 ? (
            <div className="space-y-3">
              {data.topicWeaknesses.slice(0, 5).map((topic, i) => (
                <div key={i} className="bg-slate-700/30 p-3 rounded">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium">{topic.name}</p>
                    <span className="text-xs text-slate-400">{topic.average}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500" style={{ width: `${topic.average}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">No topic data yet.</p>
          )}

          {/* Upgrade nudge */}
          {data.upgradeRecommendations?.count > 0 && (
            <div className="mt-4 pt-4 border-t border-white/5">
              <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                <AlertIcon size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-200">{data.upgradeRecommendations.message}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════
export default function ProprietorDashboard() {
  const router  = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  // ── School-level state ────────────────────────────────────────────
  const [loading,      setLoading]      = useState(true);
  const [userName,     setUserName]     = useState("");
  const [school,       setSchool]       = useState(null);
  const [schoolData,   setSchoolData]   = useState(null);
  const [claimFunnel,  setClaimFunnel]  = useState(null);
  const [sortBy,       setSortBy]       = useState("readiness");
  const [uploadingCSV, setUploadingCSV] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState("");

  // ── Class drill-down state ────────────────────────────────────────
  const [drillClassId,   setDrillClassId]   = useState(null); // null = school view
  const [drillData,      setDrillData]      = useState(null);
  const [drillLoading,   setDrillLoading]   = useState(false);

  // Fetch class detail when drilling in
  useEffect(() => {
    if (!drillClassId) { setDrillData(null); return; }
    setDrillLoading(true);
    fetch(`/api/class/${drillClassId}/readiness`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setDrillData(d); setDrillLoading(false); })
      .catch(() => setDrillLoading(false));
  }, [drillClassId]);

  // ── Initialise session & load school data ─────────────────────────
  useEffect(() => {
    document.title = "Proprietor Dashboard — LaunchPard";

    async function init() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { router.push("/school-login"); return; }

        const { data: staffRoles } = await supabase
          .from("school_roles")
          .select("role, school_id")
          .eq("user_id", session.user.id)
          .in("role", ["proprietor", "admin"])
          .limit(1);

        if (!staffRoles?.length) {
          const { data: teacherRoles } = await supabase
            .from("school_roles").select("role").eq("user_id", session.user.id).limit(1);
          router.push(teacherRoles?.length ? "/dashboard/teacher" : "/school-login");
          return;
        }

        setUserName(
          session.user.user_metadata?.name ||
          session.user.email?.split("@")[0] ||
          "Staff"
        );

        const schoolId = staffRoles[0].school_id;
        const response = await fetch(`/api/schools/${schoolId}/overview`);

        if (response.ok) {
          const data = await response.json();
          setSchoolData(data);
          setSchool({ id: schoolId, name: data.school?.name ?? "Your School" });
          if (data.claimFunnel) setClaimFunnel(data.claimFunnel);
        } else {
          console.error("Overview API error:", response.status);
        }
      } catch (err) {
        console.error("Init error:", err);
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [supabase, router]);

  // ── Handlers ──────────────────────────────────────────────────────
  const handleCSVUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCSV(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`/api/schools/${school?.id}/import-scholars`, { method: "POST", body: formData });
      if (response.ok) {
        const overviewResp = await fetch(`/api/schools/${school?.id}/overview`);
        if (overviewResp.ok) setSchoolData(await overviewResp.json());
        alert("Scholars imported successfully!");
      } else {
        alert("Import failed. Check CSV format and try again.");
      }
    } catch { alert("Upload error. Please try again."); }
    finally { setUploadingCSV(false); e.target.value = ""; }
  };

  const handleCopyClaim = async () => {
    const link = `${process.env.NEXT_PUBLIC_APP_URL || "https://launchpard.com"}/parent/claim?school_id=${school?.id}`;
    try { await navigator.clipboard.writeText(link); setCopyFeedback("Copied!"); setTimeout(() => setCopyFeedback(""), 2000); }
    catch { /* ignore */ }
  };

  const handleExport = () => { setTimeout(() => window.print(), 100); };

  // ── Derived data ──────────────────────────────────────────────────
  const getGradeBands = () => {
    if (!schoolData) return null;
    const students = schoolData.classes?.flatMap(c => c.students || []) ?? [];
    const total = schoolData.totalScholars || 1;
    if (students.length === 0) return null;
    const bands = [
      { label: "Exceptional", colour: "#34d399", count: 0 },
      { label: "Ready",       colour: "#6366f1", count: 0 },
      { label: "Developing",  colour: "#f59e0b", count: 0 },
      { label: "Needs Support",colour: "#ef4444", count: 0 },
    ];
    students.forEach(s => {
      const r = s.readiness ?? s.overall_score ?? 0;
      if (r >= 85) bands[0].count++;
      else if (r >= 70) bands[1].count++;
      else if (r >= 50) bands[2].count++;
      else bands[3].count++;
    });
    return { bands, total };
  };

  const getPlacementPrediction = () => {
    if (!schoolData?.schoolAverage) return null;
    const avg = schoolData.schoolAverage;
    const pct = Math.min(98, Math.round(avg * 1.08));
    return {
      pct,
      text: avg >= 80
        ? `Based on current readiness, ${pct}% of your Primary 6 students are likely to gain admission to their first-choice secondary school.`
        : avg >= 65
          ? `Based on current readiness, ${pct}% of your students are likely to gain admission to a good secondary school.`
          : "Continued focused practice is recommended to improve admission chances.",
    };
  };

  const getSortedClasses = useCallback(() => {
    if (!schoolData?.classes) return [];
    const sorted = [...schoolData.classes];
    if (sortBy === "readiness") sorted.sort((a, b) => (b.avgReadiness || 0) - (a.avgReadiness || 0));
    else if (sortBy === "name") sorted.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    else if (sortBy === "students") sorted.sort((a, b) => (b.studentCount || 0) - (a.studentCount || 0));
    return sorted;
  }, [schoolData, sortBy]);

  // ── Loading state ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#080c15] text-white">
        <header className="bg-slate-900/50 border-b border-white/5 sticky top-0 z-40 p-4">
          <div className="max-w-7xl mx-auto"><h1 className="text-lg font-bold">School Dashboard</h1></div>
        </header>
        <div className="max-w-7xl mx-auto p-4 space-y-4">
          <div className="grid grid-cols-4 gap-4">{Array(4).fill(0).map((_, i) => <SkeletonCard key={i} />)}</div>
          <div className="space-y-2">{Array(5).fill(0).map((_, i) => <SkeletonRow key={i} />)}</div>
        </div>
      </div>
    );
  }

  const placement   = getPlacementPrediction();
  const gradeBands  = getGradeBands();
  const sortedClasses = getSortedClasses();
  const drillClass  = schoolData?.classes?.find(c => c.id === drillClassId);

  return (
    <div className="min-h-screen bg-[#080c15] text-white">
      {/* ── Header ───────────────────────────────────────────────── */}
      <header className="bg-slate-900/60 backdrop-blur border-b border-white/8 sticky top-0 z-40 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-lg font-bold leading-tight truncate">
              {school?.name || "School Dashboard"}
            </h1>
            <p className="text-xs text-slate-400">
              {drillClassId ? `Classes › ${drillClass?.name ?? "Class Detail"}` : "Proprietor Overview"}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {userName && (
              <span className="hidden sm:block text-sm text-slate-400 truncate max-w-[180px]">{userName}</span>
            )}
            <button
              onClick={async () => { await supabase.auth.signOut(); router.push("/school-login"); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors"
            >
              <LogOutIcon size={14} />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Content ──────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto p-4 space-y-6">

        {/* ── DRILL-DOWN VIEW ─────────────────────────────────────── */}
        {drillClassId ? (
          <ClassDetailPanel
            classInfo={drillClass}
            data={drillData}
            loading={drillLoading}
            onBack={() => setDrillClassId(null)}
          />
        ) : (
          <>
            {/* ── SCHOOL-LEVEL VIEW ───────────────────────────────── */}

            {schoolData && (
              <>
                {/* Placement Prediction Banner */}
                {placement && (
                  <div className="bg-gradient-to-r from-emerald-900/40 to-emerald-800/20 border border-emerald-500/30 rounded-lg p-5">
                    <div className="flex items-center justify-between gap-4 mb-3">
                      <div>
                        <p className="text-xs text-emerald-400 font-bold uppercase tracking-wider mb-1">Secondary Entrance Prediction</p>
                        <p className="text-base font-semibold text-emerald-100">{placement.text}</p>
                      </div>
                      <div
                        className="text-4xl font-black flex-shrink-0"
                        style={{ color: placement.pct >= 75 ? "#34d399" : placement.pct >= 55 ? "#f59e0b" : "#ef4444" }}
                      >
                        {placement.pct}%
                      </div>
                    </div>
                    <div className="h-2 bg-emerald-950/60 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${placement.pct}%`, background: "linear-gradient(90deg,#059669,#34d399)" }} />
                    </div>
                  </div>
                )}

                {/* KPI Cards */}
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2">School Overview</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-slate-800/50 border border-white/10 rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/20 rounded-lg"><BuildingIcon size={18} /></div>
                        <div><p className="text-xs text-slate-400">Classes</p><p className="text-2xl font-bold">{schoolData.classes?.length || 0}</p></div>
                      </div>
                    </div>
                    <div className="bg-slate-800/50 border border-white/10 rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/20 rounded-lg"><UsersIcon size={18} /></div>
                        <div><p className="text-xs text-slate-400">Total Scholars</p><p className="text-2xl font-bold">{schoolData.totalScholars || 0}</p></div>
                      </div>
                    </div>
                    <div className="bg-slate-800/50 border border-white/10 rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/20 rounded-lg"><ChartIcon size={18} /></div>
                        <div><p className="text-xs text-slate-400">School Average</p><p className="text-2xl font-bold">{schoolData.schoolAverage?.toFixed(0) ?? "—"}%</p></div>
                      </div>
                    </div>
                    <div className="bg-slate-800/50 border border-white/10 rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/20 rounded-lg"><TrendIcon size={18} /></div>
                        <div>
                          <p className="text-xs text-slate-400">Month Change</p>
                          <p className="text-2xl font-bold">
                            {schoolData.trend?.[0]?.change != null
                              ? `${schoolData.trend[0].change >= 0 ? "+" : ""}${schoolData.trend[0].change.toFixed(1)}%`
                              : "—"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Grade Band Breakdown */}
                {gradeBands && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2">
                      Student Readiness Bands — how many students fall into each band
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {gradeBands.bands.map(band => {
                        const pct = Math.round((band.count / gradeBands.total) * 100);
                        return (
                          <div
                            key={band.label}
                            className="bg-slate-800/50 rounded-lg p-4 border"
                            style={{ borderColor: band.colour + "30" }}
                          >
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="w-2 h-2 rounded-full" style={{ background: band.colour }} />
                              <p className="text-xs font-bold text-slate-300">{band.label}</p>
                            </div>
                            <p className="text-2xl font-black" style={{ color: band.colour }}>{band.count}</p>
                            <p className="text-[11px] text-slate-500">{pct}% of students</p>
                            <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: band.colour }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Parent Claim Funnel */}
                {claimFunnel && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2">
                      Parent Activation — how many parents have claimed and subscribed
                    </p>
                    <div className="bg-slate-800/50 border border-white/10 rounded-lg p-4">
                      <div className="grid grid-cols-3 gap-4 mb-3">
                        {[
                          { label: "Invited",    val: claimFunnel.invited,    colour: "#60a5fa" },
                          { label: "Claimed",    val: claimFunnel.claimed,    colour: "#34d399" },
                          { label: "Subscribed", val: claimFunnel.subscribed, colour: "#a78bfa" },
                        ].map((step, i, arr) => {
                          const prev = i > 0 ? arr[i - 1].val : claimFunnel.invited;
                          const conv = prev > 0 ? Math.round((step.val / prev) * 100) : 0;
                          return (
                            <div key={step.label} className="text-center">
                              <p className="text-2xl font-black" style={{ color: step.colour }}>{step.val}</p>
                              <p className="text-xs text-slate-400 font-semibold">{step.label}</p>
                              {i > 0 && (
                                <p className="text-[10px] mt-1" style={{ color: conv >= 50 ? "#34d399" : conv >= 25 ? "#f59e0b" : "#ef4444" }}>
                                  {conv}% converted
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 via-emerald-500 to-purple-500"
                          style={{ width: claimFunnel.invited > 0 ? `${Math.round((claimFunnel.subscribed / claimFunnel.invited) * 100)}%` : "0%" }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Classes Table */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                        Classes — click any row to view full student data
                      </p>
                    </div>
                    <select
                      value={sortBy}
                      onChange={e => setSortBy(e.target.value)}
                      className="px-3 py-1 rounded bg-slate-700/50 border border-white/10 text-white text-xs focus:outline-none"
                    >
                      <option value="readiness">Sort: Readiness</option>
                      <option value="name">Sort: Name</option>
                      <option value="students">Sort: Students</option>
                    </select>
                  </div>

                  <div className="bg-slate-800/50 border border-white/10 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-white/10 bg-slate-900/30">
                            <th className="text-left py-3 px-4 font-semibold text-slate-300">Class</th>
                            <th className="text-left py-3 px-4 font-semibold text-slate-300">Year</th>
                            <th className="text-left py-3 px-4 font-semibold text-slate-300">Students</th>
                            <th className="text-left py-3 px-4 font-semibold text-slate-300">Avg Readiness</th>
                            <th className="text-left py-3 px-4 font-semibold text-slate-300">% Ready</th>
                            <th className="text-left py-3 px-4 font-semibold text-slate-300">Trend</th>
                            <th className="py-3 px-4" />
                          </tr>
                        </thead>
                        <tbody>
                          {sortedClasses.length === 0 ? (
                            <tr>
                              <td colSpan="7" className="py-8 px-4 text-center text-slate-400">
                                No classes yet. Upload a CSV to add scholars.
                              </td>
                            </tr>
                          ) : (
                            sortedClasses.map(cls => {
                              const trend = cls.trend || 0;
                              const col   = getReadinessColor(cls.avgReadiness || 0);
                              return (
                                <tr
                                  key={cls.id}
                                  onClick={() => setDrillClassId(cls.id)}
                                  className="border-b border-white/5 hover:bg-slate-700/30 cursor-pointer transition-colors"
                                >
                                  <td className="py-3 px-4 font-medium">{cls.name}</td>
                                  <td className="py-3 px-4 text-slate-400">{cls.year_level || "—"}</td>
                                  <td className="py-3 px-4">{cls.studentCount || 0}</td>
                                  <td className="py-3 px-4">
                                    <div className="flex items-center gap-2">
                                      <div className="w-16 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                                        <div className={`h-full ${col.bar}`} style={{ width: `${cls.avgReadiness || 0}%` }} />
                                      </div>
                                      <span className={`font-bold ${col.text}`}>{cls.avgReadiness?.toFixed(0) ?? "—"}%</span>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4">{cls.percentReady?.toFixed(0) ?? "—"}%</td>
                                  <td className={`py-3 px-4 font-bold ${trend >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                    {trend >= 0 ? "+" : ""}{trend.toFixed(1)}%
                                  </td>
                                  <td className="py-3 px-4">
                                    <span className="flex items-center gap-1 text-xs text-slate-400 hover:text-white whitespace-nowrap">
                                      View class <ChevronRight size={12} />
                                    </span>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Subject Breakdown */}
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2">
                    Subject Breakdown — school-wide average per subject
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { key: "mathematics", label: "Maths" },
                      { key: "english", label: "English" },
                      { key: "verbal_reasoning", label: "Verbal Reasoning" },
                      { key: "nvr", label: "Non-verbal Reasoning" },
                    ].map(subj => {
                      const avg = schoolData.subjectAverages?.[subj.key] ?? 0;
                      const col = getReadinessColor(avg);
                      return (
                        <div key={subj.key} className="bg-slate-800/50 border border-white/10 rounded-lg p-4">
                          <p className="text-xs text-slate-400 mb-1">{subj.label}</p>
                          <p className={`text-xl font-bold ${col.text}`}>{avg > 0 ? `${Math.max(0, avg).toFixed(0)}%` : "—"}</p>
                          {avg > 0 && (
                            <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
                              <div className={`h-full ${col.bar}`} style={{ width: `${avg}%` }} />
                            </div>
                          )}
                          <p className="text-[10px] text-slate-500 mt-1">{avg > 0 ? "School average" : "No data yet"}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-3">
                  <label className="relative flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white text-sm font-medium transition-colors cursor-pointer">
                    <UploadIcon size={16} />
                    {uploadingCSV ? "Uploading…" : "Upload Scholar CSV"}
                    <input type="file" accept=".csv" onChange={handleCSVUpload} disabled={uploadingCSV} className="absolute inset-0 opacity-0 cursor-pointer" />
                  </label>
                  <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-white text-sm font-medium transition-colors">
                    <DownloadIcon size={16} /> Download Report
                  </button>
                  <button onClick={handleCopyClaim} className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-white text-sm font-medium transition-colors">
                    <LinkIcon size={16} /> {copyFeedback || "Copy Parent Claim Link"}
                  </button>
                </div>
              </>
            )}

            {/* Empty state */}
            {!schoolData && (
              <div className="bg-slate-800/40 border border-white/10 rounded-xl p-10 text-center">
                <div className="text-5xl mb-4">🏫</div>
                <h2 className="text-lg font-bold mb-2">Welcome to your school dashboard</h2>
                <p className="text-slate-400 text-sm mb-6 max-w-md mx-auto">
                  Upload a scholar CSV to get started. Once scholars are added you'll see readiness scores,
                  grade bands, and admission predictions.
                </p>
                <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white font-semibold text-sm cursor-pointer transition-colors relative">
                  <UploadIcon size={16} /> Upload Scholar CSV
                  <input type="file" accept=".csv" onChange={handleCSVUpload} disabled={uploadingCSV} className="absolute inset-0 opacity-0 cursor-pointer" />
                </label>
                <p className="text-xs text-slate-500 mt-3">
                  CSV format: <code className="text-slate-400">first_name, last_name, class, year_level</code>
                </p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Print-only termly report header */}
      <div className="print-header">
        <h2>{school?.name || "LaunchPard"} — Termly Report</h2>
        <p>Proprietor overview · Printed {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
      </div>

      {/* Print Styles */}
      <style>{`
        .print-header { display: none; }

        @media print {
          @page {
            size: A4 portrait;
            margin: 16mm 14mm;
          }

          /* Reveal print header */
          .print-header {
            display: block !important;
            margin-bottom: 14px;
            padding-bottom: 8px;
            border-bottom: 2px solid #333;
          }
          .print-header h2 { font-size: 18px; font-weight: 700; margin: 0 0 2px; }
          .print-header p  { font-size: 11px; color: #555; margin: 0; }

          /* Hide interactive chrome */
          header, label, button, select,
          input[type="file"], .upload-section,
          [data-print-hide] { display: none !important; }

          /* Reset colours */
          html, body, #__next, main {
            background: #fff !important;
            color: #111 !important;
          }
          * { box-shadow: none !important; }

          [class*="bg-slate-"],
          [class*="bg-white"],
          [class*="backdrop-blur"] { background: #fff !important; }

          [class*="border-white"],
          [class*="border-slate-"] { border-color: #ddd !important; }

          [class*="text-white"],
          [class*="text-slate-"],
          [class*="text-indigo-"],
          [class*="text-emerald-"],
          [class*="text-amber-"],
          [class*="text-red-"] { color: #111 !important; }

          /* Readiness bar colours — legible in greyscale print */
          .bg-emerald-500 { background: #1a8a4a !important; }
          .bg-amber-500   { background: #c97a10 !important; }
          .bg-red-500     { background: #b91c1c !important; }
          .bg-indigo-500  { background: #4338ca !important; }

          /* Table */
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ccc !important; padding: 6px 10px; font-size: 12px; }
          thead tr { background: #f3f4f6 !important; }

          /* Remove max-height so all rows print */
          .max-h-96, [class*="overflow-y-auto"] {
            max-height: none !important;
            overflow: visible !important;
          }

          main { max-width: 100% !important; padding: 0 !important; }
          .grid { display: grid !important; }
          tr, .border-b { page-break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}
