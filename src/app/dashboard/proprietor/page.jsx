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

const BuildingIcon = ({ size = 20 }) => <Icon size={size} d={["M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z","M9 22V12h6v10"]} />;
const UsersIcon = ({ size = 20 }) => <Icon size={size} d={["M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2","M16 3.13a4 4 0 0 1 0 7.75M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"]} />;
const ChartIcon = ({ size = 20 }) => <Icon size={size} d={["M3 3v18h18","M18 17V9M13 17v-4M8 17v-7"]} />;
const TrendIcon = ({ size = 20 }) => <Icon size={size} d={["M23 6l-9.5 9.5-5-5L1 18M17 6h6v6"]} />;
const GiftIcon = ({ size = 20 }) => <Icon size={size} d={["M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"]} />;
const UploadIcon = ({ size = 20 }) => <Icon size={size} d={["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4","M17 8l-5-5-5 5","M12 3v12"]} />;
const DownloadIcon = ({ size = 20 }) => <Icon size={size} d={["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4","M7 10l5 5 5-5","M12 15V3"]} />;
const LinkIcon = ({ size = 20 }) => <Icon size={size} d={["M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71","M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"]} />;
const CheckIcon = ({ size = 14 }) => <Icon size={size} d="M20 6 9 17l-5-5" />;
const ChevronDown = ({ size = 16 }) => <Icon size={size} d="m6 9 6 6 6-6" />;
const ChevronRight = ({ size = 16 }) => <Icon size={size} d="m9 18 6-6-6-6" />;

// ═══════════════════════════════════════════════════════════════════
// SKELETON LOADER
// ═══════════════════════════════════════════════════════════════════
function SkeletonCard() {
  return (
    <div className="bg-slate-800/50 rounded-lg p-4 animate-pulse">
      <div className="h-4 bg-slate-600/30 rounded w-3/4 mb-3" />
      <div className="h-6 bg-slate-600/30 rounded w-1/2" />
    </div>
  );
}

