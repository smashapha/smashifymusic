const fs = require('fs');
let code = fs.readFileSync('vite.config.ts', 'utf8');

// 1. Add cleanupOutdatedCaches: true to workbox config
code = code.replace(
  `workbox: {
          importScripts: ['/sw-custom.js'],`,
  `workbox: {
          cleanupOutdatedCaches: true,
          importScripts: ['/sw-custom.js'],`
);

// 2. Reduce API cache maxAgeSeconds from 7 days to 5 minutes (300)
code = code.replace(
  /cacheName: 'supabase-api-cache',\s*expiration: {\s*maxEntries: 100,\s*maxAgeSeconds: 60 \* 60 \* 24 \* 7 \/\/ 1 week/g,
  `cacheName: 'supabase-api-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 300 // 5 minutes`
);

// 3. Update storage pattern to cover both object and render
code = code.replace(
  /urlPattern: \/\^https:\\\/\\\/akclwguqzeijscftatqp\\.supabase\\.co\\\/storage\\\/v1\\\/object\\\/public\\\/\.\*\/i/g,
  `urlPattern: /^https:\\\/\\\/akclwguqzeijscftatqp\\.supabase\\.co\\\/storage\\\/v1\\\/(object|render\\\/image)\\\/public\\\/.*/i`
);

fs.writeFileSync('vite.config.ts', code);
