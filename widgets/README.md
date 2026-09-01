# Chappy Widget Packages

Widgets are self-contained HTML packages that render on the Mirror canvas inside
sandboxed `<webview>` elements. They are installed at runtime — dropping a ZIP on
**Chappy → Widgets → Quick Add** is enough; no rebuild of the Chappy app is needed.

## Package layout

A widget package is a ZIP archive containing, at its root (or inside a single
top-level folder — both layouts are accepted):

```text
weather.zip
├── widget.json        # manifest (required)
├── index.html         # entry point (required, name set by manifest "entry")
├── icon.svg           # optional icon (svg or png)
└── ...                # any other assets (css, js, images), referenced relatively
```

Installed packages are extracted to `~/.chappy/widgets/<id>/` and served to the
renderer via the `chappy-widget://<id>/<path>` protocol. Each widget id is its own
origin, so `localStorage` and friends are isolated per widget, and relative asset
paths inside the entry HTML resolve normally.

## widget.json manifest

```json
{
  "id": "weather",
  "name": "Weather",
  "version": "0.1.0",
  "description": "Current conditions and a 3 day forecast for a chosen city.",
  "entry": "index.html",
  "icon": "icon.svg",
  "author": "Chappy",
  "tags": ["weather"],
  "defaultSize": { "width": 360, "height": 320 },
  "minSize": { "width": 280, "height": 240 },
  "multiInstance": true
}
```

| Field | Required | Notes |
|---|---|---|
| `id` | yes | Stable slug, `[a-z0-9-]`, max 64 chars. Installing a ZIP with an existing id replaces that widget in place (instances survive, so this is the update path). Built-in widget ids (`clock`) are reserved. |
| `name` | yes | Display name shown in catalogs. |
| `entry` | yes | Relative path to the HTML entry point. Must exist in the package. |
| `version` | no | Free-form string, shown in the catalog. |
| `description` | no | One or two sentences for the catalog card. |
| `icon` | no | Relative path to an `.svg` or `.png` inside the package. Falls back to the generic widget icon. |
| `author` | no | Free-form string. |
| `tags` | no | Lowercase slugs used by the Widgets tab filter bar (e.g. `time`, `weather`, `info`). Unknown tags still work — they get a neutral filter chip. |
| `defaultSize` | no | Initial `{ width, height }` in px when an instance is added (default 360×280). |
| `minSize` | no | Resize floor in px (default 220×140). |
| `multiInstance` | no | Default `true`. Set `false` to limit the widget to one placed instance. |

## Runtime contract

The entry page is loaded as:

```text
chappy-widget://<id>/<entry>?instance=<instanceId>&theme=mirror
```

- `instance` — unique id of this placed instance. Use it to namespace per-instance
  state (e.g. `localStorage.setItem('mywidget:' + instanceId, ...)`), which is how
  one widget type supports several instances with different settings.
- `theme` — always `mirror` today. Style for a pure-black canvas: black or
  transparent-dark background, muted slate text, light up as few pixels as possible.
- Network access works normally (`fetch` to HTTPS APIs that allow CORS). The
  reference Weather widget uses the keyless Open-Meteo APIs.
- The page has no Node or Chappy APIs — it is plain sandboxed web content. The
  one bridge that exists is the reserved `api` host described below.

## The `chappy-widget://api` bridge

`api` is a reserved host on the widget protocol (a package may not claim it as
an id). Requests to it are answered by the main process instead of a widget
folder, which is how a widget can use things that must not live in sandboxed
web content — calendar credentials and shared configuration. All responses are
JSON with `Access-Control-Allow-Origin: *`, so any widget origin can call them.

Every endpoint takes `?instance=<instanceId>` — pass through the `instance`
query parameter the widget page was loaded with. Calendar links, home address,
and travel mode are stored per placed widget instance, so two Calendar widgets
configure separately, removing one clears its settings, and a newly added one
starts empty.

| Endpoint | Method | Purpose |
|---|---|---|
| `chappy-widget://api/calendar` | GET | Active event + leave-by time, today's agenda, and the week ahead (see `main/calendar-service.js` for the shape). `status` is `ok`, `not-configured`, `needs-auth`, or `error`; `sources` carries a per-link verdict. `/next-event` is an alias. |
| `chappy-widget://api/config` | GET | Non-secret calendar settings for the widget settings pane (sources, home, travel mode; credentials never cross the bridge). `perInstance: true` marks a backend that supports instance scoping. |
| `chappy-widget://api/config` | POST | Save `{ icsUrls, homeAddress, travelMode }` from the pane; the home address is geocoded server-side, and the reply reports what each saved link turned out to be. |
| `chappy-widget://api/config/check` | POST | Fetch and judge `{ icsUrls }` without saving — used by the pane's "check this link" button. |
| `chappy-widget://api/config/reset` | POST | Forget this instance's settings and caches. |
| `chappy-widget://api/auth/start` | POST | Opens Google's consent page in the system browser (loopback OAuth, power tier only). |
| `chappy-widget://api/auth/disconnect` | POST | Forgets the stored Google tokens. |

A source verdict is `{ url, ok, eventCount, calendarName, error, detail,
remedy, candidateUrl? }`. `error` is the sentence to show a person, `remedy`
the steps that fix it, and `candidateUrl` a working replacement when one could
be derived (a Google app link whose calendar turns out to be public).

The reference **Calendar** widget (`widgets/calendar/`) is the consumer;
`docs/CALENDAR-SETUP.md` covers setup (the default tier needs nothing but a
pasted ICS link). Note the bridge is readable — and its settings writable — by
*every* installed widget: same trust model as the rest of the current security
posture below.

Chrome (drag handle, resize handle, remove button) is drawn by Chappy around the
webview; the widget only renders its content. Size changes arrive as normal
window resizes — use responsive CSS rather than fixed layouts.

## Building a package

`widgets/` in this repo holds widget sources, one folder per widget. To produce an
installable ZIP from a source folder:

```bash
npm run pack:widget weather
```

This writes `widgets/dist/weather-<version>.zip` (the folder name is the argument).
Drag that file onto **Chappy → Widgets → Quick Add** to install or update it.

## Security posture (deliberate, for now)

This is a UX/architecture prototype: manifests are validated and file serving is
path-contained (symlinks are resolved and refused when they point outside the
widget folder), but widget HTML is not CSP-restricted, not signed, and can reach
the network. Do not install packages from untrusted sources. Hardening (CSP
injection, permission prompts, an audited bridge API instead of raw web content)
is future work and intentionally out of scope.
