# Chappy

Chappy is a chat-first Electron app that runs web clients in isolated workspace tabs.

## Product features

- Multi-service tab rail for chat and productivity clients (for example WhatsApp, Messenger, Discord, Trello, Gmail, Calendar).
- Per-tab launch behavior with three modes:
  - `Default URL` (app-defined service URL)
  - `Custom URL` (user-defined launch URL)
  - `Preserve URL for launch` (reopen the last visited URL)
- Per-tab persistent session partition so duplicate services do not share browser storage.
- Workspace management in the Chappy tab: add, remove, reorder, and configure tab launch behavior.
- Persistent local config in `~/.chappy/config.json`.

## Getting started

```bash
npm install
npm run dev
```

- `npm run dev` launches renderer + Electron (with automatic port cleanup on `5173`).
- `npm test` validates curated services + icon coverage.
- `npm run build:renderer` builds the renderer bundle.
- `npm run build` creates desktop artifacts in `release/`.

## Branch strategy

Promotion model:

```text
feature/* -> dev -> test -> main -> v* tag -> GitHub Release
```

Rules:

- New agent-driven work starts from `dev` using a `feature/*` branch.
- Promotion to `test` is via PR from `dev`.
- Promotion to `main` is via PR from `test` only.
- PR merges should be squash merges.
- No direct pushes to `test` or `main`.

## CI gates

Workflow: `.github/workflows/pr-validation.yml`

- PRs targeting `dev`: run `npm test`.
- PRs targeting `test`: run `npm test` + `npm run build:renderer`.
- PRs targeting `main`:
  - fail unless source branch is exactly `test`
  - run `npm test` + `npm run build:renderer`

## Release process (tag-driven)

Workflow: `.github/workflows/release.yml`

1. Merge `test` into `main`.
2. Create annotated tag on `main`:
   - `git tag -a vX.Y.Z -m "Release vX.Y.Z"`
3. Push tag:
   - `git push origin vX.Y.Z`
4. GitHub Actions builds and publishes release artifacts from `release/` (`.dmg`, `.zip`, optional `.blockmap`).

Initial baseline release for this governance model is `v0.0.1`.

## Contributor and agent quickstart

```bash
git checkout dev
git pull origin dev
git checkout -b feature/my-change

# implement + verify locally
npm test
npm run build:renderer

git push -u origin feature/my-change
```

Then promote:

1. Open PR: `feature/my-change` -> `dev`
2. Open PR: `dev` -> `test`
3. Open PR: `test` -> `main`
4. Tag release from `main`

## Branch protection setup (GitHub UI)

Enable branch protection/rulesets for `dev`, `test`, and `main`:

- Require pull request before merging
- Restrict direct pushes
- Require status checks to pass before merge
- Recommended: require linear history
- Recommended: allow squash merge only
