const { app, BrowserWindow } = require('electron');
const path = require('path');

if (app.setName) {
  app.setName('Chappy');
}

if (app.setAppUserModelId) {
  app.setAppUserModelId('com.regularsteven.chappy');
}

const createMainWindow = () => {
  const browserWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    show: false,
    backgroundColor: '#0f172a',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true
    }
  });

  browserWindow.once('ready-to-show', () => browserWindow.show());

  if (process.env.VITE_DEV_SERVER_URL) {
    browserWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    browserWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
};

app.whenReady().then(createMainWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});
