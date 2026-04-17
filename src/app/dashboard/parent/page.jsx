"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { getCurriculumInfo, formatGradeLabel, getLevelInfo } from "@/lib/gamificationEngine";
import { getProgressionState } from "@/lib/progressionEngine";
import { getLimit, getTierLabel } from "@/lib/tierAccess";
import { EXAM_MODES } from "@/lib/examModes";
import GraduationModal from "@/components/GraduationModal";
import { ensureReferralCode, getReferralStats } from "@/lib/referralSystem";
import ReadinessScore from "@/components/ReadinessScore";
import DashboardTour, { TourHelpButton, useTourReset } from "@/components/DashboardTour";
import DarkModeToggle from "@/components/theme/DarkModeToggle";
import CoachesCorner from "@/components/CoachesCorner";
import ValueReport from "@/components/dashboard/ValueReport";
import PushNotificationPrompt from "@/components/pwa/PushNotificationPrompt";
import MultiChildComparison from "@/components/dashboard/MultiChildComparison";

// ═══════════════════════════════════════════════════════════════════
// ICONS
// ═══════════════════════════════════════════════════════════════════
const Icon = ({ d, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
);

const PlusIcon    = ({ size = 22 }) => <Icon size={size} d="M12 5v14M5 12h14" />;
const LogOutIcon  = ({ size = 18 }) => <Icon size={size} d={["M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4","M16 17l5-5-5-5","M21 12H9"]} />;
const CopyIcon    = ({ size = 16 }) => <Icon size={size} d={["M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2","M8 2h8v4H8z"]} />;
const CheckIcon   = ({ size = 14 }) => <Icon size={size} d="M20 6 9 17l-5-5" />;
const ChevronDown = ({ size = 16 }) => <Icon size={size} d="m6 9 6 6 6-6" />;
const ChevronUp   = ({ size = 16 }) => <Icon size={size} d="m18 15-6-6-6 6" />;
const StarIcon    = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
  </svg>
);

// Dashboard nav icons
const DashIcon = ({ size = 20 }) => <Icon size={size} d={["M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2M3 9h18","M9 21v-7h6v7"]} />;
const StudentsIcon = ({ size = 20 }) => <Icon size={size} d={["M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2","M16 3.13a4 4 0 0 1 0 7.75M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"]} />;
const MilestoneIcon = ({ size = 20 }) => <Icon size={size} d={["M6 9l6-3 6 3m0 11l-6 3-6-3M6 9v6m0 6v-6m6-3v6m6-6v6"]} />;
const CreditCardIcon = ({ size = 20 }) => <Icon size={size} d={["M2 7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7z","M2 12h20"]} />;
const SettingsIcon = ({ size = 20 }) => <Icon size={size} d={["M12 1v6m0 6v6M1 12h6m6 0h6M4.22 4.22l4.24 4.24m3.08 3.08l4.24 4.24M4.22 19.78l4.24-4.24m3.08-3.08l4.24-4.24"]} />;

// ═══════════════════════════════════════════════════════════════════
// CURRICULA / SUBJECT DATA (unchanged from production)
// ═══════════════════════════════════════════════════════════════════
const CURRICULA = {
  uk_national:    { country: "🇬🇧", name: "UK National",         gradeLabel: "Year",    grades: [1,2,3,4,5,6,7,8,9,10,11] },
  us_common_core: { country: "🇺🇸", name: "US Common Core",      gradeLabel: "Grade",   grades: [1,2,3,4,5,6,7,8] },
  ca_primary:     { country: "🇨🇦", name: "Canadian Primary",    gradeLabel: "Grade",   grades: [1,2,3,4,5,6,7,8], hasProvinces: true },
  ca_secondary:   { country: "🇨🇦", name: "Canadian Secondary",  gradeLabel: "Grade",   grades: [9,10,11,12], hasProvinces: true },
  aus_acara:      { country: "🇦🇺", name: "Australian",          gradeLabel: "Year",    grades: [1,2,3,4,5,6,7,8,9] },
  ib_pyp:         { country: "🌍", name: "IB PYP",               gradeLabel: "Year",    grades: [1,2,3,4,5,6] },
  ib_myp:         { country: "🌍", name: "IB MYP",               gradeLabel: "Year",    grades: [1,2,3,4,5] },
  ng_primary:     { country: "🇳🇬", name: "Nigerian Primary",    gradeLabel: "Primary", grades: [1,2,3,4,5,6] },
  ng_jss:         { country: "🇳🇬", name: "Nigerian JSS",        gradeLabel: "JSS",     grades: [1,2,3] },
  ng_sss:         { country: "🇳🇬", name: "Nigerian SSS",        gradeLabel: "SS",      grades: [1,2,3] },
};

const NG_SSS_COMPULSORY = ["english","mathematics","civic_education","digital_technologies"];
const NG_SSS_STREAMS = {
  science:    { label: "Science",    emoji: "🔬", subjects: ["biology","chemistry","physics","further_mathematics","agricultural_science","health_education","geography"] },
  humanities: { label: "Humanities", emoji: "📜", subjects: ["literature_in_english","government","nigerian_history","home_management"] },
  business:   { label: "Business",   emoji: "💼", subjects: ["economics","accounting","commerce","marketing"] },
};
const NG_SSS_TRADES = [
  { value: "data_processing", label: "Data Processing" },
  { value: "marketing",       label: "Marketing" },
];
const NG_JSS_SUBJECTS = [
  "mathematics","english_studies","basic_science","basic_technology","social_studies",
  "business_education","cultural_and_creative_arts","pre_vocational_studies",
  "religious_studies","civic_education","basic_digital_literacy","agricultural_science",
];
const UK_KS4_COMPULSORY = ["mathematics","english_language","english_literature","combined_science","citizenship"];
const UK_KS4_OPTIONS = [
  { group: "STEM", emoji: "🔬", subjects: [
    { value: "biology", label: "Biology (Triple)" }, { value: "chemistry", label: "Chemistry (Triple)" },
    { value: "physics", label: "Physics (Triple)" }, { value: "computer_science", label: "Computer Science" },
    { value: "further_mathematics", label: "Further Mathematics" }, { value: "statistics", label: "Statistics" },
  ]},
  { group: "Arts & Humanities", emoji: "🎨", subjects: [
    { value: "history", label: "History" }, { value: "geography", label: "Geography" },
    { value: "religious_education", label: "Religious Education" }, { value: "media_studies", label: "Media Studies" },
  ]},
  { group: "Vocational & Technical", emoji: "🛠", subjects: [
    { value: "business_studies", label: "Business Studies" }, { value: "ict", label: "ICT" },
    { value: "design_technology", label: "Design & Technology" }, { value: "food_technology", label: "Food Technology" },
    { value: "health_social_care", label: "Health & Social Care" },
  ]},
];
const UK_KS4_YEARS = [10, 11];
const needsSubjectSelection = (curriculum, year) => curriculum === "uk_national" && UK_KS4_YEARS.includes(Number(year));
const UK_NATIONAL_SUBJECTS = {
  ks1: ["mathematics","english","science"],
  ks2: ["mathematics","english","science","history","geography","computing","design_technology","religious_education"],
  ks3: ["mathematics","english_language","english_literature","combined_science","history","geography","citizenship","computing","design_technology"],
  ks4: ["mathematics","english_language","english_literature","combined_science","citizenship"],
};
const getUkNationalKeyStage = (year) => {
  const y = Number(year);
  if (y <= 2) return "ks1";
  if (y <= 6) return "ks2";
  if (y <= 9) return "ks3";
  return "ks4";
};
const getScholarSubjects = (curriculum, stream, tradeSubject, selectedSubjects, year, examMode, province) => {
  if (curriculum === "ng_sss") {
    const streamSubjects = stream ? (NG_SSS_STREAMS[stream]?.subjects || []) : [];
    return [...NG_SSS_COMPULSORY, ...streamSubjects, ...(tradeSubject ? [tradeSubject] : [])];
  }
  if (curriculum === "uk_national") {
    const ks = getUkNationalKeyStage(year);
    const base = UK_NATIONAL_SUBJECTS[ks];
    const _examDef   = EXAM_MODES[examMode] ?? null;
    const examExtras = (_examDef?.eligibleYears.includes(Number(year)) ? _examDef.extraSubjects : []) ?? [];
    if (ks === "ks4") return [...base, ...(selectedSubjects || []), ...examExtras];
    return [...base, ...examExtras];
  }
  // US Common Core — grade-banded
  if (curriculum === "us_common_core") {
    const band = getUsGradeBand(year);
    return US_COMMON_CORE_SUBJECTS[band] || SUBJECTS_BY_CURRICULUM.us_common_core;
  }
  // Canadian Primary — grade-banded + province extras
  if (curriculum === "ca_primary") {
    const band = getCaPrimaryBand(year);
    const base = CA_PRIMARY_SUBJECTS[band] || SUBJECTS_BY_CURRICULUM.ca_primary;
    const provinceExtras = province && CA_PROVINCE_EXTRAS[province] ? CA_PROVINCE_EXTRAS[province].subjects : [];
    // Merge without duplicates
    return [...new Set([...base, ...provinceExtras])];
  }
  // Canadian Secondary — grade-banded + province extras
  if (curriculum === "ca_secondary") {
    const band = getCaSecondaryBand(year);
    const base = CA_SECONDARY_SUBJECTS[band] || SUBJECTS_BY_CURRICULUM.ca_secondary;
    const provinceExtras = province && CA_PROVINCE_EXTRAS[province] ? CA_PROVINCE_EXTRAS[province].subjects : [];
    return [...new Set([...base, ...provinceExtras])];
  }
  return SUBJECTS_BY_CURRICULUM[curriculum] || [];
};
// ── US Common Core: grade-banded subjects ──────────────────────────
const US_COMMON_CORE_SUBJECTS = {
  // K-2 equivalent (Grades 1-2)
  lower_elementary: ["mathematics","english","science","social_studies"],
  // Grades 3-5
  upper_elementary: ["mathematics","english","science","social_studies","health"],
  // Grades 6-8 (Middle School)
  middle_school: ["mathematics","english_language_arts","earth_science","life_science","physical_science","us_history","world_geography","civics","health","computer_science"],
};
const getUsGradeBand = (year) => {
  const y = Number(year);
  if (y <= 2) return "lower_elementary";
  if (y <= 5) return "upper_elementary";
  return "middle_school";
};

// ── Canadian Primary: grade-banded subjects ────────────────────────
const CA_PRIMARY_SUBJECTS = {
  // Grades 1-3
  early: ["mathematics","english","science","social_studies","health"],
  // Grades 4-6
  intermediate: ["mathematics","english","science","social_studies","health","computing"],
  // Grades 7-8
  senior: ["mathematics","english","science","social_studies","geography","history","health","computer_studies"],
};
const getCaPrimaryBand = (year) => {
  const y = Number(year);
  if (y <= 3) return "early";
  if (y <= 6) return "intermediate";
  return "senior";
};

// ── Canadian Secondary: grade-banded subjects ──────────────────────
const CA_SECONDARY_SUBJECTS = {
  // Grade 9
  grade_9: ["mathematics","english","science","canadian_geography","career_studies","civics"],
  // Grade 10
  grade_10: ["mathematics","english","science","canadian_history","civics","career_studies","computer_science"],
  // Grade 11
  grade_11: ["mathematics","english","biology","chemistry","physics","world_history","computer_science","environmental_science"],
  // Grade 12
  grade_12: ["mathematics","english","biology","chemistry","physics","computer_science","economics","world_issues","philosophy"],
};
const getCaSecondaryBand = (year) => `grade_${Number(year)}`;

// ── Canadian province-specific additional subjects ─────────────────
const CA_PROVINCE_EXTRAS = {
  ON: { subjects: [], note: "Ontario curriculum" },
  BC: { subjects: ["environmental_studies"], note: "BC inquiry-based curriculum" },
  AB: { subjects: ["social_studies_alberta"], note: "Alberta: strong STEM focus with unique social studies framework" },
  MB: { subjects: [], note: "Manitoba curriculum" },
  NB: { subjects: ["community_studies"], note: "New Brunswick curriculum" },
  NS: { subjects: [], note: "Nova Scotia curriculum" },
  NL: { subjects: ["newfoundland_studies"], note: "Newfoundland: local history and geography" },
  PE: { subjects: ["island_studies"], note: "PEI: strong community focus" },
  SK: { subjects: [], note: "Saskatchewan curriculum" },
  NT: { subjects: ["northern_studies"], note: "NWT: Northern studies focus" },
  YT: { subjects: [], note: "Yukon follows BC curriculum framework" },
  NU: { subjects: [], note: "Nunavut curriculum" },
};

