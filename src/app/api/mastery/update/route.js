/**
 * src/app/api/mastery/update/route.js
 * ─────────────────────────────────────────────────────────────────────────────
 * POST /api/mastery/update
 *
 * Called after every quiz answer. Updates scholar_topic_mastery via the
 * Supabase RPC `upsert_mastery_after_answer`, logs the answer to
 * session_answers, and returns the updated mastery record.
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
 * Returns: { mastery, milestones, storyPointsEarned }
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
// The route previously used a shortcut formula (score + 0.3*(target - score))
// that reached 0.55 "expected" tier after only 2 correct answers.
// This proper BKT implementation matches masteryEngine.js exactly.
const BKT = {
  pLearn: 0.05,   // must match masteryEngine.js
  pSlip:  0.15,   // must match masteryEngine.js
  pGuess: 0.25,   // must match masteryEngine.js
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
  return pMasteryGivenObs + (1 - pMasteryGivenObs) * pLearn;
}

function applyTimeDecay(score, lastSeenAt) {
  if (!lastSeenAt) return score;
  const daysSince = (Date.now() - new Date(lastSeenAt).getTime()) / 86_400_000;
  const decay = daysSince >= 60 ? 0.60 : daysSince >= 30 ? 0.75 : daysSince >= 21 ? 0.85 : daysSince >= 14 ? 0.93 : 1.0;
  return score * decay;
}

function tierFromScore(score, intervalDays = 0, timesSeen = 0) {
  // ── Stage-gated mastery tiers ──────────────────────────────────────────
  // A scholar cannot reach higher tiers without sustained evidence:
  //   exceeding: score >= 0.80 AND seen 40+ questions AND interval >= 7 days
  //   expected:  score >= 0.55 AND seen 20+ questions
  //   developing: everything else
  //
  // This prevents "Stellar in one quest" — even 20/20 correct only reaches
  // "expected" at best on the first session, because times_seen starts at 20.
  // The scholar must return for more sessions to prove retention.
  if (score >= MASTERY_THRESHOLDS.mastered && timesSeen >= 40 && intervalDays >= 7) return "exceeding";
  if (score >= MASTERY_THRESHOLDS.developing && timesSeen >= 20) return "expected";
  return "developing";
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY   // service role — needed for RPC + insert
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

    // ── 1. Fetch current mastery (for milestone comparison) ───────────────
    const { data: prevMastery } = await supabase
      .from("scholar_topic_mastery")
      .select("*")
      .eq("scholar_id", scholarId)
      .eq("curriculum", curriculum)
      .eq("subject", subject)
      .eq("topic", topic)
      .single();

    // ── 2. Upsert mastery via proper BKT (matches masteryEngine.js) ─────────
    const timesSeen    = (prevMastery?.times_seen    ?? 0) + 1;
    const timesCorrect = (prevMastery?.times_correct ?? 0) + (correct ? 1 : 0);
    const streak       = correct ? (prevMastery?.current_streak ?? 0) + 1 : 0;

    // Apply time decay before BKT update so forgetting is modelled correctly
    const rawPrev   = prevMastery?.mastery_score ?? 0.1;
    const decayed   = applyTimeDecay(rawPrev, prevMastery?.last_seen_at);
    const masteryScore = bktUpdate(decayed, correct);

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

    const tier = tierFromScore(masteryScore, newInterval, timesSeen);
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + newInterval);

    // ── Detect stage threshold crossings for certificate surfacing ──────────────
    const prevTier = prevMastery?.current_tier ?? null;
    const TIER_RANK = { developing: 1, expected: 2, exceeding: 3 };
    const tierRankPrev = TIER_RANK[prevTier] ?? 0;
    const tierRankNew  = TIER_RANK[tier]     ?? 0;
    // tier_crossed = new tier if we just moved UP a stage for the first time
    const tier_crossed = tierRankNew > tierRankPrev ? tier : null;

    const masteryPayload = {
      scholar_id:     scholarId,
      curriculum,
      subject,
      topic,
      year_level:     yearLevel ?? prevMastery?.year_level ?? null,
      mastery_score:  masteryScore,
      times_seen:     timesSeen,
      times_correct:  timesCorrect,
      ease_factor:    newEase,
      interval_days:  newInterval,
      repetitions:    newReps,
      current_streak: streak,
      current_tier:   tier,
      next_review_at: nextReview.toISOString(),
      last_seen_at:   new Date().toISOString(),
      updated_at:     new Date().toISOString(),
    };

    let updatedMastery;
    if (prevMastery?.id) {
      // Row exists — update it
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
      // No row yet — insert
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
      // Non-fatal: don't fail the request if logging fails
    }

    // ── 4. Check milestones ───────────────────────────────────────────────
    const milestones = checkMilestones(prevMastery, updatedMastery);

    // ── 5. Award story points for milestone achievements ──────────────────
    const bonusStoryPoints = milestones.reduce((sum, m) => sum + (m.storyPoints ?? 0), 0);
    const baseStoryPoints  = calcStoryPoints(correct ? 1 : 0, 1, 0);
    const storyPointsEarned = baseStoryPoints + bonusStoryPoints;

    if (storyPointsEarned > 0) {
      try {
        await supabase.rpc("increment_story_points", {
          p_scholar_id: scholarId,
          p_points:     storyPointsEarned,
        });
      } catch {
        // RPC doesn't exist — silently skip story points
      }
    }

    // ── 6. Mark question as used in question_bank ─────────────────────────
    if (questionId) {
      try {
        await supabase
          .from("question_bank")
          .update({ last_used: new Date().toISOString() })
          .eq("id", questionId);
      } catch {} // non-fatal
    }

    return NextResponse.json({
      mastery:          updatedMastery,
      milestones,
      storyPointsEarned,
      tier_crossed,          // non-null when scholar just crossed a new mastery stage
      new_tier:  tier,
      prev_tier: prevTier,
    });

  } catch (err) {
    console.error("/api/mastery/update error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}