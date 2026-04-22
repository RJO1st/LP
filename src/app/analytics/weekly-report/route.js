/**
 * src/app/api/analytics/weekly-report/route.js
 * ─────────────────────────────────────────────────────────────────────────────
 * GET /api/analytics/weekly-report?scholarId=...&parentId=...
 *
 * Compiles all data for the weekly mission debrief.
 * Used by both the parent dashboard UI and the weekly email cron job.
 *
 * Returns: WeeklyReportData object (see analyticsEngine.compileWeeklyReportData)
 */

import { createClient }        from "@supabase/supabase-js";
import { NextResponse }         from "next/server";
import { compileWeeklyReportData } from "@/lib/analyticsEngine";
import { supabaseKeys } from '@/lib/env'
import { getServiceRoleClient } from '@/lib/security/serviceRole'

const supabase = getServiceRoleClient();

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const scholarId = searchParams.get("scholarId");
    const parentId  = searchParams.get("parentId");

    if (!scholarId) {
      return NextResponse.json({ error: "Missing scholarId" }, { status: 400 });
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [scholarRes, parentRes, answersRes, masteryRes, pathRes] = await Promise.all([
      supabase.from("scholars").select("*").eq("id", scholarId).single(),
      parentId
        ? supabase.from("parents").select("*").eq("id", parentId).single()
        : Promise.resolve({ data: null }),
      supabase.from("session_answers").select("*")
        .eq("scholar_id", scholarId)
        .gte("answered_at", sevenDaysAgo),
      supabase.from("scholar_topic_mastery").select("*").eq("scholar_id", scholarId),
      supabase.from("scholar_learning_path").select("*").eq("scholar_id", scholarId).limit(1),
    ]);

    if (!scholarRes.data) {
      return NextResponse.json({ error: "Scholar not found" }, { status: 404 });
    }

    const reportData = compileWeeklyReportData(
      scholarRes.data,
      parentRes.data,
      answersRes.data ?? [],
      masteryRes.data ?? [],
      pathRes.data?.[0] ?? null
    );

    return NextResponse.json(reportData);

  } catch (err) {
    console.error("/api/analytics/weekly-report error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/analytics/weekly-report
 * Trigger weekly report emails for all active scholars.
 * Called by a Supabase Edge Function cron (weekly).
 *
 * Body: { secret: string } — must match CRON_SECRET env var
 */
export async function POST(request) {
  try {
    const { secret } = await request.json();
    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    // Get all scholars with an active parent subscription
    const { data: scholars } = await supabase
      .from("scholars")
      .select("id, parent_id, name, curriculum, year_level")
      .not("parent_id", "is", null);

    if (!scholars?.length) {
      return NextResponse.json({ sent: 0, message: "No scholars found" });
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    let sent = 0;
    const errors = [];

    for (const scholar of scholars) {
      try {
        const [parentRes, answersRes, masteryRes, pathRes] = await Promise.all([
          supabase.from("parents").select("*").eq("id", scholar.parent_id).single(),
          supabase.from("session_answers").select("*")
            .eq("scholar_id", scholar.id)
            .gte("answered_at", sevenDaysAgo),
          supabase.from("scholar_topic_mastery").select("*").eq("scholar_id", scholar.id),
          supabase.from("scholar_learning_path").select("*").eq("scholar_id", scholar.id).limit(1),
        ]);

        if (!parentRes.data?.email) continue;

        const reportData = compileWeeklyReportData(
          scholar,
          parentRes.data,
          answersRes.data ?? [],
          masteryRes.data ?? [],
          pathRes.data?.[0] ?? null
        );

        // Send via Brevo (existing email infrastructure)
        const emailRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type:       "weekly_report",
            to:         parentRes.data.email,
            toName:     parentRes.data.full_name ?? reportData.parentName,
            reportData,
          }),
        });

        if (emailRes.ok) sent++;
        else errors.push({ scholarId: scholar.id, status: emailRes.status });

      } catch (scholarErr) {
        errors.push({ scholarId: scholar.id, error: scholarErr.message });
      }
    }

    return NextResponse.json({
      sent,
      total: scholars.length,
      errors: errors.length,
      errorDetails: errors.slice(0, 5),
    });

  } catch (err) {
    console.error("/api/analytics/weekly-report POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
