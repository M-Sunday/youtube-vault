// ─── Settings ─────────────────────────────────────────
const settingsOverlay = document.getElementById('settingsOverlay')
document.getElementById('settingsBtn').addEventListener('click', () => {
  settingsOverlay.classList.add('open')
  var icon = document.querySelector('#settingsBtn .sidebar-icon')
  if (icon) { icon.classList.remove('spin'); void icon.offsetWidth; icon.classList.add('spin') }
})
document.getElementById('settingsClose').addEventListener('click', () => settingsOverlay.classList.remove('open'))
settingsOverlay.addEventListener('click', (e) => { if (e.target === settingsOverlay) settingsOverlay.classList.remove('open') })
document.querySelectorAll('.settings-cat').forEach(cat => {
  cat.addEventListener('click', function () {
    document.querySelectorAll('.settings-cat').forEach(c => c.classList.remove('active'))
    this.classList.add('active')
    document.querySelectorAll('.settings-pane').forEach(p => p.style.display = 'none')
    document.getElementById({ user: 'pane-user', theme: 'pane-theme', basic: 'pane-basic', toolbar: 'pane-toolbar', files: 'pane-files', history: 'pane-history', nsfw: 'pane-nsfw', patchnotes: 'pane-patchnotes' }[this.dataset.cat]).style.display = 'block'
    if (this.dataset.cat === 'patchnotes') loadPatchNotes()
    if (this.dataset.cat === 'history') renderSettingsHistory()
  })
})
function saveSetting(key, on) { const s = JSON.parse(localStorage.getItem('kiroSettings') || '{}'); s[key] = on; safeSetItem('kiroSettings', JSON.stringify(s)) }
function loadSetting(key, def) { const s = JSON.parse(localStorage.getItem('kiroSettings') || '{}'); return s[key] !== undefined ? s[key] : def }
function renderSettingsHistory() {
  const el = document.getElementById('settingsHistoryList')
  if (!el) return
  let items = loadHistory()
  if (!items.length) {
    const vs = getVideos(); const fs = getFolders()
    const all = (fs['Videos'] || []).map(id => vs[id] ? { id, title: vs[id].title, channel: vs[id].channel } : null).filter(Boolean)
    all.sort((a, b) => (b.added || 0) - (a.added || 0))
    items = all.slice(0, 10)
  }
  if (!items.length) { el.innerHTML = '<div style="padding:16px;text-align:center;font-size:12px;color:#8e8e93">No link history yet</div>'; return }
  el.innerHTML = items.map(h =>
    `<div class="settings-history-item" data-id="${h.id}">
      <img class="settings-history-item-img" src="https://img.youtube.com/vi/${h.id}/hqdefault.jpg" loading="lazy" onerror="this.style.display='none'" />
      <div class="settings-history-item-meta">
        <span class="settings-history-item-title">${h.title}</span>
        <span class="settings-history-item-channel">${h.channel}</span>
      </div>
    </div>`
  ).join('')
  el.querySelectorAll('.settings-history-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = item.dataset.id
      if (id) { document.getElementById('settingsOverlay').classList.remove('open'); loadVideoById(id) }
    })
  })
}
document.getElementById('settingsClearHistoryBtn')?.addEventListener('click', () => {
  if (confirm('Clear link history?')) { saveHistory([]); renderSettingsHistory(); if (document.getElementById('searchLanding').style.display === 'flex') renderSearchLanding() }
})
document.querySelectorAll('.settings-toggle').forEach(t => t.addEventListener('click', function () { this.classList.toggle('on') }))
document.querySelectorAll('.theme-option').forEach(opt => {
  opt.addEventListener('click', function () {
    document.querySelectorAll('.theme-option').forEach(o => o.classList.remove('active'))
    this.classList.add('active')
    const t = this.dataset.theme
    document.body.classList.remove('theme-black')
    if (t === 'black') document.body.classList.add('theme-black')
    safeSetItem('theme', t); document.getElementById('systemTheme').checked = false
  })
})
document.getElementById('systemTheme').addEventListener('change', function () {
  document.querySelectorAll('.theme-option').forEach(o => o.classList.remove('active'))
  if (this.checked) {
    document.body.classList.remove('theme-black')
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) document.body.classList.add('theme-black')
    safeSetItem('theme', 'system')
  } else {
    const s = localStorage.getItem('theme') || 'white'
    document.body.classList.remove('theme-black')
    if (s !== 'white') document.body.classList.add('theme-' + s)
    document.querySelector(`.theme-option[data-theme="${s}"]`)?.classList.add('active')
  }
})
const savedTheme = localStorage.getItem('theme') || 'white'
document.querySelectorAll('.theme-option').forEach(o => o.classList.remove('active'))
document.body.classList.remove('theme-black')
if (savedTheme === 'system') {
  document.getElementById('systemTheme').checked = true
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) document.body.classList.add('theme-black')
} else {
  if (savedTheme !== 'white') document.body.classList.add('theme-' + savedTheme)
  document.querySelector(`.theme-option[data-theme="` + savedTheme + `"]`)?.classList.add('active')
}

