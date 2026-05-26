// ─── Data ──────────────────────────────────────────────
function getVideos() { try { return JSON.parse(localStorage.getItem('ytVideos') || '{}') } catch { return {} } }
function saveVideos(v) { safeSetItem('ytVideos', JSON.stringify(v)) }
function getFolders() { try { return JSON.parse(localStorage.getItem('ytFolders') || '{"Videos":[],"Archived":[]}') } catch { return { Videos: [], Archived: [] } } }
function saveFolders(f) { safeSetItem('ytFolders', JSON.stringify(f)) }
function getFolderMeta() { try { return JSON.parse(localStorage.getItem('ytFolderMeta') || '{}') } catch { return {} } }
function saveFolderMeta(m) { safeSetItem('ytFolderMeta', JSON.stringify(m)) }
function getPins() { try { return JSON.parse(localStorage.getItem('ytPins') || '[]') } catch { return [] } }
function savePins(p) { safeSetItem('ytPins', JSON.stringify(p)) }
function getBookmarks() { try { return JSON.parse(localStorage.getItem('ytBookmarks') || '[]') } catch { return [] } }
function saveBookmarks(b) { safeSetItem('ytBookmarks', JSON.stringify(b)) }
function getDirectAccess() { try { return JSON.parse(localStorage.getItem('ytDirectAccess') || '[]') } catch { return [] } }
function saveDirectAccess(d) { safeSetItem('ytDirectAccess', JSON.stringify(d)) }
function getNSFW() { try { return JSON.parse(localStorage.getItem('ytNSFW') || '[]') } catch { return [] } }
function saveNSFW(n) { safeSetItem('ytNSFW', JSON.stringify(n)) }
function getBlurAllNSFW() { return localStorage.getItem('ytBlurAllNSFW') === 'true' }
function saveBlurAllNSFW(v) { safeSetItem('ytBlurAllNSFW', v ? 'true' : 'false') }
function isNSFW(url) {
  try {
    if (!getBlurAllNSFW()) return false
    let fullUrl = url
    if (!/^https?:\/\//i.test(url)) {
      fullUrl = 'https://' + url.replace(/^\/+/, '')
    }
    const domain = new URL(fullUrl).hostname.replace(/^www\./, '').toLowerCase()
    return getNSFW().some(n => domain === n || domain.endsWith('.' + n))
  } catch { return false }
}
let selectedGridItems = new Set()
function updateBatchBar() {
  const bar = document.getElementById('batchBar')
  const count = document.getElementById('batchCount')
  const len = selectedGridItems.size
  if (len) { bar.style.display = 'flex'; count.textContent = len + ' selected' }
  else { bar.style.display = 'none' }
}
function getNotes() { try { return JSON.parse(localStorage.getItem('ytNotes') || '[]') } catch { return [] } }
function saveNotes(n) { safeSetItem('ytNotes', JSON.stringify(n)) }
function stripHtml(str) { return str.replace(/<[^>]*>/g, '') }
function getCollapsed() { try { return JSON.parse(localStorage.getItem('ytCollapsed') || '{}') } catch { return {} } }
function saveCollapsed(c) { safeSetItem('ytCollapsed', JSON.stringify(c)) }
function safeSetItem(key, val) { try { localStorage.setItem(key, val) } catch (e) { if (e.name === 'QuotaExceededError') { const t = document.getElementById('updateToast'); t.textContent = 'Storage full — clear some data'; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 3000) } } }
function sanitizeHtml(str) {
  const allowed = /^(b|i|u|em|strong|a|br|p|ul|ol|li|span|div|h[1-6]|pre|code|blockquote|img)$/i
  str = str.replace(/<script[\s\S]*?<\/script>/gi, '')
  str = str.replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
  str = str.replace(/\shref\s*=\s*["']javascript:[^"']*["']/gi, '')
  str = str.replace(/<[^>]*>/g, function(m) {
    const inner = m.slice(1, -1).trim()
    if (inner.startsWith('/')) {
      const tag = inner.slice(1).split(/\s/)[0]
      return allowed.test(tag) ? m : ''
    }
    const tag = inner.split(/\s/)[0]
    if (!allowed.test(tag)) return ''
    return m
  })
  return str
}

