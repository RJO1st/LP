"use client";

import React from "react";

// ── All possible subject metadata ──────────────────────────────────────────
const ALL_SUBJECT_META = {
  maths:     { label: "Maths",     emoji: "🔢" },
  english:   { label: "English",   emoji: "📖" },
  verbal:    { label: "Verbal",    emoji: "🧩" },
  nvr:       { label: "NVR",       emoji: "🔷" },
  science:   { label: "Science",   emoji: "🔬" },
  geography: { label: "Geography", emoji: "🌍" },
  history:   { label: "History",   emoji: "📜" },
};

// ── Proficiency → Tailwind classes ─────────────────────────────────────────
function cellStyle(proficiency) {
  if (!proficiency || proficiency === 0) return { bg: "bg-slate-100", text: "text-slate-400" };
  if (proficiency < 25)                  return { bg: "bg-red-100",     text: "text-red-700"     };
  if (proficiency < 50)                  return { bg: "bg-amber-100",   text: "text-amber-700"   };
  if (proficiency < 75)                  return { bg: "bg-lime-100",    text: "text-lime-700"    };
  return                                        { bg: "bg-emerald-100", text: "text-emerald-700" };
}

// ── Grade column header abbreviation ───────────────────────────────────────
function gradeColHeader(gradeLabel, grade) {
  const prefix = gradeLabel === "Year"  ? "Y"
               : gradeLabel === "Grade" ? "G"
               : gradeLabel.charAt(0).toUpperCase();
  return `${prefix}${grade}`;
}

// ──────────────────────────────────────────────────────────────────────────
export default function SkillHeatmap({
  skills = [],
  curriculum,
  subjects = [],
  grades = [],
  gradeLabel = "Year",
  loading = false,
}) {
  // ── Build lookup: skillMap[subject][year_level] = proficiency ─────────────
  const skillMap = {};
  skills.forEach(s => {
    const subj = s.skills?.subject   ?? s.subject;
    const yr   = s.skills?.year_level ?? s.year_level;
    if (!subj || yr == null) return;
    if (!skillMap[subj]) skillMap[subj] = {};
    skillMap[subj][yr] = Math.round(s.proficiency ?? 0);
  });

  // ── Skeleton ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-md">
        <div className="h-5 w-44 mb-5 rounded bg-slate-100 animate-pulse" />
        <div className="space-y-3">
          {subjects.map(s => (
            <div key={s} className="flex gap-2">
              <div className="h-9 w-20 rounded bg-slate-100 animate-pulse" />
              {grades.map(g => (
                <div key={g} className="h-9 w-12 rounded bg-slate-100 animate-pulse" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Legend ────────────────────────────────────────────────────────────────
  const legend = [
    { label: "Not started", cls: "bg-slate-100 text-slate-400"     },
    { label: "< 25%",       cls: "bg-red-100 text-red-700"         },
    { label: "25–49%",      cls: "bg-amber-100 text-amber-700"     },
    { label: "50–74%",      cls: "bg-lime-100 text-lime-700"       },
    { label: "75–100%",     cls: "bg-emerald-100 text-emerald-700" },
  ];

  return (
    <div className="bg-white p-6 rounded-2xl shadow-md overflow-x-auto">
      <h3 className="text-lg font-black mb-1">Topic Proficiency</h3>
      <p className="text-xs text-slate-400 mb-4">
        Colour reflects mastery level per {gradeLabel.toLowerCase()} studied.
      </p>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mb-5">
        {legend.map(l => (
          <span key={l.label} className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${l.cls}`}>
            {l.label}
          </span>
        ))}
      </div>

      {/* Grid */}
      <div
        className="grid gap-2 text-center text-xs font-bold min-w-max"
        style={{ gridTemplateColumns: `8rem repeat(${grades.length}, 3rem)` }}
      >
        {/* Header row */}
        <div />
        {grades.map(g => (
          <div key={g} className="text-slate-400 pb-1">
            {gradeColHeader(gradeLabel, g)}
          </div>
        ))}

        {/* Subject rows */}
        {subjects.map(subj => {
          const meta = ALL_SUBJECT_META[subj] ?? { label: subj, emoji: "📚" };
          return (
            <React.Fragment key={subj}>
              {/* Row label */}
              <div className="text-left flex items-center gap-1.5 font-black text-slate-700 pr-2 text-xs">
                <span>{meta.emoji}</span>
                <span className="truncate">{meta.label}</span>
              </div>

              {/* Proficiency cells */}
              {grades.map(g => {
                const prof = skillMap[subj]?.[g] ?? 0;
                const { bg, text } = cellStyle(prof);
                return (
                  <div
                    key={`${subj}-${g}`}
                    title={`${meta.label} ${gradeLabel} ${g}: ${prof > 0 ? `${prof}%` : "not started"}`}
                    className={`
                      h-10 w-12 rounded-lg flex items-center justify-center
                      font-black text-[11px] cursor-default transition-transform
                      hover:scale-110 ${bg} ${text}
                    `}
                  >
                    {prof > 0 ? `${prof}%` : "—"}
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>

      {/* Summary row */}
      {subjects.length > 1 && (
        <div
          className="grid gap-2 mt-3 border-t-2 border-slate-100 pt-3 min-w-max"
          style={{ gridTemplateColumns: `8rem repeat(${grades.length}, 3rem)` }}
        >
          <div className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
            Avg
          </div>
          {grades.map(g => {
            const vals  = subjects.map(s => skillMap[s]?.[g] ?? 0).filter(v => v > 0);
            const avg   = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
            const { bg, text } = cellStyle(avg);
            return (
              <div
                key={`avg-${g}`}
                title={`Average ${gradeLabel} ${g}: ${avg > 0 ? `${avg}%` : "not started"}`}
                className={`h-8 w-12 rounded-lg flex items-center justify-center
                            font-black text-[10px] cursor-default ${avg > 0 ? `${bg} ${text}` : "bg-slate-50 text-slate-300"}`}
              >
                {avg > 0 ? `${avg}%` : "—"}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}