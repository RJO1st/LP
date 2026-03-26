import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      return NextResponse.json(
        { error: "Server configuration error — missing environment variables." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const code = (body?.code ?? "").trim().toUpperCase();

    if (!code || code.length < 4) {
      return NextResponse.json(
        { error: "Invalid access code format." },
        { status: 400 }
      );
    }

    const supabaseAdmin = createClient(url, key);

    // Select every column the student dashboard needs.
    // Previously only 4 fields were selected — curriculum was missing,
    // which caused all scholars to fall back to uk_11plus.
    const { data: scholar, error } = await supabaseAdmin
      .from("scholars")
      .select("*")
      .eq("access_code", code)
      .maybeSingle();

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        { error: "Database error. Please try again." },
        { status: 500 }
      );
    }

    if (!scholar) {
      return NextResponse.json(
        { error: "Access code not found. Please check with your guardian." },
        { status: 404 }
      );
    }

    return NextResponse.json({ scholar }, { status: 200 });

  } catch (err) {
    console.error("Unhandled exception in /api/scholar:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}