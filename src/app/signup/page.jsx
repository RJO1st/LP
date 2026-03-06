"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";

export default function SignupPage() {
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

  // ─── send welcome email via our secure API route ─────────────────
  const sendWelcomeEmail = async (email, name) => {
    try {
      const res = await fetch('/api/send-welcome-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name }),
      });
      if (!res.ok) {
        console.warn('Welcome email could not be sent (API error)');
      }
    } catch (err) {
      console.error('Error sending welcome email:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.fullName.trim()) {
      setError("Please enter your full name");
      return;
    }

    if (!formData.email.trim()) {
      setError("Please enter your email");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      // 1. Sign up the user in Supabase Auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName
          }
        }
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error("Failed to create user account");

      // 2. Create parent record with 7-day trial
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 7);

      const { error: parentError } = await supabase
        .from("parents")
        .upsert({
          id: authData.user.id,
          full_name: formData.fullName,
          email: formData.email,
          subscription_status: "trial",
          trial_end: trialEnd.toISOString(),
          max_children: 3,
          billing_cycle: "monthly"
        }, {
          onConflict: 'id'
        });

      if (parentError) {
        console.warn("⚠️ Parent record not created – will be created on first login");
      }

      // 3. Send welcome email (non‑blocking)
      await sendWelcomeEmail(formData.email, formData.fullName);

      // 4. Redirect to parent dashboard
      router.push("/dashboard/parent");

    } catch (err) {
      console.error("Signup error:", err);
      setError(err.message || "Failed to create account. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">
      <div className="bg-slate-800 rounded-3xl p-8 max-w-md w-full">
        <h1 className="text-3xl font-black mb-6">🚀 Join LaunchPard</h1>
        
        {error && (
          <div className="mb-4 p-3 bg-rose-500/20 border-2 border-rose-500 rounded-xl text-rose-200 text-sm font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input 
            type="text"
            required
            placeholder="Full Name"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            className="w-full px-4 py-3 rounded-xl bg-slate-700 text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input 
            type="email"
            required
            placeholder="Email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-4 py-3 rounded-xl bg-slate-700 text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input 
            type="password"
            required
            placeholder="Password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="w-full px-4 py-3 rounded-xl bg-slate-700 text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input 
            type="password"
            required
            placeholder="Confirm Password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            className="w-full px-4 py-3 rounded-xl bg-slate-700 text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500"
          />
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 py-4 rounded-xl font-bold text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creating Account..." : "Start Free Trial"}
          </button>
        </form>

        <p className="text-sm text-slate-400 text-center mt-6">
          Already have an account?{" "}
          <Link href="/login?type=parent" className="text-indigo-400 hover:text-indigo-300">
            Sign in
          </Link>
        </p>

        <div className="mt-6 text-center">
          <Link href="/" className="text-slate-400 text-sm hover:text-slate-300">
            ← Back to home
          </Link>
        </div>

        <div className="mt-6 p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl">
          <p className="text-xs text-blue-300 text-center font-bold">
            ✨ 7-day free trial • No credit card required
          </p>
        </div>
      </div>
    </div>
  );
}