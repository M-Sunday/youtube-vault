const CACHE = 'vault-v1'
const ASSETS = ['/', '/index.html', '/css/styles.css', '/js/renderer.js', '/js/icons.js', '/manifest.json', '/icon-192.svg', '/icon-512.svg']

self.addEventListener('install', e => {
  self.skipWaiting()
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)))
})

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))))
  self.clients.claim()
})

self.addEventListener('fetch', e => {
  e.respondWith((async () => {
    const r = await caches.match(e.request)
    if (r) return r
    const res = await fetch(e.request)
    if (res.ok && res.type === 'basic') {
      const c = await caches.open(CACHE)
      c.put(e.request, res.clone())
    }
    return res
  })())
})
