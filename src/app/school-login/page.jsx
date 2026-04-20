"use client";
/**
 * School Staff Login / Register — /school-login
 *
 * Used by teachers and proprietors/admins to access school dashboards.
 *
 * Tabs:
 *   "signin"  — Email + password login
 *   "signup"  — Create new school staff account (no parent/trial language)
 *
 * Authentication flow (sign in):
 *   1. Email + password → supabase.auth.signInWithPassword
 *   2. Look up school_roles for the authenticated user
 *   3. Redirect based on role or ?redirectTo param
 *   4. If no school_roles row: show "No staff account found" error
 *
 * Authentication flow (sign up):
 *   1. supabase.auth.signUp → creates auth user
 *   2. Redirect to ?redirectTo (default /onboarding/school)
 *
 * Design: matches global dark space theme, emerald accent for school context.
 */

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import DarkModeToggle from "@/components/theme/DarkModeToggle";

export default function SchoolLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 dark:bg-[#080c15]" />}>
      <SchoolLoginForm />
    </Suspense>
  );
}

function isNetworkError(err) {
  if (!err) return false;
  const msg = (err.message || err.toString()).toLowerCase();
  return (
    msg.includes("failed to fetch") ||
    msg.includes("networkerror") ||
    msg.includes("network request failed") ||
    msg.includes("load failed") ||
    msg === "fetch failed"
  );
}

function friendlyError(err) {
  if (isNetworkError(err)) return "Unable to connect. Please check your internet connection.";
  const msg = err?.message || "";
  if (msg.includes("Invalid login credentials")) return "Incorrect email or password.";
  if (msg.includes("Email not confirmed"))       return "Please confirm your email before logging in.";
  if (msg.includes("Too many requests"))         return "Too many attempts. Please wait a minute.";
  return msg || "Something went wrong. Please try again.";
}

// Role → display label
const ROLE_LABELS = {
  proprietor: "Proprietor",
  admin:      "Admin",
  teacher:    "Teacher",
};

function SchoolLoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const redirectTo   = searchParams.get("redirectTo");
  const initialTab   = searchParams.get("tab") === "signup" ? "signup" : "signin";

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  // Tab state
  const [tab,         setTab]         = useState(initialTab);

  // Sign-in states
  const [email,       setEmail]       = useState("");
  const [password,    setPassword]    = useState("");
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);
  const [showPwd,     setShowPwd]     = useState(false);

  // Reset password states
  const [showReset,   setShowReset]   = useState(false);
  const [resetEmail,  setResetEmail]  = useState("");
  const [resetSent,   setResetSent]   = useState(false);

  // Sign-up states
  const [suFullName,  setSuFullName]  = useState("");
  const [suEmail,     setSuEmail]     = useState("");
  const [suPassword,  setSuPassword]  = useState("");
  const [suConfirm,   setSuConfirm]   = useState("");
  const [suShowPwd,   setSuShowPwd]   = useState(false);
  const [suLoading,   setSuLoading]   = useState(false);
  const [suError,     setSuError]     = useState(null);
  const [suDone,      setSuDone]      = useState(false);

  // Switch tab — clear errors
  function switchTab(t) {
    setTab(t);
    setError(null);
    setSuError(null);
    setShowReset(false);
  }

  // Check if already signed in on mount — redirect immediately if so
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      await routeByRole(session.user.id);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function routeByRole(userId) {
    const { data: roles } = await supabase
      .from("school_roles")
      .select("role, school_id")
      .eq("user_id", userId)
      .limit(1);

    if (!roles?.length) return null; // caller handles "no role" case

    const { role } = roles[0];

    if (redirectTo) {
      router.push(redirectTo);
      return role;
    }

    if (role === "proprietor" || role === "admin") {
      router.push("/dashboard/proprietor");
    } else {
      router.push("/dashboard/teacher");
    }
    return role;
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInErr) throw signInErr;

      const role = await routeByRole(data.user.id);

      if (role === null) {
        // Authenticated user has no school_roles row — sign them out and show error
        await supabase.auth.signOut();
        setError(
          "No staff account found for this email. " +
          "Contact your school administrator or LaunchPard support."
        );
        setLoading(false);
      }
      // If role was found, routeByRole triggered navigation — keep loading spinner
    } catch (err) {
      console.error("School login error:", err);
      setError(friendlyError(err));
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(
        resetEmail.trim(),
        { redirectTo: `${window.location.origin}/reset-password` }
      );
      if (resetErr) throw resetErr;
      setResetSent(true);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setSuError(null);

    if (suPassword !== suConfirm) {
      setSuError("Passwords do not match.");
      return;
    }
    if (suPassword.length < 8) {
      setSuError("Password must be at least 8 characters.");
      return;
    }

    setSuLoading(true);
    try {
      const destination = redirectTo || "/onboarding/school";
      const { data, error: signUpErr } = await supabase.auth.signUp({
        email:    suEmail.trim(),
        password: suPassword,
        options: {
          data:        { full_name: suFullName.trim() },
          emailRedirectTo: `${window.location.origin}${destination}`,
        },
      });

      if (signUpErr) throw signUpErr;

      // Supabase may require email confirmation, or may auto-confirm (depends on project settings).
      // If a session was created immediately, navigate now; otherwise show confirmation notice.
      if (data?.session) {
        router.push(destination);
      } else {
        setSuDone(true);
      }
    } catch (err) {
      setSuError(friendlyError(err));
      setSuLoading(false);
    }
  };

  // ── Subtle star field for dark mode ──────────────────────────────────────
  const stars = Array.from({ length: 30 }).map((_, i) => {
    const seed = i * 113 % 1000;
    return {
      left:    `${(seed * 73) % 100}%`,
      top:     `${(seed * 83) % 100}%`,
      size:    ((seed * 7) % 2) + 0.5,
      opacity: ((seed * 11) % 100) / 200 + 0.1,
    };
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-[#080c15] dark:to-[#0a1020] text-slate-900 dark:text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">

      {/* Star field — dark mode only */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-0 dark:opacity-100 transition-opacity duration-300">
        {stars.map((s, i) => (
          <div key={i} className="absolute rounded-full bg-white"
            style={{ left: s.left, top: s.top, width: `${s.size}px`, height: `${s.size}px`, opacity: s.opacity }} />
        ))}
      </div>

      <div className="absolute top-4 right-4 z-50"><DarkModeToggle /></div>

      <div className="relative z-10 w-full max-w-md">

        {/* Header */}
        <div className="flex flex-col items-center mb-6">
          <img src="/logo.svg" alt="LaunchPard" className="w-12 h-12 mb-3 drop-shadow-[0_0_16px_rgba(16,185,129,0.25)]" style={{ objectFit: "contain" }} />
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold mb-3">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            School Staff Portal
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {tab === "signup" ? "Set Up Your School" : "Staff Sign In"}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {tab === "signup" ? "Proprietors &amp; administrators" : "Teachers &amp; proprietors"}
          </p>
        </div>

        {/* Tab switcher */}
        {!showReset && (
          <div className="flex rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 mb-4 bg-slate-100 dark:bg-white/5">
            {["signin", "signup"].map(t => (
              <button key={t} type="button" onClick={() => switchTab(t)}
                className={[
                  "flex-1 py-2.5 text-sm font-bold transition-colors",
                  tab === t
                    ? "bg-emerald-500 text-white shadow"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white",
                ].join(" ")}>
                {t === "signin" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>
        )}

        {/* Card */}
        <div className="bg-white dark:bg-slate-800/60 backdrop-blur-xl rounded-[20px] p-6 sm:p-8 shadow-lg dark:shadow-2xl border border-slate-200 dark:border-white/10">

          {/* ─────────────────── SIGN-UP TAB ─────────────────── */}
          {tab === "signup" ? (
            suDone ? (
              <div className="text-center py-4">
                <div className="text-4xl mb-3">📧</div>
                <p className="text-emerald-600 dark:text-emerald-300 font-black text-lg mb-2">Check your email</p>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-5">
                  We sent a confirmation link to{" "}
                  <span className="font-bold text-slate-900 dark:text-white">{suEmail}</span>.
                  Click the link to activate your account and begin school setup.
                </p>
                <button onClick={() => { setSuDone(false); switchTab("signin"); }}
                  className="text-emerald-600 dark:text-emerald-400 text-sm font-bold hover:underline">
                  ← Back to sign in
                </button>
              </div>
            ) : (
              <form onSubmit={handleSignUp} className="space-y-4">
                {suError && <ErrorBanner msg={suError} />}

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Full Name</label>
                  <input type="text" required autoComplete="name" placeholder="Your name"
                    value={suFullName} onChange={e => setSuFullName(e.target.value)}
                    className={inputCls} />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Work Email</label>
                  <input type="email" required autoComplete="email" placeholder="you@school.com"
                    value={suEmail} onChange={e => setSuEmail(e.target.value)}
                    className={inputCls} />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Password</label>
                  <div className="relative">
                    <input type={suShowPwd ? "text" : "password"} required autoComplete="new-password"
                      placeholder="Min 8 characters"
                      value={suPassword} onChange={e => setSuPassword(e.target.value)}
                      className={`${inputCls} pr-12`} />
                    <button type="button" onClick={() => setSuShowPwd(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1"
                      aria-label={suShowPwd ? "Hide password" : "Show password"}>
                      {suShowPwd
                        ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                        : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      }
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Confirm Password</label>
                  <input type={suShowPwd ? "text" : "password"} required autoComplete="new-password"
                    placeholder="Repeat password"
                    value={suConfirm} onChange={e => setSuConfirm(e.target.value)}
                    className={inputCls} />
                </div>

                <button type="submit" disabled={suLoading} className={primaryBtn("emerald")}>
                  {suLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                      </svg>
                      Creating account…
                    </span>
                  ) : "Create Account & Continue"}
                </button>

                <p className="text-xs text-center text-slate-500 dark:text-slate-500">
                  Your account will be used to manage your school on LaunchPard.
                  Next, you'll set up your school profile.
                </p>
              </form>
            )

          /* ─────────────────── SIGN-IN TAB ─────────────────── */
          ) : showReset ? (
            resetSent ? (
              <div className="text-center py-4">
                <div className="text-4xl mb-3">📧</div>
                <p className="text-emerald-600 dark:text-emerald-300 font-bold mb-2">Check your email</p>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-5">
                  We sent a reset link to <span className="font-bold text-slate-900 dark:text-white">{resetEmail}</span>.
                </p>
                <button onClick={() => { setShowReset(false); setResetSent(false); setResetEmail(""); }}
                  className="text-emerald-600 dark:text-emerald-400 text-sm font-bold hover:underline">
                  ← Back to sign in
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <h2 className="font-black text-lg text-slate-900 dark:text-white">Reset Password</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Enter your staff email and we'll send a reset link.
                </p>
                {error && <ErrorBanner msg={error} />}
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Email</label>
                  <input type="email" required placeholder="you@school.com" value={resetEmail}
                    onChange={e => setResetEmail(e.target.value)}
                    className={inputCls} />
                </div>
                <button type="submit" disabled={loading} className={primaryBtn("emerald")}>
                  {loading ? "Sending…" : "Send Reset Link"}
                </button>
                <button type="button" onClick={() => { setShowReset(false); setError(null); }}
                  className="w-full text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                  ← Back
                </button>
              </form>
            )
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              {error && <ErrorBanner msg={error} />}

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Email</label>
                <input type="email" required autoComplete="email" placeholder="you@school.com"
                  value={email} onChange={e => setEmail(e.target.value)}
                  className={inputCls} />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Password</label>
                <div className="relative">
                  <input type={showPwd ? "text" : "password"} required autoComplete="current-password"
                    placeholder="Your password" value={password}
                    onChange={e => setPassword(e.target.value)}
                    className={`${inputCls} pr-12`} />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1"
                    aria-label={showPwd ? "Hide password" : "Show password"}>
                    {showPwd
                      ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    }
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <button type="button" onClick={() => { setShowReset(true); setResetEmail(email); setError(null); }}
                  className="text-sm font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300">
                  Forgot password?
                </button>
              </div>

              <button type="submit" disabled={loading} className={primaryBtn("emerald")}>
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                    </svg>
                    Signing in…
                  </span>
                ) : "Sign In"}
              </button>
            </form>
          )}
        </div>

        {/* Footer links */}
        <div className="mt-5 text-center space-y-2">
          <p className="text-sm text-slate-500 dark:text-slate-500">
            Not a school staff member?{" "}
            <Link href="/login" className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline">
              Guardian / Scholar login
            </Link>
          </p>
          <div>
            <Link href="/" className="text-xs text-slate-400 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-500">
              ← Back to home
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}

// ── Shared style helpers ────────────────────────────────────────────────────
const inputCls = [
  "w-full px-4 py-3 rounded-xl text-base",
  "bg-slate-50 dark:bg-white/5",
  "border border-slate-300 dark:border-white/10",
  "focus:border-emerald-500 dark:focus:border-emerald-500/50",
  "focus:ring-2 focus:ring-emerald-500/20",
  "text-slate-900 dark:text-white",
  "placeholder:text-slate-500 dark:placeholder:text-slate-500",
  "outline-none transition-colors",
].join(" ");

const primaryBtn = (colour) => [
  "w-full font-bold py-3.5 rounded-xl text-base transition-all disabled:opacity-50 text-white",
  colour === "emerald"
    ? "bg-emerald-500 hover:bg-emerald-600 shadow-md shadow-emerald-500/20"
    : "bg-indigo-500 hover:bg-indigo-600 shadow-md shadow-indigo-500/20",
].join(" ");

function ErrorBanner({ msg }) {
  return (
    <div className="p-3 bg-rose-100 dark:bg-rose-500/10 border border-rose-300 dark:border-rose-500/30 rounded-xl text-rose-700 dark:text-rose-300 text-sm font-bold">
      {msg}
    </div>
  );
}
