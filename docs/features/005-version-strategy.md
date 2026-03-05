# Version Strategy and Feature Documentation

- **ID:** 005
- **Type:** feature
- **Severity:** medium
- **Version bump:** minor
- **Branches:** feature/version-strategy
- **Merged:** 2026-03-05

## Summary

Implement cohesive version strategy so tags, package.json, and artifact names align; add feature/bugfix documentation with classification; collate release notes from features when tagging.

## Details

- Created docs/VERSIONING.md with full methodology (SemVer-inspired)
- Created docs/features/ with TEMPLATE.md and backfilled recent features
- Updated AGENTS.md with version strategy and release process
- Added scripts/collate-release-notes.js to generate release notes from feature docs
