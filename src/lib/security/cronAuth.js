/**
 * src/lib/security/cronAuth.js
 *
 * Shared constant-time CRON_SECRET verifier for all cron routes.
 *
 * Why: naive string equality (`===`) leaks timing information.
 * A response-time oracle lets an attacker enumerate the secret byte-by-byte.
 * `timingSafeEqual` compares in constant time regardless of where bytes diverge.
 *
 * Usage:
 *   import { authorizedCronRequest } from "@/lib/security/cronAuth";
 *   if (!authorizedCronRequest(req)) {
 *     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 *   }
 */

import { timingSafeEqual } from "node:crypto";

/**
 * Returns true if the request carries a valid `Authorization: Bearer <CRON_SECRET>` header.
 * Safe against response-time brute-force because comparison is constant-time.
 *
 * @param {Request} req  — Next.js App Router request object
 * @returns {boolean}
 */
export function authorizedCronRequest(req) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    // Missing secret → fail closed (never accidentally open).
    return false;
  }
  const authHeader = req.headers.get("authorization") || "";
  const expected   = `Bearer ${cronSecret}`;

  // Length check first — timingSafeEqual requires equal-length Buffers.
  // Leaking whether lengths match is acceptable because the secret's length
  // is not secret (it's config, typically 32–64 chars).
  if (authHeader.length !== expected.length) return false;

  try {
    return timingSafeEqual(
      Buffer.from(authHeader, "utf8"),
      Buffer.from(expected,   "utf8"),
    );
  } catch {
    return false;
  }
}
