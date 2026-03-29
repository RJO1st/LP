"use client";
/**
 * LaunchPard Landing Page — Dark Space Revamp (March 2026)
 * Deploy to: src/app/page.jsx
 *
 * Changes:
 *   - Dark space theme: bg-[#080c15] with gradient to #0f1629
 *   - Parent-centred copy (outcome-focused, honest pricing)
 *   - Amber accent (#fbbf24) for primary CTAs
 *   - Indigo (#6366f1) for secondary
 *   - NO RAINBOW anywhere
 *   - Mobile-first responsive
 */
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import DarkModeToggle from '@/components/theme/DarkModeToggle';

const pseudoRandom = (seed, salt = 0) => {
  const x = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};
const STARS = Array.from({ length: 80 }, (_, i) => ({
  left: (pseudoRandom(i, 1) * 100).toFixed(4) + "%",
  top: (pseudoRandom(i, 2) * 100).toFixed(4) + "%",
  animationDelay: (pseudoRandom(i, 3) * 3).toFixed(4) + "s",
  opacity: (pseudoRandom(i, 4) * 0.3 + 0.05).toFixed(4),
  size: pseudoRandom(i, 5) > 0.85 ? 2 : 1,
}));

const FEATURES = [
  { icon: '📈', title: 'Questions That Get Harder as They Get Smarter', desc: "Start easy, stay engaged. As your child masters each concept, the AI automatically raises the bar. No boredom. No frustration.", light: 'bg-slate-800/40 border-indigo-500/30' },
  { icon: '🎯', title: 'A Tutor Who Knows When to Push and When to Pause', desc: "Tara learns your child's pace. When they need encouragement, a hint, or another try, it adjusts. One AI tutor per child, not one lesson for everyone.", light: 'bg-slate-800/40 border-indigo-500/30' },
  { icon: '📊', title: 'Finally See What They Actually Know', desc: "No guessing. Mastery by topic. Time spent. Weak areas flagged. Weekly reports to your inbox so you're never in the dark.", light: 'bg-slate-800/40 border-indigo-500/30' },
  { icon: '🏆', title: 'Real Exam Conditions. Real Confidence.', desc: "Timed mocks for 11+ grammar schools, GCSE, WAEC/BECE, and IB. Predicted grades tell you exactly where they stand before exam day.", light: 'bg-slate-800/40 border-indigo-500/30' },
  { icon: '💪', title: "They'll Ask to Do Their Homework", desc: "Stardust rewards, digital pets that evolve, leaderboards, career links, weekly missions. They log in because they want to, not because you told them to.", light: 'bg-slate-800/40 border-indigo-500/30' },
  { icon: '🌍', title: 'Your Country. Your Curriculum. Fully Covered.', desc: "12 curricula built from scratch for the UK, Nigeria, Canada, Australia, IB, and US. Not a one-size-fits-all US platform pretending to fit.", light: 'bg-slate-800/40 border-indigo-500/30' },
];

const AGE_BANDS = [
  { band: 'KS1', ages: '5–7', title: 'Magical Adventure', icon: '🦄', color: 'from-amber-400 to-orange-500', bgLight: 'bg-slate-800/40', border: 'border-indigo-500/30',
    features: ['Treasure map skill explorer', 'Story-mode daily adventures', 'Digital pet that evolves with learning', 'Friendly caterpillar timer (no stress)', 'Stars instead of scores'],
    taraVoice: '"Wow, you got it right! The unicorn is so happy! 🦄"' },
  { band: 'KS2', ages: '8–11', title: 'Space Explorer', icon: '🚀', color: 'from-indigo-500 to-purple-600', bgLight: 'bg-slate-800/40', border: 'border-indigo-500/30',
    features: ['Galaxy map with planets per subject', 'Quest journal with mission narratives', 'Commander rankings leaderboard', 'Rocket fuel timer bar', 'Career exploration pop-ups'],
    taraVoice: '"Mission complete, Commander! Your logic is stellar! 🚀"' },
  { band: 'KS3', ages: '12–14', title: 'Career Simulator', icon: '🔭', color: 'from-sky-500 to-cyan-600', bgLight: 'bg-slate-800/40', border: 'border-sky-500/30',
    features: ['Data-rich node graph skill map', 'Real-world career connections', 'Weekly goal setting', 'Peer comparison percentiles', 'Revision planner with AI schedule'],
    taraVoice: '"Nice work. This technique is key for exams."' },
  { band: 'KS4', ages: '15–17', title: 'Exam Studio', icon: '📐', color: 'from-violet-500 to-purple-700', bgLight: 'bg-slate-800/40', border: 'border-violet-500/30',
    features: ['Predicted grades + exam countdown', 'Heatmap mastery view', 'Timed GCSE/WAEC mock tests', 'AI flashcards from weak topics', 'Keyboard shortcuts for power users'],
    taraVoice: '"Correct. Mark scheme note: show working for full marks."' },
];

