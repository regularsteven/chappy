// Calendar backend for the mirror widget bridge.
//
// The Calendar widget (widgets/calendar/) is plain sandboxed web content, so
// everything privileged lives here in the main process. Widgets reach it
// through the reserved `api` host on the widget protocol — main.js routes
// chappy-widget://api/* requests to handleApiRequest() below.
//
// Two source tiers (either or both may be configured):
//   - ICS secret links (the zero-setup consumer path: Google / Apple / Outlook
//     all publish a private ICS URL; the user pastes it in widget settings)
//   - Google Calendar API with the user's own OAuth client (power tier:
//     faster refresh, response statuses; see docs/CALENDAR-SETUP.md)
// Two travel tiers:
//   - Keyless OSM (Nominatim geocoding + FOSSGIS OSRM routing): no key, no
//     billing, no live traffic — driving / walking / bicycling only
//   - Google Maps key (Geocoding + Routes APIs): traffic-aware ETAs + transit
//
// Endpoints:
//   GET  /calendar         -> { status, active, today, week, stale, lastUpdatedUtc }
//   GET  /next-event       -> alias of /calendar (original endpoint name)
//   GET  /config           -> non-secret settings for the widget settings pane
//   POST /config           -> save { icsUrls, homeAddress, travelMode } from the pane
//   POST /auth/start       -> opens the system browser for Google consent
//   POST /auth/disconnect  -> forgets the stored Google tokens
//
// User configuration lives in ~/.chappy/calendar.json (a template is written
// on first run; the widget settings pane edits it through POST /config, and
// credential fields are only ever edited by hand); OAuth tokens in
// ~/.chappy/calendar-tokens.json, encrypted with safeStorage when available.

const fs = require('node:fs');
const http = require('node:http');
const crypto = require('node:crypto');
const path = require('path');
const ical = require('node-ical');
const appVersion = require('../package.json').version;

// Electron is absent when plain-node test scripts require this module (the
// electron package's node export is a string, not the runtime API) — every
// stateful path guards on it, and the pure helpers never touch it.
let electron = null;
try {
  const mod = require('electron');
  if (mod && typeof mod === 'object' && mod.app) {
    electron = mod;
  }
} catch (error) {
  electron = null;
}

const doFetch = (input, init) =>
  electron && electron.net && typeof electron.net.fetch === 'function'
    ? electron.net.fetch(input, init)
    : fetch(input, init);

const WIDGET_API_HOST = 'api';

// The OSM services (Nominatim, FOSSGIS OSRM) ask keyless callers to identify
// themselves; our volume (one cached geocode per new address, one route per
// travel refresh) is far inside their usage policies.
const OSM_USER_AGENT = `Chappy-Mirror/${appVersion} (+https://github.com/regularsteven/chappy)`;

const CALENDAR_TTL_MS = 15 * 60 * 1000;
const TRAVEL_TTL_LIVE_MS = 10 * 60 * 1000;
const TRAVEL_TTL_PREDICTIVE_MS = 30 * 60 * 1000;
const TRAVEL_RETRY_MS = 5 * 60 * 1000;
const LIVE_DEPARTURE_WINDOW_MS = 2 * 60 * 60 * 1000;
const GEOCODE_FAILURE_TTL_MS = 5 * 60 * 1000;
const OAUTH_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';
const OAUTH_FLOW_TIMEOUT_MS = 5 * 60 * 1000;
const ACCESS_TOKEN_SKEW_MS = 60 * 1000;
const MAX_CALENDARS = 10;
const MAX_ICS_URLS = 5;
const WEEK_DAYS = 7;
// Fetch window covers today through the end of the week view.
const FETCH_WINDOW_DAYS = WEEK_DAYS + 1;

// Config keys -> Routes API travelMode values.
const TRAVEL_MODES = { driving: 'DRIVE', walking: 'WALK', bicycling: 'BICYCLE', transit: 'TRANSIT' };
// Config keys -> FOSSGIS OSRM instance profiles. No transit — that tier needs
// the Google key; the widget settings say so next to the mode picker.
const OSRM_PROFILES = { driving: 'routed-car', walking: 'routed-foot', bicycling: 'routed-bike' };

const VIDEO_CALL_HOSTS = /(?:meet\.google\.com|zoom\.us|teams\.microsoft\.com|teams\.live\.com|webex\.com|whereby\.com)/i;

class NeedsAuthError extends Error {}

const isObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

const cleanString = (value) => (typeof value === 'string' ? value.trim() : '');

const clampInt = (value, fallback, min, max) => {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.round(num)));
};

// ---- Pure logic (exported for scripts/check-calendar.mjs) ------------------

// Calendar apps hand out "webcal://" links for the same https resource.
const normalizeIcsUrl = (value) => {
  const raw = cleanString(value);
  if (!raw) {
    return '';
  }
  const candidate = raw.replace(/^webcal:\/\//i, 'https://');
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.toString() : '';
  } catch (error) {
    return '';
  }
};

