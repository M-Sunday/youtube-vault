var ICON_SUBDIRS = ['nav/', 'action/', 'media/', 'content/', 'view/', 'space/', '']

function loadIcons(root) {
  var els = (root || document).querySelectorAll('[data-lucide]')
  els.forEach(function (el) {
    var name = el.getAttribute('data-lucide')
    if (!name) return
    tryFetch(el, name, 0)
  })
}

function tryFetch(el, name, i) {
  if (i >= ICON_SUBDIRS.length) return
  var base = 'assets/icons/ui/' + ICON_SUBDIRS[i]
  fetch(base + name + '.svg').then(function (r) {
    if (!r.ok) throw new Error()
    return r.text()
  }).then(function (svg) {
    var div = document.createElement('div')
    div.innerHTML = svg
    var svgEl = div.querySelector('svg')
    if (!svgEl) return
    svgEl.setAttribute('class', el.getAttribute('class') || '')
    if (el.style.width) svgEl.setAttribute('width', el.style.width)
    if (el.style.height) svgEl.setAttribute('height', el.style.height)
    if (el.style.color) svgEl.style.color = el.style.color
    if (el.style.flexShrink) svgEl.style.flexShrink = el.style.flexShrink
    el.replaceWith(svgEl)
  }).catch(function () { tryFetch(el, name, i + 1) })
}

window.loadIcons = loadIcons

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function () { loadIcons() })
} else {
  loadIcons()
}
