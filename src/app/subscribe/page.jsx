"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

// ─── CUSTOM SVG LOGO ─────────────────────────────────────────────────────────
const LogoIcon = ({ className = "w-8 h-8" }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
    <path d="M55 20A32 32 0 1 0 75 75" stroke="url(#logo-grad)" strokeWidth="12" strokeLinecap="round"/>
    <circle cx="18" cy="45" r="2.5" fill="#00f2fe"/>
    <circle cx="50" cy="85" r="2" fill="#4facfe"/>
    <path d="M70 55Q75 55 75 50Q75 55 80 55Q75 55 75 60Q75 55 70 55Z" fill="#00f2fe"/>
    <path d="M80 65Q83 65 83 62Q83 65 86 65Q83 65 83 68Q83 65 80 65Z" fill="#4facfe"/>
    <g transform="rotate(45 50 50) translate(0 -5)">
      <path d="M35 60L25 75L45 65Z" fill="#e11d48"/>
      <path d="M65 60L75 75L55 65Z" fill="#e11d48"/>
      <path d="M42 68L50 85L58 68Z" fill="#fef08a"/>
      <path d="M45 68L50 80L55 68Z" fill="#f97316"/>
      <path d="M50 15C65 30 65 60 50 70C35 60 35 30 50 15Z" fill="#1e1b4b" stroke="#0f172a" strokeWidth="4" strokeLinejoin="round"/>
      <circle cx="50" cy="40" r="6" fill="#0f172a"/>
    </g>
    <defs>
      <linearGradient id="logo-grad" x1="0%" y1="100%" x2="0%" y2="0%">
        <stop offset="0%" stopColor="#0ea5e9"/>
        <stop offset="100%" stopColor="#3b82f6"/>
      </linearGradient>
    </defs>
  </svg>
);

// ═══════════════════════════════════════════════════════════════════════════
// LAUNCHPARD SUBSCRIBE PAGE - SPACE EXPLORATION THEME
// ═══════════════════════════════════════════════════════════════════════════

