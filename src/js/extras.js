// ─── Patch notes ──────────────────────────────────────
function loadPatchNotes() {
  fetch('assets/changelog.json').then(r => r.json()).then(log => {
    document.getElementById('patchNotesList').innerHTML = log.map(u => `
      <div class="patch-entry">
        <div class="patch-version">${u.version} <span class="patch-date">${u.date}</span></div>
        <div class="patch-title">${u.title}</div>
        <ul class="patch-changes">${u.changes.map(c => `<li class="patch-change">${c}</li>`).join('')}</ul>
      </div>
    `).join('')
  }).catch(() => { document.getElementById('patchNotesList').innerHTML = '<p>Could not load patch notes.</p>' })
}

// ─── Keyboard shortcuts ────────────────────────────────
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'L') { e.preventDefault(); document.getElementById('ytInput').focus() }
  if ((e.metaKey || e.ctrlKey) && e.key === '=') { e.preventDefault(); document.getElementById('addBtn').click() }
  if ((e.metaKey || e.ctrlKey) && e.key === ',') { e.preventDefault(); settingsOverlay.classList.add('open') }
  if ((e.metaKey || e.ctrlKey) && e.key === 'f') { e.preventDefault(); document.getElementById('searchInput')?.focus() }
  if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) { e.preventDefault(); document.getElementById('searchInput')?.focus() }
  if (e.key === '?' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) { e.preventDefault(); document.getElementById('shortcutsOverlay').style.display = document.getElementById('shortcutsOverlay').style.display === 'none' ? 'flex' : 'none' }
})
document.getElementById('shortcutsClose').addEventListener('click', () => document.getElementById('shortcutsOverlay').style.display = 'none')
document.getElementById('shortcutsOverlay').addEventListener('click', (e) => { if (e.target === document.getElementById('shortcutsOverlay')) e.target.style.display = 'none' })

// ─── Debug inspect mode (hover) ────────────────────────
let debugOn = false
let debugHierarchy = false
let _listenersActive = false

function _ensureListeners() {
  if (_listenersActive) return
  document.addEventListener('mousemove', _onDebugMove)
  document.addEventListener('click', _onDebugClick)
  document.addEventListener('keydown', _onDebugKey)
  document.body.style.cursor = 'crosshair'
  _listenersActive = true
}

function _removeListeners() {
  if (!_listenersActive) return
  document.removeEventListener('mousemove', _onDebugMove)
  document.removeEventListener('click', _onDebugClick)
  document.removeEventListener('keydown', _onDebugKey)
  document.body.style.cursor = ''
  _listenersActive = false
}

function _clearDebugState() {
  _hideDebug()
  const badge = document.getElementById('__debug-badge')
  if (badge) badge.remove()
  document.querySelectorAll('[data-debug-locked]').forEach(el => {
    el.style.outline = ''
    el.style.outlineOffset = ''
    delete el.dataset.debugLocked
  })
  _debugTarget = null
  _lockedEl = null
}

function toggleDebugHierarchy() {
  if (debugOn) {
    debugOn = false
    if (_debugOverlay) _debugOverlay.style.display = 'none'
    if (_debugLabel) _debugLabel.style.display = 'none'
  }
  debugHierarchy = !debugHierarchy
  if (debugHierarchy) {
    _ensureListeners()
    _ensureDebugEls()
    if (_hierarchyPanel) _hierarchyPanel.style.display = 'block'
    _showBadge('Hierarchy — Esc to exit')
    if (_debugTarget) _updateHierarchyPanel(_lockedEl || _debugTarget, _colorForEl(_lockedEl || _debugTarget))
  } else {
    if (_hierarchyPanel) _hierarchyPanel.style.display = 'none'
    _removeListeners()
    _clearDebugState()
  }
}

function toggleDebug() {
  if (debugHierarchy) {
    debugHierarchy = false
    if (_hierarchyPanel) _hierarchyPanel.style.display = 'none'
    if (_debugOverlay) _debugOverlay.style.display = 'none'
    if (_debugLabel) _debugLabel.style.display = 'none'
  }
  debugOn = !debugOn
  if (debugOn) {
    _ensureListeners()
    _ensureDebugEls()
    _showBadge('Inspect active — Esc to exit')
  } else {
    _hideDebug()
    _removeListeners()
    _clearDebugState()
  }
}

function _showBadge(text) {
  let b = document.getElementById('__debug-badge')
  if (!b) {
    b = document.createElement('div')
    b.id = '__debug-badge'
    b.style.cssText = 'position:fixed;bottom:12px;right:12px;z-index:100001;font-size:11px;font-family:monospace;background:#ff453a;color:#fff;padding:4px 10px;border-radius:6px;line-height:1.3;pointer-events:none;opacity:0.9'
    document.body.appendChild(b)
  }
  b.textContent = text
}
const debugColorCache = new Map()
const DEBUG_PALETTE = [
  '#ff453a', '#ff9f0a', '#ffd60a', '#30d158', '#0a84ff',
  '#bf5af2', '#ff375f', '#64d2ff', '#ff6482', '#5e5ce6',
  '#ff6b6b', '#ffb340', '#00c7be', '#66d9e8', '#a284f0'
]
function hashColor(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h)
  return DEBUG_PALETTE[Math.abs(h) % DEBUG_PALETTE.length]
}
function debugLabelFor(el) {
  let titles = []
  const tag = el.tagName.toLowerCase()
  const id = el.id
  const classes = el.className && typeof el.className === 'string'
    ? el.className.split(' ').filter(c => c && !c.startsWith('__')).join('.') : ''
  const titleAttr = el.getAttribute('title')
  const placeholder = el.getAttribute('placeholder')
  const text = el.textContent && tag !== 'body' ? el.textContent.trim().substring(0, 40) : ''
  if (id) titles.push('#' + id)
  if (titleAttr) titles.push(titleAttr.substring(0, 40))
  if (placeholder) titles.push('[' + placeholder.substring(0, 30) + ']')
  if (!id && !titleAttr) {
    const dataKeys = ['video-id', 'bookmark-id', 'note-id', 'da-id', 'folder', 'action', 'theme', 'cat']
    for (const k of dataKeys) {
      const v = el.dataset[k]
      if (v) { titles.push(v.length > 25 ? v.substring(0, 25) + '…' : v); break }
    }
  }
  if (!titles.length && text.length < 50 && text.length > 0) titles.push(text)
  if (titles.length) return titles.join(' | ')
  if (classes) return tag + '.' + classes
  return tag
}
function getElementHierarchy(el) {
  const path = []
  let current = el
  while (current && current !== document.body) {
    let part = current.tagName.toLowerCase()
    if (current.id) part += '#' + current.id
    if (current.className && typeof current.className === 'string') {
      const classes = current.className.split(' ').filter(c => c && !c.startsWith('__'))
      if (classes.length) part += '.' + classes.slice(0, 2).join('.')
    }
    path.unshift(part)
    current = current.parentElement
  }
  return path.length > 6 ? '... ' + path.slice(-5).join(' > ') : path.join(' > ')
}

let _debugOverlay = null
let _debugLabel = null
let _hierarchyPanel = null
function _ensureDebugEls() {
  if (!_debugOverlay) {
    _debugOverlay = document.createElement('div')
    _debugOverlay.className = '__debug-overlay'
    _debugOverlay.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;pointer-events:none;z-index:99999;border:2px solid #ff453a;border-radius:4px;transition:all 0.05s;display:none'
    document.body.appendChild(_debugOverlay)
  }
  if (!_debugLabel) {
    _debugLabel = document.createElement('div')
    _debugLabel.className = '__debug-label'
    _debugLabel.style.cssText = 'position:fixed;pointer-events:none;z-index:100000;font-size:10px;font-family:monospace;background:#ff453a;color:#fff;padding:2px 6px;border-radius:4px;line-height:1.4;display:none'
    document.body.appendChild(_debugLabel)
  }
  if (!_hierarchyPanel) {
    _hierarchyPanel = document.createElement('div')
    _hierarchyPanel.className = '__debug-hierarchy'
    _hierarchyPanel.style.cssText = 'position:fixed;top:0;right:0;width:260px;height:100vh;z-index:100002;font-family:monospace;background:rgba(20,20,20,0.97);color:#fff;display:none;overflow-y:auto;border-left:1px solid rgba(255,255,255,0.08)'
    document.body.appendChild(_hierarchyPanel)
  }
}

function _showDebug(el, e) {
  _ensureDebugEls()
  const rect = el.getBoundingClientRect()
  const label = debugLabelFor(el)
  const displayName = label || el.tagName.toLowerCase()
  let color = debugColorCache.get(label)
  if (!color) { color = hashColor(label); debugColorCache.set(label, color) }

  _debugOverlay.style.cssText = `position:fixed;top:${rect.top}px;left:${rect.left}px;width:${rect.width}px;height:${rect.height}px;pointer-events:none;z-index:99999;border:2px solid ${color};border-radius:4px;background:${color}22;display:block`

  _debugLabel.textContent = displayName + ' — ' + el.tagName.toLowerCase()
  _debugLabel.style.background = color
  const lx = Math.min(e.clientX + 12, window.innerWidth - _debugLabel.offsetWidth - 8)
  const ly = Math.max(e.clientY - _debugLabel.offsetHeight - 8, 4)
  _debugLabel.style.display = 'block'
  _debugLabel.style.left = lx + 'px'
  _debugLabel.style.top = ly + 'px'
}

function _updateHierarchyPanel(el, color) {
  if (!_hierarchyPanel || !debugHierarchy) return
  const hierarchy = getElementHierarchy(el)
  const parts = hierarchy.split(' > ')
  _hierarchyPanel.innerHTML = `
    <div style="padding:16px;padding-bottom:60px">
      <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;opacity:0.4;margin-bottom:12px">Ancestry</div>
      ${parts.map((p, i) => `<div style="padding:3px 0;padding-left:${i*14}px;border-left:2px solid ${i === parts.length - 1 ? color : 'rgba(255,255,255,0.08)'};margin-bottom:1px;font-size:11px;${i === parts.length - 1 ? `color:${color};font-weight:600` : 'opacity:0.7'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p}</div>`).join('')}
      <div style="margin-top:12px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.08);font-size:10px;color:${color}">Click element to lock</div>
    </div>
  `
  _hierarchyPanel.style.display = 'block'
}

function _hideDebug() {
  if (_debugOverlay) _debugOverlay.style.display = 'none'
  if (_debugLabel) _debugLabel.style.display = 'none'
  if (_hierarchyPanel) _hierarchyPanel.style.display = 'none'
}

let _debugTarget = null
function _onDebugMove(e) {
  const el = document.elementFromPoint(e.clientX, e.clientY)
  if (!el || el === _debugTarget || el.closest('.__debug-overlay,.__debug-label,.__debug-hierarchy')) return
  _debugTarget = el
  if (debugOn) _showDebug(el, e)
  if (debugHierarchy && !_lockedEl) _updateHierarchyPanel(el, _colorForEl(el))
}

function _colorForEl(el) {
  const label = debugLabelFor(el)
  let color = debugColorCache.get(label)
  if (!color) { color = hashColor(label); debugColorCache.set(label, color) }
  return color
}

let _lockedEl = null
function _onDebugClick(e) {
  const el = document.elementFromPoint(e.clientX, e.clientY)
  if (!el || el.closest('.__debug-overlay,.__debug-label,.__debug-hierarchy')) return

  if (_lockedEl === el) {
    el.style.outline = ''
    el.style.outlineOffset = ''
    delete el.dataset.debugLocked
    _lockedEl = null
    const badge = document.getElementById('__debug-badge')
    if (badge) badge.textContent = debugHierarchy ? 'Hierarchy — Esc to exit' : 'Inspect active — Esc to exit'
    return
  }

  document.querySelectorAll('[data-debug-locked]').forEach(l => {
    l.style.outline = ''
    l.style.outlineOffset = ''
    delete l.dataset.debugLocked
  })

  _lockedEl = el
  const color = _colorForEl(el)
  el.style.outline = `3px solid ${color}`
  el.style.outlineOffset = '-2px'
  el.dataset.debugLocked = 'true'

  if (debugHierarchy) _updateHierarchyPanel(el, color)

  const selector = getElementHierarchy(el)
  console.log('%c[DEBUG] Selected element:', `color:${color};font-weight:bold`, el)
  console.log('Selector:', selector)

  if (navigator.clipboard) {
    navigator.clipboard.writeText(selector)
    const btn = document.getElementById('__debug-badge')
    if (btn) {
      const originalText = btn.textContent
      btn.textContent = 'Copied selector'
      btn.style.background = '#30d158'
      setTimeout(() => {
        btn.textContent = originalText
        btn.style.background = '#ff453a'
      }, 1500)
    }
  }
}

function _onDebugKey(e) {
  if (e.key === 'Escape') {
    if (debugHierarchy) { toggleDebugHierarchy(); return }
    if (debugOn) { toggleDebug(); return }
  }
}

// ─── Service worker update ────────────────────────────
if ('serviceWorker' in navigator) {
  let swUpdateTimer = null
  navigator.serviceWorker.register('sw.js').then(reg => {
    function showUpdateBanner(sw) {
      if (localStorage.getItem('ytSwVersion') === APP_VERSION) return
      const toast = document.getElementById('updateToast')
      const text = document.getElementById('updateToastText')
      const btn = document.getElementById('updateToastBtn')
      const laterBtn = document.getElementById('updateLaterBtn')
      if (!toast || !btn) return
      text.textContent = 'Update available'
      toast.classList.add('show')
      if (laterBtn) laterBtn.style.display = ''
      btn.onclick = () => {
        showSplashForUpdate()
        sw.postMessage({ action: 'skipWaiting' })
        btn.onclick = null
        text.textContent = 'Updating…'
        btn.style.display = 'none'
        if (laterBtn) laterBtn.style.display = 'none'
      }
      if (laterBtn) {
        laterBtn.onclick = () => {
          toast.classList.remove('show')
          if (swUpdateTimer) clearTimeout(swUpdateTimer)
          swUpdateTimer = setTimeout(() => {
            if (!toast.classList.contains('show')) {
              text.textContent = 'Update available'
              toast.classList.add('show')
            }
          }, 180000)
        }
      }
    }
    if (reg.waiting && localStorage.getItem('ytSwVersion') !== APP_VERSION) showUpdateBanner(reg.waiting)
    reg.addEventListener('updatefound', () => {
      const sw = reg.installing || reg.waiting
      if (!sw) return
      sw.addEventListener('statechange', () => {
        if (sw.state === 'installed' && navigator.serviceWorker.controller) {
          showUpdateBanner(sw)
        }
      })
    })
  })
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    localStorage.setItem('ytSwVersion', APP_VERSION)
    window.location.reload()
  })
}

// ─── History import on load ────────────────────────────
const history = loadHistory()
if (history.length) {
  const vs = getVideos(); const fs = getFolders()
  for (const h of history) { if (!vs[h.id]) vs[h.id] = { title: h.title, channel: h.channel, duration: '', added: Date.now() } }
  saveVideos(vs)
  if (!fs['Videos']) fs['Videos'] = []
  for (const h of history) { if (!fs['Videos'].includes(h.id)) fs['Videos'].push(h.id) }
  saveFolders(fs); renderSidebar()
}

// ─── Update check ──────────────────────────────────────
const lastSeen = localStorage.getItem('ytLastVersion')
if (lastSeen !== APP_VERSION) {
  fetch('assets/changelog.json').then(r => r.json()).then(log => {
    const updates = log.filter(e => {
      if (!lastSeen) return e.version === APP_VERSION
      const v = e.version.split('.').map(Number)
      const last = lastSeen.split('.').map(Number)
      return v[0] > last[0] || v[1] > last[1]
    })
    if (!updates.length) return
    const el = document.getElementById('updateBody')
    el.innerHTML = updates.map(u => `
      <div class="update-version">${u.version} — ${u.date}</div>
      <div class="update-title">${u.title}</div>
      <ul class="update-changes">${u.changes.map(c => `<li>${c}</li>`).join('')}</ul>
    `).join('')
    document.getElementById('updateOverlay').classList.add('open')
  }).catch(() => {})
  safeSetItem('ytLastVersion', APP_VERSION)
}
document.getElementById('updateCloseBtn').addEventListener('click', () => {
  document.getElementById('updateOverlay').classList.remove('open')
})

// ─── Online status indicator ──────────────────────────
;(function(){
  const ind = document.getElementById('onlineIndicator')
  if (!ind) return
  const text = ind.querySelector('.online-indicator-text')
  const title = document.getElementById('searchLandingTitle')
  const searchInput = document.getElementById('ytInput')
  const searchBtn = document.getElementById('ytBtn')
  function update() {
    const on = navigator.onLine
    const conn = navigator.connection
    let cls = 'offline', label = 'Offline'
    if (on) {
      const et = conn?.effectiveType
      if (et === '2g' || et === 'slow-2g') { cls = 'slow'; label = 'Slow' }
      else { cls = ''; label = 'Online' }
    }
    ind.className = 'online-indicator badge' + (cls ? ' ' + cls : '')
    if (text) text.textContent = label
    if (title) {
      if (!on) { title.textContent = "You're offline"; title.classList.add('offline') }
      else { title.textContent = 'What do you want to search?'; title.classList.remove('offline') }
    }
    if (searchInput) { searchInput.disabled = !on; searchInput.placeholder = on ? 'Paste YouTube link' : 'Search unavailable offline' }
    if (searchBtn) searchBtn.disabled = !on
  }
  window.addEventListener('online', update)
  window.addEventListener('offline', update)
  if (navigator.connection) navigator.connection.addEventListener('change', update)
  update()
})()
