# Calendar widget setup

The **Calendar** widget (`widgets/calendar/`) shows your agenda — today, the
week, or the single next event — and, when an event has a real-world location,
when to leave home to arrive on time.

## The normal path: two minutes, no accounts

Everything happens in the widget's own settings (hover the widget, hit ⚙):

1. **Paste your calendar's secret link.**
   - **Google Calendar**: Settings → *Settings for my calendars* → your
     calendar → *Integrate calendar* → **Secret address in iCal format**.
   - **Outlook**: Settings → Calendar → *Shared calendars* → publish, copy the
     ICS link.
   - **Apple iCloud**: calendar list → share icon → *Public Calendar*, copy the
     link (`webcal://…` links work as-is).
   Up to five links can be added, one row each. Chappy checks every link as you
   save it and says what it found — the calendar's name and how many events are
   in the next week, or what went wrong and how to fix it. Each saved calendar
   keeps an edit button, so a mistyped or expired link can be opened and
   corrected later.

   **A link that opens your calendar in a browser will not work.** The one
   Google's *Get shareable link* button copies (`calendar.google.com/calendar/u/1?cid=…`)
   is that kind of link — it asks whoever opens it to sign in, which Chappy
   cannot do. The address you want ends in `/basic.ics`.
2. **Type your home address** — where travel starts. It is resolved once and
   the coordinates are stored locally.
3. **Pick a travel mode** — 🚗 🚈 🚶 🚴.

That's it. No Google account connection, no API keys, no billing. Geocoding
and routing use the free OpenStreetMap services (Nominatim and OSRM), which
need no credentials. Distances are metric.

What the keyless tier can't do: **live traffic** (leave-by is based on typical
route duration plus your buffer, not current congestion) and **transit**
estimates. Both come with the power tier below.

Treat the secret calendar link like a password — anyone who has it can read
your calendar. It lives in `~/.chappy/calendar.json` on the mirror machine and
is only ever sent to the calendar provider that issued it. In Google's
settings, *Reset* the secret address at any time to revoke it.

## The power tier (optional): your own Google credentials

For traffic-aware leave-by times, transit routing, faster event sync, and
declined-event filtering, add your own Google Cloud credentials to
`~/.chappy/calendar.json`. This is developer-grade setup — the widget works
fine without it.

<details>
<summary>Google Cloud setup (~10 minutes)</summary>

1. Create a project at <https://console.cloud.google.com/>, then under
   **APIs & Services → Library** enable the APIs you want:
   - **Google Calendar API** — API event sync (free)
   - **Geocoding API** + **Routes API** — traffic-aware travel (billed per
     request, but this widget's cadence sits well inside the monthly free
     credit; a billing account must be attached)
2. For calendar sync: **OAuth consent screen** (External is fine, add yourself
   as a test user — note Google expires test-mode refresh tokens after 7 days
   unless you publish the app), then **Credentials → OAuth client ID →
   Desktop app**. Copy the client ID and secret.
3. For travel: **Credentials → API key**, restricted to Geocoding + Routes.
4. Fill in `~/.chappy/calendar.json`:

```json
{
  "instances": {
    "widget-a1b2c3": {
      "icsUrls": ["https://calendar.google.com/calendar/ical/…/basic.ics"],
      "homeAddress": "Vinohradská 123, Praha 2",
      "homeCoordinates": { "lat": 50.0755, "lng": 14.4378 },
      "travelMode": "driving"
    }
  },
  "googleClientId": "1234-abc.apps.googleusercontent.com",
  "googleClientSecret": "GOCSPX-…",
  "mapsApiKey": "AIza…",
  "rolloverHour": 17,
  "bufferMinutes": 10,
  "calendarIds": ["primary"],
  "units": "metric"
}
```

Calendars, home address, and travel mode live under `instances`, keyed by the
placed widget that set them — the settings pane writes that block, and it is
removed when the widget is removed from the mirror. The keys outside
`instances` are global and hand-edited only. Upgrading from an older Chappy
needs nothing: settings found at the top level are adopted by the first
Calendar widget that asks for them.

With client credentials present, the widget settings show a **Connect**
button; approving the consent page in your browser finishes the link. Access
is read-only (`calendar.readonly`); tokens are stored in
`~/.chappy/calendar-tokens.json`, encrypted with the OS keychain when
available. ICS links and the Google API can run side by side (use different
calendars in each, or events appear twice).

</details>

## Behavior reference

| Setting | Meaning | Default |
|---|---|---|
| `rolloverHour` | After this local hour — or once today's events are done — the widget looks at tomorrow's first event. | 17 |
| `bufferMinutes` | Added on top of travel time: walking to the car, parking. | 10 |
| `calendarIds` | Google-API-mode calendars (`"primary"` or full calendar addresses). | `["primary"]` |

`rolloverHour` and `bufferMinutes` are hand-edited in the JSON; everything
else is in the widget settings. Edits apply on the next poll (≤ 60 s).

| Refresh | Cadence |
|---|---|
| Calendar events | every 15 min |
| Travel (Google tier), event > 2 h away | every 30 min, predictive traffic |
| Travel (Google tier), event < 2 h away | every 10 min, live traffic |
| Travel (keyless tier) | every 10–30 min, static durations |
| Countdown | every second, in the widget, no network |

Refreshes are lazy — a mirror that is off costs zero API calls. Geocoded
addresses cache in `~/.chappy/calendar-geocode.json` indefinitely. When a
source is unreachable the widget keeps the last good data with a small
"updated HH:MM" marker instead of blanking.
