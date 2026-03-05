# Simplify Windows Experience for Non-Technical Users

- **ID:** 002
- **Type:** feature
- **Severity:** medium
- **Version bump:** minor
- **Branches:** feature/windows-simple
- **Merged:** 2026-03-04

## Summary

Pre-built Windows exe in Releases; build.bat checks for Node.js and gives clear instructions if missing.

## Details

- Added Windows build job to release workflow (pre-built exe in GitHub Releases)
- Rewrote BUILD-WINDOWS.md: pre-built download first (no Node required), build-from-source second
- Added `build.bat` that checks for Node.js and prints installation instructions if missing
