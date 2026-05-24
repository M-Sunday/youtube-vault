// ─── Data ──────────────────────────────────────────────
function getVideos() { try { return JSON.parse(localStorage.getItem('ytVideos') || '{}') } catch { return {} } }
function saveVideos(v) { localStorage.setItem('ytVideos', JSON.stringify(v)) }
function getFolders() { try { return JSON.parse(localStorage.getItem('ytFolders') || '{"Videos":[],"Archived":[]}') } catch { return { Videos: [], Archived: [] } } }
function saveFolders(f) { localStorage.setItem('ytFolders', JSON.stringify(f)) }
function getFolderMeta() { try { return JSON.parse(localStorage.getItem('ytFolderMeta') || '{}') } catch { return {} } }
function saveFolderMeta(m) { localStorage.setItem('ytFolderMeta', JSON.stringify(m)) }
function getPins() { try { return JSON.parse(localStorage.getItem('ytPins') || '[]') } catch { return [] } }
function savePins(p) { localStorage.setItem('ytPins', JSON.stringify(p)) }

let currentVideo = null
let dragVideoId = null

// ─── Render sidebar ───────────────────────────────────
function renderSidebar() {
  const tree = document.getElementById('sidebarTree')
  const folders = getFolders()
  const meta = getFolderMeta()
  const videos = getVideos()
  const pins = getPins()
  const query = document.getElementById('searchInput').value.toLowerCase().trim()

  let html = ''
  for (const [name, ids] of Object.entries(folders)) {
    if (name === 'Archived' && !ids.length) continue
    const color = meta[name]?.color || ''
    const icon = name === 'Archived' ? 'archive' : 'folder'
    html += `<div class="tree-item expanded" data-folder="${name}"><div class="tree-folder" draggable="false"${color ? ` data-color="${color}" style="--folder-color:${color}"` : ''}><i data-lucide="chevron-down" class="tree-chevron"></i><i data-lucide="${icon}" class="tree-folder-icon"></i><span class="tree-label">${name}</span></div><div class="tree-children">`

    let entryIds = [...ids]
    // Pinned first
    const pinned = entryIds.filter(id => pins.includes(id))
    const unpinned = entryIds.filter(id => !pins.includes(id))
    entryIds = [...pinned, ...unpinned]

    for (const id of entryIds) {
      const v = videos[id]
      if (!v) continue
      if (query && !v.title.toLowerCase().includes(query) && !v.channel.toLowerCase().includes(query)) continue
      const isPinned = pins.includes(id)
      html += `<div class="tree-item" data-video-id="${id}" draggable="true"><div class="tree-file${currentVideo?.id === id ? ' active' : ''}${isPinned ? ' pinned' : ''}"><i data-lucide="file-video-2" class="tree-file-icon"></i><div class="tree-file-meta"><span class="tree-label">${v.title}</span><span class="tree-sublabel">${v.channel}</span></div></div></div>`
    }
    html += '</div></div>'
  }
  tree.innerHTML = html || `<div style="padding:20px;text-align:center;font-size:12px;color:#8e8e93">No videos yet.<br>Add one with the button above.</div>`
  lucide.createIcons()
  bindSidebarEvents()
}

