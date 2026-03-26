"use client";
/**
 * LaunchPard Landing Page — March 2026 (Revamped)
 * Deploy to: src/app/page.jsx
 *
 * Changes from v1:
 *   - Single global pricing: £12.99/mo, +£3.99 exam mode (no locale switcher)
 *   - 12 curricula (was 11), ages 5-17, KS4 (Y10-13) added
 *   - 4 age-band showcase: KS1 Magical Adventure → KS4 Exam Studio
 *   - New features: adaptive dashboard, flashcards, revision planner, digital pets, career links
 *   - Hero mockup shows actual adaptive dashboard
 */
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

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
  { icon: '🤖', title: 'Tara — AI Tutor That Grows With Them', desc: "Age 5: warm and playful. Age 11: bold and encouraging. Age 16: precise and exam-focused. Tara adapts her personality to your scholar's age.", light: 'bg-violet-50 border-violet-200' },
  { icon: '📚', title: 'Your Curriculum. Fully Covered.', desc: "12 curricula across 6 countries. Built from the ground up for your national curriculum — not a US platform pretending to fit.", light: 'bg-cyan-50 border-cyan-200' },
  { icon: '📝', title: 'Exam Mode When It Counts', desc: 'Timed mock tests under real exam conditions. 11+ grammar school, GCSE, WAEC/BECE and IB practice papers with predicted grades.', light: 'bg-orange-50 border-orange-200' },
  { icon: '📊', title: 'See What They Actually Know', desc: "Guardian dashboard shows mastery per topic, time spent, streaks, and what to practise next. Weekly reports to your inbox.", light: 'bg-emerald-50 border-emerald-200' },
  { icon: '🧠', title: 'Adaptive AI Engine', desc: 'Questions adjust in real time. Too easy? It challenges them. Struggling? It builds confidence at the right level. Spaced repetition ensures they remember.', light: 'bg-pink-50 border-pink-200' },
  { icon: '🚀', title: 'Missions They Want To Do', desc: 'Stardust rewards, evolving digital pets, mastery certificates, weekly missions, career links, and leaderboards. Scholars come back because they want to.', light: 'bg-amber-50 border-amber-200' },
];

const AGE_BANDS = [
  { band: 'KS1', ages: '5–7', title: 'Magical Adventure', icon: '🦄', color: 'from-amber-400 to-orange-500', bgLight: 'bg-amber-50', border: 'border-amber-200',
    features: ['Treasure map skill explorer', 'Story-mode daily adventures', 'Digital pet that evolves with learning', 'Friendly caterpillar timer — no stress', 'Stars instead of scores'],
    taraVoice: '"Wow, you got it right! The unicorn is so happy! 🦄"' },
  { band: 'KS2', ages: '8–11', title: 'Space Explorer', icon: '🚀', color: 'from-indigo-500 to-purple-600', bgLight: 'bg-indigo-50', border: 'border-indigo-200',
    features: ['Galaxy map with planets per subject', 'Quest journal with mission narratives', 'Commander rankings leaderboard', 'Rocket fuel timer bar', 'Career exploration pop-ups'],
    taraVoice: '"Mission complete, Commander! Your logic is stellar! 🚀"' },
  { band: 'KS3', ages: '12–14', title: 'Career Simulator', icon: '🔭', color: 'from-sky-500 to-cyan-600', bgLight: 'bg-sky-50', border: 'border-sky-200',
    features: ['Data-rich node graph skill map', 'Real-world career connections', 'Weekly goal setting', 'Peer comparison percentiles', 'Revision planner with AI schedule'],
    taraVoice: '"Nice work. This technique is key for exams."' },
  { band: 'KS4', ages: '15–17', title: 'Exam Studio', icon: '📐', color: 'from-violet-500 to-purple-700', bgLight: 'bg-violet-50', border: 'border-violet-200',
    features: ['Predicted grades + exam countdown', 'Heatmap mastery view', 'Timed GCSE/WAEC mock tests', 'AI flashcards from weak topics', 'Keyboard shortcuts for power users'],
    taraVoice: '"Correct. Mark scheme note: show working for full marks."' },
];

