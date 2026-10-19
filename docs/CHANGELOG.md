# Changelog

## 2026-10-19 — Public portfolio preparation

- Added a public README, architecture, user, deployment and testing guides.
- Replaced local-demo fixtures with fictional household data; removed private import scripts and operational logs from the public file set.
- Added generated code references, documentation-impact checks, publication checks and CI.
- Generalised systemd/reverse-proxy examples and retained site-specific settings outside source control.

## CI clean-checkout correction

- Build production assets before the test runner so static-route security tests pass on a fresh clone as well as an existing workspace.

## Current application baseline

- Overview combines monthly cash flow and extra spending; no duplicate Cash flow navigation tab.
- Effective-month income/bill changes preserve earlier months and paid settlement snapshots.
- Bills support days 1–31 with month-end clamping.
- Shared/recurring lists support independent removal, undo, restoration and imports without duplicate records.
- Principal repayments can be corrected or deleted with balance reconciliation.
- Stale saves support three-way draft recovery.
- Invitation-based signup, one-use recovery codes, session controls and cent-precision validation are included.
