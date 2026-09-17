const CACHE = "habeshavoice-offline-v1";
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(["/offline.html","/favicon.svg"])));
  self.skipWaiting();
});
self.addEventListener("activate", event => {
  event.waitUntil(Promise.all([self.clients.claim(),caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("habeshavoice-offline-") && key !== CACHE).map(key => caches.delete(key))))]));
});
self.addEventListener("fetch", event => {
  // Private pages, API responses and recordings are never cached.
  if (event.request.mode === "navigate" && new URL(event.request.url).origin === self.location.origin) {
    event.respondWith(fetch(event.request).catch(() => caches.match("/offline.html")));
  }
});

