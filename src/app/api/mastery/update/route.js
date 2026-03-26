/**
 * src/app/api/mastery/update/route.js
 * ─────────────────────────────────────────────────────────────────────────────
 * POST /api/mastery/update
 *
 * Called after every quiz answer. Updates scholar_topic_mastery with the
 * v2 composite mastery system (acquisition + stability + recency),
 * logs the answer to session_answers, and returns the updated record.
 *
 * Body: {
 *   scholarId   : string (UUID)
 *   sessionId   : string (client-generated UUID per session)
 *   questionId  : string | null
 *   curriculum  : string
 *   subject     : string
 *   topic       : string
 *   yearLevel   : number
 *   correct     : boolean
 *   chosenIndex : number
 *   correctIndex: number
 *   timeTakenMs : number | null
 *   difficultyTier: string | null
 * }
 *
 * Returns: { mastery, milestones, storyPointsEarned, tier_crossed, new_tier, prev_tier }
 */

import { createClient } from "@supabase/supabase-js";
import { NextResponse }  from "next/server";

// Fallbacks if optional modules don't exist
const _fallbackCalcStoryPoints = (correct, total, streak) => correct * 5 + (correct === total ? 10 : 0);
const _fallbackCheckMilestones = () => [];

async function safeImports() {
  let calcStoryPoints = _fallbackCalcStoryPoints;
  let checkMilestones = _fallbackCheckMilestones;
  try { const m = await import("@/lib/narrativeEngine"); if (m.calcStoryPoints) calcStoryPoints = m.calcStoryPoints; } catch {}
  try { const m = await import("@/lib/learningPathEngine"); if (m.checkMilestones) checkMilestones = m.checkMilestones; } catch {}
  return { calcStoryPoints, checkMilestones };
}

// ── BKT constants (must match masteryEngine.js) ───────────────────────────────
const BKT = {
  pLearn: 0.025,
  pSlip:  0.20,
  pGuess: 0.30,
  pInit:  0.08,
};
const MASTERY_THRESHOLDS = { mastered: 0.80, developing: 0.55 };

function bktUpdate(currentMastery, correct) {
  const { pLearn, pSlip, pGuess } = BKT;
  const pCorrectGiven = currentMastery * (1 - pSlip) + (1 - currentMastery) * pGuess;
  let pMasteryGivenObs;
  if (correct) {
    pMasteryGivenObs = (currentMastery * (1 - pSlip)) / pCorrectGiven;
  } else {
    pMasteryGivenObs = (currentMastery * pSlip) / (1 - pCorrectGiven);
  }
  return Math.max(0.01, Math.min(0.99, pMasteryGivenObs + (1 - pMasteryGivenObs) * pLearn));
}

// ── VOLUME-BASED MASTERY CAPS (must match masteryEngine.js) ──────────────────
const VOLUME_CAPS = [
  { minSeen:   0, maxMastery: 0.25 },
  { minSeen:  10, maxMastery: 0.40 },
  { minSeen:  25, maxMastery: 0.55 },
  { minSeen:  50, maxMastery: 0.70 },
  { minSeen:  75, maxMastery: 0.85 },
  { minSeen: 100, maxMastery: 0.95 },
  { minSeen: 150, maxMastery: 1.00 },
];

function capMasteryByVolume(rawScore, timesSeen = 0) {
  let cap = 0.25;
  for (const { minSeen, maxMastery } of VOLUME_CAPS) {
    if (timesSeen >= minSeen) cap = maxMastery;
  }
  return Math.min(rawScore, cap);
}

// ── DISTRIBUTED-PRACTICE CAPS (must match masteryEngine.js) ──────────────────
const PRACTICE_DAY_CAPS = [
  { minDays:  0, maxMastery: 0.30 },
  { minDays:  1, maxMastery: 0.35 },
  { minDays:  2, maxMastery: 0.45 },
  { minDays:  3, maxMastery: 0.55 },
  { minDays:  5, maxMastery: 0.70 },
  { minDays:  7, maxMastery: 0.85 },
  { minDays: 14, maxMastery: 0.95 },
  { minDays: 21, maxMastery: 1.00 },
];

function capMasteryByPracticeDays(rawScore, uniqueDays = 1) {
  let cap = 0.35;
  for (const { minDays, maxMastery } of PRACTICE_DAY_CAPS) {
    if (uniqueDays >= minDays) cap = maxMastery;
  }
  return Math.min(rawScore, cap);
}

// ── STABILITY (must match masteryEngine.js) ──────────────────────────────────
function computeStability(repetitions = 0, intervalDays = 1) {
  const repFactor = 1 - Math.exp(-0.35 * repetitions);
  const intervalFactor = Math.min(1, Math.log2(Math.max(1, intervalDays) + 1) / Math.log2(31));
  return Math.min(1, repFactor * 0.65 + intervalFactor * 0.35);
}

// ── FORGETTING-CURVE DECAY (must match masteryEngine.js) ─────────────────────
const DECAY_BASE_BY_STABILITY = { low: 0.92, medium: 0.96, high: 0.985 };

