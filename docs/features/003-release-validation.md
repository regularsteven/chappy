# Release Validation - No Partial Releases

- **ID:** 003
- **Type:** bugfix
- **Severity:** major
- **Version bump:** patch
- **Branches:** feature/release-validation
- **Merged:** 2026-03-05

## Summary

Restructure release workflow so no release is created if either Mac or Windows build fails.

## Details

- Restructured release.yml: build jobs upload artifacts; publish-release job runs only after both succeed
- Added release-test.yml: runs on push to test, validates Mac and Windows builds without creating a release
- Updated AGENTS.md: release-test must pass before merging test to main; document release validation process