let currentVideo = null
let dragVideoId = null
let currentNoteId = null

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
    const hasContents = ids.length || getNotes().filter(n => n.folder === name).length
    const icon = name === 'Archived' ? 'archive' : (hasContents ? 'folder-fill' : 'folder')
    const collapsed = getCollapsed()
    const isCollapsed = collapsed['folder:' + name]
    html += `<div class="tree-item ${isCollapsed ? '' : 'expanded'}" data-folder="${name}"><div class="tree-folder" draggable="false"${color ? ` data-color="${color}" style="--folder-color:${color}"` : ''}><i data-lucide="chevron-down" class="tree-chevron"></i><i data-lucide="${icon}" class="tree-folder-icon"></i><span class="tree-label">${name}</span></div><div class="tree-children">`

    let entryIds = [...ids]
    const pinned = entryIds.filter(id => pins.includes(id))
    const unpinned = entryIds.filter(id => !pins.includes(id))
    entryIds = [...pinned, ...unpinned]

    for (const id of entryIds) {
      const v = videos[id]
      if (!v) continue
      if (query && !v.title.toLowerCase().includes(query) && !v.channel.toLowerCase().includes(query)) continue
      const isPinned = pins.includes(id)
      html += `<div class="tree-item" data-video-id="${id}" draggable="true"><div class="tree-file${currentVideo?.id === id ? ' active' : ''}${isPinned ? ' pinned' : ''}"><i data-lucide="file-video-2" class="tree-file-icon"></i><div class="tree-file-meta"><span class="tree-label">${v.title}</span><span class="tree-sublabel">${v.channel}</span></div><button class="tree-file-btn"><i data-lucide="ellipsis-vertical" style="width:14px;height:14px"></i></button></div></div>`
    }
    for (const n of getNotes()) {
      if (n.folder !== name) continue
      if (query && !n.title.toLowerCase().includes(query)) continue
      const preview = stripHtml(n.content || '').replace(/\n/g, ' ').substring(0, 50)
      html += `<div class="tree-item" data-note-id="${n.id}" draggable="true"><div class="tree-file"><i data-lucide="file-text" class="tree-file-icon"></i><div class="tree-file-meta"><span class="tree-label">${n.title || 'Untitled'}</span><span class="tree-sublabel">${preview}${stripHtml(n.content || '').length > 50 ? '…' : ''}</span></div><button class="tree-file-btn"><i data-lucide="ellipsis-vertical" style="width:14px;height:14px"></i></button></div></div>`
    }
    html += '</div></div>'
  }
  const bookmarks = getBookmarks()
  if (bookmarks.length) {
    const bmCollapsed = getCollapsed()['section:bookmarks']
    html += `<div class="tree-item ${bmCollapsed ? '' : 'expanded'}" data-bookmarks="true"><div class="tree-folder" draggable="false"><i data-lucide="chevron-down" class="tree-chevron"></i><i data-lucide="bookmark-fill" class="tree-folder-icon"></i><span class="tree-label">Bookmarks</span></div><div class="tree-children">`
    for (const bm of bookmarks) {
      if (query && !bm.title.toLowerCase().includes(query) && !bm.url.toLowerCase().includes(query)) continue
      const bmNsfw = isNSFW(bm.url) || bm.blurred
      html += `<div class="tree-item" data-bookmark-id="${bm.id}" draggable="true"><div class="tree-file"><div class="bm-thumb-wrap">${bm.image ? `<img class="bm-thumb${bmNsfw ? ' nsfw-blur' : ''}" src="${bm.image}" onerror="this.style.display='none'" />` : `<i data-lucide="external-link" class="tree-file-icon" style="margin:4px"></i>`}</div><div class="tree-file-meta"><span class="tree-label">${bm.title || bm.url}</span><span class="tree-sublabel">${bm.url}</span></div><button class="tree-file-btn"><i data-lucide="ellipsis-vertical" style="width:14px;height:14px"></i></button></div></div>`
    }
    html += '</div></div>'
  }
  const notes = getNotes().filter(n => !n.folder)
  if (notes.length) {
    const nCollapsed = getCollapsed()['section:notes']
    html += `<div class="tree-item ${nCollapsed ? '' : 'expanded'}" data-notes="true"><div class="tree-folder" draggable="false"><i data-lucide="chevron-down" class="tree-chevron"></i><i data-lucide="file-text-fill" class="tree-folder-icon"></i><span class="tree-label">Notes</span></div><div class="tree-children">`
    for (const n of notes) {
      if (query && !n.title.toLowerCase().includes(query)) continue
      const preview = stripHtml(n.content || '').replace(/\n/g, ' ').substring(0, 50)
      html += `<div class="tree-item" data-note-id="${n.id}" draggable="true"><div class="tree-file"><i data-lucide="file-text" class="tree-file-icon"></i><div class="tree-file-meta"><span class="tree-label">${n.title || 'Untitled'}</span><span class="tree-sublabel">${preview}${stripHtml(n.content || '').length > 50 ? '…' : ''}</span></div><button class="tree-file-btn"><i data-lucide="ellipsis-vertical" style="width:14px;height:14px"></i></button></div></div>`
    }
    html += '</div></div>'
  }
  const da = getDirectAccess()
  if (da.length) {
    const daCollapsed = getCollapsed()['section:directaccess']
    html += `<div class="tree-item ${daCollapsed ? '' : 'expanded'}" data-directaccess="true"><div class="tree-folder" draggable="false"><i data-lucide="chevron-down" class="tree-chevron"></i><i data-lucide="link" class="tree-folder-icon"></i><span class="tree-label">Direct Access</span></div><div class="tree-children">`
    for (const d of da) {
      if (query && !d.title.toLowerCase().includes(query) && !d.url.toLowerCase().includes(query)) continue
      const nsfw = isNSFW(d.url) || d.blurred
      html += `<div class="tree-item" data-da-id="${d.id}" draggable="true"><div class="tree-file"><div class="bm-thumb-wrap">${d.image ? `<img class="bm-thumb${nsfw ? ' nsfw-blur' : ''}" src="${d.image}" onerror="this.style.display='none'" />` : `<i data-lucide="external-link" class="tree-file-icon" style="margin:4px"></i>`}</div><div class="tree-file-meta"><span class="tree-label">${d.title}</span><span class="tree-sublabel">${d.url}</span></div><button class="tree-file-btn"><i data-lucide="ellipsis-vertical" style="width:14px;height:14px"></i></button></div></div>`
    }
    html += '</div></div>'
  }
  tree.innerHTML = html || `<div style="padding:20px;text-align:center;font-size:12px;color:#8e8e93">No videos yet.<br>Add one with the button above.</div>`
  loadIcons()
  bindSidebarEvents()
  if (document.getElementById('gridView').classList.contains('open')) renderGridView()
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
      for (const ids of Object.values(folders)) {
        const idx = ids.indexOf(id)
        if (idx > -1) ids.splice(idx, 1)
      }
      if (!folders[folderName]) folders[folderName] = []
      if (!folders[folderName].includes(id)) folders[folderName].push(id)
      saveFolders(folders)
      renderSidebar()
    })
  })
  document.querySelectorAll('.tree-folder').forEach(f => {
    f.addEventListener('click', (e) => {
      if (e.target.closest('.folder-rename')) return
      const item = f.closest('.tree-item')
      if (!item) return
      const collapsed = getCollapsed()
      const folder = item.dataset.folder
      const bm = item.dataset.bookmarks
      const nt = item.dataset.notes
      const da = item.dataset.directaccess
      const key = folder ? 'folder:' + folder : bm ? 'section:bookmarks' : nt ? 'section:notes' : da ? 'section:directaccess' : null
      if (key) {
        collapsed[key] = item.classList.contains('expanded')
        saveCollapsed(collapsed)
      }
      item.classList.toggle('expanded')
    })
  })

  document.querySelectorAll('.tree-file').forEach(file => {
    file.addEventListener('click', () => {
      const id = file.closest('[data-video-id]')?.dataset.videoId
      if (id && id !== 'placeholder') { const v = getVideos()[id]; if (v) { loadVideoById(id); showCardView(); if (window.innerWidth <= 640) document.getElementById('sidebar').classList.add('closed') } }
      const bm = file.closest('[data-bookmark-id]')
      if (bm) {
        const bms = getBookmarks().filter(b => b.id === bm.dataset.bookmarkId)
        if (bms[0]?.url) { window.open(bms[0].url); if (window.innerWidth <= 640) document.getElementById('sidebar').classList.add('closed') }
      }
      const note = file.closest('[data-note-id]')
      if (note) { openNote(note.dataset.noteId); if (window.innerWidth <= 640) document.getElementById('sidebar').classList.add('closed') }
      const da = file.closest('[data-da-id]')
      if (da) {
        const das = getDirectAccess().filter(d => d.id === da.dataset.daId)
        if (das[0]?.url) { window.open(das[0].url); if (window.innerWidth <= 640) document.getElementById('sidebar').classList.add('closed') }
      }
    })
  })

  document.querySelectorAll('.tree-item[draggable]').forEach(el => {
    el.addEventListener('dragstart', (e) => {
      const vid = el.dataset.videoId
      const bm = el.dataset.bookmarkId
      const nt = el.dataset.noteId
      const da = el.dataset.daId
      dragVideoId = vid || null
      e.dataTransfer.setData('text/plain', vid || bm || nt || da || '')
      e.dataTransfer.setData('type', vid ? 'video' : bm ? 'bookmark' : nt ? 'note' : da ? 'da' : '')
      e.dataTransfer.effectAllowed = 'move'
    })
  })
  document.querySelectorAll('.tree-item[data-bookmark-id], .tree-item[data-note-id], .tree-item[data-da-id]').forEach(el => {
    el.addEventListener('dragover', (e) => { e.preventDefault(); el.querySelector('.tree-file')?.classList.add('drop-zone') })
    el.addEventListener('dragleave', () => el.querySelector('.tree-file')?.classList.remove('drop-zone'))
    el.addEventListener('drop', (e) => {
      e.preventDefault(); el.querySelector('.tree-file')?.classList.remove('drop-zone')
      const draggedId = e.dataTransfer.getData('text/plain')
      const draggedType = e.dataTransfer.getData('type')
      if (!draggedId) return
      const targetId = el.dataset.bookmarkId || el.dataset.noteId || el.dataset.daId
      const targetType = el.dataset.bookmarkId ? 'bookmark' : el.dataset.noteId ? 'note' : 'da'
      if (draggedType !== targetType || draggedId === targetId) return
      if (targetType === 'bookmark') {
        let bms = getBookmarks()
        const from = bms.findIndex(b => b.id === draggedId)
        const to = bms.findIndex(b => b.id === targetId)
        if (from > -1 && to > -1) { const [item] = bms.splice(from, 1); bms.splice(to, 0, item); saveBookmarks(bms); renderSidebar() }
      } else if (targetType === 'note') {
        let notes = getNotes()
        const from = notes.findIndex(n => n.id === draggedId)
        const to = notes.findIndex(n => n.id === targetId)
        if (from > -1 && to > -1) { const [item] = notes.splice(from, 1); notes.splice(to, 0, item); saveNotes(notes); renderSidebar() }
      } else if (targetType === 'da') {
        let das = getDirectAccess()
        const from = das.findIndex(d => d.id === draggedId)
        const to = das.findIndex(d => d.id === targetId)
        if (from > -1 && to > -1) { const [item] = das.splice(from, 1); das.splice(to, 0, item); saveDirectAccess(das); renderSidebar() }
      }
    })
  })

  document.querySelectorAll('.tree-file').forEach(file => {
    file.addEventListener('contextmenu', (e) => {
      e.preventDefault()
      const entry = file.closest('[data-video-id]'), folder = file.closest('[data-folder]'), bm = file.closest('[data-bookmark-id]'), note = file.closest('[data-note-id]'), da = file.closest('[data-da-id]')
      if (da) showContextMenu(e.clientX, e.clientY, null, null, null, null, da.dataset.daId)
      else if (bm) showContextMenu(e.clientX, e.clientY, null, null, bm.dataset.bookmarkId)
      else if (note) showContextMenu(e.clientX, e.clientY, null, null, null, note.dataset.noteId)
      else if (entry) showContextMenu(e.clientX, e.clientY, entry?.dataset.videoId, folder?.dataset.folder)
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
  document.querySelectorAll('.tree-file-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const file = btn.closest('.tree-file')
      const entry = file?.closest('[data-video-id]'), folder = file?.closest('[data-folder]'), bm = file?.closest('[data-bookmark-id]'), note = file?.closest('[data-note-id]'), da = file?.closest('[data-da-id]')
      const rect = btn.getBoundingClientRect()
      const x = rect.right
      const y = rect.bottom
      if (da) showContextMenu(x, y, null, null, null, null, da.dataset.daId)
      else if (bm) showContextMenu(x, y, null, null, bm.dataset.bookmarkId)
      else if (note) showContextMenu(x, y, null, null, null, note.dataset.noteId)
      else if (entry) showContextMenu(x, y, entry.dataset.videoId, folder?.dataset.folder)
    })
  })
  document.querySelectorAll('.tree-folder, .tree-file').forEach(el => {
    let longTimer = null, longPressed = false
    el.addEventListener('touchstart', (e) => {
      if (el.closest('.folder-rename')) return
      longPressed = false
      longTimer = setTimeout(() => {
        longPressed = true
        const touch = e.touches[0]
        const item = el.closest('[data-folder]'), video = el.closest('[data-video-id]'), bm = el.closest('[data-bookmark-id]'), note = el.closest('[data-note-id]'), da = el.closest('[data-da-id]')
        if (da) {
          showContextMenu(touch.clientX, touch.clientY, null, null, null, null, da.dataset.daId)
        } else if (video) {
          showContextMenu(touch.clientX, touch.clientY, video.dataset.videoId, item?.dataset.folder || null)
        } else if (bm) {
          showContextMenu(touch.clientX, touch.clientY, null, null, bm.dataset.bookmarkId)
        } else if (note) {
          showContextMenu(touch.clientX, touch.clientY, null, null, null, note.dataset.noteId)
        } else if (item && item.dataset.folder !== 'Videos' && item.dataset.folder !== 'Archived') {
          showContextMenu(touch.clientX, touch.clientY, null, item.dataset.folder)
        }
      }, 500)
    }, { passive: true })
    el.addEventListener('touchmove', () => { clearTimeout(longTimer) }, { passive: true })
    el.addEventListener('touchend', () => { clearTimeout(longTimer) })
    el.addEventListener('touchcancel', () => { clearTimeout(longTimer) })
    el.addEventListener('click', (e) => { if (longPressed) { e.preventDefault(); e.stopPropagation(); longPressed = false } })
  })
}

// ─── Context menu ─────────────────────────────────────
let ctxTarget = null, ctxFolder = null, ctxBookmark = null, ctxNote = null, ctxDA = null
function showContextMenu(x, y, videoId, folderName, bookmarkId, noteId, daId) {
  const menu = document.getElementById('ctxMenu')
  ctxTarget = videoId; ctxFolder = folderName; ctxBookmark = bookmarkId; ctxNote = noteId; ctxDA = daId
  const isTouch = 'ontouchstart' in window
  menu.style.left = (isTouch ? x - 40 : x) + 'px'
  menu.style.top = (isTouch ? y - 40 : y) + 'px'
  menu.classList.add('open')
  const mw = menu.offsetWidth, mh = menu.offsetHeight
  const pad = 8
  let left = parseInt(menu.style.left), top = parseInt(menu.style.top)
  if (left + mw > window.innerWidth - pad) left = window.innerWidth - mw - pad
  if (top + mh > window.innerHeight - pad) top = window.innerHeight - mh - pad
  if (left < pad) left = pad
  if (top < pad) top = pad
  menu.style.left = left + 'px'
  menu.style.top = top + 'px'
  const isBm = bookmarkId !== null && bookmarkId !== undefined
  const isNote = noteId !== null && noteId !== undefined
  const isDA = daId !== null && daId !== undefined
  const showVideo = videoId !== null && videoId !== undefined
  menu.querySelector('[data-action="rename-folder"]').style.display = videoId ? 'none' : (isBm || isNote || isDA) ? 'none' : ''
  menu.querySelector('[data-action="delete-folder"]').style.display = videoId ? 'none' : (isBm || isNote || isDA) ? 'none' : ''
  menu.querySelector('[data-action="open-link"]').style.display = (showVideo || isBm || isDA) ? '' : 'none'
  menu.querySelector('[data-action="archive"]').style.display = showVideo ? '' : 'none'
  const hasUrl = showVideo ? !!getVideos()[videoId]?.url : isBm ? !!getBookmarks().filter(b => b.id === bookmarkId)[0]?.url : isDA ? true : false
  menu.querySelector('[data-action="blur"]').style.display = (showVideo && hasUrl) || isBm || isDA ? '' : 'none'
  if ((showVideo && hasUrl) || isBm || isDA) {
    let blurred = false, url = ''
    if (showVideo) { const v = getVideos()[videoId]; url = v?.url || ''; blurred = v?.blurred || isNSFW(url) }
    else if (isBm) { const b = getBookmarks().filter(x => x.id === bookmarkId)[0]; url = b?.url || ''; blurred = b?.blurred || isNSFW(url) }
    else if (isDA) { const d = getDirectAccess().filter(x => x.id === daId)[0]; url = d?.url || ''; blurred = d?.blurred || isNSFW(url) }
    menu.querySelector('[data-action="blur"]').innerHTML = `<i data-lucide="${blurred ? 'eye-off' : 'eye'}" class="ctx-icon"></i> ${blurred ? 'Unblur' : 'Blur'}`
  }
  menu.querySelector('[data-action="pin"]').style.display = showVideo ? '' : 'none'
  menu.querySelector('[data-action="move-up"]').style.display = showVideo ? '' : 'none'
  menu.querySelector('[data-action="move-down"]').style.display = showVideo ? '' : 'none'
  menu.querySelector('[data-action="delete"]').style.display = (showVideo || isBm || isNote || isDA) ? '' : 'none'
  const delItem = menu.querySelector('[data-action="delete"]')
  delItem.innerHTML = `<i data-lucide="trash-2" class="ctx-icon"></i> ${isNote ? 'Delete note' : isBm ? 'Delete bookmark' : isDA ? 'Delete direct access' : 'Delete'}`
  delItem.className = 'ctx-item ctx-danger'
  document.getElementById('ctxDiv1').style.display = (videoId || isBm || isNote || isDA) ? '' : 'none'
  document.getElementById('ctxDiv2').style.display = showVideo ? '' : 'none'
  document.getElementById('ctxDiv3').style.display = (showVideo || isNote) ? '' : 'none'
  document.getElementById('ctxMoveTo').classList.remove('show')
  document.getElementById('ctxDiv4').style.display = 'none'
  if (videoId || isNote) {
    const pinItem = menu.querySelector('[data-action="pin"]')
    if (videoId) {
      const isPinned = getPins().includes(videoId)
      pinItem.innerHTML = `<i data-lucide="${isPinned ? 'pin-off' : 'pin'}" class="ctx-icon"></i> ${isPinned ? 'Unpin' : 'Pin'}`
    }
    const moveToEl = document.getElementById('ctxMoveTo')
    const folders = getFolders()
    const currentFolder = isNote ? (getNotes().filter(n => n.id === noteId)[0]?.folder || null) : folderName
    const folderEntries = Object.keys(folders).filter(n => n !== currentFolder && n !== 'Archived')
    const moveDiv4 = document.getElementById('ctxDiv4')
    if (folderEntries.length) {
      let mHtml = ''
      if (isNote && currentFolder) {
        mHtml += `<div class="ctx-item" data-action="unassign-folder"><i data-lucide="x" class="ctx-icon"></i> Remove from folder</div><div class="ctx-divider" style="margin:4px 8px"></div>`
      }
      for (const name of folderEntries) {
        const color = (getFolderMeta()[name]?.color || '')
        const folders = getFolders()
        const hasContents = (folders[name] || []).length || getNotes().filter(n => n.folder === name).length
        mHtml += `<div class="ctx-item" data-action="move-to" data-folder="${name}"><i data-lucide="${hasContents ? 'folder-fill' : 'folder'}" class="ctx-icon"${color ? ` style="color:${color}"` : ''}></i> Move to ${name}</div>`
      }
      moveToEl.innerHTML = mHtml
      moveToEl.classList.add('show')
      moveDiv4.style.display = ''
    } else {
      moveToEl.classList.remove('show')
      moveDiv4.style.display = 'none'
    }
  } else {
    document.getElementById('ctxDiv3').style.display = 'none'
    document.getElementById('ctxMoveTo').classList.remove('show')
    document.getElementById('ctxDiv4').style.display = 'none'
  }
  loadIcons()
}

