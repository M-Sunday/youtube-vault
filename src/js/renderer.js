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
function getDirectAccess() { try { return JSON.parse(localStorage.getItem('ytDirectAccess') || '[]') } catch { return [] } }
function saveDirectAccess(d) { localStorage.setItem('ytDirectAccess', JSON.stringify(d)) }
function getNSFW() { try { return JSON.parse(localStorage.getItem('ytNSFW') || '[]') } catch { return [] } }
function saveNSFW(n) { localStorage.setItem('ytNSFW', JSON.stringify(n)) }
function getBlurAllNSFW() { return localStorage.getItem('ytBlurAllNSFW') === 'true' }
function saveBlurAllNSFW(v) { localStorage.setItem('ytBlurAllNSFW', v ? 'true' : 'false') }
function isNSFW(url) {
  try {
    if (!getBlurAllNSFW()) return false
    const domain = new URL(url).hostname.replace(/^www\./, '').toLowerCase()
    return getNSFW().some(n => domain === n || domain.endsWith('.' + n))
  } catch { return false }
}
function getNotes() { try { return JSON.parse(localStorage.getItem('ytNotes') || '[]') } catch { return [] } }
function saveNotes(n) { localStorage.setItem('ytNotes', JSON.stringify(n)) }
function stripHtml(str) { return str.replace(/<[^>]*>/g, '') }
function getCollapsed() { try { return JSON.parse(localStorage.getItem('ytCollapsed') || '{}') } catch { return {} } }
function saveCollapsed(c) { localStorage.setItem('ytCollapsed', JSON.stringify(c)) }

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
      html += `<div class="tree-item" data-video-id="${id}" draggable="true"><div class="tree-file${currentVideo?.id === id ? ' active' : ''}${isPinned ? ' pinned' : ''}"><i data-lucide="file-video-2" class="tree-file-icon"></i><div class="tree-file-meta"><span class="tree-label">${v.title}</span><span class="tree-sublabel">${v.channel}</span></div></div></div>`
    }
    for (const n of getNotes()) {
      if (n.folder !== name) continue
      if (query && !n.title.toLowerCase().includes(query)) continue
      const preview = stripHtml(n.content || '').replace(/\n/g, ' ').substring(0, 50)
      html += `<div class="tree-item" data-note-id="${n.id}"><div class="tree-file"><i data-lucide="file-text" class="tree-file-icon"></i><div class="tree-file-meta"><span class="tree-label">${n.title || 'Untitled'}</span><span class="tree-sublabel">${preview}${stripHtml(n.content || '').length > 50 ? '…' : ''}</span></div></div></div>`
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
      html += `<div class="tree-item" data-bookmark-id="${bm.id}"><div class="tree-file"><div class="bm-thumb-wrap">${bm.image ? `<img class="bm-thumb${bmNsfw ? ' nsfw-blur' : ''}" src="${bm.image}" onerror="this.style.display='none'" />` : `<i data-lucide="external-link" class="tree-file-icon" style="margin:4px"></i>`}</div><div class="tree-file-meta"><span class="tree-label">${bm.title || bm.url}</span><span class="tree-sublabel">${bm.url}</span></div></div></div>`
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
      html += `<div class="tree-item" data-note-id="${n.id}"><div class="tree-file"><i data-lucide="file-text" class="tree-file-icon"></i><div class="tree-file-meta"><span class="tree-label">${n.title || 'Untitled'}</span><span class="tree-sublabel">${preview}${stripHtml(n.content || '').length > 50 ? '…' : ''}</span></div></div></div>`
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
      html += `<div class="tree-item" data-da-id="${d.id}"><div class="tree-file"><div class="bm-thumb-wrap">${d.image ? `<img class="bm-thumb${nsfw ? ' nsfw-blur' : ''}" src="${d.image}" onerror="this.style.display='none'" />` : `<i data-lucide="external-link" class="tree-file-icon" style="margin:4px"></i>`}</div><div class="tree-file-meta"><span class="tree-label">${d.title}</span><span class="tree-sublabel">${d.url}</span></div></div></div>`
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
      dragVideoId = el.dataset.videoId
      e.dataTransfer.setData('text/plain', el.dataset.videoId)
      e.dataTransfer.effectAllowed = 'move'
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
    loadIcons()
  } else {
    document.getElementById('ctxDiv3').style.display = 'none'
    document.getElementById('ctxMoveTo').classList.remove('show')
    document.getElementById('ctxDiv4').style.display = 'none'
  }
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
      for (const ids of Object.values(fs)) { const i = ids.indexOf(ctxTarget); if (i > -1) ids.splice(i, 1) }
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
  document.querySelector('.container').style.display = 'none'
  document.getElementById('noteView').style.display = 'flex'
  document.getElementById('noteViewTitle').value = n.title || ''
  document.getElementById('noteViewContent').innerHTML = n.content || ''
  document.getElementById('noteViewFooter').textContent = `Last edited ${new Date(n.updated || n.added).toLocaleString()}`
  renderSidebar()
}

