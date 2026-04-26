import { NextResponse } from "next/server";
import { generatePersonalisedQuests } from "@/lib/personalisedQuests";
import { getServiceRoleClient } from '@/lib/security/serviceRole';

const supabase = getServiceRoleClient();

/**
 * GET /api/quests/assign-personalised
 *
 * Cron-triggered route that generates personalised quests for all scholars.
 * Runs daily alongside assign-daily. Each scholar gets 2-3 narrative-driven
 * quests based on their mastery gaps, interests, and unexplored subjects.
 *
 * Auth: Bearer token via CRON_SECRET env var.
 *
 * Performance notes:
 *  - Expired quests are cleared in a single bulk UPDATE before the loop,
 *    not one UPDATE per scholar (was N+1 → 1 query).
 *  - Per-scholar quest generation (generatePersonalisedQuests) still requires
 *    individual DB reads — unavoidable until mastery is bulk-prefetched.
 *  - Inserts are batched per scholar (2-3 rows each, not serialised).
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

    const now = new Date().toISOString();

    // ── Bulk expire old personalised quests in one query ─────────────────────
    // Previously: one UPDATE per scholar → N round-trips to the DB.
    // Now: single UPDATE scoped to quest_type + status + expiry condition.
    const { error: expireErr } = await supabase
      .from("scholar_quests")
      .update({ status: "expired" })
      .eq("quest_type", "personalised")
      .eq("status", "active")
      .lt("expires_at", now);

    if (expireErr) {
      console.error("[assign-personalised] Bulk expire failed:", expireErr.message);
      // Non-fatal — proceed with generation so scholars aren't blocked
    }

    // ── Per-scholar quest generation ─────────────────────────────────────────
    // generatePersonalisedQuests reads mastery data per scholar — still sequential.
    // TODO: prefetch all mastery rows in one query and pass the slice in.
    let successCount = 0;
    let errorCount   = 0;

    for (const scholar of scholars ?? []) {
      try {
        const quests = await generatePersonalisedQuests(scholar.id, supabase);

        if (quests.length > 0) {
          const { error: insertError } = await supabase
            .from("scholar_quests")
            .insert(quests);

          if (insertError) throw insertError;
        }

        successCount++;
      } catch (err) {
        console.error(`[assign-personalised] scholar ${scholar.id}:`, err.message);
        errorCount++;
      }
    }

    return NextResponse.json({
      success: true,
      totalScholars: scholars?.length ?? 0,
      successCount,
      errorCount,
      timestamp: now,
    });
  } catch (error) {
    console.error("[assign-personalised] fatal:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
