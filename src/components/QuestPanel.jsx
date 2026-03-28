"use client";
// ============================================================================
// QuestPanel - Daily & Weekly Quest Display Component
// ============================================================================
import React, { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

const TrophyIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
    <path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
  </svg>
);

const ClockIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);

export default function QuestPanel({ scholarId, onBossBattle }) {
  const [quests, setQuests] = useState([]);
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  useEffect(() => {
    if (scholarId) fetchQuests();
  }, [scholarId]);

  const fetchQuests = async () => {
    try {
      const { data, error } = await supabase
        .from('scholar_quests')
        .select('*')
        .eq('scholar_id', scholarId)
        .eq('status', 'active')
        .order('quest_type', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuests(data || []);
    } catch (error) {
      console.error('Error fetching quests:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeRemaining = (expiresAt) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires - now;

    if (diff <= 0) return 'Expired';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-6 border-2 border-slate-100 animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-1/2 mb-4"></div>
        <div className="space-y-3">
          <div className="h-20 bg-slate-100 rounded-2xl"></div>
          <div className="h-20 bg-slate-100 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (quests.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-6 border-2 border-slate-100">
        <h3 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
          <TrophyIcon size={20} />
          Active Quests
        </h3>
        <div className="text-center py-8">
          <div className="text-5xl mb-3">🎯</div>
          <p className="text-slate-600 font-bold">No active quests</p>
          <p className="text-sm text-slate-400 mt-1">New quests assigned daily!</p>
        </div>
      </div>
    );
  }

  const dailyQuests = quests.filter(q => q.quest_type === 'daily');
  const weeklyQuests = quests.filter(q => q.quest_type === 'weekly');
  const personalisedQuests = quests.filter(q => q.quest_type === 'personalised');
  const bossQuests = quests.filter(q => q.quest_type === 'boss_battle');

  return (
    <div className="bg-white rounded-3xl p-6 border-2 border-slate-100">
      <h3 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
        <TrophyIcon size={20} />
        Active Quests
      </h3>

      {/* Daily Quests */}
      {dailyQuests.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
            Daily Quests
          </h4>
          <div className="space-y-2">
            {dailyQuests.map(quest => {
              const progress = Math.min(100, (quest.current_progress / quest.target_value) * 100);
              const isComplete = quest.current_progress >= quest.target_value;

              return (
                <div
                  key={quest.id}
                  className={`p-3 rounded-2xl border-2 transition-all ${
                    isComplete
                      ? 'bg-emerald-50 border-emerald-300'
                      : 'bg-blue-50 border-blue-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h5 className="font-black text-sm text-slate-900 mb-1">
                        {quest.quest_name}
                      </h5>
                      <p className="text-xs text-slate-600 leading-snug">
                        {quest.quest_description}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-bold text-slate-500">
                      <ClockIcon size={12} />
                      {getTimeRemaining(quest.expires_at)}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-2">
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-slate-600">
                        {quest.current_progress} / {quest.target_value}
                      </span>
                      <span className={isComplete ? 'text-emerald-600' : 'text-blue-600'}>
                        {Math.round(progress)}%
                      </span>
                    </div>
                    <div className="bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          isComplete ? 'bg-emerald-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Rewards */}
                  <div className="flex items-center gap-3 text-xs font-black">
                    {isComplete ? (
                      <span className="text-emerald-600 flex items-center gap-1">
                        ✓ Completed!
                      </span>
                    ) : (
                      <>
                        <span className="text-emerald-600">+{quest.xp_reward} XP</span>
                        <span className="text-yellow-600">+{quest.coin_reward} coins</span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Weekly Quests */}
      {weeklyQuests.length > 0 && (
        <div>
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
            Weekly Quests
          </h4>
          <div className="space-y-2">
            {weeklyQuests.map(quest => {
              const progress = Math.min(100, (quest.current_progress / quest.target_value) * 100);
              const isComplete = quest.current_progress >= quest.target_value;

              return (
                <div
                  key={quest.id}
                  className={`p-3 rounded-2xl border-2 transition-all ${
                    isComplete
                      ? 'bg-emerald-50 border-emerald-300'
                      : 'bg-purple-50 border-purple-200 hover:border-purple-300'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h5 className="font-black text-sm text-slate-900 mb-1">
                        {quest.quest_name}
                      </h5>
                      <p className="text-xs text-slate-600 leading-snug">
                        {quest.quest_description}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-bold text-slate-500">
                      <ClockIcon size={12} />
                      {getTimeRemaining(quest.expires_at)}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-2">
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-slate-600">
                        {quest.current_progress} / {quest.target_value}
                      </span>
                      <span className={isComplete ? 'text-emerald-600' : 'text-purple-600'}>
                        {Math.round(progress)}%
                      </span>
                    </div>
                    <div className="bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          isComplete ? 'bg-emerald-500' : 'bg-purple-500'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Rewards */}
                  <div className="flex items-center gap-3 text-xs font-black">
                    {isComplete ? (
                      <span className="text-emerald-600 flex items-center gap-1">
                        ✓ Completed!
                      </span>
                    ) : (
                      <>
                        <span className="text-emerald-600">+{quest.xp_reward} XP</span>
                        <span className="text-yellow-600">+{quest.coin_reward} coins</span>
                        {quest.badge_reward && (
                          <span className="text-purple-600">+Badge</span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Boss Battles */}
      {bossQuests.length > 0 && (
        <div className="mt-4">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
            Boss Battle
          </h4>
          <div className="space-y-2">
            {bossQuests.map(quest => {
              const metadata = typeof quest.metadata === 'string'
                ? (() => { try { return JSON.parse(quest.metadata); } catch { return {}; } })()
                : (quest.metadata || {});
              const isComplete = quest.current_progress >= quest.target_value;

              return (
                <div
                  key={quest.id}
                  onClick={() => !isComplete && onBossBattle?.(quest)}
                  className={`p-3 rounded-2xl border-2 transition-all ${
                    isComplete
                      ? 'bg-emerald-50 border-emerald-300'
                      : 'bg-red-50 border-red-200 hover:border-red-400 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{metadata.icon || '👹'}</span>
                    <div className="flex-1">
                      <h5 className="font-black text-sm text-slate-900">
                        {quest.quest_name}
                      </h5>
                      <p className="text-xs text-slate-600 leading-snug">
                        {quest.quest_description}
                      </p>
                    </div>
                    {!isComplete && (
                      <span className="bg-red-600 text-white text-xs font-black px-3 py-1.5 rounded-xl whitespace-nowrap">
                        Fight!
                      </span>
                    )}
                    {isComplete && (
                      <span className="text-emerald-600 text-xs font-black">Defeated!</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs font-black mt-2">
                    <span className="text-emerald-600">+{quest.xp_reward} XP</span>
                    <span className="text-yellow-600">+{quest.coin_reward} coins</span>
                    <span className="text-slate-400 ml-auto flex items-center gap-1">
                      <ClockIcon size={12} /> {getTimeRemaining(quest.expires_at)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Personalised Quests */}
      {personalisedQuests.length > 0 && (
        <div className="mt-4">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
            Your Quests
          </h4>
          <div className="space-y-2">
            {personalisedQuests.map(quest => {
              const metadata = typeof quest.metadata === 'string'
                ? (() => { try { return JSON.parse(quest.metadata); } catch { return {}; } })()
                : (quest.metadata || {});
              const progress = Math.min(100, (quest.current_progress / quest.target_value) * 100);
              const isComplete = quest.current_progress >= quest.target_value;

              return (
                <div
                  key={quest.id}
                  className={`p-3 rounded-2xl border-2 transition-all ${
                    isComplete
                      ? 'bg-emerald-50 border-emerald-300'
                      : 'bg-amber-50 border-amber-200 hover:border-amber-300'
                  }`}
                >
                  <div className="flex items-start gap-2 mb-2">
                    <span className="text-lg">{metadata.icon || '🎯'}</span>
                    <div className="flex-1">
                      <h5 className="font-black text-sm text-slate-900 mb-0.5">
                        {quest.quest_name}
                      </h5>
                      <p className="text-xs text-slate-600 leading-snug">
                        {quest.quest_description}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-bold text-slate-500">
                      <ClockIcon size={12} />
                      {getTimeRemaining(quest.expires_at)}
                    </div>
                  </div>
                  <div className="mb-2">
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-slate-600">
                        {quest.current_progress} / {quest.target_value}
                      </span>
                      <span className={isComplete ? 'text-emerald-600' : 'text-amber-600'}>
                        {Math.round(progress)}%
                      </span>
                    </div>
                    <div className="bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          isComplete ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-black">
                    {isComplete ? (
                      <span className="text-emerald-600">✓ Completed!</span>
                    ) : (
                      <>
                        <span className="text-emerald-600">+{quest.xp_reward} XP</span>
                        <span className="text-yellow-600">+{quest.coin_reward} coins</span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
