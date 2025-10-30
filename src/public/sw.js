/* eslint-disable no-undef */
// Service Worker dengan Workbox untuk caching dan Background Sync

// Muat Workbox dari CDN
importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

// Jika Workbox tersedia
if (self.workbox) {
  workbox.core.setCacheNameDetails({ prefix: 'cinemagic' });
  workbox.core.skipWaiting();
  workbox.core.clientsClaim();

  // Precaching jika __WB_MANIFEST tersedia (tidak wajib di dev)
  // workbox.precaching.precacheAndRoute(self.__WB_MANIFEST || []);

  // Cache navigasi halaman (SPA) - NetworkFirst
  workbox.routing.registerRoute(
    ({ request }) => request.mode === 'navigate',
    new workbox.strategies.NetworkFirst({
      cacheName: 'cinemagic-pages',
      networkTimeoutSeconds: 5,
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 24 * 60 * 60,
        }),
      ],
    }),
  );

  // Cache aset statis: CSS/JS - StaleWhileRevalidate
  workbox.routing.registerRoute(
    ({ request }) => ['style', 'script', 'worker'].includes(request.destination),
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'cinemagic-static',
    }),
  );

  // Hindari caching berkas HMR (hot-update) saat dev agar tidak memicu abort
  workbox.routing.registerRoute(
    ({ url }) => url.pathname.includes('hot-update'),
    new workbox.strategies.NetworkOnly({}),
  );

  // Cache gambar - CacheFirst
  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'image',
    new workbox.strategies.CacheFirst({
      cacheName: 'cinemagic-images',
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({ statuses: [0, 200] }),
        new workbox.expiration.ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 7 * 24 * 60 * 60 }),
      ],
    }),
  );

  // Cache API GET untuk stories - StaleWhileRevalidate
  workbox.routing.registerRoute(
    ({ url, request }) => request.method === 'GET' && url.pathname.includes('/stories'),
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'cinemagic-api-stories',
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({ statuses: [0, 200] }),
        new workbox.expiration.ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 60 }),
      ],
    }),
  );

  // Background Sync untuk POST /stories (upload cerita saat offline)
  const bgSyncPlugin = new workbox.backgroundSync.BackgroundSyncPlugin('story-upload-queue', {
    maxRetentionTime: 24 * 60, // menit
  });

  workbox.routing.registerRoute(
    ({ url, request }) => request.method === 'POST' && url.pathname.endsWith('/stories'),
    new workbox.strategies.NetworkOnly({
      plugins: [bgSyncPlugin],
    }),
    'POST',
  );

  // Opsional: fallback offline sederhana untuk navigasi jika jaringan gagal
  // (Diabaikan untuk saat ini; bisa ditambahkan halaman offline khusus.)
} else {
  // Fallback minimal bila Workbox tidak tersedia
  self.addEventListener('install', (event) => {
    self.skipWaiting();
  });
  self.addEventListener('activate', (event) => {
    self.clients.claim();
  });
}

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
    icon: payload.icon || 'images/logo.png',
    badge: payload.badge || 'images/logo.png',
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