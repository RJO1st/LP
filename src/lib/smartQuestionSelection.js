// ═══════════════════════════════════════════════════════════════════════════
// SMART QUESTION SELECTION ALGORITHM
// Eliminates repetition by tracking seen questions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetches fresh DB questions for a quiz session, deduped against recent history.
 * Returns raw question_bank rows — caller is responsible for shaping and recording history.
 *
 * @param {object}   supabase
 * @param {string}   scholarId
 * @param {string}   subject       e.g. 'maths'
 * @param {string}   curriculum    e.g. 'uk_11plus'
 * @param {number}   yearLevel     e.g. 4
 * @param {number}   [count=10]    number of questions wanted
 * @param {string[]} [excludeIds]  additional IDs to exclude (current session)
 * @returns {Promise<object[]>}    raw question_bank rows (unshaped)
 */
export async function getSmartQuestions(
  supabase,
  scholarId,
  subject,
  curriculum,
  yearLevel,
  count = 10,
  excludeIds = [],
) {
  // Step 1: Get recently seen question IDs (last 14 days)
  let historyIds = [];
  if (scholarId) {
    const since = new Date(Date.now() - 14 * 864e5).toISOString();
    const { data: recentHistory } = await supabase
      .from('scholar_question_history')
      .select('question_id')
      .eq('scholar_id', scholarId)
      .gte('answered_at', since)
      .limit(300);
    historyIds = (recentHistory ?? []).map(h => h.question_id).filter(Boolean);
  }

  const allExcluded = [...new Set([...excludeIds, ...historyIds])].filter(Boolean);

  // Step 2: Get fresh questions not seen recently
  let query = supabase
    .from('question_bank')
    .select('*')
    .eq('curriculum', curriculum)
    .eq('subject', subject)
    .eq('year_level', yearLevel)
    .order('last_used', { ascending: true, nullsFirst: true })
    .limit(count * 6);

  if (allExcluded.length > 0) {
    query = query.not('id', 'in', `(${allExcluded.slice(0, 90).join(',')})`);
  }

  const { data: freshQuestions, error } = await query;

  if (error) {
    console.error('[smartQuestionSelection] Error fetching questions:', error);
    return [];
  }

  // Step 3: Shuffle and return (caller shapes + records history)
  return (freshQuestions ?? [])
    .sort(() => Math.random() - 0.5)
    .slice(0, count * 3); // return 3× buffer so caller can text-dedup
}

// ═══════════════════════════════════════════════════════════════════════════
// ADVANCED: Difficulty-Aware Selection
// ═══════════════════════════════════════════════════════════════════════════

export async function getAdaptiveQuestions(supabase, scholarId, subject, curriculum, yearLevel, count = 10) {

  // Get scholar's recent accuracy for this subject
  const { data: recentResults } = await supabase
    .from('quiz_results')
    .select('score, total_questions')
    .eq('scholar_id', scholarId)
    .eq('subject', subject)
    .order('completed_at', { ascending: false })
    .limit(5);

  // Calculate average accuracy
  let avgAccuracy = 0.7; // Default 70%
  if (recentResults && recentResults.length > 0) {
    const totalScore = recentResults.reduce((sum, r) => sum + r.score, 0);
    const totalQuestions = recentResults.reduce((sum, r) => sum + r.total_questions, 0);
    avgAccuracy = totalScore / totalQuestions;
  }

  // Determine difficulty tier based on accuracy
  let targetTier;
  if (avgAccuracy < 0.5) {
    targetTier = 'foundation';    // Struggling - easier questions
  } else if (avgAccuracy < 0.75) {
    targetTier = 'intermediate';  // Doing okay - medium questions
  } else {
    targetTier = 'advanced';      // Doing great - challenge them!
  }

  // Get recently seen IDs
  const { data: recentHistory } = await supabase
    .from('scholar_question_history')
    .select('question_id')
    .eq('scholar_id', scholarId)
    .order('answered_at', { ascending: false })
    .limit(100);

  const seenIds = (recentHistory ?? []).map(h => h.question_id).filter(Boolean);
  const exclusion = seenIds.length > 0 ? `(${seenIds.slice(0, 90).join(',')})` : '(null)';

  // Fetch questions of appropriate difficulty
  const { data: questions } = await supabase
    .from('question_bank')
    .select('*')
    .eq('curriculum', curriculum)
    .eq('subject', subject)
    .eq('year_level', yearLevel)
    .eq('difficulty_tier', targetTier)
    .not('id', 'in', exclusion)
    .limit(count * 3);

  // Mix in some questions from other tiers for variety
  const { data: mixQuestions } = await supabase
    .from('question_bank')
    .select('*')
    .eq('curriculum', curriculum)
    .eq('subject', subject)
    .eq('year_level', yearLevel)
    .neq('difficulty_tier', targetTier)
    .not('id', 'in', exclusion)
    .limit(Math.floor(count * 0.3));

  const allQuestions = [...(questions ?? []), ...(mixQuestions ?? [])];

  return allQuestions
    .sort(() => Math.random() - 0.5)
    .slice(0, count);
}
