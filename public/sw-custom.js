self.addEventListener('push', (event) => {
  console.log('Push received');
});

self.addEventListener('sync', (event) => {
  console.log('Sync received');
});

self.addEventListener('periodicsync', (event) => {
  console.log('Periodic sync received');
});
