/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

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