function bindSidebarEvents() {
  document.querySelectorAll('.tree-item[data-folder]').forEach(item => {
    item.addEventListener('dragover', (e) => { e.preventDefault(); item.querySelector('.tree-folder')?.classList.add('drop-zone') })
    item.addEventListener('dragleave', () => item.querySelector('.tree-folder')?.classList.remove('drop-zone'))
    item.addEventListener('drop', (e) => {
      e.preventDefault(); item.querySelector('.tree-folder')?.classList.remove('drop-zone')
      const id = e.dataTransfer.getData('text/plain') || dragVideoId
      if (!id) return
      const folderName = item.dataset.folder
      if (!folderName) return
      const folders = getFolders()
      for (const ids of Object.values(folders)) { const idx = ids.indexOf(id); if (idx > -1) ids.splice(idx, 1) }
      if (!folders[folderName]) folders[folderName] = []
      if (!folders[folderName].includes(id)) folders[folderName].push(id)
      saveFolders(folders)
      renderSidebar()
    })
  })
  document.querySelectorAll('.tree-folder').forEach(f => {
    f.addEventListener('click', (e) => {
      if (e.target.closest('.folder-rename')) return
      f.closest('.tree-item')?.classList.toggle('expanded')
    })
  })

  document.querySelectorAll('.tree-file').forEach(file => {
    file.addEventListener('click', () => {
      const id = file.closest('[data-video-id]')?.dataset.videoId
      if (id && id !== 'placeholder') { const v = getVideos()[id]; if (v) loadVideoById(id) }
    })
  })

  document.querySelectorAll('.tree-item[draggable]').forEach(el => {
    el.addEventListener('dragstart', (e) => {
      dragVideoId = el.dataset.videoId
      e.dataTransfer.setData('text/plain', el.dataset.videoId)
      e.dataTransfer.effectAllowed = 'move'
    })
  })

  document.querySelectorAll('.tree-file').forEach(file => {
    file.addEventListener('contextmenu', (e) => {
      e.preventDefault()
      const entry = file.closest('.tree-item'), folder = file.closest('[data-folder]')
      showContextMenu(e.clientX, e.clientY, entry?.dataset.videoId, folder?.dataset.folder)
    })
  })
  document.querySelectorAll('.tree-folder').forEach(folder => {
    folder.addEventListener('contextmenu', (e) => {
      e.preventDefault()
      const item = folder.closest('[data-folder]')
      if (item && item.dataset.folder !== 'Videos' && item.dataset.folder !== 'Archived')
        showContextMenu(e.clientX, e.clientY, null, item.dataset.folder)
    })
  })
}

// ─── Context menu ─────────────────────────────────────
let ctxTarget = null, ctxFolder = null
function showContextMenu(x, y, videoId, folderName) {
  const menu = document.getElementById('ctxMenu')
  ctxTarget = videoId; ctxFolder = folderName
  menu.style.left = x + 'px'; menu.style.top = y + 'px'
  menu.classList.add('open')
  menu.querySelector('[data-action="rename-folder"]').style.display = videoId ? 'none' : ''
  menu.querySelector('[data-action="delete-folder"]').style.display = videoId ? 'none' : ''
  menu.querySelector('[data-action="archive"]').style.display = videoId ? '' : 'none'
  menu.querySelector('[data-action="pin"]').style.display = videoId ? '' : 'none'
  menu.querySelector('[data-action="delete"]').style.display = videoId ? '' : 'none'
  const showFolder = videoId === null || videoId === undefined
  document.getElementById('ctxDiv1').style.display = showFolder ? 'none' : videoId ? '' : 'none'
  if (videoId) {
    const pinItem = menu.querySelector('[data-action="pin"]')
    const isPinned = getPins().includes(videoId)
    pinItem.innerHTML = `<i data-lucide="pin" class="ctx-icon"></i> ${isPinned ? 'Unpin' : 'Pin'}`
    lucide.createIcons()
  }
}

document.addEventListener('click', () => document.getElementById('ctxMenu').classList.remove('open'))