const CURRICULA = [
  { flag: '🇬🇧', name: 'UK National', desc: 'KS1–KS4 · Y1–Y13', tag: '11+ & GCSE Prep', tagColor: 'bg-indigo-900/40 text-indigo-300' },
  { flag: '🇳🇬', name: 'Nigerian NERDC', desc: 'Primary · JSS · SSS', tag: 'WAEC/NECO Prep', tagColor: 'bg-emerald-900/40 text-emerald-300' },
  { flag: '🇦🇺', name: 'Australian ACARA', desc: 'Foundation–Year 9', tag: null },
  { flag: '🇨🇦', name: 'Canadian', desc: 'Grade 1–12', tag: 'Primary & Secondary' , tagColor: 'bg-red-900/40 text-red-300' },
  { flag: '🌐', name: 'IB PYP / MYP', desc: 'International Baccalaureate', tag: null },
  { flag: '🇺🇸', name: 'US Common Core', desc: 'Grade 1–8', tag: null },
];

const FAQS = [
  { q: "What curricula does LaunchPard support?", a: "12 curricula: UK National (KS1–KS4), UK 11+, Nigerian Primary, JSS and SSS (with Science/Humanities/Business streams), Canadian Primary and Secondary, US Common Core, IB PYP and MYP, and Australian ACARA." },
  { q: "What ages is it suitable for?", a: "Scholars aged 5–17. The platform adapts visuals, language, difficulty, and even the AI tutor's personality based on your child's age." },
  { q: "How does the age-adaptive system work?", a: "A 6-year-old sees a magical treasure map with friendly characters. An 11-year-old explores a space galaxy. A 14-year-old gets a clean, data-rich dashboard with career links. A 16-year-old gets an exam-focused command centre with predicted grades. Same engine, different experience." },
  { q: "Is there a free version?", a: "Yes. The free plan gives your scholar 10 questions per day across all subjects. No card needed. Free plan stays free." },
  { q: "Does it help with 11+, GCSE, or WAEC?", a: "Yes. Our Exam Mode add-on (+£3.99/mo) includes timed mock tests for 11+ grammar school entry, GCSE practice, and WAEC/BECE papers under real exam conditions with predicted grades." },
  { q: "Can I have multiple children on one account?", a: "On Pro, you can add up to 3 scholars. Each gets their own curriculum, progress tracking, and age-adapted experience." },
  { q: "Is my child's data safe?", a: "We are GDPR and NDPR compliant. No ads, no data selling, no third-party tracking. Your scholar's data is used only to personalise their learning." },
  { q: "Can I cancel anytime?", a: "Yes. No contracts, no cancellation fees. 30-day money-back guarantee on all paid plans." },
];

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-300 dark:border-slate-700/80">
      <button onClick={() => setOpen(!open)} className="w-full text-left py-5 flex items-start justify-between gap-4 group">
        <span className="text-slate-900 dark:text-slate-100 font-bold text-[15px] leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{q}</span>
        <span className={`text-indigo-600 dark:text-indigo-400 text-xl leading-none font-bold mt-0.5 transition-transform duration-200 flex-shrink-0 ${open ? "rotate-45" : ""}`}>+</span>
      </button>
      <div className={`grid transition-all duration-300 ${open ? "grid-rows-[1fr] pb-5" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden"><p className="text-slate-700 dark:text-slate-400 text-sm leading-relaxed">{a}</p></div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0);
  const [activeFeature, setActiveFeature] = useState(0);
  const [activeBand, setActiveBand] = useState(0);
  const [annual, setAnnual] = useState(true);
  const [navScrolled, setNavScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => { setScrollY(window.scrollY); setNavScrolled(window.scrollY > 20); };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setActiveFeature(f => (f + 1) % FEATURES.length), 3500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setActiveBand(b => (b + 1) % AGE_BANDS.length), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-slate-100 dark:from-[#080c15] dark:via-[#0a0f1a] dark:to-[#0f1629] text-slate-900 dark:text-slate-100 font-sans overflow-x-hidden transition-colors duration-300">
      {/* Stars - only visible in dark mode */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden opacity-0 dark:opacity-100 transition-opacity duration-300">
        {STARS.map((s, i) => <div key={i} className="absolute rounded-full bg-white animate-twinkle" style={{ left: s.left, top: s.top, animationDelay: s.animationDelay, opacity: s.opacity, width: s.size+'px', height: s.size+'px' }} />)}
      </div>
      <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-indigo-500/20 rounded-full blur-3xl animate-float pointer-events-none opacity-0 dark:opacity-100 transition-opacity duration-300" />
      <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-3xl animate-float-delayed pointer-events-none opacity-0 dark:opacity-100 transition-opacity duration-300" />

      {/* ═══ NAV ═══ */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${navScrolled ? 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-white/10' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <Image src="/logo.svg" alt="LaunchPard" width={34} height={34} style={{ objectFit: "contain" }} />
            <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">LaunchPard</span>
          </Link>
          <div className="hidden sm:flex items-center gap-6 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <button onClick={() => document.getElementById('age-bands')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Ages 5–17</button>
            <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Features</button>
            <button onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Pricing</button>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <DarkModeToggle />
            <Link href="/login" className="text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-semibold text-sm px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/40 transition-colors whitespace-nowrap">Sign In</Link>
            <Link href="/signup" className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold shadow-md shadow-indigo-500/20 transition-all whitespace-nowrap rounded-full px-4 py-2 text-sm sm:px-5 sm:py-2.5">
              Start Free
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="relative z-10 px-4 sm:px-6 pt-28 pb-20">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-slate-100 dark:bg-slate-800/40 backdrop-blur-sm border border-slate-300 dark:border-indigo-500/30 rounded-full px-4 py-2 mb-8 animate-fade-in">
            <span className="relative flex h-2 w-2"><span className="animate-ping absolute h-full w-full rounded-full bg-indigo-500 opacity-75" /><span className="relative rounded-full h-2 w-2 bg-indigo-500" /></span>
            <span className="text-sm font-bold text-indigo-600 dark:text-indigo-300">12 curricula · Ages 5–17 · 6 countries</span>
          </div>
          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black mb-6 leading-[0.95] animate-fade-in-up text-slate-900 dark:text-slate-50">
            <span className="block mb-3">Their Learning.</span>
            <span className="block mb-3">Their Pace.</span>
            <span className="block text-indigo-600 dark:text-indigo-400">Their Path.</span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-700 dark:text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed animate-fade-in-up animation-delay-200">
            You stop guessing. They start progressing. AI that adapts to your child's age, curriculum, and level. Every question is pitched at the right difficulty, every time.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10 animate-fade-in-up animation-delay-400">
            <Link href="/signup" className="group bg-indigo-500 hover:bg-indigo-600 text-white font-black text-lg px-8 py-4 rounded-2xl shadow-xl shadow-indigo-500/30 hover:scale-105 transition-all inline-flex items-center justify-center gap-2">
              Start Your Child's Free Path <span className="group-hover:translate-x-1 transition-transform">→</span>
            </Link>
            <button onClick={() => document.getElementById('age-bands')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-slate-200 dark:bg-slate-800/40 backdrop-blur-xl border border-slate-300 dark:border-white/10 hover:border-indigo-400 dark:hover:border-indigo-500/40 text-slate-900 dark:text-slate-100 font-bold text-lg px-8 py-4 rounded-2xl hover:scale-105 transition-all">
              See How It Works
            </button>
          </div>
          <div className="flex flex-wrap justify-center gap-5 sm:gap-8 text-sm text-slate-600 dark:text-slate-400 animate-fade-in-up animation-delay-600">
            {[["✓","Free plan available"],["🛡️","GDPR compliant"],["⚡","Cancel anytime"],["🔒","No data selling"]].map(([icon,text],i) => (
              <span key={i} className="flex items-center gap-1.5"><span className="text-indigo-600 dark:text-indigo-400">{icon}</span>{text}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ AGE BANDS ═══ */}
      <section id="age-bands" className="relative z-10 px-4 sm:px-6 py-20 sm:py-28 bg-slate-100 dark:bg-slate-800/20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <span className="inline-block text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 bg-slate-200 dark:bg-slate-800/40 border border-slate-300 dark:border-indigo-500/30 px-4 py-1.5 rounded-full mb-5">Adapts As They Grow</span>
            <h2 className="text-4xl sm:text-5xl font-black mb-4 text-slate-900 dark:text-slate-50">4 Worlds. 1 Platform.</h2>
            <p className="text-lg text-slate-700 dark:text-slate-300 max-w-xl mx-auto">From magical adventures at age 5 to exam preparation at age 17. They never outgrow LaunchPard. They graduate to the next world.</p>
          </div>

          {/* Band selector tabs */}
          <div className="flex justify-center gap-2 mb-10 flex-wrap">
            {AGE_BANDS.map((b, i) => (
              <button key={i} onClick={() => setActiveBand(i)}
                className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold transition-all ${
                  activeBand === i
                    ? `bg-gradient-to-r ${b.color} text-white shadow-lg shadow-slate-900/30`
                    : 'bg-slate-200 dark:bg-slate-800/40 border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-indigo-400 dark:hover:border-indigo-500/40'
                }`}>
                <span className="text-lg">{b.icon}</span>
                <span>{b.band} ({b.ages})</span>
              </button>
            ))}
          </div>

          {/* Active band showcase */}
          {(() => {
            const b = AGE_BANDS[activeBand];
            return (
              <div className={`bg-white dark:bg-slate-800/40 border border-slate-300 dark:border-indigo-500/30 rounded-3xl overflow-hidden transition-all duration-500 backdrop-blur-xl`}>
                <div className="grid md:grid-cols-2">
                  {/* Left: info */}
                  <div className="p-8 sm:p-10 flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-5">
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${b.color} flex items-center justify-center text-2xl shadow-lg shadow-slate-900/30`}>{b.icon}</div>
                      <div>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-slate-50">{b.title}</h3>
                        <p className="text-slate-600 dark:text-slate-400 text-sm">{b.band} · Ages {b.ages}</p>
                      </div>
                    </div>
                    <div className="space-y-2.5 mb-6">
                      {b.features.map((f, i) => (
                        <div key={i} className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-300">
                          <span className="text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5">✓</span><span>{f}</span>
                        </div>
                      ))}
                    </div>
                    <div className="bg-slate-100 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-300 dark:border-white/10">
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Tara speaks their language</p>
                      <p className="text-slate-700 dark:text-slate-300 text-sm italic leading-relaxed">{b.taraVoice}</p>
                    </div>
                  </div>
                  {/* Right: visual */}
                  <div className="p-8 sm:p-10 bg-slate-50 dark:bg-slate-900/40 flex items-center justify-center border-t md:border-t-0 md:border-l border-slate-200 dark:border-white/5">
                    <div className="text-center space-y-4 w-full max-w-xs">
                      <div className="text-7xl mb-2">{b.icon}</div>
                      <div className={`text-2xl font-black text-transparent bg-gradient-to-r ${b.color} bg-clip-text`}>{b.title}</div>
                      <p className="text-slate-600 dark:text-slate-400 text-sm">{b.band} · {b.ages} · Adaptive AI</p>
                      <Link href="/signup" className={`inline-block bg-gradient-to-r ${b.color} text-white font-bold px-6 py-3 rounded-2xl text-sm shadow-lg shadow-slate-900/30 hover:scale-105 transition-all`}>
                        Try {b.band} Experience →
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </section>

      {/* ═══ PROBLEM ═══ */}
      <section className="relative z-10 px-4 sm:px-6 py-16 sm:py-20">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-black text-center mb-10 text-slate-900 dark:text-slate-50">Sound familiar?</h2>
          <div className="space-y-4">
            {[
              "You bought a maths app. It was opened twice and never touched again.",
              "Report card says 'working towards expected'. Expected in what, exactly?",
              "Your 7-year-old and 14-year-old need completely different things. One app shouldn't try to treat them the same.",
            ].map((t,i) => (
              <div key={i} className="flex gap-3.5 items-start bg-slate-100 dark:bg-slate-800/40 backdrop-blur-xl border border-slate-300 dark:border-white/10 rounded-2xl p-5 hover:border-red-300 dark:hover:border-red-500/30 transition-colors">
                <span className="text-red-600 dark:text-red-400 text-lg mt-0.5 flex-shrink-0">✗</span>
                <p className="text-slate-700 dark:text-slate-300 text-[15px] leading-relaxed">{t}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-indigo-600 dark:text-indigo-400 font-black text-xl">LaunchPard adapts to every child. One subscription.</p>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section id="how-it-works" className="relative z-10 px-4 sm:px-6 py-20 sm:py-28 bg-slate-100 dark:bg-slate-800/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 bg-slate-200 dark:bg-slate-800/40 border border-slate-300 dark:border-indigo-500/30 px-4 py-1.5 rounded-full mb-5">How LaunchPard Works</span>
            <h2 className="text-4xl sm:text-5xl font-black mb-4 text-slate-900 dark:text-slate-50">Learn. Track. Test.</h2>
            <p className="text-lg text-slate-700 dark:text-slate-300 max-w-xl mx-auto">Three modes. One platform. Built around how children get better at things.</p>
          </div>
          <div className="grid lg:grid-cols-3 gap-6">
            {[
              { icon:'✏️', title:'Learn', desc:'Adaptive missions that match exactly where your scholar is. The AI identifies gaps and focuses there.', color:'violet', items:['AI adapts difficulty in real time','Age-appropriate themes and language','Digital pets, missions, and Stardust rewards','Spaced repetition for long-term memory'] },
              { icon:'📊', title:'Track', desc:'A guardian dashboard that shows mastery building in real time, across every topic and subject.', color:'cyan', items:['Mastery per topic: Building → On Track → Stellar','Time spent by subject, so you see where effort goes','Career links show real-world relevance','Revision planner suggests what to study next'] },
              { icon:'📝', title:'Test', desc:'Timed mock tests under real exam conditions. Instant marking with predicted grades.', color:'orange', items:['11+ Grammar School preparation','GCSE mock tests with grade predictions','WAEC / BECE practice papers','AI flashcards generated from weak topics'] },
            ].map((card,i) => (
              <div key={i} className="group bg-white dark:bg-slate-800/40 border border-slate-300 dark:border-white/10 rounded-3xl p-8 hover:border-indigo-400 dark:hover:border-indigo-500/40 backdrop-blur-xl transition-all hover:shadow-lg shadow-slate-900/30">
                <div className="text-4xl mb-6">{card.icon}</div>
                <h3 className="text-2xl font-black mb-3 text-slate-900 dark:text-slate-50">{card.title}</h3>
                <p className="text-slate-700 dark:text-slate-400 text-sm leading-relaxed mb-6">{card.desc}</p>
                <div className="space-y-2.5">
                  {card.items.map((item,j) => <div key={j} className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300"><span className="text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5">✓</span><span>{item}</span></div>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section id="features" className="relative z-10 px-4 sm:px-6 py-20 sm:py-28">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl sm:text-5xl font-black mb-4 text-slate-900 dark:text-slate-50">Everything Your Scholar Needs</h2>
            <p className="text-lg text-slate-700 dark:text-slate-300 max-w-xl mx-auto">And everything you need to see their progress.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <div key={i} onMouseEnter={() => setActiveFeature(i)}
                className={`group rounded-3xl border p-7 transition-all duration-300 cursor-default backdrop-blur-xl ${activeFeature === i ? 'bg-slate-100 dark:bg-slate-800/60 border-indigo-400 dark:border-indigo-500/40 shadow-lg shadow-slate-900/30 -translate-y-1' : 'bg-white dark:bg-slate-800/40 border-slate-300 dark:border-white/10'}`}>
                <div className="text-5xl mb-5">{f.icon}</div>
                <h3 className="text-xl font-black mb-3 text-slate-900 dark:text-slate-50">{f.title}</h3>
                <p className="text-slate-700 dark:text-slate-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CURRICULA ═══ */}
      <section className="relative z-10 px-4 sm:px-6 py-20 sm:py-28 bg-slate-100 dark:bg-slate-800/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl sm:text-5xl font-black mb-4 text-slate-900 dark:text-slate-50">One Platform. Twelve Curricula.</h2>
            <p className="text-lg text-slate-700 dark:text-slate-300 max-w-xl mx-auto">Your scholar is enrolled in their curriculum. We make sure every topic is covered.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {CURRICULA.map((c, i) => (
              <div key={i} className="group bg-white dark:bg-slate-800/40 backdrop-blur-xl rounded-2xl border border-slate-300 dark:border-white/10 p-6 hover:border-indigo-400 dark:hover:border-indigo-500/40 transition-all hover:shadow-lg shadow-slate-900/30">
                <div className="text-4xl mb-3">{c.flag}</div>
                <h3 className="text-lg font-black mb-1 text-slate-900 dark:text-slate-50 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{c.name}</h3>
                <p className="text-slate-700 dark:text-slate-400 text-sm mb-3">{c.desc}</p>
                {c.tag && <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full ${c.tagColor}`}>{c.tag}</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SOCIAL PROOF ═══ */}
      <section className="relative z-10 px-4 sm:px-6 py-16 bg-slate-100 dark:bg-slate-800/20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-black mb-10 text-slate-900 dark:text-slate-50">LaunchPard in numbers</h2>
          <div className="grid sm:grid-cols-4 gap-5 mb-8">
            {[
              { stat:"12", label:"Curricula", sub:"UK · Nigeria · Canada · Australia · IB · US" },
              { stat:"100K+", label:"Questions", sub:"Quality-validated & curriculum-aligned" },
              { stat:"5–17", label:"Ages", sub:"Year 1 through GCSE & WAEC" },
              { stat:"4", label:"Age Bands", sub:"Each with their own themed world" },
            ].map((s,i) => (
              <div key={i} className="bg-white dark:bg-slate-800/40 border border-slate-300 dark:border-white/10 rounded-2xl p-5 backdrop-blur-xl">
                <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400 mb-1">{s.stat}</div>
                <div className="text-slate-900 dark:text-slate-50 font-bold text-sm mb-1">{s.label}</div>
                <div className="text-slate-700 dark:text-slate-400 text-xs">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PRICING ═══ */}
      <section id="pricing" className="relative z-10 px-4 sm:px-6 py-20 sm:py-28">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-4xl sm:text-5xl font-black mb-4 text-slate-900 dark:text-slate-50">Simple, Honest Pricing</h2>
            <p className="text-lg text-slate-700 dark:text-slate-300 mb-8">One price for every family, everywhere.</p>
            <div className="flex justify-center">
              <div className="flex bg-slate-200 dark:bg-slate-800/40 rounded-lg p-0.5 gap-0.5 border border-slate-300 dark:border-white/10">
                <button onClick={() => setAnnual(false)} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${!annual ? "bg-white dark:bg-slate-700/60 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-600 dark:text-slate-400"}`}>Monthly</button>
                <button onClick={() => setAnnual(true)} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${annual ? "bg-white dark:bg-slate-700/60 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-600 dark:text-slate-400"}`}>Annual <span className="text-emerald-600 dark:text-emerald-400 ml-1 text-[10px]">2 months free</span></button>
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-5 max-w-3xl mx-auto">
            {/* Free */}
            <div className="bg-white dark:bg-slate-800/40 backdrop-blur-xl border border-slate-300 dark:border-white/10 rounded-3xl p-7 flex flex-col">
              <h3 className="text-xl font-black mb-1 text-slate-900 dark:text-slate-50">Free Plan</h3>
              <p className="text-slate-600 dark:text-slate-400 text-xs mb-5">No card needed. Free plan stays free.</p>
              <div className="mb-6"><span className="text-4xl font-black text-indigo-600 dark:text-indigo-400">£0</span></div>
              <ul className="space-y-2.5 text-sm text-slate-700 dark:text-slate-300 mb-7 flex-1">
                {["1 scholar","Your enrolled curriculum","All subjects","10 questions per day","Age-adaptive experience"].map(f => <li key={f} className="flex items-start gap-2"><span className="text-indigo-600 dark:text-indigo-400 mt-0.5">✓</span>{f}</li>)}
              </ul>
              <Link href="/signup" className="block text-center border border-slate-300 dark:border-white/10 hover:border-indigo-400 dark:hover:border-indigo-500/40 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 text-slate-900 dark:text-slate-100 font-bold py-3 rounded-xl text-sm transition-all">Create Free Account</Link>
            </div>

            {/* Pro */}
            <div className="relative bg-slate-50 dark:bg-slate-800/60 backdrop-blur-xl border-2 border-indigo-400 dark:border-indigo-500/40 rounded-3xl p-7 flex flex-col shadow-lg shadow-indigo-500/20">
              {annual && <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-500 to-purple-600 text-slate-900 text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-wider">Most popular</div>}
              <h3 className="text-xl font-black mb-1 text-slate-900 dark:text-slate-50">Pro</h3>
              <p className="text-slate-600 dark:text-slate-400 text-xs mb-5">Unlimited questions, 3 scholars, weekly reports</p>
              <div className="mb-1">
                <span className="text-4xl font-black text-indigo-600 dark:text-indigo-400">£{annual ? "9.17" : "12.99"}</span>
                <span className="text-slate-600 dark:text-slate-400 text-sm ml-1">/mo</span>
              </div>
              {annual ? <p className="text-emerald-600 dark:text-emerald-400 text-xs font-bold mb-5">Billed £109.99/yr · Save £46</p> : <p className="text-slate-600 dark:text-slate-400 text-xs mb-5">or £109.99/yr with annual</p>}
              <ul className="space-y-2.5 text-sm text-slate-700 dark:text-slate-300 mb-7 flex-1">
                {["Up to 3 scholars","Unlimited questions","Tara AI tutor (age-adaptive)","Full guardian dashboard","Weekly missions & reports","Digital pets & leaderboards","Revision planner (KS3/KS4)","Certificates & achievements"].map(f => <li key={f} className="flex items-start gap-2"><span className="text-indigo-600 dark:text-indigo-400 mt-0.5">✓</span>{f}</li>)}
              </ul>
              <Link href="/signup" className="block text-center bg-indigo-500 hover:bg-indigo-600 text-white font-black py-3 rounded-xl text-sm transition-all shadow-md shadow-indigo-500/20">30-Day Pro Trial. No Card Needed.</Link>
            </div>

            {/* Exam Mode */}
            <div className="bg-white dark:bg-slate-800/40 backdrop-blur-xl border border-slate-300 dark:border-white/10 rounded-3xl p-7 flex flex-col">
              <h3 className="text-xl font-black mb-1 text-slate-900 dark:text-slate-50">Exam Mode</h3>
              <p className="text-slate-600 dark:text-slate-400 text-xs mb-5">Add-on for Pro subscribers</p>
              <div className="mb-6"><span className="text-4xl font-black text-indigo-600 dark:text-indigo-400">+£3.99</span><span className="text-slate-600 dark:text-slate-400 text-sm ml-1">/mo</span></div>
              <ul className="space-y-2.5 text-sm text-slate-700 dark:text-slate-300 mb-7 flex-1">
                {["Everything in Pro","Timed 11+ mock tests","GCSE practice papers","WAEC/BECE practice papers","Predicted grades","Exam countdowns","AI flashcards"].map(f => <li key={f} className="flex items-start gap-2"><span className="text-indigo-600 dark:text-indigo-400 mt-0.5">✓</span>{f}</li>)}
              </ul>
              <Link href="/signup" className="block text-center border border-slate-300 dark:border-white/10 hover:border-indigo-400 dark:hover:border-indigo-500/40 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 text-slate-900 dark:text-slate-100 font-bold py-3 rounded-xl text-sm transition-all">Start with Pro First</Link>
            </div>
          </div>
          <p className="text-center text-slate-700 dark:text-slate-400 text-xs mt-6">After your trial, keep free access. 10 questions per day. 30-day money-back guarantee. Cancel anytime. Same price worldwide.</p>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section id="faq" className="relative z-10 px-4 sm:px-6 py-20 sm:py-28 bg-slate-100 dark:bg-slate-800/20">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-black text-center mb-10 text-slate-900 dark:text-slate-50">Frequently Asked Questions</h2>
          {FAQS.map((f,i) => <FaqItem key={i} q={f.q} a={f.a} />)}
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className="relative z-10 px-4 sm:px-6 py-24 bg-gradient-to-r from-slate-200 dark:from-slate-800/40 to-slate-100 dark:to-slate-900/40 border-y border-slate-300 dark:border-white/10">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-black mb-6 text-slate-900 dark:text-slate-50">Try It Free. See the Difference in a Week.</h2>
          <p className="text-xl text-slate-700 dark:text-slate-300 mb-10">Families in Australia, Canada, England, and Nigeria already use LaunchPard. Your child can start today.</p>
          <Link href="/signup" className="inline-block bg-indigo-500 hover:bg-indigo-600 text-white font-black text-xl px-12 py-5 rounded-2xl shadow-2xl shadow-indigo-500/30 hover:scale-105 transition-all">Start Your Child's Free Path</Link>
          <p className="text-slate-700 dark:text-slate-400 text-sm mt-5">No credit card required · Set up in 60 seconds</p>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="relative z-10 border-t border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-slate-900/40 backdrop-blur">
        <div className="border-b border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-slate-800/40 px-4 sm:px-6 py-8">
          <div className="max-w-7xl mx-auto">
            <p className="text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 mb-5 text-center">Legal &amp; Resources</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 max-w-5xl mx-auto">
              {[{icon:'📋',title:'Terms & Conditions',desc:'Your rights and obligations',href:'/terms'},{icon:'🔒',title:'Privacy Policy',desc:'How we protect your data',href:'/privacy-policy'},{icon:'🍪',title:'Cookie Policy',desc:'What cookies we use',href:'/cookie-policy'},{icon:'🛡️',title:'Safeguarding Policy',desc:'How we protect children',href:'/safeguarding'},{icon:'📝',title:'Blog',desc:'Learning insights & tips',href:'/blog'}].map((d,i) => (
                <Link key={i} href={d.href} className="group flex items-start gap-3 bg-white dark:bg-slate-800/40 hover:bg-slate-200 dark:hover:bg-slate-800/60 border border-slate-300 dark:border-white/10 hover:border-indigo-400 dark:hover:border-indigo-500/40 rounded-xl p-4 transition-all hover:shadow-sm backdrop-blur-xl">
                  <span className="text-xl flex-shrink-0 mt-0.5">{d.icon}</span>
                  <div><div className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-tight mb-1">{d.title}</div><div className="text-xs text-slate-600 dark:text-slate-400 leading-snug">{d.desc}</div></div>
                </Link>
              ))}
            </div>
          </div>
        </div>
        <div className="px-4 sm:px-6 py-6">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-700 dark:text-slate-400">
            <div className="flex items-center gap-2"><Image src="/logo.svg" alt="LaunchPard" width={24} height={24} style={{ objectFit:"contain" }} /><span className="font-bold text-slate-900 dark:text-slate-100">LaunchPard</span></div>
            <p className="text-xs text-center">© {new Date().getFullYear()} LaunchPard Technologies. All rights reserved.</p>
            <div className="flex items-center gap-4 text-xs">
              <Link href="/terms" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Terms</Link>
              <Link href="/privacy-policy" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Privacy</Link>
              <Link href="/cookie-policy" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Cookies</Link>
              <Link href="/blog" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Blog</Link>
              <a href="mailto:hello@launchpard.com" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes twinkle { 0%, 100% { opacity: 0.1; } 50% { opacity: 0.55; } }
        @keyframes float { 0%, 100% { transform: translate(0,0); } 50% { transform: translate(25px,-25px); } }
        @keyframes float-delayed { 0%, 100% { transform: translate(0,0); } 50% { transform: translate(-25px,25px); } }
        @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fade-in-up { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        .animate-twinkle { animation: twinkle 3s ease-in-out infinite; }
        .animate-float { animation: float 20s ease-in-out infinite; }
        .animate-float-delayed { animation: float-delayed 25s ease-in-out infinite; }
        .animate-shimmer { animation: shimmer 3s linear infinite; }
        .animate-fade-in { animation: fade-in 0.8s ease-out forwards; }
        .animate-fade-in-up { animation: fade-in-up 0.7s ease-out forwards; }
        .animation-delay-200 { animation-delay: 0.2s; opacity: 0; }
        .animation-delay-400 { animation-delay: 0.4s; opacity: 0; }
        .animation-delay-600 { animation-delay: 0.6s; opacity: 0; }
        .animation-delay-800 { animation-delay: 0.8s; opacity: 0; }
      `}</style>
    </div>
  );
}
