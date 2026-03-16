# Disable Notarization In CI For Now

- **ID:** 012
- **Type:** bugfix
- **Severity:** minor
- **Version bump:** patch
- **Branches:** feature/disable-notarization-for-now
- **Merged:** 2026-03-16

## Summary

Temporarily disable notarization in the build and release workflows so packaging can proceed without the current notarization blocker.

## Details

The macOS release flow was blocked by notarization failures that are lower priority than the current browser/runtime work. Chappy now skips the Electron `afterSign` notarization hook entirely and removes the workflow-level notarization, stapling, and notarization-only verification steps until that release path is revisited.
