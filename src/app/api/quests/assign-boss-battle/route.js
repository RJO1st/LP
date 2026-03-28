import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { assignBossBattle } from "@/lib/bossBattleEngine";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * GET /api/quests/assign-boss-battle
 *
 * Weekly cron route that assigns a boss battle to each scholar.
 * The boss is selected based on the scholar's weakest subject,
 * making each encounter a targeted learning challenge.
 *
 * Auth: Bearer token via CRON_SECRET env var.
 */
export async function GET(req) {
  try {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: scholars, error: scholarsError } = await supabase
      .from("scholars")
      .select("id");

    if (scholarsError) throw scholarsError;

    let successCount = 0;
    let errorCount = 0;

    for (const scholar of scholars || []) {
      try {
        // Expire any old boss battles
        await supabase
          .from("scholar_quests")
          .update({ status: "expired" })
          .eq("scholar_id", scholar.id)
          .eq("quest_type", "boss_battle")
          .eq("status", "active")
          .lt("expires_at", new Date().toISOString());

        // Check if scholar already has an active boss battle this week
        const { data: existing } = await supabase
          .from("scholar_quests")
          .select("id")
          .eq("scholar_id", scholar.id)
          .eq("quest_type", "boss_battle")
          .eq("status", "active")
          .gte("expires_at", new Date().toISOString())
          .limit(1);

        if (existing?.length > 0) {
          successCount++;
          continue; // Already has an active boss battle
        }

        // Assign new boss battle based on weakest subject
        await assignBossBattle(scholar.id, supabase);
        successCount++;
      } catch (err) {
        console.error(`Error assigning boss battle to scholar ${scholar.id}:`, err);
        errorCount++;
      }
    }

    return NextResponse.json({
      success: true,
      totalScholars: scholars?.length || 0,
      successCount,
      errorCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in assign-boss-battle:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
