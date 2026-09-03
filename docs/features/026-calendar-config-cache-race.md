# Calendar config cache keyed on content, not mtime

- **ID:** 026
- **Type:** bugfix
- **Severity:** minor
- **Version bump:** patch
- **Branches:** feature/calendar-config-cache-race
- **Merged:** TBD

## Summary

The calendar service cached `calendar.json` by modification time, so two writes inside the same
timestamp tick returned the stale copy. Seen as a flaky `check-calendar-instances` failure on
Windows CI during the v0.2.0 release. The cache is now keyed on the file's text.

## Details

**The failure.** `loadCalendarConfig` compared `statSync().mtimeMs` to the cached value and
skipped the read on a match. In `scripts/check-calendar-instances.mjs` the "Start over" reset
writes the file and the next step immediately rewrites it with a pre-0.2 layout; on the
Windows runner both landed on the same mtime, the service served the reset config, and the
legacy-adoption assertion failed. The same commit had passed release-test minutes earlier,
which is what flagged it as a race rather than a regression. In production the same window
exists whenever a widget saves and a second widget polls within the same tick.

**The fix.** The cache now stores the raw file text and re-parses only when the text differs.
`calendar.json` is a few hundred bytes, so one read per request costs nothing measurable, and
the result can never be stale.

**Release handling.** The v0.2.0 release workflow was re-run for the failed Windows job only;
the tagged commit had already passed release-test and no code changed.
