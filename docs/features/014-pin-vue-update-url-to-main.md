# Pin Vue Update URL to a Persistent Branch

- **ID:** 014
- **Type:** bugfix
- **Severity:** major
- **Version bump:** patch
- **Branches:** feature/pin-vue-update-url-to-main
- **Merged:** 2026-08-19

## Summary

Published vue-update manifests pointed at the feature branch they were built from, so every URL 404'd once that branch was deleted after merge.

## Details

`scripts/build-vue-update.js` derived the download URL from `git branch --show-current` at build time. Feature branches are deleted after their PR merges, so the baked-in URL stopped resolving as soon as the change shipped. Both published manifests were already dead:

- `0.0.2` pointed at `feature/dock-badge-and-quit-on-close` (deleted)
- `0.0.3` pointed at `feature/service-catalog-taxonomy` (deleted)

The script now publishes against a long-lived branch via `PUBLISH_BRANCH`, defaulting to `main` and overridable with `CHAPPY_PUBLISH_BRANCH` for testing. The current branch is still reported in build output as `Built from:`, so it remains visible without affecting the URL.

The existing `0.0.3` manifest is repointed at `main`. The bundle it references is already committed there, so the URL resolves without rebuilding: the hash, version and `publishedAt` are unchanged.

## Verification

- `curl` of the old `0.0.3` URL returns HTTP 404
- `curl` of the repointed `main` URL returns HTTP 200
