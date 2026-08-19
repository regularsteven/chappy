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

   Both waits below are written to avoid a race that has already caused an unvalidated merge to `main`: a freshly created PR or push has no runs registered yet, so naive polling reports either "no checks reported" or success belonging to a *previous* run.

   ```bash
   gh pr checks <branch> --watch --fail-fast
   ```

   ```bash
   sleep 15 && gh run watch "$(gh run list --workflow=release-test.yml --branch=test --limit=1 --json databaseId --jq '.[0].databaseId')" --exit-status
   ```

   If `gh pr checks` reports no checks, wait and re-run it. Do not treat that as a pass.
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

- `feature/* -> dev`: **squash merge**.
- Promotions (`dev -> test`, `test -> main`): **merge commit**. Squashing a promotion makes the branches diverge permanently and forces a later re-sync commit.
- **Never pass `--admin` to `gh pr merge`**, and never merge a PR whose required checks are failing or have not yet reported. `guard-main-source` and `release-test` are the only enforcement of the promotion path.
- Prefer small PRs with clear, reviewable scope.

## Release policy

- Releases are created from `main` only.
- Use annotated tags in the form `vX.Y.Z`.
- Push the tag to trigger release workflow.
- Release workflow publishes artifacts from `release/`.

### Version strategy (mandatory)

See [docs/VERSIONING.md](docs/VERSIONING.md) for the full methodology.

- **Tag must match package.json:** `vX.Y.Z` must equal `package.json` version at the tagged commit. Bump `package.json` in a commit *before* tagging.
- **Feature docs:** Each PR must have a feature doc in `docs/features/`, classified per the methodology (type, severity, version bump).
- **Before tagging:** Collate features merged since last release; determine version from highest bump; bump `package.json`; then tag.
- **Release notes:** Populate the GitHub Release body from collated features (use `node scripts/collate-release-notes.js X.Y.Z`).

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
- [ ] Feature doc created in `docs/features/` (see [docs/features/TEMPLATE.md](docs/features/TEMPLATE.md))
- [ ] Release notes/changelog prepared when version changed
- [ ] Checks were observed passing before merge (not merged past a pending or failing run)
- [ ] No `--admin` or other check-bypassing flag was used
