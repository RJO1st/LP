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
 * Authorization: user must have a teacher_assignment for this class OR be a
 * proprietor/admin for the school that owns this class.
 *
 * NOTE: Identity verified via auth.getUser(), then service client used for all
 * data reads to avoid RLS edge-cases in server route handlers.
 */
export async function GET(request, { params }) {
  const { classId } = await params;

  try {
    // ── 1. Verify caller identity ───────────────────────────────────────────
    const cookieStore = await cookies();
    const authSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() {},
        },
      }
    );

    const { data: { user }, error: authErr } = await authSupabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    // ── 2. Service client for all data reads ────────────────────────────────
    const svc = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // ── 3. Authorise: teacher assigned to this class OR school admin ────────
    const [{ data: authCheck }, { data: adminCheck }] = await Promise.all([
      svc.from("teacher_assignments")
         .select("id")
         .eq("class_id", classId)
         .eq("teacher_id", user.id)
         .maybeSingle(),
      svc.from("school_roles")
         .select("role")
         .eq("user_id", user.id)
         .in("role", ["proprietor", "admin"])
         .maybeSingle(),
    ]);

    if (!authCheck && !adminCheck) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ── 4. Core readiness computation ───────────────────────────────────────
    const readiness = await computeClassReadiness(classId, svc);

    // ── 5. Consent status per student ───────────────────────────────────────
    const scholarIds = readiness.students.map(s => s.scholarId);

    const { data: consentRecords } = await svc
      .from("scholar_school_consent")
      .select("scholar_id, consent_given_at, revoked_at")
      .in("scholar_id", scholarIds);

    const consentMap = {};
    for (const r of consentRecords ?? []) {
      if (r.consent_given_at && !r.revoked_at) consentMap[r.scholar_id] = "granted";
      else if (r.revoked_at)                    consentMap[r.scholar_id] = "revoked";
    }

    readiness.students = readiness.students.map(s => ({
      ...s,
      consentStatus: consentMap[s.scholarId] ?? "pending",
    }));

    // ── 6. Parent engagement metrics ────────────────────────────────────────
    let parentEngagement = { totalFamilies: 0, activated: 0, upgraded: 0 };

    if (scholarIds.length) {
      const { data: scholars } = await svc
        .from("scholars")
        .select("id, parent_id, parents(subscription_status, subscription_tier)")
        .in("id", scholarIds);

      if (scholars) {
        const total     = scholars.length;
        const activated = scholars.filter(s => s.parent_id).length;
        const upgraded  = scholars.filter(
          s => s.parents?.subscription_tier === "ng_scholar"
        ).length;
        parentEngagement = {
          totalFamilies: total,
          activated,
          activatedPct:  total > 0 ? Math.round((activated / total) * 100) : 0,
          upgraded,
          upgradedPct:   total > 0 ? Math.round((upgraded  / total) * 100) : 0,
        };
      }
    }

    // ── 7. Upgrade recommendations ──────────────────────────────────────────
    const benefitCount = readiness.students.filter(s => s.overallReadiness < 70).length;
    const upgradeRecommendations = {
      count: benefitCount,
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
    console.error("[class readiness API]", err.message, err.stack);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
