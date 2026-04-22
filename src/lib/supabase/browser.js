// src/lib/supabase/browser.js
// Browser Supabase client. Uses `supabaseKeys.publishable()` so the
// migration from legacy `anon` JWT to new `sb_publishable_*` key is
// controlled from src/lib/env.ts.

import { createBrowserClient } from "@supabase/ssr";
import { supabaseKeys } from "@/lib/env";

export function createClient() {
  return createBrowserClient(
    supabaseKeys.url(),
    supabaseKeys.publishable()
  );
}