'use client';

/**
 * Hook: useNetworkStatus
 * Detects online/offline state changes
 * Tracks pending sync operations
 */

import { useEffect, useState, useCallback } from 'react';
import { getPendingAnswers } from '@/lib/offlineStore';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);
  const [pendingSync, setPendingSync] = useState(0);

  // Check for pending answers and update count
  const updatePendingCount = useCallback(async () => {
    try {
      const pending = await getPendingAnswers();
      setPendingSync(pending.length);
    } catch (error) {
      console.warn('Error checking pending answers:', error);
    }
  }, []);

  // Initialize online status and setup listeners
  useEffect(() => {
    // Set initial status
    const initialOnline = navigator.onLine;
    setIsOnline(initialOnline);

    // Update pending answers count
    updatePendingCount();

    // Handle online event
    const handleOnline = () => {
      setIsOnline(true);
      // Keep wasOffline true until pending answers are synced
      updatePendingCount();
    };

    // Handle offline event
    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      updatePendingCount();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodically update pending count (every 5 seconds when offline)
    let interval;
    if (!isOnline) {
      interval = setInterval(updatePendingCount, 5000);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (interval) clearInterval(interval);
    };
  }, [updatePendingCount]);

  // Reset wasOffline flag when all pending answers are synced and online
  useEffect(() => {
    if (isOnline && wasOffline && pendingSync === 0) {
      // Give a small delay to ensure UI updates
      const timer = setTimeout(() => {
        setWasOffline(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline, pendingSync]);

  return {
    isOnline,
    wasOffline,
    pendingSync,
    updatePendingCount,
  };
}
