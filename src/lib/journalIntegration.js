/**
 * journalIntegration.js
 * Deploy to: src/lib/journalIntegration.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Call after every quiz completion to auto-create journal entries for KS1/KS2.
 * Designed to be non-blocking and non-fatal — journal failures never break quizzes.
 *
 * INTEGRATION (add to quizUtils.js saveQuizResult):
 *
 *   import { createJournalEntry } from '@/lib/journalIntegration';
 *
 *   // At the end of saveQuizResult, after the main insert:
 *   createJournalEntry(supabase, {
 *     scholarId, subject, topic: topicSummary?.primaryTopic,
 *     score: finalScore, total: questions.length,
 *     yearLevel: student?.year_level,
 *   });
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { getAgeBand } from './ageBandConfig';

/**
 * Creates a quest journal entry. Non-blocking, non-fatal.
 * Only creates entries for KS1 and KS2 scholars.
 */
export async function createJournalEntry(supabase, {
  scholarId, subject, topic, score, total, yearLevel,
}) {
  if (!supabase || !scholarId) return;

  const band = getAgeBand(yearLevel, scholar?.curriculum);
  // Only KS1 and KS2 get journal entries
  if (band !== 'ks1' && band !== 'ks2') return;

  try {
    // Try the DB function first (created by quest_journal_migration.sql)
    const { error } = await supabase.rpc('create_journal_entry', {
      p_scholar_id: scholarId,
      p_subject:    subject || 'mathematics',
      p_topic:      topic || 'general',
      p_score:      score ?? 0,
      p_total:      total ?? 10,
      p_year_level: parseInt(yearLevel, 10) || 4,
    });

    if (error) {
      // If the DB function doesn't exist yet, create entry client-side
      if (error.message?.includes('does not exist') || error.code === '42883') {
        await createJournalEntryClientSide(supabase, {
          scholarId, subject, topic, score, total, yearLevel, band,
        });
      } else {
        console.warn('[journal] RPC error:', error.message);
      }
    }
  } catch (err) {
    // Non-fatal — journal is a nice-to-have, not critical
    console.warn('[journal] Failed to create entry:', err?.message);
  }
}

/**
 * Client-side fallback if the DB function isn't deployed yet.
 */
async function createJournalEntryClientSide(supabase, {
  scholarId, subject, topic, score, total, yearLevel, band,
}) {
  const topicLabel = (topic || 'general').replace(/_/g, ' ');
  const titleCase  = topicLabel.replace(/\b\w/g, c => c.toUpperCase());
  const pct        = total > 0 ? score / total : 0;

  let entry, icon;

  if (band === 'ks1') {
    if (pct >= 1)   { entry = `Perfect adventure! You solved every puzzle in ${titleCase}! ⭐`;           icon = '🏆'; }
    else if (pct >= 0.8) { entry = `Great adventure in the ${titleCase} forest! Almost all stars found! 🌟`; icon = '🌟'; }
    else if (pct >= 0.5) { entry = `You explored the ${titleCase} castle and collected ${score} treasures!`;  icon = '🗺️'; }
    else            { entry = `The ${titleCase} dragon was tricky today! Every adventure makes you braver! 💪`;icon = '🐉'; }
  } else {
    if (pct >= 1)   { entry = `Mission perfect! The ${titleCase} sector is secured. ${total}/${total} targets hit! 🎯`; icon = '🏆'; }
    else if (pct >= 0.8) { entry = `Strong mission in the ${titleCase} Galaxy. ${score}/${total} targets confirmed.`;    icon = '🚀'; }
    else if (pct >= 0.5) { entry = `Explored the Planet of ${titleCase}. ${score} readings captured.`;                    icon = '🪐'; }
    else            { entry = `The ${titleCase} sector was hostile terrain. Regroup and try again, Commander!`;            icon = '📡'; }
  }

  await supabase.from('quest_journal').insert({
    scholar_id: scholarId,
    entry_text: entry,
    icon,
    subject: subject || 'mathematics',
    topic:   topic || 'general',
    entry_type: 'quest_complete',
    metadata: { score, total, year_level: yearLevel },
  });
}

/**
 * Update daily adventure progress (KS1 only).
 * Call after each question answered in daily adventure mode.
 */
export async function updateDailyAdventure(supabase, scholarId, completed) {
  if (!supabase || !scholarId) return;
  try {
    const today = new Date().toISOString().split('T')[0];
    await supabase
      .from('daily_adventure')
      .upsert({
        scholar_id: scholarId,
        adventure_date: today,
        completed: completed,
      }, { onConflict: 'scholar_id,adventure_date' });
  } catch (err) {
    console.warn('[journal] Failed to update daily adventure:', err?.message);
  }
}