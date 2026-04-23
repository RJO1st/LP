// Deprecated orphan — canonical route is /api/mastery/update.
// Kept as a 410 Gone stub because the workspace sandbox cannot delete files.
// Do not restore this handler — it previously exposed service-role writes
// without auth at the public /mastery/update path.
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    { error: "Gone. Use /api/mastery/update." },
    { status: 410 }
  );
}

export async function GET() {
  return NextResponse.json(
    { error: "Gone. Use /api/mastery/update." },
    { status: 410 }
  );
}
