// proxy.ts - Trial period enforcement with Scholar support (Next.js 15+ format)
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function proxy(req: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          req.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: any) {
          req.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  const { pathname } = req.nextUrl;

  // ═══════════════════════════════════════════════════════════════
  // SCHOLAR DASHBOARD - NO SESSION REQUIRED
  // ═══════════════════════════════════════════════════════════════
  // Scholars authenticate via localStorage (not Supabase session)
  // Allow access without checking session
  if (pathname.startsWith('/dashboard/student')) {
    return response;
  }

  // ═══════════════════════════════════════════════════════════════
  // SESSION CHECK FOR PARENT ROUTES
  // ═══════════════════════════════════════════════════════════════
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // If no session and trying to access protected parent route, redirect to login
  if (!session && pathname.startsWith('/dashboard/parent')) {
    const redirectUrl = new URL('/login', req.url);
    redirectUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // ═══════════════════════════════════════════════════════════════
  // TRIAL/SUBSCRIPTION CHECK FOR PARENTS
  // ═══════════════════════════════════════════════════════════════
  if (session) {
    const { data: parent } = await supabase
      .from('parents')
      .select('subscription_status, subscription_end, trial_end, pro_override')
      .eq('id', session.user.id)
      .single();

    if (parent) {
      const now = new Date();
      const trialEnd = parent.trial_end ? new Date(parent.trial_end) : null;
      const subscriptionEnd = parent.subscription_end ? new Date(parent.subscription_end) : null;

      // Check if trial has expired
      const trialExpired = trialEnd && now > trialEnd;
      
      // Check if subscription is inactive or expired
      const subscriptionInactive = 
        parent.subscription_status !== 'active' ||
        (subscriptionEnd && now > subscriptionEnd);

      // If both trial and subscription are expired/inactive, redirect to subscribe
      if (trialExpired && subscriptionInactive && !parent.pro_override) {
        // Allow access to subscribe page and account settings
        const allowedPaths = [
          '/subscribe',
          '/dashboard/parent',
          '/login',
          '/signup',
          '/api/',
          '/',
        ];
        
        const isAllowed = allowedPaths.some(path => pathname.startsWith(path));
        
        if (!isAllowed) {
          const redirectUrl = new URL('/subscribe?expired=true', req.url);
          return NextResponse.redirect(redirectUrl);
        }
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (*.svg, *.png, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};