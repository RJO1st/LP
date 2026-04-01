/**
 * /auth/callback
 * Handles Supabase PKCE auth code exchange.
 *
 * When Supabase uses PKCE flow (default for SSR), it redirects here
 * with ?code=... after verifying email links (password reset, magic link, etc).
 * This route exchanges the code for a session, then redirects to the
 * intended destination.
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/dashboard/parent";

  if (code) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Server component can't set cookies — that's ok,
              // the middleware or client will pick them up.
            }
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // For password recovery, redirect to the reset-password page
      // (the session is now established so the page will detect it)
      const type = searchParams.get("type");
      if (type === "recovery") {
        return NextResponse.redirect(`${origin}/reset-password`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // If code exchange fails or no code provided, redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
