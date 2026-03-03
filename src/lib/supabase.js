// src/lib/supabase.js
// Singleton browser Supabase client.
// Only import this in files marked "use client" — it uses browser APIs.
// Server-side code (API routes, Server Components) should use createClient
// from @supabase/supabase-js with the service role key directly.
import { createBrowserClient } from "@supabase/ssr";

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);