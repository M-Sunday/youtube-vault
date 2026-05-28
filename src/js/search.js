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
  renderSidebar(); renderGridView(); closeSidebarMobile()
})

document.getElementById('daTitleInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') document.getElementById('daDialogConfirm').click(); if (e.key === 'Escape') document.getElementById('daDialogCancel').click() })

document.getElementById('daDialog').addEventListener('mousedown', (e) => { if (e.target === document.getElementById('daDialog')) document.getElementById('daDialogCancel').click() })

document.getElementById('ytInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { document.getElementById('ytBtn').click() };
  if (e.key === 'Escape') document.getElementById('ytInput').blur()
})
document.getElementById('ytInput').addEventListener('focus', () => {
  document.querySelector('.top-bar').classList.add('search-expanded')
  setView('landing')
  renderSearchLanding()
})
document.getElementById('ytInput').addEventListener('blur', (e) => {
  document.querySelector('.top-bar').classList.remove('search-expanded')
  const related = e.relatedTarget
  if (related && (related.closest('#searchLanding') || related.id === 'ytBtn' || related.closest('.top-bar-input'))) return
  if (!document.getElementById('gridView').classList.contains('open')) setView('grid')
})
