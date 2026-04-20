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

const ShieldIcon = ({ size = 20 }) => <Icon size={size} d={["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"]} />;
const InfoIcon = ({ size = 16 }) => <Icon size={size} d={["M12 16v-4m0-4v.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"]} />;

const UsersIcon = ({ size = 20 }) => <Icon size={size} d={["M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2","M16 3.13a4 4 0 0 1 0 7.75M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"]} />;
const ChartIcon = ({ size = 20 }) => <Icon size={size} d={["M3 3v18h18","M18 17V9M13 17v-4M8 17v-7"]} />;
const TrendIcon = ({ size = 20 }) => <Icon size={size} d={["M21 21H3V3h5V1m5 2h5v12m-15 0h15m-5-12l5 5m-5-5l-5 5"]} />;
const AlertIcon = ({ size = 20 }) => <Icon size={size} d={["M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3.05h16.94a2 2 0 0 0 1.71-3.05L13.71 3.86a2 2 0 0 0-3.42 0z","M12 9v6m0 3v.01"]} />;
const CheckIcon = ({ size = 16 }) => <Icon size={size} d="M20 6 9 17l-5-5" />;
const ChevronDown = ({ size = 16 }) => <Icon size={size} d="m6 9 6 6 6-6" />;
const ChevronRight = ({ size = 16 }) => <Icon size={size} d="m9 18 6-6-6-6" />;
const FilterIcon = ({ size = 16 }) => <Icon size={size} d={["M4 6h16M4 12h16M4 18h16"]} />;
const DownloadIcon = ({ size = 16 }) => <Icon size={size} d={["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4","M7 10l5 5 5-5","M12 15V3"]} />;
const BellIcon     = ({ size = 16 }) => <Icon size={size} d={["M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9","M13.73 21a2 2 0 0 1-3.46 0"]} />;
const MailIcon     = ({ size = 16 }) => <Icon size={size} d={["M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z","M22 6 12 13 2 6"]} />;
const FileTextIcon = ({ size = 16 }) => <Icon size={size} d={["M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z","M14 2v6h6","M16 13H8M16 17H8M10 9H8"]} />;
const LogOutIcon   = ({ size = 16 }) => <Icon size={size} d={["M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4","M16 17l5-5-5-5","M21 12H9"]} />;

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
    <div className="bg-slate-800/50 rounded-lg p-4 animate-pulse">
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
  const [userName, setUserName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [classData, setClassData] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [sortStudentsBy, setSortStudentsBy] = useState("readiness");
  const [expandedStudentId, setExpandedStudentId] = useState(null);
  const [printing, setPrinting] = useState(false);
  const [notifyingParentId, setNotifyingParentId] = useState(null);
  const [notifySuccess, setNotifySuccess] = useState({});
  const [downloadingReportId, setDownloadingReportId] = useState(null);
  const [noteModal, setNoteModal] = useState(null); // { studentId, studentName, email? }

  // Initialize session & load data
  useEffect(() => {
    document.title = "Teacher Dashboard — LaunchPard";

    async function init() {
      try {
        // Check auth
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push("/school-login");
          return;
        }

        // Verify the user has a school_roles row (teacher or admin)
        const { data: roles } = await supabase
          .from("school_roles")
          .select("role, school_id")
          .eq("user_id", session.user.id)
          .limit(1);

        if (!roles?.length) {
          // Authenticated but not school staff — boot them back to staff login
          await supabase.auth.signOut();
          router.push("/school-login");
          return;
        }

        setSession(session);
        setUserName(
          session.user.user_metadata?.name ||
          session.user.email?.split("@")[0] ||
          "Teacher"
        );

        const teacherSchoolId = roles[0].school_id;

        // Fetch school name (schools is publicly readable)
        const { data: schoolRow } = await supabase
          .from("schools")
          .select("name")
          .eq("id", teacherSchoolId)
          .maybeSingle();
        if (schoolRow?.name) setSchoolName(schoolRow.name);

        // Fetch classes via teacher_assignments (respects RLS for teachers)
        // Also allows proprietors who may not be in teacher_assignments
        const { data: assignedClasses, error } = await supabase
          .from("classes")
          .select("*")
          .eq("school_id", teacherSchoolId)
          .limit(20);

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

  // Filter + sort students
  const filteredStudents = useCallback(() => {
    if (!classData?.students) return [];
    const filtered = classData.students.filter((s) => {
      if (filterType === "struggling") return s.readiness < 50;
      if (filterType === "developing") return s.readiness >= 50 && s.readiness < 70;
      if (filterType === "ready")      return s.readiness >= 70;
      return true;
    });
    return filtered.sort((a, b) => {
      if (sortStudentsBy === "name") return (a.name || "").localeCompare(b.name || "");
      return (b.readiness ?? 0) - (a.readiness ?? 0);
    });
  }, [classData, filterType, sortStudentsBy]);

  // Notify Parent
  const handleNotifyParent = async (student, teacherNote = "") => {
    setNotifyingParentId(student.id);
    try {
      const res = await fetch("/api/teacher/notify-parent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scholarId: student.id,
          classId: selectedClassId,
          teacherNote,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setNotifySuccess((prev) => ({ ...prev, [student.id]: data.type }));
        setTimeout(() => setNotifySuccess((prev) => ({ ...prev, [student.id]: null })), 4000);
      } else {
        alert(data.error || "Failed to notify parent.");
      }
    } catch {
      alert("Network error — please try again.");
    } finally {
      setNotifyingParentId(null);
      setNoteModal(null);
    }
  };

  // Download per-student PDF report
  const handleDownloadReport = async (student) => {
    setDownloadingReportId(student.id);
    try {
      const res = await fetch(`/api/teacher/student-report?scholarId=${student.id}&classId=${selectedClassId}`);
      if (!res.ok) { alert("Failed to generate report."); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${student.name?.replace(/\s+/g, "_")}_Report.html`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Network error — please try again.");
    } finally {
      setDownloadingReportId(null);
    }
  };

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
      <header className="bg-slate-900/60 backdrop-blur border-b border-white/8 sticky top-0 z-40 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* School branding */}
          <div className="min-w-0">
            <h1 className="text-base font-bold leading-tight truncate">
              {schoolName || "My Classroom"}
            </h1>
            <p className="text-xs text-slate-400 truncate">
              {userName ? `${userName} · ` : ""}Teacher Dashboard
            </p>
          </div>
          {/* Class Selector + Sign out */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <label className="text-xs text-slate-400 hidden sm:block">Class:</label>
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
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.push("/school-login");
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors"
              title="Sign out"
            >
              <LogOutIcon size={14} />
              <span className="hidden sm:inline">Sign out</span>
            </button>
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

            {/* Consent counts banner — shows at a glance how many students need action */}
            {(() => {
              const granted  = classData.students?.filter(s => s.consentStatus === "granted").length  ?? 0;
              const pending  = classData.students?.filter(s => s.consentStatus !== "granted" && s.consentStatus !== "revoked").length ?? 0;
              const revoked  = classData.students?.filter(s => s.consentStatus === "revoked").length  ?? 0;
              return (
                <div className="flex flex-wrap items-center gap-3 bg-slate-800/30 border border-white/5 rounded-lg px-4 py-3">
                  <ShieldIcon size={16} className="text-slate-400 flex-shrink-0" />
                  <span className="text-xs text-slate-400 font-medium uppercase tracking-widest">NDPR Consent</span>
                  <div className="flex flex-wrap gap-2 ml-1">
                    <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-300 text-xs">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block flex-shrink-0" />
                      {granted} granted — detailed scores visible
                    </span>
                    {pending > 0 && (
                      <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-500/15 text-amber-300 text-xs">
                        <span className="w-2 h-2 rounded-full bg-amber-500 inline-block flex-shrink-0" />
                        {pending} pending — send a claim invite to unlock scores
                      </span>
                    )}
                    {revoked > 0 && (
                      <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-500/15 text-red-300 text-xs">
                        <span className="w-2 h-2 rounded-full bg-red-500 inline-block flex-shrink-0" />
                        {revoked} revoked — scores hidden per parent request
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Focus-area callout */}
            {classData.topicWeaknesses?.length > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3 flex items-start gap-3">
                <AlertIcon size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-200">
                  <span className="font-semibold">Lesson focus: </span>
                  {classData.topicWeaknesses[0].name} ({classData.topicWeaknesses[0].average}% class average) —
                  this is your class's weakest topic right now.
                </p>
              </div>
            )}

            {/* Two-Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Student List */}
              <div className="lg:col-span-2 bg-slate-800/50 border border-white/10 rounded-lg p-4">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                  <div>
                    <h3 className="font-semibold">Students</h3>
                    <p className="text-xs text-slate-500">Click a student to see subject scores and notify their parent</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {[
                      { key: "all",        label: `All (${classData.students?.length ?? 0})` },
                      { key: "struggling", label: `At Risk (${classData.students?.filter(s => s.readiness < 50).length ?? 0})` },
                      { key: "developing", label: `Developing (${classData.students?.filter(s => s.readiness >= 50 && s.readiness < 70).length ?? 0})` },
                      { key: "ready",      label: `Ready (${classData.students?.filter(s => s.readiness >= 70).length ?? 0})` },
                    ].map((f) => (
                      <button
                        key={f.key}
                        onClick={() => setFilterType(f.key)}
                        className={`px-2.5 py-1 text-xs rounded-full transition-all ${
                          filterType === f.key
                            ? "bg-emerald-500 text-white"
                            : "bg-slate-700/50 text-slate-300 hover:bg-slate-700"
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                    <select
                      value={sortStudentsBy}
                      onChange={e => setSortStudentsBy(e.target.value)}
                      className="px-2.5 py-1 text-xs rounded bg-slate-700/50 border border-white/10 text-white focus:outline-none"
                    >
                      <option value="readiness">Sort: Readiness</option>
                      <option value="name">Sort: Name</option>
                    </select>
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
                              {/* Consent indicator dot */}
                              <div
                                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                  student.consentStatus === "granted" ? "bg-emerald-500" :
                                  student.consentStatus === "revoked" ? "bg-red-500" :
                                  "bg-amber-500"
                                }`}
                                title={
                                  student.consentStatus === "granted" ? "Consent granted" :
                                  student.consentStatus === "revoked" ? "Consent revoked" :
                                  "Pending consent"
                                }
                              />
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

                          {/* Expanded Subject Scores + Actions */}
                          {isExpanded && (
                            <div className="bg-slate-700/20 px-4 py-3 border-b border-white/5 space-y-3">
                              {/* Subject scores */}
                              {student.consentStatus !== "granted" ? (
                                <div className="flex items-center gap-3 text-amber-200/80">
                                  <ShieldIcon size={18} className="flex-shrink-0" />
                                  <span className="text-sm">
                                    {student.consentStatus === "revoked"
                                      ? "Parent has withdrawn consent. Detailed scores cannot be displayed."
                                      : "Awaiting parental consent to display detailed scores."}
                                  </span>
                                </div>
                              ) : student.subjectScores ? (
                                <div className="grid grid-cols-2 gap-2">
                                  {Object.entries(student.subjectScores).map(([subject, score]) => (
                                    <div key={subject} className="bg-slate-700/50 p-2 rounded">
                                      <p className="text-xs text-slate-300">{getSubjectLabel(subject)}</p>
                                      <p className="text-sm font-bold text-emerald-400">{score}%</p>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-slate-400">No subject scores available yet.</p>
                              )}

                              {/* Action buttons */}
                              <div className="flex flex-wrap gap-2 pt-1 border-t border-white/5">
                                {/* Notify Parent */}
                                {notifySuccess[student.id] ? (
                                  <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 text-emerald-300 text-xs rounded-lg">
                                    <CheckIcon size={13} />
                                    {notifySuccess[student.id] === "claim_invite" ? "Claim link sent" : "Update sent"}
                                  </span>
                                ) : (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setNoteModal({ studentId: student.id, studentName: student.name }); }}
                                    disabled={notifyingParentId === student.id}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-xs rounded-lg transition-colors disabled:opacity-50"
                                  >
                                    {notifyingParentId === student.id ? (
                                      <span className="animate-spin">⟳</span>
                                    ) : (
                                      <BellIcon size={13} />
                                    )}
                                    Notify Parent
                                  </button>
                                )}
                                {/* Download PDF */}
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDownloadReport(student); }}
                                  disabled={downloadingReportId === student.id}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-600/50 hover:bg-slate-600/70 text-slate-300 text-xs rounded-lg transition-colors disabled:opacity-50"
                                >
                                  {downloadingReportId === student.id ? (
                                    <span className="animate-spin">⟳</span>
                                  ) : (
                                    <FileTextIcon size={13} />
                                  )}
                                  Download Report
                                </button>
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

      {/* Notify Parent — Note Modal */}
      {noteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-white/10 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="font-semibold text-lg mb-1">Notify {noteModal.studentName}&apos;s Parent</h3>
            <p className="text-sm text-slate-400 mb-4">
              Add an optional note to personalise the notification. Leave blank to send a standard progress update.
            </p>
            <textarea
              id="teacher-note"
              rows={4}
              className="w-full px-3 py-2 bg-slate-800/60 border border-white/10 rounded-lg text-sm text-white resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-500"
              placeholder="e.g. Tamar has been working really hard on fractions this week…"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  const note = document.getElementById("teacher-note")?.value || "";
                  const student = classData?.students?.find((s) => s.id === noteModal.studentId);
                  if (student) handleNotifyParent(student, note);
                }}
                disabled={notifyingParentId === noteModal.studentId}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
              >
                {notifyingParentId === noteModal.studentId ? "Sending…" : "Send Notification"}
              </button>
              <button
                onClick={() => setNoteModal(null)}
                className="px-5 py-2.5 bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Styles */}
      <style>{`
        /* ── Print header (hidden on screen, shown when printing) ─────── */
        .print-header { display: none; }

        @media print {
          /* Page setup */
          @page {
            size: A4 portrait;
            margin: 16mm 14mm;
          }

          /* Show print-only header */
          .print-header {
            display: block !important;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 2px solid #333;
          }
          .print-header h2 { font-size: 18px; font-weight: 700; margin: 0 0 2px; }
          .print-header p  { font-size: 11px; color: #555; margin: 0; }

          /* Hide interactive chrome */
          header, button, select, .print\\:hidden,
          [data-print-hide], .modal-overlay { display: none !important; }

          /* Reset backgrounds and colours */
          html, body, #__next, main {
            background: #fff !important;
            color: #111 !important;
          }
          * {
            box-shadow: none !important;
            text-shadow: none !important;
          }
          [class*="bg-slate-"],
          [class*="bg-white"],
          [class*="backdrop-blur"] {
            background: #fff !important;
          }
          [class*="border-white"],
          [class*="border-slate-"] {
            border-color: #ddd !important;
          }
          [class*="text-white"],
          [class*="text-slate-"],
          [class*="text-indigo-"],
          [class*="text-emerald-"],
          [class*="text-amber-"],
          [class*="text-red-"] {
            color: #111 !important;
          }

          /* Readiness bars — keep distinct grayscale shades */
          .bg-emerald-500 { background: #1a8a4a !important; }
          .bg-amber-500   { background: #c97a10 !important; }
          .bg-red-500     { background: #b91c1c !important; }

          /* Remove scroll limits so all rows print */
          .max-h-96, .overflow-y-auto {
            max-height: none !important;
            overflow: visible !important;
          }

          /* Layout */
          main {
            max-width: 100% !important;
            padding: 0 !important;
          }
          .grid {
            display: grid !important;
          }

          /* Avoid orphaned rows */
          .border-b { page-break-inside: avoid; }

          /* Collapse expanded detail rows in print */
          [data-expanded-detail] { page-break-inside: avoid; }
        }
      `}</style>

      {/* Print-only class header — invisible on screen */}
      <div className="print-header">
        <h2>{schoolName || "LaunchPard"} — Class Report</h2>
        <p>{currentClass?.name ?? ""} · Printed {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
      </div>
    </div>
  );
}
