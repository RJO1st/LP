/**
 * ReferralBanner.jsx
 * Deploy to: src/components/ReferralBanner.jsx
 *
 * Compact referral strip for parent dashboard — sits below trial/subscription banner.
 * Usage:
 *   <ReferralBanner parentId={parent.id} parentName={parent.full_name} supabase={supabase} />
 */

"use client";
import React, { useState, useEffect } from "react";
import { ensureReferralCode, getReferralStats } from "../lib/referralSystem";

export default function ReferralBanner({ parentId, parentName, supabase }) {
  const [stats, setStats] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!parentId) return;
    (async () => {
      try {
        await ensureReferralCode(supabase, parentId, parentName);
        const s = await getReferralStats(supabase, parentId);
        setStats(s);
      } catch {}
    })();
  }, [parentId, parentName, supabase]);

  if (!stats?.code) return null;

  const shareUrl = `https://launchpard.com/signup?ref=${stats.code}`;

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(shareUrl); } catch {
      const el = document.createElement("input"); el.value = shareUrl;
      document.body.appendChild(el); el.select(); document.execCommand("copy"); document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(`My children use LaunchPard for AI-powered learning. Try it free: ${shareUrl}`)}`, "_blank");
  };

  return (
    <div className="flex items-center gap-3 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl px-4 py-2.5">
      <span className="text-lg shrink-0">🎁</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-black text-indigo-800 truncate">
          Refer a friend, get 1 free month
          {stats.referralCount > 0 && (
            <span className="ml-2 text-emerald-600">· {stats.credits} earned</span>
          )}
        </p>
        <p className="text-[10px] text-indigo-500 font-bold tracking-wide">{stats.code}</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button onClick={handleWhatsApp}
          className="w-8 h-8 rounded-lg bg-green-500 hover:bg-green-600 text-white flex items-center justify-center transition-colors text-sm" title="Share on WhatsApp">
          💬
        </button>
        <button onClick={handleCopy}
          className={`px-3 h-8 rounded-lg font-bold text-xs transition-all ${
            copied ? "bg-emerald-100 text-emerald-700 border border-emerald-200" : "bg-indigo-600 hover:bg-indigo-700 text-white"
          }`}>
          {copied ? "✓ Copied" : "Copy Link"}
        </button>
      </div>
    </div>
  );
}