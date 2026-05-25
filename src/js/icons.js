function loadIcons(root) {
  var els = (root || document).querySelectorAll('[data-lucide]')
  var base = 'assets/icons/ui/'
  els.forEach(function (el) {
    var name = el.getAttribute('data-lucide')
    if (!name) return
    fetch(base + name + '.svg').then(function (r) { return r.text() }).then(function (svg) {
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
    }).catch(function () {})
  })
}

window.loadIcons = loadIcons

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function () { loadIcons() })
} else {
  loadIcons()
}
