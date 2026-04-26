// src/app/api/admin/flag-question/route.js
// ─────────────────────────────────────────────────────────────────────────────
// Admin-only endpoint for flagging or deleting questions from the bank.
// SECURITY (April 26 2026): requireAdmin() guard added — previously this route
// had no auth, allowing unauthenticated bulk deletion of the question bank.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/security/admin";
import { getServiceRoleClient } from "@/lib/security/serviceRole";

// ── Validation ────────────────────────────────────────────────────────────────
const uuidSchema = z.string().uuid();

const flagQuestionSchema = z.object({
  // Accept either a single ID or an array
  questionId:  uuidSchema.optional(),
  questionIds: z.array(uuidSchema).max(500).optional(),
  action:      z.enum(["flag", "delete"]),
  reason:      z.string().max(500).optional(),
}).refine(d => d.questionId || (d.questionIds && d.questionIds.length > 0), {
  message: "At least one question ID is required",
});

/**
 * POST /api/admin/flag-question
 * Flag or delete a bad question from the question bank (admin only).
 * Body: { questionId?, questionIds?: [...], action: "flag"|"delete", reason? }
 */
export async function POST(req) {
  const { error: adminError } = await requireAdmin(req);
  if (adminError) return adminError;

  let rawBody;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = flagQuestionSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const { questionId, questionIds, action, reason } = parsed.data;
  const ids = questionIds?.length ? questionIds : [questionId];

  const supabase = getServiceRoleClient();

  if (action === "delete") {
    const { error } = await supabase
      .from("questions")
      .delete()
      .in("id", ids);
    if (error) {
      console.error("[admin/flag-question] delete error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ deleted: ids.length });
  }

  // Flag — mark as flagged with reason so they can be reviewed
  const { error } = await supabase
    .from("questions")
    .update({
      flagged:    true,
      flag_reason: reason || "quality",
      updated_at: new Date().toISOString(),
    })
    .in("id", ids);

  if (error) {
    console.error("[admin/flag-question] flag error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ flagged: ids.length });
}

/**
 * GET /api/admin/flag-question?subject=english&limit=50
 * List flagged questions for review (admin only).
 */
export async function GET(req) {
  const { error: adminError } = await requireAdmin(req);
  if (adminError) return adminError;

  const { searchParams } = new URL(req.url);
  const subject   = searchParams.get("subject");
  const limitVal  = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));

  const supabase = getServiceRoleClient();
  let query = supabase
    .from("questions")
    .select("*")
    .eq("flagged", true)
    .order("updated_at", { ascending: false })
    .limit(limitVal);

  if (subject) query = query.eq("subject", subject);

  const { data, error } = await query;
  if (error) {
    console.error("[admin/flag-question] list error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data || []);
}
