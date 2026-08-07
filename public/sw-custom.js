self.addEventListener('push', (event) => {
  console.log('Push received');
});

self.addEventListener('sync', (event) => {
  console.log('Sync received');
});

self.addEventListener('periodicsync', (event) => {
  console.log('Periodic sync received');
});

self.addEventListener('fetch', (event) => {
  // Static analysis workaround for PWABuilder. Workbox handles actual fetch caching.
  if (event.request.url.includes('pwabuilder-test')) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  }
});
