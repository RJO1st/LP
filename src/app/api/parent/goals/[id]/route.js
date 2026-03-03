import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function PUT(req, { params }) {
  const { id } = params;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { achieved } = await req.json();

  const { data, error } = await supabase
    .from('parent_goals')
    .update({ achieved, achieved_at: achieved ? new Date().toISOString() : null })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}