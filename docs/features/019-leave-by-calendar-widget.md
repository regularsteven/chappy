# Leave By calendar widget with Google Calendar backend

- **ID:** 019
- **Type:** feature
- **Severity:** major
- **Version bump:** minor
- **Branches:** feature/leave-by-calendar-widget
- **Merged:** 2026-08-28

## Summary

A **Leave By** widget package for the mirror: the single most relevant upcoming
Google Calendar event and when to leave home to arrive on time, backed by a new
main-process calendar service reachable through a reserved `chappy-widget://api`
bridge host.

## Details

**Backend** (`main/calendar-service.js`): widgets are sandboxed web content, so
everything that touches Google lives in the main process — OAuth tokens, event
selection, travel lookups. The widget protocol gains a reserved virtual host:
`chappy-widget://api/*` routes to the service instead of a widget folder
(`api` joins `clock` in `RESERVED_WIDGET_IDS`). Endpoints: `GET /next-event`,
`POST /auth/start`, `POST /auth/disconnect`, all JSON with CORS open to widget
origins.

- **Auth story**: loopback OAuth with PKCE against a user-supplied Desktop-app
  client (scope `calendar.readonly`); consent opens in the system browser and
  redirects to an ephemeral 127.0.0.1 listener. Tokens persist in
  `~/.chappy/calendar-tokens.json`, encrypted via `safeStorage` when the OS
  supports it. `invalid_grant` clears tokens and returns the widget to its
  connect screen; a transient 403/5xx serves stale data instead.
- **Selection** (per the spec): next future event today until the configurable
  rollover hour (default 17:00) *or* until today is exhausted, then tomorrow's
  first event only. Buckets are local dates but candidacy is absolute time, so
  an overnight 00:30 event is selectable tonight. All-day and self-declined
  events are excluded; in-progress events are never active. Video-call
  "locations" (Meet/Zoom/Teams or any URL) count as no location.
- **Travel**: Geocoding API with a persistent cache
  (`~/.chappy/calendar-geocode.json`) plus Routes API. Events within 2 h use
  live traffic (departure = now); further events use the predictive model with
  the spec's two-pass estimated departure (query at event start for a rough
  duration, re-query at start − rough). `leaveBy = start − travel − buffer`.
  Travel failures flag `travelUnavailable` and never block the event itself.
- **Cadence**: lazy TTL refresh driven by widget polls — calendar 15 min,
  travel 30 min (>2 h) / 10 min (<2 h), nothing while the mirror is off. API
  failures serve the last good payload with a staleness timestamp.
- **Config**: `~/.chappy/calendar.json` (template written on first run):
  Google credentials, Maps key, home coordinates, rollover hour, buffer
  minutes, travel mode, calendar ids. Metric only. Documented in
  `docs/CALENDAR-SETUP.md`. Edits are picked up by mtime without a restart.

**Widget** (`widgets/leave-by/`, installable ZIP via `npm run pack:widget
leave-by`): polls `/next-event` every 60 s, ticks the countdown locally every
second. Four display states — distant ("Leave by 06:58"), approaching under
60 min ("Leave in 43 min", amber), leave-now within 5 min or past (red pulse,
readable across a room), and event-only when travel data is unavailable.
Tomorrow's event carries a "Tomorrow" chip; the rest of today renders as a
compact agenda line (all-day events included). Connect/not-configured/error
states are self-explanatory panes; a stale "updated HH:MM" marker appears when
serving cached data. Layout scales with the frame like the Weather widget.

**Tests**: `scripts/check-calendar.mjs` (wired into `npm test`) covers
selection edges (rollover, exhaustion, overnight, in-progress, all-day,
declined), leave-by arithmetic, Routes request shaping per mode, duration
parsing, and config sanitization — timezone-independent by construction. The
Electron smoke test (`npm run test:widget-runtime`) now also asserts the
bridge answers with CORS on the widget partition and that a package claiming
the `api` id is refused. New `calendar` taxonomy chip in the Widgets tab.