document.addEventListener('click', () => document.getElementById('ctxMenu').classList.remove('open'))

document.getElementById('ctxMenu').addEventListener('click', (e) => {
  const item = e.target.closest('.ctx-item')
  if (!item) return
  const a = item.dataset.action
  if (a === 'delete' && ctxTarget) {
    const fs = getFolders(); for (const ids of Object.values(fs)) { const i = ids.indexOf(ctxTarget); if (i > -1) ids.splice(i, 1) }
    saveFolders(fs); const vs = getVideos(); delete vs[ctxTarget]; saveVideos(vs)
    renderSidebar(); if (currentVideo?.id === ctxTarget) { currentVideo = null; clearCard() }
  }
  if (a === 'delete' && ctxBookmark && !ctxTarget) {
    let bms = getBookmarks().filter(b => b.id !== ctxBookmark)
    saveBookmarks(bms); renderSidebar()
  }
  if (a === 'delete' && ctxNote && !ctxTarget && !ctxBookmark) {
    let ns = getNotes().filter(n => n.id !== ctxNote)
    saveNotes(ns); renderSidebar()
    if (currentNoteId === ctxNote) { currentNoteId = null; closeNoteView() }
  }
  if (a === 'delete' && ctxDA && !ctxTarget && !ctxBookmark && !ctxNote) {
    let das = getDirectAccess().filter(d => d.id !== ctxDA)
    saveDirectAccess(das); renderSidebar()
  }
  if (a === 'archive' && ctxTarget) {
    const fs = getFolders(); for (const ids of Object.values(fs)) { const i = ids.indexOf(ctxTarget); if (i > -1) ids.splice(i, 1) }
    if (!fs['Archived']) fs['Archived'] = []; fs['Archived'].push(ctxTarget); saveFolders(fs); renderSidebar()
  }
  if (a === 'pin') {
    const pins = getPins(); const idx = pins.indexOf(ctxTarget)
    if (idx > -1) pins.splice(idx, 1); else pins.push(ctxTarget)
    savePins(pins); renderSidebar(); if (currentVideo?.id === ctxTarget) updatePinBadge(ctxTarget)
  }
  if (a === 'blur') {
    if (ctxTarget) {
      const vs = getVideos(); const v = vs[ctxTarget]
      if (v) { v.blurred = !v.blurred; saveVideos(vs); renderSidebar(); if (currentVideo?.id === ctxTarget) loadVideoById(ctxTarget) }
    } else if (ctxBookmark) {
      const bms = getBookmarks(); const b = bms.filter(x => x.id === ctxBookmark)[0]
      if (b) { b.blurred = !b.blurred; saveBookmarks(bms); renderSidebar() }
    } else if (ctxDA) {
      const das = getDirectAccess(); const d = das.filter(x => x.id === ctxDA)[0]
      if (d) { d.blurred = !d.blurred; saveDirectAccess(das); renderSidebar() }
    }
  }
  if (a === 'rename-folder' && ctxFolder) {
      const label = document.querySelector(`[data-folder="${ctxFolder}"] .tree-label`)
      if (!label) return
      const old = label.textContent
      const input = document.createElement('input'); input.className = 'folder-rename'; input.value = old; input.autofocus = true
      label.replaceWith(input); input.focus(); input.select()
      const done = () => {
        const name = input.value.trim() || old; const fs = getFolders(); const meta = getFolderMeta()
        if (name === old) { saveFolders(fs); saveFolderMeta(meta); renderSidebar(); return }
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
    if (a === 'open-link' && ctxTarget) {
      const vs = getVideos()
      const v = vs[ctxTarget]
      if (v?.url) window.open(v.url)
    }
    if (a === 'open-link' && ctxBookmark && !ctxTarget && !ctxDA) {
      const bm = getBookmarks().filter(b => b.id === ctxBookmark)[0]
      if (bm?.url) window.open(bm.url)
    }
    if (a === 'open-link' && ctxDA && !ctxTarget && !ctxBookmark) {
      const da = getDirectAccess().filter(d => d.id === ctxDA)[0]
      if (da?.url) window.open(da.url)
    }
    if ((a === 'move-up' || a === 'move-down') && ctxTarget) {
      const fs = getFolders()
      for (const [name, ids] of Object.entries(fs)) {
        const idx = ids.indexOf(ctxTarget)
        if (idx > -1) {
          const swap = a === 'move-up' ? idx - 1 : idx + 1
          if (swap >= 0 && swap < ids.length) {
            [ids[idx], ids[swap]] = [ids[swap], ids[idx]]
            saveFolders(fs); renderSidebar()
          }
          break
        }
      }
    }
    if (a === 'move-to' && ctxTarget) {
      const target = item.dataset.folder
      if (!target) return
      const fs = getFolders()
      if (!fs[target]) fs[target] = []
      if (!fs[target].includes(ctxTarget)) fs[target].push(ctxTarget)
      saveFolders(fs); renderSidebar()
    }
    if (a === 'move-to' && ctxNote && !ctxTarget) {
      const target = item.dataset.folder
      if (!target) return
      const notes = getNotes()
      const n = notes.filter(x => x.id === ctxNote)[0]
      if (n) { n.folder = target; saveNotes(notes); renderSidebar() }
    }
    if (a === 'unassign-folder' && ctxNote) {
      const notes = getNotes()
      const n = notes.filter(x => x.id === ctxNote)[0]
      if (n) { delete n.folder; saveNotes(notes); renderSidebar() }
    }
    document.getElementById('ctxMenu').classList.remove('open')
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

// ─── Bookmark dialog ──────────────────────────────────
const bookmarkDialog = document.getElementById('bookmarkDialog')
const bookmarkUrlInput = document.getElementById('bookmarkUrlInput')
const bookmarkTitleInput = document.getElementById('bookmarkTitleInput')

async function addBookmark() {
  const url = bookmarkUrlInput.value.trim()
  if (!url) return
  const bms = getBookmarks()
  const id = '_bm_' + Date.now()
  const bm = { id, url, title: bookmarkTitleInput.value.trim() || url, added: Date.now() }
  const proxyUrls = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    `https://corsproxy.io/?url=${encodeURIComponent(url)}`
  ]
  const twMatch = url.match(/https?:\/\/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/i)
  if (twMatch) {
    proxyUrls.push(`https://api.allorigins.win/raw?url=${encodeURIComponent(`https://api.vxtwitter.com/Twitter/status/${twMatch[1]}`)}`)
  }
  const imgPatterns = [
    /<meta\s+property="og:image"\s+content="([^"]+)"/i,
    /<meta\s+property="og:image:secure_url"\s+content="([^"]+)"/i,
    /<meta\s+name="twitter:image"\s+content="([^"]+)"/i,
    /<meta\s+name="twitter:image:src"\s+content="([^"]+)"/i,
    /<link\s+rel="image_src"\s+href="([^"]+)"/i,
    /<meta\s+property="og:image"[^>]+content="([^"]+)"/i
  ]
  for (const proxyUrl of proxyUrls) {
    try {
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), 5000)
      const text = await (await fetch(proxyUrl, { signal: ctrl.signal })).text()
      clearTimeout(t)
      try {
        const json = JSON.parse(text)
        const mediaUrl = json?.media_extended?.[0]?.url || json?.media?.[0]?.url
        if (mediaUrl) { bm.image = mediaUrl; break }
      } catch (_) {}
      for (const pat of imgPatterns) {
        const m = text.match(pat)
        if (m) { bm.image = m[1].replace(/&amp;/g, '&'); break }
      }
      if (bm.image) break
    } catch (_) {}
  }
  for (const proxyUrl of proxyUrls) {
    try {
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), 5000)
      const html = await (await fetch(proxyUrl, { signal: ctrl.signal })).text()
      clearTimeout(t)
      for (const pat of imgPatterns) {
        const m = html.match(pat)
        if (m) { bm.image = m[1].replace(/&amp;/g, '&'); break }
      }
      if (bm.image) break
    } catch (_) {}
  }
  bms.push(bm)
  saveBookmarks(bms)
  bookmarkUrlInput.value = ''; bookmarkTitleInput.value = ''
  bookmarkDialog.classList.remove('open')
  renderSidebar()
}
document.getElementById('newBookmarkBtn').addEventListener('click', () => {
  bookmarkUrlInput.value = ''; bookmarkTitleInput.value = ''
  bookmarkDialog.classList.add('open')
  setTimeout(() => bookmarkUrlInput.focus(), 100)
})
document.getElementById('bookmarkBtn').addEventListener('click', () => {
  bookmarkUrlInput.value = ''; bookmarkTitleInput.value = ''
  bookmarkDialog.classList.add('open')
  setTimeout(() => bookmarkUrlInput.focus(), 100)
})
document.getElementById('bookmarkDialogCancel').addEventListener('click', () => bookmarkDialog.classList.remove('open'))
document.getElementById('bookmarkDialogConfirm').addEventListener('click', addBookmark)
bookmarkUrlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') bookmarkTitleInput.focus() })
bookmarkTitleInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addBookmark(); if (e.key === 'Escape') bookmarkDialog.classList.remove('open') })
bookmarkDialog.addEventListener('mousedown', (e) => { if (e.target === bookmarkDialog) bookmarkDialog.classList.remove('open') })

