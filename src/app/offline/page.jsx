'use client';

/**
 * Offline Fallback Page
 * Friendly interface when students lose connectivity
 * Shows cached data and helpful options
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCachedQuestionsCount } from '@/lib/offlineStore';

export default function OfflinePage() {
  const router = useRouter();
  const [cachedQuestions, setCachedQuestions] = useState(0);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  // Do NOT read navigator.onLine here — navigator is undefined during SSR
  // (Next.js App Router prerendering). Set the real value inside useEffect.
  const [connectionStatus, setConnectionStatus] = useState('offline');

  // Get cached questions count on mount
  useEffect(() => {
    async function loadStats() {
      try {
        const count = await getCachedQuestionsCount();
        setCachedQuestions(count);
      } catch (error) {
        console.error('Error loading cached questions count:', error);
      }
    }

    loadStats();

    // Set real initial connection status now that we're in the browser
    setConnectionStatus(navigator.onLine ? 'online' : 'offline');

    // Listen for online/offline events
    const handleOnline = () => {
      setConnectionStatus('online');
      // Auto-redirect after a short delay
      setTimeout(() => {
        router.push('/dashboard/student');
      }, 1500);
    };

    const handleOffline = () => {
      setConnectionStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [router]);

  const checkConnection = async () => {
    setIsCheckingConnection(true);
    try {
      const response = await fetch('/manifest.json', { method: 'HEAD' });
      if (response.ok) {
        setConnectionStatus('online');
        setTimeout(() => {
          router.push('/dashboard/student');
        }, 1500);
      } else {
        setConnectionStatus('offline');
      }
    } catch (error) {
      setConnectionStatus('offline');
    } finally {
      setIsCheckingConnection(false);
    }
  };

  const goToDashboard = () => {
    router.push('/dashboard/student');
  };

  const getStatusMessage = () => {
    if (connectionStatus === 'online') {
      return (
        <>
          <span className="text-emerald-400 mr-2">✓</span>
          You're back online! Syncing your progress...
        </>
      );
    }
    if (isCheckingConnection) {
      return (
        <>
          <span className="text-amber-400 mr-2 animate-spin">⚡</span>
          Checking connection...
        </>
      );
    }
    return (
      <>
        <span className="text-red-400 mr-2">✗</span>
        You're offline, but you can still learn!
      </>
    );
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#080c15] via-[#0f1419] to-[#0a0e17] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Animated Rocket Icon */}
        <div className="mb-8 flex justify-center">
          <div className="text-6xl animate-bounce" style={{animationDuration: '3s'}}>
            🚀
          </div>
        </div>

        {/* Main Heading */}
        <h1 className="text-3xl font-bold text-white text-center mb-2">
          Learning Never Stops
        </h1>

        {/* Status Message */}
        <div className="mt-6 p-3 rounded-lg bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-400/30 text-center text-sm font-medium text-indigo-200">
          {getStatusMessage()}
        </div>

        {/* Cached Questions Info */}
        {cachedQuestions > 0 && (
          <div className="mt-6 p-4 rounded-lg bg-emerald-500/5 border border-emerald-400/30">
            <p className="text-emerald-300 text-center text-sm">
              <span className="font-bold">{cachedQuestions}</span> questions cached
              and ready to go!
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-8 space-y-3 flex flex-col">
          <button
            onClick={checkConnection}
            disabled={isCheckingConnection || connectionStatus === 'online'}
            className="w-full px-6 py-3 rounded-lg font-semibold transition-all duration-200 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white hover:shadow-lg hover:shadow-indigo-500/50 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:translate-y-0"
          >
            {isCheckingConnection ? 'Checking...' : 'Check Connection'}
          </button>

          <button
            onClick={goToDashboard}
            className="w-full px-6 py-3 rounded-lg font-semibold transition-all duration-200 bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-white/40 backdrop-blur-sm"
          >
            Practice with Cached Questions
          </button>
        </div>

        {/* Info Box */}
        <div className="mt-8 p-4 rounded-lg bg-blue-500/5 border border-blue-400/20">
          <p className="text-blue-200 text-xs leading-relaxed">
            <span className="font-semibold">💡 Tip:</span> Your answers are saved locally and will sync automatically when you're back online. Keep learning!
          </p>
        </div>

        {/* Features During Offline */}
        <div className="mt-8 grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-center">
            <div className="text-2xl mb-1">📚</div>
            <p className="text-xs text-gray-300">Practice Questions</p>
          </div>
          <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-center">
            <div className="text-2xl mb-1">🎯</div>
            <p className="text-xs text-gray-300">Track Progress</p>
          </div>
          <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-center">
            <div className="text-2xl mb-1">💾</div>
            <p className="text-xs text-gray-300">Auto-Sync</p>
          </div>
          <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-center">
            <div className="text-2xl mb-1">🚀</div>
            <p className="text-xs text-gray-300">Zero Waiting</p>
          </div>
        </div>

        {/* Footer Note */}
        <p className="mt-8 text-xs text-center text-gray-400">
          LaunchPard adapts to your connection. Study on, scholar!
        </p>
      </div>
    </main>
  );
}
