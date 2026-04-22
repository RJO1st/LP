import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseKeys } from '@/lib/env'
import { getServiceRoleClient } from '@/lib/security/serviceRole'

const supabase = getServiceRoleClient();

/**
 * POST /api/admin/flag-question
 * Flag or delete a bad question from the question bank.
 * Body: { questionId, action: "flag" | "delete", reason?: string }
 *
 * Also supports bulk flagging:
 * Body: { questionIds: [...], action: "flag" | "delete", reason?: string }
 */
export async function POST(req) {
  try {
    const { questionId, questionIds, action, reason } = await req.json();
    const ids = questionIds || (questionId ? [questionId] : []);

    if (!ids.length) {
      return NextResponse.json({ error: "No question IDs provided" }, { status: 400 });
    }
    if (!["flag", "delete"].includes(action)) {
      return NextResponse.json({ error: 'Action must be "flag" or "delete"' }, { status: 400 });
    }

    if (action === "delete") {
      const { error } = await supabase
        .from("questions")
        .delete()
        .in("id", ids);
      if (error) throw error;
      return NextResponse.json({ deleted: ids.length });
    }

    // Flag — mark as flagged with reason so they can be reviewed
    const { error } = await supabase
      .from("questions")
      .update({ flagged: true, flag_reason: reason || "quality", updated_at: new Date().toISOString() })
      .in("id", ids);
    if (error) throw error;
    return NextResponse.json({ flagged: ids.length });
  } catch (err) {
    console.error("[admin/flag-question]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * GET /api/admin/flag-question?subject=english&limit=50
 * List flagged questions for review.
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const subject = searchParams.get("subject");
    const limit = parseInt(searchParams.get("limit") || "50");

    let query = supabase
      .from("questions")
      .select("*")
      .eq("flagged", true)
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (subject) query = query.eq("subject", subject);
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (err) {
    console.error("[admin/flag-question]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
