# Active Tab Launch Reset

- **ID:** 013
- **Type:** feature
- **Severity:** minor
- **Version bump:** patch
- **Branches:** feature/tab-reclick-launch-reset
- **Merged:** 2026-03-24

## Summary

Clicking an already-open service tab now reloads the URL resolved by that tab's current launch mode.

## Details

Chappy already knows how to resolve a tab's launch URL for Default, Custom, and Preserve modes. This change reuses that logic when the user clicks the currently active service tab, so the tab is forced back to its configured launch target instead of doing nothing.

The renderer also now logs webview navigation lifecycle events to help debug redirect chains and failed loads without changing session or authentication behavior.
