"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

// ── Seeded stars — no Math.random, no hydration mismatch ─────────────────────
const pseudoRandom = (seed, salt = 0) => {
  const x = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};
const STARS = Array.from({ length: 150 }, (_, i) => ({
  left:           (pseudoRandom(i, 1) * 100).toFixed(4) + "%",
  top:            (pseudoRandom(i, 2) * 100).toFixed(4) + "%",
  animationDelay: (pseudoRandom(i, 3) * 3).toFixed(4) + "s",
  opacity:        (pseudoRandom(i, 4) * 0.5 + 0.15).toFixed(4),
}));

export default function LandingPage() {
  const router = useRouter();
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    { icon: '🤖', title: 'AI-Powered Learning', description: "Questions adapt to your child's level in real-time. Always challenging, never overwhelming.", gradient: 'from-purple-400 to-pink-500' },
    { icon: '🌍', title: 'Global Curricula', description: 'Australian, Canadian, IB, UK, US, Nigerian, WAEC. All included.', gradient: 'from-blue-400 to-cyan-500' },
    { icon: '🎮', title: 'Mission-Based Learning', description: 'Quests, badges, streaks, avatars. Education disguised as adventure.', gradient: 'from-orange-400 to-red-500' },
    { icon: '📊', title: 'Parent Command Center', description: "Track progress, spot gaps, export reports. Know exactly how they're doing.", gradient: 'from-green-400 to-emerald-500' },
    { icon: '👨‍👩‍👧', title: '3 Children Included', description: 'One price for the whole crew. No extra charges, no hidden fees.', gradient: 'from-indigo-400 to-purple-500' },
    { icon: '📱', title: 'Learn Anywhere', description: 'Desktop, tablet, phone. Progress syncs everywhere. Homework made easy.', gradient: 'from-yellow-400 to-orange-500' }
  ];

  const curricula = [
    { flag: '🇦🇺', name: 'Australian ACARA', desc: 'Foundation to Year 12' },
    { flag: '🇨🇦', name: 'Canadian', desc: 'Grade 1-12' },
    { flag: '🌍', name: 'IB PYP/MYP', desc: 'International Baccalaureate' },
    { flag: '🇬🇧', name: 'UK 11+ & National', desc: 'Grammar school & primary' },
    { flag: '🇺🇸', name: 'US Common Core', desc: 'K-12 standards aligned' },    
    { flag: '🇳🇬', name: 'Nigerian WAEC',  desc: 'SSCE preparation',  },
    { flag: '🇳🇬', name: 'Nigerian NERDC', desc: 'JSS curriculum' }
  ];

  const testimonials = [
    { text: "My son went from dreading homework to asking for 'mission time.' His confidence soared.", author: "Sarah M.", role: "Parent of 9-year-old", avatar: "👩" },
    { text: "We tried three tutors. LaunchPard works better and costs a fraction of the price.", author: "James O.", role: "Parent of two", avatar: "👨" },
    { text: "The parent dashboard is brilliant. I can see exactly where she needs help.", author: "Adaeze I.", role: "Parent, Nigeria", avatar: "👩" }
  ];

  return (
    <div className="min-h-screen bg-[#f0f2ff] text-slate-900 font-sans overflow-hidden">

      {/* Star Field — dark dots on light background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {STARS.map((s, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-slate-400 rounded-full animate-twinkle"
            style={{ left: s.left, top: s.top, animationDelay: s.animationDelay, opacity: s.opacity }}
          />
        ))}
      </div>

      {/* Gradient Orbs */}
      <div className="fixed top-0 right-0 w-[800px] h-[800px] bg-indigo-300/25 rounded-full blur-3xl animate-float pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-[600px] h-[600px] bg-purple-300/25 rounded-full blur-3xl animate-float-delayed pointer-events-none" />

      {/* Navigation */}
      <nav className="relative z-50 px-6 py-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Image src="/logo.svg" alt="LaunchPard" width={40} height={40} className="flex-shrink-0" style={{ objectFit: "contain" }} />
            <div className="text-2xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              LaunchPard
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-slate-600 hover:text-slate-900 transition-colors font-medium">
              Sign In
            </Link>
            <Link
              href="/signup"
              className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-6 py-3 rounded-full font-bold shadow-lg shadow-indigo-500/30 transform hover:scale-105 transition-all"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 px-6 pt-20 pb-32">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-5xl mx-auto">

            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-indigo-100 border border-indigo-300/50 rounded-full px-4 py-2 mb-8 animate-fade-in backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-sm font-bold text-indigo-700">Join 3,000+ families on their learning mission</span>
            </div>

            {/* Heading */}
            <h1 className="text-6xl sm:text-7xl lg:text-8xl font-black mb-8 leading-none animate-fade-in-up text-slate-900">
              <span className="block mb-4">Where Education</span>
              <span className="block text-transparent bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 bg-clip-text animate-shimmer bg-[length:200%_auto]">
                Becomes Adventure
              </span>
            </h1>

            {/* Subheading */}
            <p className="text-xl sm:text-2xl text-slate-600 mb-12 max-w-3xl mx-auto leading-relaxed animate-fade-in-up animation-delay-200">
              AI-powered learning across global curricula. Private tutoring costs <span className="line-through text-slate-400">£60/hour</span>.
              We're <span className="text-green-600 font-bold">£12.99/month</span> for unlimited practice.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12 animate-fade-in-up animation-delay-400">
              <Link
                href="/signup"
                className="group bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-black text-lg px-10 py-5 rounded-2xl shadow-2xl shadow-cyan-500/40 transform hover:scale-105 transition-all inline-flex items-center justify-center gap-3"
              >
                🚀 Start Free Trial
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </Link>
              <button
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                className="bg-white/80 backdrop-blur-xl border border-slate-300 hover:border-indigo-400 text-slate-800 font-bold text-lg px-10 py-5 rounded-2xl transform hover:scale-105 transition-all"
              >
                See How It Works
              </button>
            </div>

            {/* Trust */}
            <div className="flex flex-wrap justify-center gap-8 text-sm text-slate-500 animate-fade-in-up animation-delay-600">
              <div className="flex items-center gap-2"><span className="text-yellow-500">⭐⭐⭐⭐⭐</span><span>4.9/5 from parents</span></div>
              <div className="flex items-center gap-2"><span className="text-green-500">✓</span><span>15,000+ questions</span></div>
              <div className="flex items-center gap-2"><span className="text-blue-500">🛡️</span><span>7-day free trial</span></div>
              <div className="flex items-center gap-2"><span className="text-purple-500">⚡</span><span>Cancel anytime</span></div>
            </div>
          </div>

          {/* Dashboard mockup */}
          <div
            className="mt-20 relative animate-fade-in-up animation-delay-800"
            style={{ transform: `translateY(${scrollY * 0.2}px)` }}
          >
            <div className="relative mx-auto max-w-3xl">
              <div className="absolute -inset-4 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 rounded-3xl blur-3xl opacity-20" />
              <div className="relative bg-white/80 backdrop-blur-2xl rounded-3xl border border-slate-200 overflow-hidden shadow-2xl shadow-indigo-200/50">
                <div className="aspect-video bg-gradient-to-br from-indigo-50 to-slate-100 flex items-center justify-center p-12">
                  <div className="text-center space-y-6">
                    <div className="text-8xl">🎯</div>
                    <div className="text-3xl font-black text-transparent bg-gradient-to-r from-cyan-500 to-purple-600 bg-clip-text">Mission Dashboard</div>
                    <div className="text-slate-500">Gamified learning that keeps kids engaged</div>
                    <div className="flex justify-center gap-4 pt-4">
                      <div className="bg-indigo-100 border border-indigo-200 rounded-2xl px-6 py-3">
                        <div className="text-2xl font-black text-indigo-600">1,247</div>
                        <div className="text-xs text-slate-500">XP Earned</div>
                      </div>
                      <div className="bg-orange-100 border border-orange-200 rounded-2xl px-6 py-3">
                        <div className="text-2xl font-black text-orange-500">🔥 12</div>
                        <div className="text-xs text-slate-500">Day Streak</div>
                      </div>
                      <div className="bg-purple-100 border border-purple-200 rounded-2xl px-6 py-3">
                        <div className="text-2xl font-black text-purple-600">8/12</div>
                        <div className="text-xs text-slate-500">Badges</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 px-6 py-32 bg-white/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl sm:text-6xl font-black mb-6 text-slate-900">Everything Your Child Needs</h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">One platform. Six curricula. Unlimited potential.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <div
                key={i}
                className="group relative bg-white/70 backdrop-blur-xl rounded-3xl border border-slate-200 p-8 hover:border-indigo-300 transition-all hover:-translate-y-2 shadow-sm hover:shadow-md"
              >
                <div className={`text-6xl mb-6 bg-gradient-to-r ${feature.gradient} bg-clip-text text-transparent`}>{feature.icon}</div>
                <h3 className="text-2xl font-black mb-4 text-slate-900 group-hover:text-indigo-600 transition-colors">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">{feature.description}</p>
                <div className={`absolute inset-0 bg-gradient-to-r ${feature.gradient} opacity-0 group-hover:opacity-5 rounded-3xl transition-opacity`} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Curricula */}
      <section className="relative z-10 px-6 py-32">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-black mb-6 text-slate-900">One Platform. Six Curricula.</h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">Switch between curricula anytime. All included in your subscription.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {curricula.map((curr, i) => (
              <div key={i} className="bg-white/60 backdrop-blur-xl rounded-2xl border border-slate-200 p-6 hover:border-indigo-400 transition-all group shadow-sm hover:shadow-md">
                <div className="text-5xl mb-4">{curr.flag}</div>
                <h3 className="text-xl font-black mb-2 text-slate-900 group-hover:text-indigo-600 transition-colors">{curr.name}</h3>
                <p className="text-slate-500 text-sm">{curr.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="relative z-10 px-6 py-32 bg-white/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-black mb-6 text-slate-900">Parents Love LaunchPard</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((test, i) => (
              <div key={i} className="bg-white/70 backdrop-blur-xl rounded-3xl border border-slate-200 p-8 shadow-sm">
                <div className="text-yellow-500 mb-4">⭐⭐⭐⭐⭐</div>
                <p className="text-lg text-slate-700 mb-6 italic leading-relaxed">"{test.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{test.avatar}</div>
                  <div>
                    <div className="font-bold text-slate-900">{test.author}</div>
                    <div className="text-sm text-slate-500">{test.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="relative z-10 px-6 py-32">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-5xl font-black mb-6 text-slate-900">Simple, Honest Pricing</h2>
          <p className="text-xl text-slate-600 mb-16">One plan. Everything included. No hidden fees.</p>
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 rounded-3xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity" />
            <div className="relative bg-white/90 backdrop-blur-xl rounded-3xl border border-slate-200 p-12 shadow-xl">
              <div className="text-4xl mb-6">🚀</div>
              <h3 className="text-3xl font-black mb-4 text-slate-900">LaunchPard Pro</h3>
              <div className="flex items-baseline justify-center gap-2 mb-8">
                <span className="text-6xl font-black text-transparent bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text">£12.99</span>
                <span className="text-2xl text-slate-500">/month</span>
              </div>
              <div className="text-slate-600 mb-8">or <span className="font-bold text-slate-900">£120/year</span> (save £35.88)</div>
              <Link
                href="/signup"
                className="inline-block bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-black text-lg px-12 py-5 rounded-2xl shadow-xl shadow-cyan-500/30 transform hover:scale-105 transition-all mb-8"
              >
                🚀 Start 7-Day Free Trial
              </Link>
              <div className="space-y-4 text-left max-w-md mx-auto">
                {['Unlimited questions & tests','All 6 curricula included','AI-powered adaptive learning','Up to 3 children','Full gamification system','Parent dashboard & reports'].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-slate-700">
                    <span className="text-green-500">✓</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              <p className="text-sm text-slate-500 mt-8">No credit card required • Cancel anytime</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 px-6 py-32 bg-gradient-to-r from-indigo-100/80 to-purple-100/80">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl sm:text-6xl font-black mb-8 text-slate-900">Ready to Launch?</h2>
          <p className="text-2xl text-slate-600 mb-12">Join 3,000+ families transforming education into adventure.</p>
          <Link
            href="/signup"
            className="inline-block bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-black text-xl px-12 py-6 rounded-2xl shadow-2xl shadow-cyan-500/30 transform hover:scale-105 transition-all"
          >
            🚀 Start Your Free Trial
          </Link>
          <p className="text-slate-500 mt-6">7 days free • No credit card required</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-12 border-t border-slate-200">
        <div className="max-w-7xl mx-auto text-center text-slate-500">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Image src="/logo.svg" alt="LaunchPard" width={32} height={32} style={{ objectFit: "contain" }} />
            <span className="text-2xl font-bold text-slate-700">LaunchPard</span>
          </div>
          <p>© 2026 LaunchPard. All rights reserved.</p>
        </div>
      </footer>

      <style jsx>{`
        @keyframes twinkle { 0%, 100% { opacity: 0.15; } 50% { opacity: 0.6; } }
        @keyframes float { 0%, 100% { transform: translate(0,0); } 50% { transform: translate(30px,-30px); } }
        @keyframes float-delayed { 0%, 100% { transform: translate(0,0); } 50% { transform: translate(-30px,30px); } }
        @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fade-in-up { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        .animate-twinkle { animation: twinkle 3s ease-in-out infinite; }
        .animate-float { animation: float 20s ease-in-out infinite; }
        .animate-float-delayed { animation: float-delayed 25s ease-in-out infinite; }
        .animate-shimmer { animation: shimmer 3s linear infinite; }
        .animate-fade-in { animation: fade-in 0.8s ease-out; }
        .animate-fade-in-up { animation: fade-in-up 0.8s ease-out; }
        .animation-delay-200 { animation-delay: 0.2s; opacity: 0; animation-fill-mode: forwards; }
        .animation-delay-400 { animation-delay: 0.4s; opacity: 0; animation-fill-mode: forwards; }
        .animation-delay-600 { animation-delay: 0.6s; opacity: 0; animation-fill-mode: forwards; }
        .animation-delay-800 { animation-delay: 0.8s; opacity: 0; animation-fill-mode: forwards; }
      `}</style>
    </div>
  );
}