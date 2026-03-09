"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

const pseudoRandom = (seed, salt = 0) => {
  const x = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};
const STARS = Array.from({ length: 120 }, (_, i) => ({
  left:           (pseudoRandom(i, 1) * 100).toFixed(4) + "%",
  top:            (pseudoRandom(i, 2) * 100).toFixed(4) + "%",
  animationDelay: (pseudoRandom(i, 3) * 3).toFixed(4) + "s",
  opacity:        (pseudoRandom(i, 4) * 0.45 + 0.1).toFixed(4),
  size:           pseudoRandom(i, 5) > 0.85 ? 2 : 1,
}));

export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0);
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setActiveFeature(f => (f + 1) % 6), 3000);
    return () => clearInterval(timer);
  }, []);

  const navScrolled = scrollY > 20;

  const features = [
    { icon: '🤖', title: 'AI Revision Partner', description: "Ask it anything. Get a fresh practice question on any topic instantly. Three-layer engine: question bank, AI generation, and procedural fallback.", gradient: 'from-violet-500 to-purple-600', light: 'bg-violet-50 border-violet-200' },
    { icon: '🌍', title: 'Global Curricula', description: 'UK National KS1–KS4, 11+ Exam Prep, Nigerian Primary/JSS/SSS, Australian ACARA, Canadian, IB PYP/MYP, US Common Core.', gradient: 'from-cyan-500 to-blue-600', light: 'bg-cyan-50 border-cyan-200' },
    { icon: '📝', title: 'Unlimited Mock Tests', description: 'Timed tests that replicate real exam conditions. Instant marking the moment the test ends — with a full answer-by-answer breakdown.', gradient: 'from-orange-500 to-red-500', light: 'bg-orange-50 border-orange-200' },
    { icon: '📊', title: 'Mastery Tracking', description: "Every topic scored: Developing → Expected → Exceeding. See exactly where your child needs support before it becomes a problem.", gradient: 'from-emerald-500 to-green-600', light: 'bg-emerald-50 border-emerald-200' },
    { icon: '🎯', title: 'Exam Mode', description: 'Toggle 11+ prep, SATs, or ISEB mode for any KS2 scholar. Adds verbal reasoning and NVR missions — no re-enrolment needed.', gradient: 'from-pink-500 to-rose-500', light: 'bg-pink-50 border-pink-200' },
    { icon: '🏆', title: 'Missions & Stardust', description: 'Scholars earn Stardust, unlock badges, and level up through a space-themed world map. Education that genuinely feels like play.', gradient: 'from-amber-500 to-yellow-500', light: 'bg-amber-50 border-amber-200' },
  ];

  const curricula = [
    { flag: '🇬🇧', name: 'UK National', desc: 'KS1–KS4 · Y1–Y11', tag: '11+ Prep available', tagColor: 'bg-indigo-100 text-indigo-700' },
    { flag: '🇳🇬', name: 'Nigerian NERDC & WAEC', desc: 'Primary · JSS · SSS', tag: 'Science/Hum/Biz streams', tagColor: 'bg-green-100 text-green-700' },
    { flag: '🇦🇺', name: 'Australian ACARA', desc: 'Foundation–Year 10', tag: null, tagColor: '' },
    { flag: '🇨🇦', name: 'Canadian', desc: 'Grade 1–12 · Province-aware', tag: null, tagColor: '' },
    { flag: '🌐', name: 'IB PYP / MYP', desc: 'International Baccalaureate', tag: null, tagColor: '' },
    { flag: '🇺🇸', name: 'US Common Core', desc: 'K–Grade 8', tag: null, tagColor: '' },
  ];

  const ukStages = [
    { emoji: '🛸', label: 'KS1', sub: 'Y1–Y2', color: 'from-cyan-400 to-blue-500' },
    { emoji: '🌙', label: 'KS2', sub: 'Y3–Y6', color: 'from-violet-400 to-purple-500' },
    { emoji: '⭐', label: 'KS3', sub: 'Y7–Y9', color: 'from-pink-400 to-rose-500' },
    { emoji: '🚀', label: 'KS4', sub: 'Y10–Y11 · GCSE', color: 'from-orange-400 to-red-500' },
  ];

  const ngStages = [
    { emoji: '🌱', label: 'Primary', sub: 'P1–P6', color: 'from-emerald-400 to-green-500' },
    { emoji: '📚', label: 'JSS', sub: 'Y1–Y3', color: 'from-lime-400 to-emerald-500' },
    { emoji: '🎓', label: 'SSS', sub: 'Y1–Y3', color: 'from-teal-400 to-cyan-500' },
  ];

  const ngStreams = [
    { icon: '🔬', label: 'Science Stream', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    { icon: '📖', label: 'Humanities Stream', color: 'bg-amber-100 text-amber-700 border-amber-200' },
    { icon: '📈', label: 'Business Stream', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  ];

  return (
    <div className="min-h-screen bg-[#f0f2ff] text-slate-900 font-sans overflow-x-hidden">

      {/* Star Field */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {STARS.map((s, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-slate-400 animate-twinkle"
            style={{ left: s.left, top: s.top, animationDelay: s.animationDelay, opacity: s.opacity, width: s.size + 'px', height: s.size + 'px' }}
          />
        ))}
      </div>

      {/* Gradient Orbs */}
      <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-indigo-300/20 rounded-full blur-3xl animate-float pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-purple-300/20 rounded-full blur-3xl animate-float-delayed pointer-events-none" />

      {/* ── NAVIGATION ──────────────────────────────────────────────────────── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${navScrolled ? 'bg-white/90 backdrop-blur-xl border-b border-slate-200/80 shadow-sm' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 flex-shrink-0 min-w-0">
              <Image src="/logo.svg" alt="LaunchPard" width={34} height={34} className="flex-shrink-0" style={{ objectFit: "contain" }} />
              <span className="text-lg sm:text-xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent truncate">
                LaunchPard
              </span>
            </Link>

            {/* Nav buttons — both desktop and mobile, properly constrained */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Link
                href="/login"
                className="text-slate-600 hover:text-slate-900 font-semibold text-sm px-3 py-2 rounded-lg hover:bg-slate-100/80 transition-colors whitespace-nowrap"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/35 transform hover:scale-105 transition-all whitespace-nowrap rounded-full px-4 py-2 text-sm sm:px-5 sm:py-2.5"
              >
                <span className="hidden sm:inline">Start Free Trial</span>
                <span className="sm:hidden">Free Trial</span>
              </Link>
            </div>

          </div>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section className="relative z-10 px-4 sm:px-6 pt-28 pb-24">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-5xl mx-auto">

            <div className="inline-flex items-center gap-2 bg-indigo-100/80 border border-indigo-300/50 rounded-full px-4 py-2 mb-8 animate-fade-in backdrop-blur-sm">
              <span className="relative flex h-2 w-2 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-sm font-bold text-indigo-700">Join 3,000+ families on their learning mission</span>
            </div>

            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black mb-6 leading-[0.95] animate-fade-in-up text-slate-900">
              <span className="block mb-3">Where Education</span>
              <span className="block text-transparent bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 bg-clip-text animate-shimmer bg-[length:200%_auto]">
                Becomes Adventure
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed animate-fade-in-up animation-delay-200">
              AI-powered learning across <strong className="text-slate-800"> Global curricula</strong>. Private tutoring costs{' '}
              <span className="line-through text-slate-400">£60/hour</span>.
              We're <span className="text-green-600 font-bold">£12.99/month</span> for the whole family.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10 animate-fade-in-up animation-delay-400">
              <Link href="/signup" className="group bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-black text-lg px-8 py-4 rounded-2xl shadow-xl shadow-cyan-500/30 transform hover:scale-105 transition-all inline-flex items-center justify-center gap-2">
                🚀 Start Free Trial
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </Link>
              <button
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                className="bg-white/80 backdrop-blur-xl border border-slate-200 hover:border-indigo-400 text-slate-800 font-bold text-lg px-8 py-4 rounded-2xl transform hover:scale-105 transition-all"
              >
                See How It Works
              </button>
            </div>

            <div className="flex flex-wrap justify-center gap-5 sm:gap-8 text-sm text-slate-500 animate-fade-in-up animation-delay-600">
              <div className="flex items-center gap-1.5"><span className="text-yellow-400">⭐⭐⭐⭐⭐</span><span>4.9/5 from parents</span></div>
              <div className="flex items-center gap-1.5"><span className="text-green-500">✓</span><span>15,000+ questions</span></div>
              <div className="flex items-center gap-1.5"><span className="text-blue-500">🛡️</span><span>30-day free trial</span></div>
              <div className="flex items-center gap-1.5"><span className="text-purple-500">⚡</span><span>Cancel anytime</span></div>
            </div>
          </div>

          {/* Dashboard mockup */}
          <div className="mt-16 animate-fade-in-up animation-delay-800" style={{ transform: `translateY(${scrollY * 0.15}px)` }}>
            <div className="relative mx-auto max-w-3xl">
              <div className="absolute -inset-4 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 rounded-3xl blur-3xl opacity-20" />
              <div className="relative bg-white/85 backdrop-blur-2xl rounded-3xl border border-slate-200 overflow-hidden shadow-2xl shadow-indigo-200/50">
                <div className="flex items-center gap-1.5 px-4 py-3 bg-slate-50 border-b border-slate-200">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                  <div className="flex-1 mx-4 bg-slate-200 rounded-full h-5 flex items-center px-3">
                    <span className="text-xs text-slate-500">launchpard.com/cadet/mission</span>
                  </div>
                </div>
                <div className="aspect-video bg-gradient-to-br from-indigo-50 to-slate-100 flex items-center justify-center p-8">
                  <div className="text-center space-y-4 w-full max-w-sm">
                    <div className="text-6xl">🎯</div>
                    <div className="text-2xl font-black text-transparent bg-gradient-to-r from-cyan-500 to-purple-600 bg-clip-text">Mission Control</div>
                    <div className="text-slate-500 text-sm">Daily missions · Stardust rewards · Mastery unlocks</div>
                    <div className="grid grid-cols-3 gap-3 pt-1">
                      <div className="bg-indigo-100 border border-indigo-200 rounded-xl px-3 py-3">
                        <div className="text-xl font-black text-indigo-600">1,247</div>
                        <div className="text-xs text-slate-500">Stardust</div>
                      </div>
                      <div className="bg-orange-100 border border-orange-200 rounded-xl px-3 py-3">
                        <div className="text-xl font-black text-orange-500">🔥 12</div>
                        <div className="text-xs text-slate-500">Day Streak</div>
                      </div>
                      <div className="bg-purple-100 border border-purple-200 rounded-xl px-3 py-3">
                        <div className="text-xl font-black text-purple-600">8/12</div>
                        <div className="text-xs text-slate-500">Badges</div>
                      </div>
                    </div>
                    <div className="bg-white/70 rounded-xl p-3 text-left border border-slate-200">
                      <div className="flex justify-between text-xs text-slate-600 mb-1.5">
                        <span className="font-semibold">Mathematics · Fractions</span>
                        <span className="text-indigo-600 font-bold">74% mastery</span>
                      </div>
                      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" style={{ width: '74%' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── UK SCHOLAR PROGRESSION ──────────────────────────────────────────── */}
      <section className="relative z-10 px-4 sm:px-6 py-12 bg-gradient-to-r from-indigo-600 to-purple-700 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="absolute rounded-full border border-white" style={{ width: (i+1)*100+'px', height: (i+1)*100+'px', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />
          ))}
        </div>
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-xl">🇬🇧</span>
            <p className="text-indigo-200 text-xs font-black uppercase tracking-widest">UK National Curriculum — Automatic Stage Transitions</p>
          </div>
          <p className="text-center text-white/60 text-xs mb-7">KS1 through KS4 · 11+ Exam Mode · ISEB</p>
          <div className="flex items-center justify-center gap-1 sm:gap-0">
            {ukStages.map((stage, i) => (
              <React.Fragment key={i}>
                <div className="flex flex-col items-center">
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br ${stage.color} flex items-center justify-center text-xl sm:text-2xl shadow-lg shadow-black/20`}>
                    {stage.emoji}
                  </div>
                  <div className="mt-2 text-white font-black text-xs sm:text-sm">{stage.label}</div>
                  <div className="text-indigo-300 text-xs text-center leading-tight mt-0.5">{stage.sub}</div>
                </div>
                {i < ukStages.length - 1 && (
                  <div className="flex items-center mx-1 sm:mx-3 mb-5">
                    <div className="w-4 sm:w-8 h-px bg-indigo-400/50" />
                    <span className="text-indigo-300 text-xs">→</span>
                    <div className="w-4 sm:w-8 h-px bg-indigo-400/50" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
          <p className="text-center text-indigo-200/50 text-xs mt-5">Subjects auto-adjust per stage · GCSE subject selection at KS4</p>
        </div>
      </section>

      {/* ── NIGERIA SCHOLAR PROGRESSION ─────────────────────────────────────── */}
      <section className="relative z-10 px-4 sm:px-6 py-12 bg-gradient-to-r from-green-700 to-emerald-600 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="absolute rounded-full border border-white" style={{ width: (i+1)*100+'px', height: (i+1)*100+'px', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />
          ))}
        </div>
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-xl">🇳🇬</span>
            <p className="text-green-200 text-xs font-black uppercase tracking-widest">Nigerian NERDC Curriculum — Full Primary through SSS</p>
          </div>
          <p className="text-center text-white/60 text-xs mb-7">NERDC-aligned · Automatic promotion · Stream selection at SSS</p>
          <div className="flex items-center justify-center gap-1 sm:gap-0 mb-6">
            {ngStages.map((stage, i) => (
              <React.Fragment key={i}>
                <div className="flex flex-col items-center">
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br ${stage.color} flex items-center justify-center text-xl sm:text-2xl shadow-lg shadow-black/20`}>
                    {stage.emoji}
                  </div>
                  <div className="mt-2 text-white font-black text-xs sm:text-sm">{stage.label}</div>
                  <div className="text-green-300 text-xs text-center leading-tight mt-0.5">{stage.sub}</div>
                </div>
                {i < ngStages.length - 1 && (
                  <div className="flex items-center mx-1 sm:mx-3 mb-5">
                    <div className="w-6 sm:w-10 h-px bg-green-400/50" />
                    <span className="text-green-300 text-xs">→</span>
                    <div className="w-6 sm:w-10 h-px bg-green-400/50" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <span className="text-green-300 text-xs font-bold mr-1">SSS streams:</span>
            {ngStreams.map((stream, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-white">
                {stream.icon} {stream.label}
              </span>
            ))}
          </div>
          <p className="text-center text-green-200/50 text-xs mt-5">Plus Trade / Vocational stream · Nigerian Languages · Civic Education</p>
        </div>
      </section>

      {/* ── EXAM MODE FEATURE ────────────────────────────────────────────────── */}
      <section className="relative z-10 px-4 sm:px-6 py-20 sm:py-24">
        <div className="max-w-5xl mx-auto">
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-3xl overflow-hidden">
            <div className="grid md:grid-cols-2">
              <div className="p-8 sm:p-12 flex flex-col justify-center">
                <div className="inline-flex items-center gap-2 bg-indigo-100 border border-indigo-300 rounded-full px-3 py-1 mb-5 w-fit">
                  <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">New</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4 leading-tight">
                  11+ Exam Mode,<br />built right in
                </h2>
                <p className="text-slate-600 leading-relaxed mb-6 text-sm sm:text-base">
                  No separate curriculum. Toggle 11+ prep for any KS2 scholar and they instantly get verbal reasoning and NVR missions — while normal Year 5 or 6 work continues uninterrupted.
                </p>
                <div className="space-y-2.5">
                  {['11+ Exam Prep', 'ISEB / Pre-Test'].map((mode, i) => (
                    <div key={i} className="flex items-center gap-2.5 text-slate-700 text-sm">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs">✓</span>
                      </div>
                      <span className="font-medium">{mode}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-8 sm:p-10 bg-white/60 flex flex-col justify-center gap-2.5 border-t md:border-t-0 md:border-l border-indigo-200">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Exam Mode Selector</p>
                {[
                  { label: '📚 National Curriculum only', active: false },
                  { label: '🎯 11+ Exam Prep', active: true },
                  { label: '🏫 ISEB / Pre-Test', active: false },
                ].map((opt, i) => (
                  <div key={i} className={`flex items-center gap-3 rounded-xl px-4 py-2.5 border text-sm font-semibold cursor-default transition-all ${opt.active ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/25' : 'bg-white border-slate-200 text-slate-600'}`}>
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${opt.active ? 'border-white bg-white' : 'border-slate-300'}`}>
                      {opt.active && <div className="w-2 h-2 rounded-full bg-indigo-600" />}
                    </div>
                    {opt.label}
                  </div>
                ))}
                <p className="text-xs text-slate-400 mt-1">Toggle anytime · No data loss · No re-enrolment</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────────── */}
      <section className="relative z-10 px-4 sm:px-6 py-20 sm:py-28 bg-white/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block text-xs font-black uppercase tracking-widest text-indigo-500 bg-indigo-50 border border-indigo-100 px-4 py-1.5 rounded-full mb-5">How LaunchPard Works</span>
            <h2 className="text-4xl sm:text-5xl font-black mb-4 text-slate-900">Learn. Track. Test.</h2>
            <p className="text-lg text-slate-600 max-w-xl mx-auto">Three modes. One platform. Built around how children actually improve.</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">

            {/* LEARN */}
            <div className="group relative bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-200 rounded-3xl overflow-hidden p-8 hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-2xl mb-6 shadow-md shadow-violet-500/25">✏️</div>
              <h3 className="text-2xl font-black text-slate-900 mb-3">Learn</h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-6">Adaptive missions that match exactly where your child is. The AI identifies gaps and focuses effort there — not on what they already know.</p>
              <div className="space-y-2.5">
                {[
                  { icon: '🤖', text: 'AI revision partner — generates fresh questions on any topic, any time' },
                  { icon: '🗺️', text: 'Space-themed world map with unlockable realms per subject' },
                  { icon: '🔥', text: 'Daily streak system keeps momentum without pressure' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <span className="flex-shrink-0 text-base">{item.icon}</span>
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* TRACK */}
            <div className="group relative bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-200 rounded-3xl overflow-hidden p-8 hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-2xl mb-6 shadow-md shadow-cyan-500/25">📊</div>
              <h3 className="text-2xl font-black text-slate-900 mb-3">Track</h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-6">A parent dashboard that shows mastery building in real time — across every topic, every subject, every curriculum stage.</p>
              <div className="space-y-2.5">
                {[
                  { icon: '📈', text: 'Mastery scores per topic: Developing → Expected → Exceeding' },
                  { icon: '⏱️', text: 'Time-on-task by subject — see where effort is actually going' },
                  { icon: '🎯', text: 'Personalised focus suggestions — what to practise next' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <span className="flex-shrink-0 text-base">{item.icon}</span>
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
              {/* Mini mastery bars */}
              <div className="mt-6 space-y-2 bg-white/60 rounded-xl p-3 border border-cyan-100">
                {[
                  { sub: 'Mathematics', pct: 78, color: 'from-cyan-400 to-blue-500' },
                  { sub: 'English', pct: 62, color: 'from-violet-400 to-purple-500' },
                  { sub: 'Science', pct: 45, color: 'from-emerald-400 to-green-500' },
                ].map((bar, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600 font-semibold">{bar.sub}</span>
                      <span className="text-slate-400">{bar.pct}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full bg-gradient-to-r ${bar.color} rounded-full`} style={{ width: bar.pct + '%' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* TEST */}
            <div className="group relative bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-3xl overflow-hidden p-8 hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white text-2xl mb-6 shadow-md shadow-orange-500/25">📝</div>
              <h3 className="text-2xl font-black text-slate-900 mb-3">Test</h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-6">Unlimited timed mock tests that replicate the real exam experience — then instant marking with a full breakdown of every answer.</p>
              <div className="space-y-2.5">
                {[
                  { icon: '⚡', text: 'Instant marking — results the moment the test ends' },
                  { icon: '🔍', text: 'Answer review with correct solution shown per question' },
                  { icon: '📉', text: 'Performance by topic — identify exactly what needs work' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <span className="flex-shrink-0 text-base">{item.icon}</span>
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
              {/* Mini mock result card */}
              <div className="mt-6 bg-white/70 rounded-xl p-3 border border-orange-100">
                <p className="text-xs font-bold text-slate-500 mb-2">Last mock · Mathematics</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-slate-900">38</span>
                  <span className="text-sm text-slate-400">/50 correct</span>
                  <span className="ml-auto text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Top 22%</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────────────── */}
      <section id="features" className="relative z-10 px-4 sm:px-6 py-20 sm:py-28 bg-white/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl sm:text-5xl font-black mb-4 text-slate-900">Everything Your Child Needs</h2>
            <p className="text-lg text-slate-600 max-w-xl mx-auto">One platform. Global curricula. Unlimited potential.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature, i) => (
              <div
                key={i}
                onMouseEnter={() => setActiveFeature(i)}
                className={`group relative rounded-3xl border p-7 transition-all duration-300 cursor-default ${activeFeature === i ? feature.light + ' shadow-md -translate-y-1' : 'bg-white/70 border-slate-200'}`}
              >
                <div className="text-5xl mb-5">{feature.icon}</div>
                <h3 className="text-xl font-black mb-3 text-slate-900">{feature.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CURRICULA ────────────────────────────────────────────────────────── */}
      <section className="relative z-10 px-4 sm:px-6 py-20 sm:py-28">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl sm:text-5xl font-black mb-4 text-slate-900">One Platform. Eleven Curricula.</h2>
            <p className="text-lg text-slate-600 max-w-xl mx-auto">Switch between curricula anytime. All included.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {curricula.map((curr, i) => (
              <div key={i} className="group bg-white/70 backdrop-blur-xl rounded-2xl border border-slate-200 p-6 hover:border-indigo-400 transition-all hover:shadow-md">
                <div className="text-4xl mb-3">{curr.flag}</div>
                <h3 className="text-lg font-black mb-1 text-slate-900 group-hover:text-indigo-600 transition-colors">{curr.name}</h3>
                <p className="text-slate-500 text-sm mb-3">{curr.desc}</p>
                {curr.tag && <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full ${curr.tagColor}`}>{curr.tag}</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

  

      {/* ── PRICING ──────────────────────────────────────────────────────────── */}
      <section className="relative z-10 px-4 sm:px-6 py-20 sm:py-28">
        <div className="max-w-lg mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-black mb-4 text-slate-900">Simple, Honest Pricing</h2>
          <p className="text-lg text-slate-600 mb-14">One plan. Everything included. No hidden fees.</p>
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 rounded-3xl blur-xl opacity-25 group-hover:opacity-40 transition-opacity" />
            <div className="relative bg-white/90 backdrop-blur-xl rounded-3xl border border-slate-200 p-10 shadow-xl">
              <div className="text-4xl mb-5">🚀</div>
              <h3 className="text-2xl font-black mb-3 text-slate-900">LaunchPard Pro</h3>
              <div className="flex items-baseline justify-center gap-1.5 mb-2">
                <span className="text-5xl font-black text-transparent bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text">£12.99</span>
                <span className="text-xl text-slate-500">/month</span>
              </div>
              <div className="text-slate-500 text-sm mb-8">or <span className="font-bold text-slate-900">£120/year</span> — save £35.88</div>
              <Link href="/signup" className="block bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-black text-base px-10 py-4 rounded-2xl shadow-lg shadow-cyan-500/25 transform hover:scale-105 transition-all mb-8 text-center">
                🚀 Start 30-Day Free Trial
              </Link>
              <div className="space-y-3 text-left">
                {['Unlimited questions & missions','Global curricula included','AI adaptive learning engine','Up to 3 children','11+ Exam Mode','Scholar progression system','Parent dashboard & mastery tracking','Stardust, badges & rewards'].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-slate-700 text-sm">
                    <span className="text-green-500 flex-shrink-0">✓</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-8">No credit card required · Cancel anytime</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────────────────── */}
      <section className="relative z-10 px-4 sm:px-6 py-24 bg-gradient-to-r from-indigo-100/80 to-purple-100/80">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-black mb-6 text-slate-900">Ready to Launch?</h2>
          <p className="text-xl text-slate-600 mb-10">Join families transforming education into adventure.</p>
          <Link href="/signup" className="inline-block bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-black text-xl px-12 py-5 rounded-2xl shadow-2xl shadow-cyan-500/30 transform hover:scale-105 transition-all">
            🚀 Start Your Free Trial
          </Link>
          <p className="text-slate-500 text-sm mt-5">30 days free · No credit card required</p>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-slate-200 bg-white/60 backdrop-blur">

        {/* Legal hub strip */}
        <div className="border-b border-slate-100 bg-gradient-to-r from-indigo-50/80 to-purple-50/80 px-4 sm:px-6 py-8">
          <div className="max-w-7xl mx-auto">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-5 text-center">Legal &amp; Privacy</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 max-w-4xl mx-auto">
              {[
                { icon: '📋', title: 'Terms & Conditions', desc: 'Your rights and obligations when using LaunchPard', href: '/terms' },
                { icon: '🔒', title: 'Privacy Policy', desc: 'How we collect, use, and protect your personal data', href: '/privacy-policy' },
                { icon: '🍪', title: 'Cookie Policy', desc: 'What cookies we use and how to manage them', href: '/cookie-policy' },
                { icon: '🇪🇺', title: 'GDPR Rights', desc: 'Your rights under UK GDPR and how to exercise them', href: '/privacy-policy#gdpr' },
              ].map((doc, i) => (
                <Link
                  key={i}
                  href={doc.href}
                  className="group flex items-start gap-3 bg-white/70 hover:bg-white border border-slate-200 hover:border-indigo-300 rounded-xl p-4 transition-all hover:shadow-sm"
                >
                  <span className="text-xl flex-shrink-0 mt-0.5">{doc.icon}</span>
                  <div>
                    <div className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors leading-tight mb-1">{doc.title}</div>
                    <div className="text-xs text-slate-500 leading-snug">{doc.desc}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="px-4 sm:px-6 py-6">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500">
            <div className="flex items-center gap-2">
              <Image src="/logo.svg" alt="LaunchPard" width={24} height={24} style={{ objectFit: "contain" }} />
              <span className="font-bold text-slate-700">LaunchPard</span>
            </div>
            <p className="text-xs text-center">© 2026 LaunchPard Technologies. All rights reserved. Registered in England &amp; Wales.</p>
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