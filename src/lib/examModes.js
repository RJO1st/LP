// lib/examModes.js — one file, shared everywhere
export const EXAM_MODES = {
  eleven_plus: {
    label: "UK 11+ Prep", emoji: "📝",
    extraSubjects: ["verbal", "nvr"],
    examTag: "eleven_plus",
    eligibleCurricula: ["uk_national"],
    eligibleYears: [3,4,5,6],
  },
  gcse: {
    label: "GCSE Prep", emoji: "🎓",
    extraSubjects: [],           // uses selected_subjects from scholar
    examTag: "gcse",
    eligibleCurricula: ["uk_national"],
    eligibleYears: [9,10,11],
  },
  sats: {
    label: "SATs Mode", emoji: "📋",
    extraSubjects: [],
    examTag: "sats",
    eligibleCurricula: ["uk_national"],
    eligibleYears: [6],
  },
  us_sat: {
    label: "US SAT Prep", emoji: "📐",
    extraSubjects: [],
    examTag: "us_sat",
    eligibleCurricula: ["us_common_core"],
    eligibleYears: [10,11,12],
  },
};