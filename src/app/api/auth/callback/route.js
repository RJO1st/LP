// ═══════════════════════════════════════════════════════════════════════════
// AUTH CALLBACK HANDLER
// File: src/app/auth/callback/route.js
// Handles email verification redirect from Supabase
// ═══════════════════════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/dashboard/parent';

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Exchange code for session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Create parent record now that email is verified
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 7);

      await supabase
        .from('parents')
        .upsert({
          id: data.user.id,
          full_name: data.user.user_metadata?.full_name || 'Parent',
          email: data.user.email,
          subscription_status: 'trial',
          trial_end: trialEnd.toISOString(),
          max_children: 3,
          billing_cycle: 'monthly'
        }, {
          onConflict: 'id'
        });

      // Send welcome email
      try {
        await fetch(`${requestUrl.origin}/api/send-welcome-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: data.user.email,
            name: data.user.user_metadata?.full_name || 'Parent'
          })
        });
      } catch (err) {
        console.error('Welcome email failed:', err);
      }

      // Redirect to dashboard
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
  }

  // Error - redirect to login
  return NextResponse.redirect(new URL('/login?type=parent&error=verification_failed', requestUrl.origin));
}