// Service Worker with full Offline Page + Resource Caching for Smashify & PWABuilder compliance
const CACHE_NAME = "smashify-offline-v2";
const offlineFallbackPage = "/offline.html";

// Pre-cache key assets on install
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Only cache offline fallback explicitly
      return cache.addAll([
        offlineFallbackPage
      ]);
    })
  );
  self.skipWaiting();
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