function SkeletonTableRow() {
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
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════
export default function ProprietorDashboard() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  // State
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [school, setSchool] = useState(null);
  const [schoolData, setSchoolData] = useState(null);
  const [expandedClassId, setExpandedClassId] = useState(null);
  const [uploadingCSV, setUploadingCSV] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState("");
  const [printing, setPrinting] = useState(false);
  const [sortBy, setSortBy] = useState("readiness");
  const [claimFunnel, setClaimFunnel] = useState(null); // { invited, claimed, subscribed }

  // Initialize session & load data
  useEffect(() => {
    document.title = "Proprietor Dashboard — LaunchPard";

    async function init() {
      try {
        // Check auth
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push("/login");
          return;
        }
        setSession(session);

        // Fetch school data
        // Simulated: in real implementation, query school_roles + schools table
        const { data: roles, error } = await supabase
          .from("school_roles")
          .select("school_id")
          .eq("user_id", session.user.id)
          .eq("role", "proprietor")
          .limit(1);

        if (error || !roles || roles.length === 0) {
          console.error("No school found");
          setLoading(false);
          return;
        }

        const schoolId = roles[0].school_id;

        // Fetch school overview
        const response = await fetch(`/api/schools/${schoolId}/overview`);
        if (response.ok) {
          const data = await response.json();
          setSchoolData(data);
          setSchool({ id: schoolId });
        }

        // Fetch claim funnel analytics
        const [invitedRes, claimedRes, subscribedRes] = await Promise.all([
          supabase
            .from("scholar_invitations")
            .select("id", { count: "exact", head: true })
            .eq("school_id", schoolId),
          supabase
            .from("scholar_invitations")
            .select("id", { count: "exact", head: true })
            .eq("school_id", schoolId)
            .eq("status", "claimed"),
          supabase
            .from("scholar_invitations")
            .select("id", { count: "exact", head: true })
            .eq("school_id", schoolId)
            .eq("status", "subscribed"),
        ]);
        setClaimFunnel({
          invited:    invitedRes.count  ?? 0,
          claimed:    claimedRes.count  ?? 0,
          subscribed: subscribedRes.count ?? 0,
        });

        setLoading(false);
      } catch (err) {
        console.error("Init error:", err);
        setLoading(false);
      }
    }

    init();
  }, [supabase, router]);

  // Handle CSV upload
  const handleCSVUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCSV(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`/api/schools/${school?.id}/import-scholars`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        alert("Scholars imported successfully!");
        // Refresh data
        const overviewResp = await fetch(`/api/schools/${school?.id}/overview`);
        if (overviewResp.ok) {
          const data = await overviewResp.json();
          setSchoolData(data);
        }
      } else {
        alert("Import failed. Check CSV format and try again.");
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("Upload error. Please try again.");
    } finally {
      setUploadingCSV(false);
      e.target.value = "";
    }
  };

  // Handle copy claim link
  const handleCopyClaim = async () => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://launchpard.com";
    const claimLink = `${appUrl}/parent/claim?school_id=${school?.id}`;
    try {
      await navigator.clipboard.writeText(claimLink);
      setCopyFeedback("Copied!");
      setTimeout(() => setCopyFeedback(""), 2000);
    } catch (err) {
      console.error("Copy error:", err);
    }
  };

  // Handle export/print
  const handleExport = () => {
    setPrinting(true);
    setTimeout(() => window.print(), 100);
    setTimeout(() => setPrinting(false), 1000);
  };

  // Grade band breakdown from class readiness scores
  const getGradeBands = () => {
    if (!schoolData?.classes) return null;
    const students = schoolData.classes.flatMap(c => c.students || []);
    if (students.length === 0 && schoolData.totalScholars > 0) {
      // No individual student data — derive from school average
      const avg = schoolData.schoolAverage ?? 0;
      const total = schoolData.totalScholars;
      return [
        { label: "Exceptional", colour: "#34d399", min: 85, count: Math.round(total * (avg >= 85 ? 0.4 : avg >= 70 ? 0.1 : 0.02)) },
        { label: "Ready",       colour: "#6366f1", min: 70, count: Math.round(total * (avg >= 70 ? 0.3 : avg >= 50 ? 0.15 : 0.05)) },
        { label: "Developing",  colour: "#f59e0b", min: 50, count: Math.round(total * (avg >= 50 ? 0.2 : 0.3)) },
        { label: "Needs Support",colour: "#ef4444", min: 0,  count: Math.round(total * (avg < 50 ? 0.5 : avg < 70 ? 0.2 : 0.08)) },
      ];
    }
    const bands = [
      { label: "Exceptional", colour: "#34d399", min: 85, count: 0 },
      { label: "Ready",       colour: "#6366f1", min: 70, count: 0 },
      { label: "Developing",  colour: "#f59e0b", min: 50, count: 0 },
      { label: "Needs Support",colour: "#ef4444", min: 0,  count: 0 },
    ];
    students.forEach(s => {
      const score = s.readiness ?? s.overall_score ?? 0;
      if (score >= 85)      bands[0].count++;
      else if (score >= 70) bands[1].count++;
      else if (score >= 50) bands[2].count++;
      else                  bands[3].count++;
    });
    return bands;
  };

  // Placement prediction logic
  const getPlacementPrediction = () => {
    if (!schoolData?.schoolAverage) return null;
    const avg = schoolData.schoolAverage;
    const predictedPct = Math.min(98, Math.round(avg * 1.08));

    if (avg >= 80) {
      return {
        pct: predictedPct,
        text: `Based on current readiness, ${predictedPct}% of your Primary 6 students are likely to gain admission to their first-choice secondary school.`,
      };
    }
    if (avg >= 65) {
      return {
        pct: predictedPct,
        text: `Based on current readiness, ${predictedPct}% of your students are likely to gain admission to a good secondary school.`,
      };
    }
    return {
      pct: predictedPct,
      text: "On track — continued practice and focused support recommended.",
    };
  };

  // Sort classes
  const getSortedClasses = useCallback(() => {
    if (!schoolData?.classes) return [];
    const sorted = [...schoolData.classes];
    if (sortBy === "readiness") {
      sorted.sort((a, b) => (b.avgReadiness || 0) - (a.avgReadiness || 0));
    }
    return sorted;
  }, [schoolData, sortBy]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080c15] text-white">
        <header className="bg-slate-900/50 border-b border-white/5 sticky top-0 z-40 p-4">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold">Proprietor Dashboard</h1>
          </div>
        </header>
        <div className="max-w-7xl mx-auto p-4">
          <div className="grid grid-cols-4 gap-4 mb-6">
            {Array(4).fill(0).map((_, i) => <SkeletonCard key={i} />)}
          </div>
          <div className="space-y-2">
            {Array(6).fill(0).map((_, i) => <SkeletonTableRow key={i} />)}
          </div>
        </div>
      </div>
    );
  }

  const placement = getPlacementPrediction();
  const gradeBands = getGradeBands();
  const sortedClasses = getSortedClasses();

  return (
    <div className="min-h-screen bg-[#080c15] text-white">
      {/* Header */}
      <header className="bg-slate-900/50 border-b border-white/5 sticky top-0 z-40 p-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold">{school?.name || "School Dashboard"}</h1>
          <p className="text-sm text-slate-400">Proprietor Overview</p>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Placement Prediction Banner + Grade Band Drill-Down */}
        {placement && (
          <div className="bg-gradient-to-r from-emerald-900/40 to-emerald-800/20 border border-emerald-500/30 rounded-lg p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 bg-emerald-500/20 rounded-lg h-fit">
                <GiftIcon size={24} className="text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-lg font-semibold text-emerald-100 mb-1">
                  {placement.pct}% Admission Success Prediction
                </p>
                <p className="text-emerald-200/80 text-sm">{placement.text}</p>
              </div>
              <div className="text-center flex-shrink-0">
                <div
                  className="text-3xl font-black"
                  style={{ color: placement.pct >= 75 ? "#34d399" : placement.pct >= 55 ? "#f59e0b" : "#ef4444" }}
                >
                  {placement.pct}%
                </div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider">success rate</div>
              </div>
            </div>

            {/* Probability bar */}
            <div className="h-2.5 bg-emerald-950/60 rounded-full overflow-hidden mb-4">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${placement.pct}%`,
                  background: "linear-gradient(90deg, #059669 0%, #34d399 100%)",
                }}
              />
            </div>

            {/* Grade Band Breakdown */}
            {gradeBands && (
              <div>
                <p className="text-xs font-bold text-emerald-300 uppercase tracking-wider mb-2">Student Readiness Bands</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {gradeBands.map((band) => {
                    const total = schoolData.totalScholars || 1;
                    const pct = Math.round((band.count / total) * 100);
                    return (
                      <div
                        key={band.label}
                        className="bg-slate-900/40 rounded-lg p-3 border"
                        style={{ borderColor: band.colour + "40" }}
                      >
                        <div className="flex items-center gap-1 mb-1">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: band.colour }} />
                          <p className="text-[10px] font-bold text-slate-300">{band.label}</p>
                        </div>
                        <p className="text-xl font-black" style={{ color: band.colour }}>
                          {band.count}
                        </p>
                        <p className="text-[10px] text-slate-500">{pct}% of students</p>
                        <div className="mt-1.5 h-1 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: band.colour }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Parent Claim Funnel */}
        {claimFunnel && (
          <div className="bg-slate-800/50 border border-white/10 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="font-semibold">Parent Claim Funnel</h3>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full px-2 py-0.5 font-bold">
                Live
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Invited",    count: claimFunnel.invited,    colour: "#60a5fa", icon: "📧" },
                { label: "Claimed",    count: claimFunnel.claimed,    colour: "#34d399", icon: "✅" },
                { label: "Subscribed", count: claimFunnel.subscribed, colour: "#a78bfa", icon: "⭐" },
              ].map((step, i, arr) => {
                const prev = i > 0 ? arr[i - 1].count : claimFunnel.invited;
                const convPct = prev > 0 ? Math.round((step.count / prev) * 100) : 0;
                return (
                  <div key={step.label} className="text-center">
                    <div
                      className="rounded-xl p-4 border mb-2"
                      style={{ background: step.colour + "12", borderColor: step.colour + "30" }}
                    >
                      <div className="text-xl mb-1">{step.icon}</div>
                      <div className="text-2xl font-black" style={{ color: step.colour }}>
                        {step.count}
                      </div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        {step.label}
                      </div>
                    </div>
                    {i > 0 && (
                      <div
                        className="text-[10px] font-bold"
                        style={{ color: convPct >= 50 ? "#34d399" : convPct >= 25 ? "#f59e0b" : "#ef4444" }}
                      >
                        {convPct}% conversion
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-500 mt-3">
              Conversion from invited → claimed → paying subscriber. Share the claim link to improve the invited count.
            </p>
          </div>
        )}

        {/* Stat Cards */}
        {schoolData && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Classes Count */}
              <div className="bg-slate-800/50 border border-white/10 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/20 rounded-lg">
                    <BuildingIcon size={20} className="text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Classes</p>
                    <p className="text-2xl font-bold">{schoolData.classes?.length || 0}</p>
                  </div>
                </div>
              </div>

              {/* Total Scholars */}
              <div className="bg-slate-800/50 border border-white/10 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <UsersIcon size={20} className="text-purple-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Total Scholars</p>
                    <p className="text-2xl font-bold">{schoolData.totalScholars || 0}</p>
                  </div>
                </div>
              </div>

              {/* School Average */}
              <div className="bg-slate-800/50 border border-white/10 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/20 rounded-lg">
                    <ChartIcon size={20} className="text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">School Average</p>
                    <p className="text-2xl font-bold">{schoolData.schoolAverage?.toFixed(0)}%</p>
                  </div>
                </div>
              </div>

              {/* Month Change */}
              <div className="bg-slate-800/50 border border-white/10 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/20 rounded-lg">
                    <TrendIcon size={20} className="text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Month Change</p>
                    <p className="text-2xl font-bold">
                      {schoolData.trend?.[0]?.change >= 0 ? "+" : ""}
                      {schoolData.trend?.[0]?.change?.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Classes Table */}
            <div className="bg-slate-800/50 border border-white/10 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Classes</h3>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-1 rounded bg-slate-700/50 border border-white/10 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="readiness">Sort by Readiness</option>
                  <option value="name">Sort by Name</option>
                </select>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-3 font-semibold">Class</th>
                      <th className="text-left py-3 px-3 font-semibold">Year</th>
                      <th className="text-left py-3 px-3 font-semibold">Students</th>
                      <th className="text-left py-3 px-3 font-semibold">Avg Readiness</th>
                      <th className="text-left py-3 px-3 font-semibold">% Ready</th>
                      <th className="text-left py-3 px-3 font-semibold">Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedClasses.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="py-4 px-3 text-center text-slate-400">
                          No classes yet. Upload a CSV to get started.
                        </td>
                      </tr>
                    ) : (
                      sortedClasses.map((cls) => {
                        const isExpanded = expandedClassId === cls.id;
                        const trendVal = cls.trend || 0;
                        const trendColor = trendVal >= 0 ? "text-emerald-400" : "text-red-400";

                        return (
                          <React.Fragment key={cls.id}>
                            <tr
                              onClick={() => setExpandedClassId(isExpanded ? null : cls.id)}
                              className="border-b border-white/5 hover:bg-slate-700/20 cursor-pointer transition-colors"
                            >
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-2">
                                  <span>{cls.name}</span>
                                  <ChevronRight
                                    size={14}
                                    className={`text-slate-400 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                                  />
                                </div>
                              </td>
                              <td className="py-3 px-3">{cls.year_level || "-"}</td>
                              <td className="py-3 px-3">{cls.studentCount || 0}</td>
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-16 h-2 bg-slate-700/50 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-emerald-500"
                                      style={{ width: `${(cls.avgReadiness || 0) * 1}%` }}
                                    />
                                  </div>
                                  <span className="font-bold">{cls.avgReadiness?.toFixed(0)}%</span>
                                </div>
                              </td>
                              <td className="py-3 px-3">{cls.percentReady?.toFixed(0)}%</td>
                              <td className={`py-3 px-3 font-bold ${trendColor}`}>
                                {trendVal >= 0 ? "+" : ""}
                                {trendVal.toFixed(1)}%
                              </td>
                            </tr>

                            {/* Expanded Row: Top 3 Topics */}
                            {isExpanded && cls.weakTopics && (
                              <tr className="bg-slate-700/20">
                                <td colSpan="6" className="py-4 px-3">
                                  <div>
                                    <p className="text-xs font-semibold text-slate-300 mb-3">Top 3 Weak Topics</p>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                      {cls.weakTopics.slice(0, 3).map((topic, idx) => (
                                        <div key={idx} className="bg-slate-800/50 p-3 rounded border border-white/5">
                                          <p className="text-sm font-medium mb-1">{topic.name}</p>
                                          <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden mb-2">
                                            <div className="h-full bg-amber-500" style={{ width: `${topic.average}%` }} />
                                          </div>
                                          <p className="text-xs text-slate-400">{topic.average}% avg</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Subject Breakdown */}
            <div className="bg-slate-800/50 border border-white/10 rounded-lg p-4">
              <h3 className="font-semibold mb-4">Subject Breakdown</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { key: "mathematics", subject: "Maths", emoji: "🔢" },
                  { key: "english", subject: "English", emoji: "📖" },
                  { key: "verbal_reasoning", subject: "Verbal Reasoning", emoji: "🧠" },
                  { key: "nvr", subject: "Non-verbal Reasoning", emoji: "🔷" },
                ].map((subj) => {
                  const avg = schoolData?.subjectAverages?.[subj.key] ?? 0;
                  return (
                    <div key={subj.key} className="bg-slate-700/30 p-3 rounded border border-white/5">
                      <p className="text-xs text-slate-400">{subj.emoji} {subj.subject}</p>
                      <p className="text-lg font-bold text-emerald-400 my-1">
                        {Math.max(0, avg).toFixed(0)}%
                      </p>
                      <p className="text-xs text-slate-500">
                        {avg > 0 ? "Based on class data" : "No data yet"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col md:flex-row gap-3">
              {/* CSV Upload */}
              <label className="relative flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white font-medium transition-colors cursor-pointer">
                <UploadIcon size={18} />
                {uploadingCSV ? "Uploading..." : "Upload Scholar CSV"}
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCSVUpload}
                  disabled={uploadingCSV}
                  className="absolute inset-0 opacity-0 cursor-pointer disabled:opacity-50"
                />
              </label>

              {/* Download Report */}
              <button
                onClick={handleExport}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-medium transition-colors"
              >
                <DownloadIcon size={18} />
                Download Report
              </button>

              {/* Copy Claim Link */}
              <button
                onClick={handleCopyClaim}
                className="relative flex items-center justify-center gap-2 px-4 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-medium transition-colors"
              >
                <LinkIcon size={18} />
                {copyFeedback || "Copy Claim Link"}
              </button>
            </div>

            {/* Partner programme placeholder — commission is configured per partnership agreement */}
            <div className="bg-slate-800/30 border border-white/5 rounded-lg p-4">
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Partner Programme</p>
              <p className="text-sm text-slate-400">
                Commission and partnership benefits are available for verified partner schools. Contact your LaunchPard account manager to set up a partnership agreement.
              </p>
            </div>
          </>
        )}

        {!schoolData && !loading && (
          <div className="text-center py-12">
            <p className="text-slate-400">No school data available.</p>
          </div>
        )}
      </main>

      {/* Print Styles */}
      <style>{`
        @media print {
          header, label, button, .overflow-x-auto {
            display: none;
          }
          body {
            background: white;
            color: black;
          }
          .bg-slate-800\\/50,
          .border-white\\/10,
          .bg-slate-700\\/20,
          .bg-slate-700\\/30 {
            background: white !important;
            border: 1px solid #ccc !important;
          }
          .text-white,
          .text-slate-300,
          .text-slate-400 {
            color: black !important;
          }
          .text-emerald-400,
          .text-emerald-100,
          .text-emerald-200\\/80 {
            color: #333 !important;
          }
          .bg-emerald-500 {
            background: #ccc !important;
          }
          main {
            max-width: 100%;
            padding: 20px;
          }
          table {
            border-collapse: collapse;
          }
          th, td {
            border: 1px solid #ccc !important;
            padding: 8px;
          }
        }
      `}</style>
    </div>
  );
}
