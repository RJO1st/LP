import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const scholar_id = searchParams.get('scholar_id');
  const period = searchParams.get('period') || 'month';
  if (!scholar_id) return NextResponse.json({ error: 'Missing scholar_id' }, { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const now = new Date();
  let start;
  if (period === 'week') start = new Date(now.setDate(now.getDate() - 7));
  else if (period === 'month') start = new Date(now.setMonth(now.getMonth() - 1));
  else start = new Date(0);

  const { data, error } = await supabase
    .from('quiz_results')
    .select('completed_at, details')
    .eq('scholar_id', scholar_id)
    .gte('completed_at', start.toISOString())
    .order('completed_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const dayMap = new Map();
  data.forEach(row => {
    const day = new Date(row.completed_at).toISOString().split('T')[0];
    if (!row.details || !Array.isArray(row.details)) return;
    const correctCount = row.details.filter(d => d.correct).length;
    const accuracy = (correctCount / row.details.length) * 100;
    if (!dayMap.has(day)) {
      dayMap.set(day, { total: 0, count: 0 });
    }
    const entry = dayMap.get(day);
    entry.total += accuracy;
    entry.count += 1;
  });

  const result = [];
  dayMap.forEach((value, date) => {
    result.push({ date, accuracy: Math.round(value.total / value.count) });
  });

  return NextResponse.json(result);
}