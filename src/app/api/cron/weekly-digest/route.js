// Deploy to: src/app/api/cron/weekly-digest/route.js
//
// Triggered by Vercel Cron every Sunday at 09:00 UTC.
// Add CRON_SECRET to Vercel env vars (any random string, e.g. openssl rand -hex 32).
// Vercel automatically sends it as Authorization: Bearer <CRON_SECRET>.

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendWeeklyDigestEmail } from '@/lib/email';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  // ── Auth ────────────────────────────────────────────────────────────────
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const sent = [], failed = [];

  try {
    // ── Fetch all active parents ───────────────────────────────────────────
    const { data: parents, error: parentsError } = await supabase
      .from('parents')
      .select('id, email, full_name')
      .in('subscription_status', ['trial', 'active']);

    if (parentsError) throw parentsError;

    for (const parent of (parents ?? [])) {
      try {
        // ── Fetch all scholars for this parent (include streak) ────────────
        // Single query — no second scholars fetch needed
        const { data: scholars } = await supabase
          .from('scholars')
          .select('id, name, curriculum, year_level, streak')
          .eq('parent_id', parent.id);

        // ── Build each scholar's digest in parallel ────────────────────────
        const scholarDigests = await Promise.all((scholars ?? []).map(async (scholar) => {
          // Fetch this week's quiz results (single query per scholar)
          const { data: results } = await supabase
            .from('quiz_results')
            .select('score, total_questions, subject, completed_at')
            .eq('scholar_id', scholar.id)
            .gte('completed_at', weekAgo);

          const quizCount = results?.length ?? 0;
          const accuracy  = quizCount > 0
            ? Math.round(results.reduce((s, r) => s + (r.score / r.total_questions) * 100, 0) / quizCount)
            : 0;
          const xpEarned  = results?.reduce((s, r) => s + (r.score * 10), 0) ?? 0;

          // Most-practiced subject this week
          const subjectCounts = {};
          results?.forEach(r => { subjectCounts[r.subject] = (subjectCounts[r.subject] ?? 0) + 1; });
          const topSubjectRaw = Object.entries(subjectCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
          const topSubject    = topSubjectRaw
            ? topSubjectRaw.charAt(0).toUpperCase() + topSubjectRaw.slice(1).replace(/_/g, ' ')
            : null;

          return {
            name:       scholar.name,
            quizCount,
            accuracy,
            xpEarned,
            streak:     scholar.streak ?? 0,  // already on the row — no second query
            topSubject,
          };
        }));

        await sendWeeklyDigestEmail({
          parentEmail: parent.email,
          parentName:  parent.full_name,
          scholars:    scholarDigests,
        });
        sent.push(parent.email);

      } catch (err) {
        // Per-parent failure is isolated — other parents still get their email
        console.error(`[weekly cron] failed for ${parent.email}:`, err?.message);
        failed.push(parent.email);
      }
    }
  } catch (err) {
    console.error('[weekly cron] fatal:', err?.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  return NextResponse.json({ sent: sent.length, failed: failed.length, sentList: sent });
}