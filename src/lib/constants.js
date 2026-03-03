// src/lib/constants.js
// All data lives in gamificationEngine.js — this file just re-exports the
// shared constants so pages outside the student dashboard can use @/lib/constants.

export {
  CURRICULA,
  SUBJECTS_BY_CURRICULUM,
  getLevelInfo,
  BADGES,
  TIER_COLORS,
  AVATAR_ITEMS,
  RARITY_COLORS,
  sounds,
  ensureQuestsAssigned,
} from "./gamificationEngine";