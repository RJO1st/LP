import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const getClient = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

// ── GET — fetch all goals for a scholar ─────────────────────────────────────
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const scholar_id = searchParams.get("scholar_id");

  if (!scholar_id) {
    return NextResponse.json({ error: "Missing scholar_id" }, { status: 400 });
  }

  const supabase = getClient();

  const { data, error } = await supabase
    .from("scholar_goals")
    .select("*")
    .eq("scholar_id", scholar_id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

// ── POST — create a new goal ─────────────────────────────────────────────────
export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { scholar_id, parent_id, goal_type, target_value } = body;

  if (!scholar_id || !goal_type || target_value == null) {
    return NextResponse.json(
      { error: "Missing required fields: scholar_id, goal_type, target_value" },
      { status: 400 }
    );
  }

  const supabase = getClient();

  const { data, error } = await supabase
    .from("scholar_goals")
    .insert({
      scholar_id,
      parent_id:    parent_id   ?? null,
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