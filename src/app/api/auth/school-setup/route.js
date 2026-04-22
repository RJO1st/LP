// ─── GET /api/auth/school-setup ──────────────────────────────────────────────
// One-time redirect endpoint for school provisioning emails.
//
// Flow:
//   1. Validate + atomically consume the setup token from `schools`
//      (single-use: either this request claims it or it's gone).
//   2. Generate a fresh Supabase auth link for the proprietor's email.
//   3. 302 to the action_link, which lands the user on /onboarding/school.
//
// NOTE (April 22 2026 security audit):
//   Previous version had four issues:
//
//   (a) TOCTOU on token consumption. SELECT-then-UPDATE meant two concurrent
//       requests with the same token (link prefetched by a security scanner
//       plus human click; double-click; Outlook/Gmail link-rewriter) could
//       both pass the SELECT and both reach the magic-link generation step.
//       Both redirect chains would succeed, producing two valid Supabase
//       sessions for the same email — the second user could ride on a link
//       meant for the first. Fix: a single UPDATE ... WHERE setup_token=? that
//       RETURNS the email; only one row gets flipped, losers see no row.
//
//   (b) No `Cache-Control: no-store` on the redirects. The URL carries a
//       one-time token as a query string; some intermediaries (shared CDNs,
//       corporate proxies) cache 302 responses even without explicit cache
//       directives. A proxy that caches this response would replay the
//       redirect (with a fresh action_link embedded) to anyone who hits the
//       same token URL. The action_link itself is short-lived but the
//       redirect-to-action-link pattern still deserves no-store.
//
//   (c) No `Referrer-Policy: no-referrer`. The redirect target is a Supabase
//       URL containing auth tokens in the fragment/query; browsers don't
//       leak fragments in Referer, but we should still be strict because the
//       `/onboarding/school?schoolId=X` page that the action_link redirects
//       to will fetch third-party assets (fonts, analytics) and any of those
//       would receive the previous page's URL in Referer — leaking our
//       one-time setup URL into third-party logs.
//
//   (d) `createClient` instantiated directly instead of going through
//       `getServiceRoleClient()`, bypassing the `typeof window` guard and
//       the single-place logging of every service-role construction.
//
//   (e) No rate limit. An unauthenticated GET that validates opaque tokens
//       is enumerable; 5/min per IP is generous for real users, punishing
//       for scanners.
// ────────────────────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/security/serviceRole';
import { limit as rateLimit } from '@/lib/security/rateLimit';
import logger from '@/lib/logger';

export const runtime = 'nodejs';
// One-time credentials must never be statically cached.
export const dynamic = 'force-dynamic';

// Headers applied to every response from this route. The exact redirect URL
// carries an opaque token; treat the whole response as secret-bearing.
const SECURE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, private',
  'Pragma': 'no-cache',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
};

/**
 * Wrap a NextResponse.redirect with our strict no-cache / no-referrer headers.
 * Callers that build their own responses should use buildSecureResponse instead.
 */
function secureRedirect(url) {
  const res = NextResponse.redirect(url);
  for (const [name, value] of Object.entries(SECURE_HEADERS)) {
    res.headers.set(name, value);
  }
  return res;
}