export default function SubscribePage() {
  const router = useRouter();
  const [billingCycle, setBillingCycle] = useState("annual");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const pseudoRandom = (seed, salt = 0) => {
    const x = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login?redirectTo=/subscribe");
      } else {
        setCheckingAuth(false);
      }
    };
    checkAuth();
  }, [router, supabase]);

  const handleCheckout = async () => {
  setLoading(true);
  // Simulate a successful activation
  setTimeout(() => {
    window.location.href = "/dashboard/parent?success=true";
  }, 1000);
};

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#0a0e27] flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e27] text-white font-sans overflow-hidden relative">
      {/* Stars background */}
      <div className="fixed inset-0 z-0">
        {[...Array(100)].map((_, i) => {
          const left = (pseudoRandom(i, 1) * 100).toFixed(3);
          const top = (pseudoRandom(i, 2) * 100).toFixed(3);
          const animationDelay = (pseudoRandom(i, 3) * 3).toFixed(3);
          const opacity = (pseudoRandom(i, 4) * 0.7 + 0.3).toFixed(3);
          return (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full animate-twinkle"
              style={{
                left: `${left}%`,
                top: `${top}%`,
                animationDelay: `${animationDelay}s`,
                opacity: parseFloat(opacity)
              }}
            />
          );
        })}
      </div>

      {/* Gradient orbs */}
      <div className="fixed top-0 left-1/4 w-[600px] h-[600px] bg-indigo-500/20 rounded-full blur-3xl animate-float" />
      <div className="fixed bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-3xl animate-float-delayed" />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="text-center mb-16 animate-fade-in-up">
          <div className="inline-block mb-6">
            <div className="relative">
              <div className="flex items-center justify-center gap-3 text-6xl sm:text-7xl font-black bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-shimmer">
                <LogoIcon className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0" />
                LaunchPard
              </div>
              <div className="absolute -inset-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-30 blur-2xl -z-10" />
            </div>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black mb-6 leading-tight">
            Mission: Transform Your
            <br />
            <span className="text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text">
              Child's Learning
            </span>
          </h1>
          <p className="text-xl sm:text-2xl text-slate-300 max-w-3xl mx-auto font-medium mb-8">
            AI-powered education across 6 global curricula. One platform, unlimited potential.
          </p>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-400">
            <div className="flex items-center gap-2">
              <span className="text-yellow-400">⭐⭐⭐⭐⭐</span>
              <span>4.9/5 rating</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              <span>3,000+ families</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-400">🚀</span>
              <span>15,000+ questions</span>
            </div>
          </div>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-12 animate-fade-in-up animation-delay-200">
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-full p-1.5 border border-slate-700">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-8 py-3 rounded-full text-sm font-bold transition-all ${
                billingCycle === "monthly"
                  ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/50"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("annual")}
              className={`px-8 py-3 rounded-full text-sm font-bold transition-all relative ${
                billingCycle === "annual"
                  ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/50"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Annual
              <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-black">
                SAVE 17%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Card */}
        <div className="max-w-2xl mx-auto mb-16 animate-fade-in-up animation-delay-400">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
            <div className="relative bg-slate-900/90 backdrop-blur-xl rounded-3xl border border-slate-700 overflow-hidden">
              <div className="absolute top-0 right-0 bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-xs font-black px-6 py-2 rounded-bl-2xl">
                🔥 MOST POPULAR
              </div>
              <div className="p-8 sm:p-12">
                <div className="flex items-center gap-3 mb-6">
                  <LogoIcon className="w-10 h-10 flex-shrink-0" />
                  <div>
                    <h3 className="text-3xl font-black text-white">LaunchPard Pro</h3>
                    <p className="text-slate-400 text-sm">Everything included</p>
                  </div>
                </div>
                <div className="mb-8">
                  {billingCycle === "monthly" ? (
                    <>
                      <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-6xl font-black text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text">
                          £12.99
                        </span>
                        <span className="text-2xl text-slate-400 font-medium">/month</span>
                      </div>
                      <p className="text-slate-400">Billed monthly • Cancel anytime</p>
                    </>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-6xl font-black text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text">
                          £120
                        </span>
                        <span className="text-2xl text-slate-400 font-medium">/year</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">£10/month</span>
                        <span className="bg-green-500/20 text-green-400 text-xs font-bold px-2 py-1 rounded-full">
                          Save £35.88
                        </span>
                      </div>
                    </>
                  )}
                </div>
                <button
                  onClick={handleCheckout}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 text-white font-black text-lg py-5 rounded-2xl shadow-2xl shadow-purple-500/50 transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group mb-4"
                >
                  <span className="relative z-10">
                    {loading ? "Processing..." : "🚀 Start 7-Day Free Trial"}
                  </span>
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform" />
                </button>
                <p className="text-center text-xs text-slate-400 mb-8">
                  No credit card required • Cancel anytime
                </p>
                <div className="space-y-4">
                  {[
                    { icon: "✨", text: "Unlimited questions & mock tests", color: "from-yellow-400 to-orange-500" },
                    { icon: "🌍", text: "All 6 curricula (UK, US, AU, IB, WAEC, NG)", color: "from-blue-400 to-cyan-500" },
                    { icon: "🤖", text: "AI-powered adaptive learning", color: "from-purple-400 to-pink-500" },
                    { icon: "👨‍👩‍👧", text: "Up to 3 children included", color: "from-green-400 to-emerald-500" },
                    { icon: "🎮", text: "Full gamification (badges, streaks, quests)", color: "from-indigo-400 to-purple-500" },
                    { icon: "📊", text: "Advanced parent dashboard & reports", color: "from-cyan-400 to-blue-500" },
                  ].map((feature, i) => (
                    <div key={i} className="flex items-center gap-3 group/item">
                      <div className={`text-2xl bg-gradient-to-r ${feature.color} bg-clip-text text-transparent`}>
                        {feature.icon}
                      </div>
                      <span className="text-slate-200 group-hover/item:text-white transition-colors">
                        {feature.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Comparison Section */}
        <div className="max-w-5xl mx-auto mb-16 animate-fade-in-up animation-delay-600">
          <h2 className="text-3xl font-black text-center mb-8">Why LaunchPard?</h2>
          <div className="bg-slate-800/30 backdrop-blur-xl rounded-3xl border border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left p-6 text-slate-400 font-medium">Feature</th>
                    <th className="p-6 text-center">
                      <div className="inline-block bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-2 rounded-full font-black text-sm">
                        LaunchPard
                      </div>
                    </th>
                    <th className="p-6 text-center text-slate-400 font-medium">Atom Learning</th>
                    <th className="p-6 text-center text-slate-400 font-medium">Prodigy</th>
                    <th className="p-6 text-center text-slate-400 font-medium">Tutoring</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Price", "£12.99/mo", "£29.99/mo", "$14.95/mo", "£60/hour"],
                    ["Multi-curriculum", "✅ 6 curricula", "❌ UK only", "❌ US only", "✓ Varies"],
                    ["AI-powered", "✅", "✅", "Partial", "❌"],
                    ["Unlimited tests", "✅", "✅ (Plus tier)", "❌", "❌"],
                    ["Multiple children", "✅ Up to 3", "❌", "❌", "❌"],
                    ["Gamification", "✅ Full system", "❌", "✅", "❌"],
                  ].map((row, i) => (
                    <tr key={i} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                      <td className="p-6 font-medium text-slate-200">{row[0]}</td>
                      <td className="p-6 text-center font-bold text-green-400">{row[1]}</td>
                      <td className="p-6 text-center text-slate-400">{row[2]}</td>
                      <td className="p-6 text-center text-slate-400">{row[3]}</td>
                      <td className="p-6 text-center text-slate-400">{row[4]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto animate-fade-in-up animation-delay-800">
          <h2 className="text-3xl font-black text-center mb-12">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {[
              {
                q: "What curricula do you support?",
                a: "We support 6 global curricula: UK 11+ & National Curriculum, US Common Core, Australian ACARA, IB PYP/MYP, Nigerian WAEC, and Nigerian NERDC. Your child can switch between curricula anytime."
              },
              {
                q: "Can I use it for multiple children?",
                a: "Yes! LaunchPard Pro includes up to 3 children at no extra cost. Perfect for families with multiple learners."
              },
              {
                q: "How does the 7-day free trial work?",
                a: "Start your trial without entering payment details. You'll get full access to all features. If you love it, subscribe after 7 days. No automatic charges during trial."
              },
              {
                q: "Can I cancel anytime?",
                a: "Absolutely! Cancel anytime from your account settings. No questions asked, no cancellation fees."
              },
              {
                q: "How is this different from a tutor?",
                a: "Private tutors cost £60+/hour for 1-2 sessions per week. LaunchPard gives unlimited practice, instant feedback, and adaptive learning for £12.99/month. It's like having a tutor available 24/7."
              }
            ].map((faq, i) => (
              <details key={i} className="group bg-slate-800/30 backdrop-blur-xl rounded-2xl border border-slate-700 overflow-hidden">
                <summary className="p-6 cursor-pointer list-none font-bold text-lg hover:text-cyan-400 transition-colors flex justify-between items-center">
                  {faq.q}
                  <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="px-6 pb-6 text-slate-300 leading-relaxed">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>

        {/* Final CTA */}
        <div className="text-center mt-16 animate-fade-in-up animation-delay-1000">
          <button
            onClick={handleCheckout}
            disabled={loading}
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-black text-xl px-12 py-6 rounded-2xl shadow-2xl shadow-cyan-500/50 transform hover:scale-105 transition-all disabled:opacity-50"
          >
            🚀 Launch Your Learning Journey
          </button>
          <p className="mt-4 text-slate-400">Join 3,000+ families already on their mission</p>
        </div>
      </div>

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
          background-size: 200% auto;
          animation: shimmer 3s linear infinite;
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
        .animation-delay-1000 {
          animation-delay: 1s;
          opacity: 0;
          animation-fill-mode: forwards;
        }
      `}</style>
    </div>
  );
}