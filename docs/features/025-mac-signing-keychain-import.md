# Import the macOS signing certificate via keychain, not CSC_LINK

- **ID:** 025
- **Type:** bugfix
- **Severity:** major
- **Version bump:** patch
- **Branches:** feature/mac-signing-keychain
- **Merged:** 2026-09-03

## Summary

The first signed release-test build after doc 024 failed inside electron-builder's temporary
keychain. The workflows now import the Developer ID certificate with Apple's documented keychain
flow and let electron-builder auto-discover the identity.

## Details

**The failure.** With `CSC_LINK` / `CSC_KEY_PASSWORD` set, electron-builder imports the p12 into
a temporary keychain it creates with a random password, then runs
`security set-key-partition-list` against it. On the current `macos-latest` runners that second
step fails with `SecKeychainUnlock: The user name or passphrase you entered is not correct`,
even though the import itself succeeded. The certificate password is fine; the temporary
keychain is what cannot be unlocked.

**The fix.** Both `release.yml` and `release-test.yml` drop the `CSC_*` env and add an
`apple-actions/import-codesign-certs@v3` step before the build. It creates its own keychain,
imports the p12 with `MACOS_CERTIFICATE_P12_BASE64` / `MACOS_CERTIFICATE_PASSWORD`, sets the
partition list correctly, and adds the keychain to the search list. `build:desktop:ci` runs
without `CSC_IDENTITY_AUTO_DISCOVERY=false`, so electron-builder finds the Developer ID
Application identity there and signs with it.

**Guardrail.** `scripts/check-app-update.mjs` now asserts the import step and secret name are
present in both workflows instead of looking for `CSC_LINK`.
