'use client';

/**
 * PWA Provider Component
 * Registers Service Worker and displays update notifications
 * Wraps the entire app to manage offline capabilities
 */

import { useEffect, useState } from 'react';
import { registerSW, hasWaitingSW, skipWaiting } from '@/lib/swRegister';
import PWAUpdateBanner from './PWAUpdateBanner';

export default function PWAProvider({ children }) {
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);

  useEffect(() => {
    // Register the Service Worker
    const handleSWUpdate = () => {
      if (hasWaitingSW()) {
        setShowUpdateBanner(true);
      }
    };

    // Only register in production/browser environment
    if (typeof window !== 'undefined') {
      registerSW(handleSWUpdate);
    }

    // Listen for SW messages about updates
    if ('serviceWorker' in navigator) {
      const handleSWMessage = (event) => {
        if (event.data?.type === 'SW_UPDATE_AVAILABLE') {
          setShowUpdateBanner(true);
        }
      };
      navigator.serviceWorker.addEventListener('message', handleSWMessage);
      return () => {
        navigator.serviceWorker.removeEventListener('message', handleSWMessage);
      };
    }
  }, []);

  const handleSkipWaiting = () => {
    skipWaiting();
  };

  return (
    <>
      {showUpdateBanner && (
        <PWAUpdateBanner onRefresh={handleSkipWaiting} />
      )}
      {children}
    </>
  );
}
