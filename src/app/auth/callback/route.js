import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
console.log('Cookie header:', cookieHeader);
const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
console.log('Auth result:', { user: user?.email, authError });
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Get the redirect URL from the query string, fallback to parent dashboard
  const redirectTo = searchParams.get("redirectTo") || "/dashboard/parent";

  if (code) {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
          set(name, value, options) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name, options) {
            cookieStore.delete({ name, ...options });
          },
        },
      }
    );
    await supabase.auth.exchangeCodeForSession(code);
  }

  // After exchanging the code, redirect the user to the intended destination
  return NextResponse.redirect(`${origin}${redirectTo}`);
}