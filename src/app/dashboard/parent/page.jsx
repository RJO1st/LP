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
    grades: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
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

// ─── NIGERIAN SSS STREAM DEFINITIONS ─────────────────────────────────────────
const NG_SSS_COMPULSORY = [
  'english', 'mathematics', 'citizenship_and_heritage', 'digital_technologies',
];

const NG_SSS_STREAMS = {
  science: {
    label: 'Science', emoji: '🔬',
    subjects: ['biology', 'chemistry', 'physics', 'further_mathematics', 'agricultural_science', 'health_education', 'geography'],
  },
  humanities: {
    label: 'Humanities', emoji: '📜',
    subjects: ['literature_in_english', 'government', 'nigerian_history', 'home_management'],
  },
  business: {
    label: 'Business', emoji: '💼',
    subjects: ['economics', 'accounting', 'commerce', 'marketing'],
  },
};

const NG_SSS_TRADES = [
  { value: 'data_processing', label: 'Data Processing' },
  { value: 'marketing',       label: 'Marketing' },
];

const NG_JSS_SUBJECTS = [
  'mathematics', 'english_studies', 'basic_science_and_technology',
  'social_studies', 'business_education', 'cultural_and_creative_arts',
  'pre_vocational_studies', 'nigerian_languages', 'religious_studies',
  'civic_education', 'basic_digital_literacy',
];

// ─── UK KS4 (Y10–Y11) SUBJECT DEFINITIONS ───────────────────────────────────
const UK_KS4_COMPULSORY = [
  'mathematics', 'english_language', 'english_literature',
  'biology', 'chemistry', 'physics',   // triple science; combined_science treated as alias
  'combined_science',                   // shown only if scholar takes combined rather than triple
  'computer_science', 'design_technology', 'citizenship',
];

// Subjects always shown as compulsory (locked in checklist)
// combined_science and triple science are mutually exclusive — handled in UI
const UK_KS3_SUBJECTS = [
  'mathematics', 'english_language', 'english_literature',
  'biology', 'chemistry', 'physics', 'combined_science',
  'history', 'geography', 'citizenship', 'computer_science', 'design_technology',
];

const UK_KS4_OPTIONS = [
  {
    group: 'STEM',
    emoji: '🔬',
    subjects: [
      { value: 'computer_science',    label: 'Computer Science' },
      { value: 'further_mathematics', label: 'Further Mathematics' },
      { value: 'engineering',         label: 'Engineering' },
      { value: 'statistics',          label: 'Statistics' },
    ],
  },
  {
    group: 'Arts & Humanities',
    emoji: '🎨',
    subjects: [
      { value: 'history',             label: 'History' },
      { value: 'geography',           label: 'Geography' },
      { value: 'religious_education', label: 'Religious Education' },
      { value: 'media_studies',       label: 'Media Studies' },
    ],
  },
  {
    group: 'Vocational & Technical',
    emoji: '🛠',
    subjects: [
      { value: 'business_studies',    label: 'Business Studies' },
      { value: 'ict',                 label: 'ICT' },
      { value: 'design_technology',   label: 'Design & Technology' },
      { value: 'food_technology',     label: 'Food Technology' },
      { value: 'health_social_care',  label: 'Health & Social Care' },
      { value: 'sport_science',       label: 'Sport Science' },
    ],
  },
];

const UK_KS4_YEARS = [10, 11];

// Returns true if this curriculum+year requires subject selection
const needsSubjectSelection = (curriculum, year) =>
  curriculum === 'uk_national' && UK_KS4_YEARS.includes(Number(year));

// Returns all subjects for a scholar including stream/selected subjects
const getScholarSubjects = (curriculum, stream, tradeSubject, selectedSubjects, year) => {
  if (curriculum === 'ng_sss') {
    const streamSubjects = stream ? (NG_SSS_STREAMS[stream]?.subjects || []) : [];
    const trade = tradeSubject ? [tradeSubject] : [];
    return [...NG_SSS_COMPULSORY, ...streamSubjects, ...trade];
  }
  if (needsSubjectSelection(curriculum, year)) {
    return [...UK_KS4_COMPULSORY, ...(selectedSubjects || [])];
  }
  return SUBJECTS_BY_CURRICULUM[curriculum] || [];
};

