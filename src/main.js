const { app, BrowserWindow, Menu } = require('electron')
const path = require('path')

try {
  require('electron-reload')(__dirname, {
    electron: path.join(__dirname, '..', 'node_modules', '.bin', 'electron.cmd')
  })
} catch (_) {}

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    }
  })
  win.loadFile('src/index.html')

  const template = [
    { role: 'fileMenu' },
    { role: 'editMenu' },
    { role: 'viewMenu' },
    { role: 'windowMenu' },
    {
      label: 'Debug',
      submenu: [
        {
          label: 'Toggle Colors',
          accelerator: 'CmdOrCtrl+D',
          click: () => win.webContents.executeJavaScript('toggleDebug()')
        }
      ]
    },
    { role: 'helpMenu' }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
