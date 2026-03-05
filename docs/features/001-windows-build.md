# Windows 10/11 Build Support

- **ID:** 001
- **Type:** feature
- **Severity:** medium
- **Version bump:** minor
- **Branches:** feature/windows-build
- **Merged:** 2026-03-04

## Summary

Add build support for Windows 10/11 so users can produce runnable Chappy apps on Windows.

## Details

- Added `build:windows` script (nsis + portable targets)
- Committed `chappy-logo.png` for Windows icon (no generation on Windows)
- Updated `print-release-paths.js` for `.exe` and `win-unpacked` artifacts
- Added `BUILD-WINDOWS.md` with copy-paste steps for non-technical users