const sanitizeCalendarConfig = (input) => {
  const raw = isObject(input) ? input : {};
  const lat = Number(raw.homeCoordinates?.lat);
  const lng = Number(raw.homeCoordinates?.lng);
  const homeCoordinates =
    Number.isFinite(lat) && Math.abs(lat) <= 90 && Number.isFinite(lng) && Math.abs(lng) <= 180
      ? { lat, lng }
      : null;
  const calendarIds = Array.isArray(raw.calendarIds)
    ? raw.calendarIds.map(cleanString).filter(Boolean).slice(0, MAX_CALENDARS)
    : [];
  const icsUrls = Array.isArray(raw.icsUrls)
    ? raw.icsUrls.map(normalizeIcsUrl).filter(Boolean).slice(0, MAX_ICS_URLS)
    : [];
  return {
    icsUrls,
    googleClientId: cleanString(raw.googleClientId),
    googleClientSecret: cleanString(raw.googleClientSecret),
    mapsApiKey: cleanString(raw.mapsApiKey),
    homeAddress: cleanString(raw.homeAddress).slice(0, 200),
    homeCoordinates,
    rolloverHour: clampInt(raw.rolloverHour, 17, 0, 23),
    bufferMinutes: clampInt(raw.bufferMinutes, 10, 0, 120),
    travelMode: TRAVEL_MODES[raw.travelMode] ? raw.travelMode : 'driving',
    calendarIds: calendarIds.length ? calendarIds : ['primary'],
    // Metric throughout — the spec bans miles anywhere in the UI or code.
    units: 'metric'
  };
};

const isVideoCallLocation = (location) => {
  const value = cleanString(location);
  if (!value) {
    return false;
  }
  return /^https?:\/\//i.test(value) || VIDEO_CALL_HOSTS.test(value);
};

// Google API event -> internal shape, or null when it should not exist for us
// at all (cancelled, declined by the user, or unparseable start).
const normalizeGoogleEvent = (item) => {
  if (!isObject(item) || item.status === 'cancelled') {
    return null;
  }
  const attendees = Array.isArray(item.attendees) ? item.attendees : [];
  if (attendees.some((a) => isObject(a) && a.self === true && a.responseStatus === 'declined')) {
    return null;
  }
  const allDay = typeof item.start?.date === 'string' && !item.start?.dateTime;
  let startMs;
  if (allDay) {
    const [y, m, d] = item.start.date.split('-').map(Number);
    // Local midnight: all-day events only feed the agenda and date bucketing.
    startMs = new Date(y, (m || 1) - 1, d || 1).getTime();
  } else {
    startMs = Date.parse(item.start?.dateTime || '');
  }
  if (!Number.isFinite(startMs)) {
    return null;
  }
  const rawLocation = cleanString(item.location);
  return {
    id: typeof item.id === 'string' ? item.id : '',
    title: cleanString(item.summary) || '(untitled)',
    startMs,
    startUtc: new Date(startMs).toISOString(),
    allDay,
    // A video-call "location" is not somewhere you travel to.
    location: rawLocation && !isVideoCallLocation(rawLocation) ? rawLocation : ''
  };
};

const buildIcsEvent = (item, startMs, allDay) => {
  const rawLocation = cleanString(item.location);
  return {
    // Recurring instances share a UID; suffix the instant to keep travel-cache
    // keys distinct per occurrence.
    id: `${cleanString(item.uid) || 'ics'}@${startMs}`,
    title: cleanString(item.summary) || '(untitled)',
    startMs,
    startUtc: new Date(startMs).toISOString(),
    allDay,
    location: rawLocation && !isVideoCallLocation(rawLocation) ? rawLocation : ''
  };
};

