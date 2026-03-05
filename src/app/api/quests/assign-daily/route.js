import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role key
);

const DAILY_QUESTS = [
  {
    id: 'complete_5_questions',
    name: 'Daily Practice',
    description: 'Complete 5 questions in any subject',
    target: 5,
    xpReward: 50,
    coinReward: 10,
  },
  {
    id: 'achieve_80_accuracy',
    name: 'Sharp Shooter',
    description: 'Achieve 80% accuracy or higher',
    target: 80,
    xpReward: 75,
    coinReward: 15,
  },
  {
    id: 'complete_3_maths',
    name: 'Numbers Day',
    description: 'Complete 3 maths questions',
    target: 3,
    xpReward: 40,
    coinReward: 8,
  },
];

function shuffle(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

export async function GET(req) {
  try {
    // Verify authorization
    const authHeader = req.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;
    
    if (authHeader !== expectedAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all scholars
    const { data: scholars, error: scholarsError } = await supabase
      .from('scholars')
      .select('id');

    if (scholarsError) throw scholarsError;

    let successCount = 0;
    let errorCount = 0;

    for (const scholar of scholars || []) {
      try {
        // Expire old daily quests
        await supabase
          .from('scholar_quests')
          .update({ status: 'expired' })
          .eq('scholar_id', scholar.id)
          .eq('quest_type', 'daily')
          .eq('status', 'active')
          .lt('expires_at', new Date().toISOString());

        // Pick 3 random quests
        const selectedQuests = shuffle(DAILY_QUESTS).slice(0, 3);

        const expiresAt = new Date();
        expiresAt.setHours(23, 59, 59, 999);

        const questsToInsert = selectedQuests.map(quest => ({
          scholar_id: scholar.id,
          quest_type: 'daily',
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

        const { error: insertError } = await supabase
          .from('scholar_quests')
          .insert(questsToInsert);

        if (insertError) throw insertError;
        successCount++;
      } catch (err) {
        console.error(`Error assigning quests to scholar ${scholar.id}:`, err);
        errorCount++;
      }
    }

    return NextResponse.json({
      success: true,
      totalScholars: scholars?.length || 0,
      successCount,
      errorCount,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in assign-daily:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}