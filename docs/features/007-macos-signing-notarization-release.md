# macOS Signing + Notarization Release Flow

- **ID:** 007
- **Type:** feature
- **Severity:** major
- **Version bump:** minor
- **Branches:** codex/feature/macos-signing-notarization-release
- **Merged:** 2026-03-06

## Summary

Add Developer ID signing, notarization, stapling, and verification to macOS release workflows.

## Details

Updated Electron Builder mac configuration for hardened runtime + entitlements and added an `afterSign` notarization hook. Updated `release-test` and `release` GitHub workflows to require signing/notarization secrets, notarize and staple the DMG, and verify codesign/notarization before artifact upload. Added setup and verification documentation for Apple portal prerequisites and GitHub secrets mapping.
