import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const getClient = () =>
  createRouteHandlerClient({ cookies });

// ── PUT — toggle achieved status ─────────────────────────────────────────────
export async function PUT(req, { params }) {
  const supabase = getClient();

  // ── Authentication check ──────────────────────────────────────────────
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const parentId = session.user.id;

  const { id } = await params;

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { achieved } = body;

  if (typeof achieved !== "boolean") {
    return NextResponse.json(
      { error: "Field 'achieved' must be a boolean" },
      { status: 400 }
    );
  }

  // ── Verify goal ownership ────────────────────────────────────────────────
  const { data: goal, error: fetchError } = await supabase
    .from("scholar_goals")
    .select("parent_id")
    .eq("id", id)
    .single();

  if (fetchError || !goal) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  if (goal.parent_id !== parentId) {
    return NextResponse.json(
      { error: "Cannot modify goals for other parents" },
      { status: 403 }
    );
  }

  const { data, error } = await supabase
    .from("scholar_goals")
    .update({
      achieved,
      achieved_at: achieved ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// ── DELETE — remove a goal ────────────────────────────────────────────────────
export async function DELETE(req, { params }) {
  const supabase = getClient();

  // ── Authentication check ──────────────────────────────────────────────
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const parentId = session.user.id;

  const { id } = await params;

  // ── Verify goal ownership ────────────────────────────────────────────────
  const { data: goal, error: fetchError } = await supabase
    .from("scholar_goals")
    .select("parent_id")
    .eq("id", id)
    .single();

  if (fetchError || !goal) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  if (goal.parent_id !== parentId) {
    return NextResponse.json(
      { error: "Cannot delete goals for other parents" },
      { status: 403 }
    );
  }

  const { error } = await supabase
    .from("scholar_goals")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}