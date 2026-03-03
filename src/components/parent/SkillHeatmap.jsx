import React from 'react';

export default function SkillHeatmap({ skills = [], currentYear = 6 }) {
  const subjects = ['maths', 'english', 'verbal', 'nvr'];
  const years = Array.from({ length: currentYear }, (_, i) => i + 1);

  const skillMap = {};
  skills.forEach(s => {
    const subj = s.skills?.subject;
    const yr = s.skills?.year_level;
    if (subj && yr && yr <= currentYear) {
      if (!skillMap[subj]) skillMap[subj] = {};
      skillMap[subj][yr] = s.proficiency;
    }
  });

  return (
    <div className="bg-white p-6 rounded-2xl shadow-md">
      <h3 className="text-lg font-black mb-4">Topic Proficiency</h3>
      <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold">
        <div className="col-span-1"></div>
        {years.map(y => <div key={y} className="text-slate-400">Y{y}</div>)}
        {subjects.map(subj => (
          <React.Fragment key={subj}>
            <div className="col-span-1 text-left font-black text-slate-600">{subj}</div>
            {years.map(y => {
              const prof = skillMap[subj]?.[y] || 0;
              const bgColor = `rgba(99, 102, 241, ${prof / 100})`;
              return (
                <div
                  key={`${subj}-${y}`}
                  className="w-8 h-8 rounded-md flex items-center justify-center text-white font-black text-xs"
                  style={{ backgroundColor: bgColor }}
                >
                  {prof > 0 ? `${Math.round(prof)}%` : ''}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
