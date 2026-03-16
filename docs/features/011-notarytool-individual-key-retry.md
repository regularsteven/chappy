# Retry Notarytool Without Issuer For Individual API Keys

- **ID:** 011
- **Type:** bugfix
- **Severity:** medium
- **Version bump:** patch
- **Branches:** feature/notarytool-individual-key
- **Merged:** 2026-03-15

## Summary

Retry macOS notarization without an issuer when `notarytool` rejects the issuer option.

## Details

Recent release-test runs failed on the macOS job because CI was attempting notarization twice: once in Electron Builder's `afterSign` hook and again in the workflow's explicit DMG notarization step. Chappy now skips the `afterSign` notarization path in CI and relies on the workflow step, which retries without `--issuer` whenever the issuer-based attempt fails for individual App Store Connect API keys.
