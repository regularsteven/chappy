const fs = require('node:fs');
const os = require('node:os');
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

if (app.setName) {
  app.setName('Chappy');
}

if (app.setAppUserModelId) {
  app.setAppUserModelId('com.regularsteven.chappy');
}

const CONFIG_VERSION = 1;
const CHAPPY_DIR = path.join(os.homedir(), '.chappy');
const CONFIG_PATH = path.join(CHAPPY_DIR, 'config.json');
const APP_ICON_PNG = path.join(__dirname, '../resources/chappy-logo.png');

const resolveAppIcon = () => (fs.existsSync(APP_ICON_PNG) ? APP_ICON_PNG : null);

const createDefaultConfig = () => ({
  version: CONFIG_VERSION,
  activeTabId: 'chappy',
  themePreference: 'system',
  tabs: []
});

const isObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

const isValidHttpsUrl = (value) => {
  if (typeof value !== 'string') {
    return false;
  }
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:';
  } catch (error) {
    return false;
  }
};

const sanitizeToken = (value, fallback) => {
  if (typeof value !== 'string') {
    return fallback;
  }
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || fallback;
};

const ensureUnique = (seed, existingSet, fallbackPrefix) => {
  let candidate = sanitizeToken(seed, fallbackPrefix);
  let counter = 1;
  while (existingSet.has(candidate)) {
    candidate = `${sanitizeToken(seed, fallbackPrefix)}-${counter}`;
    counter += 1;
  }
  existingSet.add(candidate);
  return candidate;
};

const sanitizeColor = (value, fallback = '#38bdf8') => {
  if (typeof value !== 'string') {
    return fallback;
  }
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value) ? value : fallback;
};
const themePreferences = new Set(['system', 'light', 'dark']);
const sanitizeThemePreference = (value) => {
  if (typeof value !== 'string') {
    return 'system';
  }
  const normalized = value.trim();
  return themePreferences.has(normalized) ? normalized : 'system';
};
const launchModes = new Set(['default', 'custom', 'preserve']);

const sanitizeTab = (tab, index, ids, partitions) => {
  if (!isObject(tab)) {
    return null;
  }

  const title = typeof tab.title === 'string' ? tab.title.trim() : '';
  const url = typeof tab.url === 'string' ? tab.url.trim() : '';
  if (!title || !isValidHttpsUrl(url)) {
    return null;
  }

  const tabIdSeed = typeof tab.id === 'string' && tab.id.trim() ? tab.id : `tab-${index + 1}`;
  const tabId = ensureUnique(tabIdSeed, ids, `tab-${index + 1}`);
  const partitionSeed =
    typeof tab.partition === 'string' && tab.partition.trim() ? tab.partition : `tab-${tabId}`;
  const partition = ensureUnique(partitionSeed, partitions, `tab-${tabId}`);
  const iconId = sanitizeToken(tab.iconId, 'custom');
  const customLaunchUrl =
    typeof tab.customLaunchUrl === 'string' && isValidHttpsUrl(tab.customLaunchUrl.trim())
      ? tab.customLaunchUrl.trim()
      : '';
  const launchModeInput =
    typeof tab.launchMode === 'string' && launchModes.has(tab.launchMode.trim())
      ? tab.launchMode.trim()
      : tab.preserveUrl === true
        ? 'preserve'
        : tab.useCustomLaunchUrl === true
          ? 'custom'
          : 'default';
  const launchMode = launchModeInput === 'custom' && !customLaunchUrl ? 'default' : launchModeInput;
  const lastUrl =
    typeof tab.lastUrl === 'string' && isValidHttpsUrl(tab.lastUrl.trim()) ? tab.lastUrl.trim() : '';

  return {
    id: tabId,
    title,
    url,
    color: sanitizeColor(tab.color),
    iconId,
    partition,
    customLaunchUrl,
    launchMode,
    useCustomLaunchUrl: launchMode === 'custom',
    preserveUrl: launchMode === 'preserve',
    lastUrl
  };
};

const sanitizeConfigPayload = (payload) => {
  if (!isObject(payload)) {
    return createDefaultConfig();
  }

  const tabsInput = Array.isArray(payload.tabs) ? payload.tabs : [];
  const ids = new Set();
  const partitions = new Set();
  const tabs = tabsInput
    .map((tab, index) => sanitizeTab(tab, index, ids, partitions))
    .filter(Boolean);

  let activeTabId = 'chappy';
  if (typeof payload.activeTabId === 'string') {
    const candidate = payload.activeTabId.trim();
    if (candidate === 'chappy' || tabs.some((tab) => tab.id === candidate)) {
      activeTabId = candidate;
    }
  }

  return {
    version: CONFIG_VERSION,
    activeTabId,
    themePreference: sanitizeThemePreference(payload.themePreference),
    tabs
  };
};

const writeConfig = (payload) => {
  const normalized = sanitizeConfigPayload(payload);
  fs.mkdirSync(CHAPPY_DIR, { recursive: true });
  const tempPath = `${CONFIG_PATH}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(normalized, null, 2), 'utf8');
  fs.renameSync(tempPath, CONFIG_PATH);
  return normalized;
};

const readConfig = () => {
  if (!fs.existsSync(CONFIG_PATH)) {
    return createDefaultConfig();
  }

  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return sanitizeConfigPayload(parsed);
  } catch (error) {
    return createDefaultConfig();
  }
};

ipcMain.handle('chappy:load-config', () => readConfig());
ipcMain.handle('chappy:save-config', (_event, payload) => writeConfig(payload));

const createMainWindow = () => {
  const appIcon = resolveAppIcon();
  const browserWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    show: false,
    backgroundColor: '#0f172a',
    ...(appIcon ? { icon: appIcon } : {}),
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

app.whenReady().then(() => {
  const appIcon = resolveAppIcon();
  if (process.platform === 'darwin' && appIcon && app.dock?.setIcon) {
    app.dock.setIcon(appIcon);
  }
  createMainWindow();
});

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