const SETTINGS_KEYS = {
  toolbar: ['showSidebarBtn', 'showKiroInput', 'compactMode'],
  files: ['autoUpdateLinks', 'confirmDeletion', 'detectAllExt'],
  history: ['saveLinkHistory', 'clearOnExit']
}
function applyToolbarSettings() {
  document.getElementById('menuBtn').style.display = loadSetting('showSidebarBtn', true) ? '' : 'none'
  document.querySelector('.top-bar-input').style.display = loadSetting('showKiroInput', true) ? '' : 'none'
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
    if (document.getElementById('searchLanding').style.display === 'flex') renderSearchLanding()
  })
})
function renderNSFWChips() {
  var el = document.getElementById('nsfwChips')
  if (!el) return
  var words = getNSFW()
  el.innerHTML = words.map(function(w) { return '<span class="nsfw-chip">' + w + '<button data-word="' + w + '">×</button></span>' }).join('')
  el.querySelectorAll('.nsfw-chip button').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var word = this.dataset.word
      var list = getNSFW().filter(function(w) { return w !== word })
      saveNSFW(list); renderNSFWChips(); autoApplyNSFW(); renderSidebar(); renderGridView()
    })
  })
}
renderNSFWChips()
document.getElementById('nsfwAddBtn').addEventListener('click', function() {
  var input = document.getElementById('nsfwAddInput')
  var word = input.value.trim().toLowerCase()
  if (!word) return
  var list = getNSFW()
  if (!list.includes(word)) { list.push(word); saveNSFW(list) }
  input.value = ''; renderNSFWChips(); autoApplyNSFW(); renderSidebar(); renderGridView()
})
document.getElementById('nsfwAddInput').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') document.getElementById('nsfwAddBtn').click()
})
const blurAllToggle = document.getElementById('blurAllNSFWToggle')
if (blurAllToggle) {
  blurAllToggle.classList.toggle('on', getBlurAllNSFW())
  blurAllToggle.addEventListener('click', () => {
    saveBlurAllNSFW(blurAllToggle.classList.contains('on'))
    autoApplyNSFW()
    settingsOverlay.classList.remove('open')
    var s = document.getElementById('splash')
    if (s) { s.style.display = ''; s.classList.remove('fade') }
    var t = document.getElementById('splashText')
    if (t) t.textContent = 'Applying\u2026'
    setTimeout(function(){ location.reload() }, 400)
  })
}
document.querySelector('#pane-basic .settings-clear-btn')?.addEventListener('click', () => {
  if (confirm('Clear all saved data?')) { localStorage.removeItem('kiroVideos'); localStorage.removeItem('kiroFolders'); localStorage.removeItem('kiroFolderMeta'); localStorage.removeItem('linkHistory'); localStorage.removeItem('kiroBookmarks'); localStorage.removeItem('kiroNotes'); renderSidebar(); clearCard() }
})
var settingsNameInput = document.getElementById('settingsUserName')
if (settingsNameInput) {
  settingsNameInput.value = getUserName()
  settingsNameInput.addEventListener('input', function() {
    saveUserName(this.value.trim())
  })
}
window.addEventListener('beforeunload', () => { const t = document.querySelector('#pane-history .settings-toggle:last-child'); if (t?.classList.contains('on')) localStorage.removeItem('linkHistory') })

