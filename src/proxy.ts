// proxy.ts - Rate limiting, CSRF, X-Request-ID, auth & trial enforcement (Next.js 16)
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabaseKeys } from '@/lib/env';

// ═══════════════════════════════════════════════════════════════════════════════
// EDGE-COMPATIBLE RATE LIMITER (sliding window, in-process Map)
// NOTE: Resets on cold start. For multi-region production upgrade to Upstash Redis.
// ═══════════════════════════════════════════════════════════════════════════════
interface RateLimitConfig { windowMs: number; maxRequests: number }
interface RateLimitResult { allowed: boolean; remaining: number; resetAt: number }

class EdgeRateLimiter {
  private store = new Map<string, number[]>();
  constructor(private cfg: RateLimitConfig) {}
  check(key: string): RateLimitResult {
    const now = Date.now();
    const windowStart = now - this.cfg.windowMs;
    const hits = (this.store.get(key) ?? []).filter(t => t > windowStart);
    if (hits.length >= this.cfg.maxRequests) {
      return { allowed: false, remaining: 0, resetAt: hits[0] + this.cfg.windowMs - now };
    }
    hits.push(now);
    this.store.set(key, hits);
    return { allowed: true, remaining: this.cfg.maxRequests - hits.length, resetAt: 0 };
  }
}

const forgotLimiter   = new EdgeRateLimiter({ windowMs: 60 * 60 * 1000,  maxRequests: 5  });  // 5/hr
const authLimiter     = new EdgeRateLimiter({ windowMs: 15 * 60 * 1000,  maxRequests: 10 });  // 10/15min
const taraLimiter     = new EdgeRateLimiter({ windowMs: 60 * 1000,        maxRequests: 30 });  // 30/min
const generateLimiter = new EdgeRateLimiter({ windowMs: 60 * 1000,        maxRequests: 5  });  // 5/min

