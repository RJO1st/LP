"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { apiFetch } from "@/lib/apiFetch";
import DarkModeToggle from "@/components/theme/DarkModeToggle";
import { supabaseKeys } from "@/lib/env";

// ─── LOGO (uses correct brand SVG) ──────────────────────────────────────────
const LogoIcon = ({ className = "w-8 h-8" }) => (
  <img src="/logo.svg" alt="LaunchPard" className={className} />
);

// ═══════════════════════════════════════════════════════════════════════════
// LAUNCHPARD SUBSCRIBE PAGE - UNIFIED DARK SPACE THEME
// ═══════════════════════════════════════════════════════════════════════════

export default function SubscribePage() {
  const router = useRouter();
  const [billingCycle, setBillingCycle] = useState("annual");
  const [loading, setLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  // Region is fetched from the parents table — the authoritative source
  // (NOT from __geo cookie, which is client-overridable). Defaults to 'GB'
  // until the async fetch lands, which matches the current UK-only mock.
  const [region, setRegion] = useState('GB');

  // ─── Add-on state (Nigerian tier only) ────────────────────────────────────
  // Backend contract (src/app/api/paystack/checkout/route.js):
  //   addons: string[]  where valid entries are 'waec_boost' | 'ai_unlimited' | 'family_child'
  //   Duplicates of 'family_child' are the canonical way to encode multiple
  //   extra siblings — each duplicate adds ₦1,000/mo.
  // Cap extra siblings at 2 (base plan includes 1 scholar, so 3 total per CLAUDE.md).
  const [waecBoost, setWaecBoost] = useState(false);
  const [aiUnlimited, setAiUnlimited] = useState(false);
  const [extraScholarCount, setExtraScholarCount] = useState(0);

  // WAEC Boost already includes unlimited Tara AI, so the standalone
  // ai_unlimited add-on is redundant (and billed) when Boost is selected.
  // This derived flag is the single source of truth for charging.
  const aiUnlimitedEffective = aiUnlimited && !waecBoost;

  // Expand the three UI controls into the string[] contract the API expects.
  // Annual billing: we force-empty the add-on list because our Paystack
  // integration is one-time charges only (no recurring). The server enforces
  // the same rule (see /api/paystack/checkout §1b) so a UI bypass still fails
  // with a 400. Re-enable when Paystack Plans are wired.
  const selectedAddons = useMemo(() => {
    if (billingCycle === "annual") return [];
    return [
      ...(waecBoost ? ["waec_boost"] : []),
      ...(aiUnlimitedEffective ? ["ai_unlimited"] : []),
      ...Array(extraScholarCount).fill("family_child"),
    ];
  }, [billingCycle, waecBoost, aiUnlimitedEffective, extraScholarCount]);

  // Monthly addon NGN total — mirrors ADDON_AMOUNTS in the checkout route
  // (kobo / 100). Render time uses `toLocaleString` for the ₦ display.
  // Zeroed on annual to match the checkout guard above.
  const addonMonthlyNgn = useMemo(() => {
    if (billingCycle === "annual") return 0;
    let sum = 0;
    if (waecBoost) sum += 1000;
    if (aiUnlimitedEffective) sum += 500;
    sum += extraScholarCount * 1000;
    return sum;
  }, [billingCycle, waecBoost, aiUnlimitedEffective, extraScholarCount]);

  // Convenience flag for UI: annual + attempted-but-dropped add-ons.
  // Used to show the "switch to monthly" notice banner on the add-ons panel.
  const annualBlocksAddons = billingCycle === "annual";
  const hasAttemptedAddons =
    waecBoost || aiUnlimited || extraScholarCount > 0;

  const supabase = createBrowserClient(
    supabaseKeys.url(),
    supabaseKeys.publishable()
  );

  const pseudoRandom = (seed, salt = 0) => {
    const x = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };

  // Show a banner if Paystack redirected back with payment=failed
  const [paymentFailed, setPaymentFailed] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("payment") === "failed") setPaymentFailed(true);
    }
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login?redirectTo=/subscribe");
        return;
      }
      // Fetch the parent's authoritative region. We only show pricing tiers
      // for the parent's region — Nigerian parents never see UK tiers and
      // vice versa. This is the anti-arbitrage gate.
      const { data: parent } = await supabase
        .from('parents')
        .select('region')
        .eq('id', user.id)
        .single();
      if (parent?.region) setRegion(parent.region);
      setCheckingAuth(false);
    };
    checkAuth();
  }, [router, supabase]);

  /**
   * handleCheckout — calls the appropriate payment provider based on region.
   * NG  → Paystack (kobo-denominated, hosted page redirect)
   * GB  → Stripe   (pending UK entity setup — shows coming-soon message)
   *
   * addons comes from `selectedAddons` (memoised from the three UI controls).
   * Duplicates of 'family_child' encode multiple extra siblings — the checkout
   * route sums them via reduce, so two siblings = ['family_child','family_child'].
   */
  const handleCheckout = async () => {
    setLoading(true);
    setCheckoutError(null);

    if (region === "NG") {
      // ── Nigerian checkout via Paystack ──────────────────────────────────
      try {
        const res = await apiFetch("/api/paystack/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plan: "ng_scholar",
            billing: billingCycle,
            addons: selectedAddons,
          }),
        });

        const json = await res.json();

        if (!res.ok) {
          setCheckoutError(json.error || "Something went wrong. Please try again.");
          setLoading(false);
          return;
        }

        // Redirect to Paystack hosted payment page
        window.location.href = json.authorization_url;
        // loading stays true — user is leaving the page
      } catch (err) {
        console.error("[subscribe] Paystack checkout error:", err);
        setCheckoutError("Could not reach the payment provider. Check your connection and try again.");
        setLoading(false);
      }
    } else {
      // ── UK checkout via Stripe ────────────────────────────────────────────
      // Routes to /api/stripe/checkout which returns a Stripe-hosted checkout
      // URL. The route itself returns 503 if STRIPE_SECRET_KEY is not set
      // (UK entity not yet live), surfacing the "coming soon" message below.
      try {
        const res = await apiFetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plan:    "uk_pro",
            billing: billingCycle,
          }),
        });

        const json = await res.json();

        if (!res.ok) {
          setCheckoutError(json.error || "Something went wrong. Please try again.");
          setLoading(false);
          return;
        }

        // Redirect to Stripe hosted checkout — loading stays true as user leaves
        window.location.href = json.checkout_url;
      } catch (err) {
        console.error("[subscribe] Stripe checkout error:", err);
        setCheckoutError("Could not reach the payment provider. Check your connection and try again.");
        setLoading(false);
      }
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#080c15] flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#080c15] text-slate-900 dark:text-white font-sans overflow-hidden relative">
      {/* Dark Mode Toggle */}
      <div className="fixed top-6 right-6 z-50">
        <DarkModeToggle />
      </div>

      {/* Stars background — only visible in dark mode */}
      <div className="fixed inset-0 z-0 hidden dark:block">
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

      {/* Gradient orbs — only visible in dark mode */}
      <div className="fixed top-0 left-1/4 w-[600px] h-[600px] bg-indigo-500/15 rounded-full blur-3xl animate-float hidden dark:block" />
      <div className="fixed bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/15 rounded-full blur-3xl animate-float-delayed hidden dark:block" />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-8 sm:py-16">

        {/* Payment failure banner — shown when Paystack redirects back with ?payment=failed */}
        {paymentFailed && (
          <div className="max-w-2xl mx-auto mb-6 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-500/40 rounded-2xl p-4 flex items-start gap-3">
            <span className="text-red-500 text-xl flex-shrink-0">✕</span>
            <div>
              <p className="font-bold text-red-700 dark:text-red-300 text-sm">Payment was not completed</p>
              <p className="text-red-600 dark:text-red-400 text-xs mt-0.5">Your card was not charged. Please try again or use a different payment method.</p>
            </div>
          </div>
        )}

        {/* Checkout API error banner */}
        {checkoutError && (
          <div className="max-w-2xl mx-auto mb-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-500/40 rounded-2xl p-4 flex items-start gap-3">
            <span className="text-amber-500 text-xl flex-shrink-0">⚠</span>
            <div>
              <p className="font-bold text-amber-700 dark:text-amber-300 text-sm">Could not start checkout</p>
              <p className="text-amber-600 dark:text-amber-400 text-xs mt-0.5">{checkoutError}</p>
            </div>
            <button
              onClick={() => setCheckoutError(null)}
              className="ml-auto text-amber-500 hover:text-amber-700 dark:hover:text-amber-300 text-lg leading-none"
            >×</button>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-8 sm:mb-16 animate-fade-in-up">
          <div className="inline-block mb-4 sm:mb-6">
            <div className="relative">
              <div className="flex items-center justify-center gap-2 sm:gap-3 text-3xl sm:text-6xl lg:text-7xl font-black bg-gradient-to-r from-indigo-600 dark:from-indigo-400 to-indigo-700 dark:to-indigo-500 bg-clip-text text-transparent animate-shimmer">
                <LogoIcon className="w-10 h-10 sm:w-16 sm:h-16 lg:w-20 lg:h-20 flex-shrink-0" />
                LaunchPard
              </div>
              <div className="absolute -inset-2 bg-gradient-to-r from-indigo-500 to-indigo-600 opacity-20 blur-2xl -z-10" />
            </div>
          </div>
          <h1 className="text-2xl sm:text-4xl lg:text-6xl font-black mb-4 sm:mb-6 leading-tight text-slate-900 dark:text-white">
            See the Difference
            <br />
            <span className="text-transparent bg-gradient-to-r from-indigo-600 dark:from-indigo-400 to-indigo-700 dark:to-indigo-500 bg-clip-text">
              in a Week
            </span>
          </h1>
          <p className="text-base sm:text-xl lg:text-2xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto font-medium mb-6 sm:mb-8 px-2">
            AI that adapts to your child's age, curriculum, and level.
          </p>
          <div className="flex flex-wrap justify-center gap-3 sm:gap-6 text-xs sm:text-sm text-slate-700 dark:text-slate-400">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-yellow-400">⭐⭐⭐⭐⭐</span>
              <span>4.9/5 rating</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-green-500 dark:text-green-400">✓</span>
              <span>Thousands of families</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-blue-500 dark:text-blue-400">🚀</span>
              <span>15,000+ questions</span>
            </div>
          </div>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-8 sm:mb-12 animate-fade-in-up animation-delay-200">
          <div className="bg-white dark:bg-slate-800/40 backdrop-blur-xl rounded-full p-1 sm:p-1.5 border border-slate-200 dark:border-white/10">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-5 sm:px-8 py-2.5 sm:py-3 rounded-full text-sm font-bold transition-all ${
                billingCycle === "monthly"
                  ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/50"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/10"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("annual")}
              className={`px-5 sm:px-8 py-2.5 sm:py-3 rounded-full text-sm font-bold transition-all relative ${
                billingCycle === "annual"
                  ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/50"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/10"
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
        <div className="max-w-2xl mx-auto mb-10 sm:mb-16 animate-fade-in-up animation-delay-400">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 to-indigo-600 rounded-3xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity" />
            <div className="relative bg-white dark:bg-slate-800/40 backdrop-blur-xl rounded-[20px] border border-slate-200 dark:border-white/10 shadow-lg dark:shadow-none overflow-hidden">
              <div className="absolute top-0 right-0 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-black px-6 py-2 rounded-bl-2xl">
                🔥 MOST POPULAR
              </div>
              <div className="p-5 sm:p-8 md:p-12">
                <div className="flex items-center gap-3 mb-4 sm:mb-6">
                  <LogoIcon className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0" />
                  <div>
                    <h3 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white">
                      {region === 'NG' ? 'LaunchPard Scholar' : 'LaunchPard Pro'}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">
                      {region === 'NG' ? 'Everything a WAEC scholar needs — one plan' : 'Everything included'}
                    </p>
                  </div>
                </div>
                <div className="mb-6 sm:mb-8">
                  {region === 'NG' ? (
                    billingCycle === "monthly" ? (
                      <>
                        <div className="flex items-baseline gap-2 mb-2">
                          <span className="text-4xl sm:text-6xl font-black text-slate-900 dark:text-white">
                            ₦2,500
                          </span>
                          <span className="text-lg sm:text-2xl text-slate-600 dark:text-slate-400 font-medium">/month</span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400">Billed monthly • Cancel anytime</p>
                      </>
                    ) : (
                      <>
                        <div className="flex items-baseline gap-2 mb-2">
                          <span className="text-4xl sm:text-6xl font-black text-slate-900 dark:text-white">
                            ₦25,000
                          </span>
                          <span className="text-lg sm:text-2xl text-slate-600 dark:text-slate-400 font-medium">/year</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-600 dark:text-slate-400">₦2,083/month</span>
                          <span className="bg-green-500/20 text-green-600 dark:text-green-400 text-xs font-bold px-2 py-1 rounded-full">
                            Save ₦5,000 (17%)
                          </span>
                        </div>
                      </>
                    )
                  ) : (
                    billingCycle === "monthly" ? (
                      <>
                        <div className="flex items-baseline gap-2 mb-2">
                          <span className="text-4xl sm:text-6xl font-black text-slate-900 dark:text-white">
                            £12.99
                          </span>
                          <span className="text-lg sm:text-2xl text-slate-600 dark:text-slate-400 font-medium">/month</span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400">Billed monthly • Cancel anytime</p>
                      </>
                    ) : (
                      <>
                        <div className="flex items-baseline gap-2 mb-2">
                          <span className="text-4xl sm:text-6xl font-black text-slate-900 dark:text-white">
                            £120
                          </span>
                          <span className="text-lg sm:text-2xl text-slate-600 dark:text-slate-400 font-medium">/year</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-600 dark:text-slate-400">£10/month</span>
                          <span className="bg-green-500/20 text-green-600 dark:text-green-400 text-xs font-bold px-2 py-1 rounded-full">
                            Save £35.88
                          </span>
                        </div>
                      </>
                    )
                  )}
                </div>
                <button
                  onClick={handleCheckout}
                  disabled={loading}
                  className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-black text-lg py-5 rounded-2xl shadow-2xl shadow-indigo-500/40 transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group mb-4"
                >
                  <span className="relative z-10">
                    {loading ? "Processing..." : region === 'NG' ? "🚀 Start Free Trial" : "🚀 Start 30-Day Pro Trial"}
                  </span>
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform" />
                </button>
                <p className="text-center text-xs text-slate-600 dark:text-slate-400 mb-4">
                  No credit card required • Cancel anytime{region === 'NG' ? ' • 7-day free trial' : ' • 30-day free trial'}
                </p>

                {/* Nigerian add-ons panel — interactive selection */}
                {region === 'NG' && (() => {
                  const baseMonthlyNgn = billingCycle === 'monthly' ? 2500 : 2083;
                  const baseLabel = billingCycle === 'monthly' ? '₦2,500/mo' : '₦25,000/yr (₦2,083/mo)';
                  const monthlyTotal = baseMonthlyNgn + addonMonthlyNgn;
                  const disabledCls = annualBlocksAddons ? 'opacity-50 pointer-events-none' : '';
                  return (
                    <div className="mb-6 border border-emerald-500/30 dark:border-emerald-400/30 rounded-2xl p-5 bg-emerald-50/50 dark:bg-emerald-900/10">
                      <p className="text-xs font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400 mb-4">Optional Add-ons — buy only what you need</p>

                      {/* Annual billing blocks add-ons notice */}
                      {annualBlocksAddons && (
                        <div className="mb-4 p-3 rounded-xl border border-amber-400/50 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-500/30">
                          <p className="text-xs font-bold text-amber-800 dark:text-amber-300 mb-1.5">
                            Add-ons are available on monthly billing
                          </p>
                          <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-snug mb-2">
                            {hasAttemptedAddons
                              ? 'Your add-on selections are paused. Switch to monthly billing to customise your plan, or continue with the annual Scholar plan on its own.'
                              : 'Switch to monthly billing to add extra scholars, WAEC Boost, or Unlimited AI.'}
                          </p>
                          <button
                            type="button"
                            onClick={() => setBillingCycle('monthly')}
                            className="text-[11px] font-bold text-amber-900 dark:text-amber-200 underline hover:no-underline"
                          >
                            Switch to monthly billing →
                          </button>
                        </div>
                      )}

                      <div className={`space-y-3 ${disabledCls}`} aria-disabled={annualBlocksAddons}>
                        {/* Extra Scholar — stepper 0–2 */}
                        <div className="flex items-start justify-between gap-3 bg-white dark:bg-slate-800/40 rounded-xl p-3 border border-slate-200 dark:border-white/10">
                          <div className="flex items-start gap-2.5 flex-1 min-w-0">
                            <span className="text-xl flex-shrink-0 mt-0.5">👨‍👩‍👧</span>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-900 dark:text-white">Extra Scholar</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">₦1,000/mo per sibling. Full Scholar access for each child.</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => setExtraScholarCount(c => Math.max(0, c - 1))}
                              disabled={extraScholarCount === 0}
                              aria-label="Remove one sibling"
                              className="w-7 h-7 rounded-lg border border-slate-300 dark:border-white/20 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm hover:bg-emerald-50 dark:hover:bg-emerald-900/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >−</button>
                            <span className="w-6 text-center text-sm font-black text-slate-900 dark:text-white">{extraScholarCount}</span>
                            <button
                              type="button"
                              onClick={() => setExtraScholarCount(c => Math.min(2, c + 1))}
                              disabled={extraScholarCount === 2}
                              aria-label="Add one sibling"
                              className="w-7 h-7 rounded-lg border border-slate-300 dark:border-white/20 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm hover:bg-emerald-50 dark:hover:bg-emerald-900/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >+</button>
                          </div>
                        </div>

                        {/* WAEC Intensive Boost — checkbox */}
                        <label className={`flex items-start justify-between gap-3 rounded-xl p-3 border cursor-pointer transition-colors ${waecBoost ? 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-400 dark:border-emerald-500/50' : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-white/10 hover:border-emerald-300 dark:hover:border-emerald-500/40'}`}>
                          <div className="flex items-start gap-2.5 flex-1 min-w-0">
                            <span className="text-xl flex-shrink-0 mt-0.5">🎯</span>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-900 dark:text-white">WAEC Intensive Boost</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">Unlimited Tara AI · full mock exams · A1–F9 grade predictions</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap">₦1,000/mo</span>
                            <input
                              type="checkbox"
                              checked={waecBoost}
                              onChange={(e) => setWaecBoost(e.target.checked)}
                              className="w-4 h-4 accent-emerald-500 cursor-pointer"
                            />
                          </div>
                        </label>

                        {/* Unlimited AI Feedback — checkbox, hidden if WAEC Boost already included */}
                        <label className={`flex items-start justify-between gap-3 rounded-xl p-3 border transition-colors ${waecBoost ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800/20 border-slate-200 dark:border-white/5' : aiUnlimited ? 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-400 dark:border-emerald-500/50 cursor-pointer' : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-white/10 hover:border-emerald-300 dark:hover:border-emerald-500/40 cursor-pointer'}`}>
                          <div className="flex items-start gap-2.5 flex-1 min-w-0">
                            <span className="text-xl flex-shrink-0 mt-0.5">🤖</span>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-900 dark:text-white">Unlimited AI Feedback</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">
                                {waecBoost ? 'Already included in WAEC Boost' : 'Remove the 50/month Tara cap'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap">₦500/mo</span>
                            <input
                              type="checkbox"
                              checked={aiUnlimited && !waecBoost}
                              onChange={(e) => setAiUnlimited(e.target.checked)}
                              disabled={waecBoost}
                              className="w-4 h-4 accent-emerald-500 cursor-pointer disabled:cursor-not-allowed"
                            />
                          </div>
                        </label>
                      </div>

                      {/* Running total */}
                      <div className="mt-4 pt-4 border-t border-emerald-300/50 dark:border-emerald-400/20 space-y-1.5">
                        <div className="flex justify-between items-center text-xs text-slate-600 dark:text-slate-400">
                          <span>Scholar base</span>
                          <span>{baseLabel}</span>
                        </div>
                        {addonMonthlyNgn > 0 && (
                          <div className="flex justify-between items-center text-xs text-slate-600 dark:text-slate-400">
                            <span>Add-ons</span>
                            <span>₦{addonMonthlyNgn.toLocaleString()}/mo</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center pt-1.5 border-t border-emerald-300/30 dark:border-emerald-400/10">
                          <span className="text-sm font-black text-slate-900 dark:text-white">
                            {billingCycle === 'monthly' ? 'Monthly total' : 'Effective monthly'}
                          </span>
                          <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                            ₦{monthlyTotal.toLocaleString()}/mo
                          </span>
                        </div>
                        {billingCycle === 'annual' && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-500 leading-snug pt-1">
                            Annual plan is billed ₦25,000 upfront. Add-ons are only available on monthly billing.
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })()}
                <div className="flex justify-center gap-4 mb-8">
                  <button
                    onClick={() => router.push("/dashboard/parent")}
                    className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-semibold transition-colors underline"
                  >
                    ← Back to dashboard
                  </button>
                  <span className="text-slate-400 dark:text-slate-600">|</span>
                  <button
                    onClick={() => router.push("/")}
                    className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-semibold transition-colors underline"
                  >
                    Homepage
                  </button>
                </div>
                <div className="space-y-4">
                  {[
                    { icon: "✨", text: "Unlimited questions & mock tests" },
                    { icon: "🌍", text: "All 6 curricula (UK, US, AU, IB, WAEC, NG)" },
                    { icon: "🤖", text: "AI tutor that adapts to each child's level" },
                    { icon: "👨‍👩‍👧", text: "Up to 3 children included" },
                    { icon: "🎮", text: "Full gamification (badges, streaks, quests)" },
                    { icon: "📊", text: "Advanced guardian dashboard & reports" },
                  ].map((feature, i) => (
                    <div key={i} className="flex items-center gap-3 group/item">
                      <div className="text-2xl bg-slate-200/10 dark:bg-white/5 rounded-xl p-2 flex items-center justify-center w-8 h-8">
                        {feature.icon}
                      </div>
                      <span className="text-slate-700 dark:text-slate-200 group-hover/item:text-slate-900 dark:group-hover/item:text-white transition-colors">
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
        <div className="max-w-5xl mx-auto mb-10 sm:mb-16 animate-fade-in-up animation-delay-600">
          <h2 className="text-2xl sm:text-3xl font-black text-center mb-6 sm:mb-8 text-slate-900 dark:text-white">Why LaunchPard?</h2>
          <div className="bg-white dark:bg-slate-800/30 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-white/10 overflow-hidden">
            <div className="overflow-x-auto -mx-px">
              <table className="w-full min-w-[540px]">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/30">
                    <th className="text-left p-3 sm:p-6 text-slate-600 dark:text-slate-400 font-medium text-xs sm:text-sm">Feature</th>
                    <th className="p-3 sm:p-6 text-center">
                      <div className="inline-block bg-gradient-to-r from-indigo-500 to-indigo-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-black text-xs sm:text-sm">
                        LaunchPard
                      </div>
                    </th>
                    <th className="p-3 sm:p-6 text-center text-slate-600 dark:text-slate-400 font-medium text-xs sm:text-sm">Typical 11+ app</th>
                    <th className="p-3 sm:p-6 text-center text-slate-600 dark:text-slate-400 font-medium text-xs sm:text-sm">Gamified maths app</th>
                    <th className="p-3 sm:p-6 text-center text-slate-600 dark:text-slate-400 font-medium text-xs sm:text-sm">Private tutor</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Price", "£12.99/mo", "£29.99/mo", "$14.95/mo", "£60/hr"],
                    ["Multi-curriculum", "✅ 6 curricula", "❌ UK only", "❌ US only", "✓ Varies"],
                    ["AI tutor", "✅", "✅", "Partial", "❌"],
                    ["Unlimited tests", "✅", "✅ (Plus)", "❌", "❌"],
                    ["Multiple children", "✅ Up to 3", "❌", "❌", "❌"],
                    ["Gamification", "✅ Full", "❌", "✅", "❌"],
                  ].map((row, i) => (
                    <tr key={i} className="border-b border-slate-200 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                      <td className="p-3 sm:p-6 font-medium text-slate-700 dark:text-slate-200 text-xs sm:text-sm">{row[0]}</td>
                      <td className="p-3 sm:p-6 text-center font-bold text-green-600 dark:text-green-400 text-xs sm:text-sm">{row[1]}</td>
                      <td className="p-3 sm:p-6 text-center text-slate-600 dark:text-slate-400 text-xs sm:text-sm">{row[2]}</td>
                      <td className="p-3 sm:p-6 text-center text-slate-600 dark:text-slate-400 text-xs sm:text-sm">{row[3]}</td>
                      <td className="p-3 sm:p-6 text-center text-slate-600 dark:text-slate-400 text-xs sm:text-sm">{row[4]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto animate-fade-in-up animation-delay-800">
          <h2 className="text-2xl sm:text-3xl font-black text-center mb-8 sm:mb-12 text-slate-900 dark:text-white">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {[
              {
                q: "What curricula do you support?",
                a: "We support 6 global curricula: UK 11+ & National Curriculum, US Common Core, Australian ACARA, IB PYP/MYP, Nigerian WAEC, and Nigerian NERDC. Your child can switch between curricula anytime."
              },
              {
                q: "Can I use it for multiple children?",
                a: "Yes. LaunchPard Pro includes up to 3 children at no extra cost. Each child gets their own profile, curriculum, and progress tracking."
              },
              {
                q: "How does the 30-day free trial work?",
                a: "Start your trial without entering payment details. You'll get full access to all features for 30 days. If you love it, subscribe when you're ready. No automatic charges during trial."
              },
              {
                q: "Can I cancel anytime?",
                a: "Yes. Cancel anytime from your account settings. No questions asked, no cancellation fees."
              },
              {
                q: "How is this different from a tutor?",
                a: "Private tutors cost £60+/hour for 1-2 sessions per week. LaunchPard gives unlimited practice, instant feedback, and adaptive difficulty for £12.99/month. Your child can practise at 10pm on a Sunday if they want to."
              }
            ].map((faq, i) => (
              <details key={i} className="group bg-white dark:bg-slate-800/30 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none overflow-hidden">
                <summary className="p-4 sm:p-6 cursor-pointer list-none font-bold text-sm sm:text-lg text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex justify-between items-center gap-2">
                  {faq.q}
                  <span className="text-slate-600 dark:text-slate-400 group-open:rotate-180 transition-transform shrink-0">▼</span>
                </summary>
                <div className="px-4 sm:px-6 pb-4 sm:pb-6 text-slate-700 dark:text-slate-300 leading-relaxed text-sm sm:text-base">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>

        {/* Final CTA */}
        <div className="text-center mt-10 sm:mt-16 animate-fade-in-up animation-delay-1000">
          <button
            onClick={handleCheckout}
            disabled={loading}
            className="bg-indigo-500 hover:bg-indigo-600 text-white font-black text-base sm:text-xl px-8 sm:px-12 py-4 sm:py-6 rounded-2xl shadow-2xl shadow-indigo-500/40 transform hover:scale-105 transition-all disabled:opacity-50"
          >
            🚀 Start Your Child's Pro Trial
          </button>
          <p className="mt-4 text-slate-600 dark:text-slate-400">30-day trial. No card needed. Cancel anytime.</p>
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