"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import TopicPerformanceBreakdown from "@/components/TopicPerformanceBreakdown";

// ═══════════════════════════════════════════════════════════════════
// ICONS
// ═══════════════════════════════════════════════════════════════════
const Icon = ({ d, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
);

const UsersIcon = ({ size = 20 }) => <Icon size={size} d={["M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2","M16 3.13a4 4 0 0 1 0 7.75M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"]} />;
const ChartIcon = ({ size = 20 }) => <Icon size={size} d={["M3 3v18h18","M18 17V9M13 17v-4M8 17v-7"]} />;
const TrendIcon = ({ size = 20 }) => <Icon size={size} d={["M21 21H3V3h5V1m5 2h5v12m-15 0h15m-5-12l5 5m-5-5l-5 5"]} />;
const AlertIcon = ({ size = 20 }) => <Icon size={size} d={["M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3.05h16.94a2 2 0 0 0 1.71-3.05L13.71 3.86a2 2 0 0 0-3.42 0z","M12 9v6m0 3v.01"]} />;
const CheckIcon = ({ size = 16 }) => <Icon size={size} d="M20 6 9 17l-5-5" />;
const ChevronDown = ({ size = 16 }) => <Icon size={size} d="m6 9 6 6 6-6" />;
const ChevronRight = ({ size = 16 }) => <Icon size={size} d="m9 18 6-6-6-6" />;
const FilterIcon = ({ size = 16 }) => <Icon size={size} d={["M4 6h16M4 12h16M4 18h16"]} />;
const DownloadIcon = ({ size = 16 }) => <Icon size={size} d={["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4","M7 10l5 5 5-5","M12 15V3"]} />;

// ═══════════════════════════════════════════════════════════════════
// SUBJECT DISPLAY
// ═══════════════════════════════════════════════════════════════════
const SUBJECT_LABELS = {
  mathematics: "Maths",
  english: "English",
  english_language: "English Language",
  english_literature: "English Literature",
  science: "Science",
  combined_science: "Combined Science",
  biology: "Biology",
  chemistry: "Chemistry",
  physics: "Physics",
  history: "History",
  geography: "Geography",
  computing: "Computing",
  computer_science: "Computer Science",
};

function getSubjectLabel(subject) {
  return SUBJECT_LABELS[subject] || (subject ? subject.charAt(0).toUpperCase() + subject.slice(1).replace(/_/g, " ") : "Unknown");
}

// ═══════════════════════════════════════════════════════════════════
// READINESS COLOR & STATUS
// ═══════════════════════════════════════════════════════════════════
function getReadinessColor(pct) {
  if (pct >= 70) return { bg: "bg-emerald-500/20", bar: "bg-emerald-500", text: "text-emerald-400" };
  if (pct >= 50) return { bg: "bg-amber-500/20", bar: "bg-amber-500", text: "text-amber-400" };
  return { bg: "bg-red-500/20", bar: "bg-red-500", text: "text-red-400" };
}

function getReadinessStatus(pct) {
  if (pct >= 70) return { label: "Ready", badge: "bg-emerald-500/30 text-emerald-100 border-emerald-500/30" };
  if (pct >= 50) return { label: "Developing", badge: "bg-amber-500/30 text-amber-100 border-amber-500/30" };
  return { label: "Needs Support", badge: "bg-red-500/30 text-red-100 border-red-500/30" };
}

// ═══════════════════════════════════════════════════════════════════
// SKELETON LOADER
// ═══════════════════════════════════════════════════════════════════
function SkeletonCard() {
  return (
    <div className="bg-slate-800/50 dark:bg-slate-700/30 rounded-lg p-4 animate-pulse">
      <div className="h-4 bg-slate-600/30 rounded w-3/4 mb-3" />
      <div className="h-6 bg-slate-600/30 rounded w-1/2" />
    </div>
  );
}

function SkeletonStudentRow() {
  return (
    <div className="border-b border-white/5 py-3 animate-pulse flex items-center gap-4">
      <div className="h-4 bg-slate-600/30 rounded w-32" />
      <div className="flex-1 h-2 bg-slate-600/30 rounded" />
      <div className="h-6 bg-slate-600/30 rounded w-24" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════
export default function TeacherDashboard() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  // State
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [classData, setClassData] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [expandedStudentId, setExpandedStudentId] = useState(null);
  const [printing, setPrinting] = useState(false);

  // Initialize session & load data
  useEffect(() => {
    document.title = "Teacher Dashboard — LaunchPard";

    async function init() {
      try {
        // Check auth
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push("/login");
          return;
        }
        setSession(session);

        // Fetch teacher's classes
        // Simulated: in real implementation, query teacher_assignments table
        // For now, we'll fetch from a mock endpoint or use direct supabase query
        const { data: assignedClasses, error } = await supabase
          .from("classes")
          .select("*")
          .limit(10);

        if (error) {
          console.error("Error loading classes:", error);
        } else if (assignedClasses && assignedClasses.length > 0) {
          setClasses(assignedClasses);
          setSelectedClassId(assignedClasses[0].id);
        }

        setLoading(false);
      } catch (err) {
        console.error("Init error:", err);
        setLoading(false);
      }
    }

    init();
  }, [supabase, router]);

  // Fetch class readiness data
  useEffect(() => {
    if (!selectedClassId) return;

    async function fetchClassData() {
      try {
        const response = await fetch(`/api/class/${selectedClassId}/readiness`);
        if (response.ok) {
          const data = await response.json();
          setClassData(data);
        }
      } catch (err) {
        console.error("Error fetching class data:", err);
      }
    }

    fetchClassData();
  }, [selectedClassId]);

  // Filter students
  const filteredStudents = useCallback(() => {
    if (!classData?.students) return [];
    return classData.students.filter((s) => {
      if (filterType === "struggling") return s.readiness < 50;
      if (filterType === "ready") return s.readiness >= 70;
      return true;
    });
  }, [classData, filterType]);

  // Handle export/print
  const handleExport = () => {
    setPrinting(true);
    setTimeout(() => window.print(), 100);
    setTimeout(() => setPrinting(false), 1000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080c15] text-white">
        <header className="bg-slate-900/50 border-b border-white/5 sticky top-0 z-40 p-4">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold">My Classroom</h1>
          </div>
        </header>
        <div className="max-w-7xl mx-auto p-4">
          <div className="grid grid-cols-4 gap-4 mb-6">
            {Array(4).fill(0).map((_, i) => <SkeletonCard key={i} />)}
          </div>
          <div className="space-y-2">
            {Array(6).fill(0).map((_, i) => <SkeletonStudentRow key={i} />)}
          </div>
        </div>
      </div>
    );
  }

  const currentClass = classes.find((c) => c.id === selectedClassId);

  return (
    <div className="min-h-screen bg-[#080c15] text-white">
      {/* Header */}
      <header className="bg-slate-900/50 border-b border-white/5 sticky top-0 z-40 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">My Classroom</h1>
            <p className="text-sm text-slate-400">Monitor readiness & learning progress</p>
          </div>
          {/* Class Selector */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-300">Select Class:</label>
            <select
              value={selectedClassId || ""}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="px-3 py-2 rounded bg-slate-800/50 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Stat Cards */}
        {classData && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Total Students */}
              <div className="bg-slate-800/50 border border-white/10 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/20 rounded-lg">
                    <UsersIcon size={20} className="text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Total Students</p>
                    <p className="text-2xl font-bold">{classData.students?.length || 0}</p>
                  </div>
                </div>
              </div>

              {/* Class Average */}
              <div className="bg-slate-800/50 border border-white/10 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/20 rounded-lg">
                    <ChartIcon size={20} className="text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Class Average</p>
                    <p className="text-2xl font-bold">{classData.classAverage?.toFixed(0)}%</p>
                  </div>
                </div>
              </div>

              {/* Ready Count */}
              <div className="bg-slate-800/50 border border-white/10 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/20 rounded-lg">
                    <CheckIcon size={20} className="text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Ready</p>
                    <p className="text-2xl font-bold">
                      {classData.students?.filter((s) => s.readiness >= 70).length || 0}
                    </p>
                  </div>
                </div>
              </div>

              {/* Needs Help Count */}
              <div className="bg-slate-800/50 border border-white/10 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-500/20 rounded-lg">
                    <AlertIcon size={20} className="text-red-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Needs Help</p>
                    <p className="text-2xl font-bold">
                      {classData.students?.filter((s) => s.readiness < 50).length || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Grade Distribution Bar */}
            {classData.gradeDistribution && (
              <div className="bg-slate-800/50 border border-white/10 rounded-lg p-4">
                <p className="text-sm font-semibold mb-3">Grade Distribution</p>
                <div className="space-y-2">
                  {[
                    { label: "Exceptional", color: "bg-emerald-500", count: classData.gradeDistribution.exceptional || 0 },
                    { label: "Ready", color: "bg-emerald-400", count: classData.gradeDistribution.ready || 0 },
                    { label: "Developing", color: "bg-amber-500", count: classData.gradeDistribution.developing || 0 },
                    { label: "Needs Support", color: "bg-red-500", count: classData.gradeDistribution.struggling || 0 },
                  ].map((band) => (
                    <div key={band.label} className="flex items-center gap-3">
                      <span className="text-xs w-20">{band.label}</span>
                      <div className="flex-1 h-6 bg-slate-700/50 rounded overflow-hidden">
                        <div
                          className={`h-full ${band.color} flex items-center justify-end pr-2`}
                          style={{
                            width: `${(band.count / (classData.students?.length || 1)) * 100}%`,
                          }}
                        >
                          {band.count > 0 && <span className="text-xs font-bold">{band.count}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Two-Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Student List */}
              <div className="lg:col-span-2 bg-slate-800/50 border border-white/10 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Students</h3>
                  <div className="flex gap-2">
                    {["all", "struggling", "ready"].map((f) => (
                      <button
                        key={f}
                        onClick={() => setFilterType(f)}
                        className={`px-3 py-1 text-xs rounded transition-all ${
                          filterType === f
                            ? "bg-emerald-500 text-white"
                            : "bg-slate-700/50 text-slate-300 hover:bg-slate-700"
                        }`}
                      >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-0 max-h-96 overflow-y-auto">
                  {filteredStudents().length === 0 ? (
                    <p className="text-sm text-slate-400 py-4">No students in this filter.</p>
                  ) : (
                    filteredStudents().map((student) => {
                      const colors = getReadinessColor(student.readiness);
                      const status = getReadinessStatus(student.readiness);
                      const isExpanded = expandedStudentId === student.id;

                      return (
                        <div key={student.id}>
                          <div
                            onClick={() => setExpandedStudentId(isExpanded ? null : student.id)}
                            className="border-b border-white/5 py-3 px-2 cursor-pointer hover:bg-slate-700/30 transition-colors"
                          >
                            <div className="flex items-center gap-3 mb-2">
                              <div className="flex-1">
                                <p className="text-sm font-medium truncate">{student.name}</p>
                              </div>
                              <ChevronRight
                                size={16}
                                className={`text-slate-400 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                              />
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-slate-700/50 rounded-full overflow-hidden">
                                <div className={`h-full ${colors.bar} transition-all`} style={{ width: `${student.readiness}%` }} />
                              </div>
                              <span className={`text-xs font-bold ${colors.text}`}>{student.readiness}%</span>
                              <div className={`px-2 py-1 rounded text-xs border ${status.badge}`}>
                                {status.label}
                              </div>
                            </div>
                          </div>

                          {/* Expanded Subject Scores */}
                          {isExpanded && student.subjectScores && (
                            <div className="bg-slate-700/20 px-4 py-3 border-b border-white/5">
                              <div className="grid grid-cols-2 gap-2">
                                {Object.entries(student.subjectScores).map(([subject, score]) => (
                                  <div key={subject} className="bg-slate-700/50 p-2 rounded">
                                    <p className="text-xs text-slate-300">{getSubjectLabel(subject)}</p>
                                    <p className="text-sm font-bold text-emerald-400">{score}%</p>
                                  </div>
                                ))}
                              </div>
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
                <h3 className="font-semibold mb-4">Top Topic Gaps</h3>
                {classData.topicWeaknesses && classData.topicWeaknesses.length > 0 ? (
                  <div className="space-y-3">
                    {classData.topicWeaknesses.slice(0, 3).map((topic, idx) => (
                      <div key={idx} className="bg-slate-700/30 p-3 rounded">
                        <div className="flex items-start justify-between mb-1">
                          <p className="text-sm font-medium">{topic.name}</p>
                          <span className="text-xs text-slate-400">{topic.average}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden mb-2">
                          <div className="h-full bg-red-500" style={{ width: `${topic.average}%` }} />
                        </div>
                        <div className="flex gap-1">
                          <span className="px-2 py-0.5 bg-red-500/20 text-red-200 text-xs rounded">Focus Area</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">No data yet.</p>
                )}
              </div>
            </div>

            {/* Export Button */}
            <div className="flex justify-end">
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white font-medium transition-colors"
              >
                <DownloadIcon size={16} />
                Export Report
              </button>
            </div>
          </>
        )}

        {!classData && !loading && (
          <div className="text-center py-12">
            <p className="text-slate-400">No class data available.</p>
          </div>
        )}
      </main>

      {/* Print Styles */}
      <style>{`
        @media print {
          header, button, .overflow-y-auto {
            display: none;
          }
          body {
            background: white;
            color: black;
          }
          .bg-slate-800\\/50,
          .border-white\\/10 {
            background: white !important;
            border: 1px solid #ccc !important;
          }
          .text-white,
          .text-slate-300,
          .text-slate-400 {
            color: black !important;
          }
          .bg-emerald-500,
          .bg-amber-500,
          .bg-red-500 {
            background: #ccc !important;
          }
          .text-emerald-400 {
            color: #333 !important;
          }
          main {
            max-width: 100%;
            padding: 20px;
          }
          .max-h-96 {
            max-height: none !important;
          }
        }
      `}</style>
    </div>
  );
}