function closeNoteView() {
  currentNoteId = null
  document.getElementById('noteView').style.display = 'none'
  document.querySelector('.container').style.display = ''
  renderSidebar()
}

let noteSaveTimer = null
document.getElementById('noteViewTitle').addEventListener('input', noteSaveContent)
document.getElementById('noteViewContent').addEventListener('input', noteSaveContent)

function noteSaveContent() {
  clearTimeout(noteSaveTimer)
  noteSaveTimer = setTimeout(() => {
    if (!currentNoteId) return
    const notes = getNotes()
    const n = notes.filter(x => x.id === currentNoteId)[0]
    if (!n) return
    n.title = document.getElementById('noteViewTitle').value
    n.content = document.getElementById('noteViewContent').innerHTML
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

document.getElementById('noteViewContent').addEventListener('paste', function () {
  setTimeout(() => {
    this.querySelectorAll('img').forEach(img => {
      img.style.maxWidth = ''
      img.style.borderRadius = ''
      img.style.margin = ''
      img.removeAttribute('width')
      img.removeAttribute('height')
    })
  }, 0)
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
      html += `<div class="grid-item" data-video-id="${id}">${pinned ? '<div class="pin-badge"><i data-lucide="pin-off" style="width:14px;height:14px"></i></div>' : ''}<div style="position:relative">${vBlur ? '<div class="nsfw-overlay"><i data-lucide="eye-off" style="width:20px;height:20px"></i></div>' : ''}<img class="grid-item-img${vBlur ? ' nsfw-blur' : ''}" src="${thumb}" loading="lazy" onerror="this.src='https://img.youtube.com/vi/${id}/hqdefault.jpg'" /></div><div class="grid-item-info"><div class="grid-item-title">${v.title}</div><div class="grid-item-sublabel">${v.channel}</div></div></div>`
    }
    for (const n of getNotes().filter(x => x.folder === name)) {
      const preview = stripHtml(n.content || '').replace(/\n/g, ' ').substring(0, 80)
      html += `<div class="grid-item note" data-note-id="${n.id}"><div class="grid-item-img" style="display:flex;align-items:center;justify-content:center;background:#e8e8ed;aspect-ratio:auto;height:60px"><i data-lucide="file-text" style="width:24px;height:24px;color:#8e8e93"></i></div><div class="grid-item-info"><div class="grid-item-title">${n.title || 'Untitled'}</div><div class="grid-item-sublabel">${preview}${stripHtml(n.content || '').length > 80 ? '…' : ''}</div></div></div>`
    }
    html += '</div></div>'
  }
  const bms = getBookmarks()
  if (bms.length) {
    html += `<div class="grid-section"><div class="grid-section-header"><i data-lucide="bookmark-fill" style="width:16px;height:16px;flex-shrink:0"></i> Bookmarks</div><div class="grid-items">`
    for (const bm of bms) {
      const bmNsfw = isNSFW(bm.url) || bm.blurred
      html += `<div class="grid-item bm" data-bookmark-id="${bm.id}">${bm.image ? `<div style="position:relative">${bmNsfw ? '<div class="nsfw-overlay"><i data-lucide="eye-off" style="width:20px;height:20px"></i></div>' : ''}<img class="grid-item-img${bmNsfw ? ' nsfw-blur' : ''}" src="${bm.image}" loading="lazy" /></div>` : '<div class="grid-item-img" style="display:flex;align-items:center;justify-content:center;background:#e8e8ed"><i data-lucide="external-link" style="width:24px;height:24px;color:#8e8e93"></i></div>'}<div class="grid-item-info"><div class="grid-item-title">${bm.title || bm.url}</div><div class="grid-item-sublabel">${bm.url}</div></div></div>`
    }
    html += '</div></div>'
  }
  const notes = getNotes().filter(x => !x.folder)
  if (notes.length) {
    html += `<div class="grid-section"><div class="grid-section-header"><i data-lucide="file-text-fill" style="width:16px;height:16px;flex-shrink:0"></i> Notes</div><div class="grid-items">`
    for (const n of notes) {
      const preview = stripHtml(n.content || '').replace(/\n/g, ' ').substring(0, 80)
      html += `<div class="grid-item note" data-note-id="${n.id}"><div class="grid-item-img" style="display:flex;align-items:center;justify-content:center;background:#e8e8ed;aspect-ratio:auto;height:60px"><i data-lucide="file-text" style="width:24px;height:24px;color:#8e8e93"></i></div><div class="grid-item-info"><div class="grid-item-title">${n.title || 'Untitled'}</div><div class="grid-item-sublabel">${preview}${stripHtml(n.content || '').length > 80 ? '…' : ''}</div></div></div>`
    }
    html += '</div></div>'
  }
  const das = getDirectAccess()
  if (das.length) {
    html += `<div class="grid-section"><div class="grid-section-header"><i data-lucide="link" style="width:16px;height:16px;flex-shrink:0"></i> Direct Access</div><div class="grid-items">`
    for (const d of das) {
      const nsfw = isNSFW(d.url) || d.blurred
      html += `<div class="grid-item bm" data-da-id="${d.id}">${d.image ? `<div style="position:relative">${nsfw ? '<div class="nsfw-overlay"><i data-lucide="eye-off" style="width:20px;height:20px"></i></div>' : ''}<img class="grid-item-img${nsfw ? ' nsfw-blur' : ''}" src="${d.image}" loading="lazy" onerror="this.style.display='none'" /></div>` : '<div class="grid-item-img" style="display:flex;align-items:center;justify-content:center;background:#e8e8ed"><i data-lucide="external-link" style="width:24px;height:24px;color:#8e8e93"></i></div>'}<div class="grid-item-info"><div class="grid-item-title">${d.title}</div><div class="grid-item-sublabel">${d.url}</div></div></div>`
    }
    html += '</div></div>'
  }
  el.innerHTML = html || '<div style="padding:30px;text-align:center;font-size:13px;color:#8e8e93">Nothing to show yet.</div>'
  loadIcons()
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
}
function showCardView() {
  document.getElementById('gridView').classList.remove('open')
  document.getElementById('gridBtn').classList.remove('active')
  document.querySelector('.content').style.display = ''
}
document.getElementById('gridBtn').addEventListener('click', function () {
  const open = this.classList.toggle('active')
  document.getElementById('gridView').classList.toggle('open', open)
  document.querySelector('.content').style.display = open ? 'none' : ''
  if (open) { if (currentNoteId) closeNoteView(); renderGridView() }
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

function clearCard() {
  currentVideo = null
  currentVideo = null
  document.getElementById('thumbnail').src = ''
  document.getElementById('durationBadge').textContent = '–'
  document.getElementById('videoTitle').textContent = 'Paste a video link above'
  document.getElementById('channelName').textContent = ''
  document.getElementById('cardAddRow').style.display = 'none'
  const badge = document.getElementById('imageWrap').querySelector('.pin-badge')
  if (badge) badge.remove()
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
    btn.onmouseover = () => {
      btn.innerHTML = '<i data-lucide="trash-2" class="card-add-icon"></i> Unlink'
      loadIcons()
    }
    btn.onmouseout = () => {
      btn.innerHTML = '<i data-lucide="check" class="card-add-icon"></i> Saved'
      loadIcons()
    }
    btn.onclick = (e) => { e.stopPropagation(); if (currentVideo) unlinkCurrentVideo() }
    loadIcons()
  } else {
    row.style.display = 'flex'
    btn.classList.remove('saved')
    btn.innerHTML = '<i data-lucide="plus" class="card-add-icon"></i> Add video'
    btn.onmouseover = btn.onmouseout = btn.onclick = null
    loadIcons()
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
  } catch (e) { document.getElementById('durationBadge').textContent = '–'; document.getElementById('videoTitle').textContent = 'Could not load video info'; document.getElementById('channelName').textContent = 'Try again or check the link' }
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
document.getElementById('ytInput').addEventListener('focus', () => { showCardView(); clearCard(); showHistoryDropdown() })
document.getElementById('ytInput').addEventListener('blur', () => setTimeout(() => document.getElementById('historyDropdown')?.classList.remove('open'), 200))
document.getElementById('ytInput').addEventListener('input', () => document.getElementById('historyDropdown')?.classList.remove('open'))
document.getElementById('ytInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') { document.getElementById('historyDropdown')?.classList.remove('open'); document.getElementById('ytBtn').click() }; if (e.key === 'Escape') document.getElementById('historyDropdown')?.classList.remove('open') })

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
  })
})
function saveSetting(key, on) { const s = JSON.parse(localStorage.getItem('ytSettings') || '{}'); s[key] = on; localStorage.setItem('ytSettings', JSON.stringify(s)) }
function loadSetting(key, def) { const s = JSON.parse(localStorage.getItem('ytSettings') || '{}'); return s[key] !== undefined ? s[key] : def }
document.querySelectorAll('.settings-toggle').forEach(t => t.addEventListener('click', function () { if (this.id === 'blurAllNSFWToggle') return; this.classList.toggle('on') }))
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
    blurAllToggle.classList.toggle('on')
    saveBlurAllNSFW(blurAllToggle.classList.contains('on'))
  })
}
document.querySelector('.settings-clear-btn')?.addEventListener('click', () => {
  if (confirm('Clear all saved data?')) { localStorage.removeItem('ytVideos'); localStorage.removeItem('ytFolders'); localStorage.removeItem('ytFolderMeta'); localStorage.removeItem('linkHistory'); localStorage.removeItem('ytBookmarks'); localStorage.removeItem('ytNotes'); renderSidebar(); clearCard() }
})
window.addEventListener('beforeunload', () => { const t = document.querySelector('#pane-history .settings-toggle:last-child'); if (t?.classList.contains('on')) localStorage.removeItem('linkHistory') })

