// src/components/parent/SkillHeatmap.jsx
import React from 'react';

const SUBJECT_META = {
  maths:   { label: 'Maths',   emoji: '🔢' },
  english: { label: 'English', emoji: '📖' },
  verbal:  { label: 'Verbal',  emoji: '🧩' },
  nvr:     { label: 'NVR',     emoji: '🔷' },
};

/** Return Tailwind bg + text classes that remain readable at all intensity levels */
function cellStyle(proficiency) {
  if (proficiency === 0)   return { bg: 'bg-slate-100', text: 'text-slate-400' };
  if (proficiency < 25)   return { bg: 'bg-red-100',     text: 'text-red-700'     };
  if (proficiency < 50)   return { bg: 'bg-amber-100',   text: 'text-amber-700'   };
  if (proficiency < 75)   return { bg: 'bg-lime-100',    text: 'text-lime-700'     };
  return                         { bg: 'bg-emerald-100', text: 'text-emerald-700' };
}

/**
 * SkillHeatmap — grid of subject × year proficiency cells.
 *
 * @param {Array}   skills       – from Supabase join: [{ proficiency, skills: { subject, year_level } }]
 * @param {number}  currentYear  – scholar's current year (1–6), controls column count
 * @param {boolean} loading
 */
export default function SkillHeatmap({ skills = [], currentYear = 6, loading = false }) {
  const subjects = Object.keys(SUBJECT_META);
  const years    = Array.from({ length: currentYear }, (_, i) => i + 1);

  // Build lookup: skillMap[subject][year] = proficiency (0–100)
  const skillMap = {};
  skills.forEach(s => {
    const subj = s.skills?.subject;
    const yr   = s.skills?.year_level;
    if (!subj || !yr || yr > currentYear) return;
    if (!skillMap[subj]) skillMap[subj] = {};
    skillMap[subj][yr] = Math.round(s.proficiency ?? 0);
  });

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-md">
        <div className="h-5 w-40 mb-5 rounded bg-slate-100 animate-pulse" />
        <div className="space-y-3">
          {subjects.map(s => (
            <div key={s} className="flex gap-2">
              <div className="h-9 w-16 rounded bg-slate-100 animate-pulse" />
              {years.map(y => <div key={y} className="h-9 w-12 rounded bg-slate-100 animate-pulse" />)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-md overflow-x-auto">
      <h3 className="text-lg font-black mb-1">Topic Proficiency</h3>
      <p className="text-xs text-slate-400 mb-4">
        Colour reflects mastery level per year studied.
      </p>

      {/* ── Legend ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 mb-5">
        {[
          { label: 'Not started', cls: 'bg-slate-100 text-slate-400'       },
          { label: '< 25%',       cls: 'bg-red-100 text-red-700'           },
          { label: '25–49%',      cls: 'bg-amber-100 text-amber-700'       },
          { label: '50–74%',      cls: 'bg-lime-100 text-lime-700'         },
          { label: '75–100%',     cls: 'bg-emerald-100 text-emerald-700'   },
        ].map(l => (
          <span key={l.label} className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${l.cls}`}>
            {l.label}
          </span>
        ))}
      </div>

      {/* ── Grid ───────────────────────────────────────────────────────── */}
      {/* Use inline style for dynamic column count — Tailwind can't purge grid-cols-{n} */}
      <div
        className="grid gap-2 text-center text-xs font-bold min-w-max"
        style={{ gridTemplateColumns: `7rem repeat(${years.length}, 3rem)` }}
      >
        {/* Header row */}
        <div />
        {years.map(y => (
          <div key={y} className="text-slate-400 pb-1">Y{y}</div>
        ))}

        {/* Subject rows */}
        {subjects.map(subj => {
          const meta = SUBJECT_META[subj];
          return (
            <React.Fragment key={subj}>
              {/* Row label */}
              <div className="text-left flex items-center gap-1.5 font-black text-slate-700 pr-2">
                <span>{meta.emoji}</span>
                <span>{meta.label}</span>
              </div>

              {/* Proficiency cells */}
              {years.map(y => {
                const prof = skillMap[subj]?.[y] ?? 0;
                const { bg, text } = cellStyle(prof);
                return (
                  <div
                    key={`${subj}-${y}`}
                    title={`${meta.label} Year ${y}: ${prof > 0 ? `${prof}%` : 'not started'}`}
                    className={`
                      h-10 w-12 rounded-lg flex items-center justify-center
                      font-black text-[11px] cursor-default transition-transform
                      hover:scale-110 ${bg} ${text}
                    `}
                  >
                    {prof > 0 ? `${prof}%` : '—'}
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}