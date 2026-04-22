/**
 * src/app/api/learning-path/route.js
 * ─────────────────────────────────────────────────────────────────────────────
 * GET  /api/learning-path  — fetch or generate a scholar's learning path
 * POST /api/learning-path  — save diagnostic result + generate path
 *
 * GET params:  scholarId, curriculum, subject
 * POST body:   { scholarId, curriculum, subject, yearLevel, diagnosticResult }
 *   where diagnosticResult = { topicScores, recommendedStart, estimatedLevel }
 */

import { NextResponse } from "next/server";
import { getServiceRoleClient } from "@/lib/security/serviceRole";
import {
  generateLearningPath,
  generateCurriculumAwarePath,
  advanceLearningPath,
} from "@/lib/learningPathEngine";

const supabase = getServiceRoleClient();

// ── GET — fetch existing path (or generate one if missing) ────────────────────
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const scholarId  = searchParams.get("scholarId");
    const curriculum = searchParams.get("curriculum");
    const subject    = searchParams.get("subject");

    if (!scholarId || !curriculum || !subject) {
      return NextResponse.json({ error: "Missing required params" }, { status: 400 });
    }

    // Fetch existing path
    const { data: path } = await supabase
      .from("scholar_learning_path")
      .select("*")
      .eq("scholar_id", scholarId)
      .eq("curriculum", curriculum)
      .eq("subject", subject)
      .single();

    if (path) {
      // Advance the path based on current mastery (refresh completion %)
      const { data: masteryRows } = await supabase
        .from("scholar_topic_mastery")
        .select("*")
        .eq("scholar_id", scholarId)
        .eq("curriculum", curriculum)
        .eq("subject", subject);

      if (masteryRows?.length) {
        const advanced = advanceLearningPath(path, masteryRows);
        // Update silently in background
        supabase
          .from("scholar_learning_path")
          .update(advanced)
          .eq("id", path.id)
          .then(() => {});

        return NextResponse.json({ path: { ...path, ...advanced } });
      }

      return NextResponse.json({ path });
    }

    // No path yet — return null so client triggers diagnostic
    return NextResponse.json({ path: null, needsDiagnostic: true });

  } catch (err) {
    console.error("/api/learning-path GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── POST — save diagnostic + generate path ────────────────────────────────────
export async function POST(request) {
  try {
    const { scholarId, curriculum, subject, yearLevel, diagnosticResult } = await request.json();

    if (!scholarId || !curriculum || !subject) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Fetch existing mastery for this scholar × subject
    const { data: masteryRows } = await supabase
      .from("scholar_topic_mastery")
      .select("*")
      .eq("scholar_id", scholarId)
      .eq("curriculum", curriculum)
      .eq("subject", subject);

    // Generate curriculum-aware personalised topic path
    // This fetches DB-driven topic sequences + curriculum standards + gap priority
    const { path: topicOrder, curriculumInfo } = await generateCurriculumAwarePath({
      curriculum,
      subject,
      yearLevel: yearLevel ?? 6,
      diagnosticScores: diagnosticResult?.topicScores ?? {},
      masteryRecords: masteryRows ?? [],
      supabase,
      scholarId,
    });

    const currentTopic = topicOrder[0]?.topic ?? null;

    const pathRow = {
      scholar_id:       scholarId,
      curriculum,
      subject,
      topic_order:      topicOrder,
      current_topic:    currentTopic,
      current_index:    0,
      completion_pct:   0,
      next_milestone:   currentTopic
        ? `Build mastery in ${currentTopic.replace(/_/g, " ")}`
        : "Explore topics",
      diagnostic_done:  !!diagnosticResult,
      diagnostic_scores: diagnosticResult?.topicScores ?? null,
      generated_at:     new Date().toISOString(),
      updated_at:       new Date().toISOString(),
    };

    // Upsert the path (generateCurriculumAwarePath may have already saved,
    // but this ensures diagnostic_scores are included)
    const { data: saved, error } = await supabase
      .from("scholar_learning_path")
      .upsert(pathRow, { onConflict: "scholar_id,curriculum,subject" })
      .select()
      .single();

    if (error) {
      console.error("scholar_learning_path upsert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Save diagnostic results if provided
    if (diagnosticResult) {
      await supabase
        .from("diagnostic_results")
        .upsert({
          scholar_id:          scholarId,
          curriculum,
          subject,
          topic_scores:        diagnosticResult.topicScores ?? {},
          questions_asked:     diagnosticResult.totalAnswered ?? 0,
          recommended_start:   diagnosticResult.recommendedStart ?? null,
          estimated_level:     diagnosticResult.estimatedLevel ?? "at_year",
          completed_at:        new Date().toISOString(),
        }, { onConflict: "scholar_id,curriculum,subject" });
    }

    // Seed initial mastery rows for topics with diagnostic scores
    if (diagnosticResult?.topicScores) {
      const initialMastery = Object.entries(diagnosticResult.topicScores).map(([topic, score]) => ({
        scholar_id:     scholarId,
        curriculum,
        subject,
        topic,
        year_level:     yearLevel ?? 6,
        mastery_score:  score * 0.7,          // conservative: diagnostic score × 0.7
        times_seen:     2,
        times_correct:  Math.round(score * 2),
      }));

      if (initialMastery.length > 0) {
        await supabase
          .from("scholar_topic_mastery")
          .upsert(initialMastery, { onConflict: "scholar_id,curriculum,subject,topic" });
      }
    }

    return NextResponse.json({ path: saved, topicCount: topicOrder.length, curriculumInfo });

  } catch (err) {
    console.error("/api/learning-path POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
