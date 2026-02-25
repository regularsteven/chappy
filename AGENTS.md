# AGENTS.md

## Purpose

This file defines mandatory delivery workflow for agent-driven changes in this repository.

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

## Merge policy

- Merge strategy: squash merges only.
- Prefer small PRs with clear, reviewable scope.

## Release policy

- Releases are created from `main` only.
- Use annotated tags in the form `vX.Y.Z`.
- Push the tag to trigger release workflow.
- Release workflow publishes artifacts from `release/`.

## Agent PR checklist

- [ ] Source branch is `feature/*` created from `dev`
- [ ] Target branch is correct for this promotion step
- [ ] Required CI checks passed for target branch
- [ ] README/AGENTS/docs updated if workflow or behavior changed
- [ ] Release notes/changelog prepared when version changed
