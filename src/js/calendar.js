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
