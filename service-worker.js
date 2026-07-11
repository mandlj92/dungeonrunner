'use strict';

const CACHE_NAME = 'ashvault-build-11';
const CORE_ASSETS = [
  './', './index.html', './styles.css?v=11', './manifest.webmanifest?v=11',
  './game-core.js?v=11', './game-combat.js?v=11', './route-system.js?v=11',
  './pixel-assets.js?v=11', './game-render-v4.js?v=11', './gba-visuals.js?v=11',
  './gba-sprite-fix.js?v=11', './production-mobile.js?v=11',
  './release-enhancements.js?v=11', './viewport-hotfix.js?v=11'
];
self.addEventListener('install', (event) => { event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (event) => { event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(fetch(request).then((response) => {
    if (response && response.status === 200) {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
    }
    return response;
  }).catch(async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.mode === 'navigate') return caches.match('./index.html');
    throw new Error(`Offline asset unavailable: ${url.pathname}`);
  }));
});
