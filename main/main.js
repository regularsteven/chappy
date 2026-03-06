const fs = require('node:fs');
const os = require('node:os');
const { app, BrowserWindow, ipcMain, nativeImage, net, protocol, shell } = require('electron');
const path = require('path');
const { pathToFileURL } = require('node:url');
const vueUpdate = require('./vue-update.js');

if (app.setName) {
  app.setName('Chappy');
}

if (app.setAppUserModelId) {
  app.setAppUserModelId('com.regularsteven.chappy');
}

const CONFIG_VERSION = 1;
const CHAPPY_DIR = path.join(os.homedir(), '.chappy');
const CONFIG_PATH = path.join(CHAPPY_DIR, 'config.json');
const ICONS_DIR = path.join(CHAPPY_DIR, 'icons');
const APP_ICON_PNG = path.join(__dirname, '../resources/chappy-logo.png');
const BADGE_MAX_DISPLAY = 9;
let currentAppBadgeCount = 0;
const windowsOverlayIconCache = new Map();

const normalizeBadgeCount = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const formatBadgeLabel = (count) => (count > BADGE_MAX_DISPLAY ? `${BADGE_MAX_DISPLAY}+` : String(count));

const escapeXml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const createWindowsOverlayIcon = (label) => {
  const fontSize = label.length > 1 ? 14 : 16;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <circle cx="16" cy="16" r="15" fill="#ef4444" />
      <text x="16" y="21" text-anchor="middle" fill="#ffffff" font-size="${fontSize}" font-weight="700" font-family="Segoe UI, Arial, sans-serif">${escapeXml(label)}</text>
    </svg>
  `;
  return nativeImage.createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`);
};

const setWindowsOverlayBadge = (count) => {
  if (process.platform !== 'win32') {
    return;
  }
  const windows = BrowserWindow.getAllWindows();
  if (windows.length === 0) {
    return;
  }
  if (count === 0) {
    windows.forEach((window) => {
      window.setOverlayIcon(null, '');
    });
    return;
  }

  const label = formatBadgeLabel(count);
  let overlayIcon = windowsOverlayIconCache.get(label);
  if (!overlayIcon) {
    overlayIcon = createWindowsOverlayIcon(label);
    windowsOverlayIconCache.set(label, overlayIcon);
  }
  const description = `${label} unread notifications`;
  windows.forEach((window) => {
    window.setOverlayIcon(overlayIcon, description);
  });
};

const setAppBadgeCount = (value) => {
  const count = normalizeBadgeCount(value);
  const numericBadgeCount = Math.min(count, BADGE_MAX_DISPLAY);
  currentAppBadgeCount = count;
  if (typeof app.setBadgeCount === 'function') {
    app.setBadgeCount(numericBadgeCount);
  }
  if (process.platform === 'darwin' && app.dock?.setBadge) {
    app.dock.setBadge(count > 0 ? formatBadgeLabel(count) : '');
  }
  setWindowsOverlayBadge(count);
  return count;
};

const resolveAppIcon = () => (fs.existsSync(APP_ICON_PNG) ? APP_ICON_PNG : null);

const createDefaultConfig = () => ({
  version: CONFIG_VERSION,
  activeTabId: 'chappy',
  themePreference: 'system',
  useSystemBrowserLinks: true,
  preserveTabMemory: true,
  openServicesOnLaunch: false,
  enableAutoUpdate: true,
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
const externalProtocols = new Set(['http:', 'https:', 'mailto:', 'tel:']);
const ALLOWED_ICON_MIMES = new Set(['image/svg+xml', 'image/png', 'image/x-icon']);

const sanitizeIconPath = (value) => {
  if (typeof value !== 'string') {
    return '';
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }
  const normalized = path.normalize(trimmed).replace(/^(\.\.(\/|\\|$))+/, '');
  if (!/^icons[/\\][a-zA-Z0-9_.-]+-(?:primary|secondary)\.(svg|png|ico)$/i.test(normalized.replace(/\\/g, '/'))) {
    return '';
  }
  const fullPath = path.join(CHAPPY_DIR, normalized);
  if (!fullPath.startsWith(ICONS_DIR)) {
    return '';
  }
  return normalized.replace(/\\/g, '/');
};

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
  const primaryIconPath = sanitizeIconPath(tab.primaryIconPath);
  const secondaryIconPath = sanitizeIconPath(tab.secondaryIconPath);

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
    lastUrl,
    primaryIconPath: primaryIconPath || undefined,
    secondaryIconPath: secondaryIconPath || undefined
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

  const openServicesOnLaunch = payload.openServicesOnLaunch === true;
  const preserveTabMemory = openServicesOnLaunch || payload.preserveTabMemory !== false;
  const enableAutoUpdate = payload.enableAutoUpdate !== false;

  return {
    version: CONFIG_VERSION,
    activeTabId,
    themePreference: sanitizeThemePreference(payload.themePreference),
    useSystemBrowserLinks: payload.useSystemBrowserLinks !== false,
    preserveTabMemory,
    openServicesOnLaunch,
    enableAutoUpdate,
    lastUpdateCheck: typeof payload.lastUpdateCheck === 'string' ? payload.lastUpdateCheck : undefined,
    lastUpdateApplied: typeof payload.lastUpdateApplied === 'string' ? payload.lastUpdateApplied : undefined,
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

let configState = readConfig();

protocol.registerSchemesAsPrivileged([
  { scheme: 'chappy-icon', privileges: { standard: true, secure: true, supportFetchAPI: true } }
]);

const shouldUseSystemBrowserLinks = () => configState.useSystemBrowserLinks !== false;
const normalizeExternalTarget = (target) => {
  if (typeof target !== 'string') {
    return '';
  }
  try {
    const parsed = new URL(target);
    return externalProtocols.has(parsed.protocol) ? parsed.toString() : '';
  } catch (error) {
    return '';
  }
};

ipcMain.handle('chappy:load-config', () => {
  configState = readConfig();
  return configState;
});
ipcMain.handle('chappy:save-config', (_event, payload) => {
  const merged = isObject(payload) ? { ...configState, ...payload } : configState;
  configState = writeConfig(merged);
  return configState;
});

ipcMain.handle('chappy:save-icon', async (_event, { tabId, type, buffer, mimeType }) => {
  if (!tabId || !type || !buffer || !mimeType) {
    throw new Error('chappy:save-icon requires tabId, type, buffer, and mimeType');
  }
  if (!['primary', 'secondary'].includes(type)) {
    throw new Error('chappy:save-icon type must be primary or secondary');
  }
  if (!ALLOWED_ICON_MIMES.has(mimeType)) {
    throw new Error('chappy:save-icon only accepts image/svg+xml or image/png');
  }
  const ext = mimeType === 'image/svg+xml' ? 'svg' : 'png';
  const safeTabId = sanitizeToken(tabId, 'tab');
  const filename = `${safeTabId}-${type}.${ext}`;
  const relativePath = `icons/${filename}`;
  const fullPath = path.join(CHAPPY_DIR, relativePath);

  const existingTabs = configState.tabs || [];
  const existingTab = existingTabs.find((t) => t.id === tabId);
  if (existingTab) {
    const existingPath = type === 'primary' ? existingTab.primaryIconPath : existingTab.secondaryIconPath;
    if (existingPath) {
      const oldFullPath = path.join(CHAPPY_DIR, existingPath);
      if (fs.existsSync(oldFullPath)) {
        fs.unlinkSync(oldFullPath);
      }
    }
  }

  fs.mkdirSync(ICONS_DIR, { recursive: true });
  const data = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  fs.writeFileSync(fullPath, data);
  return { path: relativePath };
});

ipcMain.handle('chappy:delete-icon', (_event, { path: iconPath }) => {
  if (!iconPath || typeof iconPath !== 'string') {
    return;
  }
  const sanitized = sanitizeIconPath(iconPath);
  if (!sanitized) {
    return;
  }
  const fullPath = path.join(CHAPPY_DIR, sanitized);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
});

ipcMain.handle('chappy:resolve-icon-url', (_event, { path: iconPath }) => {
  if (!iconPath || typeof iconPath !== 'string') {
    return '';
  }
  const sanitized = sanitizeIconPath(iconPath);
  if (!sanitized) {
    return '';
  }
  const fullPath = path.join(CHAPPY_DIR, sanitized);
  if (!fs.existsSync(fullPath)) {
    return '';
  }
  return `chappy-icon://local/${sanitized}`;
});

const pickIconUrlFromHtml = (html, baseUrl) => {
  const base = new URL(baseUrl);
  const resolve = (href) => {
    if (!href || typeof href !== 'string') return null;
    try {
      return new URL(href, base).toString();
    } catch {
      return null;
    }
  };
  const appleTouchIcons = [];
  const shortcutIcons = [];
  const genericIcons = [];
  const linkRe = /<link\s+([^>]+)\s*\/?>/gi;
  let m;
  while ((m = linkRe.exec(html)) !== null) {
    const attrs = m[1];
    const relMatch = attrs.match(/\brel\s*=\s*["']([^"']+)["']/i);
    const hrefMatch = attrs.match(/\bhref\s*=\s*["']([^"']+)["']/i);
    const sizesMatch = attrs.match(/\bsizes\s*=\s*["']([^"']+)["']/i);
    if (!relMatch || !hrefMatch) continue;
    const rel = relMatch[1].toLowerCase().trim();
    const href = hrefMatch[1].trim();
    const sizes = sizesMatch ? sizesMatch[1].trim() : '';
    if (rel.includes('apple-touch-icon')) {
      const url = resolve(href);
      if (url) {
        const sizeMatch = sizes.match(/(\d+)\s*x\s*(\d+)/i);
        const px = sizeMatch ? Math.min(parseInt(sizeMatch[1], 10), parseInt(sizeMatch[2], 10)) : 0;
        appleTouchIcons.push({ url, px });
      }
    } else if (rel.includes('shortcut') && rel.includes('icon')) {
      const url = resolve(href);
      if (url) shortcutIcons.push({ url });
    } else if (rel === 'icon') {
      const url = resolve(href);
      if (url) genericIcons.push({ url });
    }
  }
  if (appleTouchIcons.length > 0) {
    appleTouchIcons.sort((a, b) => b.px - a.px);
    const reasonable = appleTouchIcons.find((c) => c.px >= 96 && c.px <= 180) || appleTouchIcons[0];
    return reasonable.url;
  }
  if (shortcutIcons.length > 0) return shortcutIcons[0].url;
  if (genericIcons.length > 0) return genericIcons[0].url;
  return resolve('/favicon.ico');
};

ipcMain.handle('chappy:fetch-icon-from-url', async (_event, { pageUrl, tabId }) => {
  if (!pageUrl || !tabId || !isValidHttpsUrl(pageUrl)) return null;
  const safeTabId = sanitizeToken(tabId, 'tab');
  let html;
  let finalPageUrl = pageUrl;
  try {
    const res = await net.fetch(pageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    if (!res.ok) return null;
    finalPageUrl = res.url || pageUrl;
    html = await res.text();
  } catch {
    return null;
  }
  const iconUrl = pickIconUrlFromHtml(html, finalPageUrl);
  if (!iconUrl) return null;
  const result = await saveIconFromUrl(iconUrl, safeTabId, tabId);
  return result;
});

const saveIconFromUrl = async (iconUrl, safeTabId, tabId) => {
  let iconRes;
  try {
    iconRes = await net.fetch(iconUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'image/*,*/*;q=0.8'
      }
    });
    if (!iconRes.ok) return null;
  } catch {
    return null;
  }
  const contentType = (iconRes.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  const buffer = Buffer.from(await iconRes.arrayBuffer());
  if (buffer.length === 0) return null;
  let ext = 'png';
  let mimeType = 'image/png';
  if (contentType.includes('svg') || iconUrl.toLowerCase().endsWith('.svg')) {
    ext = 'svg';
    mimeType = 'image/svg+xml';
  } else if (contentType.includes('x-icon') || contentType.includes('ico') || iconUrl.toLowerCase().endsWith('.ico')) {
    ext = 'ico';
    mimeType = 'image/x-icon';
  }
  if (!ALLOWED_ICON_MIMES.has(mimeType)) return null;
  const filename = `${safeTabId}-primary.${ext}`;
  const relativePath = `icons/${filename}`;
  const fullPath = path.join(CHAPPY_DIR, relativePath);
  const existingTabs = configState.tabs || [];
  const existingTab = existingTabs.find((t) => t.id === tabId);
  if (existingTab?.primaryIconPath) {
    const oldFullPath = path.join(CHAPPY_DIR, existingTab.primaryIconPath);
    if (fs.existsSync(oldFullPath)) fs.unlinkSync(oldFullPath);
  }
  fs.mkdirSync(ICONS_DIR, { recursive: true });
  fs.writeFileSync(fullPath, buffer);
  return { path: relativePath.replace(/\\/g, '/') };
};

ipcMain.handle('chappy:fetch-and-save-icon', async (_event, { iconUrl, tabId }) => {
  if (!iconUrl || !tabId || !isValidHttpsUrl(iconUrl)) {
    return null;
  }
  const safeTabId = sanitizeToken(tabId, 'tab');

  let iconRes;
  try {
    iconRes = await net.fetch(iconUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'image/*,*/*;q=0.8'
      }
    });
    if (!iconRes.ok) return null;
  } catch {
    return null;
  }

  const contentType = (iconRes.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  const buffer = Buffer.from(await iconRes.arrayBuffer());
  if (buffer.length === 0) return null;

  let ext = 'png';
  let mimeType = 'image/png';
  if (contentType.includes('svg') || iconUrl.toLowerCase().endsWith('.svg')) {
    ext = 'svg';
    mimeType = 'image/svg+xml';
  } else if (contentType.includes('x-icon') || contentType.includes('ico') || iconUrl.toLowerCase().endsWith('.ico')) {
    ext = 'ico';
    mimeType = 'image/x-icon';
  }

  if (!ALLOWED_ICON_MIMES.has(mimeType)) return null;

  const filename = `${safeTabId}-primary.${ext}`;
  const relativePath = `icons/${filename}`;
  const fullPath = path.join(CHAPPY_DIR, relativePath);

  const existingTabs = configState.tabs || [];
  const existingTab = existingTabs.find((t) => t.id === tabId);
  if (existingTab?.primaryIconPath) {
    const oldFullPath = path.join(CHAPPY_DIR, existingTab.primaryIconPath);
    if (fs.existsSync(oldFullPath)) {
      fs.unlinkSync(oldFullPath);
    }
  }

  fs.mkdirSync(ICONS_DIR, { recursive: true });
  fs.writeFileSync(fullPath, buffer);
  return { path: relativePath.replace(/\\/g, '/') };
});

ipcMain.handle('chappy:check-for-update', async () => {
  const result = await vueUpdate.checkForUpdate(configState);
  configState.lastUpdateCheck = new Date().toISOString();
  writeConfig(configState);
  return result;
});

ipcMain.handle('chappy:get-update-status', () => vueUpdate.getUpdateState());

ipcMain.handle('chappy:restart-to-apply', () => {
  vueUpdate.applyPendingUpdate();
  configState.lastUpdateApplied = new Date().toISOString();
  writeConfig(configState);
  app.relaunch();
  app.quit();
});

ipcMain.handle('chappy:set-badge-count', (_event, count) => setAppBadgeCount(count));

app.on('web-contents-created', (_event, contents) => {
  if (typeof contents.setWindowOpenHandler !== 'function') {
    return;
  }

  contents.setWindowOpenHandler(({ url }) => {
    if (contents.getType() !== 'webview' || !shouldUseSystemBrowserLinks()) {
      return { action: 'allow' };
    }

    const externalUrl = normalizeExternalTarget(url);
    if (!externalUrl) {
      return { action: 'deny' };
    }
    void shell.openExternal(externalUrl);
    return { action: 'deny' };
  });
});

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
    const rendererPath = vueUpdate.getRendererPath();
    browserWindow.loadFile(path.join(rendererPath, 'index.html'));
  }

  setWindowsOverlayBadge(currentAppBadgeCount);
};

app.whenReady().then(() => {
  if (!process.env.VITE_DEV_SERVER_URL && vueUpdate.shouldRunBackgroundCheck(configState)) {
    vueUpdate.checkForUpdate(configState).then((result) => {
      configState.lastUpdateCheck = new Date().toISOString();
      writeConfig(configState);
    });
  }

  protocol.handle('chappy-icon', (request) => {
    try {
      const url = new URL(request.url);
      const pathname = url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname;
      const fullPath = path.join(CHAPPY_DIR, pathname);
      if (!fullPath.startsWith(ICONS_DIR) || !fs.existsSync(fullPath)) {
        return new Response(null, { status: 404 });
      }
      return net.fetch(pathToFileURL(fullPath).toString());
    } catch {
      return new Response(null, { status: 404 });
    }
  });

  const appIcon = resolveAppIcon();
  if (process.platform === 'darwin' && appIcon && app.dock?.setIcon) {
    app.dock.setIcon(appIcon);
  }
  setAppBadgeCount(0);
  createMainWindow();
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('before-quit', () => {
  setAppBadgeCount(0);
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});
