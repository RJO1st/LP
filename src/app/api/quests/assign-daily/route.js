import { NextResponse } from "next/server";
import { getServiceRoleClient } from "@/lib/security/serviceRole";
import { authorizedCronRequest } from "@/lib/security/cronAuth";

export const runtime = "nodejs"; // timingSafeEqual requires Node runtime

const DAILY_QUESTS = [
  {
    id:          "complete_5_questions",
    name:        "Daily Practice",
    description: "Complete 5 questions in any subject",
    target:      5,
    xpReward:    50,
    coinReward:  10,
  },
  {
    id:          "achieve_80_accuracy",
    name:        "Sharp Shooter",
    description: "Achieve 80% accuracy or higher",
    target:      80,
    xpReward:    75,
    coinReward:  15,
  },
  {
    id:          "complete_3_maths",
    name:        "Numbers Day",
    description: "Complete 3 maths questions",
    target:      3,
    xpReward:    40,
    coinReward:  8,
  },
];

function shuffle(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

/**
 * Returns midnight tonight in ISO format — used as the idempotency window.
 * Two calls on the same calendar day resolve to the same boundary, so the
 * preflight count check correctly deduplicates Vercel retry attempts.
 */
function todayMidnight() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

/**
 * Returns the start of today (00:00:00.000) in ISO format.
 * Used as the lower bound for the idempotency preflight query.
 */
function todayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function GET(req) {
  // ── 1. Auth ────────────────────────────────────────────────────────────────
  if (!authorizedCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceRoleClient();

  try {
    // ── 2. Fetch all scholars ────────────────────────────────────────────────
    const { data: scholars, error: scholarsError } = await supabase
      .from("scholars")
      .select("id");

    if (scholarsError) throw scholarsError;

    let successCount  = 0;
    let skippedCount  = 0;  // already had quests (idempotency)
    let errorCount    = 0;
    const expiresAt   = todayMidnight();
    const dayStart    = todayStart();

    // ── 3. Bulk expire old daily quests ─────────────────────────────────────
    // Run before the per-scholar loop so the preflight counts below are clean.
    await supabase
      .from("scholar_quests")
      .update({ status: "expired" })
      .eq("quest_type", "daily")
      .eq("status", "active")
      .lt("expires_at", dayStart);  // anything expiring before today

    for (const scholar of scholars ?? []) {
      try {
        // ── 4. Idempotency preflight ─────────────────────────────────────────
        // If this scholar already has ≥1 active daily quest expiring today,
        // a previous run (or Vercel retry) already handled them — skip.
        const { count, error: countErr } = await supabase
          .from("scholar_quests")
          .select("id", { count: "exact", head: true })
          .eq("scholar_id", scholar.id)
          .eq("quest_type", "daily")
          .eq("status", "active")
          .gte("expires_at", dayStart)
          .lte("expires_at", expiresAt);

        if (countErr) throw countErr;
        if ((count ?? 0) > 0) {
          skippedCount++;
          continue;
        }

        // ── 5. Insert three quests ───────────────────────────────────────────
        const selectedQuests = shuffle(DAILY_QUESTS).slice(0, 3);

        const questsToInsert = selectedQuests.map(quest => ({
          scholar_id:       scholar.id,
          quest_type:       "daily",
          quest_id:         quest.id,
          quest_name:       quest.name,
          quest_description: quest.description,
          target_value:     quest.target,
          current_progress: 0,
          xp_reward:        quest.xpReward,
          coin_reward:      quest.coinReward,
          expires_at:       expiresAt,
          status:           "active",
        }));

        const { error: insertError } = await supabase
          .from("scholar_quests")
          .insert(questsToInsert);

        if (insertError) throw insertError;
        successCount++;
      } catch (err) {
        console.error(`[assign-daily] scholar ${scholar.id}:`, err.message ?? err);
        errorCount++;
      }
    }

    return NextResponse.json({
      success: true,
      totalScholars: scholars?.length ?? 0,
      successCount,
      skippedCount,
      errorCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[assign-daily] fatal:", error.message ?? error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
