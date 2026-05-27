// ─── Views ─────────────────────────────────────────────
function setView(view) {
  var gv = document.getElementById('gridView'), sl = document.getElementById('searchLanding'), ct = document.querySelector('.content'), nv = document.getElementById('noteView'), gb = document.getElementById('gridBtn')
  gv.classList.remove('open'); gb.classList.remove('active'); sl.style.display = 'none'; ct.style.display = 'none'; nv.style.display = 'none'
  if (view === 'grid') { gv.classList.add('open'); gb.classList.add('active') }
  else if (view === 'card') ct.style.display = ''
  else if (view === 'landing') sl.style.display = 'flex'
  else if (view === 'note') nv.style.display = 'flex'
}
function showCardView() { setView('card') }

function clearCard() {
  currentVideo = null
  document.getElementById('thumbnail').src = ''
  document.getElementById('durationBadge').textContent = '–'
  document.getElementById('videoTitle').textContent = 'Paste a video link above'
  document.getElementById('channelName').textContent = ''
  document.getElementById('cardAddRow').style.display = 'none'
  const badge = document.getElementById('imageWrap').querySelector('.pin-badge')
  if (badge) badge.remove()
  setView('landing'); renderSearchLanding()
}

function closeNoteView() {
  currentNoteId = null
  if (currentVideo) { setView('card'); renderSidebar() } else clearCard()
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

function showSplashForUpdate() {
  const s = document.getElementById('splash')
  if (!s) return
  s.style.display = ''
  s.classList.remove('fade')
  const img = s.querySelector('.splash-content img')
  if (img) { img.style.transition = 'none'; img.style.transform = 'rotate(0deg)' }
  const t = document.getElementById('splashText')
  if (t) t.textContent = navigator.onLine ? 'Updating…' : "You're offline"
}
