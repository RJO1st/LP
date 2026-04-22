"use client";
/**
 * Reset Password Page
 * Deploy to: src/app/reset-password/page.jsx
 *
 * Flow:
 * 1. User clicks reset link in email → Supabase redirects here with access_token in URL hash
 * 2. Supabase client auto-exchanges the token for a session
 * 3. User enters new password
 * 4. We call supabase.auth.updateUser({ password }) to set it
 * 5. Redirect to login
 */

import React, { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { supabaseKeys } from "@/lib/env";
import { passwordError } from "../../lib/passwordValidation";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const supabase = createBrowserClient(
    supabaseKeys.url(),
    supabaseKeys.publishable()
  );

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [checking, setChecking] = useState(true);

  // ── Wait for Supabase to exchange the token (supports both PKCE and implicit flow) ─────
  useEffect(() => {
    let cancelled = false;

    const checkSession = async () => {
      // 1. Handle PKCE flow: if ?code= is in the URL, exchange it for a session
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");

      if (code) {
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (!cancelled && data?.session) {
          setSessionReady(true);
          setChecking(false);
          // Clean the URL so code isn't reused
          window.history.replaceState({}, "", "/reset-password");
          return;
        }
        if (exchangeError) {
          console.error("PKCE exchange error:", exchangeError.message);
        }
      }

      // 2. Check if session already exists (implicit flow / hash token auto-exchange)
      const { data: { session } } = await supabase.auth.getSession();
      if (!cancelled && session) {
        setSessionReady(true);
        setChecking(false);
        return;
      }

      // 3. Listen for auth state change — token exchange may be async
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (cancelled) return;
        if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
          setSessionReady(true);
          setChecking(false);
        }
      });

      // 4. Retry after 8 seconds (generous timeout for slow networks)
      setTimeout(async () => {
        if (cancelled) return;
        const { data: { session: retrySession } } = await supabase.auth.getSession();
        if (retrySession) {
          setSessionReady(true);
        }
        setChecking(false);
      }, 8000);

      return () => subscription?.unsubscribe();
    };

    checkSession();
    return () => { cancelled = true; };
  }, [supabase]);

  // ── Handle password update ────────────────────────────────────────
  const handleReset = async (e) => {
    e.preventDefault();
    setError(null);

    const pwErr = passwordError(password);
    if (pwErr) {
      setError(pwErr);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) throw updateError;

      setSuccess(true);

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push("/login?type=parent");
      }, 3000);
    } catch (err) {
      setError(err.message || "Failed to reset password. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-700">

        {/* Logo */}
        <div className="flex flex-col items-center mb-5">
          <img src="/logo.svg" alt="LaunchPard" className="w-14 h-14 mb-2 drop-shadow-[0_0_15px_rgba(79,172,254,0.4)]" style={{ objectFit: "contain" }} />
        </div>

        {/* ── Success state ──────────────────────────────────────────── */}
        {success ? (
          <div className="text-center">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-2xl font-black mb-2">Password Updated</h2>
            <p className="text-slate-400 text-sm mb-4">
              Your password has been reset successfully. Redirecting you to login...
            </p>
            <Link href="/login?type=parent"
              className="text-indigo-400 hover:text-indigo-300 font-bold text-sm">
              Go to login →
            </Link>
          </div>
        ) : !sessionReady && !checking ? (
          /* ── No valid token / expired link ─────────────────────────── */
          <div className="text-center">
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-black mb-2">Link Expired</h2>
            <p className="text-slate-400 text-sm mb-4">
              This password reset link has expired or is invalid. Please request a new one.
            </p>
            <Link href="/login?type=parent"
              className="inline-block bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 py-3 px-6 rounded-xl font-bold text-sm transition-all">
              Back to Login
            </Link>
          </div>
        ) : !sessionReady && checking ? (
          /* ── Loading / checking token ──────────────────────────────── */
          <div className="text-center py-8">
            <div className="text-4xl mb-4 animate-pulse">🔐</div>
            <p className="text-slate-400 text-sm font-bold">Verifying reset link...</p>
          </div>
        ) : (
          /* ── New password form ─────────────────────────────────────── */
          <div>
            <h2 className="text-2xl font-black mb-1 text-center">Set New Password</h2>
            <p className="text-slate-400 text-sm mb-5 text-center">
              Choose a strong password for your account.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-rose-500/20 border border-rose-500 rounded-xl text-rose-200 text-sm font-bold">
                {error}
              </div>
            )}

            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-1.5">New Password</label>
                <input type="password" required placeholder="Minimum 6 characters" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-700 text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500 border border-slate-600 text-base" />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-300 mb-1.5">Confirm New Password</label>
                <input type="password" required placeholder="Type password again" value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-700 text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500 border border-slate-600 text-base" />
              </div>

              {/* Password strength hint */}
              <div className="flex items-center gap-2">
                {[6, 8, 10].map((threshold, i) => (
                  <div key={i} className="flex-1 h-1.5 rounded-full transition-all"
                    style={{
                      background: password.length >= threshold
                        ? i === 0 ? "#ef4444" : i === 1 ? "#f59e0b" : "#22c55e"
                        : "#334155"
                    }} />
                ))}
                <span className="text-xs text-slate-500 font-bold ml-1">
                  {password.length === 0 ? "" : password.length < 6 ? "Too short" : password.length < 8 ? "Okay" : password.length < 10 ? "Good" : "Strong"}
                </span>
              </div>

              <button type="submit" disabled={loading}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 py-3.5 rounded-xl font-bold text-base transition-all disabled:opacity-50">
                {loading ? "Updating..." : "Reset Password"}
              </button>
            </form>

            <div className="mt-4 text-center">
              <Link href="/login?type=parent" className="text-slate-500 text-sm hover:text-slate-400">
                ← Back to login
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}