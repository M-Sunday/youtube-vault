const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron')
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
        },
        {
          label: 'Show Hierarchy',
          accelerator: 'CmdOrCtrl+Shift+H',
          click: () => win.webContents.executeJavaScript('toggleDebugHierarchy()')
        },
        { type: 'separator' },
        {
          label: 'Online',
          click: () => win.webContents.executeJavaScript(`
            Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => true });
            window.dispatchEvent(new Event('online'));
          `)
        },
        {
          label: 'Bad Signal (2G)',
          click: () => win.webContents.executeJavaScript(`
            Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => true });
            if (navigator.connection) {
              Object.defineProperty(navigator.connection, 'effectiveType', { configurable: true, get: () => '2g' });
              navigator.connection.dispatchEvent(new Event('change'));
            }
            window.dispatchEvent(new Event('online'));
          `)
        },
        {
          label: 'Offline',
          click: () => win.webContents.executeJavaScript(`
            Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false });
            window.dispatchEvent(new Event('offline'));
          `)
        }
      ]
    },
    { role: 'helpMenu' }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)

  ipcMain.handle('pick-folder', async () => {
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory'],
      title: 'Choose download location'
    })
    return result.canceled ? null : result.filePaths[0]
  })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