const SUBJECTS_BY_CURRICULUM = {
  // Y1-Y6: primary core; Y7-Y9: KS3 full set; Y10-Y11: KS4 handled by getScholarSubjects
  uk_national: ['mathematics', 'english_language', 'english_literature', 'biology', 'chemistry', 'physics', 'combined_science', 'history', 'geography', 'citizenship', 'computer_science', 'design_technology'],
  uk_11plus: ['maths', 'english', 'verbal', 'nvr'],
  us_common_core: ['maths', 'english', 'science'],
  aus_acara: ['maths', 'english', 'science'],
  ib_pyp: ['maths', 'english', 'science'],
  ib_myp: ['maths', 'english', 'science'],
  ng_primary: ['mathematics', 'english', 'basic_science', 'social_studies'],
  ng_jss: NG_JSS_SUBJECTS,
  ng_sss: NG_SSS_COMPULSORY,
  ca_primary: ['maths', 'english', 'science', 'social_studies', 'french_language', 'physical_education'],
  ca_secondary: ['maths', 'english', 'science', 'canadian_history', 'geography', 'physics', 'chemistry', 'biology', 'computer_science', 'french_language'],
};

const SUBJECT_META = {
  // Mathematics
  maths:                        { emoji: "🔢", label: "Maths" },
  mathematics:                  { emoji: "🔢", label: "Mathematics" },
  further_mathematics:          { emoji: "📐", label: "Further Mathematics" },
  statistics:                   { emoji: "📊", label: "Statistics" },
  // English
  english:                      { emoji: "📖", label: "English" },
  english_language:             { emoji: "📖", label: "English Language" },
  english_literature:           { emoji: "📖", label: "English Literature" },
  english_studies:              { emoji: "📖", label: "English Studies" },
  literature_in_english:        { emoji: "📖", label: "Literature in English" },
  verbal:                       { emoji: "🧩", label: "Verbal Reasoning" },
  nvr:                          { emoji: "🔷", label: "Non-Verbal Reasoning" },
  // Sciences
  science:                      { emoji: "🔬", label: "Science" },
  biology:                      { emoji: "🧬", label: "Biology" },
  chemistry:                    { emoji: "🧪", label: "Chemistry" },
  physics:                      { emoji: "⚛️",  label: "Physics" },
  basic_science:                { emoji: "🔬", label: "Basic Science" },
  basic_science_and_technology: { emoji: "🔬", label: "Basic Science & Technology" },
  health_education:             { emoji: "🏥", label: "Health Education" },
  agricultural_science:         { emoji: "🌱", label: "Agricultural Science" },
  animal_husbandry:             { emoji: "🐄", label: "Animal Husbandry" },
  // Humanities & Social
  history:                      { emoji: "🏛️", label: "History" },
  nigerian_history:             { emoji: "🏛️", label: "Nigerian History" },
  geography:                    { emoji: "🗺️", label: "Geography" },
  social_studies:               { emoji: "🌍", label: "Social Studies" },
  religious_education:          { emoji: "✝️",  label: "Religious Education" },
  religious_studies:            { emoji: "✝️",  label: "Religious Studies" },
  government:                   { emoji: "🏛️", label: "Government" },
  civic_education:              { emoji: "⚖️",  label: "Civic Education" },
  citizenship_and_heritage:     { emoji: "🇳🇬", label: "Citizenship & Heritage Studies" },
  citizenship:                  { emoji: "⚖️",  label: "Citizenship" },
  cultural_and_creative_arts:   { emoji: "🎨", label: "Cultural & Creative Arts" },
  visual_arts:                  { emoji: "🎨", label: "Visual Arts" },
  home_management:              { emoji: "🏠", label: "Home Management" },
  pre_vocational_studies:       { emoji: "🛠",  label: "Pre-Vocational Studies" },
  nigerian_languages:           { emoji: "🗣️", label: "Nigerian Languages" },
  drama:                        { emoji: "🎭", label: "Drama" },
  music:                        { emoji: "🎵", label: "Music" },
  art_and_design:               { emoji: "🎨", label: "Art & Design" },
  media_studies:                { emoji: "📺", label: "Media Studies" },
  french:                       { emoji: "🇫🇷", label: "French" },
  german:                       { emoji: "🇩🇪", label: "German" },
  spanish:                      { emoji: "🇪🇸", label: "Spanish" },
  // Business & Commerce
  economics:                    { emoji: "📈", label: "Economics" },
  business_studies:             { emoji: "💼", label: "Business Studies" },
  business_education:           { emoji: "💼", label: "Business Education" },
  commerce:                     { emoji: "💰", label: "Commerce" },
  accounting:                   { emoji: "📒", label: "Accounting" },
  financial_accounting:         { emoji: "📒", label: "Financial Accounting" },
  marketing:                    { emoji: "📣", label: "Marketing" },
  office_practice:              { emoji: "🖨️", label: "Office Practice" },
  // Technology & Computing
  computer_science:             { emoji: "💻", label: "Computer Science" },
  ict:                          { emoji: "💻", label: "ICT" },
  digital_technologies:         { emoji: "💻", label: "Digital Technologies" },
  basic_digital_literacy:       { emoji: "💻", label: "Basic Digital Literacy" },
  basic_technology:             { emoji: "🔧", label: "Basic Technology" },
  engineering:                  { emoji: "⚙️",  label: "Engineering" },
  technical_drawing:            { emoji: "📏", label: "Technical Drawing" },
  design_technology:            { emoji: "⚙️",  label: "Design & Technology" },
  food_technology:              { emoji: "🍳", label: "Food Technology" },
  data_processing:              { emoji: "🖥️", label: "Data Processing" },
  // Health & PE
  physical_education:           { emoji: "🏃", label: "Physical Education" },
  health_social_care:           { emoji: "🏥", label: "Health & Social Care" },
  sport_science:                { emoji: "⚽", label: "Sport Science" },
  // Canada
  french_language:              { emoji: "🗣️", label: "French" },
  canadian_history:             { emoji: "🍁", label: "Canadian History" },
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
  const [newStream, setNewStream] = useState("");
  const [newTrade, setNewTrade] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState([]);

  const currDef      = CURRICULA[newCurriculum];
  const isCanadian   = !!currDef?.hasProvinces;
  const isNgSss      = newCurriculum === 'ng_sss';
  const isUkKs4      = needsSubjectSelection(newCurriculum, newGrade);
  const provInfo     = isCanadian && newProvince
    ? CANADIAN_PROVINCES.find(p => p.code === newProvince)
    : null;

  const toggleSubject = (value) => {
    setSelectedSubjects(prev =>
      prev.includes(value) ? prev.filter(s => s !== value) : [...prev, value]
    );
  };

  const handleCurriculumChange = (key) => {
    setNewCurriculum(key);
    const grades = CURRICULA[key].grades;
    setNewGrade(grades[0]);
    if (!CURRICULA[key]?.hasProvinces) setNewProvince("");
    if (key !== 'ng_sss') { setNewStream(""); setNewTrade(""); }
    setSelectedSubjects([]);
  };

  const handleGradeChange = (grade) => {
    setNewGrade(Number(grade));
    // Clear subject selection if moving away from KS4
    if (!needsSubjectSelection(newCurriculum, grade)) setSelectedSubjects([]);
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

  const MAX_SCHOLARS = 3;

  const handleAddScholar = async (e) => {
    e.preventDefault();
    if (!newName.trim()) {
      setError("Please enter a name");
      return;
    }

    if (scholars.length >= MAX_SCHOLARS) {
      setError(`You've reached the maximum of ${MAX_SCHOLARS} scholars. Please contact support to add more.`);
      return;
    }

    if (newCurriculum === 'ng_sss' && !newStream) {
      setError("Please select a stream for this SSS scholar.");
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
          stream: isNgSss ? (newStream || null) : null,
          trade_subject: isNgSss ? (newTrade || null) : null,
          selected_subjects: isUkKs4 && selectedSubjects.length > 0 ? selectedSubjects : null,
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
          await fetch('/api/emails/scholar-created', {
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
        setNewStream("");
        setNewTrade("");
        setSelectedSubjects([]);
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
                        {scholar.stream && (
                          <span className="bg-green-50 text-green-700 border border-green-100 font-bold px-3 py-1.5 rounded-xl text-sm">
                            {NG_SSS_STREAMS[scholar.stream]?.emoji} {NG_SSS_STREAMS[scholar.stream]?.label} Stream
                          </span>
                        )}
                        {scholar.trade_subject && (
                          <span className="bg-orange-50 text-orange-700 border border-orange-100 font-bold px-3 py-1.5 rounded-xl text-sm">
                            🛠 {NG_SSS_TRADES.find(t => t.value === scholar.trade_subject)?.label || scholar.trade_subject}
                          </span>
                        )}
                        {scholar.selected_subjects?.length > 0 && (
                          <span className="bg-blue-50 text-blue-700 border border-blue-100 font-bold px-3 py-1.5 rounded-xl text-sm">
                            📚 {scholar.selected_subjects.length} GCSE options
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

            {/* ── Limit reached state ── */}
            {scholars.length >= MAX_SCHOLARS ? (
              <div className="flex flex-col items-center justify-center flex-grow gap-4 py-8 text-center">
                <div className="text-5xl">🚀</div>
                <p className="text-indigo-900 font-black text-xl">Full crew aboard!</p>
                <p className="text-indigo-700/70 font-semibold text-sm leading-relaxed">
                  You've added {MAX_SCHOLARS} scholars — the maximum on your current plan.<br />
                  Upgrade to Mission Control Pro to add more cadets.
                </p>
                <a
                  href="mailto:hello@launchpard.com?subject=Upgrade%20Request"
                  className="mt-2 px-6 py-3 bg-indigo-600 text-white font-black rounded-2xl border-b-4 border-indigo-800 hover:bg-indigo-700 transition-all text-sm"
                >
                  Contact us to upgrade ✦
                </a>
              </div>
            ) : (

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

              {/* UK KS4 — Optional subject checklist (Y10–Y11 only) */}
              {isUkKs4 && (
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-indigo-500 ml-1 mb-1">
                      🇬🇧 GCSE Subjects
                    </label>
                    <p className="text-xs text-indigo-700/60 font-semibold ml-1 mb-3">
                      Core subjects are included automatically. Tick the optional subjects your scholar is studying.
                    </p>

                    {/* Compulsory — locked */}
                    <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-3 mb-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2">
                        Compulsory (all scholars)
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {UK_KS4_COMPULSORY.map(s => (
                          <span key={s} className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-lg">
                            ✓ {s.replace(/_/g, ' ').replace(/\w/g, c => c.toUpperCase())}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Optional groups */}
                    {UK_KS4_OPTIONS.map(group => (
                      <div key={group.group} className="mb-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">
                          {group.emoji} {group.group}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {group.subjects.map(s => {
                            const checked = selectedSubjects.includes(s.value);
                            return (
                              <button
                                key={s.value}
                                type="button"
                                onClick={() => toggleSubject(s.value)}
                                className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg border-2 transition-all
                                  ${checked
                                    ? 'bg-indigo-600 text-white border-indigo-700'
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}
                              >
                                {checked ? '✓' : '+'} {s.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    {selectedSubjects.length > 0 && (
                      <p className="text-xs text-indigo-600 font-bold ml-1 mt-1">
                        {selectedSubjects.length} optional subject{selectedSubjects.length !== 1 ? 's' : ''} selected
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* NG SSS — Stream selector */}
              {isNgSss && (
                <div className="flex flex-col gap-3">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-indigo-500 ml-1">
                    🇳🇬 Select Stream
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(NG_SSS_STREAMS).map(([key, s]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setNewStream(key)}
                        className={`flex flex-col items-center gap-1 p-3 rounded-2xl border-2 font-bold text-sm transition-all
                          ${newStream === key
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
                            : 'border-indigo-100 bg-white text-slate-500 hover:border-indigo-300'}`}
                      >
                        <span className="text-xl">{s.emoji}</span>
                        <span>{s.label}</span>
                      </button>
                    ))}
                  </div>
                  {!newStream && (
                    <p className="text-xs text-amber-600 font-semibold ml-1">⚠ Please select a stream</p>
                  )}
                </div>
              )}

              {/* NG SSS — Trade subject dropdown */}
              {isNgSss && (
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-1.5 ml-1">
                    🛠 Trade Subject
                  </label>
                  <select
                    value={newTrade}
                    onChange={e => setNewTrade(e.target.value)}
                    className="w-full p-4 bg-white border-2 border-indigo-100 rounded-2xl font-bold text-base outline-none focus:border-indigo-400 cursor-pointer transition-colors"
                  >
                    <option value="">Select a trade subject…</option>
                    {NG_SSS_TRADES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
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
                    onChange={e => handleGradeChange(e.target.value)}
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
                  {getScholarSubjects(newCurriculum, newStream, newTrade, selectedSubjects, newGrade).map(s => {
                    const m = SUBJECT_META[s] || { emoji: "📚", label: s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) };
                    return (
                      <span key={s} className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-lg">
                        {m.emoji} {m.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            </form>
            )} {/* end scholars.length < MAX_SCHOLARS */}
          </div>
        </div>
      </main>
    </div>
  );
}