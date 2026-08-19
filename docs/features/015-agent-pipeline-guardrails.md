# Agent Pipeline Guardrails

- **ID:** 015
- **Type:** bugfix
- **Severity:** major
- **Version bump:** patch
- **Branches:** feature/agent-pipeline-guardrails
- **Merged:** 2026-08-19

## Summary

The promotion process was documented in a file coding agents never load, and the documented merge strategy and check-waiting guidance were both wrong in ways that let unvalidated code reach `main`.

## Details

Three separate defects, all in process rather than product code.

**AGENTS.md was invisible to agents.** Claude Code auto-loads `CLAUDE.md`; this repository had none, so the mandatory startup protocol and promotion path were not in context at session start and were only found by chance. `CLAUDE.md` now exists as a pointer to `AGENTS.md` rather than a copy, so the two cannot drift.

**Merge policy contradicted practice.** The policy said squash merges only, but every promotion in history is a merge commit — and for good reason: squashing `dev -> test` makes the branches diverge permanently, which previously required a `merge: sync test into dev before promotion` cleanup. Policy now specifies squash for `feature/* -> dev` and merge commits for promotions.

**Check-waiting was racy.** A freshly opened PR reports no checks for several seconds, and a freshly pushed branch has no workflow run registered yet. Polling for the newest run therefore returned a run belonging to the *previous* promotion and reported success. This caused a real merge to `main` while its `release-test` build was still in progress. AGENTS.md now documents waits that fail closed, and the checklist requires that checks were observed passing.

The `--admin` prohibition is new and load-bearing: it is the flag that makes `guard-main-source` and the release-build gate advisory rather than mandatory.

## Details: auto-mode configuration

`.claude/settings.json` narrows what a coding agent may do without prompting: read-only `gh` inspection and `gh pr create` are permitted, `gh pr merge` is permitted only on passing checks, and `--admin`, direct pushes to `main`/`test`, and merging past pending checks are denied. This file must be created by a human — an agent is correctly prevented from writing its own permission configuration.

## Verification

- `npm test` passes
- `.claude/settings.json` parses as valid JSON
