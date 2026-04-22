"use client";
/**
 * LaunchPard Signup Page — Dark Space Theme
 * Updated March 2026
 * Deploy to: src/app/signup/page.jsx
 */

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { applyReferralCode } from "../../lib/referralSystem";
import { passwordError } from "../../lib/passwordValidation";
import DarkModeToggle from "@/components/theme/DarkModeToggle";
import { regionFromCurriculum, curriculumIsNigerian } from "@/lib/tierAccess";

const REGIONS = [
  { code: "uk", flag: "🇬🇧", label: "United Kingdom" },
  { code: "ng", flag: "🇳🇬", label: "Nigeria" },
  { code: "ca", flag: "🇨🇦", label: "Canada" },
  { code: "other", flag: "🌍", label: "Other" },
];

function readGeoCookie() {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(/(?:^|;\s*)__geo=([^;]+)/);
  return m && m[1] ? m[1] : null;
}

function detectRegion() {
  // Priority: URL ?region param > __geo cookie (set by proxy.ts from Vercel IP
  // country) > timezone fallback. Keeps Nigerian visitors from having to
  // re-select their region at signup.
  try {
    if (typeof window !== 'undefined') {
      const urlRegion = new URLSearchParams(window.location.search).get('region');
      if (urlRegion === 'NG') return 'ng';
      if (urlRegion === 'GB') return 'uk';
    }
    const geo = readGeoCookie();
    if (geo === 'NG') return 'ng';
    if (geo === 'GB') return 'uk';
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (tz.startsWith("Africa/Lagos") || tz.startsWith("Africa/")) return "ng";
    if (tz.startsWith("America/Toronto") || tz.startsWith("America/Vancouver") || tz.startsWith("America/Edmonton") || tz.startsWith("America/Winnipeg") || tz.startsWith("America/Halifax") || tz.startsWith("America/St_Johns")) return "ca";
    if (tz.startsWith("Europe/London") || tz === "Europe/Belfast") return "uk";
    return "other";
  } catch { return "other"; }
}

// Read the curriculum hint from the ?curriculum= query param — set by the
// landing page CTAs so Nigerian visitors skip the curriculum picker later.
function readCurriculumHint() {
  try {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('curriculum');
  } catch { return null; }
}

// Pseudo-random star generator for consistent background
function generateStars(count = 40) {
  const stars = [];
  for (let i = 0; i < count; i++) {
    const seed = i * 73; // Deterministic seed
    const x = ((seed * 137) % 1000) / 10;
    const y = ((seed * 211) % 1000) / 10;
    const opacity = ((seed * 59) % 100) / 200 + 0.3;
    const size = ((seed * 17) % 3) + 1;
    stars.push({ x, y, opacity, size });
  }
  return stars;
}

