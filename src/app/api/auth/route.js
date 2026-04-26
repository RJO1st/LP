// src/app/api/auth/route.js
// ─────────────────────────────────────────────────────────────────────────────
// DEPRECATED — legacy signup handler with two security issues:
//   1. No Zod validation on email/password fields
//   2. Leaked access_token in confirmation URL (token in query param = logs)
//
// This route is not referenced anywhere in the codebase. The active signup
// flow uses Supabase auth.signUp() directly in src/app/signup/page.jsx.
// Returning 410 Gone to make any stale references fail loudly.
//
// April 26 2026: disabled as part of security audit.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";

const GONE = NextResponse.json(
  { error: "This endpoint has been removed. Please use the main signup page." },
  { status: 410 }
);

export async function GET()    { return GONE; }
export async function POST()   { return GONE; }
export async function PUT()    { return GONE; }
export async function PATCH()  { return GONE; }
export async function DELETE() { return GONE; }
