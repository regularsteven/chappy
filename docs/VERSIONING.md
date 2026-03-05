# Version Strategy

This document defines how Chappy versions releases and how to classify features and bugfixes.

## Version Format

**MAJOR.MINOR.PATCH** (e.g., 1.2.3)

| Component | Bump when | Example |
|-----------|-----------|---------|
| **PATCH** (0.0.x) | Trivial bug fix, minor tweak, docs-only | 0.0.1 → 0.0.2 |
| **MINOR** (0.x.0) | New feature (small/medium/large) | 0.0.2 → 0.1.0 |
| **MAJOR** (x.0.0) | New binary install, major milestone, breaking change | 0.3.0 → 1.0.0 |

## Classification → Version Bump

| Type | Severity | Bump |
|------|----------|------|
| Bug fix | trivial | PATCH |
| Bug fix | minor | PATCH |
| Bug fix | major | PATCH |
| Bug fix | critical | PATCH (or MINOR if user-facing impact is large) |
| Feature | minor | MINOR |
| Feature | medium | MINOR |
| Feature | major | MINOR |

When a release includes multiple changes, use the **highest** bump from the collated features. For example: one PATCH and one MINOR → bump MINOR.

## Golden Rule

**Tag `vX.Y.Z` must match `package.json` version.** Bump `package.json` (and `package-lock.json`) in a commit *before* tagging. The tag points at that commit. electron-builder uses `package.json` for artifact names, so artifacts will match the tag.

## Feature Documentation

Each feature or bugfix must have a doc in `docs/features/` using the template. See `docs/features/TEMPLATE.md`.

## Release Process

1. **Collate features:** Gather all feature docs merged since the last release.
2. **Determine version:** Apply bump rules from the highest-severity change.
3. **Bump version:** Update `package.json` and `package-lock.json`, commit to `main`.
4. **Tag:** `git tag -a vX.Y.Z -m "Release vX.Y.Z"` on that commit.
5. **Push tag:** `git push origin vX.Y.Z` triggers the release workflow.
6. **Release notes:** Populate the GitHub Release body from collated features (use `node scripts/collate-release-notes.js X.Y.Z` if available).
