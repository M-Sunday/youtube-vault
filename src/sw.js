var CACHE = 'yt-vault-1.4.0'
var URLS = [
  'index.html',
  'css/styles.css',
  'js/icons.js',
  'js/renderer.js',
  'assets/icons/app-icon-192.svg',
  'assets/icons/app-icon-512.svg',
  'assets/changelog.json',
  'assets/manifest.json'
]
self.addEventListener('message', function (e) {
  if (e.data && e.data.action === 'skipWaiting') self.skipWaiting()
})
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(URLS) }))
})
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== CACHE }).map(function (k) { return caches.delete(k) })) }))
  self.clients.claim()
})
self.addEventListener('fetch', function (e) {
  e.respondWith(caches.match(e.request).then(function (r) { return r || fetch(e.request) }))
})
