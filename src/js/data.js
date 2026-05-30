// ─── Data ──────────────────────────────────────────────
function migrateStorage() {
  if (localStorage.getItem('kiro_migrated')) return
  var map = [
    ['ytVideos', 'kiroVideos'],
    ['ytFolders', 'kiroFolders'],
    ['ytFolderMeta', 'kiroFolderMeta'],
    ['ytPins', 'kiroPins'],
    ['ytBookmarks', 'kiroBookmarks'],
    ['ytDirectAccess', 'kiroDirectAccess'],
    ['ytNSFW', 'kiroNSFW'],
    ['ytBlurAllNSFW', 'kiroBlurAllNSFW'],
    ['ytNotes', 'kiroNotes'],
    ['ytCollapsed', 'kiroCollapsed'],
    ['ytUserName', 'kiroUserName'],
    ['ytSettings', 'kiroSettings'],
    ['ytSwVersion', 'kiroSwVersion'],
    ['ytLastVersion', 'kiroLastVersion'],
    ['vault_challenges', 'kiro_challenges'],
    ['vault_achievements', 'kiro_achievements'],
    ['vault_goals', 'kiro_goals']
  ]
  for (var i = 0; i < map.length; i++) {
    var old = localStorage.getItem(map[i][0])
    if (old !== null) {
      localStorage.setItem(map[i][1], old)
      localStorage.removeItem(map[i][0])
    }
  }
  localStorage.setItem('kiro_migrated', 'true')
}
migrateStorage()

function getVideos() { try { return JSON.parse(localStorage.getItem('kiroVideos') || '{}') } catch { return {} } }
function saveVideos(v) { safeSetItem('kiroVideos', JSON.stringify(v)) }
function getFolders() { try { return JSON.parse(localStorage.getItem('kiroFolders') || '{"Videos":[],"Archived":[]}') } catch { return { Videos: [], Archived: [] } } }
function saveFolders(f) { safeSetItem('kiroFolders', JSON.stringify(f)) }
function getFolderMeta() { try { return JSON.parse(localStorage.getItem('kiroFolderMeta') || '{}') } catch { return {} } }
function saveFolderMeta(m) { safeSetItem('kiroFolderMeta', JSON.stringify(m)) }
function getPins() { try { return JSON.parse(localStorage.getItem('kiroPins') || '[]') } catch { return [] } }
function savePins(p) { safeSetItem('kiroPins', JSON.stringify(p)) }
function getBookmarks() { try { return JSON.parse(localStorage.getItem('kiroBookmarks') || '[]') } catch { return [] } }
function saveBookmarks(b) { safeSetItem('kiroBookmarks', JSON.stringify(b)) }
function getDirectAccess() { try { return JSON.parse(localStorage.getItem('kiroDirectAccess') || '[]') } catch { return [] } }
function saveDirectAccess(d) { safeSetItem('kiroDirectAccess', JSON.stringify(d)) }
var NSFW_DEFAULTS = ['pornhub.com', 'xvideos.com', 'xnxx.com', 'redtube.com', 'youporn.com', 'xhamster.com', 'stripchat.com', 'chaturbate.com', 'onlyfans.com']
function getNSFW() { try { var v = localStorage.getItem('kiroNSFW'); if (v === null) { safeSetItem('kiroNSFW', JSON.stringify(NSFW_DEFAULTS)); return NSFW_DEFAULTS.slice() }; return JSON.parse(v) } catch { return [] } }
function saveNSFW(n) { safeSetItem('kiroNSFW', JSON.stringify(n)) }
function getBlurAllNSFW() { return localStorage.getItem('kiroBlurAllNSFW') === 'true' }
function saveBlurAllNSFW(v) { safeSetItem('kiroBlurAllNSFW', v ? 'true' : 'false') }
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
function autoApplyNSFW() {
  if (!getBlurAllNSFW()) return
  if (!getNSFW().filter(Boolean).length) return
  var changed = false
  var vs = getVideos()
  for (var id in vs) {
    if (!vs[id].blurred && isNSFW(vs[id])) { vs[id].blurred = true; changed = true }
  }
  if (changed) saveVideos(vs)
  changed = false
  var bms = getBookmarks()
  for (var i = 0; i < bms.length; i++) {
    if (!bms[i].blurred && isNSFW(bms[i])) { bms[i].blurred = true; changed = true }
  }
  if (changed) saveBookmarks(bms)
  changed = false
  var das = getDirectAccess()
  for (var i = 0; i < das.length; i++) {
    if (!das[i].blurred && isNSFW(das[i])) { das[i].blurred = true; changed = true }
  }
  if (changed) saveDirectAccess(das)
}
let selectedGridItems = new Set()
function updateBatchBar() {
  const bar = document.getElementById('batchBar')
  const count = document.getElementById('batchCount')
  const len = selectedGridItems.size
  if (len) { bar.style.display = 'flex'; count.textContent = len + ' selected' }
  else { bar.style.display = 'none' }
}
function getNotes() { try { return JSON.parse(localStorage.getItem('kiroNotes') || '[]') } catch { return [] } }
function saveNotes(n) { safeSetItem('kiroNotes', JSON.stringify(n)) }
function stripHtml(str) { return str.replace(/<[^>]*>/g, '') }
function getCollapsed() { try { return JSON.parse(localStorage.getItem('kiroCollapsed') || '{}') } catch { return {} } }
function saveCollapsed(c) { safeSetItem('kiroCollapsed', JSON.stringify(c)) }
function safeSetItem(key, val) { try { localStorage.setItem(key, val) } catch (e) { if (e.name === 'QuotaExceededError') { const t = document.getElementById('updateToast'); t.textContent = 'Storage full — clear some data'; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 3000) } } }
function sanitizeHtml(str) {
  const allowed = /^(b|i|u|em|strong|a|br|p|ul|ol|li|span|div|h[1-6]|pre|code|blockquote|img|input)$/i
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

function getUserName() { return localStorage.getItem('kiroUserName') || '' }
function saveUserName(name) { localStorage.setItem('kiroUserName', name) }

let currentVideo = null
let dragVideoId = null
let currentNoteId = null

function getKiroChallenges() { try { return JSON.parse(localStorage.getItem('kiro_challenges') || '[]') } catch { return [] } }
function saveKiroChallenges(c) { safeSetItem('kiro_challenges', JSON.stringify(c)) }

function getKiroAchievements() { try { return JSON.parse(localStorage.getItem('kiro_achievements') || '[]') } catch { return [] } }
function saveKiroAchievements(a) { safeSetItem('kiro_achievements', JSON.stringify(a)) }

function getKiroGoals() { try { return JSON.parse(localStorage.getItem('kiro_goals') || '[]') } catch { return [] } }
function saveKiroGoals(g) { safeSetItem('kiro_goals', JSON.stringify(g)) }

const APP_VERSION = '3.0.1'
