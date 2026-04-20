// ─── GET /api/classes/info?code=XXXXXX ────────────────────────────────────────
// Public endpoint — no auth required.
// Returns class name, year level, curriculum, school name, and schoolId
// so the /join/[code] page can render before the user is authenticated.
//
// Uses service role to bypass RLS on the join_code lookup.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { createClient }  from "@supabase/supabase-js";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code")?.toUpperCase().trim();

  if (!code || code.length < 4) {
    return NextResponse.json({ error: "code is required." }, { status: 400 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  const { data: cls, error } = await admin
    .from("classes")
    .select(`
      id,
      name,
      year_level,
      curriculum,
      schools ( id, name )
    `)
    .eq("join_code", code)
    .single();

  if (error || !cls) {
    return NextResponse.json({ error: "Class not found." }, { status: 404 });
  }

  return NextResponse.json({
    classId:    cls.id,
    className:  cls.name,
    yearLevel:  cls.year_level,
    curriculum: cls.curriculum,
    schoolId:   cls.schools?.id,
    schoolName: cls.schools?.name || "Your school",
  });
}
