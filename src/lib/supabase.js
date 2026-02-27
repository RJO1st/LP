import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Build Safety Check: Warns you in Vercel logs if keys are missing, 
// but provides a placeholder so the build doesn't crash.
if (!supabaseUrl || !supabaseKey) {
  console.warn("⚠️ Warning: Supabase Environment Variables are missing. Please ensure they are added in your Vercel Project Settings.");
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder'
);