function getClientIp(request) {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-real-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

// UUID sanity check — rejects obviously malformed `s` params without hitting DB.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Tokens are generated as 64 hex chars (crypto.randomBytes(32)) elsewhere in
// the codebase; reject anything that isn't plausible before touching DB.
const TOKEN_RE = /^[A-Za-z0-9_\-]{16,128}$/;

export async function GET(request) {
  const appUrl = process.env.APP_URL || 'https://launchpard.com';
  const loginUrl = `${appUrl}/school-login`;

  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('t');
    const schoolId = searchParams.get('s');

    // ── 0. Rate-limit by IP before doing anything expensive ───────────────
    const ip = getClientIp(request);
    const rl = await rateLimit({
      key: `school-setup:${ip}`,
      windowSec: 60,
      max: 5,
    });
    if (!rl.success) {
      // Don't reveal to scanners that they're being throttled via the final
      // destination; redirect to login with a generic error.
      logger.warn('school_setup_rate_limited', { ip });
      return secureRedirect(`${loginUrl}?error=rate_limited`);
    }

    // ── 1. Input shape validation ────────────────────────────────────────
    if (
      !token ||
      !schoolId ||
      !UUID_RE.test(schoolId) ||
      !TOKEN_RE.test(token)
    ) {
      logger.info('school_setup_invalid_input', {
        hasToken: !!token,
        hasSchoolId: !!schoolId,
      });
      return secureRedirect(`${loginUrl}?error=invalid_link`);
    }

    const admin = getServiceRoleClient();
    const nowIso = new Date().toISOString();

    // ── 2. Atomic single-use token consumption ────────────────────────────
    // UPDATE ... WHERE setup_token = ? AND not expired, RETURNING the email
    // we need to generate the auth link. PostgREST / Supabase translates
    // `.update().select()` into `UPDATE ... RETURNING` which, by default,
    // returns the NEW row values — so we need to capture the email BEFORE
    // the update nulls it. Supabase doesn't expose the OLD values from
    // RETURNING, so we do a tiny atomic pattern: read email in the same
    // request path that won the UPDATE by checking the rowcount.
    //
    // Because the UPDATE nulls `setup_token_email`, we can't read it from
    // the returned row. So instead we look it up and consume in two steps
    // but gate the consumption on the still-current token value:
    //
    //   (a) SELECT email, expires_at WHERE id = ? AND setup_token = ?
    //   (b) UPDATE ... SET null WHERE id = ? AND setup_token = ?  (race-safe:
    //       second caller sees 0 rows affected because setup_token is now NULL)
    //
    // If (b) affects 0 rows, another request consumed the token between
    // (a) and (b); treat as already-used.
    const { data: school, error: lookupErr } = await admin
      .from('schools')
      .select('id, name, setup_token_email, setup_token_expires_at')
      .eq('id', schoolId)
      .eq('setup_token', token)
      .maybeSingle();

    if (lookupErr) {
      logger.error('school_setup_lookup_failed', {
        schoolId,
        error: lookupErr,
      });
      return secureRedirect(`${loginUrl}?error=auth_failed`);
    }

    if (!school) {
      logger.info('school_setup_token_not_found', { schoolId });
      return secureRedirect(`${loginUrl}?error=invalid_link`);
    }

    if (
      !school.setup_token_expires_at ||
      new Date(school.setup_token_expires_at) < new Date(nowIso)
    ) {
      // Clear the expired token so it can't be probed forever.
      await admin
        .from('schools')
        .update({
          setup_token: null,
          setup_token_email: null,
          setup_token_expires_at: null,
        })
        .eq('id', schoolId)
        .eq('setup_token', token);
      logger.info('school_setup_token_expired', { schoolId });
      return secureRedirect(`${loginUrl}?error=link_expired`);
    }

    const email = school.setup_token_email;
    if (!email) {
      // Shouldn't happen: token is set but email wasn't. Treat as invalid.
      logger.error('school_setup_token_no_email', { schoolId });
      return secureRedirect(`${loginUrl}?error=invalid_link`);
    }

    // Race-safe consume: only the first caller with this token matches.
    const { data: consumed, error: consumeErr } = await admin
      .from('schools')
      .update({
        setup_token: null,
        setup_token_email: null,
        setup_token_expires_at: null,
      })
      .eq('id', schoolId)
      .eq('setup_token', token)
      .select('id');

    if (consumeErr) {
      logger.error('school_setup_consume_failed', {
        schoolId,
        error: consumeErr,
      });
      return secureRedirect(`${loginUrl}?error=auth_failed`);
    }

    if (!consumed || consumed.length === 0) {
      // Another request consumed the token between the SELECT and UPDATE.
      logger.info('school_setup_token_already_consumed', { schoolId });
      return secureRedirect(`${loginUrl}?error=invalid_link`);
    }

    // ── 3. Generate a fresh Supabase auth link ────────────────────────────
    const redirectTo = `${appUrl}/onboarding/school?schoolId=${schoolId}`;

    let actionLink;
    const { data: inviteData, error: inviteErr } =
      await admin.auth.admin.generateLink({
        type: 'invite',
        email,
        options: { redirectTo },
      });

    if (!inviteErr && inviteData?.properties?.action_link) {
      actionLink = inviteData.properties.action_link;
    } else {
      // Existing user — fall through to magic link.
      const { data: magicData, error: magicErr } =
        await admin.auth.admin.generateLink({
          type: 'magiclink',
          email,
          options: { redirectTo },
        });

      if (magicErr || !magicData?.properties?.action_link) {
        logger.error('school_setup_link_generation_failed', {
          schoolId,
          inviteErr,
          magicErr,
        });
        return secureRedirect(`${loginUrl}?error=auth_failed`);
      }

      actionLink = magicData.properties.action_link;
    }

    // ── 4. Redirect to Supabase action link ───────────────────────────────
    logger.info('school_setup_redeemed', { schoolId });
    return secureRedirect(actionLink);
  } catch (err) {
    logger.error('school_setup_unexpected_error', { error: err });
    return secureRedirect(`${loginUrl}?error=auth_failed`);
  }
}
