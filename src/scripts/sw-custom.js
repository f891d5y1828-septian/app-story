/* eslint-disable no-restricted-globals */
// Push Notification Handler (Basic + Skilled)
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (_) {
    payload = { body: event.data ? event.data.text() : '' };
  }

  const title = payload.title || 'CINEMAGIC';
  const options = {
    body: payload.body || 'Ada update terbaru dari CINEMAGIC',
    icon: payload.icon || './images/logo.png',
    badge: payload.badge || './images/logo.png',
    data: {
      url: payload.url || './#/stories',
      storyId: payload.storyId || null,
    },
    actions: [
      { action: 'open-detail', title: 'Lihat Detail' },
      { action: 'open-stories', title: 'Buka Daftar' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification Click: navigasi ke halaman detail atau daftar (Advanced)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification && event.notification.data ? event.notification.data : {};

  let targetUrl = data.url || './';
  if (event.action === 'open-detail' && data.storyId) {
    targetUrl = `./#/story/${data.storyId}`;
  } else if (event.action === 'open-stories') {
    targetUrl = './#/stories';
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        // Reuse existing tab if possible
        if ('focus' in client) {
          return client.navigate ? client.navigate(targetUrl).then(() => client.focus()) : client.focus();
        }
      }
      return clients.openWindow(targetUrl);
    })
  );
});