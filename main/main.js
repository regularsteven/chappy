const fs = require('node:fs');
const os = require('node:os');
const { app, BrowserWindow, ipcMain, nativeImage, net, protocol, session, shell } = require('electron');
const path = require('path');
const { pathToFileURL } = require('node:url');
const extractZip = require('extract-zip');
const vueUpdate = require('./vue-update.js');
const calendarService = require('./calendar-service.js');

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
const WIDGETS_DIR = path.join(CHAPPY_DIR, 'widgets');
// All packaged-widget webviews share this session so one protocol registration
// serves them all; per-widget isolation comes from per-id origins instead.
// The partition, id pattern, and geometry limits must match the ESM copies in
// src/renderer/data/widgetCatalog.core.mjs (this CJS file cannot import them).
const WIDGET_SESSION_PARTITION = 'persist:chappy-widgets';
const WIDGET_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
const WIDGET_ZIP_MAX_BYTES = 20 * 1024 * 1024;
// Ids packages may not claim: built-in native widgets ('clock') and the
// virtual host that serves the calendar backend ('api').
const RESERVED_WIDGET_IDS = new Set(['clock', calendarService.WIDGET_API_HOST]);
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
  displayMode: 'desktop',
  chappyPanelOpen: true,
  useSystemBrowserLinks: true,
  preserveTabMemory: true,
  openServicesOnLaunch: false,
  enableAutoUpdate: true,
  tabs: [],
  mirrorWidgets: []
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
const displayModes = new Set(['desktop', 'mirror']);
const sanitizeDisplayMode = (value) => {
  if (typeof value !== 'string') {
    return 'desktop';
  }
  const normalized = value.trim();
  return displayModes.has(normalized) ? normalized : 'desktop';
};

const clampNumber = (value, fallback, min, max) => {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.round(num)));
};

const MIRROR_COORD_MAX = 20000;
const MIRROR_WINDOW_MIN_WIDTH = 320;
const MIRROR_WINDOW_MIN_HEIGHT = 240;

const sanitizeMirrorWindow = (value) => {
  if (!isObject(value)) {
    return undefined;
  }
  return {
    x: clampNumber(value.x, 40, 0, MIRROR_COORD_MAX),
    y: clampNumber(value.y, 40, 0, MIRROR_COORD_MAX),
    width: clampNumber(value.width, 760, MIRROR_WINDOW_MIN_WIDTH, MIRROR_COORD_MAX),
    height: clampNumber(value.height, 540, MIRROR_WINDOW_MIN_HEIGHT, MIRROR_COORD_MAX),
    z: clampNumber(value.z, 1, 1, 1000000),
    open: value.open === true
  };
};

const PACKAGE_WIDGET_MIN_WIDTH = 120;
const PACKAGE_WIDGET_MIN_HEIGHT = 80;
const PACKAGE_WIDGET_DEFAULT_WIDTH = 360;
const PACKAGE_WIDGET_DEFAULT_HEIGHT = 280;

const sanitizeMirrorWidgets = (input) => {
  if (!Array.isArray(input)) {
    return [];
  }
  const ids = new Set();
  return input
    .map((widget, index) => {
      if (!isObject(widget)) {
        return null;
      }
      // Validate the type before allocating the unique id, so rejected
      // entries cannot force a rename onto a valid sibling with the same id.
      const isClock = widget.type === 'clock';
      const packageWidgetId =
        widget.type === 'package' &&
        typeof widget.widgetId === 'string' &&
        WIDGET_ID_PATTERN.test(widget.widgetId)
          ? widget.widgetId
          : '';
      if (!isClock && !packageWidgetId) {
        return null;
      }
      const idSeed =
        typeof widget.id === 'string' && widget.id.trim() ? widget.id : `widget-${index + 1}`;
      const base = {
        id: ensureUnique(idSeed, ids, `widget-${index + 1}`),
        x: clampNumber(widget.x, 48, 0, MIRROR_COORD_MAX),
        y: clampNumber(widget.y, 48, 0, MIRROR_COORD_MAX),
        z: clampNumber(widget.z, 1, 1, 1000000)
      };
      if (isClock) {
        return {
          ...base,
          type: 'clock',
          timeZone: typeof widget.timeZone === 'string' ? widget.timeZone.trim().slice(0, 64) : ''
        };
      }
      return {
        ...base,
        type: 'package',
        widgetId: packageWidgetId,
        width: clampNumber(widget.width, PACKAGE_WIDGET_DEFAULT_WIDTH, PACKAGE_WIDGET_MIN_WIDTH, MIRROR_COORD_MAX),
        height: clampNumber(widget.height, PACKAGE_WIDGET_DEFAULT_HEIGHT, PACKAGE_WIDGET_MIN_HEIGHT, MIRROR_COORD_MAX)
      };
    })
    .filter(Boolean);
};

const launchModes = new Set(['default', 'custom', 'preserve']);
const externalProtocols = new Set(['http:', 'https:', 'mailto:', 'tel:']);
const ALLOWED_ICON_MIMES = new Set(['image/svg+xml', 'image/png', 'image/x-icon']);
const DEFAULT_PLATFORM_UA_BY_OS = {
  darwin: 'Macintosh; Intel Mac OS X 10_15_7',
  win32: 'Windows NT 10.0; Win64; x64',
  linux: 'X11; Linux x86_64'
};
let compatibilityUserAgent = '';

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

const buildCompatibilityUserAgent = (sourceUserAgent) => {
  const chromeVersion = process.versions.chrome || '120.0.0.0';
  const platformToken = DEFAULT_PLATFORM_UA_BY_OS[process.platform] || DEFAULT_PLATFORM_UA_BY_OS.linux;
  const fallbackUserAgent = `Mozilla/5.0 (${platformToken}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
  const rawUserAgent =
    typeof sourceUserAgent === 'string' && sourceUserAgent.trim() ? sourceUserAgent.trim() : fallbackUserAgent;
  const normalizedUserAgent = rawUserAgent
    .replace(/\s+Chappy\/[^\s]+/gi, '')
    .replace(/\s+Electron\/[^\s]+/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (/Chrome\/[^\s]+/i.test(normalizedUserAgent)) {
    return normalizedUserAgent;
  }
  if (/Safari\/[^\s]+/i.test(normalizedUserAgent)) {
    return normalizedUserAgent.replace(/Safari\/[^\s]+/i, `Chrome/${chromeVersion} Safari/537.36`);
  }
  return `${normalizedUserAgent} Chrome/${chromeVersion} Safari/537.36`.trim();
};

const getCompatibilityUserAgent = () => {
  if (!compatibilityUserAgent) {
    compatibilityUserAgent = buildCompatibilityUserAgent(app.userAgentFallback);
  }
  return compatibilityUserAgent;
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
    secondaryIconPath: secondaryIconPath || undefined,
    mirrorWindow: sanitizeMirrorWindow(tab.mirrorWindow)
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
    displayMode: sanitizeDisplayMode(payload.displayMode),
    // Mirror mode remembers whether the Chappy panel was left showing, so a
    // restarted mirror comes back up as a mirror rather than as the config panel.
    chappyPanelOpen: payload.chappyPanelOpen !== false,
    useSystemBrowserLinks: payload.useSystemBrowserLinks !== false,
    preserveTabMemory,
    openServicesOnLaunch,
    enableAutoUpdate,
    lastUpdateCheck: typeof payload.lastUpdateCheck === 'string' ? payload.lastUpdateCheck : undefined,
    lastUpdateApplied: typeof payload.lastUpdateApplied === 'string' ? payload.lastUpdateApplied : undefined,
    tabs,
    mirrorWidgets: sanitizeMirrorWidgets(payload.mirrorWidgets)
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
  { scheme: 'chappy-icon', privileges: { standard: true, secure: true, supportFetchAPI: true } },
  { scheme: 'chappy-widget', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }
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
        'User-Agent': getCompatibilityUserAgent(),
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
        'User-Agent': getCompatibilityUserAgent(),
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
        'User-Agent': getCompatibilityUserAgent(),
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

// ---- Widget packages -------------------------------------------------------
// Installed widgets live in ~/.chappy/widgets/<id>/ and are served through the
// chappy-widget://<id>/<path> protocol, so packages install at runtime without
// an app rebuild. See widgets/README.md for the package format.

const sanitizeWidgetAssetPath = (value, widgetDir) => {
  if (typeof value !== 'string' || !value.trim()) {
    return '';
  }
  const normalized = path.normalize(value.trim()).replace(/\\/g, '/');
  if (path.isAbsolute(normalized) || normalized.split('/').includes('..')) {
    return '';
  }
  const fullPath = path.join(widgetDir, normalized);
  if (!fullPath.startsWith(widgetDir + path.sep) || !fs.existsSync(fullPath)) {
    return '';
  }
  return normalized;
};

const sanitizeWidgetSize = (value, fallbackWidth, fallbackHeight, minWidth, minHeight) => ({
  width: clampNumber(value?.width, fallbackWidth, minWidth, 4000),
  height: clampNumber(value?.height, fallbackHeight, minHeight, 4000)
});

const sanitizeWidgetManifest = (input, widgetDir) => {
  if (!isObject(input)) {
    return null;
  }
  const id = typeof input.id === 'string' && WIDGET_ID_PATTERN.test(input.id) ? input.id : '';
  const name = typeof input.name === 'string' ? input.name.trim().slice(0, 64) : '';
  const entry = sanitizeWidgetAssetPath(input.entry, widgetDir);
  if (!id || !name || !entry) {
    return null;
  }
  const tags = Array.isArray(input.tags)
    ? input.tags.filter((tag) => typeof tag === 'string' && WIDGET_ID_PATTERN.test(tag)).slice(0, 8)
    : [];
  return {
    id,
    name,
    entry,
    version: typeof input.version === 'string' ? input.version.trim().slice(0, 32) : '',
    description: typeof input.description === 'string' ? input.description.trim().slice(0, 200) : '',
    author: typeof input.author === 'string' ? input.author.trim().slice(0, 64) : '',
    icon: sanitizeWidgetAssetPath(input.icon, widgetDir),
    tags,
    defaultSize: sanitizeWidgetSize(
      input.defaultSize,
      PACKAGE_WIDGET_DEFAULT_WIDTH,
      PACKAGE_WIDGET_DEFAULT_HEIGHT,
      PACKAGE_WIDGET_MIN_WIDTH,
      PACKAGE_WIDGET_MIN_HEIGHT
    ),
    minSize: sanitizeWidgetSize(input.minSize, 220, 140, PACKAGE_WIDGET_MIN_WIDTH, PACKAGE_WIDGET_MIN_HEIGHT),
    multiInstance: input.multiInstance !== false
  };
};

const readWidgetManifest = (widgetDir) => {
  const manifestPath = path.join(widgetDir, 'widget.json');
  if (!fs.existsSync(manifestPath)) {
    return null;
  }
  try {
    return sanitizeWidgetManifest(JSON.parse(fs.readFileSync(manifestPath, 'utf8')), widgetDir);
  } catch (error) {
    return null;
  }
};

// Accepts widget.json at the ZIP root or inside a single top-level folder.
const resolveWidgetPackageRoot = (extractDir) => {
  if (fs.existsSync(path.join(extractDir, 'widget.json'))) {
    return extractDir;
  }
  const entries = fs
    .readdirSync(extractDir, { withFileTypes: true })
    .filter((entry) => !entry.name.startsWith('.') && entry.name !== '__MACOSX');
  if (entries.length === 1 && entries[0].isDirectory()) {
    const candidate = path.join(extractDir, entries[0].name);
    if (fs.existsSync(path.join(candidate, 'widget.json'))) {
      return candidate;
    }
  }
  return null;
};

const listInstalledWidgets = () => {
  if (!fs.existsSync(WIDGETS_DIR)) {
    return [];
  }
  return fs
    .readdirSync(WIDGETS_DIR, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() && WIDGET_ID_PATTERN.test(entry.name) && !RESERVED_WIDGET_IDS.has(entry.name)
    )
    .map((entry) => {
      const manifest = readWidgetManifest(path.join(WIDGETS_DIR, entry.name));
      // The folder name is what the protocol serves, so a mismatched manifest
      // id would produce broken entry URLs — skip such folders entirely.
      return manifest && manifest.id === entry.name ? manifest : null;
    })
    .filter(Boolean);
};

const toBuffer = (input) => {
  if (Buffer.isBuffer(input)) {
    return input;
  }
  if (input instanceof ArrayBuffer) {
    return Buffer.from(input);
  }
  if (ArrayBuffer.isView(input)) {
    return Buffer.from(input.buffer, input.byteOffset, input.byteLength);
  }
  return null;
};

ipcMain.handle('chappy:list-widgets', () => listInstalledWidgets());

ipcMain.handle('chappy:install-widget', async (_event, payload) => {
  const data = toBuffer(payload?.buffer);
  if (!data || data.length === 0) {
    return { error: 'The dropped file is empty.' };
  }
  if (data.length > WIDGET_ZIP_MAX_BYTES) {
    return { error: 'Widget package is too large (max 20 MB).' };
  }
  const staging = fs.mkdtempSync(path.join(os.tmpdir(), 'chappy-widget-'));
  const zipPath = path.join(staging, 'package.zip');
  const extractDir = path.join(staging, 'extracted');
  try {
    await fs.promises.writeFile(zipPath, data);
    fs.mkdirSync(extractDir, { recursive: true });
    await extractZip(zipPath, { dir: extractDir });
    const packageRoot = resolveWidgetPackageRoot(extractDir);
    const manifest = packageRoot ? readWidgetManifest(packageRoot) : null;
    if (!manifest) {
      return { error: 'Not a widget package: widget.json is missing or invalid.' };
    }
    if (RESERVED_WIDGET_IDS.has(manifest.id)) {
      return { error: `"${manifest.id}" is reserved for a built-in widget — pick another id.` };
    }
    const targetDir = path.join(WIDGETS_DIR, manifest.id);
    // Stage the validated package next to its destination first, so the final
    // swap is a rename and a failed install never destroys an existing one.
    const pendingDir = `${targetDir}.installing`;
    fs.mkdirSync(WIDGETS_DIR, { recursive: true });
    await fs.promises.rm(pendingDir, { recursive: true, force: true });
    try {
      await fs.promises.rename(packageRoot, pendingDir);
    } catch (error) {
      // Cross-volume tmpdir: fall back to a copy into the pending dir.
      await fs.promises.cp(packageRoot, pendingDir, { recursive: true });
    }
    const replaced = fs.existsSync(targetDir);
    await fs.promises.rm(targetDir, { recursive: true, force: true });
    await fs.promises.rename(pendingDir, targetDir);
    return { manifest, replaced };
  } catch (error) {
    return { error: 'Could not read that file as a widget ZIP.' };
  } finally {
    fs.rmSync(staging, { recursive: true, force: true });
  }
});

ipcMain.handle('chappy:remove-widget', (_event, payload) => {
  const widgetId = payload?.widgetId;
  if (typeof widgetId !== 'string' || !WIDGET_ID_PATTERN.test(widgetId)) {
    return { error: 'Invalid widget id.' };
  }
  fs.rmSync(path.join(WIDGETS_DIR, widgetId), { recursive: true, force: true });
  return { ok: true };
});

const handleWidgetProtocol = (request) => {
  try {
    const url = new URL(request.url);
    const widgetId = url.hostname;
    // The reserved `api` host is not a widget folder — it is the bridge to the
    // main-process calendar service (see main/calendar-service.js).
    if (widgetId === calendarService.WIDGET_API_HOST) {
      return calendarService.handleApiRequest(request);
    }
    if (!WIDGET_ID_PATTERN.test(widgetId)) {
      return new Response(null, { status: 400 });
    }
    const widgetDir = path.join(WIDGETS_DIR, widgetId);
    const relativePath = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
    const fullPath = path.normalize(path.join(widgetDir, relativePath));
    const stats = fs.statSync(fullPath, { throwIfNoEntry: false });
    if (!fullPath.startsWith(widgetDir + path.sep) || !stats || !stats.isFile()) {
      return new Response(null, { status: 404 });
    }
    // The lexical check above cannot see through symlinks a package may ship;
    // resolving to real paths keeps a link from serving files outside the
    // widget folder.
    const realPath = fs.realpathSync(fullPath);
    const realWidgetDir = fs.realpathSync(widgetDir);
    if (!realPath.startsWith(realWidgetDir + path.sep)) {
      return new Response(null, { status: 404 });
    }
    return net.fetch(pathToFileURL(realPath).toString());
  } catch (error) {
    return new Response(null, { status: 404 });
  }
};
// ---------------------------------------------------------------------------

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
  if (contents.getType() === 'webview' && typeof contents.setUserAgent === 'function') {
    contents.setUserAgent(getCompatibilityUserAgent());
  }

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

  browserWindow.webContents.on('will-attach-webview', (_event, _webPreferences, params) => {
    params.useragent = getCompatibilityUserAgent();
  });

  // The renderer is a single-page app that never changes URL; the only
  // renderer-initiated navigation is same-URL (vite dev full reload). Anything
  // else — e.g. a file dropped past the widget Quick Add zone's own guards —
  // would tear down the whole UI, so block it here as well.
  browserWindow.webContents.on('will-navigate', (event, targetUrl) => {
    if (targetUrl !== browserWindow.webContents.getURL()) {
      event.preventDefault();
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

  calendarService.init({ chappyDir: CHAPPY_DIR });

  // Widget webviews run in their own partition, whose session resolves
  // protocols independently of the default session — register on both.
  protocol.handle('chappy-widget', handleWidgetProtocol);
  session.fromPartition(WIDGET_SESSION_PARTITION).protocol.handle('chappy-widget', handleWidgetProtocol);

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
