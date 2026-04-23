// Deprecated orphan — canonical route is /api/mastery/next-question.
// Kept as a 410 Gone stub because the workspace sandbox cannot delete files.
// Do not restore this handler — it previously exposed service-role reads
// without auth at the public /mastery/next-question path.
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(
    { error: "Gone. Use /api/mastery/next-question." },
    { status: 410 }
  );
}

export async function POST() {
  return NextResponse.json(
    { error: "Gone. Use /api/mastery/next-question." },
    { status: 410 }
  );
}
