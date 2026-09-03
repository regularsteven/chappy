# Calendar widget: editable calendar links, validation, and per-widget settings

- **ID:** 022
- **Type:** bugfix
- **Severity:** major
- **Version bump:** minor
- **Branches:** feature/calendar-widget-editable-sources
- **Merged:** 2026-09-01

## Summary

Pasting a link the Calendar widget could not read left the user with no way
out: the error screen had no route back to settings, removing the widget did
not clear what had been saved, and re-adding it inherited the same broken
configuration. Calendar links are now inspectable and editable one by one,
they are checked when saved, and their settings belong to the placed widget
that set them.

## Details

**The dead end (the actual bug).** The gear lived only in the main pane's
top row, hidden until hover. Any status screen — `error`, `needs-auth`, or the
"no calendar yet" fallback — was therefore terminal: nothing on it opened
settings. Reaching that screen needed only a link that fails to fetch, which
is exactly what Google Calendar's "Get shareable link" button produces
(`calendar.google.com/calendar/u/N?cid=…` answers `HTTP 401` to `net.fetch`).
Every status now carries an always-visible **Open settings** button.

**Per-link management replaces the URL textarea.** The settings pane lists one
row per calendar with its name (from `X-WR-CALNAME`), its link, and its live
state: event count when healthy, the failure and how to fix it when not. Each
row has edit and remove buttons; editing opens the saved URL in a field so a
typo is visible and correctable, which the textarea never allowed once the
pane had been dismissed.

**Links are checked, and failures are named.** `fetchIcsSource()` reports per
link instead of throwing for the batch — HTTP status, "answered with a web
page, not a calendar feed", unparseable iCalendar, or timeout. `diagnoseIcsUrl()`
recognises the app links people actually paste (Google `cid`/`src`, Outlook
web, iCloud web) and names the mistake with the steps to the real feed; the
widget runs a copy of the same check as you type, so a bad paste is flagged
before it is saved. For a Google `cid` link the calendar id is decoded and its
public feed probed — offered as a one-click fix when it works, silently
dropped when the calendar is private. `POST /config` returns these verdicts,
`POST /config/check` runs them without saving, and `GET /calendar` carries them
into the error screen so it says which link is broken.

**Settings belong to the widget instance that set them.** `icsUrls`,
`homeAddress`, `homeCoordinates`, and `travelMode` moved from the top level of
`~/.chappy/calendar.json` into `instances[<widget instance id>]`; event and
travel caches are keyed the same way, so one broken feed can no longer blank a
second Calendar widget. Every bridge endpoint takes `?instance=`. Removing a
Calendar from the mirror clears its block — `chappy:save-config` calls
`calendarService.pruneInstances()` with the surviving widget ids on every
layout save, which also cleans up widgets removed in an earlier session — and
a newly added Calendar therefore starts empty. `POST /config/reset` (the pane's
**Start over**) does the same on demand. Credentials and the hand-edited tuning
fields stay global. Upgrading is lossless: the first instance to ask adopts the
pre-0.2 top-level settings and writes them into its own block.

**Compatibility.** The widget degrades on an older Chappy build — it falls
back to its local shape check when `/config/check` is absent, and to emptying
the settings when `/config/reset` is, and says plainly that such a build shares
settings between Calendar widgets.

## Verification

- `npm test` — adds `scripts/check-calendar-instances.mjs` (instance isolation,
  removal, reset, pre-0.2 migration, and the Google-link verdict) plus unit
  coverage for `diagnoseIcsUrl`, `sanitizeInstanceSettings`, `sanitizeInstanceId`,
  `httpFailureText`, and `icsCalendarName`.
- Driven under Electron against the real bridge with the reported link: save
  returns the named failure and remedy, `/calendar` reports `status: error`
  with the same diagnosis, a second instance reports `not-configured`, and
  `pruneInstances([])` empties the block.
- Widget panes exercised in a browser against a stubbed bridge: error screen →
  Open settings → edit a saved link → check → save → remove → Start over.
