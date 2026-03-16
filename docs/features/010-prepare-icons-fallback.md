# Fall Back To Existing ICNS When iconutil Rejects Regenerated Iconset

- **ID:** 010
- **Type:** bugfix
- **Severity:** minor
- **Version bump:** patch
- **Branches:** feature/truthful-user-agent
- **Merged:** 2026-03-15

## Summary

Keep macOS builds moving when `iconutil` rejects a regenerated iconset but a valid `.icns` already exists.

## Details

The icon preparation script can regenerate the PNG asset successfully while `iconutil` still rejects the temporary iconset on some local setups. When that happens and a non-empty `resources/chappy-logo.icns` already exists, Chappy now logs a warning and keeps the existing `.icns` instead of failing the build outright.
