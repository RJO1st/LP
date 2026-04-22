import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getServiceRoleClient } from "@/lib/security/serviceRole";
import { supabaseKeys } from "@/lib/env";
import { computeSchoolReadiness } from "@/lib/analyticsEngine";

/**
 * GET /api/schools/[schoolId]/overview
 *
 * Returns school-wide readiness analytics for the proprietor dashboard.
 * Uses computeSchoolReadiness (BKT × stability × recency × exam_weight).
 *
 * Authorization: caller must have school_roles row with role in
 * ('proprietor', 'admin') for the given schoolId.
 *
 * NOTE: We verify the user's identity with auth.getUser(), then use the
 * service client for all data reads. This avoids RLS edge cases in server
 * route handlers where the anon-key client may not forward the JWT context
 * correctly to PostgREST.
 */
export async function GET(request, { params }) {
  const { schoolId } = await params;

  try {
    // ── 1. Verify caller identity via session cookie ────────────────────────
    const cookieStore = await cookies();
    const authSupabase = createServerClient(
      supabaseKeys.url(),
      supabaseKeys.publishable(),
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            // Route handlers can't set cookies, but the call must exist
          },
        },
      }
    );

    const { data: { user }, error: authErr } = await authSupabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    // ── 2. Service client — bypasses RLS for all subsequent reads ───────────
    const svc = getServiceRoleClient();

    // ── 3. Authorise: caller must be proprietor/admin of this school ────────
    const { data: roleCheck } = await svc
      .from("school_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("school_id", schoolId)
      .in("role", ["proprietor", "admin"])
      .maybeSingle();

    if (!roleCheck) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ── 4. School metadata ──────────────────────────────────────────────────
    const { data: school } = await svc
      .from("schools")
      .select("id, name, curriculum, school_type, region, is_partner")
      .eq("id", schoolId)
      .maybeSingle();

    // ── 5. Core readiness computation ───────────────────────────────────────
    const readiness = await computeSchoolReadiness(schoolId, svc);

    // ── 6. Scholar + parent engagement ─────────────────────────────────────
    const { data: schoolScholars } = await svc
      .from("scholars")
      .select("id, parent_id, parents(subscription_tier)")
      .eq("school_id", schoolId);

    const totalScholars = schoolScholars?.length ?? 0;
    const activated     = schoolScholars?.filter(s => s.parent_id).length ?? 0;
    const upgraded      = schoolScholars?.filter(
      s => s.parents?.subscription_tier === "ng_scholar"
    ).length ?? 0;

    const parentEngagement = {
      totalFamilies: totalScholars,
      activated,
      activatedPct:  totalScholars > 0 ? Math.round((activated / totalScholars) * 100) : 0,
      upgraded,
      upgradedPct:   totalScholars > 0 ? Math.round((upgraded  / totalScholars) * 100) : 0,
      pendingClaims: totalScholars - activated,
    };

    // ── 7. Claim funnel (scholar_invitations is service-role only) ──────────
    // Get all scholar IDs for this school first
    const scholarIds = schoolScholars?.map(s => s.id) ?? [];

    let claimFunnel = { invited: 0, claimed: 0, subscribed: 0 };
    if (scholarIds.length > 0) {
      const [invitedRes, claimedRes] = await Promise.all([
        svc.from("scholar_invitations")
           .select("id", { count: "exact", head: true })
           .in("scholar_id", scholarIds),
        svc.from("scholar_invitations")
           .select("id", { count: "exact", head: true })
           .in("scholar_id", scholarIds)
           .eq("status", "claimed"),
      ]);
      claimFunnel = {
        invited:    invitedRes.count ?? 0,
        claimed:    claimedRes.count ?? 0,
        subscribed: upgraded, // families who upgraded = "subscribed" in funnel
      };
    }

    return NextResponse.json({
      school: {
        id:         school?.id ?? schoolId,
        name:       school?.name ?? "Your School",
        curriculum: school?.curriculum ?? "ng_primary",
        type:       school?.school_type ?? "primary",
        region:     school?.region ?? "NG",
        isPartner:  school?.is_partner ?? false,
      },
      ...readiness,
      totalScholars,
      parentEngagement,
      claimFunnel,
    });

  } catch (err) {
    console.error("[school overview API]", err.message, err.stack);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
