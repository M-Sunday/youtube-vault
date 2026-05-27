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
