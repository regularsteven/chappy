# App Badge Aggregation and macOS Close-to-Quit

- **ID:** 006
- **Type:** feature
- **Severity:** minor
- **Version bump:** minor
- **Branches:** feature/dock-badge-and-quit-on-close
- **Merged:** 2026-03-06

## Summary

Expose service unread totals at the app level via OS badge indicators and make macOS close behavior quit the app to avoid background orphaning.

## Details

- Added main-process badge handling via `chappy:set-badge-count` IPC
- Aggregated unread state across service tabs in the renderer and synced updates to the main process
- Added count display capping (`9+`) for app-level badges
- Updated close lifecycle so `window-all-closed` always quits, including on macOS
- Added Windows overlay icon badge rendering for unread totals
