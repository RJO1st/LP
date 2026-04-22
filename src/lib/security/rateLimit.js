/**
 * src/lib/security/rateLimit.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Distributed rate limiter backed by Upstash Redis with an in-memory
 * fallback for local dev and for the brief window while Upstash env vars
 * propagate after deploy.
 *
 * Why Upstash?
 *   The previous limiter lived in `src/proxy.ts` as an in-process `Map`. On
 *   Vercel each serverless instance has its own Map, so a caller can simply
 *   pound the endpoint and land on a fresh instance every few requests, making
 *   the limit meaningless. Upstash gives us cross-instance coordination with
 *   sub-5ms latency.
 *
 * Env:
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 *
 * Usage:
 *   import { limit } from '@/lib/security/rateLimit';
 *   const { success, remaining, reset } = await limit({
 *     key: `paystack-webhook:${ip}`,
 *     windowSec: 60,
 *     max: 30,
 *   });
 *   if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
 *
 * The API deliberately mirrors `@upstash/ratelimit`'s shape so we can swap
 * later without rewriting callers.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import logger from '@/lib/logger';

/** In-memory fallback state (dev only, single process). */
const _localBuckets = new Map(); // key -> { count, resetAt }

function localLimit(key, windowSec, max) {
  const now = Date.now();
  const windowMs = windowSec * 1000;
  const bucket = _localBuckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    const reset = now + windowMs;
    _localBuckets.set(key, { count: 1, resetAt: reset });
    return { success: true, remaining: max - 1, reset, backend: 'memory' };
  }

  if (bucket.count >= max) {
    return { success: false, remaining: 0, reset: bucket.resetAt, backend: 'memory' };
  }

  bucket.count += 1;
  return {
    success: true,
    remaining: max - bucket.count,
    reset: bucket.resetAt,
    backend: 'memory',
  };
}

/**
 * Upstash call using the REST API directly (no SDK dep needed).
 * We use INCR + EXPIRE in a single pipeline; first request in a window
 * creates the key with TTL, subsequent requests just INCR.
 *
 * The script runs atomically server-side via `/pipeline`.
 */
async function upstashLimit(key, windowSec, max) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  const fullKey = `rl:${key}`;

  // Pipeline: INCR, EXPIRE (only sets TTL if not already set via NX is Redis 7+
  // but EXPIRE always is fine since we also INCR and trust the first-incr=1
  // check below to reset the TTL when the window rolled over).
  const pipeline = [
    ['INCR', fullKey],
    ['EXPIRE', fullKey, String(windowSec), 'NX'],
    ['PTTL', fullKey],
  ];

  const res = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(pipeline),
    // Upstash REST is geographically close; short timeout is fine.
    signal: AbortSignal.timeout(2000),
  });

  if (!res.ok) {
    throw new Error(`upstash_http_${res.status}`);
  }

  const data = await res.json();
  // data === [{ result: count }, { result: 0|1 }, { result: pttl_ms }]
  const count = Number(data[0]?.result ?? 0);
  const pttl = Number(data[2]?.result ?? -1);
  const resetAt =
    pttl > 0 ? Date.now() + pttl : Date.now() + windowSec * 1000;

  if (count > max) {
    return { success: false, remaining: 0, reset: resetAt, backend: 'upstash' };
  }

  return {
    success: true,
    remaining: Math.max(0, max - count),
    reset: resetAt,
    backend: 'upstash',
  };
}

/**
 * limit({ key, windowSec, max }) -> { success, remaining, reset, backend }
 */
export async function limit({ key, windowSec, max }) {
  if (!key || typeof key !== 'string') {
    throw new Error('rateLimit.limit: key is required');
  }
  if (!Number.isFinite(windowSec) || windowSec <= 0) {
    throw new Error('rateLimit.limit: windowSec must be > 0');
  }
  if (!Number.isFinite(max) || max <= 0) {
    throw new Error('rateLimit.limit: max must be > 0');
  }

  const hasUpstash =
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!hasUpstash) {
    return localLimit(key, windowSec, max);
  }

  try {
    return await upstashLimit(key, windowSec, max);
  } catch (err) {
    logger.warn('rate_limit_upstash_failed_fallback_memory', {
      error: err,
      key,
    });
    return localLimit(key, windowSec, max);
  }
}
