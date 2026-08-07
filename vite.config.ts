import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      ViteImageOptimizer({
        png: { quality: 80 },
        jpeg: { quality: 80 },
        webp: { quality: 80 },
        avif: { quality: 70 },
      }),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: null,
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg', 'smashify-icon.svg', 'sw-custom.js', 'offline.html'],
        manifest: {
          name: 'Smashify',
          short_name: 'Smashify',
          id: '/',
          description: 'Music streaming and payment platform',
          theme_color: '#0a0a0a',
          background_color: '#0a0a0a',
          display: 'standalone',
          display_override: ['window-controls-overlay', 'tabbed', 'standalone', 'minimal-ui'] as any,
          orientation: 'portrait',
          dir: 'ltr',
          iarc_rating_id: 'e84b072d-71b3-4d3e-86ae-31a8ce4e53b7',
          categories: ['music', 'entertainment', 'lifestyle'],
          prefer_related_applications: false,
          related_applications: [
            {
              platform: 'play',
              url: 'https://play.google.com/store/apps/details?id=com.smashify',
              id: 'com.smashify'
            }
          ],
          // @ts-ignore
          note_taking: {
            new_note_url: '/'
          } as any,
          widgets: [
            {
              name: 'Smashify Widgets',
              description: 'Quick access to Smashify',
              tag: 'smashify-widget',
              template: 'widget.json',
              ms_ac_template: 'widget.json',
              data: 'widget-data.json',
              type: 'application/json',
              screenshots: [
                {
                  src: '/screenshot-1.png',
                  sizes: '1200x630',
                  label: 'Smashify Widget'
                }
              ],
              icons: [
                {
                  src: '/pwa-192x192.png',
                  sizes: '192x192',
                  type: 'image/png'
                }
              ]
            }
          ],
          launch_handler: {
            client_mode: 'navigate-existing'
          },
          protocol_handlers: [
            {
              protocol: 'web+smashify',
              url: '/?action=%s'
            }
          ],
          shortcuts: [
            {
              name: 'Discover',
              short_name: 'Discover',
              description: 'Discover new music',
              url: '/discover',
              icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }]
            },
            {
              name: 'Library',
              short_name: 'Library',
              description: 'Your music library',
              url: '/library',
              icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }]
            }
          ],
          // @ts-ignore
          edge_side_panel: {
            preferred_width: 400
          },
          share_target: {
            action: '/share',
            method: 'GET',
            params: {
              title: 'title',
              text: 'text',
              url: 'url'
            }
          },
          file_handlers: [
            {
              action: '/play',
              accept: {
                'audio/mpeg': ['.mp3'],
                'audio/wav': ['.wav'],
                'audio/ogg': ['.ogg']
              }
            }
          ],
          // @ts-ignore
          scope_extensions: [
            {
              origin: '*.smashifymusic.vercel.app'
            },
            {
              origin: '*.supabase.co'
            }
          ],
          // @ts-ignore
          tab_strip: {
            home_tab: 'auto',
            new_tab_button: {
              url: '/'
            }
          },
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ],
          screenshots: [
            {
              src: '/screenshot-1.png',
              sizes: '1280x720',
              type: 'image/png',
              form_factor: 'wide'
            },
            {
              src: '/screenshot-2.png',
              sizes: '750x1334',
              type: 'image/png',
              form_factor: 'narrow'
            }
          ]
        },
        workbox: {
          importScripts: ['/sw-custom.js'],
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          navigateFallback: '/index.html',
          runtimeCaching: [
            {
              // Stale-While-Revalidate for Supabase API / database rest requests
              urlPattern: /^https:\/\/akclwguqzeijscftatqp\.supabase\.co\/rest\/.*/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'supabase-api-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 7 // 1 week
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              // Cache-First strategy for Supabase storage (audio/images)
              urlPattern: /^https:\/\/akclwguqzeijscftatqp\.supabase\.co\/storage\/v1\/object\/public\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'supabase-storage-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              // Cache-First strategy for music cover and static images
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'image-cache',
                expiration: {
                  maxEntries: 150,
                  maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              // Cache-First strategy for font styles
              urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 30,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            }
          ]
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    esbuild: {
      drop: ['console', 'debugger'],
    },
    build: {
      target: ['es2020', 'chrome87', 'safari14'],
      cssTarget: 'chrome61',
      cssCodeSplit: true,
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react') && !id.includes('lucide-react') && !id.includes('framer-motion')) {
                return 'vendor-react';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }
              if (id.includes('@supabase') || id.includes('supabase')) {
                return 'vendor-supabase';
              }
              if (id.includes('motion') || id.includes('framer-motion')) {
                return 'vendor-animation';
              }
              if (id.includes('recharts') || id.includes('d3')) {
                return 'vendor-recharts';
              }
            }
          }
        }
      }
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
