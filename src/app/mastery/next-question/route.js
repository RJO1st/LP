/**
 * src/app/api/mastery/next-question/route.js
 * ─────────────────────────────────────────────────────────────────────────────
 * GET /api/mastery/next-question
 *
 * Returns the optimal next question for a scholar based on:
 *   1. Spaced repetition — topics overdue for review (highest priority)
 *   2. Learning path    — current topic in scholar's personalised path
 *   3. Weakest topic    — lowest mastery score in the subject
 *
 * Query params:
 *   scholarId   : string
 *   curriculum  : string
 *   subject     : string
 *   topic       : string (optional — override; useful for focused practice)
 *   excludeIds  : comma-separated question UUIDs to exclude (already seen)
 *
 * Returns: { question, masteryContext, selectionReason }
 */

import { createClient } from "@supabase/supabase-js";
import { NextResponse }  from "next/server";
import { supabaseKeys } from '@/lib/env'
import { getServiceRoleClient } from '@/lib/security/serviceRole'

const supabase = getServiceRoleClient();

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const scholarId  = searchParams.get("scholarId");
    const curriculum = searchParams.get("curriculum");
    const subject    = searchParams.get("subject");
    const topicParam = searchParams.get("topic") ?? null;
    const excludeRaw = searchParams.get("excludeIds") ?? "";
    const excludeIds = excludeRaw ? excludeRaw.split(",").filter(Boolean) : [];

    if (!scholarId || !curriculum || !subject) {
      return NextResponse.json({ error: "Missing scholarId, curriculum, or subject" }, { status: 400 });
    }

    // ── 1. Get scholar's mastery state for this subject ───────────────────
    const { data: masteryRows } = await supabase
      .from("scholar_topic_mastery")
      .select("*")
      .eq("scholar_id", scholarId)
      .eq("curriculum", curriculum)
      .eq("subject", subject)
      .order("next_review_at", { ascending: true });

    const masteryMap = {};
    for (const r of (masteryRows ?? [])) {
      masteryMap[r.topic] = r;
    }

    // ── 2. Determine selection reason + topic ─────────────────────────────
    let selectedTopic  = topicParam;
    let selectionReason = "specified";

    if (!selectedTopic) {
      const now = new Date();

      // Priority 1: SR overdue
      const overdueRow = (masteryRows ?? []).find(
        r => r.next_review_at && new Date(r.next_review_at) <= now
      );
      if (overdueRow) {
        selectedTopic   = overdueRow.topic;
        selectionReason = "spaced_repetition_review";
      }
    }

    if (!selectedTopic) {
      // Priority 2: Current learning path topic
      const { data: pathRow } = await supabase
        .from("scholar_learning_path")
        .select("current_topic")
        .eq("scholar_id", scholarId)
        .eq("curriculum", curriculum)
        .eq("subject", subject)
        .single();

      if (pathRow?.current_topic) {
        selectedTopic   = pathRow.current_topic;
        selectionReason = "learning_path_current";
      }
    }

    if (!selectedTopic) {
      // Priority 3: Weakest topic (lowest mastery score)
      const weakest = (masteryRows ?? []).sort((a, b) => a.mastery_score - b.mastery_score)[0];
      if (weakest) {
        selectedTopic   = weakest.topic;
        selectionReason = "weakest_topic";
      }
    }

    if (!selectedTopic) {
      // Fallback: any question in this subject
      selectionReason = "fallback_any";
    }

    // ── 3. Get current difficulty tier for selected topic ─────────────────
    const topicMastery = selectedTopic ? masteryMap[selectedTopic] : null;
    const tier = topicMastery?.current_tier ?? "developing";

    // ── 4. Fetch question via Supabase RPC ────────────────────────────────
    const { data: rpcRows, error: rpcError } = await supabase.rpc(
      "get_next_question_for_scholar",
      {
        p_scholar_id:  scholarId,
        p_curriculum:  curriculum,
        p_subject:     subject,
        p_topic:       selectedTopic,
        p_exclude_ids: excludeIds.length > 0 ? excludeIds : [],
      }
    );

    if (rpcError) {
      console.error("get_next_question_for_scholar error:", rpcError);
      return NextResponse.json({ error: rpcError.message }, { status: 500 });
    }

    const question = Array.isArray(rpcRows) ? rpcRows[0] : rpcRows;

    if (!question) {
      // No question found — return null so caller falls back to procedural generation
      return NextResponse.json({
        question:        null,
        masteryContext:  topicMastery ?? null,
        selectionReason: "no_questions_available",
      });
    }

    // ── 5. Build mastery context (for NarrativeIntro + feedback UI) ───────
    const masteryContext = {
      topic:         selectedTopic,
      masteryScore:  topicMastery?.mastery_score ?? 0,
      tier,
      timesSeenTotal: topicMastery?.times_seen ?? 0,
      currentStreak:  topicMastery?.current_streak ?? 0,
      isDueReview:    selectionReason === "spaced_repetition_review",
      nextReviewAt:   topicMastery?.next_review_at ?? null,
    };

    return NextResponse.json({ question, masteryContext, selectionReason });

  } catch (err) {
    console.error("/api/mastery/next-question error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
