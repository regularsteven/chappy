const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { app, net, BrowserWindow } = require('electron');
const extract = require('extract-zip');

const CHAPPY_DIR = path.join(os.homedir(), '.chappy');
const RENDERER_DIR = path.join(CHAPPY_DIR, 'renderer');
const RENDERER_PENDING_DIR = path.join(CHAPPY_DIR, 'renderer-pending');
const GITHUB_REPO = 'regularsteven/chappy';

let updateState = {
  isChecking: false,
  hasUpdate: false,
  isReady: false,
  error: null
};

function getUpdateBranch() {
  try {
    const buildInfoPath = path.join(__dirname, '../build-info.json');
    if (fs.existsSync(buildInfoPath)) {
      const data = JSON.parse(fs.readFileSync(buildInfoPath, 'utf8'));
      return data.updateBranch || 'main';
    }
  } catch {
    // ignore
  }
  return 'main';
}

function getCurrentHash() {
  const rendererPath = path.join(__dirname, '../dist');
  const userRendererPath = RENDERER_DIR;
  const pathsToCheck = [
    path.join(userRendererPath, 'vue-build.json'),
    path.join(rendererPath, 'vue-build.json')
  ];
  for (const p of pathsToCheck) {
    if (fs.existsSync(p)) {
      try {
        const data = JSON.parse(fs.readFileSync(p, 'utf8'));
        return data.hash || null;
      } catch {
        // ignore
      }
    }
  }
  return null;
}

function getRendererPath() {
  const builtInPath = path.join(__dirname, '../dist');
  const userIndexPath = path.join(RENDERER_DIR, 'index.html');
  const userBuildJson = path.join(RENDERER_DIR, 'vue-build.json');
  const builtInBuildJson = path.join(builtInPath, 'vue-build.json');

  if (!fs.existsSync(userIndexPath)) {
    return builtInPath;
  }

  let builtInHash = null;
  let userHash = null;
  if (fs.existsSync(builtInBuildJson)) {
    try {
      builtInHash = JSON.parse(fs.readFileSync(builtInBuildJson, 'utf8')).hash || null;
    } catch {
      /* ignore */
    }
  }
  if (fs.existsSync(userBuildJson)) {
    try {
      userHash = JSON.parse(fs.readFileSync(userBuildJson, 'utf8')).hash || null;
    } catch {
      /* ignore */
    }
  }

  if (builtInHash && userHash && builtInHash !== userHash) {
    fs.rmSync(RENDERER_DIR, { recursive: true, force: true });
    return builtInPath;
  }

  return RENDERER_DIR;
}

function hasValidPendingUpdate() {
  const indexPath = path.join(RENDERER_PENDING_DIR, 'index.html');
  return fs.existsSync(RENDERER_PENDING_DIR) && fs.existsSync(indexPath);
}

function refreshPendingState() {
  if (hasValidPendingUpdate()) {
    updateState.isReady = true;
    updateState.hasUpdate = true;
  }
}

function applyPendingUpdate() {
  if (!fs.existsSync(RENDERER_PENDING_DIR)) return;
  const indexPath = path.join(RENDERER_PENDING_DIR, 'index.html');
  if (!fs.existsSync(indexPath)) {
    fs.rmSync(RENDERER_PENDING_DIR, { recursive: true, force: true });
    return;
  }
  if (fs.existsSync(RENDERER_DIR)) {
    fs.rmSync(RENDERER_DIR, { recursive: true, force: true });
  }
  fs.renameSync(RENDERER_PENDING_DIR, RENDERER_DIR);
}

function notifyUpdateReady() {
  updateState.isReady = true;
  updateState.hasUpdate = true;
  for (const win of BrowserWindow.getAllWindows()) {
    if (win.webContents && !win.webContents.isDestroyed()) {
      win.webContents.send('vue-update-ready');
    }
  }
}

async function checkForUpdate(config) {
  if (process.env.VITE_DEV_SERVER_URL) return { ...updateState };
  if (updateState.isChecking) return { ...updateState };

  updateState.isChecking = true;
  updateState.error = null;

  try {
    const branch = getUpdateBranch();
    const manifestUrl = `https://raw.githubusercontent.com/${GITHUB_REPO}/${branch}/vue-updates/manifest.json`;
    const res = await net.fetch(manifestUrl);
    if (!res.ok) {
      updateState.error = `Manifest fetch failed: ${res.status}`;
      return { ...updateState };
    }

    const manifest = await res.json();
    const localHash = getCurrentHash();
    if (!manifest.hash || manifest.hash === localHash) {
      updateState.hasUpdate = false;
      updateState.isReady = false;
      return { ...updateState };
    }

    updateState.hasUpdate = true;

    if (!manifest.url) {
      updateState.error = 'Manifest missing url';
      return { ...updateState };
    }

    fs.mkdirSync(CHAPPY_DIR, { recursive: true });
    if (fs.existsSync(RENDERER_PENDING_DIR)) {
      fs.rmSync(RENDERER_PENDING_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(RENDERER_PENDING_DIR, { recursive: true });

    const zipRes = await net.fetch(manifest.url);
    if (!zipRes.ok) {
      updateState.error = `Download failed: ${zipRes.status}`;
      return { ...updateState };
    }

    const buffer = Buffer.from(await zipRes.arrayBuffer());
    const zipPath = path.join(CHAPPY_DIR, 'vue-update-temp.zip');
    fs.writeFileSync(zipPath, buffer);

    await extract(zipPath, { dir: RENDERER_PENDING_DIR });
    fs.unlinkSync(zipPath);

    const pendingIndex = path.join(RENDERER_PENDING_DIR, 'index.html');
    if (!fs.existsSync(pendingIndex)) {
      const distIndex = path.join(RENDERER_PENDING_DIR, 'dist', 'index.html');
      if (fs.existsSync(distIndex)) {
        const distDir = path.join(RENDERER_PENDING_DIR, 'dist');
        for (const name of fs.readdirSync(distDir)) {
          fs.renameSync(path.join(distDir, name), path.join(RENDERER_PENDING_DIR, name));
        }
        fs.rmdirSync(distDir);
      } else {
        fs.rmSync(RENDERER_PENDING_DIR, { recursive: true, force: true });
        updateState.error = 'Invalid zip structure';
        return { ...updateState };
      }
    }

    notifyUpdateReady();
    return { ...updateState };
  } catch (err) {
    updateState.error = err.message || 'Update check failed';
    return { ...updateState };
  } finally {
    updateState.isChecking = false;
  }
}

function shouldRunBackgroundCheck(config) {
  if (!config.enableAutoUpdate) return false;
  const last = config.lastUpdateCheck;
  if (!last) return true;
  try {
    const then = new Date(last).getTime();
    const now = Date.now();
    return now - then > 24 * 60 * 60 * 1000;
  } catch {
    return true;
  }
}

module.exports = {
  applyPendingUpdate,
  getRendererPath,
  checkForUpdate,
  shouldRunBackgroundCheck,
  refreshPendingState,
  getUpdateState: () => {
    refreshPendingState();
    return { ...updateState };
  },
  resetUpdateReady: () => {
    updateState.isReady = false;
  }
};
