/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-5ccb27be'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "smashify-icon.svg",
    "revision": "0a21a7cc8345e84c2e578da077189852"
  }, {
    "url": "registerSW.js",
    "revision": "1872c500de691dce40960bb85481de07"
  }, {
    "url": "pwa-512x512.png",
    "revision": "70edfebaad6290aaf379866592a36046"
  }, {
    "url": "pwa-192x192.png",
    "revision": "9c1c733dddc85403d8a192e996e41ebd"
  }, {
    "url": "mask-icon.svg",
    "revision": "47242121213f596340184409de36eea3"
  }, {
    "url": "index.html",
    "revision": "0271ad8ef832297278f0f1e6deff12b4"
  }, {
    "url": "favicon.ico",
    "revision": "f9bfefa3e3f6bb10b0dca56f6c963e3c"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "0052805e1a6614897155b68a65f69f03"
  }, {
    "url": "assets/vendor-supabase-Cbasmoxk.js",
    "revision": null
  }, {
    "url": "assets/vendor-recharts-BS2VhshP.js",
    "revision": null
  }, {
    "url": "assets/vendor-react-LldWpXBE.js",
    "revision": null
  }, {
    "url": "assets/vendor-icons-DzQ_qQ9m.js",
    "revision": null
  }, {
    "url": "assets/vendor-animation-ULbptBA_.js",
    "revision": null
  }, {
    "url": "assets/layout-Dym8yIum.js",
    "revision": null
  }, {
    "url": "assets/index-a8-wlQC1.css",
    "revision": null
  }, {
    "url": "assets/index-Ck6aCeeo.js",
    "revision": null
  }, {
    "url": "assets/formatting-DPMaj0PK.js",
    "revision": null
  }, {
    "url": "assets/emailValidation-CLl2M2JZ.js",
    "revision": null
  }, {
    "url": "assets/Trending-DlpW3RCj.js",
    "revision": null
  }, {
    "url": "assets/Terms-CHgdUlzB.js",
    "revision": null
  }, {
    "url": "assets/SongCard-DnZ8oex3.js",
    "revision": null
  }, {
    "url": "assets/Profile-DgunNkHa.js",
    "revision": null
  }, {
    "url": "assets/Privacy-Cqx7ORqU.js",
    "revision": null
  }, {
    "url": "assets/Pricing-DQVfDEF8.js",
    "revision": null
  }, {
    "url": "assets/PlaylistDetails-BCAo6lZg.js",
    "revision": null
  }, {
    "url": "assets/PaymentFailed-4k3o7Ng4.js",
    "revision": null
  }, {
    "url": "assets/Notifications-CJ7Fi837.js",
    "revision": null
  }, {
    "url": "assets/MotoFeed-CYl5fJnF.js",
    "revision": null
  }, {
    "url": "assets/MainLayout-DL9ajIFP.js",
    "revision": null
  }, {
    "url": "assets/Library-CP53ePPw.js",
    "revision": null
  }, {
    "url": "assets/Home-zumYgRL4.js",
    "revision": null
  }, {
    "url": "assets/Help-B7oNKusQ.js",
    "revision": null
  }, {
    "url": "assets/Discover-9WAnHkI2.js",
    "revision": null
  }, {
    "url": "assets/Avatar-B_zyj2Zs.js",
    "revision": null
  }, {
    "url": "assets/AuthListener-Dx2I0H92.js",
    "revision": null
  }, {
    "url": "assets/AuthArtist-CUwC3kNV.js",
    "revision": null
  }, {
    "url": "assets/ArtistProfile-DwYUPF8O.js",
    "revision": null
  }, {
    "url": "assets/ArtistLanding-6UlyWAp_.js",
    "revision": null
  }, {
    "url": "assets/ArtistHub-CKJbJ2uj.js",
    "revision": null
  }, {
    "url": "assets/ArtistGuide-CzDNdTBB.js",
    "revision": null
  }, {
    "url": "assets/ApplicationPending-ByANlhcg.js",
    "revision": null
  }, {
    "url": "assets/AlbumDetails-DLgo8AHf.js",
    "revision": null
  }, {
    "url": "assets/Admin-D6wP_YQa.js",
    "revision": null
  }, {
    "url": "assets/About-4G1COa6X.js",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "0052805e1a6614897155b68a65f69f03"
  }, {
    "url": "favicon.ico",
    "revision": "f9bfefa3e3f6bb10b0dca56f6c963e3c"
  }, {
    "url": "mask-icon.svg",
    "revision": "28427038b560d0aabe3fbc35aea2c012"
  }, {
    "url": "pwa-192x192.png",
    "revision": "9c1c733dddc85403d8a192e996e41ebd"
  }, {
    "url": "pwa-512x512.png",
    "revision": "70edfebaad6290aaf379866592a36046"
  }, {
    "url": "smashify-icon.svg",
    "revision": "cb4f377767664d31a01ba4cf073e1129"
  }, {
    "url": "manifest.webmanifest",
    "revision": "fc520b80593de0ece32fd156e65172dd"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));
  workbox.registerRoute(/^https:\/\/akclwguqzeijscftatqp\.supabase\.co\/rest\/.*/i, new workbox.StaleWhileRevalidate({
    "cacheName": "supabase-api-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 100,
      maxAgeSeconds: 604800
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/i, new workbox.CacheFirst({
    "cacheName": "image-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 150,
      maxAgeSeconds: 2592000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "google-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 30,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');

}));
