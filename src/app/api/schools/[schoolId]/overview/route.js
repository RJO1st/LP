import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { computeSchoolReadiness } from "@/lib/analyticsEngine";

/**
 * GET /api/schools/[schoolId]/overview
 *
 * Returns school-wide readiness analytics for the proprietor dashboard.
 * Uses computeSchoolReadiness (BKT × stability × recency × exam_weight).
 *
 * Authorization: caller must have school_roles row with role in
 * ('proprietor', 'admin') for the given schoolId.
 */
export async function GET(request, { params }) {
  const { schoolId } = params;

  try {
    const cookieStore = await cookies();

    // Auth client — verify session + role
    const authSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { cookies: { getAll: () => cookieStore.getAll() } }
    );

    const { data: { user }, error: authErr } = await authSupabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    // Verify caller has proprietor or admin role for this school
    const { data: roleCheck } = await authSupabase
      .from("school_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("school_id", schoolId)
      .in("role", ["proprietor", "admin"])
      .maybeSingle();

    if (!roleCheck) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Service client — cross-tenant reads
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Fetch school name
    const { data: school } = await serviceSupabase
      .from("schools")
      .select("id, name, curriculum, school_type")
      .eq("id", schoolId)
      .maybeSingle();

    // Core readiness computation — parallelises across all classes
    const readiness = await computeSchoolReadiness(schoolId, serviceSupabase);

    // ── Parent engagement ────────────────────────────────────────────────────
    // Count families: total scholars → how many have parent accounts → how many upgraded
    const allScholarIds = readiness.classes.flatMap(c =>
      // Gather scholar IDs from the class results (added in computeClassReadiness)
      []  // populated below
    );

    // Direct scholar query for the school
    const { data: schoolScholars } = await serviceSupabase
      .from("scholars")
      .select("id, parent_id, parents(subscription_tier)")
      .eq("school_id", schoolId);

    const totalScholars   = schoolScholars?.length ?? 0;
    const activated       = schoolScholars?.filter(s => s.parent_id).length ?? 0;
    const upgraded        = schoolScholars?.filter(
      s => s.parents?.subscription_tier === "ng_scholar"
    ).length ?? 0;

    const parentEngagement = {
      totalFamilies:  totalScholars,
      activated,
      activatedPct:   totalScholars > 0 ? Math.round((activated / totalScholars) * 100) : 0,
      upgraded,
      upgradedPct:    totalScholars > 0 ? Math.round((upgraded  / totalScholars) * 100) : 0,
      pendingClaims:  totalScholars - activated,
    };

    return NextResponse.json({
      school: {
        id:         school?.id ?? schoolId,
        name:       school?.name ?? "Your School",
        curriculum: school?.curriculum ?? "ng_primary",
        type:       school?.school_type ?? "primary",
      },
      ...readiness,
      totalScholars,
      parentEngagement,
    });

  } catch (err) {
    console.error("[school overview API]", err.message);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
