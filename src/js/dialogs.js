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
  renderSidebar(); renderGridView()
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
