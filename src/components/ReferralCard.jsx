/**
 * ReferralCard.jsx
 * Deploy to: src/components/ReferralCard.jsx
 *
 * Drop into the parent dashboard to show referral code + share buttons.
 * Usage:
 *   <ReferralCard parentId={parent.id} parentName={parent.full_name} supabase={supabase} />
 */

"use client";
import React, { useState, useEffect } from "react";
import { ensureReferralCode, getReferralStats } from "../lib/referralSystem";

export default function ReferralCard({ parentId, parentName, supabase }) {
  const [stats, setStats] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!parentId) return;
    (async () => {
      try {
        // Ensure parent has a code
        await ensureReferralCode(supabase, parentId, parentName);
        // Load stats
        const s = await getReferralStats(supabase, parentId);
        setStats(s);
      } catch (err) {
        console.warn("[ReferralCard] Failed:", err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [parentId, parentName, supabase]);

  if (loading || !stats?.code) return null;

  const shareUrl = `https://launchpard.com/signup?ref=${stats.code}`;
  const shareText = `My children are using LaunchPard — AI-powered learning that actually matches their curriculum. Try it free: ${shareUrl}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const input = document.createElement("input");
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank");
  };

  const handleEmail = () => {
    const subject = encodeURIComponent("Try LaunchPard — AI learning for your children");
    const body = encodeURIComponent(shareText);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-100 rounded-[28px] p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">🎁</span>
        <div>
          <h3 className="font-black text-indigo-900 text-base">Share LaunchPard, Get Free Months</h3>
          <p className="text-xs text-indigo-600 font-semibold">Earn 1 free month for every family that signs up</p>
        </div>
      </div>

      {/* Referral code display */}
      <div className="bg-white rounded-2xl border-2 border-indigo-200 p-4 mb-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1">Your Referral Code</p>
            <p className="text-xl font-black text-indigo-700 tracking-wider">{stats.code}</p>
          </div>
          <button
            onClick={handleCopy}
            className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
              copied
                ? "bg-emerald-100 text-emerald-700 border-2 border-emerald-200"
                : "bg-indigo-100 text-indigo-700 border-2 border-indigo-200 hover:bg-indigo-200"
            }`}
          >
            {copied ? "✓ Copied!" : "Copy Link"}
          </button>
        </div>
      </div>

      {/* Share buttons */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={handleWhatsApp}
          className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-2.5 rounded-xl text-sm transition-colors"
        >
          <span>💬</span> WhatsApp
        </button>
        <button
          onClick={handleEmail}
          className="flex-1 flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-sm transition-colors"
        >
          <span>✉️</span> Email
        </button>
        <button
          onClick={handleCopy}
          className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors"
        >
          <span>🔗</span> Copy Link
        </button>
      </div>

      {/* Stats */}
      {stats.referralCount > 0 && (
        <div className="flex items-center gap-4 bg-white/60 rounded-xl p-3 border border-indigo-100">
          <div className="text-center flex-1">
            <p className="text-xl font-black text-indigo-700">{stats.referralCount}</p>
            <p className="text-[10px] font-bold text-indigo-400 uppercase">Referred</p>
          </div>
          <div className="w-px h-8 bg-indigo-200" />
          <div className="text-center flex-1">
            <p className="text-xl font-black text-emerald-600">{stats.credits}</p>
            <p className="text-[10px] font-bold text-emerald-500 uppercase">Free Months Earned</p>
          </div>
        </div>
      )}
    </div>
  );
}