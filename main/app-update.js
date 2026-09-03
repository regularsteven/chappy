const fs = require('node:fs');
const path = require('node:path');
const { app, BrowserWindow } = require('electron');
const { autoUpdater } = require('electron-updater');

// Whole-app self-updater backed by GitHub Releases. electron-builder writes
// latest-mac.yml / latest.yml next to the release artifacts; electron-updater
// reads them to decide whether a newer version exists, downloads it in the
// background, and swaps the app on the next restart. This replaces the old
// renderer-only "vue update" channel, which could not carry main-process
// changes and was never wired into CI.

// One state object, mirrored to every renderer window on every change so the
// settings panel and the restart toast can never disagree.
//
// state: idle | checking | downloading | ready | up-to-date | error | unsupported
let state = {
  state: app.isPackaged ? 'idle' : 'unsupported',
  version: null,
  percent: 0,
  error: null
};

let initialized = false;

const getState = () => ({ ...state });

const broadcast = () => {
  for (const win of BrowserWindow.getAllWindows()) {
    if (win.webContents && !win.webContents.isDestroyed()) {
      win.webContents.send('app-update-status', getState());
    }
  }
};

const setState = (patch) => {
  state = { ...state, ...patch };
  broadcast();
};

const describeError = (error) => {
  const message = error?.message || String(error || 'Update failed');
  // electron-updater errors carry the full HTTP body or a stack; keep the
  // first line so the settings panel stays readable.
  return message.split('\n')[0].slice(0, 200);
};

function init() {
  if (initialized) return;
  initialized = true;
  if (!app.isPackaged) {
    // `npm run dev` and unpacked builds have no app-update.yml to read and no
    // installer to replace. Report that rather than throwing on every check.
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowDowngrade = false;
  autoUpdater.logger = console;

  autoUpdater.on('checking-for-update', () => {
    setState({ state: 'checking', error: null });
  });
  autoUpdater.on('update-available', (info) => {
    setState({ state: 'downloading', version: info?.version || null, percent: 0, error: null });
  });
  autoUpdater.on('update-not-available', () => {
    setState({ state: 'up-to-date', version: null, percent: 0, error: null });
  });
  autoUpdater.on('download-progress', (progress) => {
    const percent = Number.isFinite(progress?.percent) ? Math.round(progress.percent) : 0;
    setState({ state: 'downloading', percent });
  });
  autoUpdater.on('update-downloaded', (info) => {
    setState({ state: 'ready', version: info?.version || state.version, percent: 100, error: null });
  });
  autoUpdater.on('error', (error) => {
    setState({ state: 'error', error: describeError(error) });
  });
}

async function check() {
  if (!app.isPackaged) {
    return getState();
  }
  init();
  // A check while a download is in flight, or once an update is staged, would
  // only restart work that is already done.
  if (state.state === 'checking' || state.state === 'downloading' || state.state === 'ready') {
    return getState();
  }
  try {
    await autoUpdater.checkForUpdates();
  } catch (error) {
    setState({ state: 'error', error: describeError(error) });
  }
  return getState();
}

function install() {
  if (state.state !== 'ready') {
    return false;
  }
  // Defer past the IPC reply so the renderer's invoke() resolves before the
  // window is torn down.
  setImmediate(() => {
    autoUpdater.quitAndInstall(false, true);
  });
  return true;
}

function shouldRunBackgroundCheck(config) {
  if (!app.isPackaged) return false;
  if (!config?.enableAutoUpdate) return false;
  const last = config.lastUpdateCheck;
  if (!last) return true;
  const then = new Date(last).getTime();
  if (!Number.isFinite(then)) return true;
  return Date.now() - then > 24 * 60 * 60 * 1000;
}

// The retired vue-update channel left extracted renderers under ~/.chappy.
// Nothing reads them any more; remove them so a stale copy can never be
// mistaken for the app's own renderer.
function cleanupLegacyRendererUpdates(chappyDir) {
  for (const name of ['renderer', 'renderer-pending', 'vue-update-temp.zip']) {
    const target = path.join(chappyDir, name);
    try {
      if (fs.existsSync(target)) {
        fs.rmSync(target, { recursive: true, force: true });
      }
    } catch (error) {
      console.warn(`Could not remove legacy update file ${target}:`, error?.message || error);
    }
  }
}

module.exports = {
  init,
  check,
  install,
  getState,
  shouldRunBackgroundCheck,
  cleanupLegacyRendererUpdates
};
