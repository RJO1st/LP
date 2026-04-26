// ─── Deploy to: src/app/api/scholar/advance-subject/route.js ─────────────────
// Advances a scholar's year level for a SPECIFIC subject only.
// Called from parent dashboard or auto-triggered by mastery threshold.
//
// POST { scholar_id, subject }
// Returns { newYear, subject }

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { supabaseKeys } from '@/lib/env'
import { advanceSubjectSchema, parseBody } from '@/lib/validation'

export async function POST(req) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseKeys.publishable(),
    { cookies: { getAll: () => cookieStore.getAll() } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rawBody = await req.json().catch(() => null);
  const parsed = parseBody(advanceSubjectSchema, rawBody);
  if (!parsed.success) return parsed.error;
  const { scholar_id, subject } = parsed.data;

  // Verify parent owns this scholar
  const { data: scholar } = await supabase
    .from("scholars")
    .select("id, curriculum, year_level")
    .eq("id", scholar_id)
    .eq("parent_id", user.id)
    .single();
  if (!scholar) return NextResponse.json({ error: "Scholar not found" }, { status: 404 });

  // Get current subject-specific year
  const { data: ssl } = await supabase
    .from("scholar_subject_levels")
    .select("year_level")
    .eq("scholar_id", scholar_id)
    .eq("subject", subject)
    .maybeSingle();

  const currentYear = ssl?.year_level ?? scholar.year_level;
  const newYear = currentYear + 1;

  // Upsert the new year level
  const { error } = await supabase
    .from("scholar_subject_levels")
    .upsert({
      scholar_id,
      subject,
      year_level: newYear,
      promoted_at: new Date().toISOString(),
    }, { onConflict: "scholar_id,subject" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ 
    success: true, 
    subject, 
    previousYear: currentYear, 
    newYear,
    message: `${subject} advanced to Year ${newYear}` 
  });
}

// GET: Fetch all subject levels for a scholar
export async function GET(req) {
  const cookieStoreGet = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseKeys.publishable(),
    { cookies: { getAll: () => cookieStoreGet.getAll() } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const scholarId = req.nextUrl.searchParams.get("scholar_id");
  if (!scholarId) return NextResponse.json({ error: "scholar_id required" }, { status: 400 });

  // Verify parent owns this scholar
  const { data: scholar } = await supabase
    .from("scholars")
    .select("id, year_level")
    .eq("id", scholarId)
    .eq("parent_id", user.id)
    .single();
  if (!scholar) return NextResponse.json({ error: "Scholar not found" }, { status: 404 });

  const { data: levels } = await supabase
    .from("scholar_subject_levels")
    .select("subject, year_level, promoted_at")
    .eq("scholar_id", scholarId)
    .order("subject");

  return NextResponse.json({
    scholar_id: scholarId,
    default_year: scholar.year_level,
    subjects: levels || [],
  });
}