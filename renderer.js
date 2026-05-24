// ─── Data ──────────────────────────────────────────────
function getVideos() { try { return JSON.parse(localStorage.getItem('ytVideos') || '{}') } catch { return {} } }
function saveVideos(v) { localStorage.setItem('ytVideos', JSON.stringify(v)) }
function getFolders() { try { return JSON.parse(localStorage.getItem('ytFolders') || '{"Videos":[],"Archived":[]}') } catch { return { Videos: [], Archived: [] } } }
function saveFolders(f) { localStorage.setItem('ytFolders', JSON.stringify(f)) }
function getFolderMeta() { try { return JSON.parse(localStorage.getItem('ytFolderMeta') || '{}') } catch { return {} } }
function saveFolderMeta(m) { localStorage.setItem('ytFolderMeta', JSON.stringify(m)) }
function getPins() { try { return JSON.parse(localStorage.getItem('ytPins') || '[]') } catch { return [] } }
function savePins(p) { localStorage.setItem('ytPins', JSON.stringify(p)) }
function getBookmarks() { try { return JSON.parse(localStorage.getItem('ytBookmarks') || '[]') } catch { return [] } }
function saveBookmarks(b) { localStorage.setItem('ytBookmarks', JSON.stringify(b)) }

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
  // Bookmarks
  const bookmarks = getBookmarks()
  if (bookmarks.length) {
    html += `<div class="tree-item expanded" data-bookmarks="true"><div class="tree-folder" draggable="false"><i data-lucide="chevron-down" class="tree-chevron"></i><i data-lucide="bookmark" class="tree-folder-icon"></i><span class="tree-label">Bookmarks</span></div><div class="tree-children">`
    for (const bm of bookmarks) {
      if (query && !bm.title.toLowerCase().includes(query) && !bm.url.toLowerCase().includes(query)) continue
      html += `<div class="tree-item" data-bookmark-id="${bm.id}"><div class="tree-file"><div class="bm-thumb-wrap">${bm.image ? `<img class="bm-thumb" src="${bm.image}" onerror="this.style.display='none'" />` : `<i data-lucide="external-link" class="tree-file-icon" style="margin:4px"></i>`}</div><div class="tree-file-meta"><span class="tree-label">${bm.title || bm.url}</span><span class="tree-sublabel">${bm.url}</span></div></div></div>`
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
      if (id && id !== 'placeholder') { const v = getVideos()[id]; if (v) { loadVideoById(id); if (window.innerWidth <= 640) document.getElementById('sidebar').classList.add('closed') } }
      const bm = file.closest('[data-bookmark-id]')
      if (bm) {
        const bms = getBookmarks().filter(b => b.id === bm.dataset.bookmarkId)
        if (bms[0]?.url) { window.open(bms[0].url); if (window.innerWidth <= 640) document.getElementById('sidebar').classList.add('closed') }
      }
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
      const entry = file.closest('[data-video-id]'), folder = file.closest('[data-folder]'), bm = file.closest('[data-bookmark-id]')
      if (bm) showContextMenu(e.clientX, e.clientY, null, null, bm.dataset.bookmarkId)
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
  // Mobile long-press for sidebar items
  document.querySelectorAll('.tree-folder, .tree-file').forEach(el => {
    let longTimer = null, longPressed = false
    el.addEventListener('touchstart', (e) => {
      if (el.closest('.folder-rename')) return
      longPressed = false
      longTimer = setTimeout(() => {
        longPressed = true
        const touch = e.touches[0]
        const item = el.closest('[data-folder]'), video = el.closest('[data-video-id]'), bm = el.closest('[data-bookmark-id]')
        if (video) {
          showContextMenu(touch.clientX, touch.clientY, video.dataset.videoId, item?.dataset.folder || null)
        } else if (bm) {
          showContextMenu(touch.clientX, touch.clientY, null, null, bm.dataset.bookmarkId)
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
let ctxTarget = null, ctxFolder = null, ctxBookmark = null
function showContextMenu(x, y, videoId, folderName, bookmarkId) {
  const menu = document.getElementById('ctxMenu')
  ctxTarget = videoId; ctxFolder = folderName; ctxBookmark = bookmarkId
  const isTouch = 'ontouchstart' in window
  menu.style.left = (isTouch ? x - 40 : x) + 'px'
  menu.style.top = (isTouch ? y - 40 : y) + 'px'
  menu.classList.add('open')
  const isBm = bookmarkId !== null && bookmarkId !== undefined
  const showVideo = videoId !== null && videoId !== undefined
  menu.querySelector('[data-action="rename-folder"]').style.display = videoId ? 'none' : isBm ? 'none' : ''
  menu.querySelector('[data-action="delete-folder"]').style.display = videoId ? 'none' : isBm ? 'none' : ''
  menu.querySelector('[data-action="open-link"]').style.display = (showVideo || isBm) ? '' : 'none'
  menu.querySelector('[data-action="archive"]').style.display = showVideo ? '' : 'none'
  menu.querySelector('[data-action="pin"]').style.display = showVideo ? '' : 'none'
  menu.querySelector('[data-action="move-up"]').style.display = showVideo ? '' : 'none'
  menu.querySelector('[data-action="move-down"]').style.display = showVideo ? '' : 'none'
  menu.querySelector('[data-action="delete"]').style.display = (showVideo || isBm) ? '' : 'none'
  const delItem = menu.querySelector('[data-action="delete"]')
  delItem.innerHTML = `<i data-lucide="trash-2" class="ctx-icon"></i> ${isBm ? 'Delete bookmark' : 'Delete'}`
  delItem.className = isBm ? 'ctx-item ctx-danger' : 'ctx-item ctx-danger'
  document.getElementById('ctxDiv1').style.display = (videoId || isBm) ? '' : 'none'
  document.getElementById('ctxDiv2').style.display = showVideo ? '' : 'none'
  document.getElementById('ctxDiv3').style.display = showVideo ? '' : 'none'
  document.getElementById('ctxMoveTo').classList.remove('show')
  document.getElementById('ctxDiv4').style.display = 'none'
  if (videoId) {
    const pinItem = menu.querySelector('[data-action="pin"]')
    const isPinned = getPins().includes(videoId)
    pinItem.innerHTML = `<i data-lucide="pin" class="ctx-icon"></i> ${isPinned ? 'Unpin' : 'Pin'}`
    // Populate "Move to" section
    const moveToEl = document.getElementById('ctxMoveTo')
    const folders = getFolders()
    const currentFolder = folderName
    const folderEntries = Object.keys(folders).filter(n => n !== currentFolder && n !== 'Archived')
    const moveDiv4 = document.getElementById('ctxDiv4')
    if (folderEntries.length) {
      let mHtml = ''
      for (const name of folderEntries) {
        const color = (getFolderMeta()[name]?.color || '')
        mHtml += `<div class="ctx-item" data-action="move-to" data-folder="${name}"><i data-lucide="folder" class="ctx-icon"${color ? ` style="color:${color}"` : ''}></i> Move to ${name}</div>`
      }
      moveToEl.innerHTML = mHtml
      moveToEl.classList.add('show')
      moveDiv4.style.display = ''
    } else {
      moveToEl.classList.remove('show')
      moveDiv4.style.display = 'none'
    }
    lucide.createIcons()
  } else {
    document.getElementById('ctxDiv3').style.display = 'none'
    document.getElementById('ctxMoveTo').classList.remove('show')
    document.getElementById('ctxDiv4').style.display = 'none'
  }
}

document.addEventListener('click', () => document.getElementById('ctxMenu').classList.remove('open'))

// Delegated context menu actions (handles both static and dynamic items)
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
    if (a === 'open-link' && ctxTarget) {
      const vs = getVideos()
      const v = vs[ctxTarget]
      if (v?.url) window.open(v.url)
    }
    if (a === 'open-link' && ctxBookmark && !ctxTarget) {
      const bm = getBookmarks().filter(b => b.id === ctxBookmark)[0]
      if (bm?.url) window.open(bm.url)
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
      for (const ids of Object.values(fs)) { const i = ids.indexOf(ctxTarget); if (i > -1) ids.splice(i, 1) }
      if (!fs[target]) fs[target] = []
      if (!fs[target].includes(ctxTarget)) fs[target].push(ctxTarget)
      saveFolders(fs); renderSidebar()
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
  // Try to fetch og:image
  try {
    const html = await (await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`)).text()
    const m = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i) || html.match(/<link\s+rel="image_src"\s+href="([^"]+)"/i)
    if (m) bm.image = m[1]
  } catch (_) {}
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

// ─── Grid view ─────────────────────────────────────────
function renderGridView() {
  const el = document.getElementById('gridView')
  let html = ''
  const folders = getFolders()
  const meta = getFolderMeta()
  const videos = getVideos()
  for (const [name, ids] of Object.entries(folders)) {
    if (!ids.length) continue
    const color = meta[name]?.color || ''
    html += `<div class="grid-section"><div class="grid-section-header"${color ? ` style="color:${color}"` : ''}><i data-lucide="folder" style="width:16px;height:16px;flex-shrink:0"></i> ${name}</div><div class="grid-items">`
    for (const id of ids) {
      const v = videos[id]
      if (!v) continue
      const thumb = v.thumbnail || `https://img.youtube.com/vi/${id}/maxresdefault.jpg`
      html += `<div class="grid-item" data-video-id="${id}"><img class="grid-item-img" src="${thumb}" loading="lazy" onerror="this.src='https://img.youtube.com/vi/${id}/hqdefault.jpg'" /><div class="grid-item-info"><div class="grid-item-title">${v.title}</div><div class="grid-item-sublabel">${v.channel}</div></div></div>`
    }
    html += '</div></div>'
  }
  const bms = getBookmarks()
  if (bms.length) {
    html += `<div class="grid-section"><div class="grid-section-header"><i data-lucide="bookmark" style="width:16px;height:16px;flex-shrink:0"></i> Bookmarks</div><div class="grid-items">`
    for (const bm of bms) {
      html += `<div class="grid-item bm" data-bookmark-id="${bm.id}">${bm.image ? `<img class="grid-item-img" src="${bm.image}" loading="lazy" />` : '<div class="grid-item-img" style="display:flex;align-items:center;justify-content:center;background:#e8e8ed"><i data-lucide="external-link" style="width:24px;height:24px;color:#8e8e93"></i></div>'}<div class="grid-item-info"><div class="grid-item-title">${bm.title || bm.url}</div><div class="grid-item-sublabel">${bm.url}</div></div></div>`
    }
    html += '</div></div>'
  }
  el.innerHTML = html || '<div style="padding:30px;text-align:center;font-size:13px;color:#8e8e93">Nothing to show yet.</div>'
  lucide.createIcons()
  // Click handlers
  el.querySelectorAll('[data-video-id]').forEach(item => {
    item.addEventListener('click', () => {
      const id = item.dataset.videoId
      const v = videos[id]
      if (v) { loadVideoById(id); document.getElementById('gridBtn').click() }
    })
  })
  el.querySelectorAll('[data-bookmark-id]').forEach(item => {
    item.addEventListener('click', () => {
      const bm = bms.filter(b => b.id === item.dataset.bookmarkId)[0]
      if (bm?.url) window.open(bm.url)
    })
  })
}
document.getElementById('gridBtn').addEventListener('click', function () {
  const open = this.classList.toggle('active')
  document.getElementById('gridView').classList.toggle('open', open)
  document.querySelector('.content').style.display = open ? 'none' : ''
  if (open) renderGridView()
})

// ─── Sidebar toolbar ──────────────────────────────────
document.getElementById('pinBtn').addEventListener('click', function () { this.classList.toggle('pinned') })
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
  hideWelcome(); renderSidebar(); updateCardAddBtn()
}

function clearCard() {
  document.getElementById('thumbnail').src = ''
  document.getElementById('durationBadge').textContent = '–'
  document.getElementById('videoTitle').textContent = 'Paste a YouTube link above'
  document.getElementById('channelName').textContent = ''
  document.getElementById('cardAddRow').style.display = 'none'
  showWelcome()
}

// ─── Welcome screen ────────────────────────────────────
function showWelcome() {
  document.getElementById('welcome').style.display = 'flex'
  document.getElementById('imageWrap').style.display = 'none'
  document.querySelector('.card-body').style.display = 'none'
  document.querySelector('.calendar').style.display = 'none'
}
function hideWelcome() {
  document.getElementById('welcome').style.display = 'none'
  document.getElementById('imageWrap').style.display = 'block'
  document.querySelector('.card-body').style.display = 'block'
  document.querySelector('.calendar').style.display = 'block'
}

// ─── Thumbnail click to open link ─────────────────────
document.getElementById('imageWrap').addEventListener('click', () => {
  if (currentVideo?.url) window.open(currentVideo.url)
})

// ─── Add video ────────────────────────────────────────
function updateCardAddBtn() {
  const row = document.getElementById('cardAddRow')
  const btn = document.getElementById('cardAddBtn')
  if (!currentVideo) { row.style.display = 'none'; return }
  const vs = getVideos()
  if (vs[currentVideo.id]) {
    row.style.display = 'flex'
    btn.classList.add('saved')
    btn.innerHTML = '<i data-lucide="check" class="card-add-icon"></i> Saved'
    lucide.createIcons()
  } else {
    row.style.display = 'flex'
    btn.classList.remove('saved')
    btn.innerHTML = '<i data-lucide="plus" class="card-add-icon"></i> Add video'
    lucide.createIcons()
  }
}

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
}
document.getElementById('addBtn').addEventListener('click', addCurrentVideo)
document.getElementById('cardAddBtn').addEventListener('click', addCurrentVideo)

// ─── Video fetch ──────────────────────────────────────
function getVideoId(url) {
  for (const r of [/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/, /^([a-zA-Z0-9_-]{11})$/]) { const m = url.match(r); if (m) return m[1] }
  return null
}
async function loadVideo(videoId) {
  hideWelcome()
  const url = `https://www.youtube.com/watch?v=${videoId}`
  document.getElementById('thumbnail').src = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
  document.getElementById('durationBadge').textContent = '...'
  document.getElementById('videoTitle').textContent = 'Loading...'; document.getElementById('channelName').textContent = ''
  try {
    const data = await (await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`)).json()
    const title = data.title || 'Unknown'
    const channel = data.author_name || ''
    let sec = 0, dateStr = '', privacy = 'PUBLIC'
    // Try proxies for duration/date/privacy
    const proxies = [
      `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
      `https://corsproxy.io/?url=${encodeURIComponent(url)}`
    ]
    for (const proxyUrl of proxies) {
      try {
        const html = await (await fetch(proxyUrl)).text()
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
    hideWelcome(); renderSidebar(); updateCardAddBtn()
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
  if (confirm('Clear all saved data?')) { localStorage.removeItem('ytVideos'); localStorage.removeItem('ytFolders'); localStorage.removeItem('ytFolderMeta'); localStorage.removeItem('linkHistory'); localStorage.removeItem('ytBookmarks'); renderSidebar(); clearCard() }
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
lucide.createIcons(); renderCalendar(); renderSidebar(); showWelcome()

// Service worker update
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').then(reg => {
    reg.addEventListener('updatefound', () => {
      const toast = document.getElementById('updateToast')
      toast.classList.add('show')
      setTimeout(() => toast.classList.remove('show'), 3000)
    })
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
