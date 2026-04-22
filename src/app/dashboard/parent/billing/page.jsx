"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { supabaseKeys } from "@/lib/env";
import DarkModeToggle from "@/components/theme/DarkModeToggle";

// ═══════════════════════════════════════════════════════════════════
// ICONS
// ═══════════════════════════════════════════════════════════════════
const Icon = ({ d, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
);

const BackIcon = ({ size = 18 }) => <Icon size={size} d={["M19 12H5","M12 19l-7-7 7-7"]} />;
const CheckIcon = ({ size = 16 }) => <Icon size={size} d="M20 6 9 17l-5-5" />;
const XIcon = ({ size = 16 }) => <Icon size={size} d="M18 6 6 18M6 6l12 12" />;

// ═══════════════════════════════════════════════════════════════════
// STATUS BADGE
// ═══════════════════════════════════════════════════════════════════
const StatusBadge = ({ status }) => {
  const styles = {
    trial: "bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30",
    active: "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30",
    canceled: "bg-slate-100 dark:bg-slate-700/40 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10",
    expired: "bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/30",
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-black border-2 ${styles[status] || styles.trial}`}>
      {status === 'active' && <CheckIcon size={14} />}
      {status === 'canceled' && <XIcon size={14} />}
      {status.toUpperCase()}
    </span>
  );
};

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════
export default function BillingPage() {
  const router = useRouter();
  const supabase = createBrowserClient(
    supabaseKeys.url(),
    supabaseKeys.publishable()
  );

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [parent, setParent] = useState(null);
  const [billingHistory, setBillingHistory] = useState([]);
  const [canceling, setCanceling] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        router.push("/");
        return;
      }

      setUser(user);

      // Get parent data
      const { data: parentData } = await supabase
        .from('parents')
        .select('*')
        .eq('id', user.id)
        .single();

      if (parentData) {
        setParent(parentData);
      }

      // Get billing history
      const { data: historyData } = await supabase
        .from('billing_history')
        .select('*')
        .eq('parent_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (historyData) {
        setBillingHistory(historyData);
      }

      setLoading(false);
    };

    init();
  }, [router, supabase]);

  const handleSubscribe = () => {
    router.push('/subscribe');
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will still have access until the end of your billing period.')) {
      return;
    }

    setCanceling(true);

    try {
      const { error } = await supabase
        .from('parents')
        .update({ 
          subscription_status: 'canceled',
          subscription_end_date: parent?.subscription_end_date // Keep the end date
        })
        .eq('id', user.id);

      if (error) throw error;

      // Refresh parent data
      const { data: freshData } = await supabase
        .from('parents')
        .select('*')
        .eq('id', user.id)
        .single();

      if (freshData) {
        setParent(freshData);
      }

      alert('Subscription canceled. You will have access until the end of your current billing period.');
    } catch (err) {
      console.error('Cancel error:', err);
      alert('Failed to cancel subscription. Please contact support.');
    } finally {
      setCanceling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#080c15] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400 font-bold">Loading billing...</p>
        </div>
      </div>
    );
  }

  // Calculate trial days remaining
  let trialDaysLeft = null;
  if (parent?.subscription_status === 'trial' && parent?.trial_end) {
    const now = new Date();
    const end = new Date(parent.trial_end);
    const diff = end.getTime() - now.getTime();
    trialDaysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  // Calculate next billing date
  let nextBillingDate = null;
  if (parent?.subscription_status === 'active' && parent?.subscription_end_date) {
    nextBillingDate = new Date(parent.subscription_end_date);
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#080c15] pb-24">

      {/* ═══════════════════════════════════════════════════════ */}
      {/* NAVIGATION */}
      {/* ═══════════════════════════════════════════════════════ */}
      <nav className="bg-white dark:bg-slate-800/60 border-b-4 border-slate-200 dark:border-white/10 px-3 sm:px-6 py-3 sm:py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm dark:shadow-black/20">
        <Link href="/">
          <div className="flex items-center gap-2 sm:gap-3 font-black text-lg sm:text-xl">
            <img src="/logo.svg" alt="LaunchPard" className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl" />
            <span className="hidden sm:inline text-slate-900 dark:text-white">Billing</span>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <DarkModeToggle />
          <Link
            href="/dashboard/parent"
            className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-bold hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors px-4 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/40"
          >
            <BackIcon /> <span className="hidden sm:inline">Back to Dashboard</span>
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-3 sm:px-6 pt-6 sm:pt-12">

        {/* ═══════════════════════════════════════════════════════ */}
        {/* CURRENT SUBSCRIPTION */}
        {/* ═══════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-slate-800/60 border-2 sm:border-4 border-slate-100 dark:border-white/10 border-b-4 sm:border-b-8 rounded-2xl sm:rounded-[32px] p-4 sm:p-8 mb-4 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-black mb-4 sm:mb-6 text-slate-900 dark:text-white">Current Subscription</h2>

          <div className="space-y-4">
            {/* Status */}
            <div className="flex justify-between items-center py-3 border-b-2 border-slate-100 dark:border-white/10">
              <span className="font-bold text-slate-600 dark:text-slate-300">Status</span>
              <StatusBadge status={parent?.subscription_status || 'trial'} />
            </div>

            {/* Plan */}
            <div className="flex justify-between items-center py-3 border-b-2 border-slate-100 dark:border-white/10">
              <span className="font-bold text-slate-600 dark:text-slate-300">Plan</span>
              <span className="font-black text-slate-800 dark:text-white">LaunchPard Pro</span>
            </div>

            {/* Price */}
            <div className="flex justify-between items-center py-3 border-b-2 border-slate-100 dark:border-white/10">
              <span className="font-bold text-slate-600 dark:text-slate-300">Price</span>
              <span className="font-black text-slate-800 dark:text-white">
                {parent?.billing_cycle === 'annual' ? '£120/year' : '£12.99/month'}
              </span>
            </div>

            {/* Trial End / Next Billing */}
            {parent?.subscription_status === 'trial' && trialDaysLeft !== null && (
              <div className="flex justify-between items-center py-3 border-b-2 border-slate-100 dark:border-white/10">
                <span className="font-bold text-slate-600 dark:text-slate-300">Trial Ends</span>
                <div className="text-right">
                  <span className="font-black text-slate-800 dark:text-white">
                    {new Date(parent.trial_end).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                    {trialDaysLeft} {trialDaysLeft === 1 ? 'day' : 'days'} remaining
                  </p>
                </div>
              </div>
            )}

            {parent?.subscription_status === 'active' && nextBillingDate && (
              <div className="flex justify-between items-center py-3 border-b-2 border-slate-100 dark:border-white/10">
                <span className="font-bold text-slate-600 dark:text-slate-300">Next Billing Date</span>
                <span className="font-black text-slate-800 dark:text-white">
                  {nextBillingDate.toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </span>
              </div>
            )}

            {/* Children Included */}
            <div className="flex justify-between items-center py-3">
              <span className="font-bold text-slate-600 dark:text-slate-300">Children Included</span>
              <span className="font-black text-slate-800 dark:text-white">Up to {parent?.max_children || 3}</span>
            </div>
          </div>

          {/* Action Buttons */}
          {parent?.subscription_status === 'trial' && (
            <button
              onClick={handleSubscribe}
              className="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white font-black py-4 rounded-2xl border-b-4 border-indigo-800 dark:border-indigo-900 transition-all active:translate-y-1 active:border-b-0"
            >
              Subscribe Now
            </button>
          )}

          {parent?.subscription_status === 'active' && parent?.billing_cycle === 'monthly' && (
            <div className="mt-6">
              <Link
                href="/subscribe?upgrade=annual"
                className="block w-full text-center bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold py-3 rounded-2xl border-2 border-amber-200 dark:border-amber-500/30 transition-colors"
              >
                💰 Upgrade to Annual (Save £36/year)
              </Link>
            </div>
          )}

          {parent?.subscription_status === 'active' && (
            <button
              onClick={handleCancelSubscription}
              disabled={canceling}
              className="mt-3 w-full bg-slate-100 dark:bg-slate-700/40 hover:bg-slate-200 dark:hover:bg-slate-700/60 text-slate-600 dark:text-slate-300 font-bold py-3 rounded-2xl transition-colors disabled:opacity-50"
            >
              {canceling ? 'Canceling...' : 'Cancel Subscription'}
            </button>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* BILLING HISTORY */}
        {/* ═══════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-slate-800/60 border-2 sm:border-4 border-slate-100 dark:border-white/10 border-b-4 sm:border-b-8 rounded-2xl sm:rounded-[32px] p-4 sm:p-8">
          <h2 className="text-2xl sm:text-3xl font-black mb-4 sm:mb-6 text-slate-900 dark:text-white">Billing History</h2>

          {billingHistory.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-400 dark:text-slate-500 font-bold text-lg">No billing history yet</p>
              <p className="text-slate-300 dark:text-slate-600 text-sm mt-2">Your payment history will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {billingHistory.map((record) => (
                <div
                  key={record.id}
                  className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-700/40 rounded-2xl border-2 border-slate-100 dark:border-white/10"
                >
                  <div>
                    <p className="font-black text-slate-800 dark:text-white">
                      {record.description || 'Subscription Payment'}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-bold">
                      {new Date(record.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-lg text-slate-800 dark:text-white">
                      £{(record.amount / 100).toFixed(2)}
                    </p>
                    <p className={`text-xs font-bold ${
                      record.status === 'paid' ? 'text-emerald-600 dark:text-emerald-400' :
                      record.status === 'pending' ? 'text-amber-600 dark:text-amber-400' :
                      'text-rose-600 dark:text-rose-400'
                    }`}>
                      {record.status.toUpperCase()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* TEST MODE NOTICE */}
        {/* ═══════════════════════════════════════════════════════ */}
        <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-500/10 border-2 border-yellow-200 dark:border-yellow-500/30 rounded-2xl">
          <p className="text-sm text-yellow-800 dark:text-yellow-300 font-bold text-center flex items-center justify-center gap-2">
            <span>🧪</span>
            <span>Test Mode: Payment processing will be enabled soon</span>
          </p>
        </div>
      </main>
    </div>
  );
}