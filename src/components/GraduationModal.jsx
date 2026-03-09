/**
 * GraduationModal.jsx
 * 
 * Shown when a scholar reaches the end of their current stage.
 * Handles:
 *   - Graduation ceremony (confetti, stats, badge)
 *   - Stream selection (JSS → SSS)
 *   - KS4 subject checklist (KS3 → KS4)
 *   - Terminal graduation (no next stage)
 * 
 * Props:
 *   scholar       — full scholar object
 *   onClose       — called after promotion completes or modal dismissed
 *   supabase      — supabase client
 */

import { useState, useEffect } from 'react';
import { getProgressionState, promoteScholar, getStageLabel } from '@/lib/progressionEngine';

// ── NG SSS stream definitions (mirrors page.jsx) ──────────────────────────────
const NG_SSS_STREAMS = {
  science:    { label: 'Science',    emoji: '🔬', desc: 'Biology, Chemistry, Physics, Further Maths' },
  humanities: { label: 'Humanities', emoji: '📜', desc: 'Literature, Government, History, Home Management' },
  business:   { label: 'Business',   emoji: '💼', desc: 'Economics, Accounting, Commerce, Marketing' },
};

// ── UK KS4 optional subjects (mirrors page.jsx) ───────────────────────────────
const UK_KS4_OPTIONS = [
  {
    group: 'STEM', emoji: '🔬',
    subjects: [
      { value: 'biology',             label: 'Biology (Triple Science)' },
      { value: 'chemistry',           label: 'Chemistry (Triple Science)' },
      { value: 'physics',             label: 'Physics (Triple Science)' },
      { value: 'computer_science',    label: 'Computer Science' },
      { value: 'further_mathematics', label: 'Further Mathematics' },
      { value: 'statistics',          label: 'Statistics' },
    ],
  },
  {
    group: 'Arts & Humanities', emoji: '🎨',
    subjects: [
      { value: 'history',             label: 'History' },
      { value: 'geography',           label: 'Geography' },
      { value: 'religious_education', label: 'Religious Education' },
      { value: 'media_studies',       label: 'Media Studies' },
      { value: 'physical_education',  label: 'Physical Education' },
    ],
  },
  {
    group: 'Vocational & Technical', emoji: '🛠',
    subjects: [
      { value: 'business_studies',   label: 'Business Studies' },
      { value: 'ict',                label: 'ICT' },
      { value: 'design_technology',  label: 'Design & Technology' },
      { value: 'food_technology',    label: 'Food Technology' },
      { value: 'health_social_care', label: 'Health & Social Care' },
      { value: 'sport_science',      label: 'Sport Science' },
    ],
  },
];

