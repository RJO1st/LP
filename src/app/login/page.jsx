"use client";
/**
 * Login Page — Fixed March 23 2026
 * Deploy to: src/app/login/page.jsx
 *
 * Scholar login: access_code only (no PIN). Format: QUEST-1234
 * Forgot access code: sends email to parent with all their scholars' codes
 */

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900" />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeFromUrl = searchParams.get("type");

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const [loginType, setLoginType] = useState(typeFromUrl === "scholar" ? "scholar" : "parent");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Forgot password (parent)
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);

  // Forgot access code (scholar)
  const [showForgotCode, setShowForgotCode] = useState(false);
  const [parentEmail, setParentEmail] = useState("");
  const [codeSent, setCodeSent] = useState(false);

  // ── Parent login ──────────────────────────────────────────────────
  const handleParentLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) throw signInError;
      router.push("/dashboard/parent");
    } catch (err) {
      setError(err.message || "Invalid login credentials");
      setLoading(false);
    }
  };

  // ── Scholar login (access code only) ──────────────────────────────
  const handleScholarLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const code = accessCode.trim().toUpperCase();

      if (!code) throw new Error("Please enter your access code.");

      const { data: scholars, error: fetchError } = await supabase
        .from("scholars")
        .select("*")
        .eq("access_code", code)
        .limit(1);

      if (fetchError) throw fetchError;
      if (!scholars?.length) throw new Error("Access code not found. Ask your parent for help.");

      const scholar = scholars[0];

      localStorage.setItem("active_scholar", JSON.stringify(scholar));
      localStorage.setItem("scholar_login", "true");
      router.push("/dashboard/student");
    } catch (err) {
      setError(err.message || "Login failed");
      setLoading(false);
    }
  };

  // ── Forgot password (parent) ──────────────────────────────────────
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        resetEmail.trim(),
        { redirectTo: `${window.location.origin}/reset-password` }
      );

      if (resetError) throw resetError;
      setResetSent(true);
    } catch (err) {
      setError(err.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot access code (scholar → email parent) ───────────────────
  const handleForgotCode = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const trimmedEmail = parentEmail.trim().toLowerCase();
      if (!trimmedEmail) throw new Error("Please enter your parent's email.");

      // Call our API route that looks up scholars and emails the parent
      const res = await fetch("/api/forgot-access-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentEmail: trimmedEmail }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Something went wrong. Try again.");
      }

      setCodeSent(true);
    } catch (err) {
      setError(err.message || "Failed to send access code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-700">

        {/* Logo */}
        <div className="flex flex-col items-center mb-5">
          <img src="/logo.svg" alt="LaunchPard" className="w-14 h-14 mb-2 drop-shadow-[0_0_15px_rgba(79,172,254,0.4)]" style={{ objectFit: "contain" }} />
          <h1 className="text-2xl sm:text-3xl font-black">Welcome Back</h1>
        </div>

        {/* ── Forgot Password (Parent) ──────────────────────────────── */}
        {showForgotPassword ? (
          <div>
            <h2 className="text-lg font-black mb-2">Reset Password</h2>
            {resetSent ? (
              <div className="text-center">
                <div className="text-4xl mb-3">📧</div>
                <p className="text-emerald-400 font-bold mb-2">Check your email</p>
                <p className="text-slate-400 text-sm mb-4">
                  We sent a password reset link to <span className="text-white font-bold">{resetEmail}</span>.
                  Check your inbox and spam folder.
                </p>
                <button onClick={() => { setShowForgotPassword(false); setResetSent(false); setResetEmail(""); }}
                  className="text-indigo-400 hover:text-indigo-300 font-bold text-sm">
                  ← Back to login
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <p className="text-slate-400 text-sm">
                  Enter your email and we'll send you a link to reset your password.
                </p>

                {error && (
                  <div className="p-3 bg-rose-500/20 border border-rose-500 rounded-xl text-rose-200 text-sm font-bold">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-1.5">Email Address</label>
                  <input type="email" required placeholder="you@example.com" value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-700 text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500 border border-slate-600 text-base" />
                </div>

                <button type="submit" disabled={loading}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 py-3.5 rounded-xl font-bold text-base transition-all disabled:opacity-50">
                  {loading ? "Sending..." : "Send Reset Link"}
                </button>

                <button type="button" onClick={() => { setShowForgotPassword(false); setError(null); }}
                  className="w-full text-slate-400 text-sm font-bold hover:text-slate-300">
                  ← Back to login
                </button>
              </form>
            )}
          </div>

        /* ── Forgot Access Code (Scholar) ─────────────────────────── */
        ) : showForgotCode ? (
          <div>
            <h2 className="text-lg font-black mb-2">Forgot Access Code?</h2>
            {codeSent ? (
              <div className="text-center">
                <div className="text-4xl mb-3">📧</div>
                <p className="text-emerald-400 font-bold mb-2">Email sent!</p>
                <p className="text-slate-400 text-sm mb-4">
                  We sent the access code to your parent at <span className="text-white font-bold">{parentEmail}</span>.
                  Ask them to check their inbox.
                </p>
                <button onClick={() => { setShowForgotCode(false); setCodeSent(false); setParentEmail(""); setError(null); }}
                  className="text-indigo-400 hover:text-indigo-300 font-bold text-sm">
                  ← Back to login
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotCode} className="space-y-4">
                <p className="text-slate-400 text-sm">
                  Enter your parent's email. We'll send them your access code so they can help you log in.
                </p>

                {error && (
                  <div className="p-3 bg-rose-500/20 border border-rose-500 rounded-xl text-rose-200 text-sm font-bold">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-1.5">Parent's Email</label>
                  <input type="email" required placeholder="parent@example.com" value={parentEmail}
                    onChange={(e) => setParentEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-700 text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500 border border-slate-600 text-base" />
                </div>

                <button type="submit" disabled={loading}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 py-3.5 rounded-xl font-bold text-base transition-all disabled:opacity-50">
                  {loading ? "Sending..." : "Send Access Code to Parent"}
                </button>

                <button type="button" onClick={() => { setShowForgotCode(false); setError(null); }}
                  className="w-full text-slate-400 text-sm font-bold hover:text-slate-300">
                  ← Back to login
                </button>
              </form>
            )}
          </div>
        ) : (
          <>
            {/* ── Login Type Toggle ───────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-2 mb-5">
              <button
                onClick={() => { setLoginType("parent"); setError(null); }}
                className={`py-3 rounded-xl font-bold text-sm transition-all ${
                  loginType === "parent"
                    ? "bg-indigo-600 text-white shadow-lg"
                    : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                }`}
              >
                Parent
              </button>
              <button
                onClick={() => { setLoginType("scholar"); setError(null); }}
                className={`py-3 rounded-xl font-bold text-sm transition-all ${
                  loginType === "scholar"
                    ? "bg-indigo-600 text-white shadow-lg"
                    : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                }`}
              >
                Scholar
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-rose-500/20 border border-rose-500 rounded-xl text-rose-200 text-sm font-bold">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-emerald-500/20 border border-emerald-500 rounded-xl text-emerald-200 text-sm font-bold">
                {success}
              </div>
            )}

            {/* ── Parent Form ────────────────────────────────────────── */}
            {loginType === "parent" ? (
              <form onSubmit={handleParentLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-1.5">Email</label>
                  <input type="email" required placeholder="you@example.com" value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-700 text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500 border border-slate-600 text-base" />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-1.5">Password</label>
                  <input type="password" required placeholder="Your password" value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-700 text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500 border border-slate-600 text-base" />
                </div>

                <div className="text-right">
                  <button type="button"
                    onClick={() => { setShowForgotPassword(true); setResetEmail(email); setError(null); }}
                    className="text-indigo-400 hover:text-indigo-300 text-sm font-bold">
                    Forgot password?
                  </button>
                </div>

                <button type="submit" disabled={loading}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 py-3.5 rounded-xl font-bold text-base transition-all disabled:opacity-50">
                  {loading ? "Signing in..." : "Sign In"}
                </button>
              </form>
            ) : (
              /* ── Scholar Form (access code only) ────────────────────── */
              <form onSubmit={handleScholarLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-1.5">Access Code</label>
                  <input type="text" required placeholder="E.G. QUEST-1234" value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                    className="w-full px-4 py-3 rounded-xl bg-slate-700 text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500 border border-slate-600 text-base tracking-wider text-center uppercase" />
                  <p className="text-[11px] text-slate-500 mt-1.5 text-center">
                    Your parent gave you this code when they added you
                  </p>
                </div>

                <button type="submit" disabled={loading}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 py-3.5 rounded-xl font-bold text-base transition-all disabled:opacity-50">
                  {loading ? "Signing in..." : "Sign In"}
                </button>

                <div className="text-center">
                  <button type="button"
                    onClick={() => { setShowForgotCode(true); setError(null); }}
                    className="text-indigo-400 hover:text-indigo-300 text-sm font-bold">
                    Forgot access code?
                  </button>
                </div>
              </form>
            )}

            {/* Bottom links */}
            <p className="text-sm text-slate-400 text-center mt-5">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-indigo-400 hover:text-indigo-300 font-bold">
                Start free trial
              </Link>
            </p>
            <div className="mt-3 text-center">
              <Link href="/" className="text-slate-500 text-sm hover:text-slate-400">← Back to home</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}