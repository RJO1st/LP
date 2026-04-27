/**
 * src/lib/security/webhook.js
 * ─────────────────────────────────────────────────────────────────────────────
 * HMAC signature verification for inbound webhooks (Paystack today, Stripe
 * once UK entity is live). Uses `crypto.timingSafeEqual` on equal-length
 * Buffers so an attacker cannot probe the signature byte-by-byte via
 * response-time deltas.
 *
 * Why not `===`?
 *   String equality short-circuits on the first mismatched byte. On a fast
 *   serverless host an attacker with enough samples can average out the noise
 *   and reconstruct the valid HMAC. `timingSafeEqual` runs in time
 *   proportional to the Buffer length regardless of content.
 *
 * Usage:
 *   import { verifyHmac } from '@/lib/security/webhook';
 *   const ok = verifyHmac({
 *     rawBody,
 *     signatureHeader: request.headers.get('x-paystack-signature'),
 *     secret: process.env.PAYSTACK_SECRET_KEY,
 *     algo: 'sha512',
 *   });
 * ─────────────────────────────────────────────────────────────────────────────
 */

import crypto from 'crypto';
import logger from '@/lib/logger';

/**
 * verifyHmac({ rawBody, signatureHeader, secret, algo })
 *
 * @param {object}   opts
 * @param {string}   opts.rawBody          - Raw request body as received (pre-parse)
 * @param {string|null} opts.signatureHeader - Header value from provider
 * @param {string}   opts.secret           - Shared secret
 * @param {string}   [opts.algo='sha512']  - HMAC algorithm
 * @param {string}   [opts.encoding='hex'] - Expected encoding of the header
 * @returns {boolean}
 */
export function verifyHmac({
  rawBody,
  signatureHeader,
  secret,
  algo = 'sha512',
  encoding = 'hex',
}) {
  if (!signatureHeader || typeof signatureHeader !== 'string') return false;
  if (!secret || typeof secret !== 'string') {
    logger.error('webhook_secret_missing', { algo });
    return false;
  }
  if (typeof rawBody !== 'string') return false;

  let expected;
  try {
    expected = crypto
      .createHmac(algo, secret)
      .update(rawBody)
      .digest(encoding);
  } catch (err) {
    logger.error('webhook_hmac_compute_failed', { error: err, algo });
    return false;
  }

  // Length check first: timingSafeEqual throws on differing lengths, and
  // length is itself not secret (it's fixed by the algorithm + encoding).
  if (expected.length !== signatureHeader.length) return false;

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, 'utf8'),
      Buffer.from(signatureHeader, 'utf8')
    );
  } catch (err) {
    logger.error('webhook_timingsafe_failed', { error: err });
    return false;
  }
}

/**
 * verifyStripeSignature({ rawBody, signatureHeader, secret, toleranceSec })
 *
 * Stripe's `Stripe-Signature` header format:
 *   t=1700000000,v1=abc123...[,v1=additional_sig_during_rotation]
 *
 * Signed payload: `${timestamp}.${rawBody}` (HMAC-SHA256, hex).
 *
 * @param {object}      opts
 * @param {string}      opts.rawBody           - Raw request body as text
 * @param {string|null} opts.signatureHeader   - Value of `Stripe-Signature` header
 * @param {string}      opts.secret            - STRIPE_WEBHOOK_SECRET
 * @param {number}      [opts.toleranceSec=300] - Max clock skew tolerance (Stripe default: 300 s)
 * @returns {boolean}
 */
export function verifyStripeSignature({ rawBody, signatureHeader, secret, toleranceSec = 300 }) {
  if (!signatureHeader || typeof signatureHeader !== 'string') return false;
  if (!secret || typeof secret !== 'string') {
    logger.error('stripe_webhook_secret_missing');
    return false;
  }
  if (typeof rawBody !== 'string') return false;

  // Parse header into { t: '...', v1: ['sig1', 'sig2'] }
  let timestamp = null;
  const v1Sigs = [];
  for (const part of signatureHeader.split(',')) {
    const eqIdx = part.indexOf('=');
    if (eqIdx === -1) continue;
    const k = part.slice(0, eqIdx).trim();
    const v = part.slice(eqIdx + 1).trim();
    if (k === 't') timestamp = v;
    if (k === 'v1') v1Sigs.push(v);
  }

  if (!timestamp || v1Sigs.length === 0) return false;

  // Replay-window check (prevents delivery of old valid requests).
  const ts = parseInt(timestamp, 10);
  if (Number.isNaN(ts)) return false;
  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - ts) > toleranceSec) {
    logger.warn('stripe_webhook_timestamp_outside_tolerance', {
      ts, nowSec, diff: Math.abs(nowSec - ts), toleranceSec,
    });
    return false;
  }

  // Compute expected signature over `timestamp.rawBody`.
  let expected;
  try {
    expected = crypto
      .createHmac('sha256', secret)
      .update(`${timestamp}.${rawBody}`, 'utf8')
      .digest('hex');
  } catch (err) {
    logger.error('stripe_webhook_hmac_failed', { error: err });
    return false;
  }

  // Stripe may include multiple v1 signatures during secret rotation — accept any match.
  for (const sig of v1Sigs) {
    if (expected.length !== sig.length) continue;
    try {
      if (crypto.timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(sig, 'utf8'))) {
        return true;
      }
    } catch {
      // Swallow: length guard above makes this effectively unreachable.
    }
  }

  return false;
}

/**
 * Strict allow-list validator for webhook-supplied plan/billing/addon data.
 * Paystack metadata is caller-supplied at checkout time, so we must treat it
 * as untrusted and refuse to honour values that don't match known tiers.
 *
 * Returns { valid: true, value } on success or { valid: false, reason } on fail.
 */
export function validateEnumValue(value, allowed, fieldName) {
  if (value === undefined || value === null || value === '') {
    return { valid: false, reason: `${fieldName}_missing` };
  }
  if (typeof value !== 'string') {
    return { valid: false, reason: `${fieldName}_not_string` };
  }
  const v = value.trim();
  if (!allowed.includes(v)) {
    return { valid: false, reason: `${fieldName}_not_allowed` };
  }
  return { valid: true, value: v };
}

/**
 * Validate an array of addons against an allow-list. Returns a clean array
 * of unique, allow-listed addon codes. Unknown values are dropped (not an
 * error) and logged for review.
 */
export function sanitiseAddons(addons, allowed) {
  const arr = Array.isArray(addons) ? addons : [];
  const seen = new Set();
  const result = [];
  const dropped = [];
  for (const a of arr) {
    if (typeof a !== 'string') continue;
    const v = a.trim();
    if (!v) continue;
    if (!allowed.includes(v)) {
      dropped.push(v);
      continue;
    }
    if (seen.has(v)) continue;
    seen.add(v);
    result.push(v);
  }
  if (dropped.length > 0) {
    logger.warn('webhook_addons_dropped', { dropped });
  }
  return result;
}
