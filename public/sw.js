/**
 * LaunchPard Service Worker
 * Offline-first PWA for Nigerian students with unreliable internet
 * Uses Workbox via CDN for robust caching strategies
 */

// Import Workbox from CDN
importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js');

const CACHE_PREFIX = 'lp-';
const CACHE_VERSION = '1';

// Cache names
const CACHES_CONFIG = {
  shell: `${CACHE_PREFIX}shell-v${CACHE_VERSION}`,
  static: `${CACHE_PREFIX}static-v${CACHE_VERSION}`,
  api: `${CACHE_PREFIX}api-v${CACHE_VERSION}`,
  images: `${CACHE_PREFIX}images-v${CACHE_VERSION}`,
};

// Configure Workbox
if (workbox) {
  workbox.setConfig({ debug: false });

  // Skip waiting: activate new SW immediately
  workbox.core.skipWaiting();
  workbox.core.clientsClaim();

  // ============================================================================
  // APP SHELL: NetworkFirst (prefer fresh, fallback to cache)
  // ============================================================================
  // HTML pages and navigation requests
  workbox.routing.registerRoute(
    ({ request }) => request.mode === 'navigate',
    new workbox.strategies.NetworkFirst({
      cacheName: CACHES_CONFIG.shell,
      networkTimeoutSeconds: 3,
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
          maxEntries: 50,
        }),
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
      ],
    })
  );

  // ============================================================================
  // STATIC ASSETS: CacheFirst (prefer cache, fallback to network)
  // CSS, JS bundles, fonts — these are versioned and don't change
  // ============================================================================
  workbox.routing.registerRoute(
    ({ request, url }) => {
      return (
        url.pathname.startsWith('/_next/static/') ||
        url.pathname.startsWith('/fonts/') ||
        url.pathname.match(/\.(css|js|woff2|woff|ttf)$/)
      );
    },
    new workbox.strategies.CacheFirst({
      cacheName: CACHES_CONFIG.static,
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
          maxEntries: 100,
        }),
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
      ],
    })
  );

  // ============================================================================
  // IMAGES: CacheFirst with lazy expiration
  // ============================================================================
  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'image',
    new workbox.strategies.CacheFirst({
      cacheName: CACHES_CONFIG.images,
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
          maxEntries: 200,
        }),
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
      ],
    })
  );

  // ============================================================================
  // QUESTIONS API: StaleWhileRevalidate (serve cached, update in background)
  // GET /api/questions/* — allow offline practice with cached questions
  // ============================================================================
  workbox.routing.registerRoute(
    ({ url }) => url.pathname.startsWith('/api/questions/'),
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: CACHES_CONFIG.api,
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
          maxEntries: 500,
        }),
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
      ],
    })
  );

  // ============================================================================
  // MASTERY DATA API: NetworkFirst (prefer fresh, fallback to 1-day cache)
  // GET /api/mastery/*, GET /api/scholar/* — must sync when online
  // ============================================================================
  workbox.routing.registerRoute(
    ({ url }) =>
      url.pathname.startsWith('/api/mastery/') ||
      url.pathname.startsWith('/api/scholar/'),
    new workbox.strategies.NetworkFirst({
      cacheName: CACHES_CONFIG.api,
      networkTimeoutSeconds: 5,
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxAgeSeconds: 24 * 60 * 60, // 1 day
          maxEntries: 100,
        }),
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
      ],
    })
  );

  // ============================================================================
  // CONCEPT CARDS: CacheFirst
  // ============================================================================
  workbox.routing.registerRoute(
    ({ url }) => url.pathname.startsWith('/api/concept-cards/'),
    new workbox.strategies.CacheFirst({
      cacheName: CACHES_CONFIG.api,
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
          maxEntries: 300,
        }),
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
      ],
    })
  );

  // ============================================================================
  // WRITE MUTATIONS: BackgroundSync
  // POST /api/session-answers, POST /api/mastery-update
  // Queue failed writes, replay when online
  // ============================================================================
  const bgSyncPlugin = new workbox.backgroundSync.BackgroundSyncPlugin(
    'lp-answer-queue',
    {
      maxRetentionTime: 24 * 60, // Retry for 24 hours
    }
  );

  workbox.routing.registerRoute(
    ({ url, request }) =>
      (url.pathname.startsWith('/api/session-answers') ||
        url.pathname.startsWith('/api/mastery-update')) &&
      request.method === 'POST',
    new workbox.strategies.NetworkOnly({
      plugins: [bgSyncPlugin],
    }),
    'POST'
  );

  // ============================================================================
  // OFFLINE FALLBACK
  // If any navigation fails and there's no cache, serve offline page
  // ============================================================================
  self.addEventListener('fetch', (event) => {
    // Only handle navigation requests (page loads)
    if (event.request.mode === 'navigate') {
      event.respondWith(
        fetch(event.request).catch(() => {
          return caches.match('/offline.html') ||
            new Response(
              `<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
              <title>LaunchPard Offline</title>
              <style>body{font-family:system-ui;background:#080c15;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;}
              .container{text-align:center;padding:2rem;}h1{margin:0 0 1rem;font-size:1.5rem;}.icon{font-size:3rem;margin-bottom:1rem;}</style></head>
              <body><div class="container"><div class="icon">🚀</div><h1>You're offline</h1><p>Refresh when connected, or visit your dashboard to use cached lessons.</p></div></body></html>`,
              { headers: { 'Content-Type': 'text/html' } }
            );
        })
      );
    }
  });

  // ============================================================================
  // HANDLE UPDATES
  // Notify all open clients when a new SW version activates.
  // NOTE: 'controllerchange' is a navigator.serviceWorker event (client side)
  //       and does NOT fire inside the SW. Use the 'activate' lifecycle event
  //       instead to broadcast the update message to all controlled clients.
  // ============================================================================
  self.addEventListener('activate', (event) => {
    event.waitUntil(
      self.clients.matchAll({ includeUncontrolled: true, type: 'window' }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'SW_UPDATE_AVAILABLE',
          });
        });
      })
    );
  });
} else {
  console.error('Workbox failed to load from CDN');
}

// ============================================================================
// PUSH NOTIFICATIONS
// Receive push events from the server and show browser notifications.
// ============================================================================
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data = {};
  try { data = event.data.json(); } catch { data = { title: 'LaunchPard', body: event.data.text() }; }

  const title   = data.title || 'LaunchPard';
  const options = {
    body:    data.body  || '',
    icon:    data.icon  || '/icon-192.png',
    badge:   '/icon-72.png',
    tag:     data.tag   || 'launchpard-general',
    renotify: false,
    data:    { url: data.data?.url || '/' },
    actions: data.actions || [],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus existing tab if open
      for (const client of clients) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open new tab
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// ============================================================================
// MESSAGE HANDLER FOR CLIENTS
// Handle requests from IndexedDB + network sync
// ============================================================================
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'DRAIN_PENDING_ANSWERS') {
    // Client is requesting to drain pending answers from IndexedDB
    // This is handled by the offlineStore.js in the client
    // SW just acknowledges
    event.ports[0].postMessage({ status: 'acknowledged' });
  }
});
