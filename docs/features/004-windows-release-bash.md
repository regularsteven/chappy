# Fix Windows Release Job PowerShell Syntax Error

- **ID:** 004
- **Type:** bugfix
- **Severity:** critical
- **Version bump:** patch
- **Branches:** feature/release-windows-bash
- **Merged:** 2026-03-05

## Summary

Windows runner uses PowerShell by default; validate step used bash syntax. Set shell to bash for the Windows release job.

## Details

- Added `defaults.run.shell: bash` to release-windows job so `if ! ... then ... fi` runs correctly
- Without this, the Windows build failed with "Missing '(' after 'if' in if statement"