function applyForgettingDecay(score, lastSeenAt, stability = 0, intervalDays = 1) {
  if (!lastSeenAt) return score;
  const daysSince = (Date.now() - new Date(lastSeenAt).getTime()) / 86_400_000;
  const daysOverdue = Math.max(0, daysSince - intervalDays);
  if (daysOverdue <= 0) return score;
  const decayBase = stability > 0.6 ? DECAY_BASE_BY_STABILITY.high
    : stability > 0.3 ? DECAY_BASE_BY_STABILITY.medium : DECAY_BASE_BY_STABILITY.low;
  const retention = Math.pow(decayBase, Math.min(daysOverdue, 90));
  return Math.max(BKT.pInit, score * retention);
}

// ── COMPOSITE MASTERY (must match masteryEngine.js) ──────────────────────────
const COMPOSITE_WEIGHTS = { acquisition: 0.50, stability: 0.30, recency: 0.20 };

function computeCompositeMastery({ acquisitionScore, stability, recency, timesSeen, uniquePracticeDays }) {
  const { acquisition: wA, stability: wS, recency: wR } = COMPOSITE_WEIGHTS;
  let composite = (acquisitionScore * wA) + (stability * wS) + (recency * wR);
  composite = Math.max(0.01, Math.min(0.99, composite));
  composite = capMasteryByVolume(composite, timesSeen);
  composite = capMasteryByPracticeDays(composite, uniquePracticeDays);
  return composite;
}

// ── TIER with full gates (must match masteryEngine.js) ───────────────────────
function tierFromScore(score, intervalDays = 0, timesSeen = 0, spacedReviewCount = 0, uniquePracticeDays = 1) {
  if (score >= MASTERY_THRESHOLDS.mastered && timesSeen >= 100 && intervalDays >= 7
      && spacedReviewCount >= 3 && uniquePracticeDays >= 7) return "exceeding";
  if (score >= MASTERY_THRESHOLDS.developing && timesSeen >= 50
      && spacedReviewCount >= 2 && uniquePracticeDays >= 3) return "expected";
  return "developing";
}

// ── SPACED REVIEW DETECTION ──────────────────────────────────────────────────
function isSpacedReview(lastSeenAt, correct) {
  if (!correct || !lastSeenAt) return false;
  const daysSince = (Date.now() - new Date(lastSeenAt).getTime()) / 86_400_000;
  return daysSince >= 1;
}

// ── PRACTICE DAYS TRACKING ───────────────────────────────────────────────────
function updatePracticeDays(existingDays = []) {
  const today = new Date().toISOString().slice(0, 10);
  const days = Array.isArray(existingDays) ? [...existingDays] : [];
  if (!days.includes(today)) days.push(today);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const filtered = days.filter(d => d >= cutoffStr);
  return { days: filtered, count: filtered.length };
}