applyToolbarSettings()

function loadHistory() { try { return JSON.parse(localStorage.getItem('linkHistory') || '[]') } catch { return [] } }
function saveHistory(h) { safeSetItem('linkHistory', JSON.stringify(h)) }

// ─── About User pane ───────────────────────────────────
var userDisplay = document.getElementById('settingsUserNameDisplay')
if (userDisplay) userDisplay.textContent = getUserName() || '—'

var deviceEl = document.getElementById('settingsDeviceName')
if (deviceEl) {
  var ua = navigator.userAgent
  if (/Windows/.test(ua)) deviceEl.textContent = 'Windows'
  else if (/Mac/.test(ua)) deviceEl.textContent = 'macOS'
  else if (/Android/.test(ua)) deviceEl.textContent = 'Android'
  else if (/iPhone|iPad/.test(ua)) deviceEl.textContent = 'iOS'
  else deviceEl.textContent = 'Unknown'
}

// ─── Edit username ─────────────────────────────────────
var editBtn = document.getElementById('settingsUserNameEditBtn')
var editInput = document.getElementById('settingsUserNameEditInput')
if (editBtn && editInput && userDisplay) {
  editBtn.addEventListener('click', function() {
    userDisplay.style.display = 'none'
    editBtn.style.display = 'none'
    editInput.value = getUserName()
    editInput.style.display = ''
    editInput.focus()
    editInput.select()
  })
  function saveUserName(name) {
    var val = name !== undefined ? name.trim() : editInput.value.trim()
    if (!val) return
    safeSetItem('kiroUserName', val)
    userDisplay.textContent = val
    userDisplay.style.display = ''
    editBtn.style.display = ''
    editInput.style.display = 'none'
    showRenameSplash(val)
  }
  editInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') saveUserName() })
  editInput.addEventListener('blur', saveUserName)
}

function showRenameSplash(name) {
  var splash = document.getElementById('splash')
  var splashText = document.getElementById('splashText')
  if (!splash || !splashText) return
  splash.style.display = 'flex'
  splash.classList.remove('fade', 'offline', 'onboarding')
  splashText.style.display = 'block'
  splashText.textContent = 'Checking for updates...'
  var icon = splash.querySelector('.splash-content img')
  if (icon) { icon.style.filter = 'none'; icon.style.opacity = '1' }
  setTimeout(function() { splashText.textContent = 'Up to date' }, 1200)
  setTimeout(function() { splashText.textContent = 'Welcome, ' + name }, 2600)
  setTimeout(function() {
    splash.classList.add('fade')
    setTimeout(function() { splash.style.display = 'none' }, 500)
  }, 3800)
}

// ─── Reset account ────────────────────────────────────
document.getElementById('settingsResetBtn')?.addEventListener('click', function() {
  document.getElementById('resetOverlay').classList.add('open')
})
document.getElementById('resetCancel')?.addEventListener('click', function() {
  document.getElementById('resetOverlay').classList.remove('open')
})
document.getElementById('resetConfirm')?.addEventListener('click', function() {
  document.getElementById('resetOverlay').classList.remove('open')
  localStorage.clear()
  location.reload()
})
document.getElementById('resetOverlay')?.addEventListener('click', function(e) {
  if (e.target === this) this.classList.remove('open')
})