// ─── Notes ──────────────────────────────────────────────
const noteDialog = document.getElementById('noteDialog')
const noteTitleInput = document.getElementById('noteTitleInput')
const noteContentInput = document.getElementById('noteContentInput')

function openNote(id) {
  currentNoteId = id
  const notes = getNotes()
  const n = notes.filter(x => x.id === id)[0]
  if (!n) return
  const gridBtn = document.getElementById('gridBtn')
  if (gridBtn.classList.contains('active')) gridBtn.click()
  document.getElementById('searchLanding').style.display = 'none'
  document.querySelector('.content').style.display = 'none'
  document.getElementById('noteView').style.display = 'flex'
  document.getElementById('noteViewTitle').value = n.title || ''
  document.getElementById('noteViewContent').innerHTML = sanitizeHtml(n.content || '')
  document.getElementById('noteViewFooter').textContent = `Last edited ${new Date(n.updated || n.added).toLocaleString()}`
  renderSidebar()
}

function closeNoteView() {
  currentNoteId = null
  document.getElementById('noteView').style.display = 'none'
  if (currentVideo) {
    document.querySelector('.content').style.display = ''
  } else {
    clearCard()
  }
  renderSidebar()
}

let noteSaveTimer = null
let pendingNoteId = null
document.getElementById('noteViewTitle').addEventListener('input', noteSaveContent)
document.getElementById('noteViewContent').addEventListener('input', noteSaveContent)

function noteSaveContent() {
  clearTimeout(noteSaveTimer)
  pendingNoteId = currentNoteId
  noteSaveTimer = setTimeout(() => {
    if (!pendingNoteId || pendingNoteId !== currentNoteId) return
    const notes = getNotes()
    const n = notes.filter(x => x.id === pendingNoteId)[0]
    if (!n) return
    n.title = document.getElementById('noteViewTitle').value
    n.content = sanitizeHtml(document.getElementById('noteViewContent').innerHTML)
    n.updated = Date.now()
    saveNotes(notes)
    document.getElementById('noteViewFooter').textContent = `Last edited ${new Date().toLocaleString()}`
    renderSidebar()
  }, 300)
}

document.getElementById('noteUndoBtn').addEventListener('click', () => {
  document.getElementById('noteViewContent').focus()
  document.execCommand('undo')
})
document.getElementById('noteRedoBtn').addEventListener('click', () => {
  document.getElementById('noteViewContent').focus()
  document.execCommand('redo')
})

document.getElementById('noteViewContent').addEventListener('paste', function (e) {
  const items = e.clipboardData?.items
  let hadImage = false
  if (items) {
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        hadImage = true
        const blob = item.getAsFile()
        if (!blob) continue
        const reader = new FileReader()
        reader.onload = function (ev) {
          const img = document.createElement('img')
          img.src = ev.target.result
          img.style.maxWidth = '100%'
          img.style.borderRadius = '8px'
          img.style.margin = '8px 0'
          img.style.display = 'block'
          const sel = window.getSelection()
          if (sel && sel.rangeCount) {
            const range = sel.getRangeAt(0)
            range.deleteContents()
            range.insertNode(img)
            range.setStartAfter(img)
            range.collapse(true)
            sel.removeAllRanges()
            sel.addRange(range)
          } else {
            this.appendChild(img)
          }
          noteSaveContent()
        }
        reader.readAsDataURL(blob)
        break
      }
    }
  }
  if (!hadImage) {
    setTimeout(() => {
      this.querySelectorAll('img').forEach(img => {
        img.style.maxWidth = ''
        img.style.borderRadius = ''
        img.style.margin = ''
        img.removeAttribute('width')
        img.removeAttribute('height')
      })
    }, 0)
  }
})

document.getElementById('noteDeleteBtn').addEventListener('click', () => {
  if (!currentNoteId) return
  let notes = getNotes().filter(x => x.id !== currentNoteId)
  saveNotes(notes)
  closeNoteView()
  renderSidebar()
})
document.getElementById('noteCloseBtn').addEventListener('click', closeNoteView)

// Note dialog
document.getElementById('newNoteBtn').addEventListener('click', () => {
  noteTitleInput.value = ''; noteContentInput.value = ''
  noteDialog.classList.add('open')
  setTimeout(() => noteTitleInput.focus(), 100)
})
document.getElementById('noteDialogCancel').addEventListener('click', () => noteDialog.classList.remove('open'))
document.getElementById('noteDialogConfirm').addEventListener('click', () => {
  const title = noteTitleInput.value.trim() || 'Untitled'
  const content = noteContentInput.value
  const notes = getNotes()
  const id = '_nt_' + Date.now()
  notes.push({ id, title, content, added: Date.now() })
  saveNotes(notes)
  noteTitleInput.value = ''; noteContentInput.value = ''
  noteDialog.classList.remove('open')
  renderSidebar()
  openNote(id)
})
noteTitleInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); noteContentInput.focus() } })
noteDialog.addEventListener('mousedown', (e) => { if (e.target === noteDialog) noteDialog.classList.remove('open') })

