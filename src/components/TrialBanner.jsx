// components/TrialBanner.jsx - Shows trial status on student dashboard
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getTrialStatus } from '../lib/trialTracking';

export default function TrialBanner({ parentId }) {
  const [trialInfo, setTrialInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTrialStatus() {
      if (!parentId) return;
      
      const status = await getTrialStatus(parentId);
      setTrialInfo(status);
      setLoading(false);
    }

    loadTrialStatus();
  }, [parentId]);

  if (loading) return null;
  if (!trialInfo) return null;
  if (trialInfo.status === 'subscribed') return null; // Don't show for active subscribers
  if (trialInfo.status === 'expired') return null; // Middleware will redirect

  // Show trial banner
  if (trialInfo.status === 'trial') {
    const isUrgent = trialInfo.daysLeft <= 2;
    
    return (
      <div className={`
        ${isUrgent 
          ? 'bg-gradient-to-r from-orange-500 to-red-600' 
          : 'bg-gradient-to-r from-indigo-500 to-purple-600'
        }
        text-white px-6 py-4 shadow-lg
      `}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="text-2xl">
              {isUrgent ? '⚠️' : '🎉'}
            </div>
            <div>
              <p className="font-bold text-lg">
                {isUrgent ? '⏰ Trial Ending Soon!' : '✨ Free Trial Active'}
              </p>
              <p className="text-sm opacity-90">
                {trialInfo.message}
              </p>
            </div>
          </div>
          
          <Link
            href={trialInfo.ctaLink}
            className={`
              px-6 py-3 rounded-xl font-bold whitespace-nowrap transition-all
              ${isUrgent
                ? 'bg-white text-orange-600 hover:bg-orange-50 shadow-lg'
                : 'bg-white/20 hover:bg-white/30 backdrop-blur-sm'
              }
            `}
          >
            {trialInfo.ctaText}
          </Link>
        </div>
      </div>
    );
  }

  return null;
}
