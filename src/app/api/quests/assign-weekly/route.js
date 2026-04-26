import { NextResponse } from "next/server";
import { getServiceRoleClient } from "@/lib/security/serviceRole";
import { authorizedCronRequest } from "@/lib/security/cronAuth";

export const runtime = "nodejs"; // timingSafeEqual requires Node runtime

const supabase = getServiceRoleClient();

const WEEKLY_QUESTS = [
  {
    id:          "complete_25_questions",
    name:        "Weekly Warrior",
    description: "Complete 25 questions this week",
    target:      25,
    xpReward:    200,
    coinReward:  50,
  },
  {
    id:          "master_all_subjects",
    name:        "Subject Explorer",
    description: "Complete questions in 3 different subjects",
    target:      3,
    xpReward:    250,
    coinReward:  60,
  },
];

/** Returns the ISO timestamp for 7 days from now at 23:59:59.999. */
function weekFromNow() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

/** Start of today — lower bound for idempotency preflight. */
function todayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function GET(req) {
  // ── 1. Auth (constant-time) ────────────────────────────────────────────────
  if (!authorizedCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data: scholars } = await supabase.from("scholars").select("id");
    const now      = new Date().toISOString();
    const dayStart = todayStart();

    // ── 2. Bulk expire old weekly quests ────────────────────────────────────
    await supabase
      .from("scholar_quests")
      .update({ status: "expired" })
      .eq("quest_type", "weekly")
      .eq("status", "active")
      .lt("expires_at", now);

    let successCount = 0;
    let skippedCount = 0;
    let errorCount   = 0;
    const expiresAt  = weekFromNow();

    for (const scholar of scholars ?? []) {
      try {
        // ── 3. Idempotency preflight ─────────────────────────────────────────
        // Skip if the scholar already has active weekly quests assigned today.
        // Guards against Vercel cron retries and double-triggers.
        const { count, error: countErr } = await supabase
          .from("scholar_quests")
          .select("id", { count: "exact", head: true })
          .eq("scholar_id", scholar.id)
          .eq("quest_type", "weekly")
          .eq("status", "active")
          .gte("expires_at", dayStart);

        if (countErr) throw countErr;
        if ((count ?? 0) > 0) {
          skippedCount++;
          continue;
        }

        // ── 4. Insert weekly quests ──────────────────────────────────────────
        const questsToInsert = WEEKLY_QUESTS.map(quest => ({
          scholar_id:        scholar.id,
          quest_type:        "weekly",
          quest_id:          quest.id,
          quest_name:        quest.name,
          quest_description: quest.description,
          target_value:      quest.target,
          current_progress:  0,
          xp_reward:         quest.xpReward,
          coin_reward:       quest.coinReward,
          expires_at:        expiresAt,
          status:            "active",
        }));

        const { error: insertErr } = await supabase
          .from("scholar_quests")
          .insert(questsToInsert);

        if (insertErr) throw insertErr;
        successCount++;
      } catch (err) {
        console.error(`[assign-weekly] scholar ${scholar.id}:`, err.message ?? err);
        errorCount++;
      }
    }

    return NextResponse.json({
      success: true,
      totalScholars: scholars?.length ?? 0,
      successCount,
      skippedCount,
      errorCount,
      timestamp: now,
    });
  } catch (error) {
    console.error("[assign-weekly] fatal:", error.message ?? error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