const toMs = (value) => {
  if (value instanceof Date) {
    return value.getTime();
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : NaN;
};

// node-ical parse output -> internal events within [windowStartMs, windowEndMs).
// rrule.between() does NOT apply EXDATEs or RECURRENCE-ID overrides — both are
// exposed as maps on the VEVENT and must be applied here.
const expandIcsEvents = (parsed, windowStartMs, windowEndMs) => {
  const out = [];
  for (const item of Object.values(isObject(parsed) ? parsed : {})) {
    if (!isObject(item) || item.type !== 'VEVENT') {
      continue;
    }
    if (cleanString(item.status).toUpperCase() === 'CANCELLED') {
      continue;
    }
    const allDay = item.datetype === 'date';
    const push = (source, startMs) => {
      if (Number.isFinite(startMs) && startMs >= windowStartMs && startMs < windowEndMs) {
        out.push(buildIcsEvent(source, startMs, allDay));
      }
    };
    if (item.rrule && typeof item.rrule.between === 'function') {
      // node-ical maps each override under two keys (date and full ISO) that
      // point at the same object — dedupe by identity or it renders twice.
      const overrides = isObject(item.recurrences)
        ? [...new Set(Object.values(item.recurrences).filter(isObject))]
        : [];
      const overriddenMs = new Set(overrides.map((o) => toMs(o.recurrenceid)).filter(Number.isFinite));
      const exdateMs = new Set(
        isObject(item.exdate) ? Object.values(item.exdate).map(toMs).filter(Number.isFinite) : []
      );
      let occurrences = [];
      try {
        occurrences = item.rrule.between(new Date(windowStartMs - 1), new Date(windowEndMs)) || [];
      } catch (error) {
        occurrences = [];
      }
      for (const occurrence of occurrences) {
        const occurrenceMs = toMs(occurrence);
        if (!exdateMs.has(occurrenceMs) && !overriddenMs.has(occurrenceMs)) {
          push(item, occurrenceMs);
        }
      }
      // Moved/edited instances carry their own VEVENT with a RECURRENCE-ID.
      for (const override of overrides) {
        if (cleanString(override.status).toUpperCase() !== 'CANCELLED') {
          push(override, toMs(override.start));
        }
      }
    } else if (item.start instanceof Date) {
      push(item, item.start.getTime());
    }
  }
  return out;
};

const localDayKey = (date) => date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();

// Spec selection: today's next future event until the rollover hour or until
// today is exhausted; after either, tomorrow's first event (and only
// tomorrow's — day-after-tomorrow returns null). Buckets use local dates, but
// candidacy is `start > now` in absolute time, so an overnight 00:30 event is
// reachable before midnight. All-day events are never active.
const selectActiveEvent = (events, now, rolloverHour) => {
  const nowMs = now.getTime();
  const todayKey = localDayKey(now);
  const tomorrowKey = localDayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
  const cutoffMs = new Date(now.getFullYear(), now.getMonth(), now.getDate(), rolloverHour).getTime();
  const future = events.filter((event) => !event.allDay && event.startMs > nowMs);
  if (nowMs < cutoffMs) {
    const today = future.find((event) => localDayKey(new Date(event.startMs)) === todayKey);
    if (today) {
      return { event: today, isTomorrow: false };
    }
  }
  const tomorrow = future.find((event) => localDayKey(new Date(event.startMs)) === tomorrowKey);
  return tomorrow ? { event: tomorrow, isTomorrow: true } : { event: null, isTomorrow: false };
};

const agendaOrder = (a, b) => (a.allDay === b.allDay ? a.startMs - b.startMs : a.allDay ? -1 : 1);

const toAgendaItem = (event) => ({ title: event.title, startUtc: event.startUtc, allDay: event.allDay });

// The rest of today: all-day events first, then timed events that have not
// started yet. In-progress events are deliberately absent — the agenda is
// "what is still coming", not "what you are already in".
const buildAgenda = (events, now) => {
  const nowMs = now.getTime();
  const todayKey = localDayKey(now);
  return events
    .filter((event) => {
      if (localDayKey(new Date(event.startMs)) !== todayKey) {
        return false;
      }
      return event.allDay ? true : event.startMs > nowMs;
    })
    .sort(agendaOrder)
    .map(toAgendaItem);
};

// Week view: the next `days` local dates, each with its events (today shows
// only what is still coming). Empty days are omitted — the widget renders
// what exists rather than a grid of blanks. dateUtc is the local midnight of
// the group's day; the widget formats the weekday label from it.
const buildWeek = (events, now, days = WEEK_DAYS) => {
  const nowMs = now.getTime();
  const groups = [];
  for (let offset = 0; offset < days; offset += 1) {
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    const dayKey = localDayKey(dayStart);
    const dayEvents = events
      .filter((event) => {
        if (localDayKey(new Date(event.startMs)) !== dayKey) {
          return false;
        }
        return offset === 0 && !event.allDay ? event.startMs > nowMs : true;
      })
      .sort(agendaOrder)
      .map(toAgendaItem);
    if (dayEvents.length) {
      groups.push({ dateUtc: dayStart.toISOString(), events: dayEvents });
    }
  }
  return groups;
};

const computeLeaveByUtc = (startMs, travelDurationSeconds, bufferMinutes) =>
  new Date(startMs - travelDurationSeconds * 1000 - bufferMinutes * 60 * 1000).toISOString();

const isLiveDeparture = (startMs, nowMs) => startMs - nowMs <= LIVE_DEPARTURE_WINDOW_MS;

const travelTtlMs = (startMs, nowMs) =>
  isLiveDeparture(startMs, nowMs) ? TRAVEL_TTL_LIVE_MS : TRAVEL_TTL_PREDICTIVE_MS;

// Routes API duration strings look like "1234s".
const parseDurationSeconds = (value) => {
  if (typeof value !== 'string' || !/^\d+(\.\d+)?s$/.test(value)) {
    return null;
  }
  return Math.round(parseFloat(value));
};

const buildRouteRequestBody = ({ home, destination, travelMode, departureTimeMs }) => {
  const mode = TRAVEL_MODES[travelMode] || 'DRIVE';
  const body = {
    origin: { location: { latLng: { latitude: home.lat, longitude: home.lng } } },
    destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
    travelMode: mode,
    units: 'METRIC'
  };
  // Traffic options only exist for driving; the Routes API rejects them on
  // other modes. departureTime steers prediction for roads and timetables.
  if (mode === 'DRIVE') {
    body.routingPreference = 'TRAFFIC_AWARE_OPTIMAL';
    body.trafficModel = 'BEST_GUESS';
  }
  if (departureTimeMs != null && (mode === 'DRIVE' || mode === 'TRANSIT')) {
    body.departureTime = new Date(departureTimeMs).toISOString();
  }
  return body;
};

// OSRM wants lng,lat pairs. Returns '' for modes the keyless tier cannot do.
const buildOsrmUrl = (travelMode, home, destination) => {
  const profile = OSRM_PROFILES[travelMode];
  if (!profile) {
    return '';
  }
  return (
    `https://routing.openstreetmap.de/${profile}/route/v1/driving/` +
    `${home.lng},${home.lat};${destination.lng},${destination.lat}?overview=false`
  );
};

const buildNominatimUrl = (address) =>
  'https://nominatim.openstreetmap.org/search?' +
  new URLSearchParams({ q: address, format: 'jsonv2', limit: '1' }).toString();

const normalizeGeocodeKey = (location) => cleanString(location).toLowerCase().replace(/\s+/g, ' ');

// ---- Service state ---------------------------------------------------------

let chappyDir = '';
let configPath = '';
let tokensPath = '';
let geocodeCachePath = '';

let configCache = null; // { config, mtimeMs }
let tokensState = undefined; // undefined = not loaded, null = none, object = tokens
let calendarCache = null; // { events, fetchedAtMs }
let calendarFetchPromise = null;
let travelCache = null; // { key, computedAtMs, value: { travel, leaveByUtc } }
let travelFailure = null; // { key, atMs }
let geocodeCache = new Map(); // normalized address -> { lat, lng, label? }
let geocodeFailures = new Map(); // normalized address -> failedAtMs
let activeAuthFlow = null; // { server, timer }

const CONFIG_TEMPLATE = {
  icsUrls: [],
  homeAddress: '',
  googleClientId: '',
  googleClientSecret: '',
  mapsApiKey: '',
  homeCoordinates: null,
  rolloverHour: 17,
  bufferMinutes: 10,
  travelMode: 'driving',
  calendarIds: ['primary'],
  units: 'metric'
};

const init = ({ chappyDir: dir }) => {
  chappyDir = dir;
  configPath = path.join(chappyDir, 'calendar.json');
  tokensPath = path.join(chappyDir, 'calendar-tokens.json');
  geocodeCachePath = path.join(chappyDir, 'calendar-geocode.json');
  fs.mkdirSync(chappyDir, { recursive: true });
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, JSON.stringify(CONFIG_TEMPLATE, null, 2), 'utf8');
  }
  try {
    const raw = JSON.parse(fs.readFileSync(geocodeCachePath, 'utf8'));
    if (isObject(raw)) {
      geocodeCache = new Map(
        Object.entries(raw).filter(
          ([, value]) => isObject(value) && Number.isFinite(value.lat) && Number.isFinite(value.lng)
        )
      );
    }
  } catch (error) {
    geocodeCache = new Map();
  }
};