applyToolbarSettings()

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
      <div style="margin-bottom:18px">
        <div style="font-weight:600;margin-bottom:2px">${u.version} — ${u.date}</div>
        <div style="opacity:.8;margin-bottom:6px">${u.title}</div>
        <ul style="margin:0;padding-left:18px">${u.changes.map(c => `<li style="margin-bottom:2px">${c}</li>`).join('')}</ul>
      </div>
    `).join('')
  }).catch(() => { document.getElementById('patchNotesList').innerHTML = '<p>Could not load patch notes.</p>' })
}

// ─── Keyboard shortcuts ────────────────────────────────
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'L') { e.preventDefault(); document.getElementById('ytInput').focus() }
  if ((e.metaKey || e.ctrlKey) && e.key === '=') { e.preventDefault(); document.getElementById('addBtn').click() }
  if ((e.metaKey || e.ctrlKey) && e.key === ',') { e.preventDefault(); settingsOverlay.classList.add('open') }
})

// ─── Updcheck / version ──────────────────────────────
const APP_VERSION = '1.2.0'

// ─── Debug color toggle ────────────────────────────────
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
function toggleDebug() {
  debugOn = !debugOn
  const els = document.querySelectorAll('body *:not(.debug-label):not(svg):not(svg *)')
  if (!debugOn) {
    els.forEach(el => {
      el.style.outline = ''
      el.style.position = ''
      const label = el.querySelector('.debug-label')
      if (label) label.remove()
    })
    return
  }
  els.forEach(el => {
    const labelText = debugLabelFor(el)
    if (!labelText) return
    let color = debugColorCache.get(labelText)
    if (!color) { color = hashColor(labelText); debugColorCache.set(labelText, color) }
    el.style.outline = `1.5px solid ${color}`
    el.style.position = 'relative'
    if (!el.querySelector('.debug-label')) {
      const label = document.createElement('div')
      label.className = 'debug-label'
      label.textContent = labelText
      label.style.cssText = `position:absolute;top:0;left:0;font-size:9px;font-family:monospace;background:${color};color:#fff;padding:1px 4px;border-radius:0 0 3px 0;z-index:99999;pointer-events:none;line-height:1.2;`
      el.appendChild(label)
    }
  })
}

// ─── Init ──────────────────────────────────────────────
document.getElementById('appVersionLabel').textContent = APP_VERSION
loadIcons(); renderCalendar(); renderSidebar(); renderGridView(); document.getElementById('gridView').classList.add('open'); document.getElementById('gridBtn').classList.add('active'); document.querySelector('.content').style.display = 'none'

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
  localStorage.setItem('ytLastVersion', APP_VERSION)
}
document.getElementById('updateCloseBtn').addEventListener('click', () => {
  document.getElementById('updateOverlay').classList.remove('open')
})
