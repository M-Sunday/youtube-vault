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
      const noteIcon = n.todos && n.todos.length ? 'list-todo' : 'file-text'
      html += `<div class="tree-item" data-note-id="${n.id}" draggable="true"><div class="tree-file"><i data-lucide="${noteIcon}" class="tree-file-icon"></i><div class="tree-file-meta"><span class="tree-label">${n.title || 'Untitled'}</span><span class="tree-sublabel">${preview}${stripHtml(n.content || '').length > 50 ? '…' : ''}</span></div><button class="tree-file-btn"><i data-lucide="ellipsis-vertical" style="width:14px;height:14px"></i></button></div></div>`
    }
    html += '</div></div>'
  }
  const bookmarks = getBookmarks()
  if (bookmarks.length) {
    const bmCollapsed = getCollapsed()['section:bookmarks']
    html += `<div class="tree-item ${bmCollapsed ? '' : 'expanded'}" data-bookmarks="true"><div class="tree-folder" draggable="false"><i data-lucide="chevron-down" class="tree-chevron"></i><i data-lucide="bookmark-fill" class="tree-folder-icon"></i><span class="tree-label">Bookmarks</span></div><div class="tree-children">`
    for (const bm of bookmarks) {
      if (query && !bm.title.toLowerCase().includes(query) && !bm.url.toLowerCase().includes(query)) continue
      const bmNsfw = isNSFW(bm) || bm.blurred
      html += `<div class="tree-item" data-bookmark-id="${bm.id}" draggable="true"><div class="tree-file"><div class="bm-thumb-wrap">${bm.image ? `<img class="bm-thumb${bmNsfw ? ' nsfw-blur' : ''}" src="${bm.image}" onerror="this.style.display='none'" />` : `<i data-lucide="external-link" class="tree-file-icon" style="margin:4px"></i>`}</div><div class="tree-file-meta${bmNsfw ? ' nsfw-blur' : ''}"><span class="tree-label">${bm.title || bm.url}</span><span class="tree-sublabel">${bm.url}</span></div><button class="tree-file-btn"><i data-lucide="ellipsis-vertical" style="width:14px;height:14px"></i></button></div></div>`
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
      const noteIcon = n.todos && n.todos.length ? 'list-todo' : 'file-text'
      html += `<div class="tree-item" data-note-id="${n.id}" draggable="true"><div class="tree-file"><i data-lucide="${noteIcon}" class="tree-file-icon"></i><div class="tree-file-meta"><span class="tree-label">${n.title || 'Untitled'}</span><span class="tree-sublabel">${preview}${stripHtml(n.content || '').length > 50 ? '…' : ''}</span></div><button class="tree-file-btn"><i data-lucide="ellipsis-vertical" style="width:14px;height:14px"></i></button></div></div>`
    }
    html += '</div></div>'
  }
  const da = getDirectAccess()
  if (da.length) {
    const daCollapsed = getCollapsed()['section:directaccess']
    html += `<div class="tree-item ${daCollapsed ? '' : 'expanded'}" data-directaccess="true"><div class="tree-folder" draggable="false"><i data-lucide="chevron-down" class="tree-chevron"></i><i data-lucide="link" class="tree-folder-icon"></i><span class="tree-label">Direct Access</span></div><div class="tree-children">`
    for (const d of da) {
      if (query && !d.title.toLowerCase().includes(query) && !d.url.toLowerCase().includes(query)) continue
      const nsfw = isNSFW(d) || d.blurred
      html += `<div class="tree-item" data-da-id="${d.id}" draggable="true"><div class="tree-file"><div class="bm-thumb-wrap">${d.image ? `<img class="bm-thumb${nsfw ? ' nsfw-blur' : ''}" src="${d.image}" onerror="this.style.display='none'" />` : `<i data-lucide="external-link" class="tree-file-icon" style="margin:4px"></i>`}</div><div class="tree-file-meta${nsfw ? ' nsfw-blur' : ''}"><span class="tree-label">${d.title}</span><span class="tree-sublabel">${d.url}</span></div><button class="tree-file-btn"><i data-lucide="ellipsis-vertical" style="width:14px;height:14px"></i></button></div></div>`
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
      const id = e.dataTransfer.getData('text/plain')
      const type = e.dataTransfer.getData('type')
      if (!id) return
      const folderName = item.dataset.folder
      if (!folderName) return
      if (type === 'video') {
        const folders = getFolders()
        for (const ids of Object.values(folders)) {
          const idx = ids.indexOf(id)
          if (idx > -1) ids.splice(idx, 1)
        }
        if (!folders[folderName]) folders[folderName] = []
        if (!folders[folderName].includes(id)) folders[folderName].push(id)
        saveFolders(folders)
        renderSidebar()
        renderGridView()
      } else if (type === 'note') {
        let notes = getNotes()
        const note = notes.find(n => n.id === id)
        if (note) {
          note.folder = folderName
          saveNotes(notes)
          renderSidebar()
          renderGridView()
        }
      }
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

// ─── Sidebar toolbar ──────────────────────────────────
let _lastMenuToggle = 0
document.getElementById('menuBtn').addEventListener('click', (e) => {
  e.stopPropagation()
  _lastMenuToggle = Date.now()
  document.getElementById('sidebar').classList.toggle('closed')
})
document.getElementById('sidebarBackdrop').addEventListener('click', () => {
  if (Date.now() - _lastMenuToggle < 400) return
  document.getElementById('sidebar').classList.add('closed')
})
document.getElementById('searchInput').addEventListener('input', renderSidebar)
document.getElementById('searchInput').addEventListener('focus', () => {
  setView('landing')
  renderSearchLanding()
})

// ─── Mobile sidebar helper ────────────────────────────────
function closeSidebarMobile() { if (window.innerWidth <= 640) document.getElementById('sidebar').classList.add('closed') }
window.closeSidebarMobile = closeSidebarMobile
