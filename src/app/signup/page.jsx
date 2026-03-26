"use client";
/**
 * LaunchPard Signup Page — Updated March 2026
 * Deploy to: src/app/signup/page.jsx
 */

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { applyReferralCode } from "../../lib/referralSystem";

const REGIONS = [
  { code: "uk", flag: "🇬🇧", label: "United Kingdom" },
  { code: "ng", flag: "🇳🇬", label: "Nigeria" },
  { code: "ca", flag: "🇨🇦", label: "Canada" },
  { code: "other", flag: "🌍", label: "Other" },
];

function detectRegion() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (tz.startsWith("Africa/Lagos") || tz.startsWith("Africa/")) return "ng";
    if (tz.startsWith("America/Toronto") || tz.startsWith("America/Vancouver") || tz.startsWith("America/Edmonton") || tz.startsWith("America/Winnipeg") || tz.startsWith("America/Halifax") || tz.startsWith("America/St_Johns")) return "ca";
    if (tz.startsWith("Europe/London") || tz === "Europe/Belfast") return "uk";
    return "other";
  } catch { return "other"; }
}

// Wrapper needed because useSearchParams requires Suspense in Next.js 16
export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900" />}>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refFromUrl = searchParams.get("ref");

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
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

  useEffect(() => { setRegion(detectRegion()); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.fullName.trim()) { setError("Please enter your full name"); return; }
    if (!formData.email.trim()) { setError("Please enter your email"); return; }
    if (formData.password.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (formData.password !== formData.confirmPassword) { setError("Passwords do not match"); return; }

    setLoading(true);

    try {
      // 1. Create auth user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: { data: { full_name: formData.fullName, region }, emailRedirectTo: undefined },
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error("Failed to create user account");

      // 2. Create parent record — 14-day Pro trial
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 14);

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
          region: region,
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

      if (!signInError) router.push("/dashboard/parent");
    } catch (err) {
      setError(err.message || "Failed to create account. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white flex items-center justify-center p-6">
      <div className="bg-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-700">

        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <img src="/logo.svg" alt="LaunchPard" className="w-16 h-16 mb-3 drop-shadow-[0_0_15px_rgba(79,172,254,0.4)]" style={{ objectFit: "contain" }} />
          <div className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-4 py-2 rounded-full text-sm font-bold">
            🚀 GET STARTED FREE
          </div>
        </div>

        <h1 className="text-3xl font-black mb-2 text-center">Create Your Account</h1>
        <p className="text-slate-400 mb-6 text-sm text-center">14-day Pro trial · No payment required</p>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/20 border-2 border-rose-500 rounded-xl text-rose-200 text-sm font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Region selector */}
          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2">Your Region</label>
            <div className="grid grid-cols-4 gap-2">
              {REGIONS.map((r) => (
                <button
                  key={r.code}
                  type="button"
                  onClick={() => setRegion(r.code)}
                  className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all ${
                    region === r.code
                      ? "border-indigo-500 bg-indigo-600/30 text-white"
                      : "border-slate-600 bg-slate-700/50 text-slate-400 hover:border-slate-500"
                  }`}
                >
                  <span className="text-xl">{r.flag}</span>
                  <span className="text-[10px] font-bold leading-tight text-center">{r.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2">Full Name</label>
            <input type="text" required placeholder="Your full name" value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-slate-700 text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500 border border-slate-600" />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2">Email Address</label>
            <input type="email" required placeholder="you@example.com" value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-slate-700 text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500 border border-slate-600" />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2">Password</label>
            <input type="password" required placeholder="Minimum 6 characters" value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-slate-700 text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500 border border-slate-600" />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2">Confirm Password</label>
            <input type="password" required placeholder="Type password again" value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-slate-700 text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500 border border-slate-600" />
          </div>

          {/* Referral code */}
          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2">
              Referral Code <span className="text-slate-500 font-normal">(optional)</span>
            </label>
            <input type="text" placeholder="e.g. LP-SARAH-7X2K" value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              className="w-full px-4 py-3 rounded-xl bg-slate-700 text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500 border border-slate-600" />
            {refFromUrl && (
              <p className="text-xs text-emerald-400 mt-1.5 font-bold">Referral code applied — you were invited by a friend!</p>
            )}
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 py-4 rounded-xl font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg">
            {loading ? "Creating Account..." : "Start 14-Day Pro Trial →"}
          </button>
        </form>

        {/* What you get */}
        <div className="mt-6 p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-xl">
          <p className="font-bold text-indigo-300 text-sm mb-2">Your 14-day Pro trial includes:</p>
          <ul className="text-xs text-indigo-200 space-y-1">
            <li>✓ Unlimited questions across all subjects</li>
            <li>✓ Tara AI tutor — personalised feedback</li>
            <li>✓ Full guardian dashboard with weekly reports</li>
            <li>✓ Up to 3 scholars on your account</li>
            <li>✓ No payment info required</li>
          </ul>
          <p className="text-[10px] text-indigo-400 mt-3">After your trial, you&apos;ll keep free access — 10 questions/day, forever. Upgrade to Pro anytime.</p>
        </div>

        <p className="text-sm text-slate-400 text-center mt-6">
          Already have an account?{" "}
          <Link href="/login?type=parent" className="text-indigo-400 hover:text-indigo-300 font-bold">Sign in</Link>
        </p>
        <div className="mt-4 text-center">
          <Link href="/" className="text-slate-500 text-sm hover:text-slate-400">← Back to home</Link>
        </div>
      </div>
    </div>
  );
}