function getRateLimiter(pathname: string): EdgeRateLimiter | null {
  if (pathname === '/api/forgot-password' || pathname === '/api/forgot-access-code') return forgotLimiter;
  if (pathname.startsWith('/api/auth/'))       return authLimiter;
  if (pathname === '/api/tara' || pathname === '/api/chat') return taraLimiter;
  if (pathname === '/api/generate' || pathname === '/api/generate-visuals') return generateLimiter;
  return null;
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-real-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// GEO DETECTION — Vercel injects x-vercel-ip-country at the edge (zero cost).
// We set a __geo cookie (non-HttpOnly so page.jsx can read it) mapping to a
// supported region. Manual overrides via __geo_override cookie take priority.
// ═══════════════════════════════════════════════════════════════════════════════
const GEO_COOKIE          = '__geo';           // client-readable region code
const GEO_OVERRIDE_COOKIE  = '__geo_override'; // user-chosen region, wins over IP
const GEO_COOKIE_MAX_AGE   = 60 * 60 * 24 * 30; // 30 days

// Mapping: ISO country code → LaunchPard region key
// NG = Nigerian experience (NGN pricing, WAEC messaging)
// GB = UK experience (GBP pricing, 11+/GCSE messaging) — default for everyone else
function countryToRegion(country: string | null): 'NG' | 'GB' {
  if (!country) return 'GB';
  const c = country.toUpperCase();
  return c === 'NG' ? 'NG' : 'GB';
}

function getDetectedCountry(req: NextRequest): string | null {
  // Vercel Edge injects this automatically on every request. No cost, no extra lookup.
  return (
    req.headers.get('x-vercel-ip-country') ??
    req.headers.get('cf-ipcountry') ?? // Cloudflare fallback
    null
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CSRF — double-submit cookie pattern
// Front-end must read __Host-csrf cookie and send as x-csrf-token header.
// ═══════════════════════════════════════════════════════════════════════════════
const CSRF_COOKIE  = '__Host-csrf';
const CSRF_HEADER  = 'x-csrf-token';
const STATE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
// Routes that don't need CSRF (cron jobs, auth callbacks, webhooks, public forms)
const CSRF_EXEMPT  = [
  '/api/auth/callback',
  '/api/cron/',
  '/api/webhooks/',
  '/api/paystack/webhook', // Paystack webhook — HMAC-SHA512 signature auth
  '/api/stripe/webhook',   // Stripe webhook — signed by Stripe secret
  '/api/forgot-password',
  '/api/forgot-access-code',
  '/api/brevo/',
  '/api/batch-generate',
  '/api/validate-questions',
  '/api/scholar',         // scholar login by access code (no session yet)
  '/api/tts',             // text-to-speech — called by useReadAloud without CSRF token
  '/api/emails/',         // transactional email triggers (fire-and-forget side effects)
  '/api/schools/interest', // public contact form — no session required
];

function needsCsrf(pathname: string, method: string): boolean {
  if (!pathname.startsWith('/api/')) return false;
  if (!STATE_METHODS.has(method)) return false;
  return !CSRF_EXEMPT.some(exempt => pathname.startsWith(exempt));
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROXY FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const method       = req.method.toUpperCase();
  const ip           = getClientIp(req);

  // ── 1. X-Request-ID ────────────────────────────────────────────────────────
  const requestId = crypto.randomUUID();
  const newHeaders = new Headers(req.headers);
  newHeaders.set('x-request-id', requestId);

  // ── 1a. CSP nonce — per-request, exposed to the app via `x-nonce` header ────
  // The app root layout can call `headers().get('x-nonce')` and pass the value
  // into <Script nonce={...}> and <style nonce={...}> tags. Next.js also
  // automatically propagates the nonce to its own framework <script> tags when
  // a nonce is attached to the request headers.
  //
  // Rollout plan (per security audit, April 22 2026):
  //   Stage 1 (DEFAULT): ship a Report-Only CSP with nonce + 'strict-dynamic'
  //            alongside the existing enforcing CSP from next.config.js
  //            (which still permits 'unsafe-inline' to keep the site working).
  //            Violations are POSTed to CSP_REPORT_URI (Sentry or local).
  //   Stage 2: once 48 hours of no unexpected violations, flip by setting
  //            CSP_ENFORCE=true — the nonce CSP becomes enforcing and the
  //            fallback in next.config.js should be removed in a follow-up PR.
  const cspNonce = Buffer.from(crypto.randomUUID()).toString('base64');
  newHeaders.set('x-nonce', cspNonce);

  let response = NextResponse.next({ request: { headers: newHeaders } });
  response.headers.set('x-request-id', requestId);

  // ── 1b. Geo cookie + CSRF token + CSP nonce — page loads only ─────────────
  if (!pathname.startsWith('/api/') && !pathname.startsWith('/_next/')) {
    // CSP: nonce-based policy. `'strict-dynamic'` tells capable browsers to
    // trust scripts loaded by already-trusted (nonce'd) scripts, and to ignore
    // the host allowlist — which is what we want, because allowlists are
    // bypass-prone. Older browsers fall back to the allowlist we still provide.
    const isDev = process.env.NODE_ENV === 'development';
    const scriptSrc = [
      "'self'",
      `'nonce-${cspNonce}'`,
      "'strict-dynamic'",
      // Keep unsafe-eval in dev for Turbopack. Never in prod.
      isDev ? "'unsafe-eval'" : '',
      // Legacy-browser fallback (strict-dynamic ignores these in modern browsers)
      'https://storage.googleapis.com',
      'https://www.googletagmanager.com',
      isDev ? 'https://vercel.live' : '',
    ].filter(Boolean).join(' ');

    const cspParts = [
      "default-src 'self'",
      `script-src ${scriptSrc}`,
      // Inline styles are still needed until all styled-jsx / Tailwind JIT
      // output can be nonce'd end-to-end; accept the residual risk for now.
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https://*.supabase.co https://avatars.githubusercontent.com https://www.googletagmanager.com",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.openai.com https://openrouter.ai https://storage.googleapis.com https://www.google-analytics.com https://www.googletagmanager.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ];
    const reportUri = process.env.CSP_REPORT_URI;
    if (reportUri) cspParts.push(`report-uri ${reportUri}`);
    const cspValue = cspParts.join('; ');

    // Stage 1 = Report-Only; Stage 2 (CSP_ENFORCE=true) = enforcing.
    // In enforcing mode we also remove the next.config.js static CSP by
    // overwriting the same header name; in report-only mode we leave the
    // enforcing header from next.config.js untouched.
    if (process.env.CSP_ENFORCE === 'true') {
      response.headers.set('Content-Security-Policy', cspValue);
    } else {
      response.headers.set('Content-Security-Policy-Report-Only', cspValue);
    }

    // Geo cookie
    const override = req.cookies.get(GEO_OVERRIDE_COOKIE)?.value;
    const existing = req.cookies.get(GEO_COOKIE)?.value;
    const detected = countryToRegion(getDetectedCountry(req));
    const target   = override === 'NG' || override === 'GB' ? override : detected;
    if (existing !== target) {
      response.cookies.set({
        name: GEO_COOKIE,
        value: target,
        path: '/',
        maxAge: GEO_COOKIE_MAX_AGE,
        sameSite: 'lax',
        httpOnly: false,   // page.jsx must read this client-side
        secure: true,
      });
    }
    response.headers.set('x-launchpard-region', target);

    // CSRF token — generate once per browser session if not already set.
    // Client JS reads this cookie and echoes it as x-csrf-token on every
    // state-mutating request (double-submit cookie pattern).
    const existingCsrf = req.cookies.get(CSRF_COOKIE)?.value;
    if (!existingCsrf) {
      const token = crypto.randomUUID();
      response.cookies.set({
        name:     CSRF_COOKIE,
        value:    token,
        path:     '/',
        sameSite: 'strict',
        secure:   true,
        httpOnly: false,  // MUST be JS-readable for double-submit to work
        // No maxAge — session cookie; rotated on next cold-start
      });
    }
  }

  // ── 2. Rate limiting ────────────────────────────────────────────────────────
  const limiter = getRateLimiter(pathname);
  if (limiter) {
    const { allowed, resetAt } = limiter.check(ip);
    if (!allowed) {
      return new NextResponse(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(Math.ceil(resetAt / 1000)),
            'x-request-id': requestId,
          },
        }
      );
    }
  }

  // ── 3. CSRF validation ──────────────────────────────────────────────────────
  if (needsCsrf(pathname, method)) {
    const cookieToken  = req.cookies.get(CSRF_COOKIE)?.value ?? '';
    const headerToken  = req.headers.get(CSRF_HEADER) ?? '';
    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      return new NextResponse(
        JSON.stringify({ error: 'CSRF token invalid or missing.' }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json', 'x-request-id': requestId },
        }
      );
    }
  }

  // ── 4. Security headers ─────────────────────────────────────────────────────
  response.headers.set('X-DNS-Prefetch-Control', 'off');
  response.headers.set('X-Download-Options', 'noopen');

  // ── 5. Scholar dashboard — no Supabase session required ────────────────────
  // Scholars authenticate via access code stored in localStorage (not Supabase session).
  if (pathname.startsWith('/dashboard/student')) {
    return response;
  }

  // ── 6. Auth & trial check (parents) ────────────────────────────────────────
  // Skip for pure API calls and static assets
  if (pathname.startsWith('/api/') || pathname.startsWith('/_next/')) {
    return response;
  }

  const supabase = createServerClient(
    supabaseKeys.url(),
    supabaseKeys.publishable(),
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          req.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: newHeaders } });
          response.headers.set('x-request-id', requestId);
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          req.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({ request: { headers: newHeaders } });
          response.headers.set('x-request-id', requestId);
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // ── Session check for parent routes ────────────────────────────────────────
  const { data: { session } } = await supabase.auth.getSession();

  if (!session && pathname.startsWith('/dashboard/parent')) {
    const redirectUrl = new URL('/login', req.url);
    redirectUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // ── School staff dashboard routes — require session, redirect to staff login ──
  if (
    !session &&
    (pathname.startsWith('/dashboard/teacher') || pathname.startsWith('/dashboard/proprietor'))
  ) {
    const redirectUrl = new URL('/school-login', req.url);
    redirectUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // ── Trial / subscription check ──────────────────────────────────────────────
  if (session) {
    const { data: parent } = await supabase
      .from('parents')
      .select('subscription_status, subscription_end, trial_end, pro_override')
      .eq('id', session.user.id)
      .single();

    if (parent) {
      const now               = new Date();
      const trialEnd          = parent.trial_end ? new Date(parent.trial_end) : null;
      const subscriptionEnd   = parent.subscription_end ? new Date(parent.subscription_end) : null;
      const trialExpired      = trialEnd && now > trialEnd;
      const subscriptionInactive =
        parent.subscription_status !== 'active' ||
        (subscriptionEnd && now > subscriptionEnd);

      if (trialExpired && subscriptionInactive && !parent.pro_override) {
        const allowedPaths = ['/subscribe', '/dashboard/parent', '/login', '/signup', '/api/', '/'];
        const isAllowed    = allowedPaths.some(p => pathname.startsWith(p));
        if (!isAllowed) {
          return NextResponse.redirect(new URL('/subscribe?expired=true', req.url));
        }
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