// Wrapper needed because useSearchParams requires Suspense in Next.js 16
export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 dark:bg-[#080c15]" />}>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refFromUrl   = searchParams.get("ref");
  const nextUrl      = searchParams.get("next"); // e.g. /onboarding/school

  const supabase = createBrowserClient(
    supabaseKeys.url(),
    supabaseKeys.publishable()
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [region, setRegion] = useState("other");
  const [referralCode, setReferralCode] = useState(refFromUrl || "");
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    setRegion(detectRegion());
    // Stash curriculum hint from landing-page CTA so the scholar-add step
    // can pre-select the right curriculum without asking again.
    try {
      const hint = readCurriculumHint();
      if (hint) localStorage.setItem('lp_curriculum_hint', hint);
    } catch {}
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.fullName.trim()) { setError("Please enter your full name"); return; }
    if (!formData.email.trim()) { setError("Please enter your email"); return; }
    const pwErr = passwordError(formData.password);
    if (pwErr) { setError(pwErr); return; }
    if (formData.password !== formData.confirmPassword) { setError("Passwords do not match"); return; }

    setLoading(true);

    try {
      // ── Resolve billing region + currency from the scholar's curriculum ──────
      // This is the anti-arbitrage gate: a parent geo-detected as NG who selects
      // a non-Nigerian curriculum (UK 11+, IB, US Common Core) is billed in GBP,
      // not NGN. The curriculum drives the billing region, overriding geo-IP.
      // `region` state (from detectRegion()) is used only as a display hint;
      // `billingRegion` determines the parent record's region and currency.
      let curriculumHint = null;
      try { curriculumHint = localStorage.getItem('lp_curriculum_hint') || null; } catch {}
      const urlCurriculum = new URLSearchParams(window.location.search).get('curriculum');
      const resolvedCurriculum = urlCurriculum || curriculumHint || null;

      const billingRegion   = resolvedCurriculum ? regionFromCurriculum(resolvedCurriculum) : (region === 'ng' ? 'NG' : 'GB');
      const billingCurrency = billingRegion === 'NG' ? 'NGN' : 'GBP';

      // 1. Create auth user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: { data: { full_name: formData.fullName, region: billingRegion }, emailRedirectTo: undefined },
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error("Failed to create user account");

      // 2. Create parent record
      // Trial length: 7 days for NG (sense of urgency), 30 days for GB (standard).
      const trialDays = billingRegion === 'NG' ? 7 : 30;
      const trialEnd  = new Date();
      trialEnd.setDate(trialEnd.getDate() + trialDays);

      const { error: parentError } = await supabase
        .from("parents")
        .insert({
          id: authData.user.id,
          full_name: formData.fullName,
          email: formData.email,
          subscription_status: "trial",
          trial_end: trialEnd.toISOString(),
          max_children: 3,
          billing_cycle: "monthly",
          // Billing region is curriculum-derived, NOT geo-IP-derived.
          // This is the write-once field that locks the billing currency.
          region:            billingRegion,
          currency:          billingCurrency,
          subscription_tier: 'free',
          ng_addons:         [],
        })
        .select()
        .single();

      if (parentError && parentError.code !== "23505") {
        throw new Error(`Failed to create profile: ${parentError.message}`);
      }

      // 3. Apply referral code (non-blocking)
      if (referralCode.trim()) {
        try {
          await applyReferralCode(supabase, authData.user.id, referralCode.trim());
        } catch (refErr) {
          console.warn("Referral failed (non-blocking):", refErr.message);
        }
      }

      // 4. Welcome email (non-blocking)
      try {
        await fetch("/api/emails/welcome", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: formData.email, name: formData.fullName, region }),
        });
      } catch (emailErr) {
        console.warn("Welcome email failed (non-blocking):", emailErr.message);
      }

      fetch('/api/brevo/sync-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          firstName: formData.fullName?.split(' ')[0] || '',
          lastName: formData.fullName?.split(' ').slice(1).join(' ') || '',
          curriculum: '',
          source: 'signup_page',
        }),
      }).catch(() => {});

      // 5. Auto sign-in and redirect
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (!signInError) router.push(nextUrl || "/dashboard/parent");
    } catch (err) {
      console.error("Signup error:", err);
      const msg = (err.message || "").toLowerCase();
      if (msg.includes("failed to fetch") || msg.includes("networkerror") || msg.includes("load failed") || msg === "fetch failed") {
        setError("Unable to connect. Please check your internet connection and try again.");
      } else {
        setError(err.message || "Failed to create account. Please try again.");
      }
      setLoading(false);
    }
  };

  const stars = generateStars();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#080c15] text-slate-900 dark:text-white flex items-center justify-center p-6 relative overflow-hidden">
      {/* Star background — dark mode only */}
      <div className="absolute inset-0 hidden dark:block">
        {stars.map((star, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              opacity: star.opacity,
            }}
          />
        ))}
      </div>

      {/* Gradient overlay — dark mode only */}
      <div className="absolute inset-0 hidden dark:block dark:bg-gradient-to-br dark:from-indigo-900/10 dark:via-transparent dark:to-blue-900/10" />

      {/* Content */}
      <div className="relative z-10 bg-white dark:bg-slate-800/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-[20px] p-8 max-w-md w-full shadow-lg dark:shadow-2xl">

        {/* Logo + Toggle */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex flex-col items-center flex-1">
            <img src="/logo.svg" alt="LaunchPard" className="w-16 h-16 mb-3 drop-shadow-[0_0_20px_rgba(99,102,241,0.3)]" style={{ objectFit: "contain" }} />
            <div className="bg-indigo-500/20 border border-indigo-500/50 text-slate-900 dark:text-white px-4 py-2 rounded-full text-sm font-bold">
              Start Your Child&apos;s Path
            </div>
          </div>
          <DarkModeToggle className="flex-shrink-0 ml-4" />
        </div>

        <h1 className="text-3xl font-black mb-2 text-center text-slate-900 dark:text-white">Create Your Account</h1>
        <p className="text-slate-600 dark:text-slate-400 mb-6 text-sm text-center">30-day Pro trial · No card needed</p>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-500/20 border-2 border-rose-300 dark:border-rose-500 rounded-xl text-rose-800 dark:text-rose-200 text-sm font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Region selector — hidden for NG parents; locked to Nigeria */}
          {region === 'ng' ? (
            <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-300 dark:border-emerald-500/40 rounded-xl px-4 py-3">
              <span className="text-2xl">🇳🇬</span>
              <div>
                <p className="text-sm font-black text-emerald-800 dark:text-emerald-300">Nigeria</p>
                <p className="text-xs text-emerald-700 dark:text-emerald-400">Your account is set up for the Nigerian market — billed in naira (₦)</p>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Your Region</label>
              <div className="grid grid-cols-4 gap-2">
                {REGIONS.map((r) => (
                  <button
                    key={r.code}
                    type="button"
                    onClick={() => setRegion(r.code)}
                    className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border transition-all ${
                      region === r.code
                        ? "border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-white"
                        : "border-slate-300 bg-slate-100 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 hover:border-slate-400 dark:hover:border-white/20"
                    }`}
                  >
                    <span className="text-xl">{r.flag}</span>
                    <span className="text-[10px] font-bold leading-tight text-center">{r.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Full Name</label>
            <input type="text" required placeholder="Your full name" value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder:text-slate-500 dark:bg-white/5 dark:border-white/10 dark:text-white dark:placeholder:text-slate-500 focus:border-indigo-500 dark:focus:border-indigo-500/50 focus:ring-indigo-500/20 outline-none transition-all" />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Email Address</label>
            <input type="email" required placeholder="you@example.com" value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder:text-slate-500 dark:bg-white/5 dark:border-white/10 dark:text-white dark:placeholder:text-slate-500 focus:border-indigo-500 dark:focus:border-indigo-500/50 focus:ring-indigo-500/20 outline-none transition-all" />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Password</label>
            <input type="password" required placeholder="Minimum 6 characters" value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder:text-slate-500 dark:bg-white/5 dark:border-white/10 dark:text-white dark:placeholder:text-slate-500 focus:border-indigo-500 dark:focus:border-indigo-500/50 focus:ring-indigo-500/20 outline-none transition-all" />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Confirm Password</label>
            <input type="password" required placeholder="Type password again" value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder:text-slate-500 dark:bg-white/5 dark:border-white/10 dark:text-white dark:placeholder:text-slate-500 focus:border-indigo-500 dark:focus:border-indigo-500/50 focus:ring-indigo-500/20 outline-none transition-all" />
          </div>

          {/* Referral code */}
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
              Referral Code <span className="text-slate-500 dark:text-slate-500 font-normal">(optional)</span>
            </label>
            <input type="text" placeholder="e.g. LP-SARAH-7X2K" value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              className="w-full px-4 py-3 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder:text-slate-500 dark:bg-white/5 dark:border-white/10 dark:text-white dark:placeholder:text-slate-500 focus:border-indigo-500 dark:focus:border-indigo-500/50 focus:ring-indigo-500/20 outline-none transition-all" />
            {refFromUrl && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1.5 font-bold">Referral code applied — you were invited by a friend!</p>
            )}
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-bold py-4 rounded-xl text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg dark:shadow-none">
            {loading ? "Creating Account..." : "Start 30-Day Pro Trial →"}
          </button>
        </form>

        {/* What you get */}
        <div className="mt-6 p-4 bg-slate-100 dark:bg-slate-700/40 border border-slate-200 dark:border-white/10 rounded-xl">
          <p className="font-bold text-indigo-600 dark:text-indigo-300 text-sm mb-2">Your 30-day Pro trial includes:</p>
          <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1">
            <li>✓ Unlimited questions across all subjects</li>
            <li>✓ Tara AI tutor — personalised feedback</li>
            <li>✓ Full guardian dashboard with weekly reports</li>
            <li>✓ Up to 3 scholars on your account</li>
            <li>✓ No payment info required</li>
          </ul>
          <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-3">After your trial, keep free access. 10 questions per day. Upgrade anytime.</p>
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-400 text-center mt-6">
          Already have an account?{" "}
          <Link href="/login?type=parent" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-bold transition-colors">Sign in</Link>
        </p>
        <div className="mt-4 text-center">
          <Link href="/" className="text-slate-600 dark:text-slate-500 text-sm hover:text-slate-700 dark:hover:text-slate-400 transition-colors">← Back to home</Link>
        </div>
      </div>
    </div>
  );
}