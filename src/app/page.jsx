"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// ═══════════════════════════════════════════════════════════════════════════
// LAUNCHPARD LANDING PAGE
// Retro-futuristic space exploration aesthetic inspired by 1960s NASA posters
// Bold typography, vibrant gradients, playful animations
// ═══════════════════════════════════════════════════════════════════════════

export default function LandingPage() {
  const router = useRouter();
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    {
      icon: '🤖',
      title: 'AI-Powered Learning',
      description: 'Questions adapt to your child\'s level in real-time. Always challenging, never overwhelming.',
      gradient: 'from-purple-400 to-pink-500'
    },
    {
      icon: '🌍',
      title: '6 Global Curricula',
      description: 'UK, US, Australian, IB, WAEC, Nigerian. Switch anytime. All included.',
      gradient: 'from-blue-400 to-cyan-500'
    },
    {
      icon: '🎮',
      title: 'Mission-Based Learning',
      description: 'Quests, badges, streaks, avatars. Education disguised as adventure.',
      gradient: 'from-orange-400 to-red-500'
    },
    {
      icon: '📊',
      title: 'Parent Command Center',
      description: 'Track progress, spot gaps, export reports. Know exactly how they\'re doing.',
      gradient: 'from-green-400 to-emerald-500'
    },
    {
      icon: '👨‍👩‍👧',
      title: '3 Children Included',
      description: 'One price for the whole crew. No extra charges, no hidden fees.',
      gradient: 'from-indigo-400 to-purple-500'
    },
    {
      icon: '📱',
      title: 'Learn Anywhere',
      description: 'Desktop, tablet, phone. Progress syncs everywhere. Homework made easy.',
      gradient: 'from-yellow-400 to-orange-500'
    }
  ];

  const curricula = [
    { flag: '🇬🇧', name: 'UK 11+ & National', desc: 'Grammar school & primary' },
    { flag: '🇺🇸', name: 'US Common Core', desc: 'K-12 standards aligned' },
    { flag: '🇦🇺', name: 'Australian ACARA', desc: 'Foundation to Year 12' },
    { flag: '🌍', name: 'IB PYP/MYP', desc: 'International Baccalaureate' },
    { flag: '🇳🇬', name: 'Nigerian WAEC', desc: 'SSCE preparation' },
    { flag: '🇳🇬', name: 'Nigerian NERDC', desc: 'JSS curriculum' }
  ];

  const testimonials = [
    {
      text: "My son went from dreading homework to asking for 'mission time.' His confidence soared.",
      author: "Sarah M.",
      role: "Parent of 9-year-old",
      avatar: "👩"
    },
    {
      text: "We tried three tutors. LaunchPard works better and costs a fraction of the price.",
      author: "James O.",
      role: "Parent of two",
      avatar: "👨"
    },
    {
      text: "The parent dashboard is brilliant. I can see exactly where she needs help.",
      author: "Adaeze I.",
      role: "Parent, Nigeria",
      avatar: "👩"
    }
  ];

  return (
    <div className="min-h-screen bg-[#0a0e27] text-white font-sans overflow-hidden">
      
      {/* Animated Star Field */}
      <div className="fixed inset-0 z-0">
        {[...Array(150)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full animate-twinkle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              opacity: Math.random() * 0.7 + 0.3
            }}
          />
        ))}
      </div>

      {/* Gradient Orbs */}
      <div className="fixed top-0 right-0 w-[800px] h-[800px] bg-indigo-500/20 rounded-full blur-3xl animate-float" />
      <div className="fixed bottom-0 left-0 w-[600px] h-[600px] bg-purple-500/20 rounded-full blur-3xl animate-float-delayed" />

      {/* Navigation */}
      <nav className="relative z-50 px-6 py-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="text-4xl">🚀</div>
            <div className="text-2xl font-black bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              LaunchPard
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-slate-300 hover:text-white transition-colors font-medium">
              Sign In
            </Link>
            <Link 
              href="/subscribe"
              className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 px-6 py-3 rounded-full font-bold shadow-lg shadow-indigo-500/50 transform hover:scale-105 transition-all"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 px-6 pt-20 pb-32">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-5xl mx-auto">
            
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-indigo-500/20 border border-indigo-400/30 rounded-full px-4 py-2 mb-8 animate-fade-in backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-sm font-bold">Join 3,000+ families on their learning mission</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-6xl sm:text-7xl lg:text-8xl font-black mb-8 leading-none animate-fade-in-up">
              <span className="block text-white mb-4">Where Education</span>
              <span className="block text-transparent bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text animate-shimmer bg-[length:200%_auto]">
                Becomes Adventure
              </span>
            </h1>

            {/* Subheading */}
            <p className="text-xl sm:text-2xl text-slate-300 mb-12 max-w-3xl mx-auto leading-relaxed animate-fade-in-up animation-delay-200">
              AI-powered learning across 6 global curricula. Private tutoring costs <span className="line-through text-slate-500">£60/hour</span>. 
              We're <span className="text-green-400 font-bold">£12.99/month</span> for unlimited practice.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12 animate-fade-in-up animation-delay-400">
              <Link
                href="/subscribe"
                className="group bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-black text-lg px-10 py-5 rounded-2xl shadow-2xl shadow-cyan-500/50 transform hover:scale-105 transition-all inline-flex items-center justify-center gap-3"
              >
                🚀 Start Free Trial
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </Link>
              <button
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                className="bg-slate-800/50 backdrop-blur-xl border border-slate-700 hover:border-slate-600 text-white font-bold text-lg px-10 py-5 rounded-2xl transform hover:scale-105 transition-all"
              >
                See How It Works
              </button>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap justify-center gap-8 text-sm text-slate-400 animate-fade-in-up animation-delay-600">
              <div className="flex items-center gap-2">
                <span className="text-yellow-400">⭐⭐⭐⭐⭐</span>
                <span>4.9/5 from parents</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>15,000+ questions</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-blue-400">🛡️</span>
                <span>7-day free trial</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-purple-400">⚡</span>
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>

          {/* Hero Image / Dashboard Preview */}
          <div 
            className="mt-20 relative animate-fade-in-up animation-delay-800"
            style={{ transform: `translateY(${scrollY * 0.2}px)` }}
          >
            <div className="relative mx-auto max-w-5xl">
              {/* Glow effect */}
              <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-3xl blur-3xl opacity-30" />
              
              {/* Mockup */}
              <div className="relative bg-slate-900/80 backdrop-blur-2xl rounded-3xl border border-slate-700 overflow-hidden shadow-2xl">
                <div className="aspect-video bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center p-12">
                  <div className="text-center space-y-6">
                    <div className="text-8xl">🎯</div>
                    <div className="text-3xl font-black text-transparent bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text">
                      Mission Dashboard
                    </div>
                    <div className="text-slate-400">Gamified learning that keeps kids engaged</div>
                    <div className="flex justify-center gap-4 pt-4">
                      <div className="bg-indigo-500/20 border border-indigo-400/30 rounded-2xl px-6 py-3">
                        <div className="text-2xl font-black text-indigo-400">1,247</div>
                        <div className="text-xs text-slate-400">XP Earned</div>
                      </div>
                      <div className="bg-orange-500/20 border border-orange-400/30 rounded-2xl px-6 py-3">
                        <div className="text-2xl font-black text-orange-400">🔥 12</div>
                        <div className="text-xs text-slate-400">Day Streak</div>
                      </div>
                      <div className="bg-purple-500/20 border border-purple-400/30 rounded-2xl px-6 py-3">
                        <div className="text-2xl font-black text-purple-400">8/12</div>
                        <div className="text-xs text-slate-400">Badges</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="relative z-10 px-6 py-32 bg-slate-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl sm:text-6xl font-black mb-6">
              Everything Your Child Needs
            </h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              One platform. Six curricula. Unlimited potential.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <div
                key={i}
                className="group relative bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-slate-700 p-8 hover:border-slate-600 transition-all hover:-translate-y-2"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                {/* Icon */}
                <div className={`text-6xl mb-6 bg-gradient-to-r ${feature.gradient} bg-clip-text text-transparent`}>
                  {feature.icon}
                </div>
                
                {/* Title */}
                <h3 className="text-2xl font-black mb-4 group-hover:text-cyan-400 transition-colors">
                  {feature.title}
                </h3>
                
                {/* Description */}
                <p className="text-slate-300 leading-relaxed">
                  {feature.description}
                </p>

                {/* Hover glow */}
                <div className={`absolute inset-0 bg-gradient-to-r ${feature.gradient} opacity-0 group-hover:opacity-10 rounded-3xl blur-xl transition-opacity -z-10`} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Curricula Section */}
      <section className="relative z-10 px-6 py-32">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-black mb-6">
              One Platform. Six Curricula.
            </h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Switch between curricula anytime. All included in your subscription.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {curricula.map((curr, i) => (
              <div
                key={i}
                className="bg-slate-800/30 backdrop-blur-xl rounded-2xl border border-slate-700 p-6 hover:border-indigo-500 transition-all group"
              >
                <div className="text-5xl mb-4">{curr.flag}</div>
                <h3 className="text-xl font-black mb-2 group-hover:text-cyan-400 transition-colors">
                  {curr.name}
                </h3>
                <p className="text-slate-400 text-sm">{curr.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="relative z-10 px-6 py-32 bg-slate-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-black mb-6">
              Parents Love LaunchPard
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((test, i) => (
              <div
                key={i}
                className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-slate-700 p-8"
              >
                <div className="text-yellow-400 mb-4">⭐⭐⭐⭐⭐</div>
                <p className="text-lg text-slate-200 mb-6 italic leading-relaxed">
                  "{test.text}"
                </p>
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{test.avatar}</div>
                  <div>
                    <div className="font-bold">{test.author}</div>
                    <div className="text-sm text-slate-400">{test.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="relative z-10 px-6 py-32">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl font-black mb-6">
            Simple, Honest Pricing
          </h2>
          <p className="text-xl text-slate-300 mb-16">
            One plan. Everything included. No hidden fees.
          </p>

          <div className="relative group">
            {/* Glow */}
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
            
            {/* Card */}
            <div className="relative bg-slate-900/90 backdrop-blur-xl rounded-3xl border border-slate-700 p-12">
              <div className="text-4xl mb-6">🚀</div>
              <h3 className="text-3xl font-black mb-4">LaunchPard Pro</h3>
              
              <div className="flex items-baseline justify-center gap-2 mb-8">
                <span className="text-6xl font-black text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text">
                  £12.99
                </span>
                <span className="text-2xl text-slate-400">/month</span>
              </div>

              <div className="text-slate-300 mb-8">
                or <span className="font-bold text-white">£120/year</span> (save £35.88)
              </div>

              <Link
                href="/subscribe"
                className="inline-block bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-black text-lg px-12 py-5 rounded-2xl shadow-2xl shadow-cyan-500/50 transform hover:scale-105 transition-all mb-8"
              >
                🚀 Start 7-Day Free Trial
              </Link>

              <div className="space-y-4 text-left max-w-md mx-auto">
                {[
                  'Unlimited questions & tests',
                  'All 6 curricula included',
                  'AI-powered adaptive learning',
                  'Up to 3 children',
                  'Full gamification system',
                  'Parent dashboard & reports'
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-slate-200">
                    <span className="text-green-400">✓</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <p className="text-sm text-slate-400 mt-8">
                No credit card required • Cancel anytime
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 px-6 py-32 bg-gradient-to-r from-indigo-900/50 to-purple-900/50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl sm:text-6xl font-black mb-8">
            Ready to Launch?
          </h2>
          <p className="text-2xl text-slate-300 mb-12">
            Join 3,000+ families transforming education into adventure.
          </p>
          <Link
            href="/subscribe"
            className="inline-block bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-black text-xl px-12 py-6 rounded-2xl shadow-2xl shadow-cyan-500/50 transform hover:scale-105 transition-all"
          >
            🚀 Start Your Free Trial
          </Link>
          <p className="text-slate-400 mt-6">7 days free • No credit card required</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto text-center text-slate-400">
          <div className="text-2xl font-bold mb-4">🚀 LaunchPard</div>
          <p>© 2026 LaunchPard. All rights reserved.</p>
        </div>
      </footer>

      {/* Styles */}
      <style jsx>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        @keyframes float {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(30px, -30px); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-30px, 30px); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-twinkle {
          animation: twinkle 3s ease-in-out infinite;
        }
        .animate-float {
          animation: float 20s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float-delayed 25s ease-in-out infinite;
        }
        .animate-shimmer {
          animation: shimmer 3s linear infinite;
        }
        .animate-fade-in {
          animation: fade-in 0.8s ease-out;
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out;
        }
        .animation-delay-200 {
          animation-delay: 0.2s;
          opacity: 0;
          animation-fill-mode: forwards;
        }
        .animation-delay-400 {
          animation-delay: 0.4s;
          opacity: 0;
          animation-fill-mode: forwards;
        }
        .animation-delay-600 {
          animation-delay: 0.6s;
          opacity: 0;
          animation-fill-mode: forwards;
        }
        .animation-delay-800 {
          animation-delay: 0.8s;
          opacity: 0;
          animation-fill-mode: forwards;
        }
      `}</style>
    </div>
  );
}
