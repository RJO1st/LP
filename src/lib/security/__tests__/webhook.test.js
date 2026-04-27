/**
 * webhook.test.js
 *
 * Tests for the webhook security helpers — HMAC verification, enum validation,
 * and addon sanitisation. These gate payment events: regressions here mean
 * either unpaid tier upgrades or legitimate payments silently dropped.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';

// Mock the logger so we don't need the full Next.js resolution chain.
vi.mock('@/lib/logger', () => ({
  default: {
    warn:  vi.fn(),
    error: vi.fn(),
    info:  vi.fn(),
  },
}));

import { verifyHmac, validateEnumValue, sanitiseAddons } from '../webhook.js';
import logger from '@/lib/logger';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeHmac(rawBody, secret, algo = 'sha512') {
  return crypto.createHmac(algo, secret).update(rawBody).digest('hex');
}

// ─────────────────────────────────────────────────────────────────────────────
describe('verifyHmac', () => {
  const secret  = 'test_secret_key';
  const rawBody = '{"event":"charge.success","data":{"reference":"TXN123"}}';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true for a valid sha512 HMAC', () => {
    const sig = makeHmac(rawBody, secret, 'sha512');
    expect(verifyHmac({ rawBody, signatureHeader: sig, secret, algo: 'sha512' })).toBe(true);
  });

  it('returns false when signature is wrong', () => {
    const sig = makeHmac(rawBody, secret, 'sha512').replace(/a/g, 'b');
    expect(verifyHmac({ rawBody, signatureHeader: sig, secret, algo: 'sha512' })).toBe(false);
  });

  it('returns false when rawBody is tampered', () => {
    const sig = makeHmac(rawBody, secret, 'sha512');
    const tamperedBody = rawBody + ' ';
    expect(verifyHmac({ rawBody: tamperedBody, signatureHeader: sig, secret, algo: 'sha512' })).toBe(false);
  });

  it('returns false when secret is wrong', () => {
    const sig = makeHmac(rawBody, secret, 'sha512');
    expect(verifyHmac({ rawBody, signatureHeader: sig, secret: 'wrong_secret', algo: 'sha512' })).toBe(false);
  });

  it('returns false when signatureHeader is null', () => {
    expect(verifyHmac({ rawBody, signatureHeader: null, secret, algo: 'sha512' })).toBe(false);
  });

  it('returns false when signatureHeader is empty string', () => {
    expect(verifyHmac({ rawBody, signatureHeader: '', secret, algo: 'sha512' })).toBe(false);
  });

  it('returns false when secret is empty string', () => {
    const sig = makeHmac(rawBody, secret, 'sha512');
    expect(verifyHmac({ rawBody, signatureHeader: sig, secret: '', algo: 'sha512' })).toBe(false);
  });

  it('logs error when secret is missing', () => {
    const sig = makeHmac(rawBody, secret, 'sha512');
    verifyHmac({ rawBody, signatureHeader: sig, secret: '', algo: 'sha512' });
    expect(logger.error).toHaveBeenCalledWith('webhook_secret_missing', expect.any(Object));
  });

  it('returns false when rawBody is not a string', () => {
    const sig = makeHmac(rawBody, secret);
    expect(verifyHmac({ rawBody: null, signatureHeader: sig, secret, algo: 'sha512' })).toBe(false);
  });

  it('length mismatch returns false without throwing', () => {
    // Short header — guaranteed length mismatch from a sha512 hex (128 chars)
    expect(verifyHmac({ rawBody, signatureHeader: 'abc', secret, algo: 'sha512' })).toBe(false);
  });

  it('works with sha256 algo', () => {
    const sig = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    expect(verifyHmac({ rawBody, signatureHeader: sig, secret, algo: 'sha256' })).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('validateEnumValue', () => {
  const allowed = ['ng_scholar', 'free', 'uk_pro'];

  it('returns valid for an allowed value', () => {
    const result = validateEnumValue('ng_scholar', allowed, 'tier');
    expect(result.valid).toBe(true);
    expect(result.value).toBe('ng_scholar');
  });

  it('trims whitespace before checking', () => {
    const result = validateEnumValue('  ng_scholar  ', allowed, 'tier');
    expect(result.valid).toBe(true);
    expect(result.value).toBe('ng_scholar');
  });

  it('returns invalid for a disallowed value', () => {
    const result = validateEnumValue('ng_exploiter', allowed, 'tier');
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('tier_not_allowed');
  });

  it('returns invalid for null', () => {
    const result = validateEnumValue(null, allowed, 'tier');
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('tier_missing');
  });

  it('returns invalid for empty string', () => {
    const result = validateEnumValue('', allowed, 'tier');
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('tier_missing');
  });

  it('returns invalid for non-string number', () => {
    const result = validateEnumValue(42, allowed, 'tier');
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('tier_not_string');
  });

  it('is case-sensitive — uppercase rejected', () => {
    const result = validateEnumValue('NG_SCHOLAR', allowed, 'tier');
    expect(result.valid).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('sanitiseAddons', () => {
  const allowed = ['waec_boost', 'ai_unlimited', 'family_child'];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns clean array of allowed addons', () => {
    const result = sanitiseAddons(['waec_boost', 'ai_unlimited'], allowed);
    expect(result).toEqual(['waec_boost', 'ai_unlimited']);
  });

  it('drops unknown addon values', () => {
    const result = sanitiseAddons(['waec_boost', 'hacked_tier'], allowed);
    expect(result).toEqual(['waec_boost']);
  });

  it('logs warn when unknown addons are dropped', () => {
    sanitiseAddons(['unknown_addon'], allowed);
    expect(logger.warn).toHaveBeenCalledWith('webhook_addons_dropped', expect.objectContaining({
      dropped: ['unknown_addon'],
    }));
  });

  it('deduplicates repeated allowed values', () => {
    const result = sanitiseAddons(['waec_boost', 'waec_boost', 'ai_unlimited'], allowed);
    expect(result).toEqual(['waec_boost', 'ai_unlimited']);
  });

  it('handles non-array input (null) → returns []', () => {
    expect(sanitiseAddons(null, allowed)).toEqual([]);
  });

  it('handles empty array → returns []', () => {
    expect(sanitiseAddons([], allowed)).toEqual([]);
  });

  it('trims whitespace from addon strings', () => {
    const result = sanitiseAddons(['  waec_boost  '], allowed);
    expect(result).toEqual(['waec_boost']);
  });

  it('drops non-string entries', () => {
    const result = sanitiseAddons([42, null, 'waec_boost'], allowed);
    expect(result).toEqual(['waec_boost']);
  });

  it('does not log warn when all addons are valid', () => {
    sanitiseAddons(['waec_boost'], allowed);
    expect(logger.warn).not.toHaveBeenCalled();
  });
});
