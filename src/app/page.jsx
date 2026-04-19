"use client";
/**
 * LaunchPard Landing Page — Dark Space Revamp + Geo-Regional (April 2026)
 * Deploy to: src/app/page.jsx
 *
 * Changes from March 2026 revision:
 *   - Region-aware rendering driven by __geo cookie (set in proxy.ts from
 *     Vercel's x-vercel-ip-country header). Supported regions: GB (default), NG.
 *   - Nigerian variant uses analysis-backed ₦ pricing (see NIGERIAN_PRICING_ANALYSIS.md):
 *     Explorer ₦1,200 / Scholar ₦2,500 / WAEC Intensive ₦4,000 / Family from ₦3,500
 *   - Manual region switcher in footer — sets __geo_override cookie.
 *   - Hero, curricula grid, pricing, final CTA all swap based on region.
 */
import React, { useEffect, useLayoutEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import DarkModeToggle from '@/components/theme/DarkModeToggle';

// ═══════════════════════════════════════════════════════════════════════════════
// REGION CONFIG — controls everything that changes between UK and NG experiences.
// ═══════════════════════════════════════════════════════════════════════════════
const REGION_CONFIG = {
  GB: {
    code: 'GB',
    label: 'United Kingdom',
    flag: '🇬🇧',
    currency: 'GBP',
    currencySymbol: '£',
    heroBadge: '12 curricula · Ages 5–17 · 6 countries',
    heroCta: "Start Your Child's Free Path",
    finalCtaHeadline: 'Try It Free. See the Difference in a Week.',
    finalCtaBody: 'Families in Australia, Canada, England, and Nigeria already use LaunchPard. Your child can start today.',
    finalCtaButton: "Start Your Child's Free Path",
    examsHowItWorks: '11+ Grammar School preparation · GCSE mock tests with grade predictions · WAEC / BECE practice papers · AI flashcards generated from weak topics',
    statsHeadline: 'LaunchPard in numbers',
    statsQuestions: '100K+',
    statsQuestionsSub: 'Quality-validated & curriculum-aligned',
    pricingHeadline: 'Simple, Honest Pricing',
    pricingSub: 'One price for every UK family.',
    pricingFootnote: 'After your trial, keep free access. 10 questions per day. 30-day money-back guarantee. Cancel anytime.',
    payment: null,
    trustLabel: 'GDPR compliant',
    faqExamAnswer: "Yes. Our Exam Mode add-on (+£3.99/mo) includes timed mock tests for 11+ grammar school entry, GCSE practice, and WAEC/BECE papers under real exam conditions with predicted grades.",
    defaultCurriculum: 'uk_national',
  },
  NG: {
    code: 'NG',
    label: 'Nigeria',
    flag: '🇳🇬',
    currency: 'NGN',
    currencySymbol: '₦',
    heroBadge: 'Ages 5–17 · Primary · JSS · SSS · WAEC · NECO',
    heroCta: 'Start Free WAEC Prep',
    finalCtaHeadline: 'Ace WAEC and NECO. Start Free Today.',
    finalCtaBody: 'Built for Nigerian scholars. JSS, SSS, and WAEC-aligned — with pricing that makes sense for Nigerian families. Over 70,000 curriculum-aligned questions.',
    finalCtaButton: 'Start Free',
    examsHowItWorks: 'WAEC SSCE mock papers · NECO practice tests · BECE prep · Common Entrance · AI flashcards from your weakest topics',
    statsHeadline: 'Built for Nigerian scholars',
    statsQuestions: '70K+',
    statsQuestionsSub: 'WAEC · NECO · NERDC-aligned',
    pricingHeadline: 'Pricing That Fits Your Family',
    pricingSub: 'Less than one private lesson a week.',
    pricingFootnote: 'After your trial, keep free access. 10 questions per day. No contracts. Cancel anytime.',
    payment: null,
    trustLabel: 'NDPR compliant',
    faqExamAnswer: "Yes. Our WAEC Intensive tier includes timed WAEC SSCE mock papers, NECO practice tests, BECE and Common Entrance prep, with predicted grades and tutor fallback sessions.",
    defaultCurriculum: 'ng_sss',
  },
};

function readRegionCookie() {
  if (typeof document === 'undefined') return 'GB';
  const match = document.cookie.match(/(?:^|;\s*)__geo=([^;]+)/);
  const value = match && match[1];
  return value === 'NG' || value === 'GB' ? value : 'GB';
}

function useRegion() {
  // Start with 'GB' on first paint to match the SSR default and avoid hydration
  // mismatches, then swap to the cookie value after mount. The cookie is set
  // by proxy.ts on the first request so returning visitors hydrate correctly
  // on their second page load.
  const [region, setRegion] = useState('GB');
  useEffect(() => {
    setRegion(readRegionCookie());
  }, []);
  const setRegionOverride = (next) => {
    if (next !== 'NG' && next !== 'GB') return;
    const year = 60 * 60 * 24 * 365;
    document.cookie = `__geo_override=${next}; path=/; max-age=${year}; samesite=lax; secure`;
    document.cookie = `__geo=${next}; path=/; max-age=${year}; samesite=lax; secure`;
    setRegion(next);
    // Persist curriculum hint for signup
    try { localStorage.setItem('lp_region', next); } catch {}
  };
  return [region, setRegionOverride];
}

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

const FEATURES_GB = [
  { icon: '📈', title: 'Questions That Get Harder as They Get Smarter', desc: "Start easy, stay engaged. As your child masters each concept, the AI automatically raises the bar. No boredom. No frustration.", light: 'bg-slate-800/40 border-indigo-500/30' },
  { icon: '🎯', title: 'A Tutor Who Knows When to Push and When to Pause', desc: "Tara learns your child's pace. When they need encouragement, a hint, or another try, it adjusts. One AI tutor per child, not one lesson for everyone.", light: 'bg-slate-800/40 border-indigo-500/30' },
  { icon: '📊', title: 'Finally See What They Actually Know', desc: "No guessing. Mastery by topic. Time spent. Weak areas flagged. Weekly reports to your inbox so you're never in the dark.", light: 'bg-slate-800/40 border-indigo-500/30' },
  { icon: '🏆', title: 'Real Exam Conditions. Real Confidence.', desc: "Timed mocks for 11+ grammar schools, GCSE, WAEC/BECE, and IB. Predicted grades tell you exactly where they stand before exam day.", light: 'bg-slate-800/40 border-indigo-500/30' },
  { icon: '💪', title: "They'll Ask to Do Their Homework", desc: "Stardust rewards, digital pets that evolve, leaderboards, career links, weekly missions. They log in because they want to, not because you told them to.", light: 'bg-slate-800/40 border-indigo-500/30' },
  { icon: '🌍', title: 'Your Country. Your Curriculum. Fully Covered.', desc: "12 curricula built from scratch for the UK, Nigeria, Canada, Australia, IB, and US. Not a one-size-fits-all US platform pretending to fit.", light: 'bg-slate-800/40 border-indigo-500/30' },
];

// Nigerian-specific features — WAEC/NECO/JAMB as primary, no 11+/GCSE mentions.
const FEATURES_NG = [
  { icon: '📈', title: 'Questions That Get Harder as They Get Smarter', desc: "Start easy, stay engaged. As your child masters each concept, Tara automatically raises the bar — foundation topics to WAEC-level in one flow.", light: 'bg-slate-800/40 border-emerald-500/30' },
  { icon: '🎯', title: 'An AI Tutor Built for Nigerian Scholars', desc: "Tara knows when to push and when to pause. Aligned to NERDC, WAEC, and NECO syllabuses — not a generic tutor retrofitted for Nigeria.", light: 'bg-slate-800/40 border-emerald-500/30' },
  { icon: '📊', title: 'Know Exactly Where They Stand for WAEC', desc: "Mastery maps by subject and topic. WAEC grade predictions. Weekly guardian reports — so exam day has no surprises.", light: 'bg-slate-800/40 border-emerald-500/30' },
  { icon: '🏆', title: 'WAEC · NECO · BECE · JAMB · Common Entrance', desc: "Full mock papers under timed exam conditions. A1 to F9 grade tracking. Predicted grades before the real sitting.", light: 'bg-slate-800/40 border-emerald-500/30' },
  { icon: '💪', title: "They'll Ask to Study", desc: "Stardust rewards, digital pets, boss battles, and leaderboards. Gamification designed around Nigerian classrooms — not American ones.", light: 'bg-slate-800/40 border-emerald-500/30' },
  { icon: '🇳🇬', title: 'Built for Nigeria. Not Retrofitted.', desc: "Nigerian names, naira examples, Lagos traffic, cassava farms, Aso Rock — concept cards and questions grounded in real Nigerian life.", light: 'bg-slate-800/40 border-emerald-500/30' },
];

// UK age bands — KS1/KS2/KS3/KS4 terminology
const AGE_BANDS_GB = [
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

// Nigerian age bands — Primary / JSS / SSS terminology, WAEC focus
const AGE_BANDS_NG = [
  { band: 'Primary', ages: '5–11', title: 'Star Explorer', icon: '⭐', color: 'from-amber-400 to-orange-500', bgLight: 'bg-slate-800/40', border: 'border-emerald-500/30',
    features: ['Treasure map across all Primary subjects', 'Story-mode missions aligned to NERDC', 'Digital pet that grows with learning', 'Common Entrance early prep built in', 'Stars and Stardust instead of raw scores'],
    taraVoice: '"Oya, you got it! Tara is very proud of you today! ⭐"' },
  { band: 'JSS', ages: '12–14', title: 'BECE Command', icon: '🚀', color: 'from-emerald-500 to-teal-600', bgLight: 'bg-slate-800/40', border: 'border-emerald-500/30',
    features: ['Subject mastery maps for all JSS topics', 'BECE mock papers with grade predictions', 'Tara explains every wrong answer in Yoruba, Igbo, or Hausa context', 'Weekly progress reports for parents', 'Leaderboard by subject and class'],
    taraVoice: '"Sharp! That is exactly the BECE method. Keep going, Commander! 🚀"' },
  { band: 'SSS', ages: '15–17', title: 'WAEC Studio', icon: '🎯', color: 'from-violet-500 to-purple-700', bgLight: 'bg-slate-800/40', border: 'border-violet-500/30',
    features: ['WAEC SSCE + NECO full mock papers', 'A1–F9 grade tracking and prediction', 'AI flashcards generated from weak topics', 'WAEC countdown with SSS1/2/3 urgency', 'Unlimited practice by subject'],
    taraVoice: '"Correct. Mark scheme note: show working in full for WAEC marks."' },
];

const CURRICULA_GB = [
  { flag: '🇬🇧', name: 'UK National', desc: 'KS1–KS4 · Y1–Y13', tag: '11+ & GCSE Prep', tagColor: 'bg-indigo-900/40 text-indigo-300', featured: true },
  { flag: '🇳🇬', name: 'Nigerian NERDC', desc: 'Primary · JSS · SSS', tag: 'WAEC/NECO Prep', tagColor: 'bg-emerald-900/40 text-emerald-300' },
  { flag: '🇦🇺', name: 'Australian ACARA', desc: 'Foundation–Year 9', tag: null },
  { flag: '🇨🇦', name: 'Canadian', desc: 'Grade 1–12', tag: 'Primary & Secondary' , tagColor: 'bg-red-900/40 text-red-300' },
  { flag: '🌐', name: 'IB PYP / MYP', desc: 'International Baccalaureate', tag: null },
  { flag: '🇺🇸', name: 'US Common Core', desc: 'Grade 1–8', tag: null },
];

// Nigerian exam boards — shown as cards instead of foreign curricula flags.
// Every card is Nigerian-relevant. No UK/IB/US cards on the NG landing page.
const CURRICULA_NG = [
  { icon: '📝', name: 'WAEC SSCE', desc: 'West African Senior School Certificate — the gateway exam for Nigerian universities', tag: 'May/June & Nov/Dec sittings', tagColor: 'bg-emerald-900/40 text-emerald-300', featured: true },
  { icon: '📋', name: 'NECO', desc: 'National Examinations Council — SSS3 alternative and supplement to WAEC', tag: 'June/July & Nov sittings', tagColor: 'bg-emerald-900/40 text-emerald-300' },
  { icon: '🎓', name: 'JAMB UTME', desc: 'Joint Admissions and Matriculation Board — required for university entry across Nigeria', tag: 'University Entrance', tagColor: 'bg-blue-900/40 text-blue-300' },
  { icon: '📖', name: 'BECE', desc: 'Basic Education Certificate Examination — JSS3 exit exam covering all Junior Secondary subjects', tag: 'JSS3 Exit', tagColor: 'bg-amber-900/40 text-amber-300' },
  { icon: '🏫', name: 'Common Entrance', desc: 'Federal Unity Colleges admission exam — start preparing as early as Primary 4', tag: 'JSS1 Entry', tagColor: 'bg-purple-900/40 text-purple-300' },
  { icon: '🌍', name: 'State Scholarship', desc: 'State-level scholarship examinations — SUBEB assessments and state-specific exams', tag: 'All States', tagColor: 'bg-slate-700/40 text-slate-300' },
];

const FAQS_BASE = [
  { q: "What curricula does LaunchPard support?", a: "Multiple curricula including UK National (KS1–KS4), UK 11+, Nigerian Primary, JSS and SSS (WAEC/NECO aligned), Canadian, US Common Core, IB, and Australian ACARA." },
  { q: "What ages is it suitable for?", a: "Scholars aged 5–17. The platform adapts visuals, language, difficulty, and even the AI tutor's personality based on your child's age." },
  { q: "How does the age-adaptive system work?", a: "A 6-year-old sees a magical treasure map with friendly characters. An 11-year-old explores a space galaxy. A 14-year-old gets a clean, data-rich dashboard with career links. A 16-year-old gets an exam-focused command centre with predicted grades. Same engine, different experience." },
  { q: "Is there a free version?", a: "Yes. The free plan gives your scholar 10 questions per day across all subjects. No card needed. Free plan stays free." },
  { q: "Can I have multiple children on one account?", a: "Yes. On a family plan you can add multiple scholars to one account. Each gets their own curriculum, progress tracking, and age-adapted experience." },
  { q: "Is my child's data safe?", a: "We are GDPR and NDPR compliant. No ads, no data selling, no third-party tracking. Your scholar's data is used only to personalise their learning." },
  { q: "Can I cancel anytime?", a: "Yes. No contracts, no cancellation fees. 30-day money-back guarantee on all paid plans." },
];

// Exam-prep FAQ varies by region; payment FAQ only appears for NG.
const FAQS_GB = [
  ...FAQS_BASE.slice(0, 4),
  { q: "Does it help with 11+, GCSE, or WAEC?", a: "Yes. Our Exam Mode add-on (+£3.99/mo) includes timed mock tests for 11+ grammar school entry, GCSE practice, and WAEC/BECE papers under real exam conditions with predicted grades." },
  ...FAQS_BASE.slice(4),
];

const FAQS_NG = [
  { q: "What exams does LaunchPard cover?", a: "LaunchPard is built around WAEC SSCE, NECO, BECE, JAMB UTME, and Common Entrance. The Scholar plan includes 20 past papers per subject with grade predictions. Every question is aligned to the NERDC curriculum and official exam syllabuses." },
  { q: "What ages is it suitable for?", a: "Scholars aged 5–17 — Primary 1 through SSS3. The platform adapts to Nigerian grade levels automatically: Primary scholars get story-mode adventures, JSS scholars get BECE prep, SSS scholars get full WAEC studio mode." },
  { q: "How does it know what my child is studying?", a: "You choose their level (Primary, JSS, or SSS) at setup. Tara then maps every question to the NERDC syllabus and focuses on topics flagged as weak — exactly what WAEC and NECO examiners test." },
  { q: "Is there a free version?", a: "Yes. The free plan gives your scholar 10 questions per day across all subjects. No card needed. Free plan stays free forever." },
  { q: "Does it help with WAEC, NECO, JAMB, and BECE?", a: "Yes. The Scholar plan includes 20 full past papers per subject with WAEC-style marking. Add the WAEC Intensive Boost (₦1,000/mo) for unlimited Tara AI feedback and full mock exams with A1–F9 grade predictions." },
  { q: "How do I pay?", a: "You can pay with any Nigerian bank card, bank transfer, or USSD. All Scholar payments are in naira (₦). No international card required." },
  { q: "Will this work on mobile data?", a: "Yes. LaunchPard is built mobile-first and works on 3G and 4G. Aggressive caching means a full day's learning uses under 15 MB of data. An offline mode is coming." },
  { q: "Can I add more than one child?", a: "Yes. The Scholar plan covers 1 scholar. Add siblings for ₦1,000/month each — every child gets their own progress tracking, age-adapted experience, and exam countdown." },
  { q: "Is my child's data safe?", a: "We are NDPR compliant (Nigeria Data Protection Regulation). No ads, no data selling, no third-party tracking. Your scholar's data is used only to personalise their learning." },
  { q: "Can I cancel anytime?", a: "Yes. No contracts, no cancellation fees. Cancel at any time from your dashboard." },
];

// ═══════════════════════════════════════════════════════════════════════════════
// AGE BANDS ERROR BOUNDARY — silently catches any render crash inside
// AgeBandsSection so a stale activeBand or bad band entry never explodes the
// whole page. Returns null on crash (the section simply disappears).
// ═══════════════════════════════════════════════════════════════════════════════
class AgeBandsErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { crashed: false }; }
  static getDerivedStateFromError() { return { crashed: true }; }
  componentDidCatch() { /* swallow — no logging needed in prod */ }
  render() {
    if (this.state.crashed) return null;
    return this.props.children;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// AGE BANDS SECTION — isolated component so activeBand state resets on region
// switch. Never key on index in parent; key={region} at the call site unmounts
// and remounts this entirely, eliminating all race conditions with the interval.
// ═══════════════════════════════════════════════════════════════════════════════
function AgeBandsSection({ bands, signupHref }) {
  const [activeBand, setActiveBand] = useState(0);

  useEffect(() => {
    setActiveBand(0);
    if (!bands.length) return;
    const len = bands.filter(Boolean).length;
    if (!len) return;
    const t = setInterval(() => setActiveBand(n => (n + 1) % len), 5000);
    return () => clearInterval(t);
  }, [bands.length]);

  // Defensive: filter out any falsy entries that might have slipped in
  const safeBands = bands.filter(Boolean);
  if (!safeBands.length) return null;

  // idx is always valid: modulo keeps it in [0, safeBands.length-1] and the
  // component re-mounts on region change so activeBand starts at 0.
  const idx = activeBand % safeBands.length;
  const b = safeBands[idx];
  if (!b) return null;

  return (
    <section id="age-bands" className="relative z-10 px-4 sm:px-6 py-20 sm:py-28 bg-slate-100 dark:bg-slate-800/20">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <span className="inline-block text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 bg-slate-200 dark:bg-slate-800/40 border border-slate-300 dark:border-indigo-500/30 px-4 py-1.5 rounded-full mb-5">Adapts As They Grow</span>
          <h2 className="text-4xl sm:text-5xl font-black mb-4 text-slate-900 dark:text-slate-50">
            {safeBands.length === 3 ? '3 Worlds. 1 Platform.' : '4 Worlds. 1 Platform.'}
          </h2>
          <p className="text-lg text-slate-700 dark:text-slate-300 max-w-xl mx-auto">From magical adventures at age 5 to exam preparation at age 17. They never outgrow LaunchPard. They graduate to the next world.</p>
        </div>

        {/* Band selector tabs */}
        <div className="flex justify-center gap-2 mb-10 flex-wrap">
          {safeBands.map((band, i) => band && (
            <button key={i} onClick={() => setActiveBand(i)}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold transition-all ${
                idx === i
                  ? `bg-gradient-to-r ${band?.color ?? ''} text-white shadow-lg shadow-slate-900/30`
                  : 'bg-slate-200 dark:bg-slate-800/40 border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-indigo-400 dark:hover:border-indigo-500/40'
              }`}>
              <span className="text-lg">{band?.icon}</span>
              <span>{band?.band} ({band?.ages})</span>
            </button>
          ))}
        </div>

        {/* Active band showcase */}
        <div className="bg-white dark:bg-slate-800/40 border border-slate-300 dark:border-indigo-500/30 rounded-3xl overflow-hidden transition-all duration-500 backdrop-blur-xl">
          <div className="grid md:grid-cols-2">
            {/* Left: info */}
            <div className="p-8 sm:p-10 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-5">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${b?.color ?? ''} flex items-center justify-center text-2xl shadow-lg shadow-slate-900/30`}>{b?.icon}</div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-slate-50">{b?.title}</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">{b?.band} · Ages {b?.ages}</p>
                </div>
              </div>
              <div className="space-y-2.5 mb-6">
                {(b?.features ?? []).map((f, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-300">
                    <span className="text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5">✓</span>
                    <span>{f}</span>
                  </div>
                ))}
              </div>
              <div className="bg-slate-100 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-300 dark:border-white/10">
                <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Tara speaks their language</p>
                <p className="text-slate-700 dark:text-slate-300 text-sm italic leading-relaxed">{b?.taraVoice}</p>
              </div>
            </div>
            {/* Right: visual */}
            <div className="p-8 sm:p-10 bg-slate-50 dark:bg-slate-900/40 flex items-center justify-center border-t md:border-t-0 md:border-l border-slate-200 dark:border-white/5">
              <div className="text-center space-y-4 w-full max-w-xs">
                <div className="text-7xl mb-2">{b?.icon}</div>
                <div className={`text-2xl font-black text-transparent bg-gradient-to-r ${b?.color ?? ''} bg-clip-text`}>{b?.title}</div>
                <p className="text-slate-600 dark:text-slate-400 text-sm">{b?.band} · {b?.ages} · Adaptive AI</p>
                <Link href={signupHref} className={`inline-block bg-gradient-to-r ${b?.color ?? ''} text-white font-bold px-6 py-3 rounded-2xl text-sm shadow-lg shadow-slate-900/30 hover:scale-105 transition-all`}>
                  Try {b?.band} Experience →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

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
  const [annual, setAnnual] = useState(true);
  const [navScrolled, setNavScrolled] = useState(false);
  const [region, setRegion] = useRegion();
  const [ngPath, setNgPath] = useState(null); // null | 'parent' | 'school' — NG content gate
  // ngGateActive: true = content hidden until parent card clicked.
  // Starts false (matches SSR default) then useLayoutEffect sets it to true
  // for NG visitors BEFORE the first browser paint, so there is no flash.
  const [ngGateActive, setNgGateActive] = useState(false);
  const cfg = REGION_CONFIG[region] || REGION_CONFIG.GB;
  const isNG = region === 'NG';
  const CURRICULA = isNG ? CURRICULA_NG : CURRICULA_GB;
  const FAQS     = isNG ? FAQS_NG : FAQS_GB;
  const FEATURES  = isNG ? FEATURES_NG : FEATURES_GB;
  const AGE_BANDS = isNG ? AGE_BANDS_NG : AGE_BANDS_GB;
  const signupHref = `/signup?region=${region}&curriculum=${cfg.defaultCurriculum}`;

  useEffect(() => {
    const onScroll = () => { setScrollY(window.scrollY); setNavScrolled(window.scrollY > 20); };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Gate NG content BEFORE the first browser paint.
  // useLayoutEffect fires synchronously after hydration but before paint, so the
  // page never flashes the gated content to NG visitors — no CSS trick needed.
  // We don't set this during SSR (typeof document check in readRegionCookie) so
  // hydration always succeeds (server = gate closed, client adjusts silently).
  useLayoutEffect(() => {
    if (readRegionCookie() === 'NG') setNgGateActive(true);
  }, []);

  useEffect(() => {
    setActiveFeature(0);
    const t = setInterval(() => setActiveFeature(f => (f + 1) % FEATURES.length), 3500);
    return () => clearInterval(t);
  }, [FEATURES.length]); // re-init when region changes feature count

  // Reset NG path gate whenever region changes
  useEffect(() => {
    setNgPath(null);
    // Activate gate if switching TO NG; deactivate if switching away
    setNgGateActive(region === 'NG');
  }, [region]);

  const handleParentPathSelect = () => {
    // React 18 batches these two setState calls into a single re-render
    setNgPath('parent');
    setNgGateActive(false);
    setTimeout(() => {
      document.getElementById('age-bands')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  const handleSchoolPathSelect = () => {
    setNgPath('school');
    setNgGateActive(false);
    setTimeout(() => {
      document.getElementById('school-content')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

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
            <Link href="/for-schools" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">For Schools</Link>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <DarkModeToggle />
            <Link href="/login" className="text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-semibold text-sm px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/40 transition-colors whitespace-nowrap">Sign In</Link>
            <Link href={signupHref} className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold shadow-md shadow-indigo-500/20 transition-all whitespace-nowrap rounded-full px-4 py-2 text-sm sm:px-5 sm:py-2.5">
              {isNG ? 'Start Free' : 'Start Free'}
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      {isNG ? (
        /* ── Nigerian dual-path hero ─────────────────────────────────────── */
        <section className="relative z-10 px-4 sm:px-6 pt-28 pb-16">
          {/* Badge */}
          <div className="text-center mb-8 animate-fade-in">
            <div className="inline-flex items-center gap-2 bg-slate-100 dark:bg-slate-800/40 backdrop-blur-sm border border-slate-300 dark:border-emerald-500/30 rounded-full px-4 py-2">
              <span className="relative flex h-2 w-2"><span className="animate-ping absolute h-full w-full rounded-full bg-emerald-500 opacity-75" /><span className="relative rounded-full h-2 w-2 bg-emerald-500" /></span>
              <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{cfg.heroBadge}</span>
            </div>
          </div>

          {/* Main headline */}
          <div className="text-center mb-4 animate-fade-in-up">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[0.95] text-slate-900 dark:text-slate-50 mb-4">
              Built for<br />
              <span className="text-emerald-500">Nigerian</span> Scholars.
            </h1>
            <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-xl mx-auto leading-relaxed">
              Primary, JSS, SSS. Adaptive AI that follows the NERDC syllabus and prepares your child for WAEC, NECO, BECE, and beyond.
            </p>
          </div>

          {/* Dual-path cards — selected card expands, other card disappears */}
          <div className="max-w-3xl mx-auto grid sm:grid-cols-2 gap-4 mt-10 animate-fade-in-up animation-delay-200">

            {/* Parent card — hidden when school path selected */}
            {ngPath !== 'school' && (
            <div
              onClick={handleParentPathSelect}
              role="button"
              tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleParentPathSelect(); } }}
              className={`relative bg-amber-50 dark:bg-amber-950/40 rounded-3xl p-7 flex flex-col cursor-pointer transition-all hover:shadow-xl hover:shadow-amber-500/10 ${
                ngPath === 'parent'
                  ? 'border-2 border-amber-500 dark:border-amber-400 shadow-lg shadow-amber-500/20 sm:col-span-2'
                  : 'border-2 border-amber-200 dark:border-amber-500/30'
              }`}>
              {ngPath === 'parent' && (
                <span className="absolute top-4 right-4 bg-amber-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">✓ Selected</span>
              )}
              <div className="text-3xl mb-3">👨‍👩‍👧</div>
              <h2 className="text-xl font-black text-amber-900 dark:text-amber-200 mb-2">I&apos;m a Parent</h2>
              <p className="text-amber-800 dark:text-amber-300 text-sm leading-relaxed mb-5 flex-1">
                Give your child a real edge in WAEC, NECO, BECE, and Common Entrance. Adaptive questions, mock papers, and a guardian dashboard. Start free, no card needed.
              </p>
              <div className="bg-white dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/20 rounded-2xl px-4 py-3 mb-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-0.5">Scholar Plan from</p>
                <p className="text-2xl font-black text-amber-700 dark:text-amber-300">₦2,500<span className="text-sm font-semibold">/mo</span></p>
                <p className="text-[11px] text-amber-600 dark:text-amber-500 font-semibold">Free plan always available</p>
              </div>
              {ngPath === 'parent' ? (
                <Link
                  href={signupHref}
                  onClick={e => e.stopPropagation()}
                  className="block text-center bg-amber-500 hover:bg-amber-600 text-white font-black py-3 rounded-xl text-sm transition-all shadow-lg shadow-amber-500/30 border-b-2 border-amber-700 active:border-b-0 active:translate-y-0.5">
                  Start Free Today →
                </Link>
              ) : (
                <button type="button" className="block w-full text-center bg-amber-500 hover:bg-amber-600 text-white font-black py-3 rounded-xl text-sm transition-all shadow-lg shadow-amber-500/30 border-b-2 border-amber-700 active:border-b-0 active:translate-y-0.5">
                  See What&apos;s Included ↓
                </button>
              )}
            </div>
            )}

            {/* School card — hidden when parent path selected */}
            {ngPath !== 'parent' && (
            <div
              onClick={handleSchoolPathSelect}
              role="button"
              tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSchoolPathSelect(); } }}
              className={`relative bg-indigo-50 dark:bg-indigo-950/40 rounded-3xl p-7 flex flex-col cursor-pointer transition-all hover:shadow-xl hover:shadow-indigo-500/10 ${
                ngPath === 'school'
                  ? 'border-2 border-indigo-500 dark:border-indigo-400 shadow-lg shadow-indigo-500/20 sm:col-span-2'
                  : 'border-2 border-indigo-200 dark:border-indigo-500/30'
              }`}>
              {ngPath === 'school' && (
                <span className="absolute top-4 right-4 bg-indigo-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">✓ Selected</span>
              )}
              <div className="text-3xl mb-3">🏫</div>
              <h2 className="text-xl font-black text-indigo-900 dark:text-indigo-200 mb-2">I&apos;m a School</h2>
              <p className="text-indigo-800 dark:text-indigo-300 text-sm leading-relaxed mb-5 flex-1">
                Give every teacher a live view of class readiness: Topic gaps, Mastery scores, and Individual student profiles across. A platform built for school improvement.
              </p>
              <ul className="space-y-1.5 text-xs text-indigo-700 dark:text-indigo-300 mb-5">
                {[
                  "Teacher dashboard with full class readiness at a glance",
                  "Per-student, per-subject mastery tracking",
                  "Subject gap analysis and exam readiness scores",
                  "NDPR-compliant · No billing handled by your school",
                ].map(f => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="text-indigo-400 mt-0.5 flex-shrink-0">✓</span>{f}
                  </li>
                ))}
              </ul>
              {ngPath === 'school' ? (
                <Link
                  href="/for-schools"
                  onClick={e => e.stopPropagation()}
                  className="block text-center bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 rounded-xl text-sm transition-all shadow-lg shadow-indigo-500/30 border-b-2 border-indigo-800 active:border-b-0 active:translate-y-0.5">
                  Get Started for Your School →
                </Link>
              ) : (
                <button type="button" className="block w-full text-center bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 rounded-xl text-sm transition-all shadow-lg shadow-indigo-500/30 border-b-2 border-indigo-800 active:border-b-0 active:translate-y-0.5">
                  See What Schools Get ↓
                </button>
              )}
            </div>
            )}
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap justify-center gap-5 sm:gap-8 text-sm text-slate-600 dark:text-slate-400 mt-8 animate-fade-in-up animation-delay-400">
            {[["✓","Free plan available"],["🛡️","NDPR compliant"],["⚡","No contracts"],["🔒","No data selling"]].map(([icon,text],i) => (
              <span key={i} className="flex items-center gap-1.5"><span className="text-emerald-600 dark:text-emerald-400">{icon}</span>{text}</span>
            ))}
          </div>

          {/* Path-selection prompt — visible until a card is chosen */}
          {!ngPath && (
            <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-5 animate-fade-in">
              👆 Select a card above to explore what&apos;s included
            </p>
          )}
        </section>
      ) : (
        /* ── UK / global hero (unchanged) ───────────────────────────────── */
        <section className="relative z-10 px-4 sm:px-6 pt-28 pb-20">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-slate-100 dark:bg-slate-800/40 backdrop-blur-sm border border-slate-300 dark:border-indigo-500/30 rounded-full px-4 py-2 mb-8 animate-fade-in">
              <span className="relative flex h-2 w-2"><span className="animate-ping absolute h-full w-full rounded-full bg-indigo-500 opacity-75" /><span className="relative rounded-full h-2 w-2 bg-indigo-500" /></span>
              <span className="text-sm font-bold text-indigo-600 dark:text-indigo-300">{cfg.heroBadge}</span>
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
              <Link href={signupHref} className="group bg-indigo-500 hover:bg-indigo-600 text-white font-black text-lg px-8 py-4 rounded-2xl shadow-xl shadow-indigo-500/30 hover:scale-105 transition-all inline-flex items-center justify-center gap-2">
                {cfg.heroCta} <span className="group-hover:translate-x-1 transition-transform">→</span>
              </Link>
              <button onClick={() => document.getElementById('age-bands')?.scrollIntoView({ behavior: 'smooth' })}
                className="bg-slate-200 dark:bg-slate-800/40 backdrop-blur-xl border border-slate-300 dark:border-white/10 hover:border-indigo-400 dark:hover:border-indigo-500/40 text-slate-900 dark:text-slate-100 font-bold text-lg px-8 py-4 rounded-2xl hover:scale-105 transition-all">
                See How It Works
              </button>
            </div>
            <div className="flex flex-wrap justify-center gap-5 sm:gap-8 text-sm text-slate-600 dark:text-slate-400 animate-fade-in-up animation-delay-600">
              {[["✓","Free plan available"],["🛡️",cfg.trustLabel],["⚡","Cancel anytime"],["🔒","No data selling"]].map(([icon,text],i) => (
                <span key={i} className="flex items-center gap-1.5"><span className="text-indigo-600 dark:text-indigo-400">{icon}</span>{text}</span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══ PARENT / GB CONTENT GATE — hidden for NG visitors until parent card is clicked.
           Uses conditional rendering (not CSS): ngGateActive=true means the DOM
           simply doesn't exist, so there is no flash and no 700ms CSS transition
           showing hidden content. key triggers fade-in animation on reveal.
           Also hidden when school path is active (school content renders below). ═══ */}
      {!ngGateActive && ngPath !== 'school' && (
      <div key={ngPath || 'default'} className={ngPath ? 'animate-fade-in' : undefined}>

      {/* ═══ AGE BANDS — wrapped in error boundary to silently catch any render
           crash (e.g. stale activeBand after Fast Refresh). Keyed on region so
           it fully re-mounts on region switch for a clean activeBand=0 start.  ═══ */}
      <AgeBandsErrorBoundary>
        <AgeBandsSection key={region} bands={AGE_BANDS} signupHref={signupHref} />
      </AgeBandsErrorBoundary>

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
          <p className="mt-8 text-center text-indigo-600 dark:text-indigo-400 font-black text-xl">LaunchPard adapts to every child.</p>
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
              { icon:'📝', title:'Test', desc:'Timed mock tests under real exam conditions. Instant marking with predicted grades.', color:'orange', items: isNG
                ? ['WAEC SSCE mock papers','NECO practice tests','BECE prep · Common Entrance','AI flashcards from your weakest topics']
                : ['11+ Grammar School preparation','GCSE mock tests with grade predictions','WAEC / BECE practice papers','AI flashcards generated from weak topics'] },
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
            <h2 className="text-4xl sm:text-5xl font-black mb-4 text-slate-900 dark:text-slate-50">
              {isNG ? 'Every Nigerian Exam. One Platform.' : 'One Platform. Twelve Curricula.'}
            </h2>
            <p className="text-lg text-slate-700 dark:text-slate-300 max-w-xl mx-auto">
              {isNG
                ? 'WAEC · NECO · JAMB UTME · BECE · Common Entrance — built on the NERDC syllabus from the ground up.'
                : 'Your scholar is enrolled in their curriculum. We make sure every topic is covered.'}
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {CURRICULA.map((c, i) => (
              <div key={i} className={`group backdrop-blur-xl rounded-2xl p-6 transition-all hover:shadow-lg shadow-slate-900/30 ${c.featured ? 'bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-500/60 dark:border-emerald-400/50' : 'bg-white dark:bg-slate-800/40 border border-slate-300 dark:border-white/10 hover:border-indigo-400 dark:hover:border-indigo-500/40'}`}>
                <div className="flex items-start justify-between mb-3">
                  {/* NG variant uses emoji icons; GB variant uses flag emojis */}
                  <div className="text-4xl">{c.icon || c.flag}</div>
                  {c.featured && <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-white px-2 py-0.5 rounded-full">{isNG ? 'NERDC aligned' : 'Your curriculum'}</span>}
                </div>
                <h3 className={`text-lg font-black mb-1 text-slate-900 dark:text-slate-50 transition-colors ${c.featured ? '' : 'group-hover:text-indigo-600 dark:group-hover:text-indigo-400'}`}>{c.name}</h3>
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
          <h2 className="text-3xl sm:text-4xl font-black mb-10 text-slate-900 dark:text-slate-50">{cfg.statsHeadline}</h2>
          <div className="grid sm:grid-cols-4 gap-5 mb-8">
            {(isNG
              ? [
                { stat:"NERDC", label:"Aligned", sub:"JSS · SSS · WAEC · NECO · BECE" },
                { stat: cfg.statsQuestions, label:"Questions", sub: cfg.statsQuestionsSub },
                { stat:"5–17", label:"Ages", sub:"Primary 1 through SSS3" },
                { stat:"4", label:"Age Bands", sub:"Each with their own themed world" },
              ]
              : [
                { stat:"12", label:"Curricula", sub:"UK · Nigeria · Canada · Australia · IB · US" },
                { stat: cfg.statsQuestions, label:"Questions", sub: cfg.statsQuestionsSub },
                { stat:"5–17", label:"Ages", sub:"Year 1 through GCSE & WAEC" },
                { stat:"4", label:"Age Bands", sub:"Each with their own themed world" },
              ]
            ).map((s,i) => (
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
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-4xl sm:text-5xl font-black mb-4 text-slate-900 dark:text-slate-50">{cfg.pricingHeadline}</h2>
            <p className="text-lg text-slate-700 dark:text-slate-300 mb-8">{cfg.pricingSub}</p>
            <div className="flex justify-center">
              <div className="flex bg-slate-200 dark:bg-slate-800/40 rounded-lg p-0.5 gap-0.5 border border-slate-300 dark:border-white/10">
                <button onClick={() => setAnnual(false)} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${!annual ? "bg-white dark:bg-slate-700/60 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-600 dark:text-slate-400"}`}>Monthly</button>
                <button onClick={() => setAnnual(true)} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${annual ? "bg-white dark:bg-slate-700/60 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-600 dark:text-slate-400"}`}>Annual <span className="text-emerald-600 dark:text-emerald-400 ml-1 text-[10px]">{isNG ? 'Save up to 17%' : '2 months free'}</span></button>
              </div>
            </div>
          </div>

          {isNG ? (
            // ─── Nigerian simplified model: Free + Scholar + Add-ons ───────────────
            <div className="max-w-4xl mx-auto space-y-5">
              {/* Two core plans */}
              <div className="grid sm:grid-cols-2 gap-5">
                {/* Free */}
                <div className="bg-white dark:bg-slate-800/40 backdrop-blur-xl border border-slate-300 dark:border-white/10 rounded-3xl p-7 flex flex-col">
                  <h3 className="text-xl font-black mb-1 text-slate-900 dark:text-slate-50">Free</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-xs mb-5">No card needed. Always free.</p>
                  <div className="mb-5"><span className="text-4xl font-black text-indigo-600 dark:text-indigo-400">₦0</span></div>
                  <ul className="space-y-2.5 text-sm text-slate-700 dark:text-slate-300 mb-7 flex-1">
                    {["1 scholar","NERDC curriculum","10 questions per day","Age-adaptive experience","Basic AI hints"].map(f => <li key={f} className="flex items-start gap-2"><span className="text-indigo-600 dark:text-indigo-400 mt-0.5">✓</span>{f}</li>)}
                  </ul>
                  <Link href={signupHref} className="block text-center border border-slate-300 dark:border-white/10 hover:border-emerald-400 dark:hover:border-emerald-500/40 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-slate-900 dark:text-slate-100 font-bold py-3 rounded-xl text-sm transition-all">Start Free</Link>
                </div>

                {/* Scholar — core paid plan */}
                <div className="relative bg-slate-50 dark:bg-slate-800/60 backdrop-blur-xl border-2 border-emerald-500 dark:border-emerald-400/60 rounded-3xl p-7 flex flex-col shadow-lg shadow-emerald-500/20">
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-wider whitespace-nowrap">Everything included</div>
                  <h3 className="text-xl font-black mb-1 text-slate-900 dark:text-slate-50">Scholar</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-xs mb-5">WAEC-ready · NECO · BECE · Common Entrance · No minimum commitment</p>
                  <div className="mb-1">
                    <span className="text-4xl font-black text-emerald-600 dark:text-emerald-400">₦{annual ? "2,000" : "2,500"}</span>
                    <span className="text-slate-600 dark:text-slate-400 text-sm ml-1">/mo</span>
                  </div>
                  {annual
                    ? <p className="text-emerald-600 dark:text-emerald-400 text-xs font-bold mb-5">₦25,000/yr · Save ₦5,000 · All WAEC papers included</p>
                    : <p className="text-slate-600 dark:text-slate-400 text-xs mb-5">or ₦25,000/yr — save ₦5,000, all WAEC papers included</p>}
                  <ul className="space-y-2.5 text-sm text-slate-700 dark:text-slate-300 mb-7 flex-1">
                    {["1 scholar (add siblings below)","Unlimited questions · all subjects","Tara AI feedback (50/month)","20 WAEC/NECO exam papers","3D science simulations","Boss battles & gamification","Revision planner & grade tracker","WAEC countdown & mastery map","Offline mode","Full guardian dashboard"].map(f => <li key={f} className="flex items-start gap-2"><span className="text-emerald-600 dark:text-emerald-400 mt-0.5">✓</span>{f}</li>)}
                  </ul>
                  <Link href={signupHref} className="block text-center bg-emerald-500 hover:bg-emerald-600 text-white font-black py-3 rounded-xl text-sm transition-all shadow-md shadow-emerald-500/20">Start Free Trial</Link>
                </div>
              </div>

              {/* Add-ons */}
              <div className="bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-white/10 rounded-2xl p-6">
                <p className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-4">Optional Add-ons — buy only what you need</p>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { icon:'👨‍👩‍👧', title:'Extra Scholar', price:'₦1,000/mo', desc:'Add a sibling. Each gets full Scholar access.' },
                    { icon:'🎯', title:'WAEC Intensive Boost', price:'₦1,000/mo', desc:'Unlimited Tara AI · full mock exams · A1–F9 grade predictions' },
                    { icon:'🤖', title:'Unlimited AI', price:'₦500/mo', desc:'Remove the 50 Tara feedback/month cap' },
                  ].map(a => (
                    <div key={a.title} className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-white/10 rounded-xl p-4">
                      <div className="text-2xl mb-2">{a.icon}</div>
                      <p className="text-sm font-black text-slate-900 dark:text-slate-50 mb-0.5">{a.title}</p>
                      <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-2">{a.price}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-snug">{a.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            // ─── UK / rest-of-world tiers ───
            <div className="grid sm:grid-cols-3 gap-5 max-w-3xl mx-auto">
              {/* Free */}
              <div className="bg-white dark:bg-slate-800/40 backdrop-blur-xl border border-slate-300 dark:border-white/10 rounded-3xl p-7 flex flex-col">
                <h3 className="text-xl font-black mb-1 text-slate-900 dark:text-slate-50">Free Plan</h3>
                <p className="text-slate-600 dark:text-slate-400 text-xs mb-5">No card needed. Free plan stays free.</p>
                <div className="mb-6"><span className="text-4xl font-black text-indigo-600 dark:text-indigo-400">£0</span></div>
                <ul className="space-y-2.5 text-sm text-slate-700 dark:text-slate-300 mb-7 flex-1">
                  {["1 scholar","Your enrolled curriculum","All subjects","10 questions per day","Age-adaptive experience"].map(f => <li key={f} className="flex items-start gap-2"><span className="text-indigo-600 dark:text-indigo-400 mt-0.5">✓</span>{f}</li>)}
                </ul>
                <Link href={signupHref} className="block text-center border border-slate-300 dark:border-white/10 hover:border-indigo-400 dark:hover:border-indigo-500/40 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 text-slate-900 dark:text-slate-100 font-bold py-3 rounded-xl text-sm transition-all">Create Free Account</Link>
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
                <Link href={signupHref} className="block text-center bg-indigo-500 hover:bg-indigo-600 text-white font-black py-3 rounded-xl text-sm transition-all shadow-md shadow-indigo-500/20">30-Day Pro Trial. No Card Needed.</Link>
              </div>

              {/* Exam Mode */}
              <div className="bg-white dark:bg-slate-800/40 backdrop-blur-xl border border-slate-300 dark:border-white/10 rounded-3xl p-7 flex flex-col">
                <h3 className="text-xl font-black mb-1 text-slate-900 dark:text-slate-50">Exam Mode</h3>
                <p className="text-slate-600 dark:text-slate-400 text-xs mb-5">Add-on for Pro subscribers</p>
                <div className="mb-6"><span className="text-4xl font-black text-indigo-600 dark:text-indigo-400">+£3.99</span><span className="text-slate-600 dark:text-slate-400 text-sm ml-1">/mo</span></div>
                <ul className="space-y-2.5 text-sm text-slate-700 dark:text-slate-300 mb-7 flex-1">
                  {["Everything in Pro","Timed 11+ mock tests","GCSE practice papers","WAEC/BECE practice papers","Predicted grades","Exam countdowns","AI flashcards"].map(f => <li key={f} className="flex items-start gap-2"><span className="text-indigo-600 dark:text-indigo-400 mt-0.5">✓</span>{f}</li>)}
                </ul>
                <Link href={signupHref} className="block text-center border border-slate-300 dark:border-white/10 hover:border-indigo-400 dark:hover:border-indigo-500/40 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 text-slate-900 dark:text-slate-100 font-bold py-3 rounded-xl text-sm transition-all">Start with Pro First</Link>
              </div>
            </div>
          )}

          <p className="text-center text-slate-700 dark:text-slate-400 text-xs mt-6">{cfg.pricingFootnote}</p>
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
          <h2 className="text-4xl sm:text-5xl font-black mb-6 text-slate-900 dark:text-slate-50">{cfg.finalCtaHeadline}</h2>
          <p className="text-xl text-slate-700 dark:text-slate-300 mb-10">{cfg.finalCtaBody}</p>
          <Link href={signupHref} className={`inline-block ${isNG ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30' : 'bg-indigo-500 hover:bg-indigo-600 shadow-indigo-500/30'} text-white font-black text-xl px-12 py-5 rounded-2xl shadow-2xl hover:scale-105 transition-all`}>{cfg.finalCtaButton}</Link>
          <p className="text-slate-700 dark:text-slate-400 text-sm mt-5">No credit card required · Set up in 60 seconds</p>
        </div>
      </section>

      </div>
      )}{/* /parent-content-gate */}

      {/* ═══ SCHOOL INLINE CONTENT — shown when school path selected on NG hero ═══ */}
      {ngPath === 'school' && (
      <div id="school-content" className="animate-fade-in">

        {/* How it works */}
        <section className="relative z-10 px-4 sm:px-6 py-16 sm:py-20 bg-slate-50 dark:bg-slate-800/20">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <span className="inline-block text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 px-4 py-1.5 rounded-full mb-4">How It Works</span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mb-3">From registration to class insights in four steps</h2>
              <p className="text-slate-600 dark:text-slate-400 text-lg">Schools get powerful analytics. Scholars get personalised AI learning. Both see results.</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-5">
              {[
                { step:'01', icon:'🏫', title:'School sets up in minutes', desc:'Create your school account and add your classes — Primary through SSS3. Takes 10 minutes and our team will walk you through it.' },
                { step:'02', icon:'📧', title:'Scholars join via invitation', desc:'Share a class link or validation code. Students and parents sign up with their own accounts. School data and student billing stay completely separate.' },
                { step:'03', icon:'📊', title:'Teachers see real-time insights', desc:'Your dashboard shows every student\'s readiness score, subject mastery, and the exact topics dragging down their grade, updated after every session.' },
                { step:'04', icon:'🚀', title:'School drives improvement', desc:'Use gap analysis to focus revision. Share readiness reports with parents. Run exam countdowns. The data is yours to act on.' },
              ].map(({ step, icon, title, desc }) => (
                <div key={step} className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-white/10 rounded-2xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="text-3xl flex-shrink-0">{icon}</div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-1">Step {step}</p>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">{title}</h3>
                      <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* What's included — Starter vs Professional */}
        <section className="relative z-10 px-4 sm:px-6 py-16 sm:py-20">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mb-3">What your school gets</h2>
              <p className="text-slate-600 dark:text-slate-400 text-lg max-w-xl mx-auto">Start with our Starter tier and upgrade to Professional when your school is ready to go deeper.</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-5">
              {/* Starter */}
              <div className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-white/10 rounded-3xl p-7 flex flex-col">
                <div className="mb-5">
                  <span className="inline-block text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/40 px-3 py-1 rounded-full mb-3">Starter</span>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-1">Get started today</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">Everything you need to put data behind every teaching decision.</p>
                </div>
                <ul className="space-y-2.5 text-sm text-slate-700 dark:text-slate-300 mb-7 flex-1">
                  {[
                    "Teacher dashboard — live class readiness",
                    "Per-student mastery tracking (with consent)",
                    "Subject gap analysis across all topics",
                    "Exam readiness scores (JSS–SSS3)",
                    "Student activity monitoring",
                    "NDPR-compliant consent management",
                  ].map(f => <li key={f} className="flex items-start gap-2"><span className="text-indigo-600 dark:text-indigo-400 mt-0.5 flex-shrink-0">✓</span>{f}</li>)}
                </ul>
                <Link href="/for-schools" className="block text-center bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3.5 rounded-xl text-sm transition-all shadow-lg shadow-indigo-500/30 border-b-2 border-indigo-800 active:border-b-0 active:translate-y-0.5">
                  Register Your School →
                </Link>
              </div>
              {/* Professional */}
              <div className="relative bg-indigo-600 dark:bg-indigo-700 rounded-3xl p-7 flex flex-col">
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-amber-400 text-slate-900 text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-wider whitespace-nowrap">Coming Soon</div>
                <div className="mb-5">
                  <span className="inline-block text-xs font-black uppercase tracking-widest text-indigo-200 bg-indigo-500/40 px-3 py-1 rounded-full mb-3">Professional</span>
                  <h3 className="text-2xl font-black text-white mb-1">School-wide intelligence</h3>
                  <p className="text-indigo-200 text-sm">For HODs, proprietors, and schools serious about exam outcomes.</p>
                </div>
                <ul className="space-y-2.5 text-sm text-indigo-100 mb-7 flex-1">
                  {[
                    "Everything in Starter",
                    "PDF & CSV report export",
                    "School-wide proprietor analytics",
                    "Bulk student import from spreadsheet",
                    "Multi-class HOD overview",
                    "Parent engagement tools",
                    "Priority onboarding support",
                    "Termly readiness trend reports",
                  ].map(f => <li key={f} className="flex items-start gap-2"><span className="text-indigo-300 mt-0.5 flex-shrink-0">✓</span>{f}</li>)}
                </ul>
                <Link href="/for-schools" className="block text-center bg-white hover:bg-indigo-50 text-indigo-700 font-black py-3.5 rounded-xl text-sm transition-all shadow-lg shadow-indigo-900/30">
                  Join the Waitlist →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Stat bar */}
        <section className="relative z-10 px-4 sm:px-6 py-10 bg-indigo-600 dark:bg-indigo-700">
          <div className="max-w-4xl mx-auto grid sm:grid-cols-3 gap-6 text-center text-white">
            <div>
              <p className="text-4xl font-black mb-1">10 min</p>
              <p className="text-indigo-200 text-sm font-semibold">Setup time</p>
              <p className="text-indigo-300 text-xs mt-1">Onboarding support included</p>
            </div>
            <div>
              <p className="text-4xl font-black mb-1">P1–SSS3</p>
              <p className="text-indigo-200 text-sm font-semibold">All Year Groups</p>
              <p className="text-indigo-300 text-xs mt-1">No Key Stage left out</p>
            </div>
            <div>
              <p className="text-4xl font-black mb-1">6 exams</p>
              <p className="text-indigo-200 text-sm font-semibold">Fully covered</p>
              <p className="text-indigo-300 text-xs mt-1">WAEC · NECO · BECE · JAMB · Common Entrance · State</p>
            </div>
          </div>
        </section>

        {/* School CTA */}
        <section className="relative z-10 px-4 sm:px-6 py-20 bg-gradient-to-r from-slate-200 dark:from-slate-800/40 to-slate-100 dark:to-slate-900/40 border-y border-slate-300 dark:border-white/10">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-black mb-4 text-slate-900 dark:text-slate-50">Ready to bring data-driven teaching to your school?</h2>
            <p className="text-lg text-slate-700 dark:text-slate-300 mb-8">Register your school and we&apos;ll book a 30-minute walkthrough of the teacher dashboard — no commitment required.</p>
            <Link href="/for-schools" className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xl px-10 py-5 rounded-2xl shadow-2xl shadow-indigo-500/30 hover:scale-105 transition-all">Register Your School →</Link>
            <p className="text-slate-700 dark:text-slate-400 text-sm mt-5">NDPR compliant · No hidden fees · No long-term contracts</p>
          </div>
        </section>

      </div>
      )}{/* /school-content */}

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
            <div className="flex items-center gap-4 text-xs flex-wrap justify-center">
              <Link href="/terms" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Terms</Link>
              <Link href="/privacy-policy" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Privacy</Link>
              <Link href="/cookie-policy" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Cookies</Link>
              <Link href="/blog" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Blog</Link>
              <a href="mailto:hello@launchpard.com" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Contact</a>
              {/* Region switcher — users can override geo-detection */}
              <span className="inline-flex items-center gap-1 border-l border-slate-300 dark:border-white/10 pl-4">
                <span className="text-slate-500 dark:text-slate-500">Region:</span>
                <button
                  onClick={() => setRegion(isNG ? 'GB' : 'NG')}
                  className="inline-flex items-center gap-1 font-bold text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  aria-label="Switch region"
                >
                  <span>{cfg.flag}</span>
                  <span>{cfg.label}</span>
                  <span className="text-slate-500">({cfg.currency})</span>
                  <span className="text-indigo-600 dark:text-indigo-400">Change →</span>
                </button>
              </span>
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
