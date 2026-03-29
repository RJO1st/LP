"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
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


// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════
export default function AccountPage() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [parent, setParent] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [formData, setFormData] = useState({
    fullName: '',
    email: ''
  });

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
        setFormData({
          fullName: parentData.full_name || '',
          email: user.email || ''
        });
      } else {
        setFormData({
          fullName: user.user_metadata?.full_name || '',
          email: user.email || ''
        });
      }

      setLoading(false);
    };

    init();
  }, [router, supabase]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      // Update parent record
      const { error: updateError } = await supabase
        .from('parents')
        .update({ full_name: formData.fullName })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setMessage({ type: 'success', text: 'Account updated successfully!' });
      
      // Refresh parent data
      const { data: parentData } = await supabase
        .from('parents')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (parentData) setParent(parentData);

    } catch (error) {
      console.error('Update error:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to update account' });
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleDeleteAccount = async () => {
    const confirmation = prompt(
      'This will permanently delete your account and all scholar profiles. This cannot be undone.\n\nType "DELETE" to confirm:'
    );

    if (confirmation !== 'DELETE') {
      return;
    }

    try {
      // In production, this would call a secure API endpoint
      // For now, just show a message
      alert('Account deletion is not yet implemented. Please contact support at support@launchpard.com to delete your account.');
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete account. Please contact support.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#080c15] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400 font-bold">Loading account...</p>
        </div>
      </div>
    );
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
            <span className="hidden sm:inline text-slate-900 dark:text-white">Account Settings</span>
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

      <main className="max-w-2xl mx-auto px-3 sm:px-6 pt-6 sm:pt-12">

        {/* Success/Error Message */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-2xl border-2 font-bold ${
            message.type === 'success'
              ? 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30 text-green-700 dark:text-green-400'
              : 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400'
          }`}>
            {message.text}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* ACCOUNT DETAILS */}
        {/* ═══════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-slate-800/60 border-2 sm:border-4 border-slate-100 dark:border-white/10 border-b-4 sm:border-b-8 rounded-2xl sm:rounded-[32px] p-4 sm:p-8 mb-4 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-black mb-4 sm:mb-6 text-slate-900 dark:text-white">Account Details</h2>

          <form onSubmit={handleSave} className="space-y-6">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 dark:border-white/10 dark:bg-white/5 focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none font-bold text-lg dark:text-white transition-colors dark:placeholder-slate-500"
                placeholder="Your name"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                disabled
                className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 dark:border-white/10 dark:bg-white/5 font-bold text-lg text-slate-500 dark:text-slate-400 cursor-not-allowed"
              />
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 font-bold">
                Email cannot be changed. Contact support if you need to update it.
              </p>
            </div>

            {/* Save Button */}
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white font-black py-4 rounded-2xl border-b-4 border-indigo-800 dark:border-indigo-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:translate-y-1 active:border-b-0"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* SUBSCRIPTION INFO */}
        {/* ═══════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-slate-800/60 border-2 sm:border-4 border-slate-100 dark:border-white/10 border-b-4 sm:border-b-8 rounded-2xl sm:rounded-[32px] p-4 sm:p-8 mb-4 sm:mb-8">
          <h2 className="text-2xl font-black mb-4 text-slate-900 dark:text-white">Subscription</h2>

          <div className="space-y-3">
            {/* Status */}
            <div className="flex justify-between items-center py-3 border-b-2 border-slate-100 dark:border-white/10">
              <span className="font-bold text-slate-600 dark:text-slate-300">Status</span>
              <span className={`font-black ${
                parent?.subscription_status === 'active' ? 'text-green-600 dark:text-green-400' :
                parent?.subscription_status === 'trial' ? 'text-blue-600 dark:text-blue-400' :
                'text-slate-600 dark:text-slate-400'
              }`}>
                {(parent?.subscription_status || 'trial').toUpperCase()}
              </span>
            </div>

            {/* Trial End Date */}
            {parent?.trial_end && parent?.subscription_status === 'trial' && (
              <div className="flex justify-between items-center py-3 border-b-2 border-slate-100 dark:border-white/10">
                <span className="font-bold text-slate-600 dark:text-slate-300">Trial Ends</span>
                <span className="font-black text-slate-800 dark:text-white">
                  {new Date(parent.trial_end).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </span>
              </div>
            )}

            {/* Children Slots */}
            <div className="flex justify-between items-center py-3">
              <span className="font-bold text-slate-600 dark:text-slate-300">Children Slots</span>
              <span className="font-black text-slate-800 dark:text-white">{parent?.max_children || 3} max</span>
            </div>
          </div>

          {/* Manage Billing Button */}
          <Link
            href="/dashboard/parent/billing"
            className="mt-6 block w-full text-center bg-slate-100 dark:bg-slate-700/40 hover:bg-slate-200 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-300 font-bold py-3 rounded-2xl transition-colors"
          >
            Manage Billing
          </Link>
        </div>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* DANGER ZONE */}
        {/* ═══════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-slate-800/60 border-2 sm:border-4 border-rose-100 dark:border-rose-500/30 border-b-4 sm:border-b-8 rounded-2xl sm:rounded-[32px] p-4 sm:p-8">
          <h2 className="text-2xl font-black mb-4 text-rose-600 dark:text-rose-400">Danger Zone</h2>

          <div className="space-y-4">
            {/* Delete Account */}
            <div className="p-4 bg-rose-50 dark:bg-rose-500/10 rounded-2xl border-2 border-rose-100 dark:border-rose-500/30">
              <h3 className="font-black mb-2 text-slate-900 dark:text-white">Delete Account</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 font-bold">
                This will permanently delete your account and all scholar profiles. This cannot be undone.
              </p>
              <button
                onClick={handleDeleteAccount}
                className="w-full bg-rose-600 hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-700 text-white font-bold py-3 rounded-2xl transition-colors"
              >
                Delete Account
              </button>
            </div>

            {/* Sign Out */}
            <button
              onClick={handleSignOut}
              className="w-full bg-slate-100 dark:bg-slate-700/40 hover:bg-slate-200 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-300 font-bold py-3 rounded-2xl transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}