const loadCalendarConfig = () => {
  let mtimeMs = -1;
  try {
    mtimeMs = fs.statSync(configPath).mtimeMs;
  } catch (error) {
    // Missing file sanitizes to an unconfigured state below.
  }
  if (configCache && configCache.mtimeMs === mtimeMs) {
    return configCache.config;
  }
  let parsed = null;
  try {
    parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (error) {
    parsed = null;
  }
  configCache = { config: sanitizeCalendarConfig(parsed), mtimeMs };
  return configCache.config;
};

// Merge a settings patch into calendar.json, preserving hand-edited fields the
// widget settings pane does not manage (credentials, buffer, rollover).
const updateCalendarConfigFile = (patch) => {
  let raw = {};
  try {
    const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    raw = isObject(parsed) ? parsed : {};
  } catch (error) {
    raw = {};
  }
  const merged = { ...raw, ...patch };
  const tempPath = `${configPath}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(merged, null, 2), 'utf8');
  fs.renameSync(tempPath, configPath);
  configCache = null;
};

// ---- Token storage ---------------------------------------------------------
// { refreshToken, accessToken, accessExpiresAtMs } as JSON, wrapped in
// safeStorage encryption when the OS keychain is available.

const safeStorageReady = () =>
  Boolean(electron?.safeStorage?.isEncryptionAvailable && electron.safeStorage.isEncryptionAvailable());

const persistTokens = (tokens) => {
  tokensState = tokens;
  if (!tokens) {
    fs.rmSync(tokensPath, { force: true });
    return;
  }
  const json = JSON.stringify(tokens);
  const record = safeStorageReady()
    ? { v: 1, encrypted: true, data: electron.safeStorage.encryptString(json).toString('base64') }
    : { v: 1, encrypted: false, data: json };
  fs.writeFileSync(tokensPath, JSON.stringify(record), { encoding: 'utf8', mode: 0o600 });
};

const loadTokens = () => {
  if (tokensState !== undefined) {
    return tokensState;
  }
  tokensState = null;
  try {
    const record = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
    const json = record.encrypted
      ? electron.safeStorage.decryptString(Buffer.from(record.data, 'base64'))
      : record.data;
    const parsed = JSON.parse(json);
    if (isObject(parsed) && cleanString(parsed.refreshToken)) {
      tokensState = parsed;
    }
  } catch (error) {
    tokensState = null;
  }
  return tokensState;
};

// ---- Google OAuth (loopback + PKCE) ----------------------------------------

const base64Url = (buffer) => buffer.toString('base64url');

const closeAuthFlow = () => {
  if (!activeAuthFlow) {
    return;
  }
  clearTimeout(activeAuthFlow.timer);
  try {
    activeAuthFlow.server.close();
  } catch (error) {
    // Already closed.
  }
  activeAuthFlow = null;
};

const authResultPage = (message) =>
  `<!DOCTYPE html><html><body style="background:#0f172a;color:#e2e8f0;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><p style="font-size:18px">${message}</p></body></html>`;

const exchangeCodeForTokens = async (config, code, redirectUri, codeVerifier) => {
  const response = await doFetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: config.googleClientId,
      client_secret: config.googleClientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code_verifier: codeVerifier
    }).toString()
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !cleanString(data.refresh_token)) {
    throw new Error(data.error_description || data.error || `Token exchange failed (HTTP ${response.status})`);
  }
  persistTokens({
    refreshToken: data.refresh_token,
    accessToken: cleanString(data.access_token),
    accessExpiresAtMs: Date.now() + (Number(data.expires_in) || 0) * 1000
  });
};

