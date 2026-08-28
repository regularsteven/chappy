# Google Calendar setup for the Leave By widget

The **Leave By** widget (`widgets/leave-by/`) shows your next calendar event and
when to leave home to arrive on time. Its backend runs inside Chappy's main
process and needs Google credentials that only you can create. One-time setup,
about ten minutes.

## 1. Create a Google Cloud project

1. Open <https://console.cloud.google.com/> and create a project (e.g. `chappy-mirror`).
2. Under **APIs & Services → Library**, enable three APIs:
   - **Google Calendar API** (events)
   - **Geocoding API** (event address → coordinates)
   - **Routes API** (travel time with traffic)

The Calendar API is free. Geocoding and Routes are billed per request but fall
well inside Google's monthly free credit at this widget's refresh cadence
(roughly 100–150 route calls/day with the mirror on all day) — a billing
account must still be attached to the project for them to work.

## 2. Create the OAuth client (calendar access)

1. **APIs & Services → OAuth consent screen**: configure it, **External** is
   fine; add your own Google account as a **test user**. The app can stay in
   *Testing* — only you use it. (In Testing mode Google expires refresh tokens
   after 7 days; publish the app to make the connection permanent.)
2. **APIs & Services → Credentials → Create credentials → OAuth client ID**,
   application type **Desktop app**.
3. Note the **client ID** and **client secret**. For Desktop-type clients the
   secret is not treated as confidential by Google — Chappy still keeps it out
   of the renderer and widgets; it lives only in the config file below.

## 3. Create the API key (geocoding + routes)

**Credentials → Create credentials → API key.** Restrict it to the
**Geocoding API** and **Routes API**.

## 4. Fill in the config file

Chappy writes a template to `~/.chappy/calendar.json` on first launch after
this feature is installed. Edit it:

```json
{
  "googleClientId": "1234-abc.apps.googleusercontent.com",
  "googleClientSecret": "GOCSPX-...",
  "mapsApiKey": "AIza...",
  "homeCoordinates": { "lat": 50.0755, "lng": 14.4378 },
  "rolloverHour": 17,
  "bufferMinutes": 10,
  "travelMode": "driving",
  "calendarIds": ["primary"],
  "units": "metric"
}
```

| Key | Meaning |
|---|---|
| `homeCoordinates` | Where travel starts. Static config, never geocoded. |
| `rolloverHour` | After this local hour (or once today's events are done), the widget shows tomorrow's first event. |
| `bufferMinutes` | Added on top of travel time — walking to the car, parking. |
| `travelMode` | `driving`, `transit`, `walking`, or `bicycling`. |
| `calendarIds` | `"primary"` and/or full calendar addresses like `"family@group.calendar.google.com"`. |

Edits apply on the widget's next poll (≤ 60 s) — no restart needed.

## 5. Connect

Add the **Leave By** widget to the mirror canvas (install
`widgets/dist/leave-by-<version>.zip` via **Chappy → Widgets → Quick Add** if it
isn't in the catalog yet). It will show **Connect Google Calendar** — the
button opens Google's consent page in your system browser; approve it and the
widget starts rendering within a few seconds.

Access is read-only (`calendar.readonly`). Tokens are stored in
`~/.chappy/calendar-tokens.json`, encrypted with the OS keychain
(Electron `safeStorage`) when available. To disconnect, revoke access at
<https://myaccount.google.com/permissions> — the widget will fall back to the
connect screen on its next refresh (or delete the tokens file).

## How it refreshes

| Thing | Cadence |
|---|---|
| Calendar events | every 15 min |
| Travel time, event more than 2 h away | every 30 min, predictive traffic |
| Travel time, event within 2 h | every 10 min, live traffic |
| Countdown | every second, in the widget, no network |

Refreshes are lazy — they only happen while a widget is polling, so a mirror
that is off costs zero API calls. Geocoded addresses are cached in
`~/.chappy/calendar-geocode.json` indefinitely. When Google is unreachable the
widget keeps showing the last good data with a small "updated HH:MM" marker
instead of blanking.
