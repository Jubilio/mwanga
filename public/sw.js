/*
 * Mwanga Intelligent Notification Service Worker ✦
 * Handles background push events and notification interactions.
 */

self.addEventListener('push', (event) => {
  if (!event.data) {
    console.warn('[SW] Push event received but no data found.');
    return;
  }

  try {
    const payload = event.data.json();
    console.log('[SW] Push received:', payload);

    const title = payload.title || 'Mwanga ✦';
    const options = {
      body: payload.body,
      icon: payload.icon || '/icon-192.png',
      badge: payload.badge || '/icon-192.png',
      tag: payload.tag || 'mwanga-notification',
      renotify: payload.renotify || false,
      requireInteraction: payload.requireInteraction || false,
      actions: payload.actions || [],
      data: payload.data || {},
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (error) {
    console.error('[SW] Error parsing push data:', error);
  }
});

self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  const action = event.action; // The ID of the button clicked, if any
  const data = notification.data || {};

  notification.close();

  console.log('[SW] Notification click action:', action, 'Data:', data);

  // If a specific action button was clicked, we pass that as the primary action
  const finalAction = action || data.action || 'OPEN';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 1. Try to find an existing window and focus it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus().then((focusedClient) => {
            // 2. Send message to the app to trigger QuickAdd or specific route
            return focusedClient.postMessage({
              type: 'NOTIFICATION_INTERACTION',
              action: finalAction,
              notificationId: data.notificationId,
              payload: data,
            });
          });
        }
      }

      // 3. If no window is open, open a new one
      if (clients.openWindow) {
        const url = data.route || '/';
        return clients.openWindow(url).then((newClient) => {
          // Wait a bit for the app to init before sending message
          return new Promise(resolve => setTimeout(() => {
            newClient.postMessage({
              type: 'NOTIFICATION_INTERACTION',
              action: finalAction,
              notificationId: data.notificationId,
              payload: data,
            });
            resolve();
          }, 2000));
        });
      }
    })
  );
});

// Clean up old notifications with the same tag
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
