import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
  console.log('📡 Scholar API called');
  try {
    // 1. Check environment variables
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    console.log('Supabase URL:', url ? '✅ present' : '❌ missing');
    console.log('Service Role Key:', key ? '✅ present' : '❌ missing');

    if (!url || !key) {
      return NextResponse.json(
        { error: 'Server configuration error (missing env)' },
        { status: 500 }
      );
    }

    // 2. Parse request body
    const { code } = await request.json();
    console.log('Code received:', code);

    // 3. Create Supabase admin client
    const supabaseAdmin = createClient(url, key);

    // 4. Query the scholars table (adjust table name if needed)
    const { data, error } = await supabaseAdmin
      .from('scholars')
      .select('id, name, year, total_xp')
      .eq('access_code', code)
      .maybeSingle();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      );
    }

    if (!data) {
      console.log('No scholar found for code:', code);
      return NextResponse.json(
        { error: 'Scholar code not found' },
        { status: 404 }
      );
    }

    console.log('Scholar found:', data);
    return NextResponse.json({ scholar: data }, { status: 200 });
  } catch (err) {
    console.error('Unhandled exception:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}