'use client';

/**
 * PWA Provider Component
 * Registers Service Worker and displays update notifications.
 * Wraps the entire app to manage offline capabilities.
 */

import { useEffect, useState } from 'react';
import { registerSW, skipWaiting } from '@/lib/swRegister';
import PWAUpdateBanner from './PWAUpdateBanner';

export default function PWAProvider({ children }) {
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Register the service worker. The callback fires when a new
    // SW has installed and is in the "waiting" state.
    registerSW(() => {
      setShowUpdateBanner(true);
    });

    // Also show the banner if the SW broadcasts SW_UPDATE_AVAILABLE
    // (this fires from the SW's activate event — new SW already active).
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

  const handleRefresh = () => {
    setShowUpdateBanner(false);
    skipWaiting(); // handles both waiting-SW and already-active-SW cases
  };

  const handleDismiss = () => {
    setShowUpdateBanner(false);
  };

  return (
    <>
      {children}
      {showUpdateBanner && (
        <PWAUpdateBanner onRefresh={handleRefresh} onDismiss={handleDismiss} />
      )}
    </>
  );
}
