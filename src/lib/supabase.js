// src/lib/supabase.js
// Browser Supabase client — single source of truth for non-SSR components.
// Uses the `supabaseKeys` helpers so the publishable/secret migration is
// handled in ONE place (src/lib/env.ts). Never read NEXT_PUBLIC_SUPABASE_* here.
import { createBrowserClient } from "@supabase/ssr";
import { supabaseKeys } from "@/lib/env";

export const supabase = createBrowserClient(
  supabaseKeys.url(),
  supabaseKeys.publishable()
);
