/**
 * YearLevelUpModal.jsx
 *
 * Student-facing "level up" celebration when advancing to the next year
 * within the same stage (e.g. Y4 → Y5 within UK National KS2).
 *
 * This is SEPARATE from GraduationModal (which handles stage transitions
 * and is parent-facing). This is purely celebratory — the parent confirms
 * year advancement from Mission Control; this modal shows on the student
 * dashboard when the new year is first loaded.
 *
 * Triggered by: QuestOrchestrator detecting scholar.year_level changed
 * since last session (stored in localStorage as last_seen_year).
 *
 * Props:
 *   scholar       — full scholar object (with new year already set)
 *   onDismiss     — called when scholar taps to continue
 */

import { useState, useEffect } from 'react';

// Year-level flavour text — keeps it fresh across years
const YEAR_FLAVOUR = {
  // UK National
  2:  { title: 'Year 2 Unlocked!',   subtitle: 'The adventure deepens, Cadet.',      icon: '⭐' },
  3:  { title: 'Year 3 Begins!',     subtitle: 'New worlds are opening up.',           icon: '🌍' },
  4:  { title: 'Year 4 — Go!',       subtitle: 'Harder quests. Bigger rewards.',       icon: '🚀' },
  5:  { title: 'Year 5 Activated!',  subtitle: 'You\'re in the upper ranks now.',      icon: '🛸' },
  6:  { title: 'Year 6 — Final KS2!',subtitle: 'One year before secondary. Let\'s go.',icon: '🎯' },
  7:  { title: 'Welcome to KS3!',    subtitle: 'Secondary school begins. New mission.',icon: '🏫' },
  8:  { title: 'Year 8 Unlocked!',   subtitle: 'You\'re finding your rhythm.',         icon: '⚡' },
  9:  { title: 'Year 9 — Final KS3!',subtitle: 'GCSEs are on the horizon.',            icon: '🔭' },
  10: { title: 'GCSE Years Begin!',  subtitle: 'Your options are chosen. Time to shine.',icon: '📚' },
  11: { title: 'Year 11 — Final Push!',subtitle: 'The last chapter before the exams.', icon: '🏆' },
  // Nigerian JSS
  // (JSS year numbers are 1–3 within the stage, shown as JSS1/JSS2/JSS3)
  // ng_jss year 2
  // ng_sss year 2
};

const DEFAULT_FLAVOUR = { title: 'New Year Unlocked!', subtitle: 'Keep pushing, Cadet.', icon: '🌟' };

// Animated star burst
function StarBurst() {
  const stars = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    angle: (i / 12) * 360,
    distance: 60 + Math.random() * 40,
    size: 8 + Math.random() * 12,
    delay: `${i * 0.06}s`,
  }));

  return (
    <div className="relative w-32 h-32 mx-auto mb-4">
      {stars.map(s => (
        <div
          key={s.id}
          className="absolute top-1/2 left-1/2 text-yellow-400"
          style={{
            fontSize: s.size,
            transform: `rotate(${s.angle}deg) translateY(-${s.distance}px)`,
            animation: `pulse 1.5s ${s.delay} ease-in-out infinite alternate`,
          }}
        >★</div>
      ))}
      <div className="absolute inset-0 flex items-center justify-center text-5xl">
        {/* Main icon rendered by parent */}
      </div>
      <style>{`
        @keyframes pulse {
          from { opacity: 0.3; transform: rotate(var(--r, 0deg)) translateY(var(--d, 0px)) scale(0.8); }
          to   { opacity: 1;   transform: rotate(var(--r, 0deg)) translateY(var(--d, 0px)) scale(1.2); }
        }
      `}</style>
    </div>
  );
}

// ── Mastery summary bar ───────────────────────────────────────────────────────
function MasteryBar({ label, score, colour }) {
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
        <span>{label}</span>
        <span>{Math.round(score)}%</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${colour}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function YearLevelUpModal({ scholar, subjectMastery = [], onDismiss }) {
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowStats(true), 800);
    return () => clearTimeout(t);
  }, []);

  const flavour = YEAR_FLAVOUR[scholar.year_level] || DEFAULT_FLAVOUR;

  const gradeLabel = scholar.curriculum?.startsWith('ng_')
    ? `${scholar.curriculum === 'ng_jss' ? 'JSS' : 'SS'} ${scholar.year_level}`
    : `Year ${scholar.year_level}`;

  // Top 3 subjects by mastery for the summary
  const topSubjects = [...subjectMastery]
    .sort((a, b) => b.avg_mastery - a.avg_mastery)
    .slice(0, 4);

  const barColours = ['bg-indigo-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden">

        {/* Header — gradient banner */}
        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-8 text-center text-white">
          <div className="text-6xl mb-3 animate-bounce">{flavour.icon}</div>
          <h1 className="text-2xl font-black mb-1">{flavour.title}</h1>
          <p className="text-indigo-200 font-semibold text-sm">{flavour.subtitle}</p>
          <div className="inline-block bg-white/20 rounded-full px-4 py-1 mt-3 text-sm font-black">
            🎓 {scholar.name} · {gradeLabel}
          </div>
        </div>

        {/* Stats section */}
        <div className="p-6">
          {topSubjects.length > 0 ? (
            <div className={`transition-all duration-700 ${showStats ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                📊 Last Year's Mastery
              </p>
              {topSubjects.map((s, i) => (
                <MasteryBar
                  key={s.subject}
                  label={s.label || s.subject.replace(/_/g, ' ')}
                  score={s.avg_mastery}
                  colour={barColours[i % barColours.length]}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-slate-500 text-sm font-semibold">
                New subjects and quests are waiting for you in {gradeLabel}.
              </p>
            </div>
          )}

          {/* New this year hint */}
          <div className="bg-indigo-50 rounded-2xl p-3 mt-4 mb-5">
            <p className="text-xs font-black text-indigo-700">
              🔓 What's new in {gradeLabel}
            </p>
            <p className="text-xs text-indigo-600 font-semibold mt-1">
              Harder questions, new topics, and bigger Stardust rewards await.
              Your mastery carries forward — build on it!
            </p>
          </div>

          <button
            onClick={onDismiss}
            className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black rounded-2xl py-3.5 text-lg hover:from-indigo-700 hover:to-violet-700 transition-all shadow-lg shadow-indigo-200"
          >
            Begin {gradeLabel} 🚀
          </button>
        </div>
      </div>
    </div>
  );
}