# Full self-updater through GitHub Releases

- **ID:** 024
- **Type:** feature
- **Severity:** major
- **Version bump:** minor
- **Branches:** feature/electron-self-updater
- **Merged:** 2026-09-03

## Summary

Chappy now updates itself end to end with electron-updater: Check for update (or the daily
background check) finds the latest tagged GitHub Release, downloads the installer in the
background, and applies it on restart. The renderer-only "vue update" channel is removed.

## Details

**The problem.** The old updater replaced only the Vue renderer bundle. It could not carry
main-process changes, and every feature since v0.0.3 (Mirror mode, widgets, the calendar
service, the config allowlists) needed them. Nothing published bundles from CI, so the manifest
had been stale since March, and the apply path discarded any downloaded renderer whose hash
differed from the built-in one, which is every update. Pressing Check for update on a release
build downloaded a March-era renderer, restarted, threw it away, and showed nothing new.

**What replaces it.** `main/app-update.js` wraps electron-updater with the GitHub provider.
It auto-downloads, installs on quit, refuses downgrades, and folds every updater event into one
state object (`idle`, `checking`, `downloading` with a percentage, `ready`, `up-to-date`,
`error`, `unsupported`) that it broadcasts to the renderer over `app-update-status`. Unpacked
builds (`npm run dev`) report `unsupported` instead of erroring on every check.

**Settings panel.** The Updates section now shows the running version and a live status line
(checking, download progress, ready, up to date, or the error message). The button reads
Check for update, Checking…, Downloading…, Check again, or Restart to update, and is disabled
while work is in flight. The bottom-right toast appears when a version is downloaded and its
Restart Now calls `quitAndInstall`; closing it stays closed until a newer update is staged.

**Background check.** The existing Enable Auto-Update toggle still drives a check on launch
when the last one is more than a day old. `lastUpdateCheck` is now what the panel reports;
`lastUpdateApplied` is no longer written.

**Release pipeline.** `build.publish` in `package.json` names the GitHub repo, which is what
makes electron-builder emit `latest-mac.yml` and `latest.yml` alongside the artifacts. The
release workflow uploads those two files with the installers and now fails if any expected
asset is missing. Both the release and release-test workflows sign the macOS build with the
Developer ID certificate already stored in the repo secrets (`CSC_LINK` / `CSC_KEY_PASSWORD`),
because Squirrel.Mac will not install an update over an ad-hoc-signed app. Notarization stays
disabled as in doc 012; it affects first-install Gatekeeper prompts, not self-update.

**Removed.** `main/vue-update.js`, `scripts/build-vue-update.js`, `scripts/write-vue-build-json.js`,
`scripts/write-build-info.js`, the `vue-updates/` zips and manifest, the `build:vue-update` /
`build` npm scripts, and `build-info.json` from the packaged files. On launch the app deletes
any `~/.chappy/renderer`, `renderer-pending`, or temp zip the old channel left behind.

**Guardrail.** `scripts/check-app-update.mjs` runs under `npm test` and fails if the publish
config, the zip/nsis targets, the `latest*.yml` upload lines, or the macOS signing env are ever
removed.

**Upgrade note.** Only builds that contain this change can self-update. v0.1.0 and earlier must
be installed by hand one last time; every release after that arrives through the app.