document.querySelectorAll('.ctx-item').forEach(item => {
  item.addEventListener('click', () => {
    const a = item.dataset.action
    if (a === 'delete' && ctxTarget) {
      const fs = getFolders(); for (const ids of Object.values(fs)) { const i = ids.indexOf(ctxTarget); if (i > -1) ids.splice(i, 1) }
      saveFolders(fs); const vs = getVideos(); delete vs[ctxTarget]; saveVideos(vs)
      renderSidebar(); if (currentVideo?.id === ctxTarget) { currentVideo = null; clearCard() }
    }
    if (a === 'archive' && ctxTarget) {
      const fs = getFolders(); for (const ids of Object.values(fs)) { const i = ids.indexOf(ctxTarget); if (i > -1) ids.splice(i, 1) }
      if (!fs['Archived']) fs['Archived'] = []; fs['Archived'].push(ctxTarget); saveFolders(fs); renderSidebar()
    }
    if (a === 'pin') {
      const pins = getPins(); const idx = pins.indexOf(ctxTarget)
      if (idx > -1) pins.splice(idx, 1); else pins.push(ctxTarget)
      savePins(pins); renderSidebar()
    }
    if (a === 'rename-folder' && ctxFolder) {
      const label = document.querySelector(`[data-folder="${ctxFolder}"] .tree-label`)
      if (!label) return
      const old = label.textContent
      const input = document.createElement('input'); input.className = 'folder-rename'; input.value = old; input.autofocus = true
      label.replaceWith(input); input.focus(); input.select()
      const done = () => {
        const name = input.value.trim() || old; const fs = getFolders(); const meta = getFolderMeta()
        fs[name] = fs[old]; meta[name] = meta[old] || {}; delete fs[old]; delete meta[old]
        saveFolders(fs); saveFolderMeta(meta); renderSidebar()
      }
      input.addEventListener('blur', done)
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); if (e.key === 'Escape') { input.value = old; input.blur() } })
    }
    if (a === 'delete-folder' && ctxFolder) {
      const fs = getFolders(); const meta = getFolderMeta()
      if (!fs['Videos']) fs['Videos'] = []
      for (const id of (fs[ctxFolder] || [])) { if (!fs['Videos'].includes(id)) fs['Videos'].push(id) }
      delete fs[ctxFolder]; delete meta[ctxFolder]
      saveFolders(fs); saveFolderMeta(meta); renderSidebar()
    }
    document.getElementById('ctxMenu').classList.remove('open')
  })
})

// ─── Folder dialog ────────────────────────────────────
const folderDialog = document.getElementById('folderDialog')
const folderNameInput = document.getElementById('folderNameInput')

function createFolder() {
  const name = folderNameInput.value.trim()
  if (!name) return
  const color = document.querySelector('.folder-color.active')?.dataset.color || ''
  const fs = getFolders(); const meta = getFolderMeta()
  if (fs[name]) { folderNameInput.focus(); folderNameInput.select(); return }
  fs[name] = []; meta[name] = { color }
  saveFolders(fs); saveFolderMeta(meta); renderSidebar()
  folderDialog.classList.remove('open')
}

document.getElementById('newFolderBtn').addEventListener('click', () => {
  folderNameInput.value = ''
  document.querySelectorAll('.folder-color').forEach(c => c.classList.remove('active'))
  document.querySelector('.folder-color').classList.add('active')
  folderDialog.classList.add('open')
  setTimeout(() => folderNameInput.focus(), 100)
})
document.getElementById('folderDialogCancel').addEventListener('click', () => folderDialog.classList.remove('open'))
document.getElementById('folderDialogConfirm').addEventListener('click', createFolder)
folderNameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') createFolder(); if (e.key === 'Escape') folderDialog.classList.remove('open') })
document.querySelectorAll('.folder-color').forEach(c => c.addEventListener('click', function () {
  document.querySelectorAll('.folder-color').forEach(x => x.classList.remove('active')); this.classList.add('active')
}))
folderDialog.addEventListener('mousedown', (e) => { if (e.target === folderDialog) folderDialog.classList.remove('open') })

// ─── Sidebar toolbar ──────────────────────────────────
document.getElementById('pinBtn').addEventListener('click', function () { this.classList.toggle('pinned') })
document.getElementById('menuBtn').addEventListener('click', () => document.getElementById('sidebar').classList.toggle('closed'))
document.getElementById('searchInput').addEventListener('input', renderSidebar)

// ─── Load video ───────────────────────────────────────
function loadVideoById(id) {
  const v = getVideos()[id]; if (!v) return
  currentVideo = { ...v, id }
  document.getElementById('thumbnail').src = `https://img.youtube.com/vi/${id}/maxresdefault.jpg`
  document.getElementById('durationBadge').textContent = v.duration || '–'
  document.getElementById('videoTitle').textContent = v.title
  document.getElementById('channelName').textContent = v.channel
  if (v.pubDate) setPublishedDate(new Date(v.pubDate))
  updatePrivacy(v.privacy || 'PUBLIC')
  renderSidebar()
}

function clearCard() {
  document.getElementById('thumbnail').src = ''
  document.getElementById('durationBadge').textContent = '–'
  document.getElementById('videoTitle').textContent = 'Paste a YouTube link above'
  document.getElementById('channelName').textContent = ''
}

