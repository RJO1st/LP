// src/lib/coins.js
// ─────────────────────────────────────────────────────────────────────────────
// LaunchPard coin award logic.
// Call awardCoinsForQuiz() right after inserting a quiz_result row.
// Idempotent via ref_id — safe to call twice for the same quiz result.
// ─────────────────────────────────────────────────────────────────────────────

import { createBrowserClient } from "@supabase/ssr";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// ── Earn rates ────────────────────────────────────────────────────────────────
const RATES = {
  quizBase:        10,   // every completed quiz
  quizPerfect:     20,   // bonus for 100%
  quizGoodPass:     5,   // bonus for ≥80%
  streak3:          5,
  streak7:         15,
  streak14:        30,
  streak30:        60,
  firstTopic:      25,   // first time completing a topic
  missionComplete: 50,
};

const XP_PER_COIN = 10;  // 1 coin per 10 XP earned


/**
 * Award coins after a quiz is completed.
 * Call this immediately after inserting the quiz_result row.
 *
 * @param {Object} params
 * @param {string} params.scholarId
 * @param {string} params.quizResultId    - idempotency key
 * @param {number} params.score           - 0–100
 * @param {number} params.xpEarned        - from existing XP logic
 * @param {string} params.topic
 * @param {number} params.currentStreak   - scholar's streak AFTER this quiz
 *
 * @returns {{ awarded: number, breakdown: string[], balanceAfter: number } | { skipped: true }}
 */
export async function awardCoinsForQuiz({
  scholarId,
  quizResultId,
  score,
  xpEarned,
  topic,
  currentStreak,
}) {
  // Idempotency check
  const { data: existing } = await supabase
    .from("coin_transactions")
    .select("id")
    .eq("scholar_id", scholarId)
    .eq("ref_id", quizResultId)
    .eq("source", "quiz_complete")
    .maybeSingle();

  if (existing) return { skipped: true };

  let total = 0;
  const breakdown = [];

  // XP conversion
  const xpCoins = Math.floor((xpEarned || 0) / XP_PER_COIN);
  if (xpCoins > 0) {
    total += xpCoins;
    breakdown.push(`${xpCoins} from XP`);
  }

  // Base completion
  total += RATES.quizBase;
  breakdown.push(`${RATES.quizBase} for completing quiz`);

  // Score bonuses
  if (score === 100) {
    total += RATES.quizPerfect;
    breakdown.push(`${RATES.quizPerfect} perfect score bonus`);
  } else if (score >= 80) {
    total += RATES.quizGoodPass;
    breakdown.push(`${RATES.quizGoodPass} for ≥80% score`);
  }

  // Streak bonus (milestone days only)
  const streakBonus = getStreakBonus(currentStreak);
  if (streakBonus > 0) {
    total += streakBonus;
    breakdown.push(`${streakBonus} for ${currentStreak}-day streak`);
  }

  // First-time topic bonus
  const isFirst = await isFirstTopicCompletion(scholarId, topic, quizResultId);
  if (isFirst) {
    total += RATES.firstTopic;
    breakdown.push(`${RATES.firstTopic} for first time completing "${topic}"`);
  }

  if (total <= 0) return { awarded: 0, breakdown };

  const result = await creditCoins({
    scholarId,
    delta: total,
    reason: `Quiz complete (${score}%): ${breakdown.join(", ")}`,
    source: "quiz_complete",
    refId: quizResultId,
  });

  return { awarded: total, breakdown, balanceAfter: result.balanceAfter };
}


/**
 * Award coins for completing a mission.
 */
export async function awardCoinsForMission({ scholarId, missionId, missionName }) {
  const { data: existing } = await supabase
    .from("coin_transactions")
    .select("id")
    .eq("scholar_id", scholarId)
    .eq("ref_id", missionId)
    .eq("source", "mission")
    .maybeSingle();

  if (existing) return { skipped: true };

  return creditCoins({
    scholarId,
    delta: RATES.missionComplete,
    reason: `Mission complete: ${missionName}`,
    source: "mission",
    refId: missionId,
  });
}


// ── Internal helpers ──────────────────────────────────────────────────────────

function getStreakBonus(streak) {
  if (streak >= 30) return RATES.streak30;
  if (streak >= 14) return RATES.streak14;
  if (streak >= 7)  return RATES.streak7;
  if (streak >= 3)  return RATES.streak3;
  return 0;
}

async function isFirstTopicCompletion(scholarId, topic, currentResultId) {
  if (!topic) return false;
  const { count } = await supabase
    .from("quiz_results")
    .select("id", { count: "exact", head: true })
    .eq("scholar_id", scholarId)
    .eq("topic", topic)
    .neq("id", currentResultId);
  return count === 0;
}

async function creditCoins({ scholarId, delta, reason, source, refId }) {
  // Read current balance from scholars table (matches existing schema)
  const { data: scholar, error } = await supabase
    .from("scholars")
    .select("coins")
    .eq("id", scholarId)
    .single();

  if (error || !scholar) throw new Error("Could not fetch scholar for coin award");

  const balanceAfter = (scholar.coins || 0) + delta;

  await supabase
    .from("scholars")
    .update({ coins: balanceAfter })
    .eq("id", scholarId);

  await supabase
    .from("coin_transactions")
    .insert({
      scholar_id:    scholarId,
      delta,
      balance_after: balanceAfter,
      reason,
      source,
      ref_id:        refId || null,
    });

  return { balanceAfter };
}