// ─── Grid view ─────────────────────────────────────────
function renderGridView() {
  const el = document.getElementById('gridView')
  let html = ''
  const folders = getFolders()
  const meta = getFolderMeta()
  const videos = getVideos()
  const pins = getPins()
  for (const [name, ids] of Object.entries(folders)) {
    if (!ids.length) continue
    const color = meta[name]?.color || ''
    const hasContents = ids.length || getNotes().filter(n => n.folder === name).length
    html += `<div class="grid-section"><div class="grid-section-header"${color ? ` style="color:${color}"` : ''}><i data-lucide="${hasContents ? 'folder-fill' : 'folder'}" style="width:16px;height:16px;flex-shrink:0"></i> ${name}</div><div class="grid-items">`
    for (const id of ids) {
      const v = videos[id]
      if (!v) continue
      const thumb = v.thumbnail || `https://img.youtube.com/vi/${id}/maxresdefault.jpg`
      const pinned = pins.includes(id)
      const vBlur = v.blurred
      html += `<div class="grid-item" data-video-id="${id}"><button class="grid-item-menu"><i data-lucide="ellipsis" style="width:14px;height:14px"></i></button>${pinned ? '<div class="pin-badge"><i data-lucide="pin-off" style="width:14px;height:14px"></i></div>' : ''}<div style="position:relative">${vBlur ? '<div class="nsfw-overlay"><i data-lucide="eye-off" style="width:20px;height:20px"></i></div>' : ''}<img class="grid-item-img${vBlur ? ' nsfw-blur' : ''}" src="${thumb}" loading="lazy" onerror="this.src='https://img.youtube.com/vi/${id}/hqdefault.jpg'" /></div><div class="grid-item-info"><div class="grid-item-title">${v.title}</div><div class="grid-item-sublabel">${v.channel}</div></div></div>`
    }
    for (const n of getNotes().filter(x => x.folder === name)) {
      const preview = stripHtml(n.content || '').replace(/\n/g, ' ').substring(0, 80)
      html += `<div class="grid-item note" data-note-id="${n.id}"><button class="grid-item-menu"><i data-lucide="ellipsis" style="width:14px;height:14px"></i></button><div class="grid-item-img" style="display:flex;align-items:center;justify-content:center;background:#e8e8ed;aspect-ratio:auto;height:60px"><i data-lucide="file-text" style="width:24px;height:24px;color:#8e8e93"></i></div><div class="grid-item-info"><div class="grid-item-title">${n.title || 'Untitled'}</div><div class="grid-item-sublabel">${preview}${stripHtml(n.content || '').length > 80 ? '…' : ''}</div></div></div>`
    }
    html += '</div></div>'
  }
  const bms = getBookmarks()
  if (bms.length) {
    html += `<div class="grid-section"><div class="grid-section-header"><i data-lucide="bookmark-fill" style="width:16px;height:16px;flex-shrink:0"></i> Bookmarks</div><div class="grid-items">`
    for (const bm of bms) {
      const bmNsfw = isNSFW(bm.url) || bm.blurred
      html += `<div class="grid-item bm" data-bookmark-id="${bm.id}"><button class="grid-item-menu"><i data-lucide="ellipsis" style="width:14px;height:14px"></i></button>${bm.image ? `<div style="position:relative">${bmNsfw ? '<div class="nsfw-overlay"><i data-lucide="eye-off" style="width:20px;height:20px"></i></div>' : ''}<img class="grid-item-img${bmNsfw ? ' nsfw-blur' : ''}" src="${bm.image}" loading="lazy" /></div>` : '<div class="grid-item-img" style="display:flex;align-items:center;justify-content:center;background:#e8e8ed"><i data-lucide="external-link" style="width:24px;height:24px;color:#8e8e93"></i></div>'}<div class="grid-item-info"><div class="grid-item-title">${bm.title || bm.url}</div><div class="grid-item-sublabel">${bm.url}</div></div></div>`
    }
    html += '</div></div>'
  }
  const notes = getNotes().filter(x => !x.folder)
  if (notes.length) {
    html += `<div class="grid-section"><div class="grid-section-header"><i data-lucide="file-text-fill" style="width:16px;height:16px;flex-shrink:0"></i> Notes</div><div class="grid-items">`
    for (const n of notes) {
      const preview = stripHtml(n.content || '').replace(/\n/g, ' ').substring(0, 80)
      html += `<div class="grid-item note" data-note-id="${n.id}"><button class="grid-item-menu"><i data-lucide="ellipsis" style="width:14px;height:14px"></i></button><div class="grid-item-img" style="display:flex;align-items:center;justify-content:center;background:#e8e8ed;aspect-ratio:auto;height:60px"><i data-lucide="file-text" style="width:24px;height:24px;color:#8e8e93"></i></div><div class="grid-item-info"><div class="grid-item-title">${n.title || 'Untitled'}</div><div class="grid-item-sublabel">${preview}${stripHtml(n.content || '').length > 80 ? '…' : ''}</div></div></div>`
    }
    html += '</div></div>'
  }
  const das = getDirectAccess()
  if (das.length) {
    html += `<div class="grid-section"><div class="grid-section-header"><i data-lucide="link" style="width:16px;height:16px;flex-shrink:0"></i> Direct Access</div><div class="grid-items">`
    for (const d of das) {
      const nsfw = isNSFW(d.url) || d.blurred
      html += `<div class="grid-item bm" data-da-id="${d.id}"><button class="grid-item-menu"><i data-lucide="ellipsis" style="width:14px;height:14px"></i></button>${d.image ? `<div style="position:relative">${nsfw ? '<div class="nsfw-overlay"><i data-lucide="eye-off" style="width:20px;height:20px"></i></div>' : ''}<img class="grid-item-img${nsfw ? ' nsfw-blur' : ''}" src="${d.image}" loading="lazy" onerror="this.style.display='none'" /></div>` : '<div class="grid-item-img" style="display:flex;align-items:center;justify-content:center;background:#e8e8ed"><i data-lucide="external-link" style="width:24px;height:24px;color:#8e8e93"></i></div>'}<div class="grid-item-info"><div class="grid-item-title">${d.title}</div><div class="grid-item-sublabel">${d.url}</div></div></div>`
    }
    html += '</div></div>'
  }
  el.innerHTML = html || '<div style="padding:30px;text-align:center;font-size:13px;color:#8e8e93">Nothing to show yet.</div>'
  loadIcons()
  el.querySelectorAll('[data-video-id]').forEach(item => {
    item.addEventListener('click', () => {
      const id = item.dataset.videoId
      const v = videos[id]
      if (v) { loadVideoById(id) }
    })
  })
  el.querySelectorAll('[data-bookmark-id]').forEach(item => {
    item.addEventListener('click', () => {
      const bm = bms.filter(b => b.id === item.dataset.bookmarkId)[0]
      if (bm?.url) window.open(bm.url)
    })
  })
  el.querySelectorAll('[data-da-id]').forEach(item => {
    item.addEventListener('click', () => {
      const d = getDirectAccess().filter(x => x.id === item.dataset.daId)[0]
      if (d?.url) window.open(d.url)
    })
  })
  el.querySelectorAll('[data-note-id]').forEach(item => {
    item.addEventListener('click', () => {
      const nid = item.dataset.noteId
      if (nid) { openNote(nid) }
    })
  })
  el.querySelectorAll('.grid-item-menu').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const item = btn.closest('.grid-item')
      const rect = btn.getBoundingClientRect()
      const vid = item.dataset.videoId
      const bm = item.dataset.bookmarkId
      const nt = item.dataset.noteId
      const da = item.dataset.daId
      showContextMenu(rect.right, rect.bottom, vid || null, null, bm || null, nt || null, da || null)
    })
  })
  el.querySelectorAll('.grid-item').forEach(item => {
    item.addEventListener('contextmenu', (e) => {
      e.preventDefault()
      const vid = item.dataset.videoId
      const bm = item.dataset.bookmarkId
      const nt = item.dataset.noteId
      const da = item.dataset.daId
      showContextMenu(e.clientX, e.clientY, vid || null, null, bm || null, nt || null, da || null)
    })
    let longTimer = null, longPressed = false
    item.addEventListener('pointerdown', (e) => {
      longPressed = false
      longTimer = setTimeout(() => {
        longPressed = true
        const rect = item.getBoundingClientRect()
        const x = e.clientX || rect.left + rect.width / 2
        const y = e.clientY || rect.top + rect.height / 2
        const vid = item.dataset.videoId
        const bm = item.dataset.bookmarkId
        const nt = item.dataset.noteId
        const da = item.dataset.daId
        showContextMenu(x, y, vid || null, null, bm || null, nt || null, da || null)
      }, 500)
    })
    item.addEventListener('pointerup', () => { clearTimeout(longTimer) })
    item.addEventListener('pointermove', () => { clearTimeout(longTimer) })
    item.addEventListener('pointercancel', () => { clearTimeout(longTimer) })
    item.addEventListener('click', (e) => { if (longPressed) { e.preventDefault(); e.stopPropagation(); longPressed = false } })
    item.setAttribute('draggable', 'true')
    // — Touch drag support (long-press + drag for mobile) —
    ;(function(){
      let tdState = null
      item.addEventListener('touchstart', (e) => {
        const t = e.touches[0]
        tdState = {
          dragId: item.dataset.videoId || item.dataset.bookmarkId || item.dataset.noteId || item.dataset.daId,
          dragType: item.dataset.videoId ? 'video' : item.dataset.bookmarkId ? 'bookmark' : item.dataset.noteId ? 'note' : 'da',
          folder: (item.closest('.grid-section')?.querySelector('.grid-section-header')?.textContent?.trim()) || '',
          startX: t.clientX, startY: t.clientY,
          lastX: t.clientX, lastY: t.clientY,
          active: false,
          timer: setTimeout(() => {
            tdState.active = true
            item.classList.add('dragging')
            if (navigator.vibrate) navigator.vibrate(8)
          }, 500)
        }
      }, { passive: true })
      item.addEventListener('touchmove', (e) => {
        if (!tdState) return
        const t = e.touches[0]; tdState.lastX = t.clientX; tdState.lastY = t.clientY
        if (!tdState.active) {
          if (Math.abs(t.clientX - tdState.startX) > 12 || Math.abs(t.clientY - tdState.startY) > 12) { clearTimeout(tdState.timer); tdState = null }
          return
        }
        e.preventDefault()
        el.querySelectorAll('.grid-item.drag-before, .grid-item.drag-after').forEach(i => i.classList.remove('drag-before', 'drag-after'))
        const target = document.elementFromPoint(t.clientX, t.clientY)
        const targetItem = target?.closest('.grid-item')
        if (!targetItem || targetItem === item) return
        const tType = targetItem.dataset.videoId ? 'video' : targetItem.dataset.bookmarkId ? 'bookmark' : targetItem.dataset.noteId ? 'note' : 'da'
        const tId = targetItem.dataset.videoId || targetItem.dataset.bookmarkId || targetItem.dataset.noteId || targetItem.dataset.daId
        if (tdState.dragType !== tType || tdState.dragId === tId) return
        const rect = targetItem.getBoundingClientRect()
        const mid = rect.top + rect.height / 2
        targetItem.classList.toggle('drag-before', t.clientY < mid)
        targetItem.classList.toggle('drag-after', t.clientY >= mid)
      }, { passive: false })
      item.addEventListener('touchend', () => {
        if (!tdState) return
        clearTimeout(tdState.timer)
        if (tdState.active) {
          const { dragId, dragType, folder: fName, lastX, lastY } = tdState
          const target = document.elementFromPoint(lastX, lastY)
          const targetItem = target?.closest('.grid-item')
          if (targetItem && targetItem !== item) {
            const tType = targetItem.dataset.videoId ? 'video' : targetItem.dataset.bookmarkId ? 'bookmark' : targetItem.dataset.noteId ? 'note' : 'da'
            const tId = targetItem.dataset.videoId || targetItem.dataset.bookmarkId || targetItem.dataset.noteId || targetItem.dataset.daId
            if (dragType === tType && dragId !== tId) {
              const rect = targetItem.getBoundingClientRect()
              const insertBefore = lastY < rect.top + rect.height / 2
              if (dragType === 'video') {
                const fs = getFolders()
                if (fs[fName]) { const from = fs[fName].indexOf(dragId), to = fs[fName].indexOf(tId); if (from > -1 && to > -1) { const [m] = fs[fName].splice(from, 1); const nt = fs[fName].indexOf(tId); fs[fName].splice(insertBefore ? nt : nt + 1, 0, m); saveFolders(fs) } }
              } else if (dragType === 'bookmark') { let b = getBookmarks(); const from = b.findIndex(x => x.id === dragId), to = b.findIndex(x => x.id === tId); if (from > -1 && to > -1) { const [m] = b.splice(from, 1); b.splice(insertBefore ? to : to, 0, m); saveBookmarks(b) } }
              else if (dragType === 'note') { let n = getNotes(); const from = n.findIndex(x => x.id === dragId), to = n.findIndex(x => x.id === tId); if (from > -1 && to > -1) { const [m] = n.splice(from, 1); n.splice(insertBefore ? to : to, 0, m); saveNotes(n) } }
              else if (dragType === 'da') { let d = getDirectAccess(); const from = d.findIndex(x => x.id === dragId), to = d.findIndex(x => x.id === tId); if (from > -1 && to > -1) { const [m] = d.splice(from, 1); d.splice(insertBefore ? to : to, 0, m); saveDirectAccess(d) } }
              renderGridView()
            }
          }
          el.querySelectorAll('.grid-item.drag-before, .grid-item.drag-after, .grid-item.dragging').forEach(i => i.classList.remove('drag-before', 'drag-after', 'dragging'))
        }
        tdState = null
      })
      item.addEventListener('touchcancel', () => { if (tdState) { clearTimeout(tdState.timer); if (tdState.active) { el.querySelectorAll('.grid-item.drag-before, .grid-item.drag-after, .grid-item.dragging').forEach(i => i.classList.remove('drag-before', 'drag-after', 'dragging')) } tdState = null } })
    })()
    item.addEventListener('dragstart', (e) => {
      const vid = item.dataset.videoId, bm = item.dataset.bookmarkId, nt = item.dataset.noteId, da = item.dataset.daId
      e.dataTransfer.setData('text/plain', vid || bm || nt || da || '')
      e.dataTransfer.setData('type', vid ? 'video' : bm ? 'bookmark' : nt ? 'note' : 'da')
      const section = item.closest('.grid-section')
      const folder = section?.querySelector('.grid-section-header')?.textContent?.trim() || ''
      e.dataTransfer.setData('folder', folder)
      e.dataTransfer.effectAllowed = 'move'
      item.classList.add('dragging')
    })
    item.addEventListener('dragover', (e) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      const t = e.dataTransfer.getData('type')
      const myT = item.dataset.videoId ? 'video' : item.dataset.bookmarkId ? 'bookmark' : item.dataset.noteId ? 'note' : 'da'
      if (t === myT && e.dataTransfer.getData('text/plain') !== (item.dataset.videoId || item.dataset.bookmarkId || item.dataset.noteId || item.dataset.daId)) {
        const rect = item.getBoundingClientRect()
        const mid = rect.top + rect.height / 2
        const before = e.clientY < mid
        item.classList.toggle('drag-before', before)
        item.classList.toggle('drag-after', !before)
      }
    })
    item.addEventListener('dragleave', () => { item.classList.remove('drag-before', 'drag-after') })
    item.addEventListener('drop', (e) => {
      e.preventDefault()
      item.classList.remove('drag-before', 'drag-after')
      const draggedId = e.dataTransfer.getData('text/plain')
      const draggedType = e.dataTransfer.getData('type')
      if (!draggedId) return
      const targetId = item.dataset.videoId || item.dataset.bookmarkId || item.dataset.noteId || item.dataset.daId
      const targetType = item.dataset.videoId ? 'video' : item.dataset.bookmarkId ? 'bookmark' : item.dataset.noteId ? 'note' : 'da'
      if (draggedType !== targetType || draggedId === targetId) return
      const rect = item.getBoundingClientRect()
      const insertBefore = e.clientY < rect.top + rect.height / 2
      if (targetType === 'video') {
        const folderName = e.dataTransfer.getData('folder')
        const fs = getFolders()
        if (!fs[folderName]) return
        const from = fs[folderName].indexOf(draggedId)
        const to = fs[folderName].indexOf(targetId)
        if (from === -1 || to === -1) return
        const [moved] = fs[folderName].splice(from, 1)
        const newTo = fs[folderName].indexOf(targetId)
        fs[folderName].splice(insertBefore ? newTo : newTo + 1, 0, moved)
        saveFolders(fs)
        renderGridView()
      } else if (targetType === 'bookmark') {
        let bms = getBookmarks()
        const from = bms.findIndex(b => b.id === draggedId)
        const to = bms.findIndex(b => b.id === targetId)
        if (from > -1 && to > -1) { const [m] = bms.splice(from, 1); bms.splice(insertBefore ? to : to, 0, m); saveBookmarks(bms); renderGridView() }
      } else if (targetType === 'note') {
        let notes = getNotes()
        const from = notes.findIndex(n => n.id === draggedId)
        const to = notes.findIndex(n => n.id === targetId)
        if (from > -1 && to > -1) { const [m] = notes.splice(from, 1); notes.splice(insertBefore ? to : to, 0, m); saveNotes(notes); renderGridView() }
      } else if (targetType === 'da') {
        let das = getDirectAccess()
        const from = das.findIndex(d => d.id === draggedId)
        const to = das.findIndex(d => d.id === targetId)
        if (from > -1 && to > -1) { const [m] = das.splice(from, 1); das.splice(insertBefore ? to : to, 0, m); saveDirectAccess(das); renderGridView() }
      }
    })
    item.addEventListener('dragend', () => {
      item.classList.remove('dragging', 'drag-before', 'drag-after')
      el.querySelectorAll('.grid-item.drag-before, .grid-item.drag-after, .grid-item.dragging').forEach(el2 => el2.classList.remove('drag-before', 'drag-after', 'dragging'))
    })
    const selId = item.dataset.videoId || item.dataset.bookmarkId || item.dataset.noteId || item.dataset.daId
    if (selId && selectedGridItems.has(selId)) item.classList.add('selected')
  })
  el.addEventListener('click', (e) => {
    if (!e.ctrlKey && !e.metaKey) return
    const item = e.target.closest('.grid-item')
    if (!item) return
    e.preventDefault(); e.stopPropagation()
    const id = item.dataset.videoId || item.dataset.bookmarkId || item.dataset.noteId || item.dataset.daId
    if (!id) return
    if (selectedGridItems.has(id)) { selectedGridItems.delete(id); item.classList.remove('selected') }
    else { selectedGridItems.add(id); item.classList.add('selected') }
    updateBatchBar()
  })
  updateBatchBar()
}
function showCardView() {
  document.getElementById('gridView').classList.remove('open')
  document.getElementById('gridBtn').classList.remove('active')
  document.getElementById('searchLanding').style.display = 'none'
  document.querySelector('.content').style.display = ''
}
document.getElementById('gridBtn').addEventListener('click', function () {
  const open = this.classList.toggle('active')
  document.getElementById('gridView').classList.toggle('open', open)
  document.querySelector('.content').style.display = open ? 'none' : ''
  if (open) {
    document.getElementById('ytInput').value = ''
    document.getElementById('searchLanding').style.display = 'none'
    if (currentNoteId) closeNoteView(); renderGridView()
  } else {
    selectedGridItems.clear(); updateBatchBar()
    if (!currentVideo) clearCard()
  }
})

// ─── Batch actions ─────────────────────────────────────
document.getElementById('batchDelete')?.addEventListener('click', () => {
  if (!selectedGridItems.size || !confirm(`Delete ${selectedGridItems.size} item(s)?`)) return
  for (const id of selectedGridItems) {
    const vs = getVideos(); const bms = getBookmarks(); const notes = getNotes(); const das = getDirectAccess()
    if (vs[id]) { delete vs[id]; saveVideos(vs); const fs = getFolders(); for (const ids of Object.values(fs)) { const i = ids.indexOf(id); if (i > -1) ids.splice(i, 1) }; saveFolders(fs) }
    const bm = bms.find(b => b.id === id); if (bm) { saveBookmarks(bms.filter(b => b.id !== id)) }
    const n = notes.find(n => n.id === id); if (n) { saveNotes(notes.filter(x => x.id !== id)) }
    const d = das.find(d => d.id === id); if (d) { saveDirectAccess(das.filter(x => x.id !== id)) }
  }
  selectedGridItems.clear(); renderGridView(); renderSidebar()
})
document.getElementById('batchPin')?.addEventListener('click', () => {
  const pins = getPins()
  for (const id of selectedGridItems) { if (!pins.includes(id)) pins.push(id) }
  savePins(pins); selectedGridItems.clear(); renderGridView()
})
document.getElementById('batchBlur')?.addEventListener('click', () => {
  const vs = getVideos()
  for (const id of selectedGridItems) { if (vs[id]) { vs[id].blurred = !vs[id].blurred } }
  saveVideos(vs); selectedGridItems.clear(); renderGridView()
})
document.getElementById('batchMove')?.addEventListener('click', () => {
  const dd = document.getElementById('batchMoveDropdown')
  if (dd.style.display === 'block') { dd.style.display = 'none'; return }
  const folders = Object.keys(getFolders()).filter(n => n !== 'Archived')
  dd.innerHTML = folders.map(f => `<div class="ctx-item" data-folder="${f}"><i data-lucide="folder" class="ctx-icon"></i> ${f}</div>`).join('')
  dd.querySelectorAll('.ctx-item').forEach(el => {
    el.addEventListener('click', () => {
      const target = el.dataset.folder; if (!target) return
      const fs = getFolders()
      for (const id of selectedGridItems) {
        for (const ids of Object.values(fs)) { const i = ids.indexOf(id); if (i > -1) ids.splice(i, 1) }
        if (!fs[target].includes(id)) fs[target].push(id)
      }
      saveFolders(fs); selectedGridItems.clear(); dd.style.display = 'none'; renderGridView(); renderSidebar()
    })
  })
  loadIcons(dd); dd.style.display = 'block'
})

// ─── Sidebar toolbar ──────────────────────────────────
document.getElementById('menuBtn').addEventListener('click', () => document.getElementById('sidebar').classList.toggle('closed'))
document.getElementById('sidebarBackdrop').addEventListener('click', () => document.getElementById('sidebar').classList.add('closed'))
document.getElementById('searchInput').addEventListener('input', renderSidebar)

// ─── Load video ───────────────────────────────────────
function loadVideoById(id) {
  const v = getVideos()[id]; if (!v) return
  currentVideo = { ...v, id }
  document.getElementById('thumbnail').src = v.thumbnail || `https://img.youtube.com/vi/${id}/maxresdefault.jpg`
  document.getElementById('durationBadge').textContent = v.duration || '–'
  document.getElementById('videoTitle').textContent = v.title
  document.getElementById('channelName').textContent = v.channel
  if (v.pubDate) setPublishedDate(new Date(v.pubDate))
  updatePrivacy(v.privacy || 'PUBLIC')
  if (currentNoteId) closeNoteView()
  updatePinBadge(id); showCardView(); renderSidebar(); updateCardAddBtn()
}
function updatePinBadge(id) {
  const wrap = document.getElementById('imageWrap')
  const old = wrap.querySelector('.pin-badge')
  if (old) old.remove()
  if (getPins().includes(id)) {
    const badge = document.createElement('div')
    badge.className = 'pin-badge'
    badge.innerHTML = '<i data-lucide="pin-off" style="width:14px;height:14px"></i>'
    wrap.appendChild(badge)
    loadIcons()
  }
}

function renderSearchLanding() {
  const el = document.getElementById('searchLandingHistory')
  let items = []
  const enabled = loadSetting('saveLinkHistory', true)
  if (enabled) items = loadHistory()
  if (!items.length) {
    const vs = getVideos(); const fs = getFolders()
    const all = (fs['Videos'] || []).map(id => vs[id] ? { id, title: vs[id].title, channel: vs[id].channel, added: vs[id].added } : null).filter(Boolean)
    all.sort((a, b) => (b.added || 0) - (a.added || 0))
    items = all.slice(0, 10)
  }
  if (!items.length) {
    el.innerHTML = '<div style="padding:20px;text-align:center;font-size:12px;color:#8e8e93">No recent searches</div>'
    return
  }
  el.innerHTML = items.map(h =>
    `<div class="search-landing-item" data-id="${h.id}">
      <img class="search-landing-item-img" src="https://img.youtube.com/vi/${h.id}/hqdefault.jpg" loading="lazy" onerror="this.style.display='none'" />
      <div class="search-landing-item-meta">
        <span class="search-landing-item-title">${h.title}</span>
        <span class="search-landing-item-channel">${h.channel}</span>
      </div>
    </div>`
  ).join('')
  el.querySelectorAll('.search-landing-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = item.dataset.id
      if (id) loadVideoById(id)
    })
  })
}

function clearCard() {
  currentVideo = null
  document.getElementById('thumbnail').src = ''
  document.getElementById('durationBadge').textContent = '–'
  document.getElementById('videoTitle').textContent = 'Paste a video link above'
  document.getElementById('channelName').textContent = ''
  document.getElementById('cardAddRow').style.display = 'none'
  const badge = document.getElementById('imageWrap').querySelector('.pin-badge')
  if (badge) badge.remove()
  document.getElementById('noteView').style.display = 'none'
  document.querySelector('.content').style.display = 'none'
  document.getElementById('searchLanding').style.display = 'flex'
  renderSearchLanding()
}

// ─── Thumbnail click to open link ─────────────────────
document.getElementById('imageWrap').addEventListener('click', () => {
  if (currentVideo?.url) window.open(currentVideo.url)
})

// ─── Add video ────────────────────────────────────────
function updateCardAddBtn() {
  const row = document.getElementById('cardAddRow')
  const btn = document.getElementById('cardAddBtn')
  const copyBtn = document.getElementById('copyLinkBtn')
  if (!currentVideo) { row.style.display = 'none'; return }
  const vs = getVideos()
  if (vs[currentVideo.id]) {
    row.style.display = 'flex'
    btn.classList.add('saved')
    btn.innerHTML = '<i data-lucide="check" class="card-add-icon"></i> Saved'
    btn.onmouseover = () => {
      btn.innerHTML = '<i data-lucide="trash-2" class="card-add-icon"></i> Unlink'
      loadIcons()
    }
    btn.onmouseout = () => {
      btn.innerHTML = '<i data-lucide="check" class="card-add-icon"></i> Saved'
      loadIcons()
    }
    btn.onclick = (e) => { e.stopPropagation(); if (currentVideo) unlinkCurrentVideo() }
    copyBtn.style.display = 'inline-flex'
    loadIcons()
  } else {
    row.style.display = 'flex'
    btn.classList.remove('saved')
    btn.innerHTML = '<i data-lucide="plus" class="card-add-icon"></i> Add video'
    btn.onmouseover = btn.onmouseout = btn.onclick = null
    copyBtn.style.display = 'none'
    loadIcons()
  }
}
document.getElementById('copyLinkBtn').addEventListener('click', (e) => {
  e.stopPropagation()
  if (!currentVideo?.url) return
  navigator.clipboard.writeText(currentVideo.url).then(() => {
    const toast = document.getElementById('updateToast')
    toast.textContent = 'Copied to clipboard'
    toast.classList.add('show')
    setTimeout(() => toast.classList.remove('show'), 2000)
  }).catch(() => {})
})

