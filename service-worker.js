'use strict';

const CACHE_NAME = 'ashvault-build-12';
const CORE_ASSETS = [
  './', './index.html', './styles.css?v=12', './manifest.webmanifest?v=12',
  './game-core.js?v=12', './game-combat.js?v=12', './route-system.js?v=12',
  './pixel-assets.js?v=12', './game-render-v4.js?v=12', './gba-visuals.js?v=12',
  './gba-sprite-fix.js?v=12', './production-mobile.js?v=12',
  './release-enhancements.js?v=12', './viewport-hotfix.js?v=12',
  './authored-player-0.js?v=12', './authored-player-1.js?v=12', './authored-player-2.js?v=12',
  './authored-stalker-0.js?v=12', './authored-stalker-1.js?v=12',
  './authored-shooter-0.js?v=12', './authored-shooter-1.js?v=12',
  './authored-brute-0.js?v=12', './authored-brute-1.js?v=12',
  './authored-brute-2.js?v=12', './authored-brute-3.js?v=12',
  './authored-world-0.js?v=12', './authored-assets.js?v=12'
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
