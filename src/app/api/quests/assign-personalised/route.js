import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { generatePersonalisedQuests } from "@/lib/personalisedQuests";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * GET /api/quests/assign-personalised
 *
 * Cron-triggered route that generates personalised quests for all scholars.
 * Runs daily alongside assign-daily. Each scholar gets 2-3 narrative-driven
 * quests based on their mastery gaps, interests, and unexplored subjects.
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
        // Expire any old personalised quests
        await supabase
          .from("scholar_quests")
          .update({ status: "expired" })
          .eq("scholar_id", scholar.id)
          .eq("quest_type", "personalised")
          .eq("status", "active")
          .lt("expires_at", new Date().toISOString());

        // Generate new personalised quests from mastery data
        const quests = await generatePersonalisedQuests(scholar.id, supabase);

        if (quests.length > 0) {
          const { error: insertError } = await supabase
            .from("scholar_quests")
            .insert(quests);

          if (insertError) throw insertError;
        }

        successCount++;
      } catch (err) {
        console.error(`Error assigning personalised quests to scholar ${scholar.id}:`, err);
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
    console.error("Error in assign-personalised:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