const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const { calcStoryPoints, checkMilestones } = await safeImports();
    const body = await request.json();
    const {
      scholarId,
      sessionId,
      questionId,
      curriculum,
      subject,
      topic,
      yearLevel,
      correct,
      chosenIndex,
      correctIndex,
      timeTakenMs,
      difficultyTier,
    } = body;

    // ── Validation ────────────────────────────────────────────────────────
    if (!scholarId || !curriculum || !subject || !topic || correct === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // ── 1. Fetch current mastery ─────────────────────────────────────────
    const { data: prevMastery } = await supabase
      .from("scholar_topic_mastery")
      .select("*")
      .eq("scholar_id", scholarId)
      .eq("curriculum", curriculum)
      .eq("subject", subject)
      .eq("topic", topic)
      .single();

    // ── 2. Compute v2 composite mastery ──────────────────────────────────
    const timesSeen    = (prevMastery?.times_seen    ?? 0) + 1;
    const timesCorrect = (prevMastery?.times_correct ?? 0) + (correct ? 1 : 0);
    const streak       = correct ? (prevMastery?.current_streak ?? 0) + 1 : 0;

    // Stability from previous state
    const prevStability = prevMastery?.stability ?? computeStability(
      prevMastery?.repetitions ?? 0, prevMastery?.interval_days ?? 1
    );

    // Apply forgetting-curve decay before BKT update
    const prevAcquisition = prevMastery?.acquisition_score ?? prevMastery?.mastery_score ?? BKT.pInit;
    const decayed = applyForgettingDecay(
      prevAcquisition, prevMastery?.last_seen_at, prevStability, prevMastery?.interval_days ?? 1
    );
    const rawBkt = bktUpdate(decayed, correct);
    const cappedAcquisition = capMasteryByVolume(rawBkt, timesSeen);

    // SM-2 spaced repetition
    const prevEase     = prevMastery?.ease_factor  ?? 2.5;
    const prevInterval = prevMastery?.interval_days ?? 1;
    const prevReps     = prevMastery?.repetitions   ?? 0;
    let newEase = prevEase, newInterval = prevInterval, newReps = prevReps;
    if (correct) {
      newReps     = prevReps + 1;
      newEase     = Math.max(1.3, prevEase + 0.1);
      newInterval = newReps === 1 ? 1 : newReps === 2 ? 3 : Math.round(prevInterval * newEase);
    } else {
      newReps = 0; newInterval = 1;
      newEase = Math.max(1.3, prevEase - 0.2);
    }
    newInterval = Math.min(90, Math.max(1, newInterval));

    // New stability
    const newStability = computeStability(newReps, newInterval);

    // Spaced review tracking
    const spacedReview = isSpacedReview(prevMastery?.last_seen_at, correct);
    const spacedReviewCount = (prevMastery?.spaced_review_count ?? 0) + (spacedReview ? 1 : 0);

    // Practice days tracking
    const { days: practiceDays, count: uniquePracticeDays } = updatePracticeDays(
      prevMastery?.practice_days
    );

    // Composite mastery score
    const masteryScore = computeCompositeMastery({
      acquisitionScore: cappedAcquisition,
      stability: newStability,
      recency: 1.0,  // just answered = max recency
      timesSeen,
      uniquePracticeDays,
    });

    // Tier with full gates
    const tier = tierFromScore(masteryScore, newInterval, timesSeen, spacedReviewCount, uniquePracticeDays);
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + newInterval);

    // ── Detect tier crossings for certificate surfacing ──────────────────
    const prevTier = prevMastery?.current_tier ?? null;
    const TIER_RANK = { developing: 1, expected: 2, exceeding: 3 };
    const tierRankPrev = TIER_RANK[prevTier] ?? 0;
    const tierRankNew  = TIER_RANK[tier]     ?? 0;
    const tier_crossed = (tierRankNew > tierRankPrev && tier !== "developing") ? tier : null;

    const masteryPayload = {
      scholar_id:          scholarId,
      curriculum,
      subject,
      topic,
      year_level:          yearLevel ?? prevMastery?.year_level ?? null,
      mastery_score:       masteryScore,
      acquisition_score:   cappedAcquisition,
      stability:           newStability,
      times_seen:          timesSeen,
      times_correct:       timesCorrect,
      ease_factor:         newEase,
      interval_days:       newInterval,
      repetitions:         newReps,
      current_streak:      streak,
      current_tier:        tier,
      spaced_review_count: spacedReviewCount,
      practice_days:       practiceDays,
      unique_practice_days: uniquePracticeDays,
      next_review_at:      nextReview.toISOString(),
      last_seen_at:        new Date().toISOString(),
      updated_at:          new Date().toISOString(),
    };

    // Track when a tier is first achieved (for certificate duration requirement)
    if (tier_crossed) {
      masteryPayload.tier_achieved_at = new Date().toISOString();
    }

    let updatedMastery;
    if (prevMastery?.id) {
      const { data, error } = await supabase
        .from("scholar_topic_mastery")
        .update(masteryPayload)
        .eq("id", prevMastery.id)
        .select()
        .single();
      if (error) {
        console.error("mastery update error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      updatedMastery = data;
    } else {
      masteryPayload.tier_achieved_at = null;
      const { data, error } = await supabase
        .from("scholar_topic_mastery")
        .insert(masteryPayload)
        .select()
        .single();
      if (error) {
        console.error("mastery insert error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      updatedMastery = data;
    }

    // ── 3. Log to session_answers ─────────────────────────────────────────
    const answerRow = {
      scholar_id:         scholarId,
      question_id:        questionId ?? null,
      session_id:         sessionId ?? "unknown",
      subject,
      topic,
      curriculum,
      year_level:         yearLevel,
      difficulty_tier:    difficultyTier ?? null,
      answered_correctly: correct,
      time_taken_ms:      timeTakenMs ?? null,
      chosen_index:       chosenIndex ?? null,
      correct_index:      correctIndex ?? null,
    };

    try {
      await supabase.from("session_answers").insert(answerRow);
    } catch {
      // Non-fatal
    }

    // ── 4. Check milestones ───────────────────────────────────────────────
    const milestones = checkMilestones(prevMastery, updatedMastery);

    // ── 5. Award story points ─────────────────────────────────────────────
    const bonusStoryPoints = milestones.reduce((sum, m) => sum + (m.storyPoints ?? 0), 0);
    const baseStoryPoints  = calcStoryPoints(correct ? 1 : 0, 1, 0);
    const storyPointsEarned = baseStoryPoints + bonusStoryPoints;

    if (storyPointsEarned > 0) {
      try {
        await supabase.rpc("increment_story_points", {
          p_scholar_id: scholarId,
          p_points:     storyPointsEarned,
        });
      } catch {}
    }

    // ── 6. Mark question as used ──────────────────────────────────────────
    if (questionId) {
      try {
        await supabase
          .from("question_bank")
          .update({ last_used: new Date().toISOString() })
          .eq("id", questionId);
      } catch {}
    }

    return NextResponse.json({
      mastery:          updatedMastery,
      milestones,
      storyPointsEarned,
      tier_crossed,
      new_tier:  tier,
      prev_tier: prevTier,
    });

  } catch (err) {
    console.error("/api/mastery/update error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
