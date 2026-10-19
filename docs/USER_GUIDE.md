# User guide

## Accounts and profiles

New registered accounts contain one profile, zero income and no financial records. A local demo uses fictional records only. Add a partner profile in Settings to share bills. Switching profiles changes the budget view within the same account; everyone using that login can access those profiles.

## Overview

Overview combines monthly income, planned cash flow, shared costs, extra spending, recurring bills, debt progress and tasks. The month picker controls the selected month. Edit income directly; Manage bills and Manage debts open the source records. Spending and Review budget scroll to their sections without leaving Overview.

Income edits take effect from the selected month onward until another change. Earlier months retain the previous income. The remaining budget is calculated, rather than edited independently.

## Bills and shared expenses

Monthly and annual bills support due days 1–31. Short months clamp dates to their last day, including leap-year February. Annual bills contribute one twelfth of their amount to monthly provisioning and are scheduled outside their due month.

Shared bills belong to their owner and one selected partner. Splits are 50/50; if a cent cannot divide evenly, the extra cent belongs to the owner. The two shares reconcile to the full amount. Payer selection and paid status apply to the chosen month.

Importing a personal recurring bill into Shared expenses starts a split without duplicating the record. Import from shared restores a bill to Recurring bills without cancelling the split. Search, filtering, sorting and bulk actions work on the shown list.

The crossed-eye action removes an item from the current list for that profile only. Undo and the Removed tab restore it. List removal does not change its budget, split, partner's view or payment history. To stop splitting, edit the split setting. Delete inside the edit form permanently removes the record after confirmation.

Bill changes take effect from the selected month onward. Paid snapshots protect earlier settlements from later changes. Deliberately editing the selected paid month corrects that month. Values overwritten before history was recorded cannot be reconstructed automatically.

## Settlement and debt rules

The shared balance uses paid bills and their selected-month payers. Positive means the profile owes money; negative means it is owed money. Settlement transfers are not recorded in this version.

Debt instalments are planned monthly outgoings. Record only the principal repaid to reduce the remaining balance; interest is excluded from that entry. Editing a repayment adjusts only the principal difference, and deleting it restores that principal. Corrections outside the debt's starting/balance bounds are rejected. History for a deleted debt can be edited or deleted separately and is labelled as history-only.

The debt grid has its own adjacent controls for colours, milestone amount, columns and labels. It adapts on mobile and scales the milestone size to keep rendering within 1,000 squares.

## Other records and recovery

Extra expenses can be edited, moved between months or deleted with confirmation. Tasks support To do, In progress and Done. Deleting a profile transfers its records to another profile; at least one profile must remain.

A conflicting save keeps the draft and opens a recovery screen. Review overlapping values, save combined changes or download the draft. This does not make financial changes silently.

Account security provides password changes, recovery-code generation and sign-out for other sessions. Save recovery codes privately. Use Forgot password on the sign-in screen or ask the administrator for a short-lived recovery code. JSON export/restore covers finance data, not authentication credentials; restore replaces the account's finance state after confirmation.