// ── Confetti component ────────────────────────────────────────────────────────
function Confetti() {
  const pieces = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 2}s`,
    duration: `${2 + Math.random() * 2}s`,
    color: ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6'][i % 6],
    size: `${6 + Math.random() * 8}px`,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {pieces.map(p => (
        <div
          key={p.id}
          className="absolute top-0 rounded-sm"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            animation: `fall ${p.duration} ${p.delay} ease-in forwards`,
          }}
        />
      ))}
      <style>{`
        @keyframes fall {
          0%   { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function GraduationModal({ scholar, onClose, supabase }) {
  const [step, setStep] = useState('ceremony');   // 'ceremony' | 'stream' | 'ks4subjects' | 'promoting' | 'done'
  const [selectedStream, setSelectedStream] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [error, setError] = useState(null);
  const [tradeSubject, setTradeSubject] = useState('');

  const progression = getProgressionState(scholar.curriculum, scholar.year_level);
  const { transition, isGraduated, needsStream, needsKs4Subjects } = progression;

  // Determine next step after ceremony
  const handleCeremonyConfirm = () => {
    if (isGraduated) { setStep('done'); return; }
    if (needsStream) { setStep('stream'); return; }
    if (needsKs4Subjects) { setStep('ks4subjects'); return; }
    handlePromote(null, null);
  };

  const handlePromote = async (stream, subjects) => {
    setStep('promoting');
    setError(null);
    try {
      await promoteScholar(
        supabase,
        scholar.id,
        progression.nextCurriculum,
        progression.nextYear,
        stream,
        subjects?.length > 0 ? subjects : null,
      );
      setStep('done');
    } catch (err) {
      setError(err.message);
      setStep(needsStream ? 'stream' : needsKs4Subjects ? 'ks4subjects' : 'ceremony');
    }
  };

  const toggleSubject = (val) =>
    setSelectedSubjects(prev =>
      prev.includes(val) ? prev.filter(s => s !== val) : [...prev, val]
    );

  // ── Step: Ceremony ────────────────────────────────────────────────────────
  if (step === 'ceremony') return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <Confetti />
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center z-10">
        <div className="text-6xl mb-4">🎓</div>
        <h1 className="text-2xl font-black text-indigo-700 mb-2">
          {transition?.celebrationTitle || 'Stage Complete!'}
        </h1>
        <p className="text-slate-600 font-semibold mb-2">
          {scholar.name} has completed <span className="text-indigo-600">{getStageLabel(scholar.curriculum)}</span>
        </p>
        <p className="text-slate-500 text-sm mb-6">
          {transition?.celebrationDesc}
        </p>

        {/* Stats summary placeholder */}
        <div className="bg-indigo-50 rounded-2xl p-4 mb-6 grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-2xl font-black text-indigo-700">{scholar.total_quizzes || '—'}</p>
            <p className="text-[10px] font-bold uppercase text-indigo-400 tracking-wider">Quizzes</p>
          </div>
          <div>
            <p className="text-2xl font-black text-indigo-700">{scholar.stardust || '—'}</p>
            <p className="text-[10px] font-bold uppercase text-indigo-400 tracking-wider">Stardust</p>
          </div>
          <div>
            <p className="text-2xl font-black text-indigo-700">{scholar.streak_days || '0'}🔥</p>
            <p className="text-[10px] font-bold uppercase text-indigo-400 tracking-wider">Streak</p>
          </div>
        </div>

        {isGraduated ? (
          <button
            onClick={() => setStep('done')}
            className="w-full bg-indigo-600 text-white font-black rounded-2xl py-3 text-lg hover:bg-indigo-700 transition-colors"
          >
            🏆 Celebrate!
          </button>
        ) : (
          <button
            onClick={handleCeremonyConfirm}
            className="w-full bg-indigo-600 text-white font-black rounded-2xl py-3 text-lg hover:bg-indigo-700 transition-colors"
          >
            Continue to {getStageLabel(progression.nextCurriculum)} →
          </button>
        )}
      </div>
    </div>
  );

  // ── Step: Stream selection (JSS → SSS) ────────────────────────────────────
  if (step === 'stream') return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 z-10">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🇳🇬</div>
          <h2 className="text-xl font-black text-indigo-700">Choose SSS Stream</h2>
          <p className="text-slate-500 text-sm mt-1">
            This shapes {scholar.name}'s subjects for SS1–SS3
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          {Object.entries(NG_SSS_STREAMS).map(([key, s]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedStream(key)}
              className={`flex flex-col items-center gap-1 p-4 rounded-2xl border-2 font-bold transition-all text-sm
                ${selectedStream === key
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 text-slate-600 hover:border-indigo-300'}`}
            >
              <span className="text-2xl">{s.emoji}</span>
              {s.label}
            </button>
          ))}
        </div>

        {selectedStream && (
          <p className="text-xs text-indigo-600 font-semibold bg-indigo-50 rounded-xl px-3 py-2 mb-4">
            📚 {NG_SSS_STREAMS[selectedStream].desc}
          </p>
        )}

        <div className="mb-4">
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
            🛠 Trade Subject (Optional)
          </label>
          <select
            value={tradeSubject}
            onChange={e => setTradeSubject(e.target.value)}
            className="w-full border-2 border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-700 focus:border-indigo-500 focus:outline-none"
          >
            <option value="">None</option>
            <option value="data_processing">Data Processing</option>
            <option value="marketing">Marketing</option>
          </select>
        </div>

        {error && <p className="text-red-500 text-sm font-bold mb-3">{error}</p>}

        <button
          disabled={!selectedStream}
          onClick={() => handlePromote(selectedStream, null)}
          className="w-full bg-indigo-600 text-white font-black rounded-2xl py-3 text-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Begin SSS {NG_SSS_STREAMS[selectedStream]?.emoji} →
        </button>
      </div>
    </div>
  );

  // ── Step: KS4 subject selection (KS3 → KS4) ──────────────────────────────
  if (step === 'ks4subjects') return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8 z-10 max-h-[90vh] overflow-y-auto">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🇬🇧</div>
          <h2 className="text-xl font-black text-indigo-700">Choose GCSE Options</h2>
          <p className="text-slate-500 text-sm mt-1">
            Select the optional subjects {scholar.name} will study in Y10–Y11
          </p>
        </div>

        {UK_KS4_OPTIONS.map(group => (
          <div key={group.group} className="mb-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
              {group.emoji} {group.group}
            </p>
            <div className="flex flex-wrap gap-2">
              {group.subjects.map(s => {
                const checked = selectedSubjects.includes(s.value);
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => toggleSubject(s.value)}
                    className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl border-2 transition-all
                      ${checked
                        ? 'bg-indigo-600 text-white border-indigo-700'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}
                  >
                    {checked ? '✓' : '+'} {s.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {selectedSubjects.length > 0 && (
          <p className="text-xs text-indigo-600 font-bold mb-4">
            {selectedSubjects.length} optional subject{selectedSubjects.length !== 1 ? 's' : ''} selected
          </p>
        )}

        {error && <p className="text-red-500 text-sm font-bold mb-3">{error}</p>}

        <button
          onClick={() => handlePromote(null, selectedSubjects)}
          className="w-full bg-indigo-600 text-white font-black rounded-2xl py-3 text-lg hover:bg-indigo-700 transition-colors"
        >
          Begin Year 10 →
        </button>
      </div>
    </div>
  );

  // ── Step: Promoting ───────────────────────────────────────────────────────
  if (step === 'promoting') return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl p-8 text-center shadow-2xl">
        <div className="text-4xl mb-4 animate-spin">⚙️</div>
        <p className="font-black text-indigo-700">Updating scholar record…</p>
      </div>
    </div>
  );

  // ── Step: Done ────────────────────────────────────────────────────────────
  if (step === 'done') return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <Confetti />
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center z-10">
        {isGraduated ? (
          <>
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="text-2xl font-black text-indigo-700 mb-2">All done!</h2>
            <p className="text-slate-500 text-sm mb-6">
              {scholar.name} has completed their learning journey on LaunchPard.
              What an achievement!
            </p>
          </>
        ) : (
          <>
            <div className="text-6xl mb-4">🚀</div>
            <h2 className="text-2xl font-black text-indigo-700 mb-2">
              {scholar.name} is now in {getStageLabel(progression.nextCurriculum)}!
            </h2>
            <p className="text-slate-500 text-sm mb-6">
              The mission continues. New worlds await.
            </p>
          </>
        )}
        <button
          onClick={onClose}
          className="w-full bg-indigo-600 text-white font-black rounded-2xl py-3 text-lg hover:bg-indigo-700 transition-colors"
        >
          Back to Mission Control
        </button>
      </div>
    </div>
  );

  return null;
}