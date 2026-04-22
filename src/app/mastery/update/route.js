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
import { supabaseKeys } from '@/lib/env'
import { getServiceRoleClient } from '@/lib/security/serviceRole'

const supabase = createClient(
  supabaseKeys.url(),
  supabaseKeys.secret() // Use from env helpers
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

    // ── 2. Upsert mastery via RPC (BKT + SM-2 computed in Postgres) ───────
    const { data: masteryRows, error: rpcError } = await supabase
      .rpc("upsert_mastery_after_answer", {
        p_scholar_id:    scholarId,
        p_curriculum:    curriculum,
        p_subject:       subject,
        p_topic:         topic,
        p_year_level:    yearLevel,
        p_correct:       correct,
        p_time_taken_ms: timeTakenMs ?? null,
      });

    if (rpcError) {
      console.error("upsert_mastery_after_answer error:", rpcError);
      return NextResponse.json({ error: rpcError.message }, { status: 500 });
    }

    const updatedMastery = Array.isArray(masteryRows) ? masteryRows[0] : masteryRows;

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
        .update({
          last_used:    new Date().toISOString(),
          times_used:   supabase.rpc("increment", { row_id: questionId, col: "times_used" }),
          times_correct: correct
            ? supabase.rpc("increment", { row_id: questionId, col: "times_correct" })
            : undefined,
        })
        .eq("id", questionId)
        .catch(() => {}); // non-fatal
    }

    return NextResponse.json({
      mastery:         updatedMastery,
      milestones,
      storyPointsEarned,
    });

  } catch (err) {
    console.error("/api/mastery/update error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
