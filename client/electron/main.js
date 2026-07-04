const { app, BrowserWindow } = require('electron');thisara
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let serverProcess = null;
let mainWindow = null;

isPackaged = app.isPackaged;

function getResourcesPath() {
  return isPackaged
    ? path.join(process.resourcesPath, 'server')
    : path.join(app.getAppPath(), '..', 'server');
}

function startServer() {
  if (isPackaged) {
    const resourcesDir = getResourcesPath();
    console.log('[MAIN] isPackaged:', isPackaged);
    console.log('[MAIN] resourcesDir:', resourcesDir);

    serverProcess = spawn(process.execPath.replace('electron.exe', 'MERN Auth.exe'), ['--server-mode'], {
      cwd: resourcesDir,
      detached: true,
      stdio: 'ignore',
    });

    serverProcess.unref();
  }

  setTimeout(() => {
    createWindow();
  }, 500);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 400,
    minHeight: 600,
    title: 'MERN Auth',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (isPackaged) {
    mainWindow.loadFile(path.join(app.getAppPath(), 'build', 'index.html'));
  } else {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  await startServer();
});

app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
  app.quit();
});

app.on('quit', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});