function addCurrentVideo() {
  if (!currentVideo) { document.getElementById('videoTitle').textContent = 'Load a video first'; return }
  const { id, title, channel, duration, pubDate, privacy, url } = currentVideo
  const vs = getVideos()
  if (vs[id]) return
  vs[id] = { title, channel, duration, pubDate: pubDate?.toISOString(), privacy: privacy || 'PUBLIC', url: url || '', thumbnail: `https://img.youtube.com/vi/${id}/maxresdefault.jpg`, added: Date.now() }
  saveVideos(vs)
  const fs = getFolders()
  if (!fs['Videos']) fs['Videos'] = []
  if (!fs['Videos'].includes(id)) fs['Videos'].push(id)
  saveFolders(fs)
  renderSidebar(); updateCardAddBtn()
  const t = document.querySelector('#pane-history .settings-toggle:first-child')
  if (t?.classList.contains('on')) { const h = loadHistory().filter(x => x.id !== id); h.unshift({ id, title, channel }); saveHistory(h) }
  if (document.getElementById('searchLanding').style.display === 'flex') renderSearchLanding()
}
function unlinkCurrentVideo() {
  if (!currentVideo) return
  const id = currentVideo.id
  const vs = getVideos()
  if (!vs[id]) return
  delete vs[id]; saveVideos(vs)
  const fs = getFolders()
  for (const ids of Object.values(fs)) { const i = ids.indexOf(id); if (i > -1) ids.splice(i, 1) }
  saveFolders(fs)
  const pins = getPins(); const pi = pins.indexOf(id); if (pi > -1) { pins.splice(pi, 1); savePins(pins) }
  renderSidebar(); updateCardAddBtn()
}
document.getElementById('addBtn').addEventListener('click', addCurrentVideo)
document.getElementById('cardAddBtn').addEventListener('click', addCurrentVideo)

// ─── Video fetch ──────────────────────────────────────
function getVideoId(url) {
  for (const r of [/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/, /^([a-zA-Z0-9_-]{11})$/]) { const m = url.match(r); if (m) return m[1] }
  return null
}
async function loadVideo(videoId) {
  showCardView()
  const url = `https://www.youtube.com/watch?v=${videoId}`
  document.getElementById('thumbnail').src = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
  document.getElementById('durationBadge').textContent = '...'
  document.getElementById('videoTitle').textContent = 'Loading...'; document.getElementById('channelName').textContent = ''
  try {
    const data = await (await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`)).json()
    const title = data.title || 'Unknown'
    const channel = data.author_name || ''
    let sec = 0, dateStr = '', privacy = 'PUBLIC'
    const proxies = [
      `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
      `https://corsproxy.io/?url=${encodeURIComponent(url)}`
    ]
    for (const proxyUrl of proxies) {
      try {
        const controller = new AbortController()
        const t = setTimeout(() => controller.abort(), 5000)
        const html = await (await fetch(proxyUrl, { signal: controller.signal })).text()
        clearTimeout(t)
        const s = parseInt((html.match(/"lengthSeconds":"?(\d+)"?/) || [])[1] || '0')
        if (s) { sec = s }
        const ds = (html.match(/"uploadDate":"([^"]+)"/) || html.match(/<meta\s+itemprop="datePublished"\s+content="([^"]+)"/) || [])[1]
        if (ds) { dateStr = ds }
        const pv = (html.match(/"privacyStatus":"([^"]+)"/) || [])[1]
        if (pv) { privacy = pv }
        if (s || ds || pv) break
      } catch (_) {}
    }
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60
    const duration = sec ? (h ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` : `${m}:${String(s).padStart(2,'0')}`) : ''
    const pubDate = dateStr ? new Date(dateStr) : null
    currentVideo = { id: videoId, title, channel, duration, pubDate, privacy, url, thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` }
    document.getElementById('thumbnail').src = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
    document.getElementById('durationBadge').textContent = duration || '–'
    document.getElementById('videoTitle').textContent = title; document.getElementById('channelName').textContent = channel
    if (pubDate) setPublishedDate(pubDate)
    updatePrivacy(privacy)
    renderSidebar(); updateCardAddBtn()
  } catch (e) { currentVideo = null; document.getElementById('durationBadge').textContent = '–'; document.getElementById('videoTitle').textContent = 'Could not load video info'; document.getElementById('channelName').textContent = 'Try again or check the link' }
}
let pendingDaUrl = ''
document.getElementById('ytBtn').addEventListener('click', () => {
  const input = document.getElementById('ytInput').value.trim()
  const id = getVideoId(input)
  if (id) { loadVideo(id); return }
  if (/^https?:\/\//i.test(input) || /^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/.test(input)) {
    pendingDaUrl = input.match(/^https?:\/\//i) ? input : 'https://' + input
    document.getElementById('daUrlDisplay').textContent = pendingDaUrl
    document.getElementById('daTitleInput').value = ''
    document.getElementById('daDialog').classList.add('open')
    setTimeout(() => document.getElementById('daTitleInput').focus(), 100)
  } else {
    document.getElementById('videoTitle').textContent = 'Invalid YouTube link'
  }
})
document.getElementById('daDialogCancel').addEventListener('click', () => { document.getElementById('daDialog').classList.remove('open'); pendingDaUrl = '' })
document.getElementById('daDialogConfirm').addEventListener('click', async () => {
  if (!pendingDaUrl) return
  const das = getDirectAccess()
  const title = document.getElementById('daTitleInput').value.trim() || pendingDaUrl
  let domain = ''
  try { domain = new URL(pendingDaUrl).hostname } catch (_) { domain = pendingDaUrl.replace(/^https?:\/\//, '').split('/')[0] }
  const da = { id: '_da_' + Date.now(), url: pendingDaUrl, title, added: Date.now(), image: `https://www.google.com/s2/favicons?domain=${domain}&sz=128` }
  das.push(da)
  saveDirectAccess(das)
  document.getElementById('ytInput').value = ''
  document.getElementById('daDialog').classList.remove('open')
  pendingDaUrl = ''
  renderSidebar()
})
document.getElementById('daTitleInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') document.getElementById('daDialogConfirm').click(); if (e.key === 'Escape') document.getElementById('daDialogCancel').click() })
document.getElementById('daDialog').addEventListener('mousedown', (e) => { if (e.target === document.getElementById('daDialog')) document.getElementById('daDialogCancel').click() })
function showHistoryDropdown() {
  const dd = document.getElementById('historyDropdown')
  const t = document.querySelector('#pane-history .settings-toggle:first-child')
  if (!t?.classList.contains('on')) { dd.classList.remove('open'); return }
  const items = loadHistory()
  if (!items.length) { dd.innerHTML = '<div class="history-empty">No recent links</div>'; dd.classList.add('open'); return }
  dd.innerHTML = items.map(h => `<div class="history-item" data-id="${h.id}"><i data-lucide="history" style="width:14px;height:14px;flex-shrink:0;color:#8e8e93"></i><div class="history-item-meta"><span class="history-item-title">${h.title}</span><span class="history-item-channel">${h.channel}</span></div></div>`).join('')
  dd.querySelectorAll('.history-item').forEach(el => {
    el.addEventListener('click', () => { const id = el.dataset.id; if (id) { loadVideoById(id); dd.classList.remove('open') } })
  })
  loadIcons(dd)
  dd.classList.add('open')
}
document.getElementById('ytInput').addEventListener('focus', () => { showCardView(); clearCard() })
document.getElementById('ytInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') { document.getElementById('ytBtn').click() }; if (e.key === 'Escape') document.getElementById('ytInput').blur() })

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
    document.getElementById({ theme: 'pane-theme', basic: 'pane-basic', toolbar: 'pane-toolbar', files: 'pane-files', history: 'pane-history', nsfw: 'pane-nsfw', patchnotes: 'pane-patchnotes' }[this.dataset.cat]).style.display = 'block'
    if (this.dataset.cat === 'patchnotes') loadPatchNotes()
    if (this.dataset.cat === 'history') renderSettingsHistory()
  })
})
function saveSetting(key, on) { const s = JSON.parse(localStorage.getItem('ytSettings') || '{}'); s[key] = on; safeSetItem('ytSettings', JSON.stringify(s)) }
function loadSetting(key, def) { const s = JSON.parse(localStorage.getItem('ytSettings') || '{}'); return s[key] !== undefined ? s[key] : def }
function renderSettingsHistory() {
  const el = document.getElementById('settingsHistoryList')
  if (!el) return
  let items = loadHistory()
  if (!items.length) {
    const vs = getVideos(); const fs = getFolders()
    const all = (fs['Videos'] || []).map(id => vs[id] ? { id, title: vs[id].title, channel: vs[id].channel } : null).filter(Boolean)
    all.sort((a, b) => (b.added || 0) - (a.added || 0))
    items = all.slice(0, 10)
  }
  if (!items.length) { el.innerHTML = '<div style="padding:16px;text-align:center;font-size:12px;color:#8e8e93">No link history yet</div>'; return }
  el.innerHTML = items.map(h =>
    `<div class="settings-history-item" data-id="${h.id}">
      <img class="settings-history-item-img" src="https://img.youtube.com/vi/${h.id}/hqdefault.jpg" loading="lazy" onerror="this.style.display='none'" />
      <div class="settings-history-item-meta">
        <span class="settings-history-item-title">${h.title}</span>
        <span class="settings-history-item-channel">${h.channel}</span>
      </div>
    </div>`
  ).join('')
  el.querySelectorAll('.settings-history-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = item.dataset.id
      if (id) { document.getElementById('settingsOverlay').classList.remove('open'); loadVideoById(id) }
    })
  })
}
document.getElementById('settingsClearHistoryBtn')?.addEventListener('click', () => {
  if (confirm('Clear link history?')) { saveHistory([]); renderSettingsHistory(); if (document.getElementById('searchLanding').style.display === 'flex') renderSearchLanding() }
})
document.querySelectorAll('.settings-toggle').forEach(t => t.addEventListener('click', function () { this.classList.toggle('on') }))
document.querySelectorAll('.theme-option').forEach(opt => {
  opt.addEventListener('click', function () {
    document.querySelectorAll('.theme-option').forEach(o => o.classList.remove('active'))
    this.classList.add('active')
    const t = this.dataset.theme; document.body.className = t === 'white' ? '' : 'theme-' + t
    safeSetItem('theme', t); document.getElementById('systemTheme').checked = false
  })
})
document.getElementById('systemTheme').addEventListener('change', function () {
  if (this.checked) { document.body.className = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'theme-obsidian' : ''; safeSetItem('theme', 'system') }
  else { const s = localStorage.getItem('theme') || 'white'; document.body.className = s === 'white' ? '' : 'theme-' + s }
})
const savedTheme = localStorage.getItem('theme') || 'white'
if (savedTheme === 'system') { document.getElementById('systemTheme').checked = true; document.body.className = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'theme-obsidian' : '' }
else if (savedTheme !== 'white') { document.body.className = 'theme-' + savedTheme; document.querySelector(`.theme-option[data-theme="${savedTheme}"]`)?.classList.add('active') }

const SETTINGS_KEYS = {
  toolbar: ['showSidebarBtn', 'showYtInput', 'compactMode'],
  files: ['autoUpdateLinks', 'confirmDeletion', 'detectAllExt'],
  history: ['saveLinkHistory', 'clearOnExit']
}
function applyToolbarSettings() {
  document.getElementById('menuBtn').style.display = loadSetting('showSidebarBtn', true) ? '' : 'none'
  document.querySelector('.top-bar-input').style.display = loadSetting('showYtInput', true) ? '' : 'none'
  document.body.classList.toggle('compact', loadSetting('compactMode', false))
}
document.querySelectorAll('#pane-toolbar .settings-toggle').forEach((t, i) => {
  const on = loadSetting(SETTINGS_KEYS.toolbar[i], true)
  if (on) t.classList.add('on'); else t.classList.remove('on')
  t.addEventListener('click', function () {
    saveSetting(SETTINGS_KEYS.toolbar[i], this.classList.contains('on'))
    applyToolbarSettings()
  })
})
document.querySelectorAll('#pane-files .settings-toggle').forEach((t, i) => {
  const on = loadSetting(SETTINGS_KEYS.files[i], true)
  if (on) t.classList.add('on'); else t.classList.remove('on')
  t.addEventListener('click', function () { saveSetting(SETTINGS_KEYS.files[i], this.classList.contains('on')) })
})
document.querySelectorAll('#pane-history .settings-toggle').forEach((t, i) => {
  const on = loadSetting(SETTINGS_KEYS.history[i], i === 0)
  if (on) t.classList.add('on'); else t.classList.remove('on')
  t.addEventListener('click', function () {
    saveSetting(SETTINGS_KEYS.history[i], this.classList.contains('on'))
    if (i === 0 && !this.classList.contains('on')) saveHistory([])
    if (document.getElementById('searchLanding').style.display === 'flex') renderSearchLanding()
  })
})
const nsfwTextarea = document.getElementById('nsfwDomains')
if (nsfwTextarea) {
  nsfwTextarea.value = getNSFW().join('\n')
  nsfwTextarea.addEventListener('input', () => {
    const domains = nsfwTextarea.value.split('\n').map(s => s.trim().toLowerCase()).filter(Boolean)
    saveNSFW(domains)
  })
}
const blurAllToggle = document.getElementById('blurAllNSFWToggle')
if (blurAllToggle) {
  blurAllToggle.classList.toggle('on', getBlurAllNSFW())
  blurAllToggle.addEventListener('click', () => {
    saveBlurAllNSFW(blurAllToggle.classList.contains('on'))
  })
}
document.querySelector('#pane-basic .settings-clear-btn')?.addEventListener('click', () => {
  if (confirm('Clear all saved data?')) { localStorage.removeItem('ytVideos'); localStorage.removeItem('ytFolders'); localStorage.removeItem('ytFolderMeta'); localStorage.removeItem('linkHistory'); localStorage.removeItem('ytBookmarks'); localStorage.removeItem('ytNotes'); renderSidebar(); clearCard() }
})
window.addEventListener('beforeunload', () => { const t = document.querySelector('#pane-history .settings-toggle:last-child'); if (t?.classList.contains('on')) localStorage.removeItem('linkHistory') })

applyToolbarSettings()

function loadHistory() { try { return JSON.parse(localStorage.getItem('linkHistory') || '[]') } catch { return [] } }
function saveHistory(h) { safeSetItem('linkHistory', JSON.stringify(h)) }

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
  loadIcons()
}
function setPublishedDate(d) { publishedDate = d; calMonth = d.getMonth(); calYear = d.getFullYear(); renderCalendar() }
function updatePrivacy(s) {
  const b = document.getElementById('privacyBadge'); if (!b) return
  const i = s === 'PUBLIC' ? { t: 'Public', c: 'public' } : s === 'UNLISTED' ? { t: 'Unlisted', c: 'unlisted' } : { t: 'Private', c: 'private' }
  b.className = 'cal-privacy ' + i.c; b.innerHTML = `<span class="dot"></span> ${i.t}`
}

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

// ─── Updcheck / version ──────────────────────────────
const APP_VERSION = '1.4.0'

// ─── Debug inspect mode (hover) ────────────────────────
let debugOn = false
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
  return el.id || Array.from(el.classList).join('.') || el.tagName.toLowerCase()
}

let _debugOverlay = null
let _debugLabel = null
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
}

function _showDebug(el, e) {
  _ensureDebugEls()
  const rect = el.getBoundingClientRect()
  _debugOverlay.style.cssText = `position:fixed;top:${rect.top}px;left:${rect.left}px;width:${rect.width}px;height:${rect.height}px;pointer-events:none;z-index:99999;border:2px solid #ff453a;border-radius:4px;display:block`
  const label = debugLabelFor(el)
  let color = debugColorCache.get(label)
  if (!color) { color = hashColor(label); debugColorCache.set(label, color) }
  _debugLabel.textContent = label
  _debugLabel.style.background = color
  _debugLabel.style.display = 'block'
  const lx = Math.min(e.clientX + 12, window.innerWidth - _debugLabel.offsetWidth - 8)
  const ly = Math.max(e.clientY - _debugLabel.offsetHeight - 8, 4)
  _debugLabel.style.left = lx + 'px'
  _debugLabel.style.top = ly + 'px'
}

function _hideDebug() {
  if (_debugOverlay) _debugOverlay.style.display = 'none'
  if (_debugLabel) _debugLabel.style.display = 'none'
}

let _debugTarget = null
function _onDebugMove(e) {
  const el = document.elementFromPoint(e.clientX, e.clientY)
  if (!el || el === _debugTarget || el.closest('.__debug-overlay,.__debug-label')) return
  _debugTarget = el
  _showDebug(el, e)
}

let _lockedEl = null
function _onDebugClick(e) {
  const el = document.elementFromPoint(e.clientX, e.clientY)
  if (!el || el.closest('.__debug-overlay,.__debug-label')) return
  _lockedEl = el
  const label = debugLabelFor(el)
  let color = debugColorCache.get(label)
  if (!color) { color = hashColor(label); debugColorCache.set(label, color) }
  el.style.outline = `2px solid ${color}`
  el.title = label
  if (navigator.clipboard) navigator.clipboard.writeText(label)
}

function toggleDebug() {
  debugOn = !debugOn
  if (!debugOn) {
    _hideDebug()
    document.removeEventListener('mousemove', _onDebugMove)
    document.removeEventListener('click', _onDebugClick)
    document.removeEventListener('keydown', _onDebugKey)
    document.body.style.cursor = ''
    const badge = document.getElementById('__debug-badge')
    if (badge) badge.remove()
    document.querySelectorAll('[style*="outline"]').forEach(el => {
      if (el.style.outline && el.style.outline.includes('px solid')) el.style.outline = ''
    })
    _debugTarget = null; _lockedEl = null
    return
  }
  _ensureDebugEls()
  document.body.style.cursor = 'crosshair'
  if (!document.getElementById('__debug-badge')) {
    const b = document.createElement('div')
    b.id = '__debug-badge'
    b.textContent = 'Inspect active — Esc to exit'
    b.style.cssText = 'position:fixed;bottom:12px;right:12px;z-index:100001;font-size:11px;font-family:monospace;background:#ff453a;color:#fff;padding:4px 10px;border-radius:6px;line-height:1.3;pointer-events:none;opacity:0.9'
    document.body.appendChild(b)
  }
  document.addEventListener('mousemove', _onDebugMove)
  document.addEventListener('click', _onDebugClick)
  document.addEventListener('keydown', _onDebugKey)
}

function _onDebugKey(e) {
  if (e.key === 'Escape') toggleDebug()
}

// ─── Init ──────────────────────────────────────────────
document.getElementById('appVersionLabel').textContent = APP_VERSION
loadIcons(); renderCalendar(); renderSidebar(); renderGridView(); document.getElementById('gridView').classList.add('open'); document.getElementById('gridBtn').classList.add('active'); document.querySelector('.content').style.display = 'none'

// Service worker update
if ('serviceWorker' in navigator) {
  let updateReg = null
  navigator.serviceWorker.register('sw.js').then(reg => {
    updateReg = reg
    if (reg.waiting) showUpdateBanner(reg.waiting)
    reg.addEventListener('updatefound', () => {
      const sw = reg.installing || reg.waiting
      if (sw) showUpdateBanner(sw)
    })
  })
  function showUpdateBanner(sw) {
    const toast = document.getElementById('updateToast')
    const text = document.getElementById('updateToastText')
    const btn = document.getElementById('updateToastBtn')
    const laterBtn = document.getElementById('updateLaterBtn')
    if (!toast || !btn) return
    text.textContent = 'Update available'
    toast.classList.add('show')
    if (laterBtn) laterBtn.style.display = ''
    btn.onclick = () => {
      sw.postMessage({ action: 'skipWaiting' })
      btn.onclick = null
      text.textContent = 'Updating…'
      btn.style.display = 'none'
      if (laterBtn) laterBtn.style.display = 'none'
    }
    if (laterBtn) {
      laterBtn.onclick = () => {
        toast.classList.remove('show')
        setTimeout(() => {
          if (!toast.classList.contains('show')) {
            text.textContent = 'Update available'
            toast.classList.add('show')
          }
        }, 180000)
      }
    }
  }
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload()
  })
}
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

// ─── Splash screen ──────────────────────────────────────
;(function(){
  var splash = document.getElementById('splash')
  var splashText = document.getElementById('splashText')
  if (!splash) return
  var faded = false
  var icon = splash.querySelector('.splash-content svg, .splash-content img')
  if (icon) {
    if (!navigator.onLine) { icon.style.filter = 'grayscale(1)'; icon.style.opacity = '0.5' }
    icon.style.transition = 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)'
    function randomSpin() {
      if (faded) return
      icon.style.transform = 'rotate(' + (360 * (Math.floor(Math.random() * 3) + 1)) + 'deg)'
      setTimeout(function(){ icon.style.transition = 'none'; icon.style.transform = 'rotate(0deg)'; setTimeout(function(){ icon.style.transition = 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)'; randomSpin() }, 50) }, 800)
    }
    setTimeout(randomSpin, 2000)
  }
  if (!navigator.onLine) { splash.classList.add('offline'); splashText.textContent = "You're offline" }
  function fadeOut() {
    if (faded) return; faded = true
    splash.classList.add('fade')
    setTimeout(function(){ splash.style.display = 'none' }, 500)
  }
  setTimeout(fadeOut, navigator.onLine ? 3000 : 2000)
})()
// Online status indicator
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
