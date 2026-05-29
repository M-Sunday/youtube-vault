var CACHE = 'vault-2.0.1'
var URLS = [
  'css/base.css',
  'css/layout.css',
  'css/components.css',
  'css/themes.css',
  'css/mobile.css',
  'css/vault.css',
  'js/data.js',
  'js/views.js',
  'js/calendar.js',
  'js/settings.js',
  'js/sidebar.js',
  'js/context-menu.js',
  'js/notes.js',
  'js/dialogs.js',
  'js/grid.js',
  'js/card.js',
  'js/download.js',
  'js/search.js',
  'js/icons.js',
  'js/extras.js',
  'js/void-view.js',
  'js/onboarding.js',
  'js/app.js',
  'assets/icons/app-icon-192.svg',
  'assets/icons/app-icon-512.svg',
  'assets/icons/app-icon-splash.svg',
  'assets/icons/user-icon.svg',
  'assets/icons/ui/archive.svg',
  'assets/icons/ui/arrow-right.svg',
  'assets/icons/ui/astroid.svg',
  'assets/icons/ui/bookmark-fill.svg',
  'assets/icons/ui/bookmark.svg',
  'assets/icons/ui/check.svg',
  'assets/icons/ui/chevron-down.svg',
  'assets/icons/ui/chevron-up.svg',
  'assets/icons/ui/circle-check.svg',
  'assets/icons/ui/circle-x.svg',
  'assets/icons/ui/computer.svg',
  'assets/icons/ui/download.svg',
  'assets/icons/ui/edit-3.svg',
  'assets/icons/ui/ellipsis-vertical.svg',
  'assets/icons/ui/ellipsis.svg',
  'assets/icons/ui/external-link-fill.svg',
  'assets/icons/ui/external-link.svg',
  'assets/icons/ui/eye-off.svg',
  'assets/icons/ui/eye.svg',
  'assets/icons/ui/file-text-fill.svg',
  'assets/icons/ui/file-text.svg',
  'assets/icons/ui/file-video-2-fill.svg',
  'assets/icons/ui/file-video-2.svg',
  'assets/icons/ui/folder-fill.svg',
  'assets/icons/ui/folder-plus.svg',
  'assets/icons/ui/folder.svg',
  'assets/icons/ui/history.svg',
  'assets/icons/ui/layout-grid.svg',
  'assets/icons/ui/library.svg',
  'assets/icons/ui/lightbulb.svg',
  'assets/icons/ui/link.svg',
  'assets/icons/ui/list-checks.svg',
  'assets/icons/ui/list-todo.svg',
  'assets/icons/ui/moon-star.svg',
  'assets/icons/ui/orbit.svg',
  'assets/icons/ui/panel-left.svg',
  'assets/icons/ui/pin-off.svg',
  'assets/icons/ui/pin.svg',
  'assets/icons/ui/plus.svg',
  'assets/icons/ui/radar.svg',
  'assets/icons/ui/redo-2.svg',
  'assets/icons/ui/rocket.svg',
  'assets/icons/ui/satellite.svg',
  'assets/icons/ui/search.svg',
  'assets/icons/ui/settings.svg',
  'assets/icons/ui/sparkle.svg',
  'assets/icons/ui/sparkles.svg',
  'assets/icons/ui/star.svg',
  'assets/icons/ui/star-off.svg',
  'assets/icons/ui/telescope.svg',
  'assets/icons/ui/trash-2.svg',
  'assets/icons/ui/undo-2.svg',
  'assets/icons/ui/x.svg',
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
  e.respondWith(
    fetch(e.request).then(function (r) {
      return caches.open(CACHE).then(function (c) { c.put(e.request, r.clone()); return r })
    }).catch(function () { return caches.match(e.request) })
  )
})
