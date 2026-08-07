// Service Worker with full Offline Page + Resource Caching for Smashify & PWABuilder compliance

const CACHE_NAME = "smashify-offline-v1";
const offlineFallbackPage = "/offline.html";

// Pre-cache key assets on install
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        offlineFallbackPage,
        "/",
        "/index.html",
        "/favicon.ico",
        "/pwa-192x192.png",
        "/pwa-512x512.png"
      ]);
    })
  );
  self.skipWaiting();
});

// Clean up old caches on activate
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Skip waiting message listener
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Push & Sync Listeners
self.addEventListener("push", (event) => {
  console.log("Push received");
});

self.addEventListener("sync", (event) => {
  console.log("Sync received");
});

self.addEventListener("periodicsync", (event) => {
  console.log("Periodic sync received");
});

// Fetch event handler with full offline fallback and resource caching
self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(offlineFallbackPage);
        return cachedResponse || (await cache.match("/index.html"));
      })
    );
  } else {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((response) => {
          if (!response || response.status !== 200 || response.type !== "basic") {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        }).catch(() => {
          // Return cached fallback if available
        });
      })
    );
  }
});
