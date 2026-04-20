// ─── POST /api/schools/create ─────────────────────────────────────────────────
// Creates a new school + proprietor school_role for the authenticated user.
// Called by the onboarding wizard when the user has no existing school.
//
// Body: { name, schoolType, state, country }
// Returns: { schoolId, schoolName }
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse }       from "next/server";
import { createClient }       from "@supabase/supabase-js";
import { cookies }            from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function POST(request) {
  try {
    const { name, schoolType, state, country, schoolId: claimSchoolId } = await request.json();

    // claimSchoolId mode: admin pre-created the school; just create the role.
    if (claimSchoolId) {
      const cookieStore = await cookies();
      const userSupabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        { cookies: { getAll: () => cookieStore.getAll() } },
      );
      const { data: { user } } = await userSupabase.auth.getUser();
      if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

      const admin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
      );

      // Verify the school exists
      const { data: school } = await admin.from("schools").select("id, name").eq("id", claimSchoolId).single();
      if (!school) return NextResponse.json({ error: "School not found." }, { status: 404 });

      // Upsert the role
      await admin.from("school_roles").upsert(
        { user_id: user.id, school_id: claimSchoolId, role: "proprietor" },
        { onConflict: "user_id,school_id" },
      );

      return NextResponse.json({ schoolId: school.id, schoolName: school.name });
    }

    if (!name?.trim()) {
      return NextResponse.json({ error: "School name is required." }, { status: 400 });
    }

    // ── Authenticate caller ────────────────────────────────────────────────────
    const cookieStore = await cookies();
    const userSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { cookies: { getAll: () => cookieStore.getAll() } },
    );
    const { data: { user } } = await userSupabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );

    // ── Guard: user must not already own a school ──────────────────────────────
    const { data: existing } = await admin
      .from("school_roles")
      .select("school_id")
      .eq("user_id", user.id)
      .in("role", ["proprietor", "admin"])
      .limit(1);

    if (existing?.length) {
      return NextResponse.json(
        { error: "You already have a school. Go to /onboarding/school to continue.", schoolId: existing[0].school_id },
        { status: 409 },
      );
    }

    // ── Create school ──────────────────────────────────────────────────────────
    const { data: school, error: schoolErr } = await admin
      .from("schools")
      .insert({
        name:        name.trim(),
        school_type: schoolType || null,
        region:      state || null,
        country:     country || "Nigeria",
      })
      .select("id, name")
      .single();

    if (schoolErr || !school) {
      console.error("[schools/create] insert error:", schoolErr);
      return NextResponse.json({ error: "Could not create school." }, { status: 500 });
    }

    // ── Assign proprietor role ────────────────────────────────────────────────
    const { error: roleErr } = await admin
      .from("school_roles")
      .insert({
        user_id:   user.id,
        school_id: school.id,
        role:      "proprietor",
      });

    if (roleErr) {
      // Roll back school if role fails
      await admin.from("schools").delete().eq("id", school.id);
      console.error("[schools/create] role insert error:", roleErr);
      return NextResponse.json({ error: "Could not assign school role." }, { status: 500 });
    }

    return NextResponse.json({ schoolId: school.id, schoolName: school.name });

  } catch (err) {
    console.error("[schools/create] error:", err);
    return NextResponse.json({ error: err.message || "Internal error." }, { status: 500 });
  }
}
