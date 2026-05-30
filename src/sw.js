var CACHE = 'kiro-3.0.1'
var URLS = [
  'css/base.css',
  'css/layout.css',
  'css/components.css',
  'css/themes.css',
  'css/mobile.css',
  'css/kiro.css',
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
  'js/search.js',
  'js/icons.js',
  'js/extras.js',
  'js/onboarding.js',
  'js/app.js',
  'assets/icons/app-icon-192.svg',
  'assets/icons/app-icon-512.svg',
  'assets/icons/app-icon-splash.svg',
  'assets/icons/ui/nav/chevron-down.svg',
  'assets/icons/ui/nav/chevron-up.svg',
  'assets/icons/ui/nav/arrow-right.svg',
  'assets/icons/ui/nav/ellipsis.svg',
  'assets/icons/ui/nav/ellipsis-vertical.svg',
  'assets/icons/ui/nav/panel-left.svg',
  'assets/icons/ui/nav/x.svg',
  'assets/icons/ui/nav/plus.svg',
  'assets/icons/ui/action/archive.svg',
  'assets/icons/ui/action/bookmark.svg',
  'assets/icons/ui/action/bookmark-fill.svg',
  'assets/icons/ui/action/check.svg',
  'assets/icons/ui/action/edit-3.svg',
  'assets/icons/ui/action/eye.svg',
  'assets/icons/ui/action/eye-off.svg',
  'assets/icons/ui/action/external-link.svg',
  'assets/icons/ui/action/folder.svg',
  'assets/icons/ui/action/folder-fill.svg',
  'assets/icons/ui/action/folder-plus.svg',
  'assets/icons/ui/action/link.svg',
  'assets/icons/ui/action/pin.svg',
  'assets/icons/ui/action/pin-off.svg',
  'assets/icons/ui/action/redo-2.svg',
  'assets/icons/ui/action/search.svg',
  'assets/icons/ui/action/settings.svg',
  'assets/icons/ui/action/trash-2.svg',
  'assets/icons/ui/action/undo-2.svg',
  'assets/icons/ui/action/circle-check.svg',
  'assets/icons/ui/action/circle-x.svg',
  'assets/icons/ui/media/file-video-2.svg',
  'assets/icons/ui/content/file-text.svg',
  'assets/icons/ui/content/file-text-fill.svg',
  'assets/icons/ui/content/list-checks.svg',
  'assets/icons/ui/content/list-todo.svg',
  'assets/icons/ui/content/sparkles.svg',
  'assets/icons/ui/view/layout-grid.svg',
  'assets/icons/ui/view/history.svg',
  'assets/icons/ui/view/moon-star.svg',
  'assets/icons/ui/view/star.svg',
  'assets/icons/ui/view/star-off.svg',
  'assets/icons/ui/space/rocket.svg',
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