const CURRICULA = [
  { flag: '🇬🇧', name: 'UK National', desc: 'KS1–KS4 · Y1–Y13', tag: '11+ & GCSE Prep', tagColor: 'bg-indigo-100 text-indigo-700' },
  { flag: '🇳🇬', name: 'Nigerian NERDC', desc: 'Primary · JSS · SSS', tag: 'WAEC/NECO Prep', tagColor: 'bg-green-100 text-green-700' },
  { flag: '🇦🇺', name: 'Australian ACARA', desc: 'Foundation–Year 9', tag: null },
  { flag: '🇨🇦', name: 'Canadian', desc: 'Grade 1–12', tag: 'Primary & Secondary' , tagColor: 'bg-red-100 text-red-700' },
  { flag: '🌐', name: 'IB PYP / MYP', desc: 'International Baccalaureate', tag: null },
  { flag: '🇺🇸', name: 'US Common Core', desc: 'Grade 1–8', tag: null },
];

const FAQS = [
  { q: "What curricula does LaunchPard support?", a: "12 curricula: UK National (KS1–KS4), UK 11+, Nigerian Primary, JSS and SSS (with Science/Humanities/Business streams), Canadian Primary and Secondary, US Common Core, IB PYP and MYP, and Australian ACARA." },
  { q: "What ages is it suitable for?", a: "Scholars aged 5–17. The platform adapts everything — visuals, language, difficulty, and even the AI tutor's personality — based on your child's age." },
  { q: "How does the age-adaptive system work?", a: "A 6-year-old sees a magical treasure map with friendly characters. An 11-year-old explores a space galaxy. A 14-year-old gets a clean, data-rich dashboard with career links. A 16-year-old gets an exam-focused command centre with predicted grades. Same engine, different experience." },
  { q: "Is there a free version?", a: "Yes. The free plan gives your scholar 10 questions per day across all subjects. Free forever, no card needed." },
  { q: "Does it help with 11+, GCSE, or WAEC?", a: "Yes. Our Exam Mode add-on (+£3.99/mo) includes timed mock tests for 11+ grammar school entry, GCSE practice, and WAEC/BECE papers under real exam conditions with predicted grades." },
  { q: "Can I have multiple children on one account?", a: "On Pro, you can add up to 3 scholars — each enrolled in their own curriculum with independent progress tracking and their own age-adapted experience." },
  { q: "Is my child's data safe?", a: "We are GDPR and NDPR compliant. No ads, no data selling, no third-party tracking. Your scholar's data is used only to personalise their learning." },
  { q: "Can I cancel anytime?", a: "Yes. No contracts, no cancellation fees. 30-day money-back guarantee on all paid plans." },
];

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-200/80">
      <button onClick={() => setOpen(!open)} className="w-full text-left py-5 flex items-start justify-between gap-4 group">
        <span className="text-slate-900 font-bold text-[15px] leading-snug group-hover:text-indigo-600 transition-colors">{q}</span>
        <span className={`text-indigo-400 text-xl leading-none font-bold mt-0.5 transition-transform duration-200 flex-shrink-0 ${open ? "rotate-45" : ""}`}>+</span>
      </button>
      <div className={`grid transition-all duration-300 ${open ? "grid-rows-[1fr] pb-5" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden"><p className="text-slate-500 text-sm leading-relaxed">{a}</p></div>
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
    <div className="min-h-screen bg-[#f0f2ff] text-slate-900 font-sans overflow-x-hidden">
      {/* Stars */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {STARS.map((s, i) => <div key={i} className="absolute rounded-full bg-slate-400 animate-twinkle" style={{ left: s.left, top: s.top, animationDelay: s.animationDelay, opacity: s.opacity, width: s.size+'px', height: s.size+'px' }} />)}
      </div>
      <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-indigo-300/20 rounded-full blur-3xl animate-float pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-purple-300/20 rounded-full blur-3xl animate-float-delayed pointer-events-none" />

      {/* ═══ NAV ═══ */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${navScrolled ? 'bg-white/90 backdrop-blur-xl border-b border-slate-200/80 shadow-sm' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <Image src="/logo.svg" alt="LaunchPard" width={34} height={34} style={{ objectFit: "contain" }} />
            <span className="text-lg sm:text-xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">LaunchPard</span>
          </Link>
          <div className="hidden sm:flex items-center gap-6 text-sm font-semibold text-slate-600">
            <button onClick={() => document.getElementById('age-bands')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-indigo-600 transition-colors">Ages 5–17</button>
            <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-indigo-600 transition-colors">Features</button>
            <button onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-indigo-600 transition-colors">Pricing</button>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link href="/login" className="text-slate-600 hover:text-slate-900 font-semibold text-sm px-3 py-2 rounded-lg hover:bg-slate-100/80 transition-colors whitespace-nowrap">Sign In</Link>
            <Link href="/signup" className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold shadow-md shadow-indigo-500/20 transition-all whitespace-nowrap rounded-full px-4 py-2 text-sm sm:px-5 sm:py-2.5">
              Start Free
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="relative z-10 px-4 sm:px-6 pt-28 pb-20">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-indigo-100/80 border border-indigo-300/50 rounded-full px-4 py-2 mb-8 animate-fade-in backdrop-blur-sm">
            <span className="relative flex h-2 w-2"><span className="animate-ping absolute h-full w-full rounded-full bg-green-400 opacity-75" /><span className="relative rounded-full h-2 w-2 bg-green-500" /></span>
            <span className="text-sm font-bold text-indigo-700">12 curricula · Ages 5–17 · 6 countries</span>
          </div>
          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black mb-6 leading-[0.95] animate-fade-in-up text-slate-900">
            <span className="block mb-3">One Platform.</span>
            <span className="block text-transparent bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 bg-clip-text animate-shimmer bg-[length:200%_auto]">Every Stage.</span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed animate-fade-in-up animation-delay-200">
            The AI&#8209;powered learning engine that <strong className="text-slate-800">adapts to your child&apos;s age, curriculum, and level</strong>. A 6&#8209;year&#8209;old sees a magical adventure. A 16&#8209;year&#8209;old sees an exam command centre. Same engine. Different world.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10 animate-fade-in-up animation-delay-400">
            <Link href="/signup" className="group bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-black text-lg px-8 py-4 rounded-2xl shadow-xl shadow-cyan-500/30 hover:scale-105 transition-all inline-flex items-center justify-center gap-2">
              Start Free — No Card Needed <span className="group-hover:translate-x-1 transition-transform">→</span>
            </Link>
            <button onClick={() => document.getElementById('age-bands')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-white/80 backdrop-blur-xl border border-slate-200 hover:border-indigo-400 text-slate-800 font-bold text-lg px-8 py-4 rounded-2xl hover:scale-105 transition-all">
              See All 4 Stages
            </button>
          </div>
          <div className="flex flex-wrap justify-center gap-5 sm:gap-8 text-sm text-slate-500 animate-fade-in-up animation-delay-600">
            {[["✓","100,000+ questions"],["🛡️","14-day free trial"],["⚡","Cancel anytime"],["🔒","GDPR compliant"]].map(([icon,text],i) => (
              <span key={i} className="flex items-center gap-1.5"><span className="text-green-500">{icon}</span>{text}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ AGE BANDS ═══ */}
      <section id="age-bands" className="relative z-10 px-4 sm:px-6 py-20 sm:py-28 bg-white/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <span className="inline-block text-xs font-black uppercase tracking-widest text-indigo-500 bg-indigo-50 border border-indigo-100 px-4 py-1.5 rounded-full mb-5">Adapts As They Grow</span>
            <h2 className="text-4xl sm:text-5xl font-black mb-4">4 Worlds. 1 Platform.</h2>
            <p className="text-lg text-slate-600 max-w-xl mx-auto">From magical adventures at age 5 to exam preparation at age 17. They never outgrow LaunchPard — they graduate to the next world.</p>
          </div>

          {/* Band selector tabs */}
          <div className="flex justify-center gap-2 mb-10 flex-wrap">
            {AGE_BANDS.map((b, i) => (
              <button key={i} onClick={() => setActiveBand(i)}
                className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold transition-all ${
                  activeBand === i
                    ? `bg-gradient-to-r ${b.color} text-white shadow-lg`
                    : 'bg-white/70 border border-slate-200 text-slate-600 hover:border-indigo-300'
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
              <div className={`${b.bgLight} border ${b.border} rounded-3xl overflow-hidden transition-all duration-500`}>
                <div className="grid md:grid-cols-2">
                  {/* Left: info */}
                  <div className="p-8 sm:p-10 flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-5">
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${b.color} flex items-center justify-center text-2xl shadow-lg`}>{b.icon}</div>
                      <div>
                        <h3 className="text-2xl font-black">{b.title}</h3>
                        <p className="text-slate-500 text-sm">{b.band} · Ages {b.ages}</p>
                      </div>
                    </div>
                    <div className="space-y-2.5 mb-6">
                      {b.features.map((f, i) => (
                        <div key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                          <span className="text-green-500 flex-shrink-0 mt-0.5">✓</span><span>{f}</span>
                        </div>
                      ))}
                    </div>
                    <div className="bg-white/70 rounded-xl p-4 border border-slate-200">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tara speaks their language</p>
                      <p className="text-slate-700 text-sm italic leading-relaxed">{b.taraVoice}</p>
                    </div>
                  </div>
                  {/* Right: visual */}
                  <div className="p-8 sm:p-10 bg-white/40 flex items-center justify-center border-t md:border-t-0 md:border-l border-slate-200/50">
                    <div className="text-center space-y-4 w-full max-w-xs">
                      <div className="text-7xl mb-2">{b.icon}</div>
                      <div className={`text-2xl font-black text-transparent bg-gradient-to-r ${b.color} bg-clip-text`}>{b.title}</div>
                      <p className="text-slate-500 text-sm">{b.band} · {b.ages} · Adaptive AI</p>
                      <Link href="/signup" className={`inline-block bg-gradient-to-r ${b.color} text-white font-bold px-6 py-3 rounded-2xl text-sm shadow-lg hover:scale-105 transition-all`}>
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
          <h2 className="text-3xl sm:text-4xl font-black text-center mb-10">Sound familiar?</h2>
          <div className="space-y-4">
            {[
              "You don't know what your child is actually struggling with at school.",
              "Free apps feel like games with no real learning. Paid ones don't match your curriculum.",
              "Your 7-year-old and 14-year-old need completely different experiences — but you're paying for two platforms.",
            ].map((t,i) => (
              <div key={i} className="flex gap-3.5 items-start bg-white/70 backdrop-blur-xl border border-slate-200 rounded-2xl p-5 hover:border-rose-300 transition-colors">
                <span className="text-rose-400 text-lg mt-0.5 flex-shrink-0">✗</span>
                <p className="text-slate-700 text-[15px] leading-relaxed">{t}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-transparent bg-gradient-to-r from-cyan-500 to-purple-600 bg-clip-text font-black text-xl">LaunchPard adapts to every child. One subscription.</p>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section id="how-it-works" className="relative z-10 px-4 sm:px-6 py-20 sm:py-28 bg-white/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block text-xs font-black uppercase tracking-widest text-indigo-500 bg-indigo-50 border border-indigo-100 px-4 py-1.5 rounded-full mb-5">How LaunchPard Works</span>
            <h2 className="text-4xl sm:text-5xl font-black mb-4">Learn. Track. Test.</h2>
            <p className="text-lg text-slate-600 max-w-xl mx-auto">Three modes. One platform. Built around how children actually improve.</p>
          </div>
          <div className="grid lg:grid-cols-3 gap-6">
            {[
              { icon:'✏️', title:'Learn', desc:'Adaptive missions that match exactly where your scholar is. The AI identifies gaps and focuses there.', color:'violet', items:['AI adapts difficulty in real time','Age-appropriate themes and language','Digital pets, missions, and Stardust rewards','Spaced repetition for long-term memory'] },
              { icon:'📊', title:'Track', desc:'A guardian dashboard that shows mastery building in real time — across every topic and subject.', color:'cyan', items:['Mastery per topic: Building → On Track → Stellar','Time spent by subject — see where effort goes','Career links show real-world relevance','Revision planner suggests what to study next'] },
              { icon:'📝', title:'Test', desc:'Timed mock tests that replicate real exam conditions — then instant marking with predicted grades.', color:'orange', items:['11+ Grammar School preparation','GCSE mock tests with grade predictions','WAEC / BECE practice papers','AI flashcards generated from weak topics'] },
            ].map((card,i) => (
              <div key={i} className={`group bg-gradient-to-br from-${card.color}-50 to-${card.color === 'cyan' ? 'blue' : card.color === 'violet' ? 'indigo' : 'amber'}-50 border border-${card.color}-200 rounded-3xl p-8 hover:shadow-lg transition-all`}>
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br from-${card.color}-500 to-${card.color === 'cyan' ? 'blue' : card.color === 'violet' ? 'indigo' : 'red'}-${card.color === 'orange' ? '500' : '600'} flex items-center justify-center text-white text-2xl mb-6 shadow-md`}>{card.icon}</div>
                <h3 className="text-2xl font-black mb-3">{card.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed mb-6">{card.desc}</p>
                <div className="space-y-2.5">
                  {card.items.map((item,j) => <div key={j} className="flex items-start gap-2.5 text-sm text-slate-700"><span className="text-green-500 flex-shrink-0 mt-0.5">✓</span><span>{item}</span></div>)}
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
            <h2 className="text-4xl sm:text-5xl font-black mb-4">Everything Your Scholar Needs</h2>
            <p className="text-lg text-slate-600 max-w-xl mx-auto">And everything you need to see their progress.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <div key={i} onMouseEnter={() => setActiveFeature(i)}
                className={`group rounded-3xl border p-7 transition-all duration-300 cursor-default ${activeFeature === i ? f.light + ' shadow-md -translate-y-1' : 'bg-white/70 border-slate-200'}`}>
                <div className="text-5xl mb-5">{f.icon}</div>
                <h3 className="text-xl font-black mb-3">{f.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CURRICULA ═══ */}
      <section className="relative z-10 px-4 sm:px-6 py-20 sm:py-28 bg-white/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl sm:text-5xl font-black mb-4">One Platform. Twelve Curricula.</h2>
            <p className="text-lg text-slate-600 max-w-xl mx-auto">Your scholar is enrolled in their curriculum. We make sure every topic is covered.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {CURRICULA.map((c, i) => (
              <div key={i} className="group bg-white/70 backdrop-blur-xl rounded-2xl border border-slate-200 p-6 hover:border-indigo-400 transition-all hover:shadow-md">
                <div className="text-4xl mb-3">{c.flag}</div>
                <h3 className="text-lg font-black mb-1 group-hover:text-indigo-600 transition-colors">{c.name}</h3>
                <p className="text-slate-500 text-sm mb-3">{c.desc}</p>
                {c.tag && <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full ${c.tagColor}`}>{c.tag}</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SOCIAL PROOF ═══ */}
      <section className="relative z-10 px-4 sm:px-6 py-16 bg-white/50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-black mb-10">Built to serve global scholars</h2>
          <div className="grid sm:grid-cols-4 gap-5 mb-8">
            {[
              { stat:"12", label:"Curricula", sub:"UK · Nigeria · Canada · Australia · IB · US" },
              { stat:"100K+", label:"Questions", sub:"Quality-validated & curriculum-aligned" },
              { stat:"5–17", label:"Ages", sub:"Year 1 through GCSE & WAEC" },
              { stat:"4", label:"Age Bands", sub:"Each with their own themed world" },
            ].map((s,i) => (
              <div key={i} className="bg-white/70 border border-slate-200 rounded-2xl p-5">
                <div className="text-3xl font-black text-indigo-600 mb-1">{s.stat}</div>
                <div className="text-slate-900 font-bold text-sm mb-1">{s.label}</div>
                <div className="text-slate-500 text-xs">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PRICING ═══ */}
      <section id="pricing" className="relative z-10 px-4 sm:px-6 py-20 sm:py-28">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-4xl sm:text-5xl font-black mb-4">Simple, Honest Pricing</h2>
            <p className="text-lg text-slate-600 mb-8">One price for every family, everywhere.</p>
            <div className="flex justify-center">
              <div className="flex bg-slate-100 rounded-lg p-0.5 gap-0.5">
                <button onClick={() => setAnnual(false)} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${!annual ? "bg-white text-slate-800 shadow-sm" : "text-slate-400"}`}>Monthly</button>
                <button onClick={() => setAnnual(true)} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${annual ? "bg-white text-slate-800 shadow-sm" : "text-slate-400"}`}>Annual <span className="text-emerald-600 ml-1 text-[10px]">2 months free</span></button>
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-5 max-w-3xl mx-auto">
            {/* Free */}
            <div className="bg-white/70 backdrop-blur-xl border border-slate-200 rounded-3xl p-7 flex flex-col">
              <h3 className="text-xl font-black mb-1">Free</h3>
              <p className="text-slate-500 text-xs mb-5">No card needed. Free forever.</p>
              <div className="mb-6"><span className="text-4xl font-black">£0</span></div>
              <ul className="space-y-2.5 text-sm text-slate-600 mb-7 flex-1">
                {["1 scholar","Your enrolled curriculum","All subjects","10 questions per day","Age-adaptive experience"].map(f => <li key={f} className="flex items-start gap-2"><span className="text-slate-400 mt-0.5">✓</span>{f}</li>)}
              </ul>
              <Link href="/signup" className="block text-center border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 text-slate-700 font-bold py-3 rounded-xl text-sm transition-all">Create Free Account</Link>
            </div>

            {/* Pro */}
            <div className="relative bg-white/90 backdrop-blur-xl border-2 border-indigo-400 rounded-3xl p-7 flex flex-col shadow-lg shadow-indigo-200/30">
              {annual && <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-wider">Most popular</div>}
              <h3 className="text-xl font-black mb-1">Pro</h3>
              <p className="text-slate-500 text-xs mb-5">Full power for your family</p>
              <div className="mb-1">
                <span className="text-4xl font-black text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text">£{annual ? "9.17" : "12.99"}</span>
                <span className="text-slate-500 text-sm ml-1">/mo</span>
              </div>
              {annual ? <p className="text-emerald-600 text-xs font-bold mb-5">Billed £109.99/yr · Save £46</p> : <p className="text-slate-400 text-xs mb-5">or £109.99/yr with annual</p>}
              <ul className="space-y-2.5 text-sm text-slate-700 mb-7 flex-1">
                {["Up to 3 scholars","Unlimited questions","Tara AI tutor (age-adaptive)","Full guardian dashboard","Weekly missions & reports","Digital pets & leaderboards","Revision planner (KS3/KS4)","Certificates & achievements"].map(f => <li key={f} className="flex items-start gap-2"><span className="text-indigo-500 mt-0.5">✓</span>{f}</li>)}
              </ul>
              <Link href="/signup" className="block text-center bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-black py-3 rounded-xl text-sm transition-all shadow-md shadow-indigo-500/20">Start 14-Day Free Trial</Link>
            </div>

            {/* Exam Mode */}
            <div className="bg-white/70 backdrop-blur-xl border border-slate-200 rounded-3xl p-7 flex flex-col">
              <h3 className="text-xl font-black mb-1">Exam Mode</h3>
              <p className="text-slate-500 text-xs mb-5">Add-on for Pro subscribers</p>
              <div className="mb-6"><span className="text-4xl font-black">+£3.99</span><span className="text-slate-500 text-sm ml-1">/mo</span></div>
              <ul className="space-y-2.5 text-sm text-slate-600 mb-7 flex-1">
                {["Everything in Pro","Timed 11+ mock tests","GCSE practice papers","WAEC/BECE practice papers","Predicted grades","Exam countdowns","AI flashcards"].map(f => <li key={f} className="flex items-start gap-2"><span className="text-slate-400 mt-0.5">✓</span>{f}</li>)}
              </ul>
              <Link href="/signup" className="block text-center border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 text-slate-700 font-bold py-3 rounded-xl text-sm transition-all">Start with Pro First</Link>
            </div>
          </div>
          <p className="text-center text-slate-400 text-xs mt-6">30-day money-back guarantee. Cancel anytime. Same price worldwide.</p>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section id="faq" className="relative z-10 px-4 sm:px-6 py-20 sm:py-28 bg-white/50">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-black text-center mb-10">Frequently Asked Questions</h2>
          {FAQS.map((f,i) => <FaqItem key={i} q={f.q} a={f.a} />)}
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className="relative z-10 px-4 sm:px-6 py-24 bg-gradient-to-r from-indigo-100/80 to-purple-100/80">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-black mb-6">One platform that grows with your child.</h2>
          <p className="text-xl text-slate-600 mb-10">From their first number bond to their final exam. Join families in Australia, Canada, England, Nigeria, and beyond.</p>
          <Link href="/signup" className="inline-block bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-black text-xl px-12 py-5 rounded-2xl shadow-2xl shadow-cyan-500/30 hover:scale-105 transition-all">Create Free Account</Link>
          <p className="text-slate-500 text-sm mt-5">No credit card required · Set up in 60 seconds</p>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="relative z-10 border-t border-slate-200 bg-white/60 backdrop-blur">
        <div className="border-b border-slate-100 bg-gradient-to-r from-indigo-50/80 to-purple-50/80 px-4 sm:px-6 py-8">
          <div className="max-w-7xl mx-auto">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-5 text-center">Legal &amp; Privacy</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 max-w-4xl mx-auto">
              {[{icon:'📋',title:'Terms & Conditions',desc:'Your rights and obligations',href:'/terms'},{icon:'🔒',title:'Privacy Policy',desc:'How we protect your data',href:'/privacy-policy'},{icon:'🍪',title:'Cookie Policy',desc:'What cookies we use',href:'/cookie-policy'},{icon:'🛡️',title:'Safeguarding Policy',desc:'How we protect children',href:'/safeguarding'}].map((d,i) => (
                <Link key={i} href={d.href} className="group flex items-start gap-3 bg-white/70 hover:bg-white border border-slate-200 hover:border-indigo-300 rounded-xl p-4 transition-all hover:shadow-sm">
                  <span className="text-xl flex-shrink-0 mt-0.5">{d.icon}</span>
                  <div><div className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors leading-tight mb-1">{d.title}</div><div className="text-xs text-slate-500 leading-snug">{d.desc}</div></div>
                </Link>
              ))}
            </div>
          </div>
        </div>
        <div className="px-4 sm:px-6 py-6">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500">
            <div className="flex items-center gap-2"><Image src="/logo.svg" alt="LaunchPard" width={24} height={24} style={{ objectFit:"contain" }} /><span className="font-bold text-slate-700">LaunchPard</span></div>
            <p className="text-xs text-center">© {new Date().getFullYear()} LaunchPard Technologies. All rights reserved.</p>
            <div className="flex items-center gap-4 text-xs">
              <Link href="/terms" className="hover:text-indigo-600 transition-colors">Terms</Link>
              <Link href="/privacy-policy" className="hover:text-indigo-600 transition-colors">Privacy</Link>
              <Link href="/cookie-policy" className="hover:text-indigo-600 transition-colors">Cookies</Link>
              <a href="mailto:hello@launchpard.com" className="hover:text-indigo-600 transition-colors">Contact</a>
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