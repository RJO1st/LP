import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const scholar_id = searchParams.get('scholar_id');
  const period = searchParams.get('period') || 'week';
  if (!scholar_id) return NextResponse.json({ error: 'Missing scholar_id' }, { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const now = new Date();
  let start;
  if (period === 'week') {
    start = new Date(now.setDate(now.getDate() - 7));
  } else if (period === 'month') {
    start = new Date(now.setMonth(now.getMonth() - 1));
  } else {
    start = new Date(0);
  }

  const { data, error } = await supabase
    .from('quiz_results')
    .select('completed_at, subject')
    .eq('scholar_id', scholar_id)
    .gte('completed_at', start.toISOString())
    .order('completed_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const dayMap = new Map();
  data.forEach(row => {
    const day = new Date(row.completed_at).toISOString().split('T')[0];
    const key = `${day}_${row.subject}`;
    dayMap.set(key, (dayMap.get(key) || 0) + 5);
  });

  const result = [];
  dayMap.forEach((minutes, key) => {
    const [date, subject] = key.split('_');
    result.push({ date, subject, minutes });
  });

  return NextResponse.json(result);
}