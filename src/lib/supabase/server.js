// src/lib/supabase/server.js
// Next.js 15: cookies() is async and must be awaited.
//
// Uses `supabaseKeys.publishable()` so the migration from the legacy
// `anon` JWT to the new `sb_publishable_*` key happens in one place.
// See src/lib/env.ts for the resolution rule.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseKeys } from "@/lib/env";

export async function createClient() {
  const cookieStore = await cookies(); // <-- MUST be awaited in Next.js 15

  return createServerClient(
    supabaseKeys.url(),
    supabaseKeys.publishable(),
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
            // setAll called from a Server Component — safe to ignore
          }
        },
      },
    }
  );
}