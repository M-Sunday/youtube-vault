// Local Lucide icon loader
(function () {
  const ICON_PATH = 'icons/'

  function loadIcons(root) {
    const els = (root || document).querySelectorAll('[data-lucide]')
    els.forEach(el => {
      const name = el.getAttribute('data-lucide')
      if (!name) return
      fetch(ICON_PATH + name + '.svg')
        .then(r => r.text())
        .then(svg => {
          const div = document.createElement('div')
          div.innerHTML = svg
          const svgEl = div.querySelector('svg')
          if (!svgEl) return
          // Copy class and inline styles from placeholder
          const cls = el.getAttribute('class') || ''
          svgEl.setAttribute('class', cls)
          if (el.style.width) svgEl.setAttribute('width', el.style.width)
          if (el.style.height) svgEl.setAttribute('height', el.style.height)
          if (el.style.color) svgEl.style.color = el.style.color
          if (el.style.flexShrink) svgEl.style.flexShrink = el.style.flexShrink
          el.replaceWith(svgEl)
        })
        .catch(() => {})
    })
  }

  window.loadIcons = loadIcons

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => loadIcons())
  } else {
    loadIcons()
  }
})()
