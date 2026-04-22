// ─── POST /api/classes/join ───────────────────────────────────────────────────
// Auth required. Links a parent's scholar to a class via join_code.
//
// Body: { code: "XXXXXX", scholarId: "uuid" }
//
// Actions:
//   1. Validate join code → get classId + schoolId
//   2. Verify scholar belongs to this parent
//   3. Upsert enrolment record (classes × scholars)
//   4. Upsert scholar_school_consent (NDPR — implied by the parent clicking "Enrol")
//   5. Update scholars.school_id
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse }      from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies }           from "next/headers";
import { getServiceRoleClient } from "@/lib/security/serviceRole";
import { supabaseKeys } from "@/lib/env";

export async function POST(request) {
  try {
    const { code, scholarId } = await request.json();

    if (!code || !scholarId) {
      return NextResponse.json({ error: "code and scholarId are required." }, { status: 400 });
    }

    // ── Authenticate caller ───────────────────────────────────────────────────
    const cookieStore = await cookies();
    const userSupabase = createServerClient(
      supabaseKeys.url(),
      supabaseKeys.publishable(),
      { cookies: { getAll: () => cookieStore.getAll() } },
    );
    const { data: { user } } = await userSupabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const admin = getServiceRoleClient();

    // ── 1. Resolve join code → class ─────────────────────────────────────────
    const { data: cls, error: codeErr } = await admin
      .from("classes")
      .select("id, school_id, name, year_level, curriculum")
      .eq("join_code", code.toUpperCase().trim())
      .single();

    if (codeErr || !cls) {
      return NextResponse.json({ error: "Invalid or expired join code." }, { status: 404 });
    }

    // ── 2. Verify scholar belongs to this parent ──────────────────────────────
    const { data: scholar, error: scholarErr } = await admin
      .from("scholars")
      .select("id, name, parent_id")
      .eq("id", scholarId)
      .single();

    if (scholarErr || !scholar || scholar.parent_id !== user.id) {
      return NextResponse.json({ error: "Scholar not found or not yours." }, { status: 403 });
    }

    // ── 3. Upsert enrolment ───────────────────────────────────────────────────
    const now = new Date().toISOString();

    const { error: enrolErr } = await admin
      .from("enrolments")
      .upsert({
        scholar_id:    scholarId,
        class_id:      cls.id,
        academic_year: new Date().getFullYear().toString(),
        enrolled_at:   now,
      }, { onConflict: "scholar_id,class_id" });

    if (enrolErr) {
      console.error("[classes/join] enrolment error:", enrolErr);
      return NextResponse.json({ error: "Could not enrol scholar." }, { status: 500 });
    }

    // ── 4. Upsert NDPR/GDPR consent ──────────────────────────────────────────
    // Parent explicitly clicked "Enrol in this class" which includes the consent
    // notice — this is the consent event.
    const { error: consentErr } = await admin
      .from("scholar_school_consent")
      .upsert({
        scholar_id:        scholarId,
        school_id:         cls.school_id,
        parent_id:         user.id,
        consent_given_at:  now,
        revoked_at:        null,          // clear any prior revocation
      }, { onConflict: "scholar_id,school_id" });

    if (consentErr) {
      // Non-fatal — log and continue
      console.error("[classes/join] consent upsert error:", consentErr);
    }

    // ── 5. Set scholar.school_id ──────────────────────────────────────────────
    await admin
      .from("scholars")
      .update({ school_id: cls.school_id })
      .eq("id", scholarId);

    return NextResponse.json({
      ok:         true,
      classId:    cls.id,
      schoolId:   cls.school_id,
      className:  cls.name,
      scholarName: scholar.name,
    });

  } catch (err) {
    console.error("[classes/join] error:", err);
    return NextResponse.json({ error: err.message || "Internal error." }, { status: 500 });
  }
}
