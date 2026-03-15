# Upgrade Electron To 40 For Newer Chromium

- **ID:** 009
- **Type:** bugfix
- **Severity:** medium
- **Version bump:** patch
- **Branches:** feature/truthful-user-agent
- **Merged:** 2026-03-15

## Summary

Upgrade Chappy from Electron 26 to Electron 40.

## Details

Chappy was running on Electron 26, which embeds Chromium 116. That is old enough to miss newer native CSS behavior used by target sites, so the app now targets Electron 40 to pick up Chromium 144 and reduce rendering mismatches versus current Chrome.
