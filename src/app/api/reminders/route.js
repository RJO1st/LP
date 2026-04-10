// ─── Deploy to: src/app/api/reminders/route.js ──────────────────────────────
// CRUD for scholar practice reminders
// GET    /api/reminders?scholar_id=xxx     → get reminder config
// POST   /api/reminders                    → create/update reminder
// DELETE /api/reminders?scholar_id=xxx     → disable reminder

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

async function getClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
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

export async function GET(req) {
  const supabase = await getClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const scholarId = req.nextUrl.searchParams.get("scholar_id");

  if (scholarId) {
    // Get single scholar's reminder
    const { data, error } = await supabase
      .from("scholar_reminders")
      .select("*")
      .eq("scholar_id", scholarId)
      .eq("parent_id", user.id)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  // Get all reminders for this parent
  const { data, error } = await supabase
    .from("scholar_reminders")
    .select("*, scholars(name, access_code)")
    .eq("parent_id", user.id)
    .order("created_at");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req) {
  const supabase = await getClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { scholar_id, days_of_week, reminder_time, timezone, method, is_active } = body;

  if (!scholar_id) return NextResponse.json({ error: "scholar_id required" }, { status: 400 });

  // Verify parent owns this scholar
  const { data: scholar } = await supabase
    .from("scholars")
    .select("id")
    .eq("id", scholar_id)
    .eq("parent_id", user.id)
    .single();
  if (!scholar) return NextResponse.json({ error: "Scholar not found" }, { status: 404 });

  // Upsert reminder
  const { data, error } = await supabase
    .from("scholar_reminders")
    .upsert({
      scholar_id,
      parent_id: user.id,
      days_of_week: days_of_week || ["monday", "wednesday", "friday"],
      reminder_time: reminder_time || "16:00",
      timezone: timezone || "Europe/London",
      method: method || "email",
      is_active: is_active !== false,
      updated_at: new Date().toISOString(),
    }, { onConflict: "scholar_id" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req) {
  const supabase = await getClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const scholarId = req.nextUrl.searchParams.get("scholar_id");
  if (!scholarId) return NextResponse.json({ error: "scholar_id required" }, { status: 400 });

  const { error } = await supabase
    .from("scholar_reminders")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("scholar_id", scholarId)
    .eq("parent_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
