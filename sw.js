const CACHE = 'finanzas-v2';
const ASSETS = ['/'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // Supabase siempre a la red
  if (e.request.url.includes('supabase.co')) return;
  // index.html siempre a la red, nunca desde caché
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => caches.match('/')));
    return;
  }
  // Resto: red primero, caché como fallback
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