const startAuthFlow = (config) =>
  new Promise((resolve) => {
    closeAuthFlow();
    const codeVerifier = base64Url(crypto.randomBytes(48));
    const challenge = base64Url(crypto.createHash('sha256').update(codeVerifier).digest());
    const state = base64Url(crypto.randomBytes(16));
    const server = http.createServer();

    server.on('request', async (req, res) => {
      const url = new URL(req.url, 'http://127.0.0.1');
      if (url.pathname !== '/oauth2/callback') {
        res.writeHead(404).end();
        return;
      }
      const finish = (statusCode, message) => {
        res.writeHead(statusCode, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(authResultPage(message));
        closeAuthFlow();
      };
      if (url.searchParams.get('state') !== state) {
        finish(400, 'This sign-in link is stale — start again from the mirror.');
        return;
      }
      const code = url.searchParams.get('code');
      if (!code) {
        finish(400, 'Google reported: ' + (url.searchParams.get('error') || 'no authorization code.'));
        return;
      }
      try {
        const redirectUri = `http://127.0.0.1:${server.address().port}/oauth2/callback`;
        await exchangeCodeForTokens(config, code, redirectUri, codeVerifier);
        // Fresh tokens should show data on the next widget poll, not in 15 min.
        calendarCache = null;
        finish(200, 'Chappy is connected to Google Calendar. You can close this tab.');
      } catch (error) {
        finish(500, 'Connecting failed: ' + (error.message || 'unknown error.'));
      }
    });

    server.on('error', () => {
      closeAuthFlow();
      resolve({ ok: false, error: 'Could not open a local port for the sign-in redirect.' });
    });

    server.listen(0, '127.0.0.1', () => {
      const redirectUri = `http://127.0.0.1:${server.address().port}/oauth2/callback`;
      const authUrl =
        'https://accounts.google.com/o/oauth2/v2/auth?' +
        new URLSearchParams({
          client_id: config.googleClientId,
          redirect_uri: redirectUri,
          response_type: 'code',
          scope: OAUTH_SCOPE,
          access_type: 'offline',
          prompt: 'consent',
          code_challenge: challenge,
          code_challenge_method: 'S256',
          state
        }).toString();
      activeAuthFlow = {
        server,
        timer: setTimeout(closeAuthFlow, OAUTH_FLOW_TIMEOUT_MS)
      };
      if (electron?.shell?.openExternal) {
        void electron.shell.openExternal(authUrl);
      }
      resolve({ ok: true });
    });
  });

const getAccessToken = async (config) => {
  const tokens = loadTokens();
  if (!tokens) {
    throw new NeedsAuthError();
  }
  if (tokens.accessToken && tokens.accessExpiresAtMs - ACCESS_TOKEN_SKEW_MS > Date.now()) {
    return tokens.accessToken;
  }
  const response = await doFetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.googleClientId,
      client_secret: config.googleClientSecret,
      refresh_token: tokens.refreshToken,
      grant_type: 'refresh_token'
    }).toString()
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (data.error === 'invalid_grant') {
      // Revoked or expired consent — only a new sign-in can fix this.
      persistTokens(null);
      throw new NeedsAuthError();
    }
    throw new Error(`Token refresh failed (HTTP ${response.status})`);
  }
  persistTokens({
    ...tokens,
    accessToken: cleanString(data.access_token),
    accessExpiresAtMs: Date.now() + (Number(data.expires_in) || 0) * 1000
  });
  return tokensState.accessToken;
};

// ---- Event sources ---------------------------------------------------------

