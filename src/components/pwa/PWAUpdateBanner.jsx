'use client';

/**
 * PWA Update Banner
 * Shown when a new service worker version is available.
 *
 * Design: bottom-right toast — never overlaps the app's own top nav bar.
 * On mobile the toast is full-width at the bottom (above any bottom nav).
 */

import { useState } from 'react';

export default function PWAUpdateBanner({ onRefresh, onDismiss }) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Give the spinner a moment to render before the page reloads
    setTimeout(() => {
      onRefresh();
    }, 150);
  };

  return (
    // Bottom-right on desktop, full-width bottom on mobile
    // z-[60] sits above most modals (z-50) but below critical overlays
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-[60] animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-slate-900 border border-indigo-500/40 rounded-xl shadow-2xl shadow-indigo-500/20 overflow-hidden">
        {/* Accent line */}
        <div className="h-0.5 w-full bg-gradient-to-r from-indigo-500 to-purple-500" />

        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className="flex-shrink-0 mt-0.5 w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">Update available</p>
              <p className="text-xs text-slate-400 mt-0.5">A new version of LaunchPard is ready.</p>
            </div>

            {/* Dismiss */}
            <button
              onClick={onDismiss}
              className="flex-shrink-0 text-slate-500 hover:text-slate-300 transition-colors p-0.5"
              aria-label="Dismiss update notification"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isRefreshing ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Updating…
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Update now
                </>
              )}
            </button>

            <button
              onClick={onDismiss}
              className="px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
