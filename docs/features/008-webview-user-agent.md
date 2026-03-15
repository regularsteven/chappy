# Normalize Webview User Agent From Electron

- **ID:** 008
- **Type:** bugfix
- **Severity:** minor
- **Version bump:** patch
- **Branches:** feature/truthful-user-agent
- **Merged:** 2026-03-15

## Summary

Keep webviews close to Electron's real browser version while stripping app-specific UA tokens that break compatibility checks.

## Details

Chappy had drifted into two bad states: a stale hardcoded Chrome spoof in the renderer, and then a fully native Electron UA that exposed `Chappy/...` and `Electron/...` tokens to sites that only whitelist mainstream browser signatures. The app now derives one compatibility UA from Electron's real runtime UA, removes the Chappy and Electron tokens, preserves the actual Chrome/WebKit platform details, and reuses that same UA for both webviews and icon-fetch requests.
