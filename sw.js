const CACHE_NAME = 'farmacheck-v1';

// Archivos que se cachean para uso offline
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap'
];

// Instalación: cachea los archivos estáticos
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activación: elimina caches viejas
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch: estrategia según tipo de recurso
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // farmacheck.json → SIEMPRE red first (datos frescos), fallback a cache
  if (url.pathname.endsWith('farmacheck.json')) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          // Guarda la respuesta nueva en cache
          const resClone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, resClone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Todo lo demás → cache first, fallback a red
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(res => {
        if (res && res.status === 200) {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, resClone));
        }
        return res;
      });
    })
  );
});
