"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";

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
const RocketIcon = ({ size = 20 }) => <Icon size={size} d={["M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z","m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"]} />;
const CheckIcon = ({ size = 16 }) => <Icon size={size} d="M20 6 9 17l-5-5" />;
const XIcon = ({ size = 16 }) => <Icon size={size} d="M18 6 6 18M6 6l12 12" />;

// ═══════════════════════════════════════════════════════════════════
// STATUS BADGE
// ═══════════════════════════════════════════════════════════════════
const StatusBadge = ({ status }) => {
  const styles = {
    trial: "bg-blue-100 text-blue-700 border-blue-200",
    active: "bg-emerald-100 text-emerald-700 border-emerald-200",
    canceled: "bg-slate-100 text-slate-600 border-slate-200",
    expired: "bg-rose-100 text-rose-700 border-rose-200",
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
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-bold">Loading billing...</p>
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
    <div className="min-h-screen bg-slate-50 pb-24">
      
      {/* ═══════════════════════════════════════════════════════ */}
      {/* NAVIGATION */}
      {/* ═══════════════════════════════════════════════════════ */}
      <nav className="bg-white border-b-4 border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3 font-black text-xl">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md border-b-4 border-indigo-800">
            <RocketIcon size={20} />
          </div>
          <span className="hidden sm:inline text-slate-900">Billing</span>
        </div>
        <Link
          href="/dashboard/parent"
          className="flex items-center gap-2 text-slate-500 font-bold hover:text-indigo-600 transition-colors px-4 py-2 rounded-xl hover:bg-slate-50"
        >
          <BackIcon /> <span className="hidden sm:inline">Back to Dashboard</span>
        </Link>
      </nav>

      <main className="max-w-4xl mx-auto px-6 pt-12">

        {/* ═══════════════════════════════════════════════════════ */}
        {/* CURRENT SUBSCRIPTION */}
        {/* ═══════════════════════════════════════════════════════ */}
        <div className="bg-white border-4 border-slate-100 border-b-8 rounded-[32px] p-8 mb-8">
          <h2 className="text-3xl font-black mb-6">Current Subscription</h2>
          
          <div className="space-y-4">
            {/* Status */}
            <div className="flex justify-between items-center py-3 border-b-2 border-slate-100">
              <span className="font-bold text-slate-600">Status</span>
              <StatusBadge status={parent?.subscription_status || 'trial'} />
            </div>

            {/* Plan */}
            <div className="flex justify-between items-center py-3 border-b-2 border-slate-100">
              <span className="font-bold text-slate-600">Plan</span>
              <span className="font-black text-slate-800">LaunchPard Pro</span>
            </div>

            {/* Price */}
            <div className="flex justify-between items-center py-3 border-b-2 border-slate-100">
              <span className="font-bold text-slate-600">Price</span>
              <span className="font-black text-slate-800">
                {parent?.billing_cycle === 'annual' ? '£120/year' : '£12.99/month'}
              </span>
            </div>

            {/* Trial End / Next Billing */}
            {parent?.subscription_status === 'trial' && trialDaysLeft !== null && (
              <div className="flex justify-between items-center py-3 border-b-2 border-slate-100">
                <span className="font-bold text-slate-600">Trial Ends</span>
                <div className="text-right">
                  <span className="font-black text-slate-800">
                    {new Date(parent.trial_end).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </span>
                  <p className="text-xs text-slate-500 font-bold">
                    {trialDaysLeft} {trialDaysLeft === 1 ? 'day' : 'days'} remaining
                  </p>
                </div>
              </div>
            )}

            {parent?.subscription_status === 'active' && nextBillingDate && (
              <div className="flex justify-between items-center py-3 border-b-2 border-slate-100">
                <span className="font-bold text-slate-600">Next Billing Date</span>
                <span className="font-black text-slate-800">
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
              <span className="font-bold text-slate-600">Children Included</span>
              <span className="font-black text-slate-800">Up to {parent?.max_children || 3}</span>
            </div>
          </div>

          {/* Action Buttons */}
          {parent?.subscription_status === 'trial' && (
            <button
              onClick={handleSubscribe}
              className="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl border-b-4 border-indigo-800 transition-all active:translate-y-1 active:border-b-0"
            >
              Subscribe Now
            </button>
          )}

          {parent?.subscription_status === 'active' && parent?.billing_cycle === 'monthly' && (
            <div className="mt-6">
              <Link
                href="/subscribe?upgrade=annual"
                className="block w-full text-center bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold py-3 rounded-2xl border-2 border-amber-200 transition-colors"
              >
                💰 Upgrade to Annual (Save £36/year)
              </Link>
            </div>
          )}

          {parent?.subscription_status === 'active' && (
            <button
              onClick={handleCancelSubscription}
              disabled={canceling}
              className="mt-3 w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-2xl transition-colors disabled:opacity-50"
            >
              {canceling ? 'Canceling...' : 'Cancel Subscription'}
            </button>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* BILLING HISTORY */}
        {/* ═══════════════════════════════════════════════════════ */}
        <div className="bg-white border-4 border-slate-100 border-b-8 rounded-[32px] p-8">
          <h2 className="text-3xl font-black mb-6">Billing History</h2>
          
          {billingHistory.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-400 font-bold text-lg">No billing history yet</p>
              <p className="text-slate-300 text-sm mt-2">Your payment history will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {billingHistory.map((record) => (
                <div
                  key={record.id}
                  className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border-2 border-slate-100"
                >
                  <div>
                    <p className="font-black text-slate-800">
                      {record.description || 'Subscription Payment'}
                    </p>
                    <p className="text-sm text-slate-500 font-bold">
                      {new Date(record.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-lg text-slate-800">
                      £{(record.amount / 100).toFixed(2)}
                    </p>
                    <p className={`text-xs font-bold ${
                      record.status === 'paid' ? 'text-emerald-600' : 
                      record.status === 'pending' ? 'text-amber-600' : 
                      'text-rose-600'
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
        <div className="mt-6 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-2xl">
          <p className="text-sm text-yellow-800 font-bold text-center flex items-center justify-center gap-2">
            <span>🧪</span>
            <span>Test Mode: Payment processing will be enabled soon</span>
          </p>
        </div>
      </main>
    </div>
  );
}