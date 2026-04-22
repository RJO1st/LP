/**
 * DISABLED — previously a public backdoor that accepted POST from anyone and
 * created a privileged Supabase auth user with a hard-coded password plus an
 * active `parents` row. Removed April 22 2026 as part of the security audit.
 *
 * This file is kept as a 410 Gone so anyone with a stale reference to this
 * URL gets an explicit failure, not a surprising 404 that might be misread
 * as "firewall did something". Delete the file and its parent directory in
 * git when convenient:
 *
 *   git rm -r src/app/api/test
 *
 * Do NOT re-enable this endpoint. Use the Supabase dashboard or the
 * admin-gated provisioning routes for any test-account creation.
 */

import { NextResponse } from 'next/server';

function gone() {
  return NextResponse.json(
    { error: 'This endpoint has been permanently removed.' },
    { status: 410 }
  );
}

export async function GET() {
  return gone();
}
export async function POST() {
  return gone();
}
export async function PUT() {
  return gone();
}
export async function PATCH() {
  return gone();
}
export async function DELETE() {
  return gone();
}
