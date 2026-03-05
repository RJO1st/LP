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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-bold">Loading account...</p>
        </div>
      </div>
    );
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
          <span className="hidden sm:inline text-slate-900">Account Settings</span>
        </div>
        <Link
          href="/dashboard/parent"
          className="flex items-center gap-2 text-slate-500 font-bold hover:text-indigo-600 transition-colors px-4 py-2 rounded-xl hover:bg-slate-50"
        >
          <BackIcon /> <span className="hidden sm:inline">Back to Dashboard</span>
        </Link>
      </nav>

      <main className="max-w-2xl mx-auto px-6 pt-12">

        {/* Success/Error Message */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-2xl border-2 font-bold ${
            message.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            {message.text}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* ACCOUNT DETAILS */}
        {/* ═══════════════════════════════════════════════════════ */}
        <div className="bg-white border-4 border-slate-100 border-b-8 rounded-[32px] p-8 mb-8">
          <h2 className="text-3xl font-black mb-6">Account Details</h2>
          
          <form onSubmit={handleSave} className="space-y-6">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-black uppercase tracking-widest text-slate-500 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-indigo-500 focus:outline-none font-bold text-lg transition-colors"
                placeholder="Your name"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-black uppercase tracking-widest text-slate-500 mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                disabled
                className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 bg-slate-50 font-bold text-lg text-slate-500 cursor-not-allowed"
              />
              <p className="text-xs text-slate-400 mt-2 font-bold">
                Email cannot be changed. Contact support if you need to update it.
              </p>
            </div>

            {/* Save Button */}
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl border-b-4 border-indigo-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:translate-y-1 active:border-b-0"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* SUBSCRIPTION INFO */}
        {/* ═══════════════════════════════════════════════════════ */}
        <div className="bg-white border-4 border-slate-100 border-b-8 rounded-[32px] p-8 mb-8">
          <h2 className="text-2xl font-black mb-4">Subscription</h2>
          
          <div className="space-y-3">
            {/* Status */}
            <div className="flex justify-between items-center py-3 border-b-2 border-slate-100">
              <span className="font-bold text-slate-600">Status</span>
              <span className={`font-black ${
                parent?.subscription_status === 'active' ? 'text-green-600' :
                parent?.subscription_status === 'trial' ? 'text-blue-600' :
                'text-slate-600'
              }`}>
                {(parent?.subscription_status || 'trial').toUpperCase()}
              </span>
            </div>

            {/* Trial End Date */}
            {parent?.trial_end && parent?.subscription_status === 'trial' && (
              <div className="flex justify-between items-center py-3 border-b-2 border-slate-100">
                <span className="font-bold text-slate-600">Trial Ends</span>
                <span className="font-black">
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
              <span className="font-bold text-slate-600">Children Slots</span>
              <span className="font-black">{parent?.max_children || 3} max</span>
            </div>
          </div>

          {/* Manage Billing Button */}
          <Link
            href="/dashboard/parent/billing"
            className="mt-6 block w-full text-center bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-2xl transition-colors"
          >
            Manage Billing
          </Link>
        </div>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* DANGER ZONE */}
        {/* ═══════════════════════════════════════════════════════ */}
        <div className="bg-white border-4 border-rose-100 border-b-8 rounded-[32px] p-8">
          <h2 className="text-2xl font-black mb-4 text-rose-600">Danger Zone</h2>
          
          <div className="space-y-4">
            {/* Delete Account */}
            <div className="p-4 bg-rose-50 rounded-2xl border-2 border-rose-100">
              <h3 className="font-black mb-2">Delete Account</h3>
              <p className="text-sm text-slate-600 mb-4 font-bold">
                This will permanently delete your account and all scholar profiles. This cannot be undone.
              </p>
              <button
                onClick={handleDeleteAccount}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 rounded-2xl transition-colors"
              >
                Delete Account
              </button>
            </div>

            {/* Sign Out */}
            <button
              onClick={handleSignOut}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-2xl transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}