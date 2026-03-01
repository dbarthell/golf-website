const CACHE_NAME = 'putt-calc-v22';
const FILES_TO_CACHE = [
  '/golf-website/',
  '/golf-website/index.html',
  '/golf-website/css/mobile.css',
  '/golf-website/js/mobile.js',
  '/golf-website/data/putting.json',
  '/golf-website/images/logo.png',
  '/golf-website/log.html',
  '/golf-website/css/log.css',
  '/golf-website/js/log.js',
  '/golf-website/full.html',
  '/golf-website/css/styles.css',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