const SUBJECTS_BY_CURRICULUM = {
  uk_national:    ["mathematics","english","science"],
  us_common_core: ["mathematics","english","science"],
  aus_acara:      ["maths","english","science"],
  ib_pyp:         ["maths","english","science"],
  ib_myp:         ["maths","english","science"],
  ng_primary:     ["mathematics","english","basic_science","social_studies"],
  ng_jss:         NG_JSS_SUBJECTS,
  ng_sss:         NG_SSS_COMPULSORY,
  ca_primary:     ["mathematics","english","science","social_studies"],
  ca_secondary:   ["mathematics","english","science","canadian_history","geography"],
};
const SUBJECT_META = {
  maths:"🔢",mathematics:"🔢",further_mathematics:"📐",statistics:"📊",
  english:"📖",english_language:"📖",english_literature:"📖",english_studies:"📖",
  english_language_arts:"📖",literature_in_english:"📖",verbal:"🧩",verbal_reasoning:"🧩",nvr:"🔷",
  science:"🔬",biology:"🧬",chemistry:"🧪",physics:"⚛️",combined_science:"🔬",
  earth_science:"🌎",life_science:"🧬",physical_science:"⚛️",environmental_science:"🌿",
  environmental_studies:"🌿",basic_science:"🔬",basic_technology:"🔧",health_education:"🏥",
  health:"🏥",agricultural_science:"🌱",
  history:"🏛️",nigerian_history:"🏛️",us_history:"🇺🇸",world_history:"🌎",world_geography:"🗺️",
  canadian_geography:"🍁",canadian_history:"🍁",histoire_du_quebec:"🏛️",
  geography:"🗺️",social_studies:"🌍",social_studies_alberta:"🌍",civics:"⚖️",world_issues:"🌎",
  religious_education:"✝️",religious_studies:"✝️",ethique_culture_religieuse:"🙏",
  government:"🏛️",civic_education:"⚖️",citizenship:"⚖️",
  cultural_and_creative_arts:"🎨",home_management:"🏠",pre_vocational_studies:"🛠",
  digital_technologies:"💻",media_studies:"📺",economics:"📈",business_studies:"💼",
  business_education:"💼",commerce:"💰",accounting:"📒",financial_accounting:"📒",
  marketing:"📣",computer_science:"💻",computer_studies:"💻",ict:"💻",
  basic_digital_literacy:"💻",design_technology:"⚙️",
  food_technology:"🍳",data_processing:"🖥️",physical_education:"🏃",
  sport_science:"⚽",computing:"💻",
  // Canadian province-specific
  french:"🇫🇷",french_language:"🇫🇷",french_immersion:"🇫🇷",
  first_peoples_english:"🪶",first_nations_studies:"🪶",indigenous_studies:"🪶",
  indigenous_languages:"🪶",inuktitut:"🪶",inuit_studies:"🪶",mi_kmaw_studies:"🪶",
  northern_studies:"❄️",newfoundland_studies:"🏔️",island_studies:"🏝️",community_studies:"🏘️",
  philosophy:"🤔",career_studies:"🎯",arts:"🎨",art:"🎨",music:"🎵",
};
const SUBJECT_DISPLAY_OVERRIDES = {
  mathematics: "📚 Mathematics",
  english: "📖 English",
  science: "🔬 Science",
  history: "📜 History",
  geography: "🌍 Geography",
  computing: "💻 Computing",
  design_and_technology: "⚙️ Design & Technology",
  design_technology: "⚙️ Design & Technology",
  religious_education: "✝️ Religious Education",
  physical_education: "🏃 Physical Education",
  maths: "📚 Mathematics",
  physics: "⚛️ Physics",
  chemistry: "🧪 Chemistry",
  biology: "🧬 Biology",
  further_mathematics: "📐 Further Mathematics",
  business_studies: "💼 Business Studies",
  computer_science: "💻 Computer Science",
  computer_studies: "💻 Computer Studies",
  basic_technology: "🔧 Basic Technology",
  basic_science: "🧪 Basic Science",
  financial_accounting: "📒 Financial Accounting",
  basic_digital_literacy: "💻 Basic Digital Literacy",
  food_technology: "🍳 Food Technology",
  sport_science: "⚽ Sport Science",
  data_processing: "🖥️ Data Processing",
  media_studies: "📺 Media Studies",
  business_education: "💼 Business Education",
  // US subjects
  english_language_arts: "📖 English Language Arts",
  earth_science: "🌎 Earth Science",
  life_science: "🧬 Life Science",
  physical_science: "⚛️ Physical Science",
  us_history: "🇺🇸 US History",
  world_geography: "🗺️ World Geography",
  world_history: "🌎 World History",
  world_issues: "🌎 World Issues",
  environmental_science: "🌿 Environmental Science",
  environmental_studies: "🌿 Environmental Studies",
  // Canadian subjects
  social_studies: "🌍 Social Studies",
  social_studies_alberta: "🌍 Social Studies (Alberta)",
  canadian_history: "🍁 Canadian History",
  canadian_geography: "🍁 Canadian Geography",
  french: "🇫🇷 French",
  french_language: "🇫🇷 French Language",
  french_immersion: "🇫🇷 French Immersion",
  civics: "⚖️ Civics",
  career_studies: "🎯 Career Studies",
  arts: "🎨 Arts",
  art: "🎨 Art",
  music: "🎵 Music",
  health: "🏥 Health",
  // Province-specific
  histoire_du_quebec: "🏛️ Histoire du Québec",
  ethique_culture_religieuse: "🙏 Éthique & Culture Religieuse",
  first_peoples_english: "🪶 First Peoples English",
  first_nations_studies: "🪶 First Nations Studies",
  indigenous_studies: "🪶 Indigenous Studies",
  indigenous_languages: "🪶 Indigenous Languages",
  inuktitut: "🪶 Inuktitut",
  inuit_studies: "🪶 Inuit Studies",
  mi_kmaw_studies: "🪶 Mi'kmaw Studies",
  northern_studies: "❄️ Northern Studies",
  newfoundland_studies: "🏔️ Newfoundland Studies",
  island_studies: "🏝️ Island Studies",
  community_studies: "🏘️ Community Studies",
  philosophy: "🤔 Philosophy",
  economics: "📈 Economics",
};
const subjectLabel = (s) => {
  // Check override map first (strips emoji prefix for pure label usage)
  const override = SUBJECT_DISPLAY_OVERRIDES[s];
  if (override) {
    // Return label WITHOUT emoji (emoji handled by subjectEmoji)
    return override.replace(/^[^\w]+/, "").trim();
  }
  // Fallback: title-case with & for "and"
  return s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()).replace(/\bAnd\b/g, "&");
};
const subjectEmoji = (s) => SUBJECT_META[s] || "📚";

const CANADIAN_PROVINCES = [
  { code: "ON", name: "Ontario",                note: "Largest province; Ontario curriculum" },
  { code: "BC", name: "British Columbia",        note: "Inquiry-based curriculum" },
  { code: "AB", name: "Alberta",                 note: "Strong STEM focus" },
  { code: "MB", name: "Manitoba",                note: "Central Canada" },
  { code: "SK", name: "Saskatchewan",            note: "Prairie province" },
  { code: "NS", name: "Nova Scotia",             note: "Atlantic Canada" },
  { code: "NB", name: "New Brunswick",           note: "Atlantic Canada" },
  { code: "NL", name: "Newfoundland & Labrador", note: "Atlantic Canada" },
  { code: "PE", name: "Prince Edward Island",    note: "Atlantic Canada" },
  { code: "NT", name: "Northwest Territories",   note: "Northern Canada" },
  { code: "YT", name: "Yukon",                   note: "Follows BC curriculum framework" },
  { code: "NU", name: "Nunavut",                 note: "Northern Canada" },
];

// Band colors for scholar cards
const BAND_COLORS = {
  ks1: { border: "border-amber-300 dark:border-amber-500/40", bg: "bg-amber-50 dark:bg-amber-500/10", badge: "bg-amber-100 text-amber-700 dark:text-amber-300" },
  ks2: { border: "border-indigo-300 dark:border-indigo-500/40", bg: "bg-indigo-50 dark:bg-indigo-500/10", badge: "bg-indigo-100 text-indigo-700 dark:text-indigo-300" },
  ks3: { border: "border-sky-300 dark:border-sky-500/40", bg: "bg-sky-50 dark:bg-sky-500/10", badge: "bg-sky-100 text-sky-700 dark:text-sky-300" },
  ks4: { border: "border-cyan-300 dark:border-cyan-500/40", bg: "bg-cyan-50 dark:bg-cyan-500/10", badge: "bg-cyan-100 text-cyan-700 dark:text-cyan-300" },
};

// ═══════════════════════════════════════════════════════════════════
// MASTERY TIER HELPER
// ═══════════════════════════════════════════════════════════════════
function getMasteryTier(pct) {
  if (pct >= 85) return { label: "Mastered",   color: "#10b981", bg: "#ecfdf5", border: "#6ee7b7" };
  if (pct >= 70) return { label: "Strong",     color: "#6366f1", bg: "#eef2ff", border: "#a5b4fc" };
  if (pct >= 50) return { label: "Developing", color: "#f59e0b", bg: "#fffbeb", border: "#fcd34d" };
  return              { label: "Needs work",  color: "#ef4444", bg: "#fef2f2", border: "#fca5a5" };
}

// ═══════════════════════════════════════════════════════════════════
// DATA FETCHING HELPERS
// ═══════════════════════════════════════════════════════════════════

async function fetchScholarInsights(supabase, scholarId) {
  const monday = new Date();
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const lastMonday = new Date(monday);
  lastMonday.setDate(lastMonday.getDate() - 7);

  const [thisWeek, lastWeek, recentTopics] = await Promise.all([
    // This week's quiz results
    supabase.from("quiz_results")
      .select("subject, questions_correct, questions_total, time_spent_seconds, topic_summary, answers")
      .eq("scholar_id", scholarId)
      .gte("created_at", monday.toISOString()),

    // Last week's quiz results
    supabase.from("quiz_results")
      .select("subject, questions_correct, questions_total")
      .eq("scholar_id", scholarId)
      .gte("created_at", lastMonday.toISOString())
      .lt("created_at", monday.toISOString()),

    // Last 30 days for topic mastery
    supabase.from("quiz_results")
      .select("subject, topic_summary, answers")
      .eq("scholar_id", scholarId)
      .gte("created_at", new Date(Date.now() - 30 * 864e5).toISOString()),
  ]);

  // Aggregate this week by subject
  const weekBySubject = {};
  (thisWeek.data || []).forEach(row => {
    const s = row.subject;
    if (!weekBySubject[s]) weekBySubject[s] = { subject: s, questions_correct: 0, questions_total: 0, minutes: 0 };
    weekBySubject[s].questions_correct += row.questions_correct || 0;
    weekBySubject[s].questions_total   += row.questions_total   || 0;
    weekBySubject[s].minutes           += Math.round((row.time_spent_seconds || 0) / 60);
  });
  const weeklyStats = Object.values(weekBySubject);

  // Aggregate last week
  const lastWeekBySubject = {};
  (lastWeek.data || []).forEach(row => {
    const s = row.subject;
    if (!lastWeekBySubject[s]) lastWeekBySubject[s] = { subject: s, questions_total: 0, minutes: 0 };
    lastWeekBySubject[s].questions_total += row.questions_total || 0;
  });
  const lastWeekStats = Object.values(lastWeekBySubject);

  // Aggregate topic mastery
  const topicAgg = {}; // { subject: { topic: { correct, total } } }
  (recentTopics.data || []).forEach(row => {
    const subj = row.subject;
    if (!topicAgg[subj]) topicAgg[subj] = {};
    const agg = topicAgg[subj];

    if (row.topic_summary && typeof row.topic_summary === "object") {
      Object.entries(row.topic_summary).forEach(([topic, stats]) => {
        if (!agg[topic]) agg[topic] = { correct: 0, total: 0 };
        agg[topic].correct += stats.correct || 0;
        agg[topic].total   += stats.total   || 0;
      });
    } else {
      (Array.isArray(row.answers) ? row.answers : []).forEach(({ topic, isCorrect }) => {
        if (!topic) return;
        if (!agg[topic]) agg[topic] = { correct: 0, total: 0 };
        agg[topic].correct += isCorrect ? 1 : 0;
        agg[topic].total   += 1;
      });
    }
  });

  // Streak: walk back consecutive activity days
  const activityDates = new Set(
    (thisWeek.data || []).map(r => r.created_at?.slice(0, 10))
  );
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (activityDates.has(d.toISOString().slice(0, 10))) streak++;
    else if (i > 0) break;
  }

  return { weeklyStats, lastWeekStats, topicAgg, streak };
}

