"use client";
import React, { useState, useEffect } from "react";
import {
  ArrowRightIcon, TrophyIcon, BookIcon, StarIcon,
  CalculatorIcon, SpeechIcon, ShapesIcon, ShieldCheckIcon, BrainIcon
} from "../../components/ui/Icons";
import QuizEngine from "../../components/game/QuizEngine";
import MistakeJournal from "../../components/game/MistakeJournal";

const STORAGE_KEY = "quest_academy_pro_v9";

const WORLDS = [
  { id: 1, name: "Meadowlands", year: 1, emoji: "🌱", color: "#10b981", qBank: "Y1" },
  { id: 2, name: "Crystal Caves", year: 2, emoji: "💎", color: "#3b82f6", qBank: "Y1" },
  { id: 3, name: "Sky Islands", year: 3, emoji: "☁️", color: "#0ea5e9", qBank: "Y3" },
  { id: 4, name: "Ancient Library", year: 4, emoji: "📚", color: "#8b5cf6", qBank: "Y3" },
  { id: 5, name: "Forge of Elements", year: 5, emoji: "⚙️", color: "#f59e0b", qBank: "Y5" },
  { id: 6, name: "Tower of Trials", year: 6, emoji: "🏰", color: "#ef4444", qBank: "Y5" }
];

