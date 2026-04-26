import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getServiceRoleClient } from "@/lib/security/serviceRole";
import { supabaseKeys } from "@/lib/env";

/**
 * GET /api/schools/[schoolId]/parent-engagement
 *
 * Returns parent claim progress for a school — which scholars have been claimed
 * by a parent and which are still awaiting activation. Includes per-class
 * breakdowns and the unclaimed list (with validation codes) so a proprietor can
 * share codes manually or plan resend campaigns.
 *
 * Authorization: caller must be proprietor or admin for this school.
 *
 * @returns {{
 *   summary:  { total, claimed, unclaimed, claimRate },
 *   byClass:  [{ class_id, class_name, year_level, total, claimed, unclaimed, claimRate }],
 *   unclaimed:[{ id, name, class_name, year_level,
 *                validation_code, invitation_email,
 *                invitation_status, invitation_expires_at }],
 * }}
 */
export async function GET(_request, { params }) {
  const { schoolId } = await params;

  try {
    // ── 1. Verify caller identity ────────────────────────────────────────────
    const cookieStore = await cookies();
    const authSupabase = createServerClient(
      supabaseKeys.url(),
      supabaseKeys.publishable(),
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

    // ── 2. Service client for all data reads ─────────────────────────────────
    const svc = getServiceRoleClient();

    // ── 3. Authorise: proprietor or admin for this school ───────────────────
    const { data: roleRow } = await svc
      .from("school_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("school_id", schoolId)
      .in("role", ["proprietor", "admin"])
      .maybeSingle();

    if (!roleRow) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ── 4. Load all scholars for this school with their class enrolment ──────
    // Supabase left-joins: scholars → enrolments (latest) → classes
    const { data: scholars, error: scholarsErr } = await svc
      .from("scholars")
      .select(`
        id,
        name,
        parent_id,
        enrolments (
          academic_year,
          classes ( id, name, year_level )
        )
      `)
      .eq("school_id", schoolId)
      .order("name");

    if (scholarsErr) {
      console.error("[parent-engagement] scholars query failed:", scholarsErr.message);
      return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }

    if (!scholars || scholars.length === 0) {
      return NextResponse.json({
        summary: { total: 0, claimed: 0, unclaimed: 0, claimRate: 0 },
        byClass: [],
        unclaimed: [],
      });
    }

    // ── 5. Load latest invitation per scholar ────────────────────────────────
    const scholarIds = scholars.map(s => s.id);

    const { data: invitations } = await svc
      .from("scholar_invitations")
      .select("scholar_id, validation_code, parent_email, status, expires_at")
      .in("scholar_id", scholarIds)
      .order("created_at", { ascending: false });

    // Build map: scholar_id → latest invitation (already desc-ordered)
    const invByScholar = {};
    for (const inv of invitations ?? []) {
      if (!invByScholar[inv.scholar_id]) {
        invByScholar[inv.scholar_id] = inv;
      }
    }

    // ── 6. Process each scholar — resolve best class + claim status ──────────
    const processed = scholars.map(s => {
      // Pick enrolment with highest academic_year string (e.g. "2025-2026" > "2024-2025")
      const enrolments = Array.isArray(s.enrolments) ? s.enrolments : [];
      const bestEnrolment = enrolments
        .filter(e => e.classes)
        .sort((a, b) => (b.academic_year ?? "").localeCompare(a.academic_year ?? ""))[0] ?? null;

      const cls = bestEnrolment?.classes ?? null;
      const inv = invByScholar[s.id] ?? null;

      return {
        id:                      s.id,
        name:                    s.name,
        claimed:                 !!s.parent_id,
        class_id:                cls?.id ?? null,
        class_name:              cls?.name ?? "Unassigned",
        year_level:              cls?.year_level ?? null,
        validation_code:         inv?.validation_code ?? null,
        invitation_email:        inv?.parent_email ?? null,
        invitation_status:       inv?.status ?? null,
        invitation_expires_at:   inv?.expires_at ?? null,
      };
    });

    // ── 7. Summary ───────────────────────────────────────────────────────────
    const total    = processed.length;
    const claimed  = processed.filter(s => s.claimed).length;
    const unclaimed = total - claimed;

    const summary = {
      total,
      claimed,
      unclaimed,
      claimRate: total > 0 ? Math.round((claimed / total) * 100) : 0,
    };

    // ── 8. Per-class breakdown ────────────────────────────────────────────────
    const classMap = {};
    for (const s of processed) {
      const key = s.class_id ?? "__unassigned__";
      if (!classMap[key]) {
        classMap[key] = {
          class_id:   s.class_id,
          class_name: s.class_name,
          year_level: s.year_level,
          total: 0, claimed: 0, unclaimed: 0,
        };
      }
      classMap[key].total++;
      if (s.claimed) classMap[key].claimed++;
      else           classMap[key].unclaimed++;
    }

    const byClass = Object.values(classMap)
      .map(c => ({
        ...c,
        claimRate: c.total > 0 ? Math.round((c.claimed / c.total) * 100) : 0,
      }))
      .sort((a, b) => (a.year_level ?? 99) - (b.year_level ?? 99) || a.class_name.localeCompare(b.class_name));

    // ── 9. Unclaimed list (sorted by class then name) ────────────────────────
    const unclaimedList = processed
      .filter(s => !s.claimed)
      .map(({ claimed: _c, ...rest }) => rest)  // drop internal 'claimed' bool
      .sort((a, b) =>
        (a.class_name ?? "").localeCompare(b.class_name ?? "") ||
        a.name.localeCompare(b.name)
      );

    return NextResponse.json({ summary, byClass, unclaimed: unclaimedList });

  } catch (err) {
    console.error("[parent-engagement API]", err.message, err.stack);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
