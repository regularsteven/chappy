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

Recent release-test runs failed on the macOS job because `notarytool` can reject `--issuer` for individual App Store Connect API keys even when an issuer secret is present. Chappy now retries notarization without the issuer flag in both the Electron after-sign hook and the GitHub Actions release workflows when that specific CLI error occurs.
