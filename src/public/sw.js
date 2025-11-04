/* eslint-disable no-undef */
// Service Worker dengan Workbox untuk caching dan Background Sync

// Muat Workbox dari CDN
importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

// Jika Workbox tersedia
if (self.workbox) {
  workbox.core.setCacheNameDetails({ prefix: 'cinemagic' });
  workbox.core.skipWaiting();
  workbox.core.clientsClaim();

  // Precaching untuk aset penting agar tersedia offline
  // Use relative paths to respect subpath scope (e.g., GitHub Pages)
  // Bump revisions to force cache invalidation
  workbox.precaching.precacheAndRoute([
    { url: './', revision: '3' },
    { url: './index.html', revision: '3' },
    { url: './app.bundle.js', revision: '3' },
    { url: './app.css', revision: '3' },
    { url: './manifest.webmanifest', revision: '3' },
    { url: './images/logo.png', revision: '3' },
    { url: './images/placeholder-movie.svg', revision: '3' },
    { url: './favicon.png', revision: '3' }
  ]);

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

  // Hindari caching berkas HMR (hot-update) dan webpack-dev-server saat dev agar tidak memicu abort
  workbox.routing.registerRoute(
    ({ url }) => url.pathname.includes('hot-update') || 
                url.pathname.endsWith('.hot-update.json') || 
                url.pathname.includes('webpack-dev-server') || 
                url.search.includes('ide_webview_request_time'),
    new workbox.strategies.NetworkOnly({
      plugins: [
        {
          // Plugin khusus untuk menangani error aborted request
          fetchDidFail: async ({ request }) => {
            // Biarkan error aborted terjadi tanpa mencoba cache
            console.log('Permintaan hot-update gagal, ini normal untuk HMR:', request.url);
          }
        }
      ]
    }),
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

  // Fallback offline untuk navigasi jika jaringan gagal
  workbox.routing.setCatchHandler(({ event }) => {
    if (event.request.destination === 'document') {
      return caches.match('./index.html');
    }

    if (event.request.destination === 'image') {
      return caches.match('./images/placeholder-movie.svg');
    }

    return Response.error();
  });
} else {
  // Fallback offline tanpa Workbox
  const PRECACHE = 'cinemagic-precache-v1';
  const RUNTIME_STATIC = 'cinemagic-static-runtime';
  const RUNTIME_IMAGES = 'cinemagic-images-runtime';

  // Use relative paths to respect subpath scope (e.g., GitHub Pages)
  const PRECACHE_URLS = [
    './',
    './index.html',
    './app.bundle.js',
    './manifest.webmanifest',
    './images/logo.png',
    './images/placeholder-movie.svg',
    './favicon.png',
  ];

  self.addEventListener('install', (event) => {
    event.waitUntil(
      caches.open(PRECACHE).then((cache) => cache.addAll(PRECACHE_URLS)).catch(() => {})
    );
    self.skipWaiting();
  });

  self.addEventListener('activate', (event) => {
    event.waitUntil(
      caches.keys().then((keys) => Promise.all(
        keys.filter((k) => ![PRECACHE, RUNTIME_STATIC, RUNTIME_IMAGES].includes(k))
            .map((k) => caches.delete(k))
      ))
    );
    self.clients.claim();
  });

  self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Hanya tangani permintaan asal yang sama
    if (url.origin !== self.location.origin) return;

    // Navigasi dokumen: fallback ke index.html saat offline
    if (request.mode === 'navigate') {
      event.respondWith(
        fetch(request).catch(() => caches.match('/index.html'))
      );
      return;
    }

    // Aset statis JS/CSS: stale-while-revalidate sederhana
    if (['script', 'style', 'worker'].includes(request.destination)) {
      event.respondWith(
        caches.open(RUNTIME_STATIC).then(async (cache) => {
          const cached = await cache.match(request);
          const networkFetch = fetch(request).then((res) => {
            if (res && res.status === 200) cache.put(request, res.clone());
            return res;
          }).catch(() => null);
          return cached || networkFetch || Response.error();
        })
      );
      return;
    }

    // Gambar: cache-first dengan placeholder saat offline
    if (request.destination === 'image') {
      event.respondWith(
        caches.open(RUNTIME_IMAGES).then(async (cache) => {
          const cached = await cache.match(request);
          if (cached) return cached;
          return fetch(request).then((res) => {
            if (res && res.status === 200) cache.put(request, res.clone());
            return res;
          }).catch(() => caches.match('./images/placeholder-movie.svg'));
        })
      );
      return;
    }
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