// ============================================================================
// Daily & Weekly Quest System
// ============================================================================
import { supabase } from './supabase';

// ─── QUEST DEFINITIONS ──────────────────────────────────────────────────────
export const DAILY_QUESTS = {
  complete_5_questions: {
    id: 'complete_5_questions',
    name: 'Daily Practice',
    description: 'Complete 5 questions in any subject',
    target: 5,
    xpReward: 50,
    coinReward: 10,
    trackingField: 'questions_completed'
  },
  achieve_80_accuracy: {
    id: 'achieve_80_accuracy',
    name: 'Sharp Shooter',
    description: 'Achieve 80% accuracy or higher on a quiz',
    target: 80,
    xpReward: 75,
    coinReward: 15,
    trackingField: 'min_accuracy'
  },
  complete_3_maths: {
    id: 'complete_3_maths',
    name: 'Numbers Day',
    description: 'Complete 3 maths questions',
    target: 3,
    xpReward: 40,
    coinReward: 8,
    subject: 'maths',
    trackingField: 'questions_completed'
  },
  complete_3_english: {
    id: 'complete_3_english',
    name: 'Word Wizard',
    description: 'Complete 3 English questions',
    target: 3,
    xpReward: 40,
    coinReward: 8,
    subject: 'english',
    trackingField: 'questions_completed'
  },
  speed_challenge: {
    id: 'speed_challenge',
    name: 'Speed Run',
    description: 'Complete a question in under 30 seconds',
    target: 1,
    xpReward: 60,
    coinReward: 12,
    trackingField: 'fast_answers'
  },
  perfect_streak: {
    id: 'perfect_streak',
    name: 'Perfection',
    description: 'Answer 3 questions correctly in a row',
    target: 3,
    xpReward: 100,
    coinReward: 20,
    trackingField: 'consecutive_correct'
  }
};

export const WEEKLY_QUESTS = {
  complete_25_questions: {
    id: 'complete_25_questions',
    name: 'Weekly Warrior',
    description: 'Complete 25 questions this week',
    target: 25,
    xpReward: 200,
    coinReward: 50,
    trackingField: 'questions_completed'
  },
  master_all_subjects: {
    id: 'master_all_subjects',
    name: 'Subject Explorer',
    description: 'Complete at least 3 questions in 3 different subjects',
    target: 3,
    xpReward: 250,
    coinReward: 60,
    trackingField: 'unique_subjects',
    badgeReward: 'explorer_badge'
  },
  achieve_90_weekly: {
    id: 'achieve_90_weekly',
    name: 'Elite Accuracy',
    description: 'Maintain 90% accuracy across 10 questions',
    target: 90,
    xpReward: 300,
    coinReward: 75,
    trackingField: 'weekly_accuracy'
  },
  five_day_streak: {
    id: 'five_day_streak',
    name: 'Consistency Champion',
    description: 'Practice 5 days in a row this week',
    target: 5,
    xpReward: 350,
    coinReward: 80,
    trackingField: 'practice_days',
    streakShieldReward: 1
  }
};

// ─── QUEST ASSIGNMENT ───────────────────────────────────────────────────────
/**
 * Assign daily quests to a scholar (run daily via cron)
 */
export async function assignDailyQuests(scholarId) {
  try {
    // Get scholar's curriculum and subjects
    const { data: scholar } = await supabase
      .from('scholars')
      .select('curriculum, year_level')
      .eq('id', scholarId)
      .single();
    
    if (!scholar) return;
    
    // Expire old daily quests
    await supabase
      .from('scholar_quests')
      .update({ status: 'expired' })
      .eq('scholar_id', scholarId)
      .eq('quest_type', 'daily')
      .eq('status', 'active')
      .lt('expires_at', new Date().toISOString());
    
    // Pick 3 random daily quests
    const questKeys = Object.keys(DAILY_QUESTS);
    const selectedKeys = shuffle(questKeys).slice(0, 3);
    
    const expiresAt = new Date();
    expiresAt.setHours(23, 59, 59, 999); // End of today
    
    const questsToInsert = selectedKeys.map(key => {
      const quest = DAILY_QUESTS[key];
      return {
        scholar_id: scholarId,
        quest_type: 'daily',
        quest_id: quest.id,
        quest_name: quest.name,
        quest_description: quest.description,
        target_value: quest.target,
        current_progress: 0,
        xp_reward: quest.xpReward,
        coin_reward: quest.coinReward,
        badge_reward: quest.badgeReward,
        expires_at: expiresAt.toISOString(),
        status: 'active'
      };
    });
    
    const { error } = await supabase
      .from('scholar_quests')
      .insert(questsToInsert);
    
    if (error) throw error;
    
    console.log(`Assigned ${questsToInsert.length} daily quests to scholar ${scholarId}`);
    return questsToInsert;
    
  } catch (error) {
    console.error('Error assigning daily quests:', error);
    return [];
  }
}

