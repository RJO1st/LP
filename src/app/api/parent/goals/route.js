import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { supabaseKeys } from '@/lib/env'
import { parentGoalSchema, parseBody } from '@/lib/validation'

async function getClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseKeys.publishable(),
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {}
        },
      },
    }
  );
}

// ── GET — fetch all goals for a scholar ─────────────────────────────────────
export async function GET(req) {
  const supabase = await getClient();

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
  const supabase = await getClient();

  // ── Authentication check ──────────────────────────────────────────────
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const parentId = session.user.id;

  const rawBody = await req.json().catch(() => null);
  const parsed = parseBody(parentGoalSchema, rawBody);
  if (!parsed.success) return parsed.error;

  const { scholar_id, goal_type, target_value } = parsed.data;

  const { data, error } = await supabase
    .from("scholar_goals")
    .insert({
      scholar_id,
      parent_id:    parentId,
      goal_type,
      target_value,
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
