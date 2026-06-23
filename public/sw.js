// Minimal offline shell: cache static assets, network-first for pages.
const CACHE = 'tzl-v1';
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));
self.addEventListener('fetch', e => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.pathname.startsWith('/_next/static/') || url.pathname.match(/\.(png|jpg|svg|woff2?)$/)) {
    e.respondWith(
      caches.open(CACHE).then(async c => {
        const hit = await c.match(request);
        if (hit) return hit;
        const res = await fetch(request);
        if (res.ok) c.put(request, res.clone());
        return res;
      })
    );
  }
});
// Web push scaffold (Stage: future) — payload { title, body, url }
self.addEventListener('push', e => {
  const d = e.data?.json() ?? {};
  e.waitUntil(self.registration.showNotification(d.title ?? 'Techno Zone Lanka', {
    body: d.body ?? '', icon: '/icon.png', data: { url: d.url ?? '/' }
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data?.url ?? '/'));
});
