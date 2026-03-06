# macOS Signing + Notarization Setup

This project ships macOS releases outside the Mac App Store using:

- Developer ID Application signing
- Apple notarization (App Store Connect API key)
- Stapling on the app bundle and DMG

## Apple Portal Setup (manual)

Complete these in Apple Developer / App Store Connect:

1. Certificates:
- Create (or reuse) a `Developer ID Application` certificate for your team.
- Export it from Keychain Access as a password-protected `.p12`.

2. Identifiers:
- Confirm the bundle ID is stable and matches `build.appId` in `package.json`.
- Current app ID: `com.regularsteven.chappy`.

3. Auth Keys:
- In App Store Connect, create an API key with access needed for notarization.
- Save:
  - `.p8` key contents
  - key ID
  - issuer ID

## GitHub Secrets Required

Add these repository secrets:

- `MACOS_CERTIFICATE_P12_BASE64`: base64-encoded Developer ID Application `.p12` file
- `MACOS_CERTIFICATE_PASSWORD`: password used when exporting the `.p12`
- `MACOS_CERTIFICATE_NAME` (optional): certificate common name, for example `Developer ID Application: Your Name (TEAMID)`
- `APPLE_API_KEY_P8`: raw `.p8` content for App Store Connect API key
- `APPLE_API_KEY_ID`: App Store Connect API key ID
- `APPLE_API_ISSUER_ID`: App Store Connect issuer ID
- `APPLE_TEAM_ID`: Apple Developer Team ID

Notes:
- Never commit `.p12`, `.p8`, passwords, or key values to git.
- Keep all secret values in GitHub Actions secrets only.
- Workflow also accepts legacy secret names (`CSC_LINK`, `CSC_KEY_PASSWORD`, `CSC_NAME`, `APPLE_API_KEY`, `APPLE_API_ISSUER`) as fallback.

## Workflow Behavior

The macOS jobs in:

- `.github/workflows/release-test.yml`
- `.github/workflows/release.yml`

now do the following:

1. Validate required signing/notarization secrets exist.
2. Build mac artifacts with `npm run build:desktop:ci` (signed build path).
3. Notarize the generated DMG with `xcrun notarytool`.
4. Staple the DMG.
5. Verify:
- `codesign --verify`
- `spctl --assess`
- `xcrun stapler validate` on `.app` and `.dmg`
6. Upload only verified artifacts.

## Local Verification on a Clean Mac

After downloading a release artifact:

1. Attach and install:
```bash
hdiutil attach Chappy-<version>-<arch>.dmg
cp -R /Volumes/Chappy/Chappy.app /Applications/
```

2. Verify signature:
```bash
codesign --verify --deep --strict --verbose=2 /Applications/Chappy.app
codesign --display --verbose=4 /Applications/Chappy.app
```

3. Verify notarization/stapling:
```bash
xcrun stapler validate /Applications/Chappy.app
xcrun stapler validate Chappy-<version>-<arch>.dmg
spctl --assess --type execute --verbose=4 /Applications/Chappy.app
```

4. Launch test:
```bash
open /Applications/Chappy.app
```

Expected result: app opens without the unsigned/unidentified developer override flow.
