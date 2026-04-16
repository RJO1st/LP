import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { computeClassReadiness } from "@/lib/analyticsEngine";

/**
 * GET /api/class/[classId]/readiness
 *
 * Returns full class readiness analytics powered by the enhanced BKT × stability
 * × recency × exam_weight formula.
 *
 * Authorization: user must have a teacher_assignment or school_roles row for the
 * school that owns this class.
 *
 * Additional fields returned:
 *   upgradeRecommendations — count of students on free tier who would benefit
 *                            from the Scholar plan (readiness < 70 on free tier).
 *   parentEngagement       — % of enrolled families with active free accounts
 *                            and % who have upgraded to paid.
 */
export async function GET(request, { params }) {
  const { classId } = params;

  try {
    const cookieStore = await cookies();

    // Auth client — for verifying the caller's session
    const authSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { cookies: { getAll: () => cookieStore.getAll() } }
    );

    const { data: { user }, error: authErr } = await authSupabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    // Verify caller is a teacher for this class OR a school admin/proprietor
    const { data: authCheck } = await authSupabase
      .from("teacher_assignments")
      .select("id")
      .eq("class_id", classId)
      .eq("teacher_id", user.id)
      .maybeSingle();

    const { data: adminCheck } = await authSupabase
      .from("school_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["proprietor", "admin"])
      .maybeSingle();

    if (!authCheck && !adminCheck) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Service client — for reading cross-tenant mastery data
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Core readiness computation (uses enhanced formula with exam weights)
    const readiness = await computeClassReadiness(classId, serviceSupabase);

    // ── Consent status per student ─────────────────────────────────────────────
    // Query scholar_school_consent table to determine if parent has consented
    const scholarIds = readiness.students.map(s => s.scholarId);
    const { data: consentRecords } = await serviceSupabase
      .from("scholar_school_consent")
      .select("scholar_id, consent_given_at, revoked_at")
      .in("scholar_id", scholarIds);

    const consentStatusMap = {};
    if (consentRecords) {
      for (const record of consentRecords) {
        // Consent is "granted" if given AND not revoked
        if (record.consent_given_at && !record.revoked_at) {
          consentStatusMap[record.scholar_id] = "granted";
        }
        // Consent is "revoked" if revoked_at is set
        else if (record.revoked_at) {
          consentStatusMap[record.scholar_id] = "revoked";
        }
      }
    }

    // Add consentStatus to each student (default "pending" if no record exists)
    readiness.students = readiness.students.map(s => ({
      ...s,
      consentStatus: consentStatusMap[s.scholarId] || "pending",
    }));

    // ── Parent engagement metrics ─────────────────────────────────────────────
    // How many enrolled families have activated accounts vs upgraded to paid?
    let parentEngagement = { totalFamilies: 0, activated: 0, upgraded: 0 };

    if (scholarIds.length) {
      const { data: parents } = await serviceSupabase
        .from("scholars")
        .select("id, parent_id, parents(subscription_status, subscription_tier)")
        .in("id", scholarIds);

      if (parents) {
        const total     = parents.length;
        const activated = parents.filter(s => s.parent_id).length;
        const upgraded  = parents.filter(
          s => s.parents?.subscription_tier === "ng_scholar"
        ).length;
        parentEngagement = {
          totalFamilies:   total,
          activated,
          activatedPct:    total > 0 ? Math.round((activated / total) * 100) : 0,
          upgraded,
          upgradedPct:     total > 0 ? Math.round((upgraded / total) * 100) : 0,
        };
      }
    }

    // ── Upgrade recommendations ────────────────────────────────────────────────
    // Students on free tier with readiness < 70 would clearly benefit from Scholar.
    // We return a count (not names) to preserve privacy for free-tier families.
    const benefitCount = readiness.students.filter(
      s => s.overallReadiness < 70
    ).length;
    const upgradeRecommendations = {
      count:   benefitCount,
      message: benefitCount > 0
        ? `${benefitCount} student${benefitCount > 1 ? "s" : ""} in this class would benefit from the Scholar plan — they need extra practice before the entrance exam.`
        : "All students are on track! Encourage continued daily practice to maintain readiness.",
    };

    return NextResponse.json({
      ...readiness,
      parentEngagement,
      upgradeRecommendations,
    });

  } catch (err) {
    console.error("[class readiness API]", err.message);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
