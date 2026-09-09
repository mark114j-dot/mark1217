// 畫聊 Doodle custom PWA service worker
// Based on the uploaded PWABuilder offline service worker, with the
// existing game's caching strategy preserved.

importScripts("https://storage.googleapis.com/workbox-cdn/releases/5.1.2/workbox-sw.js");

const CACHE = "pwabuilder-page";
const offlineFallbackPage = "/offline.html";

// VitePWA injectManifest inserts the build precache manifest here.
workbox.precaching.precacheAndRoute(self.__WB_MANIFEST || []);

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.add(offlineFallbackPage))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

if (workbox.navigationPreload.isSupported()) {
  workbox.navigationPreload.enable();
}

// Offline fallback for page navigation, based on the uploaded PWABuilder SW.
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;

  event.respondWith(
    (async () => {
      try {
        const preloadResp = await event.preloadResponse;
        if (preloadResp) return preloadResp;

        return await fetch(event.request);
      } catch (error) {
        const cache = await caches.open(CACHE);
        return cache.match(offlineFallbackPage);
      }
    })()
  );
});

// Keep the existing Doodle caching behavior for assets, images and game data.
workbox.routing.registerRoute(
  ({ sameOrigin, request }) =>
    sameOrigin && request.destination === "document",
  new workbox.strategies.NetworkFirst({
    cacheName: "html-navigations",
    networkTimeoutSeconds: 5,
    plugins: [
      new workbox.cacheableResponse.CacheableResponsePlugin({ statuses: [0, 200] }),
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 60 * 24 * 30,
      }),
    ],
  })
);

workbox.routing.registerRoute(
  ({ sameOrigin, url }) =>
    sameOrigin && /\/assets\/|\.(?:js|css|woff2)$/.test(url.pathname),
  new workbox.strategies.CacheFirst({
    cacheName: "static-assets",
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 60 * 60 * 24 * 60,
      }),
    ],
  })
);

workbox.routing.registerRoute(
  ({ url, request }) =>
    request.method === "GET" && /\/rest\/v1\/(games|announcements)/.test(url.pathname),
  new workbox.strategies.NetworkFirst({
    cacheName: "game-data",
    networkTimeoutSeconds: 5,
    plugins: [
      new workbox.cacheableResponse.CacheableResponsePlugin({ statuses: [0, 200] }),
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24 * 30,
      }),
    ],
  })
);

workbox.routing.registerRoute(
  ({ request }) => request.destination === "image",
  new workbox.strategies.CacheFirst({
    cacheName: "images",
    plugins: [
      new workbox.cacheableResponse.CacheableResponsePlugin({ statuses: [0, 200] }),
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 60 * 60 * 24 * 30,
      }),
    ],
  })
);
