// ─── /api/parent/consent ────────────────────────────────────────────────────
// POST:   parent gives NDPR consent for a school to see their child's data.
// DELETE: parent revokes consent.
//
// NOTE (April 22 2026 security audit):
//   Previous version instantiated a *service-role* client via
//   `createServerClient(URL, SERVICE_ROLE_KEY, { cookies })` — which not only
//   misused `createServerClient` (it's an SSR wrapper, not an admin client)
//   but also widened the blast radius: a bug anywhere in this route could
//   bypass RLS on *any* table. Service role is no longer used here.
//
//   The flow now:
//     1. SSR client with user cookies (subject to RLS).
//     2. Ownership check: scholars.parent_id === session.user.id.
//     3. Consent upsert/update goes through the SSR client, which means the
//        existing RLS policies on scholar_school_consent must allow parents
//        to insert/update rows WHERE parent_id = auth.uid(). The companion
//        migration 20260422_security_rls.sql adds those policies. Until that
//        migration runs, parents without an existing consent row will 403.
// ────────────────────────────────────────────────────────────────────────────

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { supabaseKeys } from "@/lib/env";
import logger from "@/lib/logger";
import {
  parentConsentGiveSchema,
  parentConsentRevokeSchema,
  parseBody,
} from "@/lib/validation";

function getClientIp(request) {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

function buildSsrClient(cookieStore) {
  return createServerClient(
    supabaseKeys.url(),
    supabaseKeys.publishable(),
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const supabase = buildSsrClient(cookieStore);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const parentId = session.user.id;

    const body = await request.json().catch(() => null);
    const parsed = parseBody(parentConsentGiveSchema, body);
    if (!parsed.success) return parsed.error;
    const { scholar_id, school_id } = parsed.data;

    // Ownership check (RLS will also enforce, but fail fast with 403).
    const { data: scholar, error: scholarError } = await supabase
      .from("scholars")
      .select("id, parent_id")
      .eq("id", scholar_id)
      .maybeSingle();

    if (scholarError || !scholar) {
      return NextResponse.json({ error: "Scholar not found" }, { status: 404 });
    }
    if (scholar.parent_id !== parentId) {
      return NextResponse.json(
        { error: "You do not own this scholar" },
        { status: 403 }
      );
    }

    // School existence check.
    const { data: school, error: schoolError } = await supabase
      .from("schools")
      .select("id")
      .eq("id", school_id)
      .maybeSingle();
    if (schoolError || !school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const clientIp = getClientIp(request);
    const userAgent = request.headers.get("user-agent") || null;

    // Upsert consent through the user's RLS-scoped client.
    const { data: consentRecord, error: consentError } = await supabase
      .from("scholar_school_consent")
      .upsert(
        {
          scholar_id,
          school_id,
          parent_id: parentId,
          consent_given_at: new Date().toISOString(),
          consent_ip: clientIp,
          consent_user_agent: userAgent,
          revoked_at: null,
          revoke_reason: null,
        },
        { onConflict: "scholar_id,school_id" }
      )
      .select("id")
      .single();

    if (consentError) {
      logger.error("consent_upsert_failed", { error: consentError, parentId });
      return NextResponse.json(
        { error: "Failed to save consent record" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, consentId: consentRecord.id });
  } catch (err) {
    logger.error("consent_post_error", { error: err });
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const cookieStore = await cookies();
    const supabase = buildSsrClient(cookieStore);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const parentId = session.user.id;

    const body = await request.json().catch(() => null);
    const parsed = parseBody(parentConsentRevokeSchema, body);
    if (!parsed.success) return parsed.error;
    const { scholar_id, school_id, reason } = parsed.data;

    const { data: scholar, error: scholarError } = await supabase
      .from("scholars")
      .select("id, parent_id")
      .eq("id", scholar_id)
      .maybeSingle();
    if (scholarError || !scholar) {
      return NextResponse.json({ error: "Scholar not found" }, { status: 404 });
    }
    if (scholar.parent_id !== parentId) {
      return NextResponse.json(
        { error: "You do not own this scholar" },
        { status: 403 }
      );
    }

    // Revocation goes through RLS-scoped client; the policy scopes UPDATE to
    // rows where parent_id = auth.uid(). Reason was already trimmed/capped by
    // the Zod schema (max 500 chars).
    const { error: revokeError } = await supabase
      .from("scholar_school_consent")
      .update({
        revoked_at: new Date().toISOString(),
        revoke_reason: reason ?? null,
      })
      .eq("scholar_id", scholar_id)
      .eq("school_id", school_id)
      .eq("parent_id", parentId);

    if (revokeError) {
      logger.error("consent_revoke_failed", { error: revokeError, parentId });
      return NextResponse.json(
        { error: "Failed to revoke consent" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error("consent_delete_error", { error: err });
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}
