"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { CURRICULA, SUBJECTS_BY_CURRICULUM } from "@/lib/constants";

// ── Icons ─────────────────────────────────────────────────────────────────────
const RocketIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
    <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
    <path d="M9 12H4s.5-1 1-4c1.5 0 3 .5 3 .5L9 12Z"/>
    <path d="M12 15v5s1 .5 4 1c0-1.5-.5-3-.5-3L12 15Z"/>
  </svg>
);
const XIcon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18M6 6l12 12"/>
  </svg>
);
const CheckIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5"/>
  </svg>
);
const ChevronIcon = ({ size = 16, open = false }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}>
    <path d="m9 18 6-6-6-6"/>
  </svg>
);

// ── Static data ───────────────────────────────────────────────────────────────
const STATS = [
  { n: "12k+",   l: "Active Scholars" },
  { n: "97%",    l: "Pass Rate"       },
  { n: "6",      l: "Curricula"       },
  { n: "14-day", l: "Free Trial"      },
];

const SUBJECT_EMOJIS = {
  maths: "🔢", english: "📖", verbal: "🧩", nvr: "🔷",
  science: "🔬", geography: "🌍", history: "📜",
};

const FEATURES = [
  { emoji: "🧠", title: "Adaptive AI",         desc: "Generates fresh questions perfectly calibrated to each child's level. Always challenging, never frustrating." },
  { emoji: "🌍", title: "6 Global Curricula",  desc: "UK 11+, UK National, US Common Core, Australian, IB PYP, and WAEC/Nigerian — one platform for families worldwide." },
  { emoji: "📊", title: "Parent Dashboard",    desc: "Live insights on accuracy, speed, and topic mastery. See exactly where your child needs help in one glance." },
  { emoji: "👨‍👩‍👧‍👦", title: "Family Profiles", desc: "Manage up to 4 scholars from one account. Set individual targets and track each child independently." },
  { emoji: "🔒", title: "Secure Sync",         desc: "All progress syncs instantly across devices. Pick up on a tablet, continue on desktop — seamlessly." },
  { emoji: "🏆", title: "XP & Streaks",        desc: "Leaderboards, badges, and rewards turn daily practice into a game — motivating kids to keep going." },
];

const PRICING_PLANS = [
  {
    name: "Scholar", price: "£9.99", per: "/mo",
    desc: "One child, getting started on their learning journey.",
    cta: "Start Free Trial", highlight: false,
    features: ["1 Scholar profile", "AI-generated questions", "Core subjects", "Weekly progress report"],
  },
  {
    name: "Family", price: "£17.99", per: "/mo",
    desc: "The complete package for families with multiple children.",
    cta: "Start Free Trial", highlight: true, badge: "Most Popular",
    features: ["Up to 4 Scholar profiles", "All 6 curricula supported", "Full Parent Dashboard analytics", "Priority support"],
  },
  {
    name: "Academy", price: "£34.99", per: "/mo",
    desc: "The ultimate edge for serious preparation.",
    cta: "Contact Us", highlight: false,
    features: ["Unlimited profiles", "Advanced telemetry", "Custom study plans", "Monthly progress review call"],
  },
];

const REVIEWS = [
  { initials: "SM", name: "Sarah M.",  role: "Parent, Surrey",        rating: 5, quote: "Within a week the AI had pinpointed my daughter's weak spots in verbal reasoning. She went up 18% in a month." },
  { initials: "RP", name: "Rajan P.",  role: "Parent, Hertfordshire",  rating: 5, quote: "My son went from 65% to 89% accuracy in maths in six weeks. The dashboard gives me real confidence." },
  { initials: "AO", name: "Amara O.",  role: "Parent, Lagos",          rating: 5, quote: "Finally a platform that covers WAEC properly. My daughter is preparing with confidence for JSS exams." },
  { initials: "JL", name: "Jenny L.",  role: "Parent, Sydney",         rating: 5, quote: "The Australian curriculum support is excellent. The adaptive questions keep my son genuinely engaged every day." },
];

