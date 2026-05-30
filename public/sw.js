// Basic Service Worker for Smashify PWA
const CACHE_NAME = 'smashify-cache-v3';
const AUDIO_CACHE_NAME = 'smashify-audio-cache-v1'
const MAX_AUDIO_CACHE = 10 // Only keep last 10 songs

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/smashify-icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
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

self.addEventListener('fetch', (event) => {
  const url = event.request.url

  // Cache audio files with cache-first strategy
  if (url.includes('.mp3') || url.includes('.m4a') || url.includes('.wav') ||
      url.includes('audio') || url.includes('supabase') && url.includes('storage')) {
    event.respondWith(
      caches.open(AUDIO_CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request)
        if (cached) return cached

        // Fetch and cache, but only cache full responses (not range requests)
        try {
          const response = await fetch(event.request.clone())
          if (response.ok && response.status === 200) {
            cache.put(event.request, response.clone())
            // Trim cache to MAX_AUDIO_CACHE entries
            cache.keys().then(keys => {
              if (keys.length > MAX_AUDIO_CACHE) {
                cache.delete(keys[0])
              }
            })
          }
          return response
        } catch {
          return cached || new Response('Offline', { status: 503 })
        }
      })
    )
    return
  }

  // Simple network-first strategy for most things
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // On successful fetch, clone and cache assets (js, css, images, fonts)
        const url = event.request.url;
        if (response.status === 200 && url.match(/\.(js|css|woff2?|png|jpg|jpeg|svg|webp)$/)) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

// Handle push notifications if needed in the future
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});
