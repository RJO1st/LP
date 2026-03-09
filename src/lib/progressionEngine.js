/**
 * progressionEngine.js
 * 
 * Single source of truth for all scholar stage progression logic.
 * Defines what follows what, when graduation triggers, and handles
 * the DB transition via the promote_scholar RPC.
 * 
 * Used by:
 *   - GraduationModal.jsx  (ceremony + stream/subject selection)
 *   - QuestOrchestrator.jsx (detect if scholar is in final year)
 *   - parent/page.jsx       (scholar card progression badge)
 */

// ─── STAGE TRANSITION MAP ─────────────────────────────────────────────────────
// Defines what curriculum+year each stage transitions TO.
// Special keys: 'GRADUATED' = terminal stage, no further progression.
// 'NEEDS_STREAM' = JSS→SSS, stream selection required before promoting.
// 'NEEDS_KS4_SUBJECTS' = KS3→KS4, subject checklist required.

export const STAGE_TRANSITIONS = {
  uk_11plus: {
    maxYear: 6,
    nextCurriculum: 'uk_national',
    nextYear: 7,
    flag: null,
    label: 'Move to UK National (KS3)',
    celebrationTitle: '11+ Journey Complete!',
    celebrationDesc: 'Your scholar has mastered the 11+ curriculum. Time to begin KS3 at UK National.',
  },
  uk_national: {
    // KS3 → KS4 is an internal transition (same curriculum, different year)
    // KS4 → terminal
    maxYear: 11,
    // Year 9 → Year 10 is handled as a special internal flag
    internalTransitions: {
      9: { nextYear: 10, flag: 'NEEDS_KS4_SUBJECTS', label: 'Begin GCSE Years (KS4)' },
    },
    nextCurriculum: null, // terminal at Y11
    nextYear: null,
    flag: 'GRADUATED',
    label: null,
    celebrationTitle: 'GCSEs Complete!',
    celebrationDesc: 'An incredible achievement — your scholar has completed the full UK National Curriculum.',
  },
  ng_primary: {
    maxYear: 6,
    nextCurriculum: 'ng_jss',
    nextYear: 1,
    flag: null,
    label: 'Progress to Nigerian JSS',
    celebrationTitle: 'Primary School Complete!',
    celebrationDesc: 'Your scholar has finished Nigerian Primary. Ready for Junior Secondary School.',
  },
  ng_jss: {
    maxYear: 3,
    nextCurriculum: 'ng_sss',
    nextYear: 1,
    flag: 'NEEDS_STREAM',
    label: 'Progress to Nigerian SSS',
    celebrationTitle: 'JSS Complete!',
    celebrationDesc: 'Junior Secondary done. Before starting SSS, choose the stream that fits your scholar\'s strengths.',
  },
  ng_sss: {
    maxYear: 3,
    nextCurriculum: null,
    nextYear: null,
    flag: 'GRADUATED',
    label: null,
    celebrationTitle: 'WAEC Ready!',
    celebrationDesc: 'Your scholar has completed the full Nigerian curriculum pathway. An outstanding achievement.',
  },
  ca_primary: {
    maxYear: 8,
    nextCurriculum: 'ca_secondary',
    nextYear: 9,
    flag: null,
    label: 'Progress to Canadian Secondary',
    celebrationTitle: 'Primary Complete!',
    celebrationDesc: 'Your scholar has finished Canadian Primary. Onwards to Secondary.',
  },
  ca_secondary: {
    maxYear: 12,
    nextCurriculum: null,
    nextYear: null,
    flag: 'GRADUATED',
    label: null,
    celebrationTitle: 'Canadian Secondary Complete!',
    celebrationDesc: 'Your scholar has completed the full Canadian Secondary curriculum.',
  },
  us_common_core: {
    maxYear: 8,
    nextCurriculum: null,
    nextYear: null,
    flag: 'GRADUATED',
    label: null,
    celebrationTitle: 'Common Core Complete!',
    celebrationDesc: 'Your scholar has completed the US Common Core pathway.',
  },
  aus_acara: {
    maxYear: 10,
    nextCurriculum: null,
    nextYear: null,
    flag: 'GRADUATED',
    label: null,
    celebrationTitle: 'Australian Curriculum Complete!',
    celebrationDesc: 'Your scholar has completed the Australian National Curriculum (F–10).',
  },
  ib_pyp: {
    maxYear: 6,
    nextCurriculum: 'ib_myp',
    nextYear: 1,
    flag: null,
    label: 'Progress to IB MYP',
    celebrationTitle: 'IB PYP Complete!',
    celebrationDesc: 'Primary Years Programme done. Time to begin the Middle Years Programme.',
  },
  ib_myp: {
    maxYear: 5,
    nextCurriculum: null,
    nextYear: null,
    flag: 'GRADUATED',
    label: null,
    celebrationTitle: 'IB MYP Complete!',
    celebrationDesc: 'Your scholar has completed the IB Middle Years Programme.',
  },
  uk_11plus: {
    maxYear: 6,
    nextCurriculum: 'uk_national',
    nextYear: 7,
    flag: null,
    label: 'Move to UK National (KS3)',
    celebrationTitle: '11+ Prep Complete!',
    celebrationDesc: 'Your scholar has completed 11+ exam preparation. Ready to begin KS3.',
  },
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/**
 * Returns the progression state for a scholar at their current position.
 * 
 * @returns {object} {
 *   isAtStageEnd: boolean,       — true if this is the final year of their stage
 *   isGraduated: boolean,        — true if terminal (no next stage)
 *   needsStream: boolean,        — true if next stage requires stream selection (JSS→SSS)
 *   needsKs4Subjects: boolean,   — true if KS3→KS4 subject checklist needed
 *   nextCurriculum: string|null,
 *   nextYear: number|null,
 *   transition: object|null,     — the full transition config
 * }
 */
export function getProgressionState(curriculum, yearLevel) {
  const config = STAGE_TRANSITIONS[curriculum];
  if (!config) return { isAtStageEnd: false, isGraduated: false };

  const year = Number(yearLevel);

  // Check internal transitions first (e.g. KS3→KS4 within uk_national)
  if (config.internalTransitions?.[year]) {
    const t = config.internalTransitions[year];
    return {
      isAtStageEnd: true,
      isGraduated: false,
      needsStream: false,
      needsKs4Subjects: t.flag === 'NEEDS_KS4_SUBJECTS',
      nextCurriculum: curriculum, // same curriculum
      nextYear: t.nextYear,
      transition: { ...config, ...t },
    };
  }

  if (year < config.maxYear) {
    return { isAtStageEnd: false, isGraduated: false };
  }

  // At maxYear
  const isGraduated = config.flag === 'GRADUATED';
  return {
    isAtStageEnd: true,
    isGraduated,
    needsStream: config.flag === 'NEEDS_STREAM',
    needsKs4Subjects: false,
    nextCurriculum: config.nextCurriculum,
    nextYear: config.nextYear,
    transition: config,
  };
}

/**
 * Promote a scholar to their next stage.
 * Calls the promote_scholar Supabase RPC (atomic update + audit log).
 * 
 * @param {object} supabase
 * @param {string} scholarId
 * @param {string} toCurriculum
 * @param {number} toYear
 * @param {string|null} stream
 * @param {string[]|null} selectedSubjects
 */
export async function promoteScholar(supabase, scholarId, toCurriculum, toYear, stream = null, selectedSubjects = null) {
  const { error } = await supabase.rpc('promote_scholar', {
    p_scholar_id:        scholarId,
    p_to_curriculum:     toCurriculum,
    p_to_year:           toYear,
    p_stream:            stream,
    p_selected_subjects: selectedSubjects ? selectedSubjects : null,
  });
  if (error) throw error;
}

/**
 * Advance a scholar one year within their current stage.
 * Used by parent dashboard "Advance Year" button.
 * Does NOT create a progression log entry (only stage changes are logged).
 * If advancing would trigger a stage transition, returns { needsGraduation: true }
 * and the caller should open GraduationModal instead.
 */
export async function advanceScholarYear(supabase, scholarId, curriculum, currentYear) {
  const progression = getProgressionState(curriculum, currentYear);

  // If at stage end, signal graduation instead of simple increment
  if (progression.isAtStageEnd) {
    return { needsGraduation: true, progression };
  }

  const { error } = await supabase
    .from('scholars')
    .update({ year_level: currentYear + 1 })
    .eq('id', scholarId);

  if (error) throw error;
  return { needsGraduation: false, newYear: currentYear + 1 };
}

/**
 * Check if the student dashboard should show a YearLevelUpModal.
 * Compares scholar's current year against the last year seen in this browser.
 * Call on QuestOrchestrator mount.
 */
export function checkYearLevelUp(scholarId, currentYear) {
  try {
    const key = `launchpard_last_year_${scholarId}`;
    const lastSeen = parseInt(localStorage.getItem(key) || '0', 10);
    if (currentYear > lastSeen && lastSeen > 0) {
      return true; // year advanced since last visit
    }
    // Update stored year
    localStorage.setItem(key, String(currentYear));
    return false;
  } catch {
    return false; // localStorage unavailable
  }
}

/**
 * Mark the year-level-up as seen (call after YearLevelUpModal is dismissed).
 */
export function acknowledgeYearLevelUp(scholarId, currentYear) {
  try {
    localStorage.setItem(`launchpard_last_year_${scholarId}`, String(currentYear));
  } catch { /* ignore */ }
}

/**
 * Returns all past progressions for a scholar, newest first.
 */
export async function getScholarProgressions(supabase, scholarId) {
  const { data, error } = await supabase
    .from('scholar_progressions')
    .select('*')
    .eq('scholar_id', scholarId)
    .order('promoted_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

/**
 * Human-readable stage label for a curriculum.
 */
export function getStageLabel(curriculum) {
  const labels = {
    uk_11plus:      '11+ Prep',
    uk_national:    'UK National',
    ng_primary:     'Primary',
    ng_jss:         'JSS',
    ng_sss:         'SSS',
    ca_primary:     'Canadian Primary',
    ca_secondary:   'Canadian Secondary',
    us_common_core: 'US Common Core',
    aus_acara:      'Australian',
    ib_pyp:         'IB PYP',
    ib_myp:         'IB MYP',
  };
  return labels[curriculum] || curriculum;
}