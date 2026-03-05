# AGENTS.md

## Purpose

This file defines mandatory delivery workflow for agent-driven changes in this repository.

## Agent startup protocol (mandatory)

This applies even if the user is currently on `main`, `test`, or any other branch.

Before starting implementation, an agent must:

1. Switch to `dev`
2. Update `dev` from remote
3. Create a new `feature/*` branch from `dev`
4. Perform all implementation work only on that new `feature/*` branch

Agents must follow this process automatically. The human user should not need to restate it in prompts.

## Branch and promotion policy

Promotion path is strict:

```text
feature/* -> dev -> test -> main -> v* tag -> release
```

Mandatory rules:

- Agent work must start from `dev`.
- Agents must implement changes on `feature/*` branches.
- `feature/*` branches merge into `dev` via PR.
- `dev` merges into `test` via PR.
- `test` merges into `main` via PR.
- PRs to `main` must originate from `test`.
- No direct commits/pushes to `test` or `main`.

## Job lifecycle (mandatory)

1. Implement on `feature/*` branch.
2. Run sanity verification (minimum: `npm test`) on `feature/*`.
3. Open and merge PR: `feature/*` -> `dev` (sanity gate).
4. Open and merge PR: `dev` -> `test`.
5. Run/confirm exhaustive verification on `test` (minimum: `npm test` + `npm run build:renderer`).
6. **Wait for `release-test` workflow to pass on `test`** before merging to `main`. This validates Mac and Windows release builds.
7. Open and merge PR: `test` -> `main`.
8. Mark the job done only after the change is merged to `main` and required checks have passed.

## Build requirements

- **Development**: `npm run dev` — no build needed; runs renderer dev server + Electron.
- **CI / verification**: `npm run build:renderer` — builds the renderer; main/preload run as-is.
- **Distribution**: `npm run build:full` — builds renderer and packages the desktop app (DMG/ZIP).

Use `npm run build` when you need the vue-update build; use `npm run build:full` when creating a distributable release.

## CI and quality gates

- Target `dev` PRs:
  - must pass `npm test`
- Target `test` PRs:
  - must pass `npm test`
  - must pass `npm run build:renderer`
- Target `main` PRs:
  - must come from `test`
  - must pass `npm test`
  - must pass `npm run build:renderer`
  - must have `release-test` passed on `test` (validates release builds before promotion)

## Merge policy

- Merge strategy: squash merges only.
- Prefer small PRs with clear, reviewable scope.

## Release policy

- Releases are created from `main` only.
- Use annotated tags in the form `vX.Y.Z`.
- Push the tag to trigger release workflow.
- Release workflow publishes artifacts from `release/`.

### Release validation (mandatory before tagging)

**Never tag a release until the release build has been validated on `test`.**

1. The `release-test` workflow runs on every push to `test`. It builds both Mac and Windows artifacts (same steps as the real release).
2. **Before tagging**: Ensure the `release-test` workflow has passed on `test` for the commit you are about to tag. If it failed, fix the failure and re-promote through the branch chain before tagging.
3. **Tag only after**:
   - Changes are merged to `main`
   - The same code path passed `release-test` when it was on `test` (i.e. the test->main PR merged after release-test succeeded)
4. **Release workflow behavior**: The release workflow builds Mac and Windows in parallel, uploads artifacts, and publishes to GitHub Releases **only after both succeed**. If either build fails, no release is created (no partial releases).

## Agent PR checklist

- [ ] Source branch is `feature/*` created from `dev`
- [ ] Agent started by switching to `dev` first (regardless of initial branch)
- [ ] Target branch is correct for this promotion step
- [ ] Required CI checks passed for target branch
- [ ] README/AGENTS/docs updated if workflow or behavior changed
- [ ] Release notes/changelog prepared when version changed
