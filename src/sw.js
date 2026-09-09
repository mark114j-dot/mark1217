// 畫聊 Doodle PWA Service Worker
// 使用 VitePWA injectManifest 注入的預快取清單，並保留 PWABuilder 的離線 fallback 邏輯。
// 不依賴外部 CDN，避免 Service Worker 因 Workbox 網路載入失敗而整個失效。

const CACHE_VERSION = "doodle-pwa-v2";
const RUNTIME_CACHE = "doodle-runtime-v2";
const OFFLINE_URL = "/offline.html";
const PRECACHE = self.__WB_MANIFEST || [];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE.map((entry) => typeof entry === "string" ? entry : entry.url)))
      .then(() => caches.open(RUNTIME_CACHE))
      .then((cache) => cache.add(OFFLINE_URL).catch(() => undefined))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

function isSameOrigin(request) {
  try { return new URL(request.url).origin === self.location.origin; }
  catch { return false; }
}

function isStaticAsset(request) {
  return /\.(?:js|css|woff2|png|jpg|jpeg|gif|svg|webp|ico)$/.test(new URL(request.url).pathname);
}

function isGameData(request) {
  return /\/rest\/v1\/(games|announcements)(?:\/|$)/.test(new URL(request.url).pathname);
}

async function networkFirst(request, cacheName, timeout = 5000) {
  const cache = await caches.open(cacheName);
  try {
    const response = await Promise.race([
      fetch(request),
      new Promise((_, reject) => setTimeout(() => reject(new Error("network-timeout")), timeout)),
    ]);
    if (response && response.ok) cache.put(request, response.clone()).catch(() => {});
    return response;
  } catch {
    return (await cache.match(request)) || (await cache.match(OFFLINE_URL));
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || !isSameOrigin(request)) return;

  const url = new URL(request.url);

  // Navigation: network first, then cached page, then PWABuilder-style offline page.
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, RUNTIME_CACHE, 5000));
    return;
  }

  // Static app assets: cache first for fast repeat visits.
  if (isStaticAsset(request)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        if (response.ok) caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, response.clone()));
        return response;
      }).catch(() => Response.error()))
    );
    return;
  }

  // Game metadata: network first so published games stay current, cache fallback offline.
  if (isGameData(request)) {
    event.respondWith(networkFirst(request, RUNTIME_CACHE, 5000));
  }
});
