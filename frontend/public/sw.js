const CACHE = 'pos-cache-v1';
const API_CACHE = 'pos-api-v1';
const POS_URLS = [
  '/admin/pos',
  '/admin/pos/sessions',
  '/admin/pos/z-report',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(POS_URLS)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE && k !== API_CACHE)
          .map((k) => caches.delete(k)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;

  if (url.pathname.startsWith('/admin/pos') && request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/admin/pos')),
    );
    return;
  }

  if (request.destination === 'style' || request.destination === 'script' || request.destination === 'font') {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((res) => {
        const clone = res.clone();
        caches.open(CACHE).then((cache) => cache.put(request, clone));
        return res;
      })),
    );
    return;
  }

  if (url.pathname.includes('/api/') && (url.pathname.includes('pos/products/search') || url.pathname.includes('categories'))) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone();
          caches.open(API_CACHE).then((cache) => cache.put(request, clone));
          return res;
        })
        .catch(() => caches.match(request)),
    );
    return;
  }
});
