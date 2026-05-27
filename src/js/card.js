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

function updateCardAddBtn() {
  const row = document.getElementById('cardAddRow')
  const btn = document.getElementById('cardAddBtn')
  const copyBtn = document.getElementById('copyLinkBtn')
  const dlBtn = document.getElementById('dlBtn')
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
    if (isElectron && dlBtn) dlBtn.style.display = 'inline-flex'
    loadIcons()
  } else {
    row.style.display = 'flex'
    btn.classList.remove('saved')
    btn.innerHTML = '<i data-lucide="plus" class="card-add-icon"></i> Add video'
    btn.onmouseover = btn.onmouseout = btn.onclick = null
    copyBtn.style.display = 'none'
    if (dlBtn) dlBtn.style.display = 'none'
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

// ─── Event listeners ──────────────────────────────────
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

document.getElementById('imageWrap').addEventListener('click', () => {
  if (currentVideo?.url) window.open(currentVideo.url)
})

document.getElementById('addBtn').addEventListener('click', addCurrentVideo)
document.getElementById('cardAddBtn').addEventListener('click', addCurrentVideo)
