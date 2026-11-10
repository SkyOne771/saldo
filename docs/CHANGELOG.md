# Changelog

## 2026-11-10 — Minimum monthly budget

- Overview now shows Minimum needed: essential recurring bills at the profile’s share plus active debt instalments, excluding one-off spending.
- Bills support an editable essential flag, included by default, with effective-month and paid-history preservation. Annual bills are provisioned monthly.

## 2026-11-10 — Independent shared-bill confirmations

- Restored the configured bill payer as the common default in both profiles. Existing saved payers and provider-payment history stay intact.
- Added separate per-person, per-month half-payment confirmations and filters. Confirmed reimbursements reduce shared balances without completing the other person’s half or changing the provider payment.

## 2026-11-09 — Active-profile payer defaults

- Unpaid shared bills default to the active participant as payer. Individual and bulk payment actions persist that choice, while explicit month-specific payers and paid history remain unchanged.

## 2026-11-09 — Task priorities and filters

- Added P1–P4 task priorities with semantic colours, inline editing and a P3 default for existing tasks.
- Added priority, visibility and search filters, priority/name/original sorting, filtered counts and clear filters. Shared profiles edit one priority value.

## 2026-11-09 — Per-profile bill due days

- Shared bills support individual due-day overrides per profile. Dates, overdue statuses and sorting follow the selected profile while amounts and paid status remain shared.
- Date overrides follow effective-month edits and paid-history snapshots, with month-end clamping and profile-deletion cleanup.

## 2026-11-09 — Shared profile tasks

- Added opt-in task sharing between profiles, with one synchronised record, per-task recipients and confirmed bulk sharing.
- Idle visible clients refresh other-tab changes while preserving open editors and concurrent-edit recovery.

## 2026-11-09 — Debt balance synchronisation

- Tracker balances explicitly follow live debt totals; partial final bricks have proportional widths and exact paid/remaining amounts.
- Added a per-profile manual tracker balance override and Return to automatic control without changing financial records.

## 2026-11-09 — Overview bill alignment

- Aligned the Payment heading with bill names and kept due dates, amounts and statuses on shared column tracks. Mobile cards omit the desktop heading row.

## 2026-11-09 — Automatic debt grid

- Debt squares now show partial repayments proportionally and display the automatically calculated remaining balance and total grid amount.

## 2026-11-09 — Task status colours

- To do tasks use the red status colour in the classic palette, matching green Done and amber In progress. Overview badges and task-card accents use the same mapping. Other palettes retain their configured status colours.

## 2026-10-19 — Public portfolio preparation

- Added a public README, architecture, user, deployment and testing guides.
- Replaced local-demo fixtures with fictional household data; removed private import scripts and operational logs from the public file set.
- Added generated code references, documentation-impact checks, publication checks and CI.
- Generalised systemd/reverse-proxy examples and retained site-specific settings outside source control.

## License

- Released the public project under the MIT License; package metadata and README now match the license file. Third-party dependencies retain their own license terms.

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