// ─── Thumbnail drag ────────────────────────────────────
const miniThumb = document.getElementById('miniThumb')
document.getElementById('imageWrap').addEventListener('mousedown', (e) => {
  if (!currentVideo || e.button !== 0 || !document.getElementById('thumbnail').src) return
  e.preventDefault()
  document.getElementById('miniImg').src = document.getElementById('thumbnail').src
  miniThumb.style.display = 'flex'
  miniThumb.style.left = (e.clientX - 60) + 'px'
  miniThumb.style.top = (e.clientY - 30) + 'px'
  dragVideoId = currentVideo.id

  const move = (ev) => {
    miniThumb.style.left = (ev.clientX - 60) + 'px'
    miniThumb.style.top = (ev.clientY - 30) + 'px'
    document.querySelectorAll('.tree-folder').forEach(f => {
      const r = f.getBoundingClientRect()
      f.classList.toggle('drop-zone', ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom)
    })
  }
  const up = (ev) => {
    miniThumb.style.display = 'none'
    document.querySelectorAll('.tree-folder').forEach(f => f.classList.remove('drop-zone'))
    document.removeEventListener('mousemove', move)
    document.removeEventListener('mouseup', up)
    const target = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('[data-folder]')
    if (!target || !dragVideoId) return
    const folderName = target.dataset.folder
    if (!folderName) return
    const fs = getFolders()
    for (const ids of Object.values(fs)) { const idx = ids.indexOf(dragVideoId); if (idx > -1) ids.splice(idx, 1) }
    if (!fs[folderName]) fs[folderName] = []
    if (!fs[folderName].includes(dragVideoId)) fs[folderName].push(dragVideoId)
    saveFolders(fs)
    renderSidebar()
  }
  document.addEventListener('mousemove', move)
  document.addEventListener('mouseup', up)
})

// ─── Add video ────────────────────────────────────────
document.getElementById('addBtn').addEventListener('click', () => {
  if (!currentVideo) { document.getElementById('videoTitle').textContent = 'Load a video first'; return }
  const { id, title, channel, duration, pubDate, privacy } = currentVideo
  const vs = getVideos()
  if (vs[id]) return
  vs[id] = { title, channel, duration, pubDate: pubDate?.toISOString(), privacy: privacy || 'PUBLIC', added: Date.now() }
  saveVideos(vs)
  const fs = getFolders()
  if (!fs['Videos']) fs['Videos'] = []
  if (!fs['Videos'].includes(id)) fs['Videos'].push(id)
  saveFolders(fs)
  renderSidebar()
  const t = document.querySelector('#pane-history .settings-toggle:first-child')
  if (t?.classList.contains('on')) { const h = loadHistory().filter(x => x.id !== id); h.unshift({ id, title, channel }); saveHistory(h) }
})

