const CACHE_NAME = 'jazal-prod-ready-v2-cache';
const V = 'jazal-prod-ready-v2';
const COVERS = ['old-door','river-secret','last-call','love-alley','hotel-17','case-qasr','jazal-talk','maqam-night','kids-night']
  .map(id => `./assets/covers/${id}.svg?v=${V}`);
const ASSETS = [
  './?v='+V,
  './index.html?v='+V,
  './styles.css?v='+V,
  './app.js?v='+V,
  './manifest.json?v='+V,
  './assets/icon.svg?v='+V,
  './assets/jazal-mark.svg?v='+V,
  './assets/jazal-demo.mp3',
  ...COVERS
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('./index.html?v='+V).then(r => r || caches.match('./index.html'))));
    return;
  }
  event.respondWith(fetch(request).then(response => {
    if (response && response.ok) {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
    }
    return response;
  }).catch(() => caches.match(request)));
});