const FAQS = [
  { q: "Which curricula do you support?",               a: "LaunchPard covers UK 11+ (GL & CEM), UK National Curriculum, US Common Core (Grades 1–8), Australian Curriculum, IB Primary Years Programme, and WAEC/Nigerian curriculum. Simply select your child's curriculum when creating their profile." },
  { q: "What age is LaunchPard for?",                   a: "Primary and secondary school age (roughly 6–16 depending on curriculum). Content difficulty adapts to each child's year/grade and assessed level." },
  { q: "How does the 14-day free trial work?",          a: "Full access to the Family plan for 14 days — no credit card required. Cancel anytime with zero obligation." },
  { q: "Can my child use this on a tablet?",            a: "Yes — fully optimised for tablets, phones, and desktop. All progress syncs instantly across every device." },
  { q: "How is LaunchPard different from other apps?",  a: "LaunchPard combines adaptive AI question generation with a fully gamified experience and a parent analytics dashboard. It's not static worksheets — every session is freshly generated and curriculum-matched." },
];

const MODAL_TITLES = {
  scholar: "Scholar Login",
  signup:  "Create Parent Account",
  login:   "Parent Login",
};

// ─────────────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const router   = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const [modal,       setModal]       = useState(null);
  const [email,       setEmail]       = useState("");
  const [password,    setPassword]    = useState("");
  const [scholarCode, setScholarCode] = useState("");
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");
  const [openFaq,     setOpenFaq]     = useState(null);

  const openModal = useCallback((type) => {
    setModal(type);
    setError("");
    setEmail("");
    setPassword("");
    setScholarCode("");
  }, []);

  const closeModal = useCallback(() => {
    setModal(null);
    setError("");
  }, []);

  // ── Parent auth ───────────────────────────────────────────────────────────
  const handleParentAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (modal === "signup") {
        const { data, error: err } = await supabase.auth.signUp({ email, password });
        if (err) throw err;
        if (data?.session) {
          router.push("/dashboard/parent");
        } else {
          alert("✅ Check your email to confirm your account!");
          closeModal();
        }
      } else {
        const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        if (data?.session) {
          closeModal();
          router.push("/dashboard/parent");
        }
      }
    } catch (err) {
      setError(err?.message ?? "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Scholar login ─────────────────────────────────────────────────────────
  // Uses /api/scholar (server-side, service role key) so RLS is bypassed.
  // Direct client-side Supabase queries fail here because anonymous users
  // cannot read the scholars table — RLS blocks them correctly.
  const handleScholarCode = async (e) => {
    e.preventDefault();
    const code = scholarCode.trim().toUpperCase();
    if (!code || code.length < 4) {
      setError("Please enter a valid access code.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/scholar", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ code }),
      });

      // Guard against non-JSON responses (e.g. 404 HTML from Next.js)
      const text = await res.text();
      if (!text || text.trimStart().startsWith("<")) {
        setError("Service temporarily unavailable. Please try again.");
        return;
      }

      const result = JSON.parse(text);

      if (!res.ok || !result.scholar) {
        setError(result.error ?? "Access code not found. Please check with your parent.");
        return;
      }

      // Store the full scholar row (includes curriculum, year, avatar, etc.)
      localStorage.setItem("active_scholar", JSON.stringify(result.scholar));
      closeModal();
      router.push("/dashboard/student");
    } catch (err) {
      console.error("[Scholar login]", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col selection:bg-indigo-100">

      {/* ── NAV ─────────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 w-full z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 h-20 flex items-center px-6">
        <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
          <div className="flex items-center gap-3 font-black text-xl text-slate-900">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md border-b-4 border-indigo-800">
              <RocketIcon size={20} />
            </div>
            LaunchPard
          </div>
          <div className="hidden md:flex gap-6">
            {[["Features","#features"],["Curricula","#curricula"],["Pricing","#pricing"],["FAQ","#faq"]].map(([l, h]) => (
              <a key={l} href={h} className="font-bold text-slate-500 hover:text-indigo-600 transition-colors">{l}</a>
            ))}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => openModal("scholar")}
              className="hidden md:flex items-center gap-2 font-bold text-slate-500 hover:text-indigo-600 px-4 py-2 transition-colors"
            >
              👨‍🎓 Scholar Login
            </button>
            <button
              onClick={() => openModal("login")}
              className="bg-indigo-600 text-white font-bold px-6 py-2.5 rounded-2xl border-b-4 border-indigo-800 active:translate-y-1 active:border-b-0 hover:bg-indigo-700 transition-all"
            >
              Parent Portal
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-grow pt-32 px-6">

        {/* ── HERO ────────────────────────────────────────────────────────────── */}
        <section className="text-center max-w-5xl mx-auto mb-20">
          <span className="inline-block bg-indigo-100 text-indigo-700 font-bold px-5 py-2 rounded-full text-sm uppercase tracking-widest mb-6 border border-indigo-200">
            🌍 6 Curricula · Trusted by families worldwide
          </span>
          <h1 className="text-5xl md:text-8xl font-black mb-8 tracking-tighter leading-[0.95]">
            Turn screen time into{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
              scholarship.
            </span>
          </h1>
          <p className="text-xl md:text-2xl font-semibold text-slate-500 mb-6 max-w-3xl mx-auto leading-relaxed">
            Gamified AI learning for UK 11+, US Common Core, WAEC, IB PYP, Australian, and UK National curricula.
            Earn XP, track progress, and get insights only a parent could love.
          </p>
          <div className="flex flex-wrap justify-center gap-3 text-sm font-bold text-slate-400 mb-10">
            {Object.values(CURRICULA).map(c => (
              <span key={c.name} className="bg-white border border-slate-200 px-3 py-1.5 rounded-full">
                {c.country} {c.name}
              </span>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row justify-center gap-5">
            <button
              onClick={() => openModal("signup")}
              className="bg-indigo-600 text-white text-xl px-10 py-5 rounded-[24px] font-black shadow-xl border-b-4 border-indigo-800 active:translate-y-1 hover:bg-indigo-700 transition-all"
            >
              Start Free Trial 🚀
            </button>
            <button
              onClick={() => openModal("scholar")}
              className="bg-white text-slate-700 text-xl px-10 py-5 rounded-[24px] font-black shadow-sm border-2 border-slate-200 border-b-4 active:translate-y-1 hover:bg-slate-50 transition-all"
            >
              Scholar Login
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16">
            {STATS.map(s => (
              <div key={s.l} className="bg-white border-2 border-slate-100 border-b-4 rounded-[32px] p-8 shadow-sm text-center">
                <div className="text-3xl font-black text-indigo-600">{s.n}</div>
                <div className="text-xs font-black text-slate-400 uppercase tracking-widest mt-2">{s.l}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── FEATURES ────────────────────────────────────────────────────────── */}
        <section id="features" className="max-w-7xl mx-auto mb-24">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-black tracking-tight">Built for families. Powered by AI.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {FEATURES.map(f => (
              <div key={f.title} className="bg-white border-2 border-slate-100 border-b-8 rounded-[40px] p-10 hover:border-indigo-200 transition-all group">
                <div className="text-6xl mb-6 group-hover:scale-110 transition-transform">{f.emoji}</div>
                <h3 className="text-2xl font-black mb-4 text-slate-800">{f.title}</h3>
                <p className="text-slate-500 font-bold text-lg leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── CURRICULA SHOWCASE ───────────────────────────────────────────────── */}
        <section id="curricula" className="max-w-7xl mx-auto mb-24">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">One platform. Every curriculum.</h2>
            <p className="text-xl text-slate-500 font-semibold">Select your child's curriculum when creating their profile.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(CURRICULA).map(([key, curr]) => {
              const subjects   = SUBJECTS_BY_CURRICULUM[key] || [];
              const gradeRange = `${curr.gradeLabel} ${curr.grades[0]}–${curr.grades[curr.grades.length - 1]}`;
              return (
                <div key={key} className="bg-white border-2 border-slate-100 border-b-8 rounded-[32px] p-8 hover:border-indigo-200 transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <span className="text-5xl">{curr.country}</span>
                    <span className="bg-slate-100 text-slate-500 text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-full">
                      {gradeRange}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-slate-800 mb-3">{curr.name}</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {subjects.map(s => (
                      <span key={s} className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-lg">
                        {SUBJECT_EMOJIS[s] || "📚"} {s.charAt(0).toUpperCase() + s.slice(1)}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── PRICING ─────────────────────────────────────────────────────────── */}
        <section id="pricing" className="max-w-7xl mx-auto mb-24">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-black tracking-tight">Simple pricing. No hidden costs.</h2>
            <p className="text-slate-400 font-bold mt-3 text-lg">All plans support every curriculum. Switch anytime.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
            {PRICING_PLANS.map(p => (
              <div key={p.name} className={`relative bg-white border-4 rounded-[48px] p-10 flex flex-col shadow-sm
                ${p.highlight
                  ? "border-indigo-600 border-b-[12px] scale-105 shadow-2xl z-10"
                  : "border-slate-200 border-b-[12px]"}`}>
                {p.badge && (
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-amber-500 text-white font-black text-sm uppercase px-6 py-2 rounded-full shadow-lg">
                    ⭐ {p.badge}
                  </div>
                )}
                <p className="font-black text-xl text-slate-700 mb-2">{p.name}</p>
                <div className="text-5xl font-black mb-1 tracking-tighter">
                  {p.price}<span className="text-xl text-slate-400 font-bold">{p.per}</span>
                </div>
                <p className="text-slate-500 font-bold mb-8 flex-grow">{p.desc}</p>
                <button
                  onClick={() => p.cta !== "Contact Us" && openModal("signup")}
                  className={`w-full py-5 rounded-[24px] font-black text-xl border-b-4 transition-all mb-8
                    ${p.highlight
                      ? "bg-indigo-600 text-white border-indigo-800"
                      : "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200"}`}
                >
                  {p.cta}
                </button>
                <div className="space-y-3">
                  {p.features.map(f => (
                    <div key={f} className="flex items-center gap-3 font-bold text-slate-600 text-sm">
                      <span className={`shrink-0 ${p.highlight ? "text-indigo-600" : "text-emerald-500"}`}>
                        <CheckIcon />
                      </span>
                      {f}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── REVIEWS ─────────────────────────────────────────────────────────── */}
        <section id="reviews" className="bg-indigo-600 py-20 rounded-[60px] max-w-7xl mx-auto mb-24 text-white px-10">
          <h2 className="text-3xl font-black text-center mb-12 text-indigo-100 uppercase tracking-widest">
            What parents are saying
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {REVIEWS.map(r => (
              <div key={r.name} className="bg-white/10 p-8 rounded-[32px] border-2 border-white/20">
                <p className="text-xl font-bold italic mb-6 leading-relaxed">"{r.quote}"</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-400 rounded-full flex items-center justify-center font-black text-lg shrink-0">
                    {r.initials}
                  </div>
                  <div>
                    <p className="font-black">{r.name}</p>
                    <p className="text-indigo-200 text-sm font-bold">{r.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── FAQ ─────────────────────────────────────────────────────────────── */}
        <section id="faq" className="max-w-3xl mx-auto mb-24">
          <h2 className="text-3xl font-black mb-10 text-center uppercase tracking-widest text-slate-400">
            Frequently Asked Questions
          </h2>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div key={i} className="bg-white border-2 border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full p-6 text-left font-black text-lg flex justify-between items-center hover:bg-slate-50 transition-colors gap-4"
                >
                  <span>{faq.q}</span>
                  <span className="shrink-0"><ChevronIcon open={openFaq === i} /></span>
                </button>
                {openFaq === i && (
                  <p className="px-6 pb-6 font-bold text-slate-500 leading-relaxed border-t-2 border-slate-50 pt-4">
                    {faq.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer className="bg-slate-900 py-16 px-6 text-slate-400 font-bold border-t-8 border-black">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
          <div className="flex items-center gap-3 text-white font-black text-2xl">
            <RocketIcon size={24} /> LaunchPard
          </div>
          <p className="text-slate-500 text-sm">Used by families in 30+ countries · 6 curricula supported</p>
          <p>© {new Date().getFullYear()} LaunchPard Learning. Registered in England & Wales.</p>
        </div>
      </footer>

      {/* ── MODALS ──────────────────────────────────────────────────────────── */}
      {modal && (
        <div
          className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100] flex items-center justify-center p-4"
          onClick={closeModal}
        >
          <div
            className="bg-white w-full max-w-md rounded-[48px] border-[6px] border-slate-100 shadow-2xl p-10 relative"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">{MODAL_TITLES[modal]}</h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-rose-500 p-2 transition-colors">
                <XIcon size={28} />
              </button>
            </div>

            {error && (
              <div className="bg-rose-50 text-rose-600 p-4 rounded-[24px] font-black mb-6 border-4 border-rose-100 text-sm">
                ⚠️ {error}
              </div>
            )}

            {/* ── Scholar login ───────────────────────────────────────────────── */}
            {modal === "scholar" && (
              <form onSubmit={handleScholarCode} className="space-y-6">
                <div>
                  <p className="text-slate-400 font-bold text-sm mb-4 text-center">
                    Enter the access code your parent gave you.
                  </p>
                  <input
                    type="text"
                    required
                    autoFocus
                    className="w-full p-6 bg-slate-50 border-4 border-slate-100 rounded-[32px] font-black
                               text-center text-4xl uppercase tracking-widest outline-none
                               focus:border-indigo-500 transition-colors"
                    placeholder="QUEST-1234"
                    value={scholarCode}
                    onChange={e => setScholarCode(e.target.value)}
                    maxLength={12}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !scholarCode.trim()}
                  className="w-full bg-indigo-600 text-white font-black py-5 rounded-[32px] text-2xl
                             border-b-4 border-indigo-800 shadow-lg active:translate-y-1
                             disabled:opacity-50 hover:bg-indigo-700 transition-all"
                >
                  {loading ? "Checking…" : "Access Dashboard →"}
                </button>
              </form>
            )}

            {/* ── Parent login / signup ───────────────────────────────────────── */}
            {(modal === "login" || modal === "signup") && (
              <form onSubmit={handleParentAuth} className="space-y-4">
                <input
                  type="email"
                  required
                  autoFocus
                  className="w-full p-5 bg-slate-50 border-4 border-slate-100 rounded-[24px] font-bold
                             text-lg outline-none focus:border-indigo-500 transition-colors"
                  placeholder="parent@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
                <input
                  type="password"
                  required
                  className="w-full p-5 bg-slate-50 border-4 border-slate-100 rounded-[24px] font-bold
                             text-lg outline-none focus:border-indigo-500 transition-colors"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 text-white font-black py-5 rounded-[24px] text-xl
                             border-b-4 border-indigo-800 shadow-lg active:translate-y-1
                             disabled:opacity-50 hover:bg-indigo-700 transition-all"
                >
                  {loading ? "Please wait…" : "Continue"}
                </button>
                <div className="text-center">
                  <button
                    type="button"
                    className="text-indigo-600 font-bold hover:underline text-sm"
                    onClick={() => setModal(modal === "login" ? "signup" : "login")}
                  >
                    {modal === "login"
                      ? "New here? Create a parent account"
                      : "Already have an account? Log in"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}