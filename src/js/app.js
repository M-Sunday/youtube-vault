// ─── Init ──────────────────────────────────────────────
document.getElementById('appVersionLabel').textContent = APP_VERSION
function startApp() {
  loadIcons(); renderCalendar(); renderSidebar(); renderGridView(); setView('grid')
}
if (getUserName()) {
  document.getElementById('wbBtn').addEventListener('click', function() {
    var wb = document.getElementById('welcomeBack')
    wb.style.transition = 'opacity 0.35s ease, transform 0.35s ease'
    wb.style.opacity = '0'
    wb.style.transform = 'scale(0.96)'
    setTimeout(function() {
      wb.style.display = 'none'
      startApp()
    }, 350)
  })
} else {
  window.startApp = startApp
}
