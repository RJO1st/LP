import { NextResponse } from "next/server";
import { getServiceRoleClient } from "@/lib/security/serviceRole";
import { scholarLoginSchema, parseBody } from "@/lib/validation";

export async function POST(request) {
  try {
    const raw = await request.json();
    const parsed = parseBody(scholarLoginSchema, { code: (raw?.code ?? "").trim().toUpperCase() });
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid access code format." }, { status: 400 });
    }
    const { code } = parsed.data;

    const supabaseAdmin = getServiceRoleClient();

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