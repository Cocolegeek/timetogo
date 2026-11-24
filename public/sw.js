// Voyou service worker: bump CACHE when cached assets change (old caches are purged on activate).
const CACHE = 'voyou-v5';
// App screens (HTML shells). Cleared on sign-out by the page (caches.delete(PAGES)).
const PAGES = 'voyou-pages-v1';
const PRECACHE = ['/icons/icon.svg', '/icons/icon-192.png', '/manifest.json'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== PAGES).map((k) => caches.delete(k))))
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

  // App screens: the last saved version shows at once (instant launch), the network copy
  // refreshes it in the background. Other pages (login, join links…) stay network-first.
  if (request.mode === 'navigate') {
    e.respondWith(isAppScreen(url) ? staleWhileRevalidate(e, request) : networkFirst(request));
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

function isAppScreen(url) {
  return url.pathname === '/trips' || url.pathname.startsWith('/trips/') || url.pathname.startsWith('/settings');
}

/** Script URLs of a Next build: they change with every deployment. */
async function buildSignature(res) {
  const html = await res.clone().text();
  return (html.match(/\/_next\/static\/[^"' ]+\.js/g) || []).sort().join('|');
}

async function staleWhileRevalidate(e, request) {
  const cache = await caches.open(PAGES);
  const cached = await cache.match(request);
  const network = fetch(request).then(async (res) => {
    if (res.ok && res.type === 'basic' && !res.redirected) {
      // Fresh copy from the cache (the one handed to the page has its body consumed).
      const previous = cached ? await cache.match(request) : null;
      if (previous && (await buildSignature(previous)) !== (await buildSignature(res))) {
        // New deployment: every saved screen is outdated; tell the open app.
        for (const key of await cache.keys()) await cache.delete(key);
        const windows = await self.clients.matchAll({ type: 'window' });
        windows.forEach((w) => w.postMessage({ type: 'voyou:new-version' }));
      }
      await cache.put(request, res.clone());
    } else {
      // Redirect (signed out, consent…) or error: never serve this copy again.
      await cache.delete(request);
    }
    return res;
  });
  if (cached) {
    e.waitUntil(network.catch(() => null));
    return cached;
  }
  return network.catch(async () => (await caches.match('/trips')) || Response.error());
}

function networkFirst(request) {
  return fetch(request).catch(async () => (await caches.match(request)) || (await caches.match('/trips')) || Response.error());
}
