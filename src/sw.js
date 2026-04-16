/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { BackgroundSyncPlugin } from 'workbox-background-sync';
import { NetworkFirst, NetworkOnly } from 'workbox-strategies';

self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new StaleWhileRevalidate({
    cacheName: 'mwanga-google-fonts-css',
  })
);

registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'mwanga-google-fonts-files',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }),
    ],
  })
);

// 1. API Caching Strategy (Network First for fresh data, Cache fallback)
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/v1/transactions') || url.pathname.startsWith('/api/v1/accounts'),
  new NetworkFirst({
    cacheName: 'mwanga-api-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 24 * 60 * 60, // 24 hours
      }),
      new CacheableResponsePlugin({ statuses: [200] })
    ]
  })
);

// 2. Background Sync for Offline Mutations (Transactions & SMS)
const bgSyncPlugin = new BackgroundSyncPlugin('mwanga-offline-queue', {
  maxRetentionTime: 24 * 60, // Retry for up to 24 hours (in minutes)
  onSync: async ({ queue }) => {
    let entry;
    while ((entry = await queue.shiftRequest())) {
      try {
        await fetch(entry.request.clone());
        // Sync successful, could trigger postMessage here
      } catch (error) {
        await queue.unshiftRequest(entry);
        throw error;
      }
    }
  }
});

// Capture POST/PUT requests to the API for background sync
registerRoute(
  ({ url, request }) => (request.method === 'POST' || request.method === 'PUT') && url.pathname.includes('/api/v1/'),
  new NetworkOnly({
    plugins: [bgSyncPlugin]
  })
);

// 3. SPA Navigation Fallback
// This ensures that when testing offline in both Dev and Prod, 
// the HTML document itself is served from the cache if the network fails.
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({
    cacheName: 'mwanga-pages',
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] })
    ]
  })
);

function buildDeepLink(data = {}, actionId = 'OPEN') {
  const params = new URLSearchParams();
  if (data.date) params.set('date', data.date);
  if (data.notificationId) params.set('notificationId', String(data.notificationId));
  if (actionId) params.set('action', actionId);
  params.set('source', 'notification');

  const route = data.route || '/quick-add';
  return `${route}?${params.toString()}`;
}

async function focusOrOpenClient(data, actionId) {
  const targetUrl = new URL(buildDeepLink(data, actionId), self.location.origin).href;
  const windowClients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });

  const existingClient = windowClients.find((client) => new URL(client.url).origin === self.location.origin);

  if (existingClient) {
    await existingClient.focus();
    existingClient.postMessage({
      type: 'MWANGA_NOTIFICATION_ACTION',
      payload: {
        ...data,
        actionId,
        targetUrl,
      },
    });
    return existingClient;
  }

  return self.clients.openWindow(targetUrl);
}

self.addEventListener('push', (event) => {
  let payload = {
    title: 'Mwanga',
    body: 'Tens uma nova atualização financeira.',
    data: { route: '/quick-add', action: 'OPEN_DAILY_LOG' },
  };

  try {
    if (event.data) {
      const data = event.data.json();
      // Supports both flat and nested payload structures
      payload = {
        title: data.title || payload.title,
        body: data.body || data.message || payload.body,
        icon: data.icon || '/icon-192.png',
        badge: data.badge || '/icon-192.png',
        tag: data.tag || data.dedupeKey || 'mwanga-notification',
        renotify: data.renotify !== false,
        requireInteraction: data.requireInteraction || false,
        data: data.data || data, // Fallback to root data if not nested
        actions: Array.isArray(data.actions) ? data.actions : [],
      };
    }
  } catch (error) {
    console.warn('Push payload parsing failed, using fallback:', error);
  }

  const options = {
    body: payload.body,
    icon: payload.icon,
    badge: payload.badge,
    tag: payload.tag,
    renotify: payload.renotify,
    requireInteraction: payload.requireInteraction,
    data: payload.data,
    actions: payload.actions.slice(0, 2),
  };

  event.waitUntil(self.registration.showNotification(payload.title, options));
});

self.addEventListener('notificationclick', (event) => {
  const notificationData = event.notification.data || {};
  const actionId = event.action || notificationData.action || 'OPEN';

  event.notification.close();

  // Handle specific actions if needed, otherwise just open/focus the app
  event.waitUntil(focusOrOpenClient(notificationData, actionId));
});
