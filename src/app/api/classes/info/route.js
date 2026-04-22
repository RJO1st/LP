// ─── GET /api/classes/info?code=XXXXXX ───────────────────────────────────────
// Pre-auth endpoint — the /join/[code] page uses this to render class and
// school details before the parent has signed up.
//
// NOTE (April 22 2026 security audit):
//   Previous version had four issues:
//
//   (a) No rate limit. Join codes are 6-char alphanumeric (~2 billion combos),
//       but uppercase-hex via md5 substring (~16M) makes enumeration cheap at
//       line rate. A scanner could hit this endpoint and enumerate every class
//       code across all schools in a few hours. 30/min per IP is plenty for
//       the real-user case (mistype a code twice, succeed on the third try)
//       while adding real friction for enumeration.
//
//   (b) Direct `createClient(URL, SERVICE_ROLE_KEY)` rather than the
//       `getServiceRoleClient()` factory, losing the `typeof window` guard
//       and the single-place log line that tracks service-role use.
//
//   (c) Loose input validation (`length < 4`) let in garbage that generated
//       DB round-trips. Tighten to the actual code shape: 4-12 uppercase
//       alphanumerics.
//
//   (d) No `Cache-Control: no-store`. Responses leak class + school names
//       keyed on a guessable code. Don't let a shared proxy cache them.
// ────────────────────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/security/serviceRole';
import { limit as rateLimit } from '@/lib/security/rateLimit';
import logger from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const JOIN_CODE_RE = /^[A-Z0-9]{4,12}$/;

const SECURE_HEADERS = {
  'Cache-Control': 'no-store, private',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
};

function secureJson(body, status = 200) {
  return NextResponse.json(body, { status, headers: SECURE_HEADERS });
}

function getClientIp(request) {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-real-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const raw = searchParams.get('code') || '';
    const code = raw.toUpperCase().trim();

    // ── 1. Rate limit by IP — enumeration defence ─────────────────────────
    const ip = getClientIp(request);
    const rl = await rateLimit({
      key: `classes-info:${ip}`,
      windowSec: 60,
      max: 30,
    });
    if (!rl.success) {
      return secureJson(
        { error: 'Too many requests. Please try again shortly.' },
        429
      );
    }

    // ── 2. Shape validation — reject nonsense before DB ───────────────────
    if (!JOIN_CODE_RE.test(code)) {
      return secureJson({ error: 'Invalid code format.' }, 400);
    }

    // ── 3. Lookup ─────────────────────────────────────────────────────────
    const admin = getServiceRoleClient();

    const { data: cls, error } = await admin
      .from('classes')
      .select(
        `
        id,
        name,
        year_level,
        curriculum,
        schools ( id, name )
      `
      )
      .eq('join_code', code)
      .maybeSingle();

    if (error) {
      logger.error('classes_info_lookup_failed', { error, code });
      return secureJson({ error: 'Lookup failed.' }, 500);
    }

    if (!cls) {
      return secureJson({ error: 'Class not found.' }, 404);
    }

    return secureJson({
      classId: cls.id,
      className: cls.name,
      yearLevel: cls.year_level,
      curriculum: cls.curriculum,
      schoolId: cls.schools?.id,
      schoolName: cls.schools?.name || 'Your school',
    });
  } catch (err) {
    logger.error('classes_info_unexpected_error', { error: err });
    return secureJson({ error: 'An error occurred.' }, 500);
  }
}