/**
 * Assign weekly quests (run weekly via cron)
 */
export async function assignWeeklyQuests(scholarId) {
  try {
    // Expire old weekly quests
    await supabase
      .from('scholar_quests')
      .update({ status: 'expired' })
      .eq('scholar_id', scholarId)
      .eq('quest_type', 'weekly')
      .eq('status', 'active')
      .lt('expires_at', new Date().toISOString());
    
    // Assign all weekly quests
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // One week from now
    expiresAt.setHours(23, 59, 59, 999);
    
    const questsToInsert = Object.values(WEEKLY_QUESTS).map(quest => ({
      scholar_id: scholarId,
      quest_type: 'weekly',
      quest_id: quest.id,
      quest_name: quest.name,
      quest_description: quest.description,
      target_value: quest.target,
      current_progress: 0,
      xp_reward: quest.xpReward,
      coin_reward: quest.coinReward,
      badge_reward: quest.badgeReward,
      expires_at: expiresAt.toISOString(),
      status: 'active'
    }));
    
    const { error } = await supabase
      .from('scholar_quests')
      .insert(questsToInsert);
    
    if (error) throw error;
    
    console.log(`Assigned ${questsToInsert.length} weekly quests to scholar ${scholarId}`);
    return questsToInsert;
    
  } catch (error) {
    console.error('Error assigning weekly quests:', error);
    return [];
  }
}

// ─── QUEST PROGRESS TRACKING ────────────────────────────────────────────────
/**
 * Update quest progress after quiz completion
 */
export async function updateQuestProgress(scholarId, quizResult) {
  try {
    const { subject, accuracy, correctCount, totalQuestions, timeSpent } = quizResult;
    
    // Get active quests
    const { data: activeQuests } = await supabase
      .from('scholar_quests')
      .select('*')
      .eq('scholar_id', scholarId)
      .eq('status', 'active');
    
    if (!activeQuests || activeQuests.length === 0) return;
    
    const completedQuests = [];
    
    for (const quest of activeQuests) {
      const questDef = DAILY_QUESTS[quest.quest_id] || WEEKLY_QUESTS[quest.quest_id];
      if (!questDef) continue;
      
      let progressIncrement = 0;
      
      // Calculate progress based on tracking field
      switch (questDef.trackingField) {
        case 'questions_completed':
          if (!questDef.subject || questDef.subject === subject) {
            progressIncrement = totalQuestions;
          }
          break;
          
        case 'min_accuracy':
          if (accuracy >= questDef.target) {
            progressIncrement = 1; // Quest completed
          }
          break;
          
        case 'fast_answers':
          const avgTime = timeSpent / totalQuestions;
          if (avgTime < 30) {
            progressIncrement = 1;
          }
          break;
          
        case 'consecutive_correct':
          // This would need more complex tracking
          progressIncrement = correctCount >= 3 ? questDef.target : 0;
          break;
      }
      
      if (progressIncrement > 0) {
        const newProgress = quest.current_progress + progressIncrement;
        const isCompleted = newProgress >= quest.target_value;
        
        await supabase
          .from('scholar_quests')
          .update({
            current_progress: Math.min(newProgress, quest.target_value),
            status: isCompleted ? 'completed' : 'active',
            completed_at: isCompleted ? new Date().toISOString() : null
          })
          .eq('id', quest.id);
        
        if (isCompleted) {
          // Award rewards
          await awardQuestRewards(scholarId, quest);
          completedQuests.push(quest);
        }
      }
    }
    
    return completedQuests;
    
  } catch (error) {
    console.error('Error updating quest progress:', error);
    return [];
  }
}

/**
 * Award quest rewards to scholar
 */
async function awardQuestRewards(scholarId, quest) {
  try {
    // Update scholar XP and coins
    const { data: scholar } = await supabase
      .from('scholars')
      .select('xp, coins, streak_shields')
      .eq('id', scholarId)
      .single();
    
    if (!scholar) return;
    
    const updates = {
      xp: (scholar.xp || 0) + quest.xp_reward,
      coins: (scholar.coins || 0) + quest.coin_reward
    };
    
    // Add streak shield if quest provides one
    const questDef = DAILY_QUESTS[quest.quest_id] || WEEKLY_QUESTS[quest.quest_id];
    if (questDef?.streakShieldReward) {
      updates.streak_shields = (scholar.streak_shields || 0) + questDef.streakShieldReward;
    }
    
    await supabase
      .from('scholars')
      .update(updates)
      .eq('id', scholarId);
    
    console.log(`Awarded quest rewards to scholar ${scholarId}:`, updates);
    
  } catch (error) {
    console.error('Error awarding quest rewards:', error);
  }
}

// ─── HELPER FUNCTIONS ───────────────────────────────────────────────────────
function shuffle(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

export default {
  assignDailyQuests,
  assignWeeklyQuests,
  updateQuestProgress,
  DAILY_QUESTS,
  WEEKLY_QUESTS
};