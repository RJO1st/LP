"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";

// ─── LAUNCHPARD LOGO ────────────────────────────────────────────────────────
const LogoIcon = ({ className = "w-8 h-8" }) => (
  <img
    src="/logo.svg"
    alt="LaunchPard"
    className={className}
    style={{ objectFit: "contain" }}
  />
);

export default function BetaSignupPage() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: ""
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.fullName.trim()) { setError("Please enter your full name"); return; }
    if (!formData.email.trim()) { setError("Please enter your email"); return; }
    if (formData.password.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (formData.password !== formData.confirmPassword) { setError("Passwords do not match"); return; }

    setLoading(true);

    try {
      // 1. Sign up the user in Supabase Auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: { data: { full_name: formData.fullName }, emailRedirectTo: undefined }
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error("Failed to create user account");

      // 2. Create parent record with 30‑day trial
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 30);

      const { error: parentError } = await supabase
        .from("parents")
        .insert({
          id: authData.user.id,
          full_name: formData.fullName,
          email: formData.email,
          subscription_status: "trial",
          trial_end: trialEnd.toISOString(),
          max_children: 10,
          billing_cycle: "monthly"
        })
        .select()
        .single();

      if (parentError && parentError.code !== '23505') {
        throw new Error(`Failed to create profile: ${parentError.message}`);
      }

      // 3. Send welcome email (non‑blocking – log errors only)
      try {
        await fetch('/api/emails/welcome', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            name: formData.fullName
          })
        });
      } catch (emailErr) {
        console.warn('Welcome email failed (non‑blocking):', emailErr.message);
      }

      // 4. Sign the user in (optional – you could also rely on the session from signUp)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
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

        {/* Logo + Beta Badge */}
        <div className="flex flex-col items-center mb-6">
          <LogoIcon className="w-16 h-16 mb-3 drop-shadow-[0_0_15px_rgba(79,172,254,0.4)]" />
          <div className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-4 py-2 rounded-full text-sm font-bold">
            🚀 BETA ACCESS
          </div>
        </div>

        <h1 className="text-3xl font-black mb-2">Join LaunchPard Beta</h1>
        <p className="text-slate-400 mb-6 text-sm">Get 30 days free access • No payment required</p>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/20 border-2 border-rose-500 rounded-xl text-rose-200 text-sm font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2">Full Name</label>
            <input type="text" required placeholder="John Doe" value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-slate-700 text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500 border border-slate-600"/>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2">Email Address</label>
            <input type="email" required placeholder="you@example.com" value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-slate-700 text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500 border border-slate-600"/>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2">Password</label>
            <input type="password" required placeholder="Minimum 6 characters" value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-slate-700 text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500 border border-slate-600"/>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2">Confirm Password</label>
            <input type="password" required placeholder="Type password again" value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-slate-700 text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500 border border-slate-600"/>
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 py-4 rounded-xl font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg">
            {loading ? "Creating Account..." : "Get Beta Access →"}
          </button>
        </form>

        <div className="mt-6 p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-xl">
          <p className="font-bold text-indigo-300 text-sm mb-2">✨ Beta Perks:</p>
          <ul className="text-xs text-indigo-200 space-y-1">
            <li>• 30 days free access</li>
            <li>• Up to 10 scholars</li>
            <li>• All features unlocked</li>
            <li>• No payment info required</li>
            <li>• Help shape the product!</li>
          </ul>
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