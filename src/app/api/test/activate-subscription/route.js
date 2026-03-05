import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const { billing_cycle } = await req.json();

    // 🧪 DEVELOPMENT ONLY: Get test user from header
    const testUserId = req.headers.get('x-test-user-id');
    const testUserEmail = req.headers.get('x-test-user-email');

    let userId;
    let userEmail;

    if (testUserId && testUserEmail) {
      // Use test credentials
      userId = testUserId;
      userEmail = testUserEmail;
      console.log('🧪 TEST MODE: Using test user', userEmail);
    } else {
      // Try to get the real authenticated user
      const cookieHeader = req.headers.get('cookie');
      const supabaseAuth = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          global: {
            headers: { cookie: cookieHeader || '' }
          }
        }
      );
      const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
      if (authError || !user) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
      }
      userId = user.id;
      userEmail = user.email;
    }

    // Calculate subscription end date
    const subscriptionEnd = new Date();
    if (billing_cycle === 'annual') {
      subscriptionEnd.setFullYear(subscriptionEnd.getFullYear() + 1);
    } else {
      subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1);
    }

    // Check if parent record exists
    const { data: existingParent, error: fetchError } = await supabase
      .from('parents')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (fetchError) throw fetchError;

    let updateError;
    if (!existingParent) {
      // Create new parent record
      console.log('Creating new parent record for user', userId);
      const { error: insertError } = await supabase
        .from('parents')
        .insert({
          id: userId,
          email: userEmail,
          full_name: userEmail?.split('@')[0] || 'Test Parent',
          subscription_status: 'active',
          subscription_end: subscriptionEnd.toISOString(),
          trial_end: null,
          max_children: 3,
        });
      updateError = insertError;
    } else {
      // Update existing parent
      const { error } = await supabase
        .from('parents')
        .update({
          subscription_status: 'active',
          subscription_end: subscriptionEnd.toISOString(),
          trial_end: null,
        })
        .eq('id', userId);
      updateError = error;
    }

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      message: 'Subscription activated (TEST MODE)',
      subscription_end: subscriptionEnd.toISOString()
    });

  } catch (error) {
    console.error('❌ Test activation error:', error);
    return NextResponse.json({
      error: error.message || 'Activation failed',
      details: error.toString()
    }, { status: 500 });
  }
}