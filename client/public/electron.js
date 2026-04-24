const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let serverProcess = null;
let mainWindow = null;

// Determine paths based on packaged/dev mode
const isPackaged = app.isPackaged;
const RESOURCES = isPackaged
  ? path.join(process.resourcesPath, 'server')
  : path.join(app.getAppPath(), '..', 'server');

function startServer() {
  return new Promise((resolve) => {
    const serverPath = path.join(RESOURCES, 'server.js');
    console.log(`[MAIN] Starting server from: ${serverPath}`);

    // Ensure we have node_modules - install if missing in packaged mode
    const nodeModulesPath = path.join(RESOURCES, 'node_modules');
    if (isPackaged && !fs.existsSync(nodeModulesPath)) {
      console.log('[MAIN] Installing server dependencies...');
      const npmInstall = spawn('npm', ['install'], {
        cwd: RESOURCES,
        stdio: 'inherit',
        shell: true,
      });
      npmInstall.on('close', () => {
        console.log('[MAIN] Server dependencies installed');
        launchServer(resolve);
      });
    } else {
      launchServer(resolve);
    }
  });
}

function launchServer(resolve) {
  const serverPath = path.join(RESOURCES, 'server.js');

  serverProcess = spawn('node', [serverPath], {
    cwd: RESOURCES,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, NODE_ENV: 'production' },
    shell: true,
  });

  serverProcess.stdout.on('data', (data) => {
    console.log(`[SERVER] ${data.toString().trim()}`);
    if (data.toString().includes('running on port')) {
      resolve();
    }
  });

  serverProcess.stderr.on('data', (data) => {
    console.error(`[SERVER ERR] ${data.toString().trim()}`);
  });

  serverProcess.on('error', (err) => {
    console.error('[MAIN] Failed to start server:', err);
    resolve();
  });

  serverProcess.on('close', (code) => {
    console.log(`[SERVER] Exited with code: ${code}`);
  });
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

app.on('ready', async () => {
  await startServer();
  createWindow();
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
