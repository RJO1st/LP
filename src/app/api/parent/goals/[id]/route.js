import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const getClient = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

// ── PUT — toggle achieved status ─────────────────────────────────────────────
export async function PUT(req, { params }) {
  const { id } = params;

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

  const supabase = getClient();

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
  const { id } = params;

  const supabase = getClient();

  const { error } = await supabase
    .from("scholar_goals")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}