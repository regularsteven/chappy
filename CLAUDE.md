# CLAUDE.md

**[AGENTS.md](AGENTS.md) is the source of truth for how work ships in this repository. Read it before starting any task.**

This file exists only because Claude Code loads `CLAUDE.md` automatically and does not load `AGENTS.md`. Everything below is a pointer to rules defined there — when the two disagree, AGENTS.md wins. Do not restate its content here; duplicated process docs drift and agents then follow whichever copy is stale.

## Before writing any code

Switch to `dev`, update it from remote, and create a `feature/*` branch from it. This applies even when the user is currently on `main`, `test`, or another branch, and even when they do not say so. Do not ask the user to restate this.

## Promotion path

```text
feature/* -> dev -> test -> main -> v* tag -> release
```

- PRs into `main` must come from `test`. Never open one from a `feature/*` branch.
- No direct commits or pushes to `test` or `main`.
- `release-test` must pass **on `test`** before the `test -> main` PR merges.
- Squash merge for `feature/* -> dev`. Merge commit for the promotions (`dev -> test`, `test -> main`) so the branches do not diverge and need re-syncing.

## Never bypass the gates

Do not pass `--admin` to `gh pr merge`, and do not merge a PR whose required checks are failing or still pending. `guard-main-source` and the `release-test` build gate are the only things that make the promotion path real; overriding them ships code to `main` that was never validated against a Mac or Windows release build.

## Waiting for checks correctly

Both commands below are written to avoid a race that has already caused an unvalidated merge to `main`: a freshly created PR or push has no runs registered yet, so naive polling reports either "no checks reported" or, worse, success from a *previous* run.

Wait for PR checks — re-run this if it reports no checks rather than merging:

```bash
gh pr checks <branch> --watch --fail-fast
```

Wait for `release-test` after merging into `test`, confirming the run is newer than the merge:

```bash
sleep 15 && gh run watch "$(gh run list --workflow=release-test.yml --branch=test --limit=1 --json databaseId --jq '.[0].databaseId')" --exit-status
```

## Every change needs a feature doc

Add one in `docs/features/` from [docs/features/TEMPLATE.md](docs/features/TEMPLATE.md), classified per [docs/VERSIONING.md](docs/VERSIONING.md). Do not bump `package.json` in a feature PR — versions are set at release time from the collated docs.

## Publishing vue-update bundles

`scripts/build-vue-update.js` pins download URLs to `PUBLISH_BRANCH` (default `main`). Do not reintroduce a branch-derived URL: feature branches are deleted after merge, which silently 404s every published bundle.
