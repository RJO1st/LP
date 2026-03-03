"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import dynamic from "next/dynamic";
import {
  BADGES, TIER_COLORS, AVATAR_ITEMS, RARITY_COLORS,
  CURRICULA, SUBJECTS_BY_CURRICULUM,
  getLevelInfo, sounds, ensureQuestsAssigned
} from "../../../lib/gamificationEngine";
import SkillHeatmap from "../../../components/parent/SkillHeatmap";
import ProgressChart from "../../../components/game/ProgressChart";


// Lazy-load QuizEngine
const QuizEngine = dynamic(() => import("../../../components/game/QuizEngine"), {
  loading: () => <LoadingScreen message="Launching mission..." />,
});


// ─── ICONS (inlined) ─────────────────────────────────────────────
const Icon = ({ d, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
);
const RocketIcon   = ({ size = 20 }) => <Icon size={size} d={["M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z","m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z","M9 12H4s.5-1 1-4c1.5 0 3 .5 3 .5L9 12Z","M12 15v5s1 .5 4 1c0-1.5-.5-3-.5-3L12 15Z"]} />;
const StarFull     = ({ size = 20 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
const FlameIcon    = ({ size = 20 }) => <Icon size={size} d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />;
const ShieldIcon   = ({ size = 20 }) => <Icon size={size} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />;
const ZapIcon      = ({ size = 20 }) => <Icon size={size} d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />;
const TrophyIcon   = ({ size = 20 }) => <Icon size={size} d={["M6 9H4.5a2.5 2.5 0 0 1 0-5H6","M18 9h1.5a2.5 2.5 0 0 0 0-5H18","M4 22h16","M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22","M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22","M18 2H6v7a6 6 0 0 0 12 0V2z"]} />;
const CheckIcon    = ({ size = 20 }) => <Icon size={size} d="M20 6 9 17l-5-5" />;
const XIcon        = ({ size = 20 }) => <Icon size={size} d="M18 6 6 18M6 6l12 12" />;
const SoundOnIcon  = ({ size = 20 }) => <Icon size={size} d={["M11 5 6 9H2v6h4l5 4V5z","M19.07 4.93a10 10 0 0 1 0 14.14","M15.54 8.46a5 5 0 0 1 0 7.07"]} />;
const SoundOffIcon = ({ size = 20 }) => <Icon size={size} d={["M11 5 6 9H2v6h4l5 4V5z","M23 9l-6 6","M17 9l6 6"]} />;
const CoinIcon     = ({ size = 20 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className="text-yellow-500"><circle cx="12" cy="12" r="10"/><text x="12" y="16" textAnchor="middle" fontSize="11" fill="white" fontWeight="bold">$</text></svg>;

// ─── LOADING SCREEN ───────────────────────────────────────────────
function LoadingScreen({ message = "Loading..." }) {
  return (
    <div className="fixed inset-0 bg-slate-900 flex flex-col items-center justify-center z-50">
      <div className="relative">
        <div className="w-20 h-20 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <RocketIcon size={28} />
        </div>
      </div>
      <p className="text-slate-400 font-bold mt-4 text-sm uppercase tracking-widest">{message}</p>
    </div>
  );
}

// ─── BADGE UNLOCK TOAST ───────────────────────────────────────────
function BadgeToast({ badges, onDone }) {
  const [idx, setIdx] = useState(0);
  const badge = badges[idx];
  if (!badge) return null;
  const tierStyle = TIER_COLORS[badge.tier] || TIER_COLORS.bronze;

  return (
    <div className="fixed top-6 right-6 z-[9999] animate-in slide-in-from-right">
      <div className={`${tierStyle.bg} ${tierStyle.border} border-2 rounded-2xl p-4 shadow-2xl max-w-xs`}>
        <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-1">Badge Unlocked!</p>
        <div className="flex items-center gap-3">
          <span className="text-4xl">{badge.icon}</span>
          <div>
            <p className={`font-black text-lg ${tierStyle.text}`}>{badge.name}</p>
            <p className="text-xs text-slate-500">+{badge.xp} XP · +{badge.coins} coins</p>
          </div>
        </div>
        <button
          onClick={() => idx + 1 < badges.length ? setIdx(idx + 1) : onDone()}
          className="mt-3 w-full bg-slate-900 text-white text-xs font-black py-2 rounded-xl"
        >
          {idx + 1 < badges.length ? `Next Badge (${idx+2}/${badges.length})` : 'Awesome!'}
        </button>
      </div>
    </div>
  );
}

// ─── QUEST COMPLETE TOAST ─────────────────────────────────────────
function QuestToast({ quest, onDone }) {
  if (!quest) return null;
  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] animate-in slide-in-from-top">
      <div className="bg-indigo-600 text-white rounded-2xl p-4 shadow-2xl flex items-center gap-3 max-w-sm">
        <TrophyIcon size={32} />
        <div>
          <p className="text-xs font-black uppercase tracking-widest opacity-80">Quest Complete!</p>
          <p className="font-black">{quest.title}</p>
          <p className="text-xs opacity-80">+{quest.xp} XP · +{quest.coins} coins</p>
        </div>
        <button onClick={onDone} className="ml-auto opacity-60 hover:opacity-100"><XIcon size={16}/></button>
      </div>
    </div>
  );
}

// ─── AVATAR DISPLAY ───────────────────────────────────────────────
function AvatarDisplay({ avatar, size = 'md', onClick }) {
  const sizeClass = { sm: 'w-10 h-10 text-2xl', md: 'w-16 h-16 text-4xl', lg: 'w-24 h-24 text-5xl' }[size];
  const bgMap = { '🌌': 'from-indigo-900 to-purple-900', '🪐': 'from-blue-800 to-slate-900', '🔥': 'from-orange-800 to-red-900' };
  const bg = bgMap[avatar?.background] || 'from-indigo-600 to-violet-700';

  return (
    <button
      onClick={onClick}
      className={`${sizeClass} rounded-full bg-gradient-to-br ${bg} flex items-center justify-center relative shadow-lg border-2 border-white/20 hover:scale-105 transition-transform`}
    >
      <span>{avatar?.base === 'astronaut' ? '👨‍🚀' : '🚀'}</span>
      {avatar?.hat && <span className="absolute -top-1 -right-1 text-lg">{AVATAR_ITEMS[avatar.hat]?.icon}</span>}
      {avatar?.pet && <span className="absolute -bottom-1 -right-1 text-sm">{AVATAR_ITEMS[avatar.pet]?.icon}</span>}
    </button>
  );
}

// ─── AVATAR SHOP MODAL ────────────────────────────────────────────
function AvatarShop({ scholar, earnedBadgeIds, onClose, onPurchase }) {
  const [tab, setTab] = useState('hat');
  const tabs = ['hat', 'accessory', 'pet', 'background'];
  const items = Object.entries(AVATAR_ITEMS).filter(([, v]) => v.category === tab);
  const canAfford = (item) => !item.badgeRequired
    ? (scholar.coins || 0) >= item.coinCost
    : earnedBadgeIds.includes(item.badgeRequired);
  const isUnlocked = (itemId) => {
    const av = scholar.avatar || {};
    return av.hat === itemId || av.pet === itemId || av.accessory === itemId || av.background === itemId;
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[8000] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-[32px] p-6 max-w-md w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-black">Avatar Shop</h2>
          <div className="flex items-center gap-1 bg-yellow-50 px-3 py-1 rounded-full border border-yellow-200">
            <CoinIcon size={16} />
            <span className="font-black text-yellow-700">{scholar.coins || 0}</span>
          </div>
        </div>
        <div className="flex gap-2 mb-4">
          {tabs.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 text-xs font-black rounded-xl capitalize ${tab === t ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
              {t}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {items.map(([id, item]) => {
            const unlocked = isUnlocked(id);
            const affordable = canAfford(item);
            return (
              <button key={id} onClick={() => affordable && !unlocked && onPurchase(id, item)}
                className={`p-3 rounded-2xl border-2 text-center transition-all ${
                  unlocked ? 'border-indigo-400 bg-indigo-50' :
                  affordable ? 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50' :
                  'border-slate-100 opacity-50 cursor-not-allowed'
                }`}>
                <div className="text-3xl mb-1">{item.icon}</div>
                <p className="text-xs font-black text-slate-700 truncate">{item.name}</p>
                <p className={`text-xs font-bold ${RARITY_COLORS[item.rarity]}`}>{item.rarity}</p>
                {unlocked ? (
                  <p className="text-xs text-indigo-600 font-black">Equipped</p>
                ) : item.badgeRequired ? (
                  <p className="text-xs text-slate-400">🏆 {BADGES[item.badgeRequired]?.name}</p>
                ) : (
                  <p className="text-xs text-yellow-600 font-black">{item.coinCost} coins</p>
                )}
              </button>
            );
          })}
        </div>
        <button onClick={onClose} className="mt-4 w-full bg-slate-900 text-white font-black py-3 rounded-2xl">Done</button>
      </div>
    </div>
  );
}

// ─── LEVEL PROGRESS BAR ───────────────────────────────────────────
function LevelBar({ totalXp }) {
  const { current, next, progressPct } = getLevelInfo(totalXp || 0);
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-black text-slate-600 uppercase tracking-wider">{current.title}</span>
        {next && <span className="text-xs text-slate-400 font-bold">→ {next.title}</span>}
      </div>
      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-700"
          style={{ width: `${progressPct}%` }}
        />
      </div>
      <div className="flex justify-between mt-0.5">
        <span className="text-[10px] text-slate-400 font-bold">Lv {current.level}</span>
        <span className="text-[10px] text-slate-400 font-bold">{progressPct}%</span>
      </div>
    </div>
  );
}

// ─── QUEST CARD ───────────────────────────────────────────────────
function QuestCard({ quest }) {
  const pct = Math.min(100, Math.round((quest.progress / quest.target) * 100));
  const isDaily = quest.quest_templates?.quest_type === 'daily';
  const expires = new Date(quest.expires_at);
  const hoursLeft = Math.max(0, Math.round((expires - Date.now()) / 3600000));

  return (
    <div className={`p-3 rounded-xl border-2 ${quest.completed ? 'border-emerald-200 bg-emerald-50' : 'border-slate-100 bg-white'}`}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${isDaily ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
              {isDaily ? '⚡ Daily' : '🌟 Weekly'}
            </span>
          </div>
          <p className="text-sm font-black text-slate-800">{quest.quest_templates?.title}</p>
          <p className="text-xs text-slate-400">{hoursLeft}h left · +{quest.quest_templates?.xp_reward} XP</p>
        </div>
        {quest.completed && <CheckIcon size={20} className="text-emerald-500 flex-shrink-0" />}
      </div>
      {!quest.completed && (
        <div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5 text-right font-bold">{quest.progress}/{quest.target}</p>
        </div>
      )}
    </div>
  );
}

// ─── LEADERBOARD ──────────────────────────────────────────────────
function Leaderboard({ entries, currentScholarId, mode = 'year' }) {
  return (
    <div className="space-y-2">
      {entries.length === 0 && <p className="text-sm text-slate-400">Be first on the board!</p>}
      {entries.map((entry, i) => {
        const isMe = entry.id === currentScholarId;
        const medal = ['🥇','🥈','🥉'][i] || `${i+1}.`;
        return (
          <div key={entry.id}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all ${
              isMe ? 'bg-indigo-50 border-2 border-indigo-200' : 'bg-slate-50 border-2 border-transparent'
            }`}>
            <span className="text-lg w-8 text-center">{medal}</span>
            <AvatarDisplay avatar={entry.avatar} size="sm" />
            <div className="flex-1 min-w-0">
              <p className={`font-black text-sm truncate ${isMe ? 'text-indigo-700' : 'text-slate-700'}`}>
                {entry.name} {isMe ? '(You)' : ''}
              </p>
              <p className="text-xs text-slate-400 font-bold">{entry.personal_best || 0}% best</p>
            </div>
            <div className="text-right">
              <p className={`font-black text-sm ${isMe ? 'text-indigo-600' : 'text-slate-700'}`}>{entry.total_xp} XP</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── BADGE GRID ───────────────────────────────────────────────────
function BadgeGrid({ earnedIds }) {
  const allBadges = Object.entries(BADGES);
  return (
    <div className="flex flex-wrap gap-2">
      {allBadges.map(([id, b]) => {
        const earned = earnedIds.includes(id);
        const tierStyle = TIER_COLORS[b.tier];
        return (
          <div key={id} title={`${b.name}${earned ? ' ✓' : ' (locked)'}`}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl border-2 transition-all ${
              earned ? `${tierStyle.bg} ${tierStyle.border} shadow-md scale-105` : 'bg-slate-100 border-slate-200 grayscale opacity-40'
            }`}>
            {b.icon}
          </div>
        );
      })}
    </div>
  );
}

// ─── SUBJECT CARD ─────────────────────────────────────────────────
const SUBJECT_CONFIG = {
  maths:    { label: 'Maths',    sub: 'Numbers & Logic',  icon: '⚡', color: 'blue',    from: 'from-blue-500',   shadow: 'shadow-blue-200'   },
  english:  { label: 'English',  sub: 'Grammar & Reading',icon: 'Aa', color: 'rose',    from: 'from-rose-500',   shadow: 'shadow-rose-200'   },
  verbal:   { label: 'Verbal',   sub: 'Word Puzzles',     icon: '🧠', color: 'emerald', from: 'from-emerald-500',shadow: 'shadow-emerald-200' },
  nvr:      { label: 'Spatial',  sub: 'NVR & Patterns',   icon: '🧩', color: 'amber',   from: 'from-amber-500',  shadow: 'shadow-amber-200'  },
  science:  { label: 'Science',  sub: 'Forces & Life',    icon: '🔬', color: 'violet',  from: 'from-violet-500', shadow: 'shadow-violet-200' },
  geography:{ label: 'Geography',sub: 'World & Maps',     icon: '🌍', color: 'teal',    from: 'from-teal-500',   shadow: 'shadow-teal-200'   },
  history:  { label: 'History',  sub: 'Time & Events',    icon: '📜', color: 'orange',  from: 'from-orange-500', shadow: 'shadow-orange-200' },
};

function SubjectCard({ subjectId, onClick, proficiency = 0 }) {
  const cfg = SUBJECT_CONFIG[subjectId] || SUBJECT_CONFIG.maths;
  return (
    <button onClick={onClick}
      className={`group relative bg-white p-6 rounded-[28px] border-2 border-slate-100 text-left hover:shadow-xl hover:-translate-y-1 transition-all duration-200 hover:border-${cfg.color}-200 overflow-hidden`}>
      {proficiency > 0 && (
        <div className="absolute top-3 right-3">
          <div className="relative w-8 h-8">
            <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
              <circle cx="16" cy="16" r="13" fill="none" stroke="#e2e8f0" strokeWidth="3"/>
              <circle cx="16" cy="16" r="13" fill="none" stroke="#6366f1" strokeWidth="3"
                strokeDasharray={`${proficiency * 0.817} 100`} strokeLinecap="round"/>
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-indigo-600">{proficiency}%</span>
          </div>
        </div>
      )}
      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${cfg.from} to-${cfg.color}-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg ${cfg.shadow} text-white font-black text-xl`}>
        {typeof cfg.icon === 'string' && cfg.icon.length <= 2 && !cfg.icon.includes('🧠') ? (
          <span className="italic text-sm">{cfg.icon}</span>
        ) : <span>{cfg.icon}</span>}
      </div>
      <h3 className="text-lg font-black text-slate-800 mb-0.5">{cfg.label}</h3>
      <p className="text-slate-400 font-bold text-xs">{cfg.sub}</p>
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ════════════════════════════════════════════════════════════════════
export default function StudentDashboard() {
  const [scholar, setScholar] = useState(null);
  const [activeSubject, setActiveSubject] = useState(null);
  const [previousQuestionIds, setPreviousQuestionIds] = useState([]);
  const [fullSkills, setFullSkills] = useState([]);       // for SkillHeatmap
  const [chartData, setChartData] = useState([]);         // for ProgressChart
  const [showProgress, setShowProgress] = useState(false); // toggle progress section

  // Gamification state
  const [earnedBadges, setEarnedBadges] = useState([]);
  const [newBadges, setNewBadges] = useState([]);
  const [activeQuests, setActiveQuests] = useState([]);
  const [newQuestComplete, setNewQuestComplete] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [skillProficiency, setSkillProficiency] = useState({});
  const [recentQuizzes, setRecentQuizzes] = useState([]);
  const [showAvatarShop, setShowAvatarShop] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [lbMode, setLbMode] = useState('year');

  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  // ── Load scholar from localStorage ───────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem("active_scholar");
    if (!saved) { router.push("/student"); return; }
    setScholar(JSON.parse(saved));
  }, [router]);

  const refreshHistory = useCallback(async (id) => {
    const { data } = await supabase.from("scholar_question_history").select("question_id").eq("scholar_id", id);
    if (data) setPreviousQuestionIds(data.map(h => h.question_id));
  }, [supabase]);

  // ── Load all data when scholar is ready ─────────────────────────
  useEffect(() => {
    if (!scholar?.id) return;
    const load = async () => {
      await Promise.all([
        refreshHistory(scholar.id),
        loadBadges(scholar.id),
        loadQuests(scholar.id),
        loadLeaderboard(scholar.year, scholar.id),
        loadSkills(scholar.id),
        loadRecentQuizzes(scholar.id),
        loadFullSkills(scholar.id),      // for heatmap
        loadAccuracyData(scholar.id),    // for chart
        ensureQuestsAssigned(scholar.id),
      ]);
    };
    load();
  }, [scholar?.id]);

  const loadBadges = async (id) => {
    const { data } = await supabase.from("scholar_badges").select("badge_id").eq("scholar_id", id);
    if (data) setEarnedBadges(data.map(b => b.badge_id));
  };

  const loadQuests = async (id) => {
    const { data } = await supabase
      .from("scholar_quests")
      .select("*, quest_templates(*)")
      .eq("scholar_id", id)
      .gt("expires_at", new Date().toISOString())
      .order("completed")
      .limit(6);
    if (data) setActiveQuests(data);
  };

  const loadLeaderboard = async (year, currentId) => {
    const { data } = await supabase
      .from("scholars")
      .select("id, name, total_xp, personal_best, avatar")
      .eq("year", year)
      .order("total_xp", { ascending: false })
      .limit(10);
    if (data) setLeaderboard(data);
  };

  const loadSkills = async (id) => {
    const { data } = await supabase
      .from("scholar_skills")
      .select("subject, proficiency")
      .eq("scholar_id", id);
    if (data) {
      const map = {};
      data.forEach(s => { map[s.subject] = Math.round(s.proficiency); });
      setSkillProficiency(map);
    }
  };

  const loadFullSkills = async (id) => {
    const res = await fetch(`/api/parent/skills?scholar_id=${id}`);
    if (res.ok) setFullSkills(await res.json());
  };

  const loadAccuracyData = async (id) => {
    const res = await fetch(`/api/parent/accuracy?scholar_id=${id}&period=month`);
    if (res.ok) setChartData(await res.json());
  };

  const loadRecentQuizzes = async (id) => {
    const { data } = await supabase
      .from("quiz_results")
      .select("subject, score, total_questions, completed_at")
      .eq("scholar_id", id)
      .order("completed_at", { ascending: false })
      .limit(5);
    if (data) setRecentQuizzes(data.map(q => ({
      subject: q.subject,
      score: q.score,
      total: q.total_questions,
      pct: Math.round((q.score / q.total_questions) * 100),
      date: new Date(q.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
    })));
  };

  // ── Callback after quiz completes ───────────────────────────────
  const handleQuestComplete = useCallback(async ({ score, totalScore }) => {
    setActiveSubject(null);
    if (!scholar?.id) return;

    await Promise.all([
      refreshHistory(scholar.id),
      loadRecentQuizzes(scholar.id),
      loadQuests(scholar.id),
    ]);

    const { data: newBadgeData } = await supabase.rpc('check_and_award_badges', { p_scholar_id: scholar.id });
    if (newBadgeData?.length) {
      const badgeDetails = newBadgeData.map(b => ({
        ...BADGES[b.badge_id],
        xp: b.xp_reward,
        coins: b.coin_reward,
      })).filter(Boolean);
      setNewBadges(badgeDetails);
      sounds.badgeEarned();
      await loadBadges(scholar.id);
    }

    const { data: fresh } = await supabase.from("scholars").select("*").eq("id", scholar.id).single();
    if (fresh) {
      setScholar(fresh);
      localStorage.setItem("active_scholar", JSON.stringify(fresh));
    }
  }, [scholar, supabase, refreshHistory]);

  // ── Avatar purchase ─────────────────────────────────────────────
  const handleAvatarPurchase = async (itemId, item) => {
    if (!scholar) return;
    const category = item.category;
    const avatar = { ...(scholar.avatar || {}), [category]: itemId };
    const cost = item.coinCost || 0;
    if ((scholar.coins || 0) < cost) return;

    await supabase.from("scholars").update({
      avatar,
      coins: (scholar.coins || 0) - cost,
    }).eq("id", scholar.id);

    const updated = { ...scholar, avatar, coins: (scholar.coins || 0) - cost };
    setScholar(updated);
    localStorage.setItem("active_scholar", JSON.stringify(updated));
  };

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    sounds.toggle(next);
  };

  if (!scholar) return <LoadingScreen />;

  if (activeSubject) {
    return (
      <QuizEngine
        student={scholar}
        subject={activeSubject}
        onClose={() => setActiveSubject(null)}
        onComplete={handleQuestComplete}
        questionCount={10}
        previousQuestionIds={previousQuestionIds}
      />
    );
  }

  const curriculum = scholar.curriculum || 'uk_11plus';
  const subjects = SUBJECTS_BY_CURRICULUM[curriculum] || ['maths', 'english', 'verbal', 'nvr'];
  const levelInfo = getLevelInfo(scholar.total_xp || 0);

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24">
      {/* Toasts */}
      {newBadges.length > 0 && (
        <BadgeToast badges={newBadges} onDone={() => setNewBadges([])} />
      )}
      {newQuestComplete && (
        <QuestToast quest={newQuestComplete} onDone={() => setNewQuestComplete(null)} />
      )}
      {/* Avatar shop */}
      {showAvatarShop && (
        <AvatarShop
          scholar={scholar}
          earnedBadgeIds={earnedBadges}
          onClose={() => setShowAvatarShop(false)}
          onPurchase={handleAvatarPurchase}
        />
      )}

      {/* Navigation */}
      <nav className="bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-1.5 rounded-xl text-white">
            <RocketIcon size={18} />
          </div>
          <span className="font-black text-lg text-slate-800">LaunchPard</span>
          <span className="text-xs text-slate-300 font-bold hidden sm:inline">·</span>
          <span className="text-xs text-slate-400 font-bold hidden sm:inline">{CURRICULA[curriculum]?.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowProgress(!showProgress)}
            className="hidden md:flex items-center gap-2 bg-indigo-50 text-indigo-700 font-bold px-4 py-2.5 rounded-2xl hover:bg-indigo-100 transition-colors mr-2"
          >
            <span className="text-sm">{showProgress ? "Hide Progress" : "Show Progress"}</span>
          </button>
          <button onClick={toggleSound} className="p-2 text-slate-400 hover:text-slate-700 transition-colors">
            {soundOn ? <SoundOnIcon size={18} /> : <SoundOffIcon size={18} />}
          </button>
          <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-full border border-yellow-200">
            <CoinIcon size={16} />
            <span className="font-black text-yellow-700 text-sm">{scholar.coins || 0}</span>
          </div>
          <button onClick={() => { localStorage.removeItem("active_scholar"); router.push("/"); }}
            className="text-xs text-slate-400 hover:text-rose-500 font-bold uppercase tracking-wider px-2 py-1">
            Out
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 pt-8 space-y-6">
        {/* Hero */}
        <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 rounded-[32px] p-6 text-white shadow-2xl relative overflow-hidden">
          {['top-4 left-8', 'top-8 right-20', 'bottom-6 left-1/4', 'top-6 right-40'].map((pos, i) => (
            <div key={i} className={`absolute ${pos} w-1 h-1 bg-white rounded-full opacity-${[60,40,80,50][i]}`} />
          ))}
          <div className="flex items-start gap-4 relative z-10">
            <AvatarDisplay avatar={scholar.avatar} size="lg" onClick={() => setShowAvatarShop(true)} />
            <div className="flex-1 min-w-0">
              <p className="text-indigo-200 text-xs font-black uppercase tracking-widest mb-0.5">
                {levelInfo.current.title} · Lv {levelInfo.current.level}
              </p>
              <h1 className="text-2xl font-black truncate">Welcome back, {scholar.name}!</h1>
              <div className="flex flex-wrap gap-2 mt-2 mb-3">
                <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-black">
                  {CURRICULA[curriculum]?.country} {scholar.year ? `${CURRICULA[curriculum]?.gradeLabel || 'Year'} ${scholar.year}` : ''}
                </span>
                <span className="bg-amber-400 text-amber-900 px-2 py-0.5 rounded-full text-xs font-black flex items-center gap-1">
                  <StarFull size={11} /> {scholar.total_xp || 0} XP
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-black flex items-center gap-1 ${(scholar.streak || 0) > 0 ? 'bg-orange-400 text-orange-900' : 'bg-white/20'}`}>
                  <FlameIcon size={11} /> {scholar.streak || 0} day streak
                </span>
                {(scholar.streak_shields || 0) > 0 && (
                  <span className="bg-blue-400/80 text-blue-900 px-2 py-0.5 rounded-full text-xs font-black flex items-center gap-1">
                    <ShieldIcon size={11} /> {scholar.streak_shields} shield{scholar.streak_shields > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <LevelBar totalXp={scholar.total_xp || 0} />
            </div>
          </div>
        </div>

        {/* Active Quests */}
        {activeQuests.length > 0 && (
          <section>
            <h2 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-3 px-1">Active Quests</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {activeQuests.map(q => <QuestCard key={q.id} quest={q} />)}
            </div>
          </section>
        )}

        {/* Subject Grid */}
        <section>
          <h2 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-3 px-1">Choose Your Mission</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {subjects.map(s => (
              <SubjectCard key={s} subjectId={s} proficiency={skillProficiency[s]} onClick={() => setActiveSubject(s)} />
            ))}
          </div>
        </section>

        {/* Badges & Leaderboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-4">
              Badges ({earnedBadges.length}/{Object.keys(BADGES).length})
            </h3>
            <BadgeGrid earnedIds={earnedBadges} />
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">Leaderboard</h3>
              <div className="flex gap-1">
                {['year', 'friends'].map(m => (
                  <button key={m} onClick={() => setLbMode(m)}
                    className={`text-xs px-2 py-1 rounded-lg font-black capitalize ${lbMode === m ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-600'}`}>
                    {m === 'year' ? `Year ${scholar.year}` : 'Friends'}
                  </button>
                ))}
              </div>
            </div>
            <Leaderboard entries={leaderboard.slice(0, 5)} currentScholarId={scholar.id} mode={lbMode} />
          </div>
        </div>

        {/* Recent Missions */}
        {recentQuizzes.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-4">Recent Missions</h3>
            <div className="space-y-2">
              {recentQuizzes.map((q, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-lg">{SUBJECT_CONFIG[q.subject]?.icon || '📚'}</span>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-bold text-slate-700 capitalize">{q.subject}</span>
                      <span className="text-slate-400 text-xs">{q.date}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                      <div className={`h-full rounded-full ${q.pct >= 80 ? 'bg-emerald-500' : q.pct >= 50 ? 'bg-amber-400' : 'bg-rose-400'}`}
                        style={{ width: `${q.pct}%` }} />
                    </div>
                  </div>
                  <span className={`font-black text-sm w-12 text-right ${q.pct >= 80 ? 'text-emerald-600' : q.pct >= 50 ? 'text-amber-600' : 'text-rose-500'}`}>
                    {q.score}/{q.total}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Optional Progress Section (heatmap + chart) */}
        {showProgress && (
          <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-200 animate-in slide-in-from-top-4">
            <h2 className="text-2xl font-black text-slate-800 mb-6">Your Progress</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SkillHeatmap skills={fullSkills} />
              <ProgressChart data={chartData} color="#6366f1" />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}