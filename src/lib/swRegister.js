/**
 * Service Worker Registration and Update Management
 * Handles SW lifecycle, updates, and notifications
 */

let swRegistration = null;

/**
 * Register the service worker
 * @param {Function} onUpdate Callback when a new SW version is available
 * @returns {Promise<ServiceWorkerRegistration|null>}
 */
export async function registerSW(onUpdate) {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.warn('Service Workers not supported in this environment');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none', // Always check for updated SW
    });

    swRegistration = registration;

    // Handle when a new SW is waiting
    if (registration.waiting) {
      onUpdate?.();
    }

    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (
            newWorker.state === 'installed' &&
            navigator.serviceWorker.controller
          ) {
            // New SW installed and there's an active controller
            // This means a new version is available
            onUpdate?.();
          }
        });
      }
    });

    console.log('Service Worker registered successfully');
    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
}

/**
 * Skip the waiting phase and activate new SW immediately
 * This will reload the page
 */
export function skipWaiting() {
  if (!swRegistration?.waiting) {
    console.warn('No waiting service worker found');
    return;
  }

  // Tell the new SW to skip waiting
  swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });

  // When the new SW takes over, reload the page
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}

/**
 * Get the current service worker registration
 * @returns {ServiceWorkerRegistration|null}
 */
export function getSWRegistration() {
  return swRegistration;
}

/**
 * Check if a new SW is waiting (available update)
 * @returns {boolean}
 */
export function hasWaitingSW() {
  return !!swRegistration?.waiting;
}

/**
 * Manually check for SW updates
 * @returns {Promise<void>}
 */
export async function checkForSWUpdates() {
  if (!swRegistration) {
    console.warn('Service Worker not registered yet');
    return;
  }

  try {
    await swRegistration.update();
  } catch (error) {
    console.error('Error checking for SW updates:', error);
  }
}

/**
 * Request periodic checks for SW updates (for long-lived sessions)
 * Checks every 12 hours
 */
export function startPeriodicSWUpdates() {
  if (!('periodicallyUpdate' in swRegistration)) {
    console.warn('Periodic SW updates not supported');
    return;
  }

  // Some browsers support periodicallyUpdate
  try {
    setInterval(() => {
      checkForSWUpdates();
    }, 12 * 60 * 60 * 1000); // 12 hours
  } catch (error) {
    console.error('Error starting periodic SW updates:', error);
  }
}

/**
 * Unregister the service worker (for logout/cleanup)
 * @returns {Promise<boolean>}
 */
export async function unregisterSW() {
  if (!swRegistration) {
    return false;
  }

  try {
    const success = await swRegistration.unregister();
    if (success) {
      swRegistration = null;
      console.log('Service Worker unregistered');
    }
    return success;
  } catch (error) {
    console.error('Error unregistering Service Worker:', error);
    return false;
  }
}

/**
 * Send a message to the active service worker
 * @param {Object} message
 * @returns {Promise<any>}
 */
export async function sendMessageToSW(message) {
  if (!navigator.serviceWorker.controller) {
    console.warn('No active service worker controller');
    return null;
  }

  return new Promise((resolve) => {
    const messageChannel = new MessageChannel();

    messageChannel.port1.onmessage = (event) => {
      resolve(event.data);
    };

    navigator.serviceWorker.controller.postMessage(message, [
      messageChannel.port2,
    ]);
  });
}

/**
 * Listen for messages from the service worker
 * @param {Function} callback
 */
export function onSWMessage(callback) {
  if (typeof window === 'undefined') return;

  navigator.serviceWorker.addEventListener('message', (event) => {
    callback(event.data);
  });
}
