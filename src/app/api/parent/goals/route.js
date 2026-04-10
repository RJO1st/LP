import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const getClient = () =>
  createRouteHandlerClient({ cookies });

// ── GET — fetch all goals for a scholar ─────────────────────────────────────
export async function GET(req) {
  const supabase = getClient();

  // ── Authentication check ──────────────────────────────────────────────
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const parentId = session.user.id;

  // Filter goals by parent_id from session
  const { data, error } = await supabase
    .from("scholar_goals")
    .select("*")
    .eq("parent_id", parentId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

// ── POST — create a new goal ─────────────────────────────────────────────────
export async function POST(req) {
  const supabase = getClient();

  // ── Authentication check ──────────────────────────────────────────────
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const parentId = session.user.id;

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { scholar_id, goal_type, target_value } = body;

  if (!scholar_id || !goal_type || target_value == null) {
    return NextResponse.json(
      { error: "Missing required fields: scholar_id, goal_type, target_value" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("scholar_goals")
    .insert({
      scholar_id,
      parent_id:    parentId,
      goal_type,
      target_value: Number(target_value),
      achieved:     false,
      achieved_at:  null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}