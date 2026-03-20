"use client";
/**
 * LaunchPard Landing Page — March 2026
 * Deploy to: src/app/page.jsx
 * 
 * Light theme, locale-aware pricing, 8 conversion sections.
 * Dependencies: Next.js Link, next/image only. No external packages.
 * Routes to existing /signup and /login pages unchanged.
 */
import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';

const pseudoRandom = (seed, salt = 0) => {
  const x = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};
const STARS = Array.from({ length: 100 }, (_, i) => ({
  left: (pseudoRandom(i, 1) * 100).toFixed(4) + "%",
  top: (pseudoRandom(i, 2) * 100).toFixed(4) + "%",
  animationDelay: (pseudoRandom(i, 3) * 3).toFixed(4) + "s",
  opacity: (pseudoRandom(i, 4) * 0.35 + 0.08).toFixed(4),
  size: pseudoRandom(i, 5) > 0.85 ? 2 : 1,
}));

const PRICING = {
  uk: { currency: "£", flag: "🇬🇧", label: "UK", pro: { monthly: "12.99", annual: "109.99", annualMo: "9.17", save: "Save £46" }, exam: { monthly: "3.99" } },
  ng: { currency: "₦", flag: "🇳🇬", label: "Nigeria", pro: { monthly: "9,999", annual: "99,999", annualMo: "8,333", save: "Save ₦19,989" }, exam: { monthly: "4,999" } },
  ca: { currency: "C$", flag: "🇨🇦", label: "Canada", pro: { monthly: "19.99", annual: "169.99", annualMo: "14.17", save: "Save C$70" }, exam: { monthly: "5.99" } },
};

const FEATURES = [
  { icon: '🤖', title: 'Tara — AI Tutor That Listens', desc: "When your scholar gets it wrong, Tara doesn't just show the answer. She asks them to explain why, then responds to their specific reasoning.", light: 'bg-violet-50 border-violet-200' },
  { icon: '📚', title: 'Your Curriculum. Fully Covered.', desc: "Built from the ground up for your national curriculum. Every topic, every year level. Not a US platform pretending to fit.", light: 'bg-cyan-50 border-cyan-200' },
  { icon: '📝', title: 'Exam Mode When It Counts', desc: 'Timed mock tests under real exam conditions. 11+ grammar school preparation and WAEC/BECE practice papers with readiness tracking.', light: 'bg-orange-50 border-orange-200' },
  { icon: '📊', title: 'See What They Actually Know', desc: "Your parent dashboard shows strengths, weaknesses, time spent, and what to practise next. Weekly reports to your inbox.", light: 'bg-emerald-50 border-emerald-200' },
  { icon: '🧠', title: 'Adaptive AI Engine', desc: 'Questions adjust in real time. Too easy? It challenges them. Struggling? It builds confidence at the right level.', light: 'bg-pink-50 border-pink-200' },
  { icon: '🚀', title: 'Missions They Want To Do', desc: 'Stardust rewards, mastery certificates, weekly missions, and leaderboards. Scholars come back because they want to.', light: 'bg-amber-50 border-amber-200' },
];

const CURRICULA = [
  { flag: '🇬🇧', name: 'UK National', desc: 'KS1–KS3 · Y1–Y9', tag: '11+ Prep available', tagColor: 'bg-indigo-100 text-indigo-700' },
  { flag: '🇳🇬', name: 'Nigerian NERDC', desc: 'Primary · JSS · SSS', tag: 'Science/Hum/Biz streams', tagColor: 'bg-green-100 text-green-700' },
  { flag: '🇦🇺', name: 'Australian ACARA', desc: 'Foundation–Year 6', tag: null },
  { flag: '🇨🇦', name: 'Canadian', desc: 'Grade 1–12', tag: null },
  { flag: '🌐', name: 'IB PYP / MYP', desc: 'International Baccalaureate', tag: null },
  { flag: '🇺🇸', name: 'US Common Core', desc: 'Grade 1–8', tag: null },
];

const FAQS = [
  { q: "What curricula does LaunchPard support?", a: "11 curricula: UK National Curriculum (KS1–KS3), UK 11+, Nigerian Primary, JSS and SSS, Canadian Primary and Secondary, US Common Core, IB PYP and MYP, and Australian ACARA." },
  { q: "What ages is it suitable for?", a: "Scholars aged 5–17 — from Year 1 and Primary 1 through to Senior Secondary." },
  { q: "Is there a free version?", a: "Yes. The free plan gives your scholar 10 questions per day across all subjects in their enrolled curriculum. Free forever, no card needed." },
  { q: "Does it help with 11+ or WAEC?", a: "Yes. Our Exam Mode add-on includes timed mock tests for 11+ grammar school entry and WAEC/BECE practice papers under real exam conditions." },
  { q: "Can I have multiple children on one account?", a: "On Pro, you can add up to 3 scholars — each enrolled in their own curriculum with independent progress tracking." },
  { q: "Is my child's data safe?", a: "We are GDPR and NDPR compliant. No ads, no data selling, no third-party tracking. Your scholar's data is used only to personalise their learning." },
  { q: "Can I cancel anytime?", a: "Yes. No contracts, no cancellation fees. You keep access until the end of your billing period." },
  { q: "What makes LaunchPard different?", a: "Unlike video-only platforms or static quiz apps, LaunchPard combines an AI-powered adaptive learning path engine personalised for each scholar, an intelligent tutor (Tara), and a parent dashboard that shows exactly what your child needs — all built for your specific national curriculum." },
];

const UK_STAGES = [
  { emoji: '🛸', label: 'KS1', sub: 'Y1–Y2', color: 'from-cyan-400 to-blue-500' },
  { emoji: '🌙', label: 'KS2', sub: 'Y3–Y6', color: 'from-violet-400 to-purple-500' },
  { emoji: '⭐', label: 'KS3', sub: 'Y7–Y9', color: 'from-pink-400 to-rose-500' },
];
const NG_STAGES = [
  { emoji: '🌱', label: 'Primary', sub: 'P1–P6', color: 'from-emerald-400 to-green-500' },
  { emoji: '📚', label: 'JSS', sub: 'JSS 1–3', color: 'from-lime-400 to-emerald-500' },
  { emoji: '🎓', label: 'SSS', sub: 'SS 1–3', color: 'from-teal-400 to-cyan-500' },
];
const NG_STREAMS = [
  { icon: '🔬', label: 'Science' },
  { icon: '📖', label: 'Humanities' },
  { icon: '📈', label: 'Business' },
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

function ProgressionStrip({ bg, flag, title, subtitle, stages, footer, streams }) {
  return (
    <section className={`relative z-10 px-4 sm:px-6 py-12 ${bg} overflow-hidden`}>
      <div className="absolute inset-0 opacity-10">{[...Array(5)].map((_, i) => <div key={i} className="absolute rounded-full border border-white" style={{ width:(i+1)*120+'px', height:(i+1)*120+'px', top:'50%', left:'50%', transform:'translate(-50%,-50%)' }} />)}</div>
      <div className="max-w-4xl mx-auto relative z-10">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-xl">{flag}</span>
          <p className="text-white/80 text-xs font-black uppercase tracking-widest">{title}</p>
        </div>
        <p className="text-center text-white/50 text-xs mb-7">{subtitle}</p>
        <div className="flex items-center justify-center gap-1 sm:gap-0 mb-4">
          {stages.map((s, i) => (
            <React.Fragment key={i}>
              <div className="flex flex-col items-center">
                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br ${s.color} flex items-center justify-center text-xl sm:text-2xl shadow-lg shadow-black/20`}>{s.emoji}</div>
                <div className="mt-2 text-white font-black text-xs sm:text-sm">{s.label}</div>
                <div className="text-white/60 text-xs text-center leading-tight mt-0.5">{s.sub}</div>
              </div>
              {i < stages.length - 1 && (
                <div className="flex items-center mx-1 sm:mx-3 mb-5">
                  <div className="w-4 sm:w-8 h-px bg-white/30" /><span className="text-white/40 text-xs">→</span><div className="w-4 sm:w-8 h-px bg-white/30" />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
        {streams && (
          <div className="flex items-center justify-center gap-2 flex-wrap mt-2">
            <span className="text-white/60 text-xs font-bold mr-1">SSS streams:</span>
            {streams.map((s, i) => <span key={i} className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-white">{s.icon} {s.label}</span>)}
          </div>
        )}
        {footer && <p className="text-center text-white/40 text-xs mt-4">{footer}</p>}
      </div>
    </section>
  );
}

export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0);
  const [activeFeature, setActiveFeature] = useState(0);
  const [locale, setLocale] = useState("uk");
  const [annual, setAnnual] = useState(true);
  const [navScrolled, setNavScrolled] = useState(false);
  const p = PRICING[locale];

  useEffect(() => {
    const onScroll = () => { setScrollY(window.scrollY); setNavScrolled(window.scrollY > 20); };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setActiveFeature(f => (f + 1) % 6), 3500);
    return () => clearInterval(t);
  }, []);

  const LocaleSwitcher = ({ className = "" }) => (
    <div className={`flex bg-slate-100 rounded-lg p-0.5 gap-0.5 ${className}`}>
      {Object.entries(PRICING).map(([k, v]) => (
        <button key={k} onClick={() => setLocale(k)} className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${locale === k ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}>{v.flag}</button>
      ))}
    </div>
  );

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
          <div className="flex items-center gap-2 flex-shrink-0">
            <LocaleSwitcher className="hidden sm:flex mr-2" />
            <Link href="/login" className="text-slate-600 hover:text-slate-900 font-semibold text-sm px-3 py-2 rounded-lg hover:bg-slate-100/80 transition-colors whitespace-nowrap">Sign In</Link>
            <Link href="/signup" className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold shadow-md shadow-indigo-500/20 transition-all whitespace-nowrap rounded-full px-4 py-2 text-sm sm:px-5 sm:py-2.5">
              <span className="hidden sm:inline">Start Free</span><span className="sm:hidden">Free</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══ SECTION 1: HERO ═══ */}
      <section className="relative z-10 px-4 sm:px-6 pt-28 pb-20">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-indigo-100/80 border border-indigo-300/50 rounded-full px-4 py-2 mb-8 animate-fade-in backdrop-blur-sm">
            <span className="relative flex h-2 w-2"><span className="animate-ping absolute h-full w-full rounded-full bg-green-400 opacity-75" /><span className="relative rounded-full h-2 w-2 bg-green-500" /></span>
            <span className="text-sm font-bold text-indigo-700">11 curricula across 6 countries</span>
          </div>
          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black mb-6 leading-[0.95] animate-fade-in-up text-slate-900">
            <span className="block mb-3">Where Education</span>
            <span className="block text-transparent bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 bg-clip-text animate-shimmer bg-[length:200%_auto]">Meets Adventure.</span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed animate-fade-in-up animation-delay-200">
            AI&#8209;powered learning engine built for <strong className="text-slate-800">your child&apos;s actual curriculum</strong>. See what they know, what they don&apos;t, and what to do next.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10 animate-fade-in-up animation-delay-400">
            <Link href="/signup" className="group bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-black text-lg px-8 py-4 rounded-2xl shadow-xl shadow-cyan-500/30 hover:scale-105 transition-all inline-flex items-center justify-center gap-2">
              Start Free — No Card Needed <span className="group-hover:translate-x-1 transition-transform">→</span>
            </Link>
            <button onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-white/80 backdrop-blur-xl border border-slate-200 hover:border-indigo-400 text-slate-800 font-bold text-lg px-8 py-4 rounded-2xl hover:scale-105 transition-all">
              See How It Works
            </button>
          </div>
          <div className="flex flex-wrap justify-center gap-5 sm:gap-8 text-sm text-slate-500 animate-fade-in-up animation-delay-600">
            {[["✓","Over 100,000 questions"],["🛡️","14-day free trial"],["⚡","Cancel anytime"],["🔒","GDPR compliant"]].map(([icon,text],i) => (
              <span key={i} className="flex items-center gap-1.5"><span className="text-green-500">{icon}</span>{text}</span>
            ))}
          </div>
        </div>

        {/* Dashboard mockup */}
        <div className="mt-16 animate-fade-in-up animation-delay-800 max-w-3xl mx-auto" style={{ transform: `translateY(${scrollY * 0.1}px)` }}>
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 rounded-3xl blur-3xl opacity-20" />
            <div className="relative bg-white/85 backdrop-blur-2xl rounded-3xl border border-slate-200 overflow-hidden shadow-2xl shadow-indigo-200/50">
              <div className="flex items-center gap-1.5 px-4 py-3 bg-slate-50 border-b border-slate-200">
                <div className="w-3 h-3 rounded-full bg-red-400" /><div className="w-3 h-3 rounded-full bg-amber-400" /><div className="w-3 h-3 rounded-full bg-green-400" />
                <div className="flex-1 mx-4 bg-slate-200 rounded-full h-5 flex items-center px-3"><span className="text-xs text-slate-500">launchpard.com/dashboard/student</span></div>
              </div>
              <div className="aspect-video bg-gradient-to-br from-indigo-50 to-slate-100 flex items-center justify-center p-8">
                <div className="text-center space-y-4 w-full max-w-sm">
                  <div className="text-6xl">🎯</div>
                  <div className="text-2xl font-black text-transparent bg-gradient-to-r from-cyan-500 to-purple-600 bg-clip-text">Mission Control</div>
                  <div className="text-slate-500 text-sm">Weekly missions · Stardust rewards · Mastery tracking</div>
                  <div className="grid grid-cols-3 gap-3 pt-1">
                    {[["1,247","Stardust","indigo"],["🔥 12","Day Streak","orange"],["8/12","Badges","purple"]].map(([val,label,c],i) => (
                      <div key={i} className={`bg-${c}-100 border border-${c}-200 rounded-xl px-3 py-3`}>
                        <div className={`text-xl font-black text-${c}-600`}>{val}</div>
                        <div className="text-xs text-slate-500">{label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-white/70 rounded-xl p-3 text-left border border-slate-200">
                    <div className="flex justify-between text-xs text-slate-600 mb-1.5"><span className="font-semibold">Mathematics · Fractions</span><span className="text-indigo-600 font-bold">74% mastery</span></div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" style={{ width: '74%' }} /></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ SECTION 2: THE PROBLEM ═══ */}
      <section className="relative z-10 px-4 sm:px-6 py-16 sm:py-20">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-black text-center mb-10">Sound familiar?</h2>
          <div className="space-y-4">
            {["You don't know what your child is actually struggling with at school.","Free apps feel like games with no real learning. Paid ones don't match your curriculum.","There's no single place to track progress, prepare for exams, and keep your child engaged."].map((t,i) => (
              <div key={i} className="flex gap-3.5 items-start bg-white/70 backdrop-blur-xl border border-slate-200 rounded-2xl p-5 hover:border-rose-300 transition-colors">
                <span className="text-rose-400 text-lg mt-0.5 flex-shrink-0">✗</span>
                <p className="text-slate-700 text-[15px] leading-relaxed">{t}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-transparent bg-gradient-to-r from-cyan-500 to-purple-600 bg-clip-text font-black text-xl">LaunchPard fixes all three.</p>
        </div>
      </section>

      {/* ═══ PROGRESSIONS ═══ */}
      <ProgressionStrip bg="bg-gradient-to-r from-indigo-600 to-purple-700" flag="🇬🇧" title="UK National Curriculum — Automatic Stage Transitions" subtitle="KS1 through KS3 · 11+ Exam Mode available" stages={UK_STAGES} footer="Subjects auto-adjust per key stage" />
      <ProgressionStrip bg="bg-gradient-to-r from-green-700 to-emerald-600" flag="🇳🇬" title="Nigerian NERDC Curriculum — Full Primary through SSS" subtitle="NERDC-aligned · Automatic promotion · Stream selection at SSS" stages={NG_STAGES} streams={NG_STREAMS} />

      {/* ═══ SECTION 3: HOW IT WORKS ═══ */}
      <section id="how-it-works" className="relative z-10 px-4 sm:px-6 py-20 sm:py-28 bg-white/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block text-xs font-black uppercase tracking-widest text-indigo-500 bg-indigo-50 border border-indigo-100 px-4 py-1.5 rounded-full mb-5">How LaunchPard Works</span>
            <h2 className="text-4xl sm:text-5xl font-black mb-4">Learn. Track. Test.</h2>
            <p className="text-lg text-slate-600 max-w-xl mx-auto">Three modes. One platform. Built around how children actually improve.</p>
          </div>
          <div className="grid lg:grid-cols-3 gap-6">
            {[
              { icon:'✏️', title:'Learn', desc:'Adaptive missions that match exactly where your scholar is. The AI identifies gaps and focuses there.', color:'violet', items:['AI adapts difficulty in real time','Space-themed missions feel like adventure','Daily streaks and Stardust keep momentum'] },
              { icon:'📊', title:'Track', desc:'A parent dashboard that shows mastery building in real time — across every topic and subject.', color:'cyan', items:['Mastery per topic: Building → On Track → Stellar','Time spent by subject — see where effort goes','Personalised recommendations for next steps'], bars:[{s:'Mathematics',p:78,c:'from-cyan-400 to-blue-500'},{s:'English',p:62,c:'from-violet-400 to-purple-500'},{s:'Science',p:45,c:'from-emerald-400 to-green-500'}] },
              { icon:'📝', title:'Test', desc:'Timed mock tests that replicate real exam conditions — then instant marking with a full breakdown.', color:'orange', items:['Instant marking — results when the test ends','Answer review with correct solution shown','Performance by topic — identify what needs work'] },
            ].map((card,i) => (
              <div key={i} className={`group bg-gradient-to-br from-${card.color}-50 to-${card.color === 'cyan' ? 'blue' : card.color === 'violet' ? 'indigo' : 'amber'}-50 border border-${card.color}-200 rounded-3xl p-8 hover:shadow-lg transition-all`}>
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br from-${card.color}-500 to-${card.color === 'cyan' ? 'blue' : card.color === 'violet' ? 'indigo' : 'red'}-${card.color === 'orange' ? '500' : '600'} flex items-center justify-center text-white text-2xl mb-6 shadow-md`}>{card.icon}</div>
                <h3 className="text-2xl font-black mb-3">{card.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed mb-6">{card.desc}</p>
                <div className="space-y-2.5">
                  {card.items.map((item,j) => <div key={j} className="flex items-start gap-2.5 text-sm text-slate-700"><span className="text-green-500 flex-shrink-0 mt-0.5">✓</span><span>{item}</span></div>)}
                </div>
                {card.bars && (
                  <div className="mt-6 space-y-2 bg-white/60 rounded-xl p-3 border border-slate-100">
                    {card.bars.map((b,j) => (
                      <div key={j}><div className="flex justify-between text-xs mb-1"><span className="text-slate-600 font-semibold">{b.s}</span><span className="text-slate-400">{b.p}%</span></div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full bg-gradient-to-r ${b.c} rounded-full`} style={{ width: b.p+'%' }} /></div></div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SECTION 4: FEATURES ═══ */}
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
            <h2 className="text-4xl sm:text-5xl font-black mb-4">One Platform. Eleven Curricula.</h2>
            <p className="text-lg text-slate-600 max-w-xl mx-auto">Your scholar is enrolled in their curriculum. We make sure it&apos;s fully covered.</p>
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

      {/* ═══ EXAM MODE ═══ */}
      <section className="relative z-10 px-4 sm:px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-3xl overflow-hidden">
            <div className="grid md:grid-cols-2">
              <div className="p-8 sm:p-12 flex flex-col justify-center">
                <div className="inline-flex items-center gap-2 bg-indigo-100 border border-indigo-300 rounded-full px-3 py-1 mb-5 w-fit">
                  <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Exam Mode Add-on</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-black mb-4 leading-tight">11+ &amp; WAEC prep,<br />built right in</h2>
                <p className="text-slate-600 leading-relaxed mb-6 text-sm sm:text-base">Toggle exam prep for any scholar. 11+ candidates get verbal reasoning and NVR missions. WAEC scholars get timed practice papers. Normal curriculum work continues uninterrupted.</p>
                <div className="space-y-2.5">
                  {['11+ Grammar School Prep', 'WAEC / BECE Practice'].map((m,i) => (
                    <div key={i} className="flex items-center gap-2.5 text-slate-700 text-sm">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0"><span className="text-white text-xs">✓</span></div>
                      <span className="font-medium">{m}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-8 sm:p-10 bg-white/60 flex flex-col justify-center gap-2.5 border-t md:border-t-0 md:border-l border-indigo-200">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Exam Mode Selector</p>
                {[{ label:'📚 Curriculum only', active:false }, { label:'🎯 11+ Exam Prep', active:true }, { label:'🏫 WAEC / BECE', active:false }].map((opt,i) => (
                  <div key={i} className={`flex items-center gap-3 rounded-xl px-4 py-2.5 border text-sm font-semibold cursor-default transition-all ${opt.active ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/25' : 'bg-white border-slate-200 text-slate-600'}`}>
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${opt.active ? 'border-white bg-white' : 'border-slate-300'}`}>
                      {opt.active && <div className="w-2 h-2 rounded-full bg-indigo-600" />}
                    </div>
                    {opt.label}
                  </div>
                ))}
                <p className="text-xs text-slate-400 mt-1">Available as +{p.currency}{p.exam.monthly}/mo add-on with Pro</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ SECTION 5: SOCIAL PROOF ═══ */}
      <section className="relative z-10 px-4 sm:px-6 py-16 bg-white/50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-black mb-10">Built for scholars everywhere</h2>
          <div className="grid sm:grid-cols-3 gap-5 mb-8">
            {[{stat:"11",label:"Curricula supported",sub:"UK · Nigeria · Canada · Australia · IB · US"},{stat:"100K+",label:"Questions in the bank",sub:"Quality-validated and curriculum-aligned"},{stat:"5–17",label:"Ages covered",sub:"Primary through Senior Secondary"}].map((s,i) => (
              <div key={i} className="bg-white/70 border border-slate-200 rounded-2xl p-6">
                <div className="text-3xl font-black text-indigo-600 mb-1">{s.stat}</div>
                <div className="text-slate-900 font-bold text-sm mb-1">{s.label}</div>
                <div className="text-slate-500 text-xs">{s.sub}</div>
              </div>
            ))}
          </div>
          <p className="text-slate-400 text-sm">Launching beta, be among the first families to try it.</p>
        </div>
      </section>

      {/* ═══ SECTION 6: PRICING ═══ */}
      <section id="pricing" className="relative z-10 px-4 sm:px-6 py-20 sm:py-28">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-4xl sm:text-5xl font-black mb-4">Simple, Honest Pricing</h2>
            <p className="text-lg text-slate-600 mb-8">Start free. Upgrade when you&apos;re ready.</p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <LocaleSwitcher />
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
              <div className="mb-6"><span className="text-4xl font-black">{p.currency}0</span></div>
              <ul className="space-y-2.5 text-sm text-slate-600 mb-7 flex-1">
                {["1 scholar","Your enrolled curriculum","All subjects","10 questions per day","Basic gamification"].map(f => <li key={f} className="flex items-start gap-2"><span className="text-slate-400 mt-0.5">✓</span>{f}</li>)}
              </ul>
              <Link href="/signup" className="block text-center border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 text-slate-700 font-bold py-3 rounded-xl text-sm transition-all">Create Free Account</Link>
            </div>

            {/* Pro */}
            <div className="relative bg-white/90 backdrop-blur-xl border-2 border-indigo-400 rounded-3xl p-7 flex flex-col shadow-lg shadow-indigo-200/30">
              {annual && <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-wider">Most popular</div>}
              <h3 className="text-xl font-black mb-1">Pro</h3>
              <p className="text-slate-500 text-xs mb-5">Full power for your family</p>
              <div className="mb-1">
                <span className="text-4xl font-black text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text">{p.currency}{annual ? p.pro.annualMo : p.pro.monthly}</span>
                <span className="text-slate-500 text-sm ml-1">/mo</span>
              </div>
              {annual ? <p className="text-emerald-600 text-xs font-bold mb-5">Billed {p.currency}{p.pro.annual}/yr · {p.pro.save}</p> : <p className="text-slate-400 text-xs mb-5">or {p.currency}{p.pro.annual}/yr with annual</p>}
              <ul className="space-y-2.5 text-sm text-slate-700 mb-7 flex-1">
                {["Up to 3 scholars","Unlimited questions","Tara AI tutor","Full parent dashboard","Weekly missions & reports","Certificates & leaderboards"].map(f => <li key={f} className="flex items-start gap-2"><span className="text-indigo-500 mt-0.5">✓</span>{f}</li>)}
              </ul>
              <Link href="/signup" className="block text-center bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-black py-3 rounded-xl text-sm transition-all shadow-md shadow-indigo-500/20">Start 14-Day Free Trial</Link>
            </div>

            {/* Exam Mode */}
            <div className="bg-white/70 backdrop-blur-xl border border-slate-200 rounded-3xl p-7 flex flex-col">
              <h3 className="text-xl font-black mb-1">Exam Mode</h3>
              <p className="text-slate-500 text-xs mb-5">Add-on for Pro subscribers</p>
              <div className="mb-6"><span className="text-4xl font-black">+{p.currency}{p.exam.monthly}</span><span className="text-slate-500 text-sm ml-1">/mo</span></div>
              <ul className="space-y-2.5 text-sm text-slate-600 mb-7 flex-1">
                {["Everything in Pro","Timed 11+ mock tests","WAEC/BECE practice papers","Real exam conditions","Score predictions","Exam countdowns"].map(f => <li key={f} className="flex items-start gap-2"><span className="text-slate-400 mt-0.5">✓</span>{f}</li>)}
              </ul>
              <Link href="/signup" className="block text-center border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 text-slate-700 font-bold py-3 rounded-xl text-sm transition-all">Start with Pro First</Link>
            </div>
          </div>
          <p className="text-center text-slate-400 text-xs mt-6">30-day money-back guarantee on all paid plans. Cancel anytime.</p>
        </div>
      </section>

      {/* ═══ SECTION 7: FAQ ═══ */}
      <section id="faq" className="relative z-10 px-4 sm:px-6 py-20 sm:py-28 bg-white/50">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-black text-center mb-10">Frequently Asked Questions</h2>
          {FAQS.map((f,i) => <FaqItem key={i} q={f.q} a={f.a} />)}
        </div>
      </section>

      {/* ═══ SECTION 8: FINAL CTA ═══ */}
      <section className="relative z-10 px-4 sm:px-6 py-24 bg-gradient-to-r from-indigo-100/80 to-purple-100/80">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-black mb-6">Give your scholar the smartest start.</h2>
          <p className="text-xl text-slate-600 mb-10">Join parents in Australia, Canada, England, and Nigeria who want to see their children&apos;s progress in real time.</p>
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