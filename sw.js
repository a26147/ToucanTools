// Toucan service worker: keeps the app working offline once it has loaded.
// Pages come from the network first, so an update shows the next time Toucan
// opens online; offline, the copy kept here opens instead.
const CACHE = 'toucan-v1';
const FILES = ['manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // The page that registered this worker is not under its control yet, so
      // keep a copy of it now; otherwise the first offline visit would fail.
      const pages = (
        await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      ).map(c => c.url.split('#')[0]);
      await Promise.allSettled(
        [...FILES, ...pages].map(u => cache.add(new Request(u, { cache: 'reload' }))),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    (async () => {
      for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      try {
        const res = await fetch(req);
        if (res.ok) await cache.put(req, res.clone());
        return res;
      } catch (err) {
        const hit =
          (await cache.match(req, { ignoreSearch: true })) ||
          (req.mode === 'navigate' ? await firstPage(cache) : null);
        if (hit) return hit;
        throw err;
      }
    })(),
  );
});

// Offline, any address of the app opens the copy of the page kept here.
async function firstPage(cache) {
  for (const r of await cache.keys()) {
    const p = new URL(r.url).pathname;
    if (p.endsWith('/') || p.endsWith('.html')) return cache.match(r);
  }
  return null;
}
