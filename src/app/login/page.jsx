"use client";
/**
 * Login Page — Updated March 29 2026
 * Deploy to: src/app/login/page.jsx
 *
 * Scholar login: access_code only (no PIN). Format: QUEST-1234
 * Forgot access code: sends email to parent with all their scholars' codes
 *
 * Design Language: Unified dark space theme with indigo accents
 * - Background: bg-[#080c15] with subtle gradient
 * - Cards: slate-800/60 backdrop blur
 * - Primary CTA: Indigo gradient
 * - Links: Indigo #6366f1
 * - NO RAINBOW
 */

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import DarkModeToggle from "@/components/theme/DarkModeToggle";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 dark:bg-[#080c15]" />}>
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
  const [accessCode, setAccessCode] = useState("QUEST-");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [rememberEmail, setRememberEmail] = useState(false);
  const [rememberCode, setRememberCode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Load remembered credentials on mount
  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem("lp_remember_email");
      if (savedEmail) { setEmail(savedEmail); setRememberEmail(true); }
      const savedCode = localStorage.getItem("lp_remember_code");
      if (savedCode) { setAccessCode(savedCode); setRememberCode(true); }
    } catch (_) { /* localStorage unavailable */ }
  }, []);

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
      // Remember email preference
      try {
        if (rememberEmail) localStorage.setItem("lp_remember_email", email.trim());
        else localStorage.removeItem("lp_remember_email");
      } catch (_) {}
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
      let code = accessCode.trim().toUpperCase();
      // Ensure QUEST- prefix is present
      if (!code.startsWith("QUEST-")) code = "QUEST-" + code.replace(/^QUEST-?/i, "");

      if (!code || code === "QUEST-") throw new Error("Please enter your 4-digit code.");

      const { data: scholars, error: fetchError } = await supabase
        .from("scholars")
        .select("*")
        .eq("access_code", code)
        .limit(1);

      if (fetchError) throw fetchError;
      if (!scholars?.length) throw new Error("Access code not found. Ask your guardian for help.");

      const scholar = scholars[0];

      // Remember code preference
      try {
        if (rememberCode) localStorage.setItem("lp_remember_code", code);
        else localStorage.removeItem("lp_remember_code");
      } catch (_) {}

      localStorage.setItem("active_scholar", JSON.stringify(scholar));
      localStorage.setItem("scholar_login", "true");
      router.push("/dashboard/student");
    } catch (err) {
      setError(err.message || "Login failed");
      setLoading(false);
    }
  };

  // ── Forgot password (parent) — sends via Brevo ───────────────────
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail.trim() }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to send reset email");

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
      if (!trimmedEmail) throw new Error("Please enter your guardian's email.");

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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-[#080c15] dark:to-[#0f1629] text-slate-900 dark:text-white flex items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle star background — only visible in dark mode */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-0 dark:opacity-100 transition-opacity duration-300">
        {Array.from({ length: 40 }).map((_, i) => {
          const seed = i * 97 % 1000;
          const x = (seed * 73) % 100;
          const y = ((seed * 83) % 100);
          const size = ((seed * 7) % 2) + 0.5;
          const opacity = ((seed * 11) % 100) / 200 + 0.1;
          return (
            <div
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                width: `${size}px`,
                height: `${size}px`,
                opacity: opacity,
              }}
            />
          );
        })}
      </div>

      {/* DarkModeToggle positioned top-right */}
      <div className="absolute top-4 right-4 z-50">
        <DarkModeToggle />
      </div>

      <div className="relative z-10 bg-white dark:bg-slate-800/60 backdrop-blur-xl rounded-[20px] p-6 sm:p-8 max-w-md w-full shadow-lg dark:shadow-2xl border border-slate-200 dark:border-white/10">

        {/* Logo */}
        <div className="flex flex-col items-center mb-5">
          <img src="/logo.svg" alt="LaunchPard" className="w-14 h-14 mb-2 drop-shadow-[0_0_20px_rgba(99,102,241,0.3)]" style={{ objectFit: "contain" }} />
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">Welcome Back, Explorer</h1>
        </div>

        {/* ── Forgot Password (Parent) ──────────────────────────────── */}
        {showForgotPassword ? (
          <div>
            <h2 className="text-lg font-black mb-2 text-slate-900 dark:text-white">Reset Password</h2>
            {resetSent ? (
              <div className="text-center">
                <div className="text-4xl mb-3">📧</div>
                <p className="text-emerald-600 dark:text-emerald-300 font-bold mb-2">Check your email</p>
                <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
                  We sent a password reset link to <span className="text-slate-900 dark:text-white font-bold">{resetEmail}</span>.
                  Check your inbox and spam folder.
                </p>
                <button onClick={() => { setShowForgotPassword(false); setResetSent(false); setResetEmail(""); }}
                  className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-bold text-sm">
                  ← Back to login
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <p className="text-slate-600 dark:text-slate-400 text-sm">
                  Enter your email and we'll send you a link to reset your password.
                </p>

                {error && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-600 dark:text-rose-300 text-sm font-bold">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Email Address</label>
                  <input type="email" required placeholder="you@example.com" value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 focus:border-indigo-500 dark:focus:border-indigo-500/50 focus:ring-indigo-500/20 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-500 outline-none focus:ring-2 text-base transition-colors" />
                </div>

                <button type="submit" disabled={loading}
                  className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3.5 rounded-xl text-base transition-all disabled:opacity-50">
                  {loading ? "Sending..." : "Send Reset Link"}
                </button>

                <button type="button" onClick={() => { setShowForgotPassword(false); setError(null); }}
                  className="w-full text-slate-600 dark:text-slate-400 text-sm font-bold hover:text-slate-700 dark:hover:text-slate-300">
                  ← Back to login
                </button>
              </form>
            )}
          </div>

        /* ── Forgot Access Code (Scholar) ─────────────────────────── */
        ) : showForgotCode ? (
          <div>
            <h2 className="text-lg font-black mb-2 text-slate-900 dark:text-white">Forgot Access Code?</h2>
            {codeSent ? (
              <div className="text-center">
                <div className="text-4xl mb-3">📧</div>
                <p className="text-emerald-600 dark:text-emerald-300 font-bold mb-2">Email sent!</p>
                <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
                  We sent the access code to your guardian at <span className="text-slate-900 dark:text-white font-bold">{parentEmail}</span>.
                  Ask them to check their inbox.
                </p>
                <button onClick={() => { setShowForgotCode(false); setCodeSent(false); setParentEmail(""); setError(null); }}
                  className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-bold text-sm">
                  ← Back to login
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotCode} className="space-y-4">
                <p className="text-slate-600 dark:text-slate-400 text-sm">
                  Enter your guardian's email. We'll send them your access code so they can help you log in.
                </p>

                {error && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-600 dark:text-rose-300 text-sm font-bold">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Guardian's Email</label>
                  <input type="email" required placeholder="parent@example.com" value={parentEmail}
                    onChange={(e) => setParentEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 focus:border-indigo-500 dark:focus:border-indigo-500/50 focus:ring-indigo-500/20 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-500 outline-none focus:ring-2 text-base transition-colors" />
                </div>

                <button type="submit" disabled={loading}
                  className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3.5 rounded-xl text-base transition-all disabled:opacity-50">
                  {loading ? "Sending..." : "Send Access Code to Guardian"}
                </button>

                <button type="button" onClick={() => { setShowForgotCode(false); setError(null); }}
                  className="w-full text-slate-600 dark:text-slate-400 text-sm font-bold hover:text-slate-700 dark:hover:text-slate-300">
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
                    ? "bg-indigo-500 text-white shadow-lg"
                    : "bg-slate-200 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-white/10"
                }`}
              >
                Guardian
              </button>
              <button
                onClick={() => { setLoginType("scholar"); setError(null); }}
                className={`py-3 rounded-xl font-bold text-sm transition-all ${
                  loginType === "scholar"
                    ? "bg-indigo-500 text-white shadow-lg"
                    : "bg-slate-200 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-white/10"
                }`}
              >
                Scholar
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-rose-100 dark:bg-rose-500/10 border border-rose-300 dark:border-rose-500/30 rounded-xl text-rose-700 dark:text-rose-300 text-sm font-bold">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/30 rounded-xl text-emerald-700 dark:text-emerald-300 text-sm font-bold">
                {success}
              </div>
            )}

            {/* ── Parent Form ────────────────────────────────────────── */}
            {loginType === "parent" ? (
              <form onSubmit={handleParentLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Email</label>
                  <input type="email" required placeholder="you@example.com" value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 focus:border-indigo-500 dark:focus:border-indigo-500/50 focus:ring-indigo-500/20 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-500 outline-none focus:ring-2 text-base transition-colors" />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Password</label>
                  <div className="relative">
                    <input type={showPassword ? "text" : "password"} required placeholder="Your password" value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 pr-12 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 focus:border-indigo-500 dark:focus:border-indigo-500/50 focus:ring-indigo-500/20 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-500 outline-none focus:ring-2 text-base transition-colors" />
                    <button type="button" onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors p-1"
                      aria-label={showPassword ? "Hide password" : "Show password"}>
                      {showPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                          <line x1="1" y1="1" x2="23" y2="23"/>
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={rememberEmail} onChange={(e) => setRememberEmail(e.target.checked)}
                      className="w-4 h-4 rounded bg-slate-200 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-indigo-500 focus:ring-indigo-500/20 accent-indigo-500" />
                    <span className="text-sm text-slate-600 dark:text-slate-400">Remember email</span>
                  </label>
                  <button type="button"
                    onClick={() => { setShowForgotPassword(true); setResetEmail(email); setError(null); }}
                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 text-sm font-bold">
                    Forgot password?
                  </button>
                </div>

                <button type="submit" disabled={loading}
                  className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3.5 rounded-xl text-base transition-all disabled:opacity-50">
                  {loading ? "Signing in..." : "Sign In"}
                </button>
              </form>
            ) : (
              /* ── Scholar Form (access code only) ────────────────────── */
              <form onSubmit={handleScholarLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Access Code</label>
                  <div className="flex items-center gap-0 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 focus-within:border-indigo-500 dark:focus-within:border-indigo-500/50 focus-within:ring-2 focus-within:ring-indigo-500/20 overflow-hidden transition-colors">
                    <span className="pl-4 pr-1 py-3 text-base font-bold text-indigo-600 dark:text-indigo-400 tracking-wider select-none shrink-0">QUEST-</span>
                    <input type="text" required placeholder="1234" maxLength={4}
                      value={accessCode.startsWith("QUEST-") ? accessCode.slice(6) : accessCode}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/[^0-9]/g, "").slice(0, 4);
                        setAccessCode("QUEST-" + digits);
                      }}
                      className="flex-1 px-1 py-3 bg-transparent text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-500 outline-none text-base tracking-[0.3em] text-center font-bold" />
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-500 mt-1.5 text-center">
                    Enter your 4-digit access code
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={rememberCode} onChange={(e) => setRememberCode(e.target.checked)}
                      className="w-4 h-4 rounded bg-slate-200 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-indigo-500 focus:ring-indigo-500/20 accent-indigo-500" />
                    <span className="text-sm text-slate-600 dark:text-slate-400">Remember my code</span>
                  </label>
                  <button type="button"
                    onClick={() => { setShowForgotCode(true); setError(null); }}
                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 text-sm font-bold">
                    Forgot code?
                  </button>
                </div>

                <button type="submit" disabled={loading}
                  className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3.5 rounded-xl text-base transition-all disabled:opacity-50">
                  {loading ? "Signing in..." : "Sign In"}
                </button>
              </form>
            )}

            {/* Bottom links */}
            <p className="text-sm text-slate-600 dark:text-slate-400 text-center mt-5">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-bold">
                Start your child's free path
              </Link>
            </p>
            <div className="mt-3 text-center">
              <Link href="/" className="text-slate-500 dark:text-slate-500 text-sm hover:text-slate-600 dark:hover:text-slate-400">← Back to home</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