const fetchGoogleEvents = async (config) => {
  const accessToken = await getAccessToken(config);
  const now = new Date();
  // Window: now -> local midnight after the week view's horizon. events.list
  // returns events overlapping the window, so today's all-day events appear.
  const timeMin = now.toISOString();
  const timeMax = new Date(now.getFullYear(), now.getMonth(), now.getDate() + FETCH_WINDOW_DAYS).toISOString();
  const collected = [];
  for (const calendarId of config.calendarIds) {
    const url =
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?` +
      new URLSearchParams({
        timeMin,
        timeMax,
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: '250'
      }).toString();
    const response = await doFetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    // 401 means the token is bad; 403 can be a transient quota error, which
    // should serve stale data rather than demand a re-connect.
    if (response.status === 401) {
      throw new NeedsAuthError();
    }
    if (!response.ok) {
      throw new Error(`Calendar fetch failed (HTTP ${response.status})`);
    }
    const data = await response.json();
    if (Array.isArray(data.items)) {
      collected.push(...data.items);
    }
  }
  return collected.map(normalizeGoogleEvent).filter(Boolean);
};

const fetchIcsEvents = async (config) => {
  const now = new Date();
  // Start at local midnight so today's all-day events fall inside the window.
  const windowStartMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const windowEndMs = new Date(now.getFullYear(), now.getMonth(), now.getDate() + FETCH_WINDOW_DAYS).getTime();
  const events = [];
  for (const url of config.icsUrls) {
    const response = await doFetch(url, {
      headers: { 'User-Agent': OSM_USER_AGENT, Accept: 'text/calendar,*/*;q=0.8' }
    });
    if (!response.ok) {
      throw new Error(`ICS fetch failed (HTTP ${response.status})`);
    }
    const text = await response.text();
    events.push(...expandIcsEvents(ical.sync.parseICS(text), windowStartMs, windowEndMs));
  }
  return events;
};

// Fetch every configured source. Partial results are better than none, but a
// recent full cache is better than a fresh partial one — the caller decides.
const fetchAllSources = async (config) => {
  const jobs = [];
  if (config.icsUrls.length) {
    jobs.push(fetchIcsEvents(config));
  }
  if (config.googleClientId && config.googleClientSecret && loadTokens()) {
    jobs.push(fetchGoogleEvents(config));
  }
  const results = await Promise.allSettled(jobs);
  const events = [];
  let failures = 0;
  let sawNeedsAuth = false;
  for (const result of results) {
    if (result.status === 'fulfilled') {
      events.push(...result.value);
    } else {
      failures += 1;
      if (result.reason instanceof NeedsAuthError) {
        sawNeedsAuth = true;
      }
    }
  }
  if (!events.length && failures > 0) {
    throw sawNeedsAuth && jobs.length === 1 ? new NeedsAuthError() : new Error('All calendar sources failed');
  }
  return { events: events.sort((a, b) => a.startMs - b.startMs), partial: failures > 0 };
};

const getCalendarEvents = async (config) => {
  if (calendarCache && Date.now() - calendarCache.fetchedAtMs < CALENDAR_TTL_MS) {
    return { ...calendarCache, servedStale: false };
  }
  if (!calendarFetchPromise) {
    calendarFetchPromise = fetchAllSources(config)
      .then((result) => {
        if (result.partial && calendarCache && Date.now() - calendarCache.fetchedAtMs < 2 * CALENDAR_TTL_MS) {
          // One source failed but a recent full snapshot exists — keep it.
          return { ...calendarCache, servedStale: true };
        }
        calendarCache = { events: result.events, fetchedAtMs: Date.now() };
        return { ...calendarCache, servedStale: result.partial };
      })
      .finally(() => {
        calendarFetchPromise = null;
      });
  }
  return calendarFetchPromise;
};

// ---- Geocoding and travel --------------------------------------------------

const persistGeocodeCache = () => {
  try {
    fs.writeFileSync(geocodeCachePath, JSON.stringify(Object.fromEntries(geocodeCache)), 'utf8');
  } catch (error) {
    // A lost cache write only costs a future re-geocode.
  }
};

const geocodeViaGoogle = async (config, address) => {
  const url =
    'https://maps.googleapis.com/maps/api/geocode/json?' +
    new URLSearchParams({ address, key: config.mapsApiKey }).toString();
  const response = await doFetch(url);
  const data = await response.json();
  const first = data.status === 'OK' ? data.results?.[0] : null;
  const coords = first?.geometry?.location;
  if (!coords || !Number.isFinite(coords.lat) || !Number.isFinite(coords.lng)) {
    throw new Error(`Geocode returned ${data.status || response.status}`);
  }
  return { lat: coords.lat, lng: coords.lng, label: cleanString(first.formatted_address) };
};

const geocodeViaNominatim = async (address) => {
  const response = await doFetch(buildNominatimUrl(address), {
    headers: { 'User-Agent': OSM_USER_AGENT, Accept: 'application/json' }
  });
  if (!response.ok) {
    throw new Error(`Nominatim returned HTTP ${response.status}`);
  }
  const data = await response.json();
  const first = Array.isArray(data) ? data[0] : null;
  const lat = Number(first?.lat);
  const lng = Number(first?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error('Nominatim found no match');
  }
  return { lat, lng, label: cleanString(first.display_name) };
};

const geocodeAddress = (config, address) =>
  config.mapsApiKey ? geocodeViaGoogle(config, address) : geocodeViaNominatim(address);

const geocode = async (config, location) => {
  const key = normalizeGeocodeKey(location);
  if (geocodeCache.has(key)) {
    return geocodeCache.get(key);
  }
  const failedAtMs = geocodeFailures.get(key);
  if (failedAtMs && Date.now() - failedAtMs < GEOCODE_FAILURE_TTL_MS) {
    return null;
  }
  try {
    const value = await geocodeAddress(config, location);
    geocodeCache.set(key, value);
    geocodeFailures.delete(key);
    persistGeocodeCache();
    return value;
  } catch (error) {
    geocodeFailures.set(key, Date.now());
    return null;
  }
};

const computeGoogleRoute = async (config, destination, departureTimeMs) => {
  const response = await doFetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': config.mapsApiKey,
      'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters'
    },
    body: JSON.stringify(
      buildRouteRequestBody({
        home: config.homeCoordinates,
        destination,
        travelMode: config.travelMode,
        departureTimeMs
      })
    )
  });
  if (!response.ok) {
    throw new Error(`Routes API failed (HTTP ${response.status})`);
  }
  const data = await response.json();
  const route = Array.isArray(data.routes) ? data.routes[0] : null;
  const durationSeconds = parseDurationSeconds(route?.duration);
  if (durationSeconds == null) {
    throw new Error('Routes API returned no usable route');
  }
  return { durationSeconds, distanceMeters: Number(route.distanceMeters) || 0 };
};

const computeOsmRoute = async (config, destination) => {
  const url = buildOsrmUrl(config.travelMode, config.homeCoordinates, destination);
  if (!url) {
    throw new Error('Transit routing needs a Google Maps API key');
  }
  const response = await doFetch(url, { headers: { 'User-Agent': OSM_USER_AGENT, Accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(`OSRM failed (HTTP ${response.status})`);
  }
  const data = await response.json();
  const route = data.code === 'Ok' && Array.isArray(data.routes) ? data.routes[0] : null;
  if (!route || !Number.isFinite(route.duration)) {
    throw new Error('OSRM returned no usable route');
  }
  return { durationSeconds: Math.round(route.duration), distanceMeters: Math.round(route.distance || 0) };
};

const resolveTravel = async (config, event, nowMs) => {
  const destination = await geocode(config, event.location);
  if (!destination) {
    return null;
  }
  let route;
  let trafficModel;
  if (!config.mapsApiKey) {
    // Keyless tier: static durations, no traffic model to steer.
    trafficModel = 'static';
    route = await computeOsmRoute(config, destination);
  } else if (isLiveDeparture(event.startMs, nowMs)) {
    // Omitted departureTime means "now" — live traffic.
    trafficModel = 'live';
    route = await computeGoogleRoute(config, destination, null);
  } else {
    // Estimated departure is chicken-and-egg: rough duration from a query at
    // the event start, then re-query at start minus that duration.
    trafficModel = 'predictive';
    const rough = await computeGoogleRoute(config, destination, event.startMs);
    const departureMs = Math.max(event.startMs - rough.durationSeconds * 1000, nowMs + 60 * 1000);
    route = await computeGoogleRoute(config, destination, departureMs);
  }
  return {
    travel: {
      durationMinutes: Math.round(route.durationSeconds / 60),
      distanceKm: Math.round(route.distanceMeters / 100) / 10,
      mode: config.travelMode,
      trafficModel
    },
    leaveByUtc: computeLeaveByUtc(event.startMs, route.durationSeconds, config.bufferMinutes)
  };
};

const getTravelFor = async (config, event, nowMs) => {
  const key = [event.id, event.startUtc, event.location, config.travelMode, config.bufferMinutes].join('|');
  if (travelCache && travelCache.key === key && nowMs - travelCache.computedAtMs < travelTtlMs(event.startMs, nowMs)) {
    return travelCache.value;
  }
  if (travelFailure && travelFailure.key === key && nowMs - travelFailure.atMs < TRAVEL_RETRY_MS) {
    return travelCache && travelCache.key === key ? travelCache.value : null;
  }
  try {
    const value = await resolveTravel(config, event, nowMs);
    if (value) {
      travelCache = { key, computedAtMs: Date.now(), value };
      travelFailure = null;
      return value;
    }
  } catch (error) {
    // Fall through to the stale-if-possible path below.
  }
  travelFailure = { key, atMs: Date.now() };
  // A failed refresh should not blank a leave-by we already computed.
  return travelCache && travelCache.key === key ? travelCache.value : null;
};

// ---- Response assembly -----------------------------------------------------

const emptyPayload = (status, detail) => ({
  status,
  detail: detail || undefined,
  active: null,
  today: [],
  week: [],
  stale: false,
  lastUpdatedUtc: null
});

const getCalendarPayload = async () => {
  const config = loadCalendarConfig();
  const hasIcs = config.icsUrls.length > 0;
  const hasGoogleCreds = Boolean(config.googleClientId && config.googleClientSecret);
  if (!hasIcs && !hasGoogleCreds) {
    return emptyPayload('not-configured', 'Open the widget settings and add a calendar link.');
  }
  // The connect screen appears only when Google is the sole source; with an
  // ICS link present the widget renders data and settings shows the hint.
  if (!hasIcs && !loadTokens()) {
    return { ...emptyPayload('needs-auth'), authPending: Boolean(activeAuthFlow) };
  }

  let events;
  let stale = false;
  try {
    const result = await getCalendarEvents(config);
    ({ events } = result);
    stale = result.servedStale;
  } catch (error) {
    if (error instanceof NeedsAuthError) {
      return { ...emptyPayload('needs-auth'), authPending: Boolean(activeAuthFlow) };
    }
    if (!calendarCache) {
      return emptyPayload('error', 'Calendar sources are unreachable.');
    }
    // Slightly old data beats a blank mirror.
    ({ events } = calendarCache);
    stale = true;
  }

  const now = new Date();
  const nowMs = now.getTime();
  const { event: active, isTomorrow } = selectActiveEvent(events, now, config.rolloverHour);

  let activePayload = null;
  if (active) {
    let travel = null;
    let leaveByUtc = null;
    let travelUnavailable = false;
    if (active.location) {
      // Keyless geocoding always exists (Nominatim); only home must be set.
      const resolved = config.homeCoordinates ? await getTravelFor(config, active, nowMs) : null;
      if (resolved) {
        ({ travel, leaveByUtc } = resolved);
      } else {
        travelUnavailable = true;
      }
    }
    activePayload = {
      title: active.title,
      startUtc: active.startUtc,
      isTomorrow,
      location: active.location || null,
      travel,
      leaveByUtc,
      travelUnavailable
    };
  }

  return {
    status: 'ok',
    active: activePayload,
    today: buildAgenda(events, now),
    week: buildWeek(events, now),
    stale,
    lastUpdatedUtc: calendarCache ? new Date(calendarCache.fetchedAtMs).toISOString() : null
  };
};

// Non-secret settings for the widget's settings pane. Credentials never cross
// the bridge — only whether they exist.
const getConfigPayload = () => {
  const config = loadCalendarConfig();
  return {
    icsUrls: config.icsUrls,
    homeAddress: config.homeAddress,
    homeConfigured: Boolean(config.homeCoordinates),
    travelMode: config.travelMode,
    bufferMinutes: config.bufferMinutes,
    rolloverHour: config.rolloverHour,
    hasGoogleCreds: Boolean(config.googleClientId && config.googleClientSecret),
    googleConnected: Boolean(loadTokens()),
    hasMapsKey: Boolean(config.mapsApiKey),
    travelProvider: config.mapsApiKey ? 'google' : 'osm'
  };
};

const saveConfigFromWidget = async (body) => {
  if (!isObject(body)) {
    return { status: 400, payload: { ok: false, error: 'Invalid settings payload.' } };
  }
  const config = loadCalendarConfig();
  const patch = {};
  if (Array.isArray(body.icsUrls)) {
    patch.icsUrls = body.icsUrls.map(normalizeIcsUrl).filter(Boolean).slice(0, MAX_ICS_URLS);
  }
  if (typeof body.travelMode === 'string' && TRAVEL_MODES[body.travelMode]) {
    patch.travelMode = body.travelMode;
  }
  let home = null;
  const homeAddress = cleanString(body.homeAddress).slice(0, 200);
  if (homeAddress && homeAddress !== config.homeAddress) {
    try {
      home = await geocodeAddress(config, homeAddress);
    } catch (error) {
      home = null;
    }
    if (!home) {
      return {
        status: 422,
        payload: { ok: false, error: 'Could not find that address — try adding the city or country.' }
      };
    }
    patch.homeAddress = homeAddress;
    patch.homeCoordinates = { lat: home.lat, lng: home.lng };
  }
  if (!Object.keys(patch).length) {
    return { status: 200, payload: { ok: true } };
  }
  updateCalendarConfigFile(patch);
  if ('icsUrls' in patch) {
    calendarCache = null;
  }
  if ('homeCoordinates' in patch || 'travelMode' in patch) {
    travelCache = null;
    travelFailure = null;
  }
  return { status: 200, payload: { ok: true, home: home ? { label: home.label } : undefined } };
};

// ---- HTTP-ish router for chappy-widget://api/* -----------------------------

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store'
};

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS_HEADERS }
  });

const handleApiRequest = async (request) => {
  try {
    const url = new URL(request.url);
    const route = url.pathname.replace(/\/+$/, '') || '/';
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
    if (request.method === 'GET' && (route === '/calendar' || route === '/next-event')) {
      return jsonResponse(await getCalendarPayload());
    }
    if (request.method === 'GET' && route === '/config') {
      return jsonResponse(getConfigPayload());
    }
    if (request.method === 'POST' && route === '/config') {
      const body = await request.json().catch(() => null);
      const result = await saveConfigFromWidget(body);
      return jsonResponse(result.payload, result.status);
    }
    if (request.method === 'POST' && route === '/auth/start') {
      const config = loadCalendarConfig();
      if (!config.googleClientId || !config.googleClientSecret) {
        return jsonResponse({ ok: false, error: `Add Google credentials to ${configPath}` }, 409);
      }
      return jsonResponse(await startAuthFlow(config));
    }
    if (request.method === 'POST' && route === '/auth/disconnect') {
      closeAuthFlow();
      persistTokens(null);
      calendarCache = null;
      travelCache = null;
      travelFailure = null;
      return jsonResponse({ ok: true });
    }
    return jsonResponse({ error: 'Unknown calendar API route.' }, 404);
  } catch (error) {
    return jsonResponse({ error: 'Calendar service error.' }, 500);
  }
};

module.exports = {
  WIDGET_API_HOST,
  init,
  handleApiRequest,
  _test: {
    sanitizeCalendarConfig,
    normalizeIcsUrl,
    isVideoCallLocation,
    normalizeGoogleEvent,
    expandIcsEvents,
    localDayKey,
    selectActiveEvent,
    buildAgenda,
    buildWeek,
    computeLeaveByUtc,
    isLiveDeparture,
    travelTtlMs,
    parseDurationSeconds,
    buildRouteRequestBody,
    buildOsrmUrl,
    buildNominatimUrl,
    normalizeGeocodeKey
  }
};
