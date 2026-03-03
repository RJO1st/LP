import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const scholar_id = searchParams.get('scholar_id');
  if (!scholar_id) {
    return NextResponse.json({ error: 'Missing scholar_id' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data, error } = await supabase
    .from('scholar_skills')
    .select(`
      proficiency,
      last_updated,
      skills ( subject, topic, year_level, description )
    `)
    .eq('scholar_id', scholar_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}