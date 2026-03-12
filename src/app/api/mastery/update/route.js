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
import { checkMilestones } from "@/lib/learningPathEngine";
import { calcStoryPoints }  from "@/lib/narrativeEngine";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY   // service role — needed for RPC + insert
);

export async function POST(request) {
  try {
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

    // ── 2. Upsert mastery directly (BKT-lite computed here) ─────────────
    const timesSeen    = (prevMastery?.times_seen    ?? 0) + 1;
    const timesCorrect = (prevMastery?.times_correct ?? 0) + (correct ? 1 : 0);
    const streak       = correct ? (prevMastery?.current_streak ?? 0) + 1 : 0;

    // BKT-lite: weighted update toward 1 (correct) or 0 (wrong)
    const prevScore   = prevMastery?.mastery_score ?? 0.1;
    const masteryScore = prevScore + 0.3 * ((correct ? 1 : 0) - prevScore);

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

    const tier = masteryScore >= 0.85 ? "exceeding"
               : masteryScore >= 0.65 ? "expected"
               : "developing";
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

    await supabase.from("session_answers").insert(answerRow);
    // Non-fatal: don't fail the request if logging fails

    // ── 4. Check milestones ───────────────────────────────────────────────
    const milestones = checkMilestones(prevMastery, updatedMastery);

    // ── 5. Award story points for milestone achievements ──────────────────
    const bonusStoryPoints = milestones.reduce((sum, m) => sum + (m.storyPoints ?? 0), 0);
    const baseStoryPoints  = calcStoryPoints(correct ? 1 : 0, 1, 0);
    const storyPointsEarned = baseStoryPoints + bonusStoryPoints;

    if (storyPointsEarned > 0) {
      await supabase.rpc("increment_story_points", {
        p_scholar_id: scholarId,
        p_points:     storyPointsEarned,
      }).catch(() => {
        // Increment via update if RPC doesn't exist yet
        supabase
          .from("narrative_state")
          .upsert({ scholar_id: scholarId, story_points: storyPointsEarned }, { onConflict: "scholar_id" })
          .then(({ data: existing }) => {
            if (existing) {
              supabase
                .from("narrative_state")
                .update({ story_points: (existing.story_points ?? 0) + storyPointsEarned })
                .eq("scholar_id", scholarId);
            }
          });
      });
    }

    // ── 6. Mark question as used in question_bank ─────────────────────────
    if (questionId) {
      await supabase
        .from("question_bank")
        .update({ last_used: new Date().toISOString() })
        .eq("id", questionId)
        .catch(() => {}); // non-fatal
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