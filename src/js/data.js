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
function isNSFW(item) {
  try {
    if (!getBlurAllNSFW()) return false
    const words = getNSFW().filter(Boolean)
    if (!words.length) return false
    const url = item?.url || ''
    const title = item?.title || ''
    const channel = item?.channel || ''

    const text = (url + ' ' + title + ' ' + channel).toLowerCase()
    if (words.some(n => text.includes(n))) return true

    if (url) {
      let fullUrl = url
      if (!/^https?:\/\//i.test(url)) {
        fullUrl = 'https://' + url.replace(/^\/+/, '')
      }
      try {
        const domain = new URL(fullUrl).hostname.replace(/^www\./, '').toLowerCase()
        if (words.some(n => domain === n || domain.endsWith('.' + n) || domain.startsWith(n + '.'))) return true
      } catch {}
    }

    return false
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

const APP_VERSION = '1.4.4'
