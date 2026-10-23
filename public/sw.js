/* Noor Suite service worker — app shell caching for installable PWA */
const CACHE = 'noor-suite-v1';
self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin.includes('supabase') || url.origin.includes('googleapis') || url.origin.includes('gstatic')) return;
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).then(r => {
      const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); return r;
    }).catch(() => caches.match(e.request).then(m => m || caches.match('./index.html'))));
    return;
  }
  e.respondWith(caches.match(e.request).then(m => {
    const fetchp = fetch(e.request).then(r => {
      if (r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); }
      return r;
    }).catch(() => m);
    return m || fetchp;
  }));
});
