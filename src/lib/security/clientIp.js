/**
 * src/lib/security/clientIp.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Extract a trusted client IP from an incoming Request.
 *
 * Trust order (see Phase 3 recon notes):
 *   1. `cf-connecting-ip`   — Cloudflare's real-client header, unforgeable by
 *                              upstream since it's set by CF after edge auth.
 *   2. `x-real-ip`          — Vercel populates this from the edge. Forged only
 *                              by a caller who controls an intermediate proxy.
 *   3. `x-forwarded-for`    — Take the *last* (rightmost) entry, which is the
 *                              nearest-trusted hop in Vercel's topology. Taking
 *                              the leftmost entry (common beginner mistake)
 *                              trusts whatever the original client typed, so
 *                              rate limiting becomes trivially bypassable.
 *   4. "unknown"            — Never throw. A bad IP becomes a shared bucket,
 *                              which degrades to global rate limiting. That's
 *                              safer than silently skipping the limit.
 *
 * Consumed by:
 *   - src/app/api/paystack/webhook/route.js
 *   - src/app/api/paystack/checkout/route.js
 *   - src/app/api/forgot-password/route.js
 *   - src/app/api/forgot-access-code/route.js
 *   - src/app/api/schools/interest/route.js
 *
 * Why a shared helper: the trust order is security-critical. Leaving five
 * copies around guarantees one of them drifts (leftmost XFF, missing trim,
 * etc.) and becomes a silent rate-limit bypass.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export function getClientIp(request) {
  const cf = request.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();

  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();

  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }

  return "unknown";
}