export default function StudentPage() {
  const [db, setDb] = useState({ students: [] });
  const [activeStudent, setActiveStudent] = useState(null);
  const [mounted, setMounted] = useState(false);
  
  const [activeQuest, setActiveQuest] = useState(null);
  const [showJournal, setShowJournal] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) { 
      try { setDb(JSON.parse(saved)); } catch(e) {}
    }
  }, []);

  const saveDb = (newDb) => {
    setDb(newDb);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newDb));
  };

  const handleCompleteQuest = async (results, subject) => {
    if (!activeStudent) return;
    
    const accuracy = Math.round((results.score / 15) * 100);
    const currentProficiency = activeStudent.prog.proficiency || 50;
    const newProficiency = Math.min(100, Math.max(0, Math.round(currentProficiency * 0.8 + accuracy * 0.2)));
    
    // ANTI-CHEAT: Send data to the secure server Vault
    try {
      const response = await fetch('/api/submit-quest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scholarId: activeStudent.id,
          subject: subject,
          answers: results.answers || [],
          timeSpent: results.timeSpent || 120
        })
      });
      // In a full Supabase build, the server tells us what XP we earned.
    } catch(err) {
      console.warn("Anti-cheat validation failed, falling back to local saving during migration.", err);
    }

    const updatedStudent = {
      ...activeStudent,
      prog: {
        ...activeStudent.prog,
        xp: activeStudent.prog.xp + (results.score * 50),
        mistakes: [...activeStudent.prog.mistakes, ...results.newMistakes].slice(-50),
        completedQuestions: (activeStudent.prog.completedQuestions || 0) + 15,
        proficiency: newProficiency
      }
    };

    const newDb = { ...db, students: db.students.map(s => s.id === updatedStudent.id ? updatedStudent : s) };
    
    saveDb(newDb);
    setActiveStudent(updatedStudent);
    setActiveQuest(null);
  };

  if (!mounted) return null;

  if (!activeStudent) {
    return (
      <div className="min-h-screen bg-[#6366f1] p-6 md:p-12 flex flex-col animate-in fade-in">
        {/* We use a standard anchor tag here to ensure clean Next.js compilation */}
        <a href="/" className="inline-flex items-center gap-2 text-white/70 hover:text-white font-black mb-12 transition-colors self-start">
            <ArrowRightIcon className="rotate-180" size={20} /> Back to Gateway
        </a>
        
        <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col justify-center">
          <h1 className="text-5xl md:text-6xl font-black text-white text-center mb-16 tracking-tight">Who's playing?</h1>
          
          {db.students.length === 0 ? (
             <div className="text-center bg-white/10 rounded-[40px] p-12 backdrop-blur-sm text-white">
               <TrophyIcon size={64} className="mx-auto mb-6 opacity-50" />
               <h2 className="text-2xl font-black mb-4">No Scholars Found</h2>
               <p className="font-bold text-white/80">Ask your parents to set up your profile in the Parent Portal!</p>
             </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8 justify-center">
              {db.students.map(s => (
                <button key={s.id} onClick={() => setActiveStudent(s)} className="group flex flex-col items-center">
                  <div className="w-32 h-32 md:w-40 md:h-40 bg-white rounded-[40px] flex items-center justify-center text-5xl font-black text-indigo-600 shadow-2xl border-b-8 border-indigo-200 transition-all group-hover:-translate-y-4 group-hover:scale-105 group-hover:border-indigo-300 mb-6">
                     {s.name[0]}
                  </div>
                  <span className="text-2xl font-black text-white group-hover:text-indigo-200 transition-colors">{s.name}</span>
                  <span className="text-sm font-bold text-indigo-200 uppercase tracking-widest mt-1">Year {s.year}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Active Student Dashboard
  const currentWorld = WORLDS.find(w => w.year === activeStudent.year) || WORLDS[WORLDS.length - 1];
  const dailyGoalTarget = 100;
  const progressPct = Math.min(100, ((activeStudent.prog.completedQuestions || 0) / dailyGoalTarget) * 100);

  const modules = [
    { id: 'maths', title: 'Maths', desc: 'Numbers, logic & calculation', icon: <CalculatorIcon size={40}/>, color: 'bg-blue-500', shadow: 'shadow-blue-200' },
    { id: 'english', title: 'English', desc: 'Grammar, vocab & comprehension', icon: <BookIcon size={40}/>, color: 'bg-rose-500', shadow: 'shadow-rose-200' },
    { id: 'verbal', title: 'Verbal Reasoning', desc: 'Words, codes & logic', icon: <SpeechIcon size={40}/>, color: 'bg-emerald-500', shadow: 'shadow-emerald-200' },
    { id: 'nvr', title: 'Non-Verbal', desc: 'Shapes, patterns & space', icon: <ShapesIcon size={40}/>, color: 'bg-amber-500', shadow: 'shadow-amber-200' }
  ];

  return (
    <div className="min-h-screen text-slate-900 pb-32 bg-slate-50 animate-in fade-in">
      <nav className="sticky top-0 z-[100] bg-white/80 backdrop-blur-xl border-b-2 border-slate-100 px-6 md:px-10 py-5 flex items-center justify-between text-slate-900">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-xl shadow-indigo-100"><TrophyIcon size={24} /></div>
          <span className="text-xl md:text-3xl font-black tracking-tight text-slate-800">Quest Academy</span>
        </div>
        <div className="flex items-center gap-4 md:gap-8">
          <button onClick={() => setShowJournal(true)} className="flex items-center gap-2 bg-rose-50 px-4 md:px-6 py-3 rounded-full text-rose-600 font-black border-2 border-rose-100 transition-all hover:bg-rose-100 hover:scale-105"><BookIcon size={20} /> <span className="hidden md:block">Journal</span></button>
          <div className="bg-amber-50 px-4 md:px-6 py-3 rounded-full border-2 border-amber-100 text-amber-700 font-black flex items-center gap-2">
            <StarIcon size={20} className="fill-amber-500" /> {activeStudent.prog.xp} XP
          </div>
          <div className="hidden md:flex items-center gap-4 pl-8 border-l-2 border-slate-100">
            <div className="text-right text-slate-800">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Year {activeStudent.year} • {activeStudent.region}</div>
              <div className="text-lg font-black">{activeStudent.name}</div>
            </div>
            <button onClick={() => setActiveStudent(null)} title="Log Out" className="w-14 h-14 bg-slate-100 hover:bg-slate-200 transition-colors rounded-2xl flex items-center justify-center text-slate-600 font-black text-xl shadow-inner group">
               <span className="group-hover:hidden">{activeStudent.name[0]}</span>
               <ArrowRightIcon className="hidden group-hover:block" size={24} />
            </button>
          </div>
        </div>
      </nav>
      
      <main className="max-w-6xl mx-auto px-6 md:px-10 py-12 md:py-16 text-slate-900">
        <header className="mb-12 text-center md:text-left flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <h1 className="text-5xl md:text-7xl font-black mb-4 leading-tight tracking-tight flex items-center gap-4">
               <span>Welcome, {activeStudent.name}</span>
               <span className="text-4xl">{currentWorld.emoji}</span>
            </h1>
            <p className="text-xl font-bold text-slate-500">Your {currentWorld.name} Odyssey Awaits.</p>
          </div>
          
          <div className="w-full md:w-80 bg-white p-6 rounded-[32px] border-2 border-slate-100 shadow-sm">
            <div className="flex justify-between font-black text-sm mb-3 uppercase tracking-widest">
               <span className="text-slate-500">Daily Goal</span>
               <span className="text-indigo-600">{activeStudent.prog.completedQuestions} / {dailyGoalTarget} Qs</span>
            </div>
            <div className="h-4 bg-slate-100 rounded-full overflow-hidden border inset-shadow-sm">
               <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        </header>

        <section className="mb-16">
          <h3 className="text-2xl font-black text-slate-800 mb-8 flex items-center gap-3">
             <BrainIcon className="text-indigo-500" size={28} /> Dedicated Quests
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
             {modules.map(mod => (
               <button 
                 key={mod.id} 
                 onClick={() => setActiveQuest({ world: currentWorld, subject: mod.id })}
                 className={`${mod.color} text-white rounded-[40px] p-8 text-left transition-all hover:-translate-y-2 hover:shadow-2xl ${mod.shadow} relative overflow-hidden group border-b-[8px] border-black/10`}
               >
                 <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mb-16 backdrop-blur-sm group-hover:scale-110 transition-transform">
                   {mod.icon}
                 </div>
                 <h4 className="text-3xl font-black mb-2">{mod.title}</h4>
                 <p className="text-white/80 font-bold">{mod.desc}</p>
                 <div className="absolute -right-10 -bottom-10 opacity-10 group-hover:opacity-20 transition-opacity">
                    {React.cloneElement(mod.icon, { size: 160 })}
                 </div>
               </button>
             ))}
          </div>
        </section>

        <section>
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-[48px] border-b-[12px] border-black/30 p-8 md:p-12 text-white shadow-2xl relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl group-hover:bg-indigo-500/30 transition-colors"></div>
             <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 relative z-10">
                <div className="flex items-center gap-6 md:gap-8">
                  <div className="w-20 h-20 md:w-28 md:h-28 bg-gradient-to-br from-amber-400 to-orange-500 rounded-[32px] flex items-center justify-center text-white shadow-xl shadow-orange-500/20 border-4 border-white/10 group-hover:scale-105 transition-transform">
                    <ShieldCheckIcon size={48} />
                  </div>
                  <div>
                    <span className="px-4 py-1.5 bg-amber-500/20 text-amber-300 rounded-lg font-black text-xs uppercase tracking-widest mb-3 inline-block">End of Week Summary</span>
                    <h2 className="text-3xl md:text-5xl font-black mb-3 text-white">Weekly Mock Test</h2>
                    <p className="text-indigo-200 font-bold text-lg md:text-xl max-w-xl">Challenge yourself with a mixed set of Maths, English, VR, and NVR tailored to your Year {activeStudent.year} level.</p>
                  </div>
                </div>
                <button onClick={() => setActiveQuest({ world: currentWorld, subject: 'mock' })} className="bg-white text-slate-900 font-black px-10 md:px-12 py-6 md:py-8 rounded-[32px] shadow-xl text-xl flex items-center justify-center gap-3 active:scale-95 transition-all hover:bg-slate-50 w-full lg:w-auto hover:text-indigo-600">
                  Start Mock Test <ArrowRightIcon size={24} />
                </button>
             </div>
          </div>
        </section>
      </main>

      {activeQuest && <QuizEngine world={activeQuest.world} student={activeStudent} subject={activeQuest.subject} mistakes={activeStudent.prog.mistakes} onComplete={(r) => handleCompleteQuest(r, activeQuest.subject)} onClose={() => setActiveQuest(null)} />}
      {showJournal && <MistakeJournal mistakes={activeStudent.prog.mistakes} onClose={() => setShowJournal(false)} />}
    </div>
  );
}
