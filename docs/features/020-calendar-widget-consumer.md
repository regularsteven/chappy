# Calendar widget: consumer-grade setup, views, Leave By as a feature

- **ID:** 020
- **Type:** feature
- **Severity:** major
- **Version bump:** minor
- **Branches:** feature/calendar-widget-consumer
- **Merged:** 2026-08-28

## Summary

Reworks the day-old Leave By widget (019) around two pieces of product
feedback: setup must be consumer-grade (no Google Cloud console, no API keys,
no JSON editing), and the widget is really a **Calendar** with views — Leave By
is a feature that appears when it means something, not the identity.

## Details

**Zero-setup source tier — ICS secret links.** Google, Apple, and Outlook all
publish a private ICS URL; pasting it into the widget's new settings pane is
the whole setup. The backend fetches and parses feeds with `node-ical` (new
production dependency), expanding recurrences within a today→+8-day window,
honoring EXDATEs, RECURRENCE-ID overrides (deduped — node-ical maps each
override under two keys pointing at one object), CANCELLED status, TZID
conversion, and `webcal://` normalization. The Google Calendar API path from
019 remains as the power tier (faster sync, declined filtering); both source
kinds can run side by side, and partial-failure refreshes prefer a recent full
snapshot over a fresh partial one.

**Zero-setup travel tier — OpenStreetMap.** Without a Google Maps key,
geocoding uses Nominatim and routing uses the public FOSSGIS OSRM instance
(driving / walking / bicycling; `trafficModel: "static"`), with a proper
identifying User-Agent. No key, no billing — the tradeoff is no live traffic
and no transit. A `mapsApiKey` upgrades to the 019 behavior (traffic-aware
live/predictive two-pass Routes API + transit). Home is now typed as an
address in the widget and geocoded server-side, not hand-written coordinates.

**Widget reshape — `widgets/calendar/` replaces `widgets/leave-by/`.** Named
for the job, so its empty state still makes sense. Three per-instance views
(persisted via localStorage, so `multiInstance` is now true — one Today and
one Week widget can coexist): **Today** (agenda rows), **Week** (day-grouped
next 7 days, empty days omitted), **Up next** (the 019 hero layout). The
leave-by countdown renders as an escalating band inside Today/Week and as the
hero line in Up next, with the same distant / approaching / leave-now states,
and simply doesn't exist when no qualifying event does. Settings pane covers
calendar links, home address, travel mode (transit hints at the key
requirement), view choice, and — only when credentials exist — Google connect
status.

**Bridge changes** (`chappy-widget://api`): `GET /calendar` (payload gains
`week`; `today` replaces `agenda`; `/next-event` kept as an alias), `GET
/config` (non-secret settings; credentials never cross the bridge), `POST
/config` (widget-managed subset merged into `~/.chappy/calendar.json`,
preserving hand-edited fields; geocodes the home address before saving).

**Tests.** `scripts/check-calendar.mjs` now exercises the real node-ical
parser with fixture feeds (TZID→UTC instants, all-day local-midnight, EXDATE
removal, override replacement, cancelled drop, video-call location scrub),
plus `buildWeek` grouping, OSRM profile/URL shaping (lng,lat order, no transit
profile), Nominatim URL shaping, and ICS URL normalization. The Electron smoke
test covers the `/calendar` endpoint, the `/next-event` alias, and a settings
save/read round-trip over the widget partition.

Docs: `docs/CALENDAR-SETUP.md` rewritten consumer-first (secret-link warning
included); bridge table updated in `widgets/README.md`.
