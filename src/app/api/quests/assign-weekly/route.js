import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { supabaseKeys } from '@/lib/env'
import { getServiceRoleClient } from '@/lib/security/serviceRole'

const supabase = getServiceRoleClient();

const WEEKLY_QUESTS = [
  {
    id: 'complete_25_questions',
    name: 'Weekly Warrior',
    description: 'Complete 25 questions this week',
    target: 25,
    xpReward: 200,
    coinReward: 50,
  },
  {
    id: 'master_all_subjects',
    name: 'Subject Explorer',
    description: 'Complete questions in 3 different subjects',
    target: 3,
    xpReward: 250,
    coinReward: 60,
  },
];

export async function GET(req) {
  try {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: scholars } = await supabase.from('scholars').select('id');

    let successCount = 0;

    for (const scholar of scholars || []) {
      try {
        await supabase
          .from('scholar_quests')
          .update({ status: 'expired' })
          .eq('scholar_id', scholar.id)
          .eq('quest_type', 'weekly')
          .eq('status', 'active')
          .lt('expires_at', new Date().toISOString());

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        expiresAt.setHours(23, 59, 59, 999);

        const questsToInsert = WEEKLY_QUESTS.map(quest => ({
          scholar_id: scholar.id,
          quest_type: 'weekly',
          quest_id: quest.id,
          quest_name: quest.name,
          quest_description: quest.description,
          target_value: quest.target,
          current_progress: 0,
          xp_reward: quest.xpReward,
          coin_reward: quest.coinReward,
          expires_at: expiresAt.toISOString(),
          status: 'active'
        }));

        await supabase.from('scholar_quests').insert(questsToInsert);
        successCount++;
      } catch (err) {
        console.error(`Error for scholar ${scholar.id}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      totalScholars: scholars?.length || 0,
      successCount,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}