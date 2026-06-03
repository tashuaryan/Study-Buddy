const { app, BrowserWindow, shell, Menu } = require('electron')
const path = require('path')

const isDev = !app.isPackaged

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
    title: 'Study Buddy',
    // Add your icon here once you have one:
    // icon: path.join(__dirname, 'public', 'icon.png'),
    show: false, // don't show until ready
    backgroundColor: '#fdf2f8', // pink bg while loading
  })

  // Show window once fully loaded (no white flash)
  win.once('ready-to-show', () => {
    win.show()
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, 'dist', 'index.html'))
  }

  // Open external links in browser, not in app
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorDescription)
    if (!isDev) {
      setTimeout(() => {
        win.loadFile(path.join(__dirname, 'dist', 'index.html'))
      }, 1000)
    }
  })
}

// Remove default menu bar (looks cleaner)
Menu.setApplicationMenu(null)

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})