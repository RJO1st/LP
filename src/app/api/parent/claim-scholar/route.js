// ─── POST /api/parent/claim-scholar ─────────────────────────────────────────
// Parent redeems a school-issued validation code to link their auth account
// to a scholar record.
//
// NOTE (April 22 2026 security audit):
//   Previous version did three separate writes from the SSR client:
//     1. SELECT scholar_invitations WHERE code=? AND status='pending'
//     2. UPDATE scholars SET parent_id=auth.uid()
//     3. UPDATE scholar_invitations SET status='claimed'
//
//   Two problems:
//
//   (a) TOCTOU race. Two concurrent requests with the same code could both
//       pass step 1 before either wrote step 3, so both would happily assign
//       `scholars.parent_id` — the second write winning and silently
//       overwriting the first parent's link. This is exploitable via a shared
//       validation code (leaked from an email forward, a SMS to both parents,
//       etc.) and has no audit trail.
//
//   (b) The SSR client is RLS-scoped. `scholar_invitations` RLS only allows
//       service_role writes, so step 1 and 3 would fail for a real parent
//       session. Either the code was relying on service-role somewhere up the
//       stack, or this endpoint has been silently broken since
//       20260415_school_dashboard went live.
//
//   Fix: a SECURITY DEFINER Postgres function `claim_scholar_invitation`
//   performs the whole operation inside a single transaction with
//   `SELECT ... FOR UPDATE` on the invitation row. The row lock serialises
//   concurrent claims; the rest of the checks (status, expiry, email match)
//   run after the lock against committed state. See
//   supabase/migrations/20260422_claim_scholar_rpc.sql.
//
//   The route below is a thin wrapper: parse input, call the RPC through the
//   user's RLS-scoped SSR client (auth.uid() is set from the session), and
//   map Postgres error codes to HTTP responses.
// ────────────────────────────────────────────────────────────────────────────

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { supabaseKeys } from "@/lib/env";
import logger from "@/lib/logger";
import { claimScholarSchema, parseBody } from "@/lib/validation";

export const runtime = "nodejs";

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

/**
 * Map a Postgres error raised by `claim_scholar_invitation` to an HTTP
 * response. Any code/message combo we don't recognise is treated as a 500
 * so we don't accidentally leak a benign-looking status on an unexpected
 * failure.
 */
function mapRpcError(pgError) {
  const code = pgError?.code;
  const msg = pgError?.message || "";

  if (code === "28000") {
    return { status: 401, body: { error: "Unauthorized" } };
  }
  if (code === "P0002") {
    return { status: 404, body: { error: "Invalid or expired code" } };
  }
  if (code === "42501" && msg.includes("email_mismatch")) {
    return {
      status: 403,
      body: { error: "Email mismatch. This code is for a different parent." },
    };
  }
  if (code === "P0001") {
    if (msg.includes("not_pending")) {
      return {
        status: 409,
        body: { error: "This code has already been used." },
      };
    }
    if (msg.includes("expired")) {
      return { status: 410, body: { error: "This code has expired." } };
    }
  }
  return { status: 500, body: { error: "Failed to claim scholar" } };
}

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const supabase = buildSsrClient(cookieStore);

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const parsed = parseBody(claimScholarSchema, body);
    if (!parsed.success) return parsed.error;
    // Normalise: codes are issued as uppercase alphanumerics by the import
    // script; Zod already trimmed and capped length to 64.
    const validationCode = parsed.data.validation_code;

    // Single atomic RPC — see 20260422_claim_scholar_rpc.sql.
    const { data, error } = await supabase.rpc("claim_scholar_invitation", {
      p_validation_code: validationCode,
    });

    if (error) {
      // Don't log email_mismatch at error level — it's expected when a user
      // mistypes or forwards another family's code.
      if (error.code === "42501") {
        logger.info("claim_scholar_email_mismatch", {
          parentId: session.user.id,
        });
      } else if (error.code === "P0002" || error.code === "P0001") {
        logger.info("claim_scholar_rejected", {
          parentId: session.user.id,
          code: error.code,
          message: error.message,
        });
      } else {
        logger.error("claim_scholar_rpc_failed", {
          parentId: session.user.id,
          error,
        });
      }
      const mapped = mapRpcError(error);
      return NextResponse.json(mapped.body, { status: mapped.status });
    }

    // RPC returns a single-row table; Supabase delivers it as an array.
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
      logger.error("claim_scholar_rpc_empty", { parentId: session.user.id });
      return NextResponse.json(
        { error: "Failed to claim scholar" },
        { status: 500 }
      );
    }

    // ── School leads capture (non-blocking) ──
    // If the scholar belongs to a non-partner school, record the lead for sales outreach.
    // Fail-open: any error here must not break the claim success response.
    (async () => {
      try {
        const { getServiceRoleClient } = await import("@/lib/security/serviceRole");
        const serviceRole = getServiceRoleClient();

        // Query scholar's school_id and check if is_partner
        const { data: scholarData, error: scholarErr } = await serviceRole
          .from("scholars")
          .select("school_id")
          .eq("id", row.scholar_id)
          .single();

        if (scholarErr) {
          logger.warn("school_leads_scholar_lookup_failed", {
            scholarId: row.scholar_id,
            error: scholarErr,
          });
          return;
        }

        if (!scholarData?.school_id) {
          // Scholar not linked to a school; no lead to capture
          return;
        }

        // Check if school is a partner
        const { data: schoolData, error: schoolErr } = await serviceRole
          .from("schools")
          .select("is_partner")
          .eq("id", scholarData.school_id)
          .single();

        if (schoolErr || schoolData?.is_partner === true) {
          // School is partner or lookup failed; skip lead capture
          return;
        }

        // Upsert into school_leads (ignore if already exists for this scholar)
        const { error: leadsErr } = await serviceRole
          .from("school_leads")
          .insert({
            school_id: scholarData.school_id,
            parent_id: session.user.id,
            scholar_id: row.scholar_id,
            lead_status: "new",
          })
          .select(); // Dummy select to force write

        if (leadsErr && leadsErr.code !== "23505") {
          // 23505 = unique constraint violation (already exists)
          logger.warn("school_leads_insert_failed", {
            scholarId: row.scholar_id,
            error: leadsErr,
          });
        }
      } catch (leadsErr) {
        logger.warn("school_leads_capture_failed", {
          scholarId: row.scholar_id,
          error: leadsErr,
        });
      }
    })();

    return NextResponse.json({
      success: true,
      scholar: {
        id: row.scholar_id,
        name: row.scholar_name,
        year_level: row.year_level,
        curriculum: row.curriculum,
        codename: row.codename,
        access_code: row.access_code,
      },
    });
  } catch (err) {
    logger.error("claim_scholar_unexpected_error", { error: err });
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
