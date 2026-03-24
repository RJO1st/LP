// ═══════════════════════════════════════════════════════════════════════════════
// subjectDisplay.js
// Deploy to: src/lib/subjectDisplay.js
//
// Scholar-friendly subject names and Material Symbols icons.
// Use everywhere subjects are displayed to scholars.
//
// Usage:
//   import { getSubjectLabel, getSubjectIcon, getSubjectColor } from '@/lib/subjectDisplay';
//   <span>{getSubjectLabel("english_studies")}</span>  → "English"
//   <MIcon name={getSubjectIcon("mathematics")} />     → "calculate"
// ═══════════════════════════════════════════════════════════════════════════════

const SUBJECT_DISPLAY = {
  // ── Core ────────────────────────────────────────────────────────────────
  mathematics:                { label: "Maths",               icon: "calculate",          color: "#4f46e5" },
  maths:                      { label: "Maths",               icon: "calculate",          color: "#4f46e5" },
  math:                       { label: "Math",                icon: "calculate",          color: "#4f46e5" },
  further_mathematics:        { label: "Further Maths",       icon: "functions",          color: "#4f46e5" },
  english:                    { label: "English",             icon: "translate",          color: "#e11d48" },
  english_studies:             { label: "English",             icon: "translate",          color: "#e11d48" },
  ela:                        { label: "English",             icon: "translate",          color: "#e11d48" },
  literature:                 { label: "Literature",          icon: "auto_stories",       color: "#e11d48" },
  science:                    { label: "Science",             icon: "science",            color: "#059669" },
  basic_science:              { label: "Science",             icon: "science",            color: "#059669" },

  // ── STEM ────────────────────────────────────────────────────────────────
  physics:                    { label: "Physics",             icon: "bolt",               color: "#2563eb" },
  chemistry:                  { label: "Chemistry",           icon: "experiment",         color: "#dc2626" },
  biology:                    { label: "Biology",             icon: "eco",                color: "#16a34a" },
  basic_technology:           { label: "Technology",          icon: "precision_manufacturing", color: "#d97706" },
  agricultural_science:       { label: "Agriculture",         icon: "yard",               color: "#65a30d" },

  // ── Computing ───────────────────────────────────────────────────────────
  computing:                  { label: "Computing",           icon: "computer",           color: "#6366f1" },
  computer_science:           { label: "Computing",           icon: "computer",           color: "#6366f1" },
  basic_digital_literacy:     { label: "Digital Skills",      icon: "devices",            color: "#6366f1" },
  digital_technologies:       { label: "Digital Tech",        icon: "devices",            color: "#6366f1" },

  // ── Humanities ──────────────────────────────────────────────────────────
  history:                    { label: "History",             icon: "history_edu",        color: "#d97706" },
  geography:                  { label: "Geography",           icon: "public",             color: "#0d9488" },
  social_studies:             { label: "Social Studies",      icon: "groups",             color: "#0891b2" },
  canadian_history:           { label: "History",             icon: "history_edu",        color: "#d97706" },
  hass:                       { label: "HASS",                icon: "public",             color: "#0d9488" },
  humanities:                 { label: "Humanities",          icon: "menu_book",          color: "#e11d48" },
  government:                 { label: "Government",          icon: "account_balance",    color: "#0891b2" },

  // ── Reasoning (11+) ────────────────────────────────────────────────────
  verbal_reasoning:           { label: "Verbal Reasoning",    icon: "psychology",         color: "#7c3aed" },
  nvr:                        { label: "Non-Verbal",          icon: "shapes",             color: "#0891b2" },

  // ── Nigerian ────────────────────────────────────────────────────────────
  civic_education:            { label: "Civic Education",     icon: "account_balance",    color: "#0891b2" },
  business_education:         { label: "Business Studies",    icon: "business_center",    color: "#d97706" },
  business_studies:           { label: "Business Studies",    icon: "business_center",    color: "#d97706" },
  cultural_and_creative_arts: { label: "Creative Arts",       icon: "palette",            color: "#ec4899" },
  pre_vocational_studies:     { label: "Vocational Studies",  icon: "handyman",           color: "#d97706" },
  religious_studies:          { label: "Religious Studies",    icon: "church",             color: "#7c3aed" },
  religious_education:        { label: "Religious Education",  icon: "church",             color: "#7c3aed" },
  financial_accounting:       { label: "Accounting",          icon: "account_balance_wallet", color: "#059669" },
  commerce:                   { label: "Commerce",            icon: "storefront",         color: "#d97706" },
  economics:                  { label: "Economics",           icon: "trending_up",        color: "#2563eb" },
  office_practice:            { label: "Office Practice",     icon: "description",        color: "#64748b" },

  // ── Design / Other ─────────────────────────────────────────────────────
  design_and_technology:      { label: "Design & Technology",  icon: "design_services",    color: "#d97706" },
  citizenship:                { label: "Citizenship",         icon: "how_to_vote",        color: "#0891b2" },
};

// ── KS1-friendly overrides (even simpler names for ages 5-7) ────────────
const KS1_OVERRIDES = {
  mathematics:                "Number Forest",
  english:                    "Word Wizard",
  english_studies:             "Word Wizard",
  science:                    "Science Garden",
  basic_science:              "Science Garden",
  computing:                  "Computer Island",
  history:                    "History Hills",
  geography:                  "Geography Cove",
  design_and_technology:      "Making Things",
  religious_education:        "Stories & Beliefs",
};

// ── KS2-friendly overrides (space theme) ────────────────────────────────
const KS2_OVERRIDES = {
  mathematics:                "Maths Command",
  english:                    "Word Nebula",
  english_studies:             "Word Nebula",
  science:                    "Lab Station",
  basic_science:              "Lab Station",
  computing:                  "Code Matrix",
  history:                    "Time Warp",
  geography:                  "World Atlas",
  design_and_technology:      "Engineering Bay",
  religious_education:        "Star Beliefs",
};

/**
 * Get scholar-friendly label for a subject.
 * @param {string} subject — DB key like "english_studies"
 * @param {string} [band] — optional age band for themed names ("ks1", "ks2")
 * @returns {string} — display label like "English" or "Word Wizard"
 */
export function getSubjectLabel(subject, band) {
  const key = (subject || "").toLowerCase();

  if (band === "ks1" && KS1_OVERRIDES[key]) return KS1_OVERRIDES[key];
  if (band === "ks2" && KS2_OVERRIDES[key]) return KS2_OVERRIDES[key];

  return SUBJECT_DISPLAY[key]?.label || subject?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) || "Study";
}

/**
 * Get Material Symbols icon name for a subject.
 * @param {string} subject — DB key
 * @returns {string} — icon name like "calculate"
 */
export function getSubjectIcon(subject) {
  return SUBJECT_DISPLAY[(subject || "").toLowerCase()]?.icon || "school";
}

/**
 * Get accent color for a subject.
 * @param {string} subject — DB key
 * @returns {string} — hex color like "#4f46e5"
 */
export function getSubjectColor(subject) {
  return SUBJECT_DISPLAY[(subject || "").toLowerCase()]?.color || "#6366f1";
}

/**
 * Get all display info for a subject.
 * @param {string} subject — DB key
 * @param {string} [band] — optional age band
 * @returns {{ label: string, icon: string, color: string }}
 */
export function getSubjectDisplay(subject, band) {
  const key = (subject || "").toLowerCase();
  const base = SUBJECT_DISPLAY[key] || { label: subject, icon: "school", color: "#6366f1" };
  return {
    ...base,
    label: getSubjectLabel(subject, band),
  };
}