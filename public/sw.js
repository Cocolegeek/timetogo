// Voyou service worker — bump CACHE when cached assets change (old caches are purged on activate).
const CACHE = 'voyou-v4';
const PRECACHE = ['/icons/icon.svg', '/icons/icon-192.png', '/manifest.json'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

const isImmutable = (url) =>
  url.pathname.startsWith('/_next/static/') ||
  url.pathname.startsWith('/avatars/') ||
  url.pathname.startsWith('/icons/') ||
  url.pathname.startsWith('/logo/');

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Supabase, Google photos…: browser default

  // Always network for API routes and auth flows.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) return;

  // Versioned / static assets: cache-first (instant, offline).
  if (isImmutable(url)) {
    e.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(request, copy));
            }
            return res;
          })
      )
    );
    return;
  }

  // Pages: network-first (auth redirects stay correct), cached copy when offline.
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok && res.type === 'basic' && !res.redirected) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/trips')))
    );
  }
});

// ─── Push notifications (payload: { title, body, url, tag }) ───
self.addEventListener('push', (e) => {
  let data = {};
  try {
    data = e.data ? e.data.json() : {};
  } catch {
    data = { body: e.data ? e.data.text() : '' };
  }
  e.waitUntil(
    self.registration.showNotification(data.title || 'Voyou', {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-96.png',
      tag: data.tag,
      renotify: !!data.tag,
      data: { url: data.url || '/trips' },
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || '/trips', self.location.origin).href;
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => w.url.startsWith(self.location.origin));
      if (open) return open.focus().then((w) => (w && 'navigate' in w ? w.navigate(url) : null));
      return self.clients.openWindow(url);
    })
  );
});
