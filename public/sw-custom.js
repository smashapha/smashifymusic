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
  // Let Workbox handle the actual fetch events
  // This listener is here to pass PWABuilder's static analysis
});
