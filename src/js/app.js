// ─── Init ──────────────────────────────────────────────
document.getElementById('appVersionLabel').textContent = APP_VERSION
if (window.innerWidth <= 640) document.getElementById('sidebar').classList.add('closed')
function startApp() {
  loadIcons(); renderCalendar(); renderSidebar(); renderGridView(); setView('grid')
}
if (getUserName()) {
  startApp()
} else {
  window.startApp = startApp
}