// ─── YouTube fetch ────────────────────────────────────
function getVideoId(url) {
  for (const r of [/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/, /^([a-zA-Z0-9_-]{11})$/]) { const m = url.match(r); if (m) return m[1] }
  return null
}
async function loadVideo(videoId) {
  document.getElementById('thumbnail').src = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
  document.getElementById('durationBadge').textContent = '...'
  document.getElementById('videoTitle').textContent = 'Loading...'; document.getElementById('channelName').textContent = ''
  try {
    const html = await (await fetch(`https://www.youtube.com/watch?v=${videoId}`)).text()
    const title = (html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/) || [])[1]?.replace(/&amp;/g, '&') || 'Unknown'
    const channel = (html.match(/<link\s+itemprop="name"\s+content="([^"]+)"/) || [])[1]?.replace(/&amp;/g, '&') || ''
    const sec = parseInt((html.match(/"lengthSeconds":"?(\d+)"?/) || [])[1] || '0')
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60
    const duration = sec ? (h ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` : `${m}:${String(s).padStart(2,'0')}`) : ''
    const dateStr = (html.match(/"uploadDate":"([^"]+)"/) || html.match(/<meta\s+itemprop="datePublished"\s+content="([^"]+)"/) || [])[1]
    const pubDate = dateStr ? new Date(dateStr) : null
    const privacy = (html.match(/"privacyStatus":"([^"]+)"/) || [])[1] || 'PUBLIC'
    currentVideo = { id: videoId, title, channel, duration, pubDate, privacy }
    document.getElementById('durationBadge').textContent = duration || '–'
    document.getElementById('videoTitle').textContent = title; document.getElementById('channelName').textContent = channel
    if (pubDate) setPublishedDate(pubDate)
    updatePrivacy(privacy)
    renderSidebar()
  } catch (e) { document.getElementById('durationBadge').textContent = '–'; document.getElementById('videoTitle').textContent = 'Could not load video info'; document.getElementById('channelName').textContent = 'Try again or check the link' }
}
document.getElementById('ytBtn').addEventListener('click', () => {
  const id = getVideoId(document.getElementById('ytInput').value.trim())
  if (id) loadVideo(id); else document.getElementById('videoTitle').textContent = 'Invalid YouTube link'
})
document.getElementById('ytInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') document.getElementById('ytBtn').click() })

// ─── Settings ─────────────────────────────────────────
const settingsOverlay = document.getElementById('settingsOverlay')
document.getElementById('settingsBtn').addEventListener('click', () => settingsOverlay.classList.add('open'))
document.getElementById('settingsClose').addEventListener('click', () => settingsOverlay.classList.remove('open'))
settingsOverlay.addEventListener('click', (e) => { if (e.target === settingsOverlay) settingsOverlay.classList.remove('open') })
document.querySelectorAll('.settings-cat').forEach(cat => {
  cat.addEventListener('click', function () {
    document.querySelectorAll('.settings-cat').forEach(c => c.classList.remove('active'))
    this.classList.add('active')
    document.querySelectorAll('.settings-pane').forEach(p => p.style.display = 'none')
    document.getElementById({ theme: 'pane-theme', basic: 'pane-basic', toolbar: 'pane-toolbar', files: 'pane-files', history: 'pane-history' }[this.dataset.cat]).style.display = 'block'
  })
})
document.querySelectorAll('.settings-toggle').forEach(t => t.addEventListener('click', function () { this.classList.toggle('on') }))
document.querySelectorAll('.theme-option').forEach(opt => {
  opt.addEventListener('click', function () {
    document.querySelectorAll('.theme-option').forEach(o => o.classList.remove('active'))
    this.classList.add('active')
    const t = this.dataset.theme; document.body.className = t === 'white' ? '' : 'theme-' + t
    localStorage.setItem('theme', t); document.getElementById('systemTheme').checked = false
  })
})
document.getElementById('systemTheme').addEventListener('change', function () {
  if (this.checked) { document.body.className = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'theme-obsidian' : ''; localStorage.setItem('theme', 'system') }
  else { const s = localStorage.getItem('theme') || 'white'; document.body.className = s === 'white' ? '' : 'theme-' + s }
})
const savedTheme = localStorage.getItem('theme') || 'white'
if (savedTheme === 'system') { document.getElementById('systemTheme').checked = true; document.body.className = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'theme-obsidian' : '' }
else if (savedTheme !== 'white') { document.body.className = 'theme-' + savedTheme; document.querySelector(`.theme-option[data-theme="${savedTheme}"]`)?.classList.add('active') }

document.querySelectorAll('#pane-toolbar .settings-toggle').forEach((t, i) => {
  t.addEventListener('click', function () {
    const on = this.classList.contains('on')
    if (i === 0) document.getElementById('menuBtn').style.display = on ? '' : 'none'
    else if (i === 1) document.querySelector('.top-bar-input').style.display = on ? '' : 'none'
    else if (i === 2) document.body.classList.toggle('compact', on)
  })
})
document.querySelectorAll('#pane-history .settings-toggle').forEach((t, i) => {
  t.addEventListener('click', function () { if (i === 0 && !this.classList.contains('on')) saveHistory([]) })
})
document.querySelector('.settings-clear-btn')?.addEventListener('click', () => {
  if (confirm('Clear all saved data?')) { localStorage.removeItem('ytVideos'); localStorage.removeItem('ytFolders'); localStorage.removeItem('ytFolderMeta'); localStorage.removeItem('linkHistory'); renderSidebar(); clearCard() }
})
window.addEventListener('beforeunload', () => { const t = document.querySelector('#pane-history .settings-toggle:last-child'); if (t?.classList.contains('on')) localStorage.removeItem('linkHistory') })

function loadHistory() { try { return JSON.parse(localStorage.getItem('linkHistory') || '[]') } catch { return [] } }
function saveHistory(h) { localStorage.setItem('linkHistory', JSON.stringify(h)) }

// ─── Calendar ──────────────────────────────────────────
const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December']
const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
let calMonth = new Date().getMonth(), calYear = new Date().getFullYear(), publishedDate = null
function renderCalendar() {
  const el = document.getElementById('calendar'), fd = new Date(calYear, calMonth, 1).getDay(), days = new Date(calYear, calMonth + 1, 0).getDate(), pd = new Date(calYear, calMonth, 0).getDate(), td = new Date()
  let h = `<div class="cal-header"><div class="cal-header-left"><h2>${monthNames[calMonth]} ${calYear}</h2></div><div class="cal-header-right"><span class="cal-privacy public" id="privacyBadge"><span class="dot"></span> Published</span><div class="cal-nav"><button id="prevMonth">‹</button><button id="nextMonth">›</button></div></div></div><div class="cal-grid">`
  dayNames.forEach(d => h += `<div class="cal-day-name">${d}</div>`)
  for (let i = fd - 1; i >= 0; i--) h += `<div class="cal-date other-month">${pd - i}</div>`
  for (let d = 1; d <= days; d++) { const isT = d === td.getDate() && calMonth === td.getMonth() && calYear === td.getFullYear(); const isP = publishedDate && d === publishedDate.getDate() && calMonth === publishedDate.getMonth() && calYear === publishedDate.getFullYear(); h += `<div class="cal-date${isT ? ' today' : ''}${isP ? ' published' : ''}">${d}</div>` }
  const r = (7 - ((fd + days) % 7)) % 7; for (let d = 1; d <= r; d++) h += `<div class="cal-date other-month">${d}</div>`
  h += '</div>'; el.innerHTML = h
  document.getElementById('prevMonth').addEventListener('click', () => { calMonth--; if (calMonth < 0) { calMonth = 11; calYear-- }; renderCalendar() })
  document.getElementById('nextMonth').addEventListener('click', () => { calMonth++; if (calMonth > 11) { calMonth = 0; calYear++ }; renderCalendar() })
  lucide.createIcons()
}
function setPublishedDate(d) { publishedDate = d; calMonth = d.getMonth(); calYear = d.getFullYear(); renderCalendar() }
function updatePrivacy(s) {
  const b = document.getElementById('privacyBadge'); if (!b) return
  const i = s === 'PUBLIC' ? { t: 'Public', c: 'public' } : s === 'UNLISTED' ? { t: 'Unlisted', c: 'unlisted' } : { t: 'Private', c: 'private' }
  b.className = 'cal-privacy ' + i.c; b.innerHTML = `<span class="dot"></span> ${i.t}`
}

// ─── Keyboard shortcuts ────────────────────────────────
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'L') { e.preventDefault(); document.getElementById('ytInput').focus() }
  if ((e.metaKey || e.ctrlKey) && e.key === '=') { e.preventDefault(); document.getElementById('addBtn').click() }
  if ((e.metaKey || e.ctrlKey) && e.key === ',') { e.preventDefault(); settingsOverlay.classList.add('open') }
})

// ─── Init ──────────────────────────────────────────────
lucide.createIcons(); renderCalendar(); renderSidebar()

const history = loadHistory()
if (history.length) {
  const vs = getVideos(); const fs = getFolders()
  for (const h of history) { if (!vs[h.id]) vs[h.id] = { title: h.title, channel: h.channel, duration: '', added: Date.now() } }
  saveVideos(vs)
  if (!fs['Videos']) fs['Videos'] = []
  for (const h of history) { if (!fs['Videos'].includes(h.id)) fs['Videos'].push(h.id) }
  saveFolders(fs); renderSidebar()
}

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js')
