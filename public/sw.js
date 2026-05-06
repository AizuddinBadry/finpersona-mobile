/* Finpersona service worker — handles web-push commitment reminders. */

self.addEventListener('push', function (event) {
  let payload = { title: 'Finpersona', body: 'You have a commitment due tomorrow.', url: '/sources' };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    /* ignore malformed payload */
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: 'commitment-reminder',
      renotify: true,
      data: { url: payload.url },
    }),
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const target = event.notification.data?.url ?? '/sources';
  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(function (clientList) {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(target);
            return client.focus();
          }
        }
        if (clients.openWindow) return clients.openWindow(target);
      }),
  );
});
