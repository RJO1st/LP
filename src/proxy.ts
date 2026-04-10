// proxy.ts - Rate limiting, CSRF, X-Request-ID, auth & trial enforcement (Next.js 16)
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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
  '/api/forgot-password',
  '/api/forgot-access-code',
  '/api/brevo/',
  '/api/batch-generate',
  '/api/validate-questions',
  '/api/scholar',         // scholar login by access code (no session yet)
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

  let response = NextResponse.next({ request: { headers: newHeaders } });
  response.headers.set('x-request-id', requestId);

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
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