// ═══════════════════════════════════════════════════════════════════
// SCHOLAR INSIGHT PANEL (parent-facing, read-only)
// ═══════════════════════════════════════════════════════════════════
function ScholarInsightPanel({ scholarId, scholarName, supabase }) {
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [expandedSubject, setExpanded] = useState(null);
  const [topicFilter, setFilter]  = useState("all");

  useEffect(() => {
    fetchScholarInsights(supabase, scholarId)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [scholarId]);

  if (loading) return (
    <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 dark:border-white/10 p-4 text-center">
      <div className="w-6 h-6 border-2 border-amber-400/40 border-t-amber-500 rounded-full animate-spin mx-auto" />
    </div>
  );

  if (!data) return null;

  const { weeklyStats, lastWeekStats, topicAgg, streak } = data;

  // ── Summary numbers ──────────────────────────────────────────────
  const totalMins      = weeklyStats.reduce((a, s) => a + (s.minutes || 0), 0);
  const totalQ         = weeklyStats.reduce((a, s) => a + (s.questions_total || 0), 0);
  const totalCorrect   = weeklyStats.reduce((a, s) => a + (s.questions_correct || 0), 0);
  const accuracy       = totalQ > 0 ? Math.round((totalCorrect / totalQ) * 100) : null;
  const topSubject     = [...weeklyStats].sort((a, b) => (b.minutes || 0) - (a.minutes || 0))[0];
  const lastWeekTotal  = lastWeekStats.reduce((a, s) => a + (s.questions_total || 0), 0);
  const weekChange     = lastWeekTotal > 0 ? Math.round(((totalQ - lastWeekTotal) / lastWeekTotal) * 100) : null;

  const hrs  = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  const timeStr = totalMins === 0 ? "0 min" : hrs > 0 ? `${hrs}h ${mins}m` : `${mins} min`;

  // ── Subjects with topic data ─────────────────────────────────────
  const subjectsWithTopics = Object.keys(topicAgg).filter(s => Object.keys(topicAgg[s]).length > 0);

  // No activity this week
  if (totalQ === 0 && subjectsWithTopics.length === 0) {
    return (
      <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 dark:border-white/10 p-4 text-center text-sm text-slate-400 dark:text-slate-500 font-semibold">
        No sessions recorded yet this week.
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">

      {/* ── Week-at-a-glance stat strip ────────────────────────── */}
      <div className="grid grid-cols-3 gap-2">
        {/* Time */}
        <div className="bg-indigo-50 dark:bg-indigo-500/10 rounded-xl p-3 border border-indigo-200 dark:border-indigo-500/30 text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 dark:text-indigo-300 mb-1">This week</p>
          <p className="text-xl font-black text-indigo-700 dark:text-indigo-300">{timeStr}</p>
          <p className="text-[10px] text-indigo-400 dark:text-indigo-300 font-semibold mt-0.5">study time</p>
        </div>
        {/* Accuracy */}
        <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-xl p-3 border border-emerald-200 text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 dark:text-emerald-300 mb-1">Accuracy</p>
          <p className="text-xl font-black text-emerald-700 dark:text-emerald-300">{accuracy !== null ? `${accuracy}%` : "—"}</p>
          <p className="text-[10px] text-emerald-400 dark:text-emerald-300 font-semibold mt-0.5">{totalQ} questions</p>
        </div>
        {/* Streak */}
        <div className="bg-amber-50 dark:bg-amber-500/10 rounded-xl p-3 border border-amber-200 dark:border-amber-500/30 text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-400 mb-1">Streak</p>
          <p className="text-xl font-black text-amber-700 dark:text-amber-300">{streak} 🔥</p>
          <p className="text-[10px] text-amber-400 font-semibold mt-0.5">day{streak !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* ── Week-on-week change pill ───────────────────────────── */}
      {weekChange !== null && (
        <div className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${
          weekChange >= 0
            ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200"
            : "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-200 dark:border-rose-500/30"
        }`}>
          {weekChange >= 0 ? "↑" : "↓"} {Math.abs(weekChange)}% vs last week
          <span className="font-normal text-slate-400 dark:text-slate-500">· {totalQ} questions done</span>
        </div>
      )}

      {/* ── Per-subject mastery bars ────────────────────────────── */}
      {subjectsWithTopics.length > 0 && (
        <div className="mt-3 space-y-2">
          {subjectsWithTopics.map(subject => {
            const topicStats = topicAgg[subject] || {};
            const topics = Object.keys(topicStats);
            const totalTopics = topics.length;
            const masteredTopics = topics.filter(t => {
              const s = topicStats[t];
              return s.total > 0 && (s.correct / s.total) >= 0.8;
            }).length;
            return (
              <div key={subject} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    {subjectEmoji(subject)} {subjectLabel(subject)}
                  </span>
                  <span className="font-bold text-slate-500 dark:text-slate-500">{masteredTopics}/{totalTopics}</span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 dark:from-amber-500 to-orange-400 dark:to-orange-500"
                    style={{ width: `${totalTopics > 0 ? (masteredTopics / totalTopics) * 100 : 0}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// CURRICULUM CARD
// ═══════════════════════════════════════════════════════════════════
const CurriculumCard = ({ currKey, curr, selected, onSelect }) => (
  <button
    type="button"
    onClick={() => onSelect(currKey)}
    className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-center transition-all cursor-pointer
      ${selected
        ? "border-amber-400 bg-amber-50 dark:bg-amber-500/10 text-amber-900 dark:text-amber-300 shadow-md scale-105"
        : "border-slate-200 dark:border-white/10 bg-white text-slate-600 dark:text-slate-400 hover:border-amber-300 dark:border-amber-500/40 hover:bg-amber-50 dark:bg-amber-500/10"
      }`}
  >
    <span className="text-3xl">{curr.country}</span>
    <span className={`text-[11px] font-black leading-tight ${selected ? "text-amber-700 dark:text-amber-300" : "text-slate-500 dark:text-slate-500"}`}>
      {curr.name}
    </span>
  </button>
);

// ═══════════════════════════════════════════════════════════════════
// REFERRAL CARD — inline share (WhatsApp, Email, Copy Link)
// ═══════════════════════════════════════════════════════════════════
function ReferralCard({ parentId, parentName, supabase, fullWidth }) {
  const [stats, setStats]   = React.useState(null);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!parentId) return;
    (async () => {
      try {
        await ensureReferralCode(supabase, parentId, parentName);
        const s = await getReferralStats(supabase, parentId);
        setStats(s);
      } catch {}
    })();
  }, [parentId, parentName, supabase]);

  if (!stats?.code) return null;

  const shareUrl = `https://launchpard.com/signup?ref=${stats.code}`;
  const shareText = `My children use LaunchPard for AI-powered learning. Try it free: ${shareUrl}`;

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(shareUrl); } catch {
      const el = document.createElement("input"); el.value = shareUrl;
      document.body.appendChild(el); el.select(); document.execCommand("copy"); document.body.removeChild(el);
    }
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank");
  const handleEmail = () => window.open(`mailto:?subject=${encodeURIComponent("Try LaunchPard for your children")}&body=${encodeURIComponent(shareText)}`, "_blank");

  return (
    <div className={`bg-purple-50 dark:bg-purple-500/10 rounded-xl p-4 border border-purple-200 dark:border-purple-500/30 ${fullWidth ? "md:col-span-2" : ""}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg bg-purple-100 border border-purple-200 dark:border-purple-500/30 flex items-center justify-center text-sm">🎁</div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-black text-purple-900 dark:text-purple-300">Refer a Friend, Get 1 Free Month</p>
          <p className="text-[10px] text-purple-500 font-bold tracking-wide">
            {stats.code}
            {stats.referralCount > 0 && <span className="ml-1.5 text-emerald-600 dark:text-emerald-400 dark:text-emerald-300">· {stats.credits} earned</span>}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 sm:gap-2">
        <button onClick={handleWhatsApp}
          className="flex-1 flex items-center justify-center gap-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2 rounded-lg text-[10px] sm:text-[11px] transition-colors">
          <span>💬</span> <span className="hidden xs:inline">WhatsApp</span><span className="xs:hidden">Share</span>
        </button>
        <button onClick={handleEmail}
          className="flex-1 flex items-center justify-center gap-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 rounded-lg text-[10px] sm:text-[11px] transition-colors">
          <span>✉️</span> Email
        </button>
        <button onClick={handleCopy}
          className={`flex-1 flex items-center justify-center gap-1 font-bold py-2 rounded-lg text-[10px] sm:text-[11px] transition-all border ${
            copied
              ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200"
              : "bg-white hover:bg-purple-50 dark:hover:bg-purple-500/10 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-500/30"
          }`}>
          {copied ? "✓ Copied" : "🔗 Copy"}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════
export default function ParentDashboard() {
  const router   = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const [user,   setUser]   = useState(null);
  const [parent, setParent] = useState(null);
  const [scholars, setScholars] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [copied, setCopied]     = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError]       = useState(null);
  const [expandedInsights, setExpandedInsights] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [deletingScholar, setDeletingScholar] = useState(null); // { id, name } or null
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Form state
  const [newName,     setNewName]     = useState("");
  // Default curriculum picks up the hint dropped during landing-page → signup
  // flow. Nigerian parents land here with ng_sss pre-selected.
  const getInitialCurriculum = () => {
    try {
      if (typeof window === 'undefined') return 'uk_national';
      const hint = localStorage.getItem('lp_curriculum_hint');
      if (hint === 'ng_sss' || hint === 'ng_jss' || hint === 'ng_primary') return hint;
      // Fallback: if the __geo cookie says NG, pre-select ng_sss
      const m = document.cookie.match(/(?:^|;\s*)__geo=([^;]+)/);
      if (m && m[1] === 'NG') return 'ng_sss';
      return 'uk_national';
    } catch { return 'uk_national'; }
  };
  const [newCurriculum, setNewCurriculum] = useState(getInitialCurriculum);
  const [newGrade,    setNewGrade]    = useState(1);
  const [newProvince, setNewProvince] = useState("");
  const [newStream,   setNewStream]   = useState("");
  const [newTrade,    setNewTrade]    = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [graduatingScholar, setGraduatingScholar] = useState(null);
  const [newExamMode, setNewExamMode] = useState(null);
  const [newSchoolId, setNewSchoolId] = useState(null);
  const [schoolSearch, setSchoolSearch] = useState("");
  const [schoolResults, setSchoolResults] = useState([]);
  const [schoolDropOpen, setSchoolDropOpen] = useState(false);
  const [creatingSchool, setCreatingSchool] = useState(false);
  const [newSchoolName, setNewSchoolName] = useState("");
  const [newSchoolRegion, setNewSchoolRegion] = useState("");
  const [newSchoolType, setNewSchoolType] = useState("primary");
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactMessage, setContactMessage] = useState("");
  const [contactSent, setContactSent] = useState(false);

  // ── School edit for existing scholars ──────────────────────────────────
  const [editingSchoolFor, setEditingSchoolFor] = useState(null); // scholar id
  const [editSchoolSearch, setEditSchoolSearch] = useState("");
  const [editSchoolResults, setEditSchoolResults] = useState([]);
  const [editSchoolDropOpen, setEditSchoolDropOpen] = useState(false);
  const [editSchoolId, setEditSchoolId] = useState(null);
  const [editCreatingSchool, setEditCreatingSchool] = useState(false);
  const [editNewSchoolName, setEditNewSchoolName] = useState("");
  const [editNewSchoolRegion, setEditNewSchoolRegion] = useState("");
  const [editNewSchoolType, setEditNewSchoolType] = useState("primary");
  const [savingSchool, setSavingSchool] = useState(false);

  const resetTour  = useTourReset("parent", user?.id);
  const currDef    = CURRICULA[newCurriculum];
  const isCanadian = !!currDef?.hasProvinces;
  const isNgSss    = newCurriculum === "ng_sss";
  const isUkKs4    = needsSubjectSelection(newCurriculum, newGrade);
  const isUkKs2    = newCurriculum === "uk_national" && Number(newGrade) >= 3 && Number(newGrade) <= 6;
  const provInfo   = isCanadian && newProvince ? CANADIAN_PROVINCES.find(p => p.code === newProvince) : null;

  // ── School autocomplete search ──────────────────────────────────────────
  useEffect(() => {
    if (schoolSearch.length < 2) { setSchoolResults([]); return; }
    const timer = setTimeout(async () => {
      try {
        const { data } = await supabase.from("schools")
          .select("id, name, region, country, school_type")
          .ilike("name", `%${schoolSearch}%`)
          .limit(8);
        setSchoolResults(data || []);
        setSchoolDropOpen(true);
      } catch { setSchoolResults([]); }
    }, 250);
    return () => clearTimeout(timer);
  }, [schoolSearch, supabase]);

  const selectSchool = (school) => {
    setNewSchoolId(school.id);
    setSchoolSearch(school.name);
    setSchoolDropOpen(false);
  };

  const clearSchool = () => {
    setNewSchoolId(null);
    setSchoolSearch("");
    setSchoolResults([]);
    setCreatingSchool(false);
  };

  // Map curriculum to country code for school creation
  const curriculumCountry = (curr) => {
    if (!curr) return "GB";
    if (curr.startsWith("ng_")) return "NG";
    if (curr.startsWith("ca_")) return "CA";
    if (curr.startsWith("us_")) return "US";
    if (curr.startsWith("aus_")) return "AU";
    if (curr.startsWith("ib_")) return "GB";
    return "GB";
  };

  const handleCreateSchool = async () => {
    if (!newSchoolName.trim()) return;
    try {
      const country = curriculumCountry(newCurriculum);
      const { data, error: insertErr } = await supabase.from("schools").insert([{
        name: newSchoolName.trim(),
        region: newSchoolRegion.trim() || null,
        country,
        curriculum: newCurriculum,
        school_type: newSchoolType,
        verified: false,
      }]).select().single();
      if (insertErr) { setError(`Failed to add school: ${insertErr.message}`); return; }
      if (data) {
        setNewSchoolId(data.id);
        setSchoolSearch(data.name);
        setCreatingSchool(false);
        setNewSchoolName("");
        setNewSchoolRegion("");
      }
    } catch (err) {
      setError(`School creation failed: ${err?.message || "Please try again."}`);
    }
  };

  // ── School edit autocomplete for existing scholars ──────────────────
  useEffect(() => {
    if (editSchoolSearch.length < 2) { setEditSchoolResults([]); return; }
    const timer = setTimeout(async () => {
      try {
        const { data } = await supabase.from("schools")
          .select("id, name, region, country, school_type")
          .ilike("name", `%${editSchoolSearch}%`)
          .limit(8);
        setEditSchoolResults(data || []);
        setEditSchoolDropOpen(true);
      } catch { setEditSchoolResults([]); }
    }, 250);
    return () => clearTimeout(timer);
  }, [editSchoolSearch, supabase]);

  const selectEditSchool = (school) => {
    setEditSchoolId(school.id);
    setEditSchoolSearch(school.name);
    setEditSchoolDropOpen(false);
  };

  const cancelEditSchool = () => {
    setEditingSchoolFor(null);
    setEditSchoolId(null);
    setEditSchoolSearch("");
    setEditSchoolResults([]);
    setEditCreatingSchool(false);
    setEditNewSchoolName("");
    setEditNewSchoolRegion("");
  };

  const handleEditCreateSchool = async (scholarCurriculum) => {
    if (!editNewSchoolName.trim()) return;
    try {
      const country = curriculumCountry(scholarCurriculum);
      const { data, error: insertErr } = await supabase.from("schools").insert([{
        name: editNewSchoolName.trim(),
        region: editNewSchoolRegion.trim() || null,
        country,
        curriculum: scholarCurriculum,
        school_type: editNewSchoolType,
        verified: false,
      }]).select().single();
      if (insertErr) { setError(`Failed to add school: ${insertErr.message}`); return; }
      if (data) {
        setEditSchoolId(data.id);
        setEditSchoolSearch(data.name);
        setEditCreatingSchool(false);
        setEditNewSchoolName("");
        setEditNewSchoolRegion("");
      }
    } catch (err) {
      setError(`School creation failed: ${err?.message || "Please try again."}`);
    }
  };

  const handleSaveSchoolEdit = async (scholarId) => {
    if (!editSchoolId) { setError("Please select or create a school."); return; }
    setSavingSchool(true); setError(null);
    try {
      const { error: updateErr } = await supabase.from("scholars")
        .update({ school_id: editSchoolId })
        .eq("id", scholarId)
        .eq("parent_id", user.id);
      if (updateErr) { setError(`Failed to update school: ${updateErr.message}`); return; }
      setScholars(prev => prev.map(s => s.id === scholarId ? { ...s, school_id: editSchoolId } : s));
      cancelEditSchool();
    } catch (err) {
      setError(`Something went wrong: ${err?.message || "Please try again."}`);
    } finally {
      setSavingSchool(false);
    }
  };

  const scholarsMissingSchool = scholars.filter(s => !s.school_id && !s.archived_at);

  const toggleSubject = (value) =>
    setSelectedSubjects(prev => prev.includes(value) ? prev.filter(s => s !== value) : [...prev, value]);

  const handleCurriculumChange = (key) => {
    setNewCurriculum(key);
    setNewGrade(CURRICULA[key].grades[0]);
    if (!CURRICULA[key]?.hasProvinces) setNewProvince("");
    if (key !== "ng_sss") { setNewStream(""); setNewTrade(""); }
    setSelectedSubjects([]);
  };

  const handleGradeChange = (grade) => {
    setNewGrade(Number(grade));
    if (!needsSubjectSelection(newCurriculum, grade)) setSelectedSubjects([]);
    if (newExamMode && !EXAM_MODES[newExamMode]?.eligibleYears.includes(Number(grade))) setNewExamMode(null);
  };

  // ═══════════════════════════════════════════════════════════════
  // FETCH USER AND SCHOLARS
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    const init = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) { router.push("/"); return; }
      setUser(user);

      let { data: parentData, error: fetchError } = await supabase
        .from("parents").select("*").eq("id", user.id).single();

      if (fetchError && fetchError.code === "PGRST116") {
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 30);
        const { data: newParent } = await supabase.from("parents").upsert({
          id: user.id,
          full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Parent",
          email: user.email,
          subscription_status: "trial",
          trial_end: trialEnd.toISOString(),
          max_children: 3,
          billing_cycle: "monthly",
        }, { onConflict: "id" }).select().single();
        if (newParent) parentData = newParent;
      }

      if (parentData) setParent(parentData);

      const { data: scholarData, error: scholarError } = await supabase
        .from("scholars").select("*").eq("parent_id", user.id).order("created_at", { ascending: true });
      if (!scholarError && scholarData) setScholars(scholarData);

      setLoading(false);
    };
    init();
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════
  const handleSignOut = async () => { await supabase.auth.signOut(); router.push("/"); };

  // MAX_SCHOLARS is now tier-driven: free=1, uk_pro=3, ng_explorer=1, ng_scholar=1,
  // ng_family_2=2, ng_family_3=3, ng_family_4plus=6, etc. See src/lib/tierAccess.js.
  // Fall back to 3 if parent record not yet loaded.
  const rawMax = parent ? getLimit(parent, 'scholars_max') : 3;
  const MAX_SCHOLARS = Number.isFinite(rawMax) ? rawMax : 3;

  // True if this parent is on the Nigerian plan (region field or curriculum-based fallback).
  // Used to gate NG-specific UI blocks (Coach's Corner, add-on upsell, etc.)
  const isNgParent = parent?.region === 'NG' || scholars.some(s => s.curriculum?.startsWith('ng_'));

  const handleArchiveScholar = async () => {
    if (!deletingScholar) return;
    try {
      const { error: archiveError } = await supabase
        .from("scholars")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", deletingScholar.id)
        .eq("parent_id", user.id);
      if (archiveError) { setError(`Failed to archive scholar: ${archiveError.message}`); return; }
      // Update local state — mark as archived (still counts toward MAX_SCHOLARS)
      setScholars(prev => prev.map(s =>
        s.id === deletingScholar.id ? { ...s, archived_at: new Date().toISOString() } : s
      ));
    } catch (err) {
      setError(`Something went wrong: ${err?.message || "Please try again."}`);
    } finally {
      setDeletingScholar(null);
    }
  };

  const handleRestoreScholar = async (scholarId) => {
    try {
      const { error } = await supabase
        .from("scholars")
        .update({ archived_at: null })
        .eq("id", scholarId)
        .eq("parent_id", user.id);
      if (error) { setError(`Failed to restore scholar: ${error.message}`); return; }
      setScholars(prev => prev.map(s =>
        s.id === scholarId ? { ...s, archived_at: null } : s
      ));
    } catch (err) {
      setError(`Something went wrong: ${err?.message || "Please try again."}`);
    }
  };

  const handleAddScholar = async (e) => {
    e.preventDefault();
    if (!newName.trim()) { setError("Please enter a name"); return; }
    if (scholars.some(s => s.name.trim().toLowerCase() === newName.trim().toLowerCase())) {
      setError("A scholar with this name already exists. Please choose a different name."); return;
    }
    if (scholars.length >= MAX_SCHOLARS) { setError(`Maximum of ${MAX_SCHOLARS} scholars on your current plan.`); return; }
    if (!newSchoolId) { setError("Please select or create a school for this scholar."); return; }
    if (newCurriculum === "ng_sss" && !newStream) { setError("Please select a stream for this SSS scholar."); return; }

    setIsAdding(true); setError(null);

    try {
      const code = `QUEST-${Math.floor(1000 + Math.random() * 9000)}`;
      const { data, error: insertError } = await supabase.from("scholars").insert([{
        parent_id: user.id,
        name: newName.trim(),
        year_level: newGrade,
        year: newGrade,
        curriculum: newCurriculum,
        province: newProvince || null,
        stream: isNgSss ? (newStream || null) : null,
        trade_subject: isNgSss ? (newTrade || null) : null,
        selected_subjects: isUkKs4 && selectedSubjects.length > 0 ? selectedSubjects : null,
        exam_mode: isUkKs2 ? (newExamMode || null) : null,
        school_id: newSchoolId || null,
        access_code: code,
        total_xp: 0, coins: 0, streak: 0, personal_best: 0, codename: null,
        avatar: { base: "astronaut", background: "background_space" },
      }]).select().single();

      if (insertError) { setError(`Failed to create scholar: ${insertError.message}`); return; }

      if (data) {
        try {
          await fetch("/api/emails/scholar-created", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              parentEmail: user.email,
              parentName:  user.user_metadata?.full_name || "Parent",
              scholarName: data.name,
              questCode:   data.access_code,
              curriculum:  getCurriculumInfo(data.curriculum).name,
              yearLevel:   formatGradeLabel(data.year_level, data.curriculum),
            }),
          });
        } catch (emailError) { console.error("Email send failed:", emailError); }

        // Sync curriculum to Brevo contact list (non-blocking)
        fetch('/api/brevo/sync-contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user.email,
            firstName: (user.user_metadata?.full_name || '').split(' ')[0],
            lastName: (user.user_metadata?.full_name || '').split(' ').slice(1).join(' '),
            curriculum: newCurriculum,
            source: 'scholar_added',
          }),
        }).catch(() => {});

        setScholars(prev => [...prev, data]);
        setNewName(""); setNewCurriculum("uk_national"); setNewGrade(1);
        setNewProvince(""); setNewStream(""); setNewTrade("");
        setSelectedSubjects([]); setNewExamMode(null);
        setNewSchoolId(null); setSchoolSearch(""); setError(null);
      }
    } catch (err) {
      console.error("[ParentDashboard] Scholar creation error:", err);
      setError(`Something went wrong: ${err?.message || "Please check your connection and try again."}`);
    } finally {
      setIsAdding(false);
    }
  };

  const copyCode = (scholar) => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(scholar.access_code).then(() => {
        setCopied(scholar.id); setTimeout(() => setCopied(null), 2000);
      }).catch(() => alert(`Copy this code: ${scholar.access_code}`));
    } else {
      alert(`Access Code: ${scholar.access_code}`);
    }
  };

  const getCurr       = (s) => CURRICULA[s.curriculum] || CURRICULA.uk_national;
  const getSubjects = (s) => getScholarSubjects(s.curriculum, s.stream, s.trade_subject, s.selected_subjects, s.year_level || s.year || 1, s.exam_mode, s.province);
  const toggleInsights = (id) => setExpandedInsights(prev => ({ ...prev, [id]: !prev[id] }));

  const getKSBandColor = (curriculum, year) => {
    if (curriculum !== "uk_national") return BAND_COLORS.ks1;
    const ks = getUkNationalKeyStage(year);
    return BAND_COLORS[ks] || BAND_COLORS.ks1;
  };

  // ═══════════════════════════════════════════════════════════════
  // LOADING
  // ═══════════════════════════════════════════════════════════════
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#080c15] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-400/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400 font-bold">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER — BRIGHT & AIRY DESIGN
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#080c15] text-slate-900 dark:text-white font-sans flex flex-col lg:flex-row">

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* SIDEBAR — Fixed on mobile, static on desktop */}
      <aside className={`fixed lg:static inset-y-0 left-0 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-white/10 z-40 transform transition-transform lg:transform-none ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } flex flex-col`}>

        {/* Logo area */}
        <div className="px-6 py-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img src="/logo.svg" alt="LaunchPard" width={32} height={32} style={{ objectFit: "contain" }} />
            <span className="font-black text-lg text-slate-900 dark:text-white">LaunchPard</span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-300">
            <Icon size={20} d="M18 6l-12 12M6 6l12 12" />
          </button>
        </div>

        {/* Navigation menu */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          <Link href="/dashboard/parent" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 dark:bg-amber-500/10 text-amber-900 dark:text-amber-300 font-bold text-sm transition-colors">
            <DashIcon size={20} />
            Mission Control
          </Link>
          <button
            onClick={() => { const el = document.getElementById("scholars-section"); if (el) el.scrollIntoView({ behavior: "smooth" }); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/40 font-bold text-sm transition-colors text-left"
          >
            <StudentsIcon size={20} />
            Scholars
          </button>
          <Link href="/dashboard/parent/analytics" className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/40 font-bold text-sm transition-colors">
            <MilestoneIcon size={20} />
            Milestones
          </Link>
          <Link href="/dashboard/parent/billing" className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/40 font-bold text-sm transition-colors">
            <CreditCardIcon size={20} />
            Subscriptions
          </Link>
          <Link href="/dashboard/parent/account" className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/40 font-bold text-sm transition-colors">
            <SettingsIcon size={20} />
            Settings
          </Link>
        </nav>

        {/* Spacer at bottom */}
        <div className="px-4 py-4" />
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar - Mobile hamburger + right-aligned controls */}
        <header className="bg-white dark:bg-slate-800/60 border-b border-slate-200 dark:border-white/10 px-3 sm:px-6 py-2 sm:py-3 flex items-center sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white dark:hover:text-white mr-3">
            <Icon size={24} d={["M5 12h14","M5 6h14","M5 18h14"]} />
          </button>
          <h2 className="text-sm font-black text-slate-900 dark:text-white hidden lg:block">Mission Control</h2>
          <div className="flex items-center gap-3 ml-auto">
            <Link href="/dashboard/parent/analytics" className="text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300 font-bold text-sm transition-colors hidden sm:block">Analytics</Link>
            <Link href="/dashboard/parent/billing" className="text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300 font-bold text-sm transition-colors hidden sm:block">Billing</Link>
            <button onClick={resetTour} title="Dashboard tour"
              className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-black text-sm flex items-center justify-center transition-colors border border-indigo-200 dark:border-indigo-500/30">
              ?
            </button>
            <DarkModeToggle />
            <button onClick={() => setShowLogoutConfirm(true)} className="flex items-center gap-2 text-rose-500 dark:text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/10 font-bold text-sm px-2.5 py-1.5 rounded-lg transition-colors">
              <LogOutIcon size={18} /> <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </header>

        {/* SCROLLABLE CONTENT AREA */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8 pb-24">

            {/* Welcome banner — warm gradient */}
            <div className="bg-gradient-to-r from-amber-50 dark:from-amber-500/5 to-orange-50 dark:to-orange-500/5 rounded-xl sm:rounded-2xl border border-amber-200 dark:border-amber-500/30 p-4 sm:p-8 mb-4 sm:mb-8">
              <h1 className="text-xl sm:text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-1 sm:mb-2">
                Welcome back, {parent?.full_name?.split(' ')[0] || 'Flight Guardian'}! 👋
              </h1>
              <p className="text-xs sm:text-base text-slate-600 dark:text-slate-400 font-bold mb-3 sm:mb-4">
                You have {scholars.length} scholar{scholars.length !== 1 ? 's' : ''} {scholars.length === 1 ? 'studying' : 'studying together'} on LaunchPard
              </p>

              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div className="bg-white dark:bg-slate-800/60 rounded-lg p-2 sm:p-3 border border-amber-100 dark:border-amber-500/30">
                  <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-0.5 sm:mb-1">Scholars</p>
                  <p className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white">{scholars.length}</p>
                </div>
                <div className="bg-white dark:bg-slate-800/60 rounded-lg p-2 sm:p-3 border border-orange-100 dark:border-orange-500/30">
                  <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-orange-600 dark:text-orange-400 mb-0.5 sm:mb-1">Active</p>
                  <p className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white">—</p>
                </div>
                <div className="bg-white dark:bg-slate-800/60 rounded-lg p-2 sm:p-3 border border-amber-100 dark:border-amber-500/30">
                  <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-0.5 sm:mb-1">Quizzes</p>
                  <p className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white">{scholars.reduce((a, s) => a + (s.quizzes_this_week || s.weekly_quizzes || 0), 0)}</p>
                </div>
              </div>

              {/* Two-column: Pro Trial + Referral — matched card design */}
              <div className="mt-3 sm:mt-4 grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
                {/* Pro Trial card */}
                {parent?.subscription_status === "trial" && parent?.trial_end && (
                  <div className="bg-blue-50 dark:bg-blue-500/10 rounded-xl p-4 border border-blue-200 dark:border-blue-500/30">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center text-sm">🎉</div>
                      <div>
                        <p className="text-xs font-black text-blue-900 dark:text-blue-300">Pro Trial Active</p>
                        <p className="text-[10px] text-blue-500 dark:text-blue-400 font-semibold">
                          {(() => {
                            const daysLeft = Math.max(0, Math.ceil((new Date(parent.trial_end) - new Date()) / 864e5));
                            return daysLeft > 0 ? `${daysLeft} day${daysLeft !== 1 ? "s" : ""} remaining` : "Trial ended";
                          })()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href="/subscribe"
                        className="flex-1 text-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg text-xs transition-colors">
                        Upgrade Now
                      </Link>
                      <Link href="/dashboard/parent/billing"
                        className="flex-1 text-center bg-white hover:bg-blue-50 dark:hover:bg-blue-500/10 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 font-bold py-2 rounded-lg text-xs transition-colors border border-blue-200 dark:border-blue-500/30">
                        View Plan
                      </Link>
                    </div>
                  </div>
                )}

                {/* Referral card — inline with share options */}
                <ReferralCard parentId={user?.id} parentName={parent?.full_name} supabase={supabase}
                  fullWidth={parent?.subscription_status !== "trial"} />
              </div>
            </div>

            {error && (
              <div className="mb-6 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 rounded-xl p-4 text-rose-700 dark:text-rose-300 font-bold text-sm">{error}</div>
            )}

            {/* ── Flash Update + Growth Metrics + Parent Action Tip ─── */}
            {scholars.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-8">

                {/* Flash Update */}
                <div className="bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-white/10 p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center text-sm">⚡</div>
                    <div>
                      <p className="text-xs font-black text-slate-900 dark:text-white">Flash Update</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">latest activity</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {scholars.slice(0, 3).map(s => (
                      <div key={s.id} className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 flex items-center justify-center text-[10px] font-bold shrink-0">
                          {s.name?.[0]?.toUpperCase() || "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">{s.name}</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500">
                            {(s.streak || 0) > 0 ? `🔥 ${s.streak}d streak` : "No activity yet"}
                            {s.total_xp ? ` · ${s.total_xp} XP` : ""}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Growth Metrics */}
                <div className="bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-white/10 p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 flex items-center justify-center text-sm">📈</div>
                    <div>
                      <p className="text-xs font-black text-slate-900 dark:text-white">Growth Metrics</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">family overview</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {/* Total XP across scholars */}
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider">Total Family XP</span>
                        <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 dark:text-emerald-300">{scholars.reduce((a, s) => a + (s.total_xp || 0), 0).toLocaleString()}</span>
                      </div>
                      <div className="w-full h-2 bg-emerald-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-emerald-400 dark:from-emerald-500 to-emerald-500 dark:to-emerald-600 rounded-full"
                          style={{ width: `${Math.min(100, (scholars.reduce((a, s) => a + (s.total_xp || 0), 0) / 5000) * 100)}%` }} />
                      </div>
                    </div>
                    {/* Average streak */}
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider">Avg Streak</span>
                        <span className="text-xs font-black text-amber-600 dark:text-amber-400">
                          {scholars.length > 0 ? Math.round(scholars.reduce((a, s) => a + (s.streak || 0), 0) / scholars.length) : 0} days
                        </span>
                      </div>
                      <div className="w-full h-2 bg-amber-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-amber-400 dark:from-amber-500 to-orange-400 dark:to-orange-500 rounded-full"
                          style={{ width: `${Math.min(100, (scholars.reduce((a, s) => a + (s.streak || 0), 0) / scholars.length / 30) * 100)}%` }} />
                      </div>
                    </div>
                    {/* Active scholars */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider">Active Scholars</span>
                      <span className="text-xs font-black text-blue-600 dark:text-blue-400">{scholars.filter(s => (s.streak || 0) > 0).length}/{scholars.length}</span>
                    </div>
                  </div>
                </div>

                {/* Parent Action Tip */}
                <div className="bg-gradient-to-br from-violet-50 dark:from-violet-500/5 to-indigo-50 dark:to-indigo-500/5 rounded-xl border border-violet-200 dark:border-violet-500/30 p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-violet-100 border border-violet-200 dark:border-violet-500/30 flex items-center justify-center text-sm">💡</div>
                    <div>
                      <p className="text-xs font-black text-violet-900 dark:text-violet-300">Guardian Action Tip</p>
                      <p className="text-[10px] text-violet-400 dark:text-violet-300 font-semibold">this week's focus</p>
                    </div>
                  </div>
                  <p className="text-sm text-violet-800 dark:text-violet-200 font-semibold leading-relaxed mb-3">
                    {(() => {
                      const lowStreakScholars = scholars.filter(s => (s.streak || 0) < 3);
                      if (lowStreakScholars.length > 0) return `Encourage ${lowStreakScholars[0].name} to build a study streak — even 10 minutes daily makes a big difference.`;
                      const topScholar = [...scholars].sort((a, b) => (b.total_xp || 0) - (a.total_xp || 0))[0];
                      if (topScholar) return `${topScholar.name} is on a roll with ${topScholar.total_xp || 0} XP! Ask them what they learned this week to reinforce retention.`;
                      return "Set a weekly family learning goal — scholars with guardian engagement improve 40% faster.";
                    })()}
                  </p>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-violet-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                    Personalised based on your family's progress
                  </div>
                </div>
              </div>
            )}

            {/* ── Push notification opt-in ── */}
            <PushNotificationPrompt
              scholarId={scholars[0]?.id}
            />

            {/* ── Multi-child comparison (2+ scholars) ── */}
            {scholars.length >= 2 && (
              <MultiChildComparison scholars={scholars} supabase={supabase} />
            )}

            {/* ── Coach's Corner + Value Report (NG only — exam-prep context) ── */}
            {isNgParent && scholars.length > 0 && (() => {
              const firstScholar = scholars[0];
              return (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <CoachesCorner
                    scholarId={firstScholar.id}
                    scholarName={firstScholar.name}
                    isNigerian={true}
                  />
                  <ValueReport
                    scholarId={firstScholar.id}
                    scholarName={firstScholar.name}
                  />
                </div>
              );
            })()}

            {/* ── How-To Guide: collapsible getting-started card ── */}
            {scholars.length <= 2 && (
              <details className="mb-4 sm:mb-6 group">
                <summary className="bg-gradient-to-r from-indigo-50 dark:from-indigo-500/5 to-purple-50 dark:to-purple-500/5 rounded-xl border border-indigo-200 dark:border-indigo-500/30 p-3 sm:p-4 cursor-pointer list-none flex items-center justify-between shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-indigo-100 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-base sm:text-lg">📘</div>
                    <div>
                      <p className="text-xs sm:text-sm font-black text-indigo-900 dark:text-indigo-300">Getting Started Guide</p>
                      <p className="text-[10px] sm:text-[11px] text-indigo-400 dark:text-indigo-300 font-semibold hidden sm:block">How to add a scholar, sign them in, and start their first quest</p>
                    </div>
                  </div>
                  <ChevronDown size={18} />
                </summary>
                <div className="mt-2 bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-white/10 p-5 shadow-sm space-y-5">
                  {/* Step 1 */}
                  <div className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center shrink-0">1</span>
                    <div>
                      <p className="text-sm font-black text-slate-800 dark:text-slate-200">Add a scholar</p>
                      <p className="text-xs text-slate-500 dark:text-slate-500 mt-0.5 leading-relaxed">
                        Click the <span className="font-bold text-indigo-600 dark:text-indigo-400 dark:text-indigo-300">&quot;+ Add Scholar&quot;</span> card below. Fill in their name, choose their curriculum, year level, and subjects. A unique <span className="font-bold">codename</span> and <span className="font-bold">PIN</span> will be created automatically.
                      </p>
                    </div>
                  </div>
                  {/* Step 2 */}
                  <div className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-full bg-purple-600 text-white text-xs font-black flex items-center justify-center shrink-0">2</span>
                    <div>
                      <p className="text-sm font-black text-slate-800 dark:text-slate-200">Get them signed in</p>
                      <p className="text-xs text-slate-500 dark:text-slate-500 mt-0.5 leading-relaxed">
                        Go to <span className="font-bold text-indigo-600 dark:text-indigo-400 dark:text-indigo-300">launchpard.com</span> on their device. On the login page, tap <span className="font-bold">&quot;Scholar&quot;</span>, then enter their codename and PIN. No email required — it&apos;s that simple.
                      </p>
                    </div>
                  </div>
                  {/* Step 3 */}
                  <div className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-full bg-emerald-600 text-white text-xs font-black flex items-center justify-center shrink-0">3</span>
                    <div>
                      <p className="text-sm font-black text-slate-800 dark:text-slate-200">Start their first quest</p>
                      <p className="text-xs text-slate-500 dark:text-slate-500 mt-0.5 leading-relaxed">
                        They&apos;ll see a personalised dashboard based on their age. Tap <span className="font-bold">&quot;Start Adventure&quot;</span> (or &quot;Start Mission&quot; for older kids) to begin their first AI-powered lesson. Tara the tutor will guide them through each question.
                      </p>
                    </div>
                  </div>
                  {/* Tips */}
                  <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/30 rounded-xl p-3">
                    <p className="text-xs font-black text-amber-800 dark:text-amber-200 mb-1.5">Tips for guardians</p>
                    <div className="text-xs text-amber-700 dark:text-amber-300 space-y-1">
                      <p className="flex items-start gap-1.5"><span className="shrink-0">📱</span><span>Works on phone, tablet, or laptop — no app download needed</span></p>
                      <p className="flex items-start gap-1.5"><span className="shrink-0">⏰</span><span>10-15 minutes daily is enough — consistency beats long sessions</span></p>
                      <p className="flex items-start gap-1.5"><span className="shrink-0">📊</span><span>Check this dashboard for progress reports and weekly summaries</span></p>
                      <p className="flex items-start gap-1.5"><span className="shrink-0">🎯</span><span>The AI adapts to their level — no need to choose difficulty</span></p>
                    </div>
                  </div>
                </div>
              </details>
            )}

            {/* School missing banner */}
            {scholarsMissingSchool.length > 0 && (
              <div className="mb-4 bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
                <span className="text-2xl shrink-0">🏫</span>
                <div className="flex-1">
                  <p className="font-black text-sm text-amber-900 dark:text-amber-300">School info needed</p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5 leading-relaxed">
                    {scholarsMissingSchool.length === 1
                      ? `${scholarsMissingSchool[0].name} doesn\u2019t have a school assigned yet.`
                      : `${scholarsMissingSchool.length} scholars don\u2019t have schools assigned yet.`}
                    {' '}Click <strong>&quot;Add School&quot;</strong> on their card below to update this.
                  </p>
                </div>
              </div>
            )}

            {/* Scholar grid + Add Scholar card */}
            <div id="scholars-section" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">

              {/* Scholar cards */}
              {scholars.length === 0 ? (
                <div className="sm:col-span-2 lg:col-span-3 bg-white dark:bg-slate-800/60 rounded-xl sm:rounded-2xl border-2 border-dashed border-slate-300 dark:border-white/15 p-6 sm:p-12 text-center">
                  <p className="text-4xl sm:text-5xl mb-3 sm:mb-4">🚀</p>
                  <p className="font-black text-lg sm:text-2xl text-slate-700 dark:text-slate-300 mb-1 sm:mb-2">No scholars yet</p>
                  <p className="text-sm sm:text-base text-slate-400 dark:text-slate-500 font-bold">Add your first scholar to get started</p>
                </div>
              ) : (
                scholars.map(scholar => {
                  const curr       = getCurr(scholar);
                  const subjects   = getSubjects(scholar);
                  const isCopied   = copied === scholar.id;
                  const yearLevel  = scholar.year_level || scholar.year || 1;
                  const isInsightsOpen = !!expandedInsights[scholar.id];
                  const bandColor = getKSBandColor(scholar.curriculum, yearLevel);

                  const isArchived = !!scholar.archived_at;

                  return (
                    <div
                      key={scholar.id}
                      className={`rounded-xl p-3 sm:p-4 shadow-sm border-2 transition-all ${
                        isArchived
                          ? "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-white/10 opacity-60"
                          : `bg-white dark:bg-slate-800/60 hover:shadow-md ${bandColor.border}`
                      }`}
                    >
                      {/* Archived banner */}
                      {isArchived && (
                        <div className="flex items-center gap-2 mb-2 px-2 py-1.5 bg-slate-100 rounded-lg border border-slate-200 dark:border-white/10">
                          <Icon size={12} d={["M21 8V21H3V8","M1 3h22v5H1z","M10 12h4"]} />
                          <span className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-wider">Archived — auto-deletes in 6 months</span>
                        </div>
                      )}
                      {/* Clickable header → scholar insights */}
                      <Link
                        href={isArchived ? "#" : `/dashboard/parent/scholar/${scholar.id}`}
                        className={`flex items-center gap-3 mb-3 group ${isArchived ? "pointer-events-none" : ""}`}
                        onClick={isArchived ? (e) => e.preventDefault() : undefined}
                      >
                        <div className={`w-10 h-10 rounded-full ${bandColor.bg} border-2 ${bandColor.border} flex items-center justify-center flex-shrink-0`}>
                          <span className="text-lg">{scholar.name?.[0]?.toUpperCase() || '?'}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-black text-sm text-slate-900 dark:text-white group-hover:text-amber-700 dark:text-amber-300 transition-colors truncate">{scholar.name}</h3>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${bandColor.badge}`}>
                            {curr.country} {curr.gradeLabel} {yearLevel}
                          </span>
                        </div>
                        <Icon size={16} d="m9 18 6-6-6-6" />
                      </Link>

                      {/* Compact stats row */}
                      <div className="grid grid-cols-3 gap-1.5 mb-3">
                        <div className="bg-amber-50 dark:bg-amber-500/10 rounded-lg p-2 border border-amber-100 dark:border-amber-500/30 text-center">
                          <p className="text-[9px] font-black uppercase tracking-widest text-amber-500">Streak</p>
                          <p className="text-sm font-black text-amber-700 dark:text-amber-300">{scholar.streak || 0}d</p>
                        </div>
                        <div className="bg-indigo-50 dark:bg-indigo-500/10 rounded-lg p-2 border border-indigo-100 dark:border-indigo-500/30 text-center">
                          <p className="text-[9px] font-black uppercase tracking-widest text-indigo-500">Level</p>
                          <p className="text-sm font-black text-indigo-700 dark:text-indigo-300">{getLevelInfo(scholar.total_xp || 0).current.level}</p>
                          <p className="text-[8px] font-bold text-indigo-400 dark:text-indigo-300 truncate">{getLevelInfo(scholar.total_xp || 0).current.title}</p>
                        </div>
                        <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-lg p-2 border border-emerald-100 dark:border-emerald-500/30 text-center">
                          <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Subjects</p>
                          <p className="text-sm font-black text-emerald-700 dark:text-emerald-300">{subjects.length}</p>
                        </div>
                      </div>

                      {/* Subject pills */}
                      <div className="flex flex-wrap gap-1 mb-3">
                        {subjects.slice(0, 4).map(s => (
                          <span key={s} className="inline-flex items-center gap-0.5 bg-slate-50 dark:bg-slate-700/40 text-slate-600 dark:text-slate-400 text-[10px] font-bold px-1.5 py-0.5 rounded">
                            {subjectEmoji(s)} {subjectLabel(s).slice(0, 12)}
                          </span>
                        ))}
                        {subjects.length > 4 && (
                          <span className="inline-flex items-center bg-slate-50 dark:bg-slate-700/40 text-slate-400 dark:text-slate-500 text-[10px] font-bold px-1.5 py-0.5 rounded">
                            +{subjects.length - 4}
                          </span>
                        )}
                      </div>

                      {/* School missing — inline edit */}
                      {!scholar.school_id && !isArchived && (
                        editingSchoolFor === scholar.id ? (
                          <div className="mb-3 bg-amber-50 dark:bg-amber-500/10 rounded-lg p-3 border-2 border-amber-200 dark:border-amber-500/30">
                            <p className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-300 mb-2">Assign School</p>
                            {!editCreatingSchool ? (
                              <>
                                <div className="relative">
                                  <input
                                    type="text"
                                    placeholder="Type to search for school..."
                                    value={editSchoolSearch}
                                    onChange={e => { setEditSchoolSearch(e.target.value); if (editSchoolId) setEditSchoolId(null); }}
                                    onFocus={() => editSchoolResults.length > 0 && setEditSchoolDropOpen(true)}
                                    onBlur={() => setTimeout(() => setEditSchoolDropOpen(false), 200)}
                                    className={`w-full px-3 py-2 bg-white dark:bg-slate-800/60 border rounded-lg font-bold text-xs outline-none placeholder:text-slate-400 dark:text-slate-500 transition-colors pr-8 ${
                                      editSchoolId ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-500/10/30" : "border-slate-200 dark:border-white/10 focus:border-amber-400"
                                    }`}
                                  />
                                  {editSchoolId && (
                                    <button type="button" onClick={() => { setEditSchoolId(null); setEditSchoolSearch(""); }}
                                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-red-400 text-xs font-black">
                                      ✕
                                    </button>
                                  )}
                                </div>
                                {editSchoolDropOpen && editSchoolResults.length > 0 && (
                                  <div className="mt-1 bg-white border border-slate-200 dark:border-white/10 rounded-lg shadow-lg max-h-36 overflow-y-auto z-10 relative">
                                    {editSchoolResults.map(s => (
                                      <button key={s.id} type="button"
                                        onMouseDown={() => selectEditSchool(s)}
                                        className="w-full text-left px-3 py-1.5 hover:bg-amber-50 dark:bg-amber-500/10 transition-colors border-b border-slate-50 last:border-0">
                                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{s.name}</p>
                                        <p className="text-[10px] text-slate-400 dark:text-slate-500">
                                          {s.region ? `${s.region}, ` : ""}{s.country} · {s.school_type || "school"}
                                        </p>
                                      </button>
                                    ))}
                                  </div>
                                )}
                                {editSchoolDropOpen && editSchoolSearch.length >= 2 && editSchoolResults.length === 0 && !editSchoolId && (
                                  <div className="mt-1 bg-white border border-slate-200 dark:border-white/10 rounded-lg p-2">
                                    <p className="text-[10px] text-slate-500 dark:text-slate-500 font-semibold mb-1">No schools found</p>
                                    <button type="button"
                                      onMouseDown={() => { setEditCreatingSchool(true); setEditNewSchoolName(editSchoolSearch); setEditSchoolDropOpen(false); }}
                                      className="text-[10px] font-bold text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:text-amber-300">
                                      + Add &quot;{editSchoolSearch}&quot; as new school
                                    </button>
                                  </div>
                                )}
                                {!editSchoolId && !editSchoolDropOpen && editSchoolSearch.length < 2 && (
                                  <button type="button" onClick={() => setEditCreatingSchool(true)}
                                    className="mt-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:text-amber-200">
                                    Can&apos;t find the school? Add it manually
                                  </button>
                                )}
                              </>
                            ) : (
                              /* Create new school inline */
                              <div className="space-y-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-300">Add new school</p>
                                <input placeholder="School name" value={editNewSchoolName}
                                  onChange={e => setEditNewSchoolName(e.target.value)}
                                  className="w-full px-3 py-1.5 bg-white border border-slate-200 dark:border-white/10 rounded-lg font-bold text-xs outline-none focus:border-amber-400 placeholder:text-slate-400 dark:text-slate-500" />
                                <input placeholder="Region / City (optional)" value={editNewSchoolRegion}
                                  onChange={e => setEditNewSchoolRegion(e.target.value)}
                                  className="w-full px-3 py-1.5 bg-white border border-slate-200 dark:border-white/10 rounded-lg font-bold text-xs outline-none focus:border-amber-400 placeholder:text-slate-400 dark:text-slate-500" />
                                <div className="flex gap-2">
                                  <select value={editNewSchoolType} onChange={e => setEditNewSchoolType(e.target.value)}
                                    className="flex-1 px-2 py-1.5 bg-white border border-slate-200 dark:border-white/10 rounded-lg font-bold text-xs outline-none focus:border-amber-400">
                                    <option value="primary">Primary</option>
                                    <option value="secondary">Secondary</option>
                                    <option value="all_through">All-through</option>
                                    <option value="grammar">Grammar</option>
                                    <option value="independent">Independent</option>
                                  </select>
                                  <button type="button" onClick={() => handleEditCreateSchool(scholar.curriculum)}
                                    disabled={!editNewSchoolName.trim()}
                                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 dark:bg-amber-500/90 disabled:bg-slate-300 text-white font-bold text-xs rounded-lg transition-colors">
                                    Add
                                  </button>
                                  <button type="button" onClick={() => { setEditCreatingSchool(false); setEditNewSchoolName(""); setEditNewSchoolRegion(""); }}
                                    className="px-2 py-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-400 font-bold text-xs">
                                    Back
                                  </button>
                                </div>
                              </div>
                            )}
                            {editSchoolId && (
                              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 dark:text-emerald-300 font-semibold mt-1">✓ School selected</p>
                            )}
                            <div className="flex gap-2 mt-2">
                              <button type="button" onClick={() => handleSaveSchoolEdit(scholar.id)}
                                disabled={!editSchoolId || savingSchool}
                                className="flex-1 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/100 hover:bg-emerald-600 disabled:bg-slate-300 text-white font-black text-xs rounded-lg transition-colors">
                                {savingSchool ? "Saving..." : "Save School"}
                              </button>
                              <button type="button" onClick={cancelEditSchool}
                                className="px-3 py-1.5 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:text-slate-300 font-bold text-xs rounded-lg transition-colors">
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => { cancelEditSchool(); setEditingSchoolFor(scholar.id); }}
                            className="w-full mb-3 flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 border-2 border-dashed border-amber-300 dark:border-amber-500/40 rounded-lg transition-colors text-left"
                          >
                            <span className="text-base">🏫</span>
                            <div className="flex-1">
                              <p className="text-[10px] font-black text-amber-800 dark:text-amber-200">Add School</p>
                              <p className="text-[9px] text-amber-600 dark:text-amber-400 font-semibold">Assign a school to {scholar.name}</p>
                            </div>
                            <span className="text-amber-400 text-xs font-black">+</span>
                          </button>
                        )
                      )}

                      {/* Access code — compact */}
                      <div className="mb-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg px-3 py-2 border border-indigo-100 dark:border-indigo-500/30 flex justify-between items-center">
                        <div>
                          <p className="text-[8px] font-black uppercase tracking-widest text-indigo-500">Code</p>
                          <p className="text-xs font-black text-indigo-700 dark:text-indigo-300 tracking-wide">{scholar.access_code}</p>
                        </div>
                        <button
                          onClick={(e) => { e.preventDefault(); copyCode(scholar); }}
                          className={`p-1.5 rounded border transition-all ${
                            isCopied
                              ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 text-emerald-600 dark:text-emerald-400 dark:text-emerald-300"
                              : "bg-white dark:bg-slate-800/60 border-indigo-200 dark:border-indigo-500/30 text-indigo-500 hover:text-indigo-700 dark:text-indigo-300"
                          }`}
                          title={isCopied ? "Copied!" : "Copy code"}
                        >
                          {isCopied ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
                        </button>
                      </div>

                      {/* Expandable insights — compact */}
                      <div className="mb-3 border border-slate-200 dark:border-white/10 rounded-lg overflow-hidden">
                        <button
                          onClick={() => toggleInsights(scholar.id)}
                          className="w-full flex items-center justify-between px-3 py-1.5 bg-slate-50 dark:bg-slate-700/30 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                        >
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Quick Progress</span>
                          {isInsightsOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                        {isInsightsOpen && (
                          <div className="px-3 pt-2 pb-3 bg-white dark:bg-slate-800/60">
                            {(scholar.exam_mode === 'eleven_plus' ||
                              (scholar.curriculum === 'uk_national' &&
                              Number(scholar.year_level || scholar.year || 0) >= 3 &&
                              Number(scholar.year_level || scholar.year || 0) <= 6)) && (
                              <div className="w-full flex justify-center mb-2">
                                <div className="w-full max-w-sm">
                                  <ReadinessScore scholarId={scholar.id} supabase={supabase} />
                                </div>
                              </div>
                            )}
                            <ScholarInsightPanel scholarId={scholar.id} scholarName={scholar.name} supabase={supabase} />
                          </div>
                        )}
                      </div>

                      {/* Actions row */}
                      <div className="flex items-center gap-2">
                        {isArchived ? (
                          <button
                            onClick={() => handleRestoreScholar(scholar.id)}
                            className="flex-1 block text-center bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 font-bold py-2 px-3 rounded-lg text-xs transition-colors border border-emerald-200 hover:border-emerald-300"
                          >
                            Restore Scholar
                          </button>
                        ) : (
                          <>
                            <Link
                              href={`/dashboard/parent/scholar/${scholar.id}`}
                              className="flex-1 block text-center bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 text-amber-700 dark:text-amber-300 font-bold py-2 px-3 rounded-lg text-xs transition-colors border border-amber-200 dark:border-amber-500/30 hover:border-amber-300 dark:border-amber-500/40"
                            >
                              Insights
                            </Link>
                            <button
                              onClick={() => {
                                localStorage.setItem("active_scholar", JSON.stringify(scholar));
                                router.push("/dashboard/student");
                              }}
                              className="flex-1 block text-center bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-bold py-2 px-3 rounded-lg text-xs transition-colors border border-indigo-200 dark:border-indigo-500/30 hover:border-indigo-300 dark:border-indigo-500/40"
                            >
                              Scholar Dashboard
                            </button>
                          </>
                        )}
                        {!isArchived && (
                          <button
                            onClick={() => setDeletingScholar({ id: scholar.id, name: scholar.name })}
                            className="p-2 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 hover:bg-slate-100 dark:hover:bg-slate-700/40 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-400 transition-colors"
                            title="Archive scholar"
                          >
                            <Icon size={14} d={["M21 8V21H3V8","M1 3h22v5H1z","M10 12h4"]} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}

              {/* Add Scholar Card */}
              {scholars.length < MAX_SCHOLARS && (
                <div className="bg-white dark:bg-slate-800/60 rounded-2xl border-2 border-dashed border-amber-300 dark:border-amber-500/40 p-6 flex flex-col justify-center items-center text-center">
                  <div className="bg-amber-50 dark:bg-amber-500/10 w-16 h-16 rounded-full flex items-center justify-center mb-4 border-2 border-amber-200 dark:border-amber-500/30">
                    <PlusIcon size={28} className="text-amber-600 dark:text-amber-400" />
                  </div>
                  <h3 className="font-black text-lg text-slate-900 dark:text-white mb-1">Add Scholar</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-500 font-semibold mb-6">Create a new profile and access code</p>

                  {/* Scholar creation form */}
                  <form onSubmit={handleAddScholar} className="w-full space-y-3">
                    <input
                      type="text" required placeholder="Scholar's name" value={newName}
                      onChange={e => setNewName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 dark:border-white/10 rounded-lg font-bold text-sm outline-none focus:border-amber-400 placeholder:text-slate-400 dark:text-slate-500 transition-colors"
                    />
                    <select value={newCurriculum} onChange={e => handleCurriculumChange(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 dark:border-white/10 rounded-lg font-bold text-sm outline-none focus:border-amber-400 cursor-pointer transition-colors">
                      {/* NG parents only see Nigerian curricula — prevents currency arbitrage
                          and avoids confusing Nigerian families with UK/US/Canadian options. */}
                      {Object.entries(CURRICULA)
                        .filter(([key]) => parent?.region !== 'NG' || ['ng_primary','ng_jss','ng_sss'].includes(key))
                        .map(([key, c]) => <option key={key} value={key}>{c.country} {c.name}</option>)}
                    </select>
                    <select value={newGrade} onChange={e => handleGradeChange(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 dark:border-white/10 rounded-lg font-bold text-sm outline-none focus:border-amber-400 cursor-pointer transition-colors">
                      {currDef.grades.map(g => <option key={g} value={g}>{currDef.gradeLabel} {g}</option>)}
                    </select>

                    {/* School (required — search or create) */}
                    <div className="relative">
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-500 mb-1">
                        School <span className="text-red-400">*</span>
                      </label>

                      {!creatingSchool ? (
                        <>
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="Type to search for school..."
                              value={schoolSearch}
                              onChange={e => { setSchoolSearch(e.target.value); if (newSchoolId) setNewSchoolId(null); }}
                              onFocus={() => schoolResults.length > 0 && setSchoolDropOpen(true)}
                              onBlur={() => setTimeout(() => setSchoolDropOpen(false), 200)}
                              className={`w-full px-3 py-2 bg-slate-50 border rounded-lg font-bold text-sm outline-none placeholder:text-slate-400 dark:text-slate-500 transition-colors pr-8 ${
                                newSchoolId ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-500/10/30" : "border-slate-200 dark:border-white/10 focus:border-amber-400"
                              }`}
                            />
                            {newSchoolId && (
                              <button type="button" onClick={clearSchool}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-red-400 text-xs font-black">
                                ✕
                              </button>
                            )}
                          </div>

                          {/* Dropdown results */}
                          {schoolDropOpen && schoolResults.length > 0 && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 dark:border-white/10 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                              {schoolResults.map(s => (
                                <button key={s.id} type="button"
                                  onMouseDown={() => selectSchool(s)}
                                  className="w-full text-left px-3 py-2 hover:bg-amber-50 dark:bg-amber-500/10 border-b border-slate-50 last:border-0 transition-colors">
                                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{s.name}</span>
                                  <span className="block text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
                                    {s.region ? `${s.region}, ` : ""}{s.country} · {s.school_type || "school"}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}

                          {/* No results + create prompt */}
                          {schoolDropOpen && schoolSearch.length >= 2 && schoolResults.length === 0 && !newSchoolId && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 dark:border-white/10 rounded-lg shadow-lg p-3 text-center">
                              <p className="text-xs text-slate-500 dark:text-slate-500 font-semibold mb-2">No schools found for &quot;{schoolSearch}&quot;</p>
                              <button type="button"
                                onMouseDown={() => { setCreatingSchool(true); setNewSchoolName(schoolSearch); setSchoolDropOpen(false); }}
                                className="px-3 py-1.5 bg-amber-100 text-amber-800 dark:text-amber-200 font-black text-xs rounded-lg border border-amber-200 dark:border-amber-500/30 hover:bg-amber-200 transition-colors">
                                + Add &quot;{schoolSearch}&quot; as new school
                              </button>
                            </div>
                          )}

                          {newSchoolId && (
                            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 dark:text-emerald-300 font-semibold mt-1">✓ School selected</p>
                          )}

                          {/* Subtle "can't find?" link */}
                          {!newSchoolId && !schoolDropOpen && (
                            <button type="button" onClick={() => setCreatingSchool(true)}
                              className="text-[10px] text-amber-600 dark:text-amber-400 font-bold mt-1 hover:underline">
                              Can&apos;t find the school? Add it manually
                            </button>
                          )}
                        </>
                      ) : (
                        /* ── Create new school inline form ── */
                        <div className="bg-amber-50 dark:bg-amber-500/10/50 border border-amber-200 dark:border-amber-500/30 rounded-lg p-3 space-y-2">
                          <p className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-300">Add new school</p>
                          <input
                            type="text"
                            placeholder="School name"
                            value={newSchoolName}
                            onChange={e => setNewSchoolName(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 dark:border-white/10 rounded-lg font-bold text-sm outline-none focus:border-amber-400 placeholder:text-slate-400 dark:text-slate-500"
                          />
                          <input
                            type="text"
                            placeholder="City / Region (e.g. Lagos, London, Toronto)"
                            value={newSchoolRegion}
                            onChange={e => setNewSchoolRegion(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 dark:border-white/10 rounded-lg font-bold text-sm outline-none focus:border-amber-400 placeholder:text-slate-400 dark:text-slate-500"
                          />
                          <div className="flex gap-2">
                            <select value={newSchoolType} onChange={e => setNewSchoolType(e.target.value)}
                              className="flex-1 px-3 py-2 bg-white border border-slate-200 dark:border-white/10 rounded-lg font-bold text-sm outline-none focus:border-amber-400 cursor-pointer">
                              <option value="primary">Primary</option>
                              <option value="secondary">Secondary</option>
                              <option value="mixed">Mixed / All-through</option>
                            </select>
                          </div>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
                            Country auto-detected from curriculum: <strong>{curriculumCountry(newCurriculum)}</strong>
                          </p>
                          <div className="flex gap-2">
                            <button type="button" onClick={handleCreateSchool}
                              disabled={!newSchoolName.trim()}
                              className="flex-1 px-3 py-2 bg-amber-500 hover:bg-amber-600 dark:bg-amber-500/90 text-white font-black text-xs rounded-lg border-b-2 border-amber-700 disabled:opacity-50 transition-all">
                              Add School
                            </button>
                            <button type="button" onClick={() => { setCreatingSchool(false); setNewSchoolName(""); setNewSchoolRegion(""); }}
                              className="px-3 py-2 bg-slate-100 text-slate-600 dark:text-slate-400 font-black text-xs rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-200 transition-colors">
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Canadian province selector */}
                    {isCanadian && (
                      <>
                        <select value={newProvince} onChange={e => setNewProvince(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 dark:border-white/10 rounded-lg font-bold text-sm outline-none focus:border-amber-400 cursor-pointer transition-colors">
                          <option value="">Select province</option>
                          {CANADIAN_PROVINCES.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
                        </select>
                        {newProvince && CA_PROVINCE_EXTRAS[newProvince] && (
                          <p className="text-[10px] text-indigo-600 dark:text-indigo-400 dark:text-indigo-300 font-semibold bg-indigo-50 dark:bg-indigo-500/10 rounded-md px-2 py-1 border border-indigo-100 dark:border-indigo-500/30">
                            ℹ️ {CA_PROVINCE_EXTRAS[newProvince].note}
                          </p>
                        )}
                      </>
                    )}

                    {/* NG_SSS stream selector */}
                    {isNgSss && (
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-500">Stream</label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {Object.entries(NG_SSS_STREAMS).map(([key, s]) => (
                            <button key={key} type="button" onClick={() => setNewStream(key)}
                              className={`p-2 rounded-lg border-2 text-center transition-all ${
                                newStream === key
                                  ? "border-amber-400 bg-amber-50 dark:bg-amber-500/10 text-amber-900 dark:text-amber-300 shadow-sm"
                                  : "border-slate-200 dark:border-white/10 bg-white text-slate-500 dark:text-slate-500 hover:border-amber-300 dark:border-amber-500/40"
                              }`}>
                              <span className="text-lg block">{s.emoji}</span>
                              <span className="text-[10px] font-black">{s.label}</span>
                            </button>
                          ))}
                        </div>
                        {newStream && (
                          <select value={newTrade} onChange={e => setNewTrade(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 dark:border-white/10 rounded-lg font-bold text-sm outline-none focus:border-amber-400 cursor-pointer transition-colors">
                            <option value="">Trade subject (optional)</option>
                            {NG_SSS_TRADES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                          </select>
                        )}
                      </div>
                    )}

                    {/* UK KS4 GCSE option subjects */}
                    {isUkKs4 && (
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-500">GCSE Options</label>
                        {UK_KS4_OPTIONS.map(group => (
                          <div key={group.group}>
                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1">{group.emoji} {group.group}</p>
                            <div className="flex flex-wrap gap-1">
                              {group.subjects.map(s => (
                                <button key={s.value} type="button" onClick={() => toggleSubject(s.value)}
                                  className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all ${
                                    selectedSubjects.includes(s.value)
                                      ? "bg-indigo-100 border-indigo-300 dark:border-indigo-500/40 text-indigo-700 dark:text-indigo-300"
                                      : "bg-white border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-500 hover:border-indigo-200 dark:border-indigo-500/30"
                                  }`}>
                                  {s.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Exam mode — show eligible options based on curriculum + year */}
                    {(() => {
                      const eligibleExams = Object.entries(EXAM_MODES).filter(([, def]) =>
                        def.eligibleCurricula.includes(newCurriculum) && def.eligibleYears.includes(Number(newGrade))
                      );
                      if (eligibleExams.length === 0) return null;
                      return (
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-500">Exam Prep Mode</label>
                          {eligibleExams.map(([key, def]) => (
                            <button key={key} type="button" onClick={() => setNewExamMode(newExamMode === key ? null : key)}
                              className={`w-full text-left px-3 py-2 rounded-lg border-2 transition-all ${
                                newExamMode === key
                                  ? "border-amber-400 bg-amber-50 dark:bg-amber-500/10"
                                  : "border-slate-200 dark:border-white/10 bg-white hover:border-amber-300 dark:border-amber-500/40"
                              }`}>
                              <p className="text-xs font-black text-slate-800 dark:text-slate-200">{def.emoji} {def.label}</p>
                              <p className="text-[10px] text-slate-500 dark:text-slate-500 font-semibold">{def.shortDesc}</p>
                            </button>
                          ))}
                        </div>
                      );
                    })()}

                    {/* Preview: subjects this scholar will study */}
                    {(() => {
                      const previewSubjects = getScholarSubjects(newCurriculum, newStream, newTrade, selectedSubjects, newGrade, newExamMode, newProvince);
                      if (previewSubjects.length === 0) return null;
                      return (
                        <div className="bg-slate-50 dark:bg-slate-800/40 rounded-lg p-2.5 border border-slate-200 dark:border-white/10">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5">Subjects ({previewSubjects.length})</p>
                          <div className="flex flex-wrap gap-1">
                            {previewSubjects.map(s => (
                              <span key={s} className="inline-flex items-center gap-0.5 bg-white text-slate-600 dark:text-slate-400 text-[10px] font-bold px-1.5 py-0.5 rounded border border-slate-100 dark:border-white/5">
                                {subjectEmoji(s)} {subjectLabel(s)}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    <button type="submit" disabled={isAdding || !newName.trim() || !newSchoolId || (isNgSss && !newStream)}
                      className="w-full px-4 py-2.5 bg-amber-500 hover:bg-amber-600 dark:bg-amber-500/90 dark:hover:bg-amber-500 text-white font-black text-sm rounded-lg border-b-2 border-amber-700 hover:border-amber-800 disabled:opacity-50 disabled:cursor-not-allowed active:translate-y-0.5 active:border-b-0 transition-all">
                      {isAdding ? "Creating…" : "Create Scholar"}
                    </button>
                  </form>
                </div>
              )}

              {/* Max scholars reached — NG: add-on upsell | non-NG: contact form */}
              {scholars.length >= MAX_SCHOLARS && (
                isNgParent ? (
                  <div className="bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl border-2 border-indigo-200 dark:border-indigo-500/30 p-6 flex flex-col justify-center items-center text-center">
                    <div className="text-4xl mb-3">🚀</div>
                    <h3 className="font-black text-lg text-indigo-900 dark:text-indigo-300 mb-1">Full crew aboard!</h3>
                    <p className="text-sm text-indigo-700 dark:text-indigo-400 font-semibold mb-3 leading-relaxed">
                      You&apos;ve reached the limit on your current plan. Add more scholars with the <strong>Family add-on</strong>.
                    </p>
                    <div className="bg-white dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/30 rounded-xl px-4 py-3 mb-4 text-left w-full">
                      <p className="text-xs font-black text-indigo-800 dark:text-indigo-300 mb-1">👨‍👩‍👧 Family Child Add-on</p>
                      <p className="text-xs text-indigo-600 dark:text-indigo-400">₦1,000/month per extra scholar — full access to Tara, practice quizzes, and progress tracking.</p>
                    </div>
                    <Link href="/subscribe" className="px-6 py-2.5 bg-indigo-600 text-white font-black text-sm rounded-xl border-b-2 border-indigo-800 hover:bg-indigo-700 active:translate-y-0.5 active:border-b-0 transition-all">
                      Add scholar — ₦1,000/mo ✦
                    </Link>
                  </div>
                ) : (
                  <div className="bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl border-2 border-indigo-200 dark:border-indigo-500/30 p-6 flex flex-col justify-center items-center text-center">
                    <div className="text-4xl mb-3">🚀</div>
                    <h3 className="font-black text-lg text-indigo-900 dark:text-indigo-300 mb-1">Full crew aboard!</h3>
                    <p className="text-sm text-indigo-700 dark:text-indigo-400 font-semibold mb-4 leading-relaxed">
                      You&apos;ve added {MAX_SCHOLARS} scholar{MAX_SCHOLARS === 1 ? '' : 's'} — the maximum on your current plan. Need more? Let us know!
                    </p>
                    <button
                      onClick={() => setShowContactForm(true)}
                      className="px-6 py-2.5 bg-indigo-600 text-white font-black text-sm rounded-xl border-b-2 border-indigo-800 hover:bg-indigo-700 active:translate-y-0.5 active:border-b-0 transition-all"
                    >
                      Request more scholars ✦
                    </button>
                  </div>
                )
              )}

            </div>

          </div>
        </div>
      </main>

      {/* Contact Form Popup — scholar limit */}
      {showContactForm && (
        <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800/60 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-white/5">
              <h2 className="font-black text-lg text-slate-900 dark:text-white">Request More Scholars</h2>
              <p className="text-sm text-slate-500 dark:text-slate-500 font-semibold mt-1">
                Tell us how many scholars you need and we'll get back to you within 24 hours.
              </p>
            </div>
            {contactSent ? (
              <div className="px-6 py-8 text-center">
                <div className="text-4xl mb-3">✅</div>
                <p className="font-black text-slate-900 dark:text-white text-lg mb-2">Request sent!</p>
                <p className="text-sm text-slate-500 dark:text-slate-500 font-semibold mb-4">We'll email you at {user?.email} within 24 hours.</p>
                <button onClick={() => { setShowContactForm(false); setContactSent(false); setContactMessage(""); }}
                  className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl text-sm hover:bg-indigo-700 transition-colors">
                  Done
                </button>
              </div>
            ) : (
              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-500 mb-1">Your email</label>
                  <div className="px-3 py-2 bg-slate-50 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-400">
                    {user?.email || "—"}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-500 mb-1">How many additional scholars do you need?</label>
                  <textarea
                    value={contactMessage}
                    onChange={e => setContactMessage(e.target.value)}
                    placeholder="e.g. I need 2 more scholars for my children..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold outline-none focus:border-indigo-400 transition-colors resize-none"
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setShowContactForm(false); setContactMessage(""); }}
                    className="flex-1 px-4 py-2.5 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10 rounded-xl font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    Cancel
                  </button>
                  <button
                    disabled={!contactMessage.trim()}
                    onClick={async () => {
                      try {
                        await fetch("/api/emails/contact", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            email: user?.email,
                            name: parent?.full_name || user?.email,
                            subject: "Scholar Limit Increase Request",
                            message: contactMessage,
                            currentScholars: scholars.length,
                          }),
                        });
                      } catch {}
                      // Also send via mailto as fallback
                      const mailtoBody = encodeURIComponent(
                        `From: ${user?.email}\nCurrent scholars: ${scholars.length}\n\n${contactMessage}`
                      );
                      window.open(`mailto:hello@launchpard.com?subject=${encodeURIComponent("Scholar Limit Increase")}&body=${mailtoBody}`, "_blank");
                      setContactSent(true);
                    }}
                    className="flex-1 px-4 py-2.5 bg-indigo-600 text-white font-black text-sm rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                    Send Request
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dashboard Tour — shows once per user, re-triggerable via ? button */}
      {user?.id && <DashboardTour type="parent" userId={user.id} />}

      {/* Archive Scholar Confirmation Modal */}
      {deletingScholar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-800/60 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="text-center mb-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-amber-100 flex items-center justify-center mb-3">
                <Icon size={28} d={["M21 8V21H3V8","M1 3h22v5H1z","M10 12h4"]} />
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">Archive Scholar?</h3>
              <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
                <span className="font-bold text-slate-700 dark:text-slate-300">{deletingScholar.name}</span> will be archived and greyed out. Their data is kept for 6 months, during which you can restore them. After 6 months, all data is permanently deleted.
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 font-bold mt-2">
                Note: Archived scholars still count toward your scholar limit.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeletingScholar(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white text-slate-600 dark:text-slate-400 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                Cancel
              </button>
              <button onClick={handleArchiveScholar}
                className="flex-1 py-2.5 rounded-xl bg-amber-600 text-white font-bold text-sm hover:bg-amber-700 transition-colors">
                Archive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Graduation Modal */}
      {graduatingScholar && (
        <GraduationModal
          scholar={graduatingScholar}
          supabase={supabase}
          onClose={() => { setGraduatingScholar(null); window.location.reload(); }}
        />
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowLogoutConfirm(false); }}>
          <div className="bg-white dark:bg-slate-800/60 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center">
            <div className="text-4xl mb-3">👋</div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">Sign out?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-500 mb-6">
              You'll need to log back in to view your scholars' progress and manage your account.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white text-slate-600 dark:text-slate-400 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                Stay
              </button>
              <button onClick={() => { setShowLogoutConfirm(false); handleSignOut(); }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white font-bold text-sm hover:bg-rose-700 transition-colors">
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}