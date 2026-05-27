// ─── Init ──────────────────────────────────────────────
document.getElementById('appVersionLabel').textContent = APP_VERSION
function startApp() {
  loadIcons(); renderCalendar(); renderSidebar(); renderGridView(); setView('grid')
}
if (getUserName()) {
  startApp()
} else {
  window.startApp = startApp
}
