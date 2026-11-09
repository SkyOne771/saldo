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

The debt grid has its own adjacent controls for colours, milestone amount, columns and labels. Remaining and paid colours are calculated automatically from the current total debt and repayments; partially repaid squares show both colours proportionally. The balance above the grid follows the debt records automatically, including direct balance edits and repayment corrections. The last brick is shortened when the total is not an exact multiple of the brick amount. In Customize tracker, choose Manual override to set a separate tracker balance; this does not change debt records. Return to automatic resumes live debt updates. Overrides are saved per profile. The legend displays the exact remaining balance. It adapts on mobile and scales the milestone size to keep rendering within 1,000 squares.

## Other records and recovery

Extra expenses can be edited, moved between months or deleted with confirmation. Tasks support To do, In progress and Done. The classic status palette displays these in red, amber and green respectively; Overview badges and task-card accents share the same mapping. Deleting a profile transfers its records to another profile; at least one profile must remain.

A conflicting save keeps the draft and opens a recovery screen. Review overlapping values, save combined changes or download the draft. This does not make financial changes silently.

Account security provides password changes, recovery-code generation and sign-out for other sessions. Save recovery codes privately. Use Forgot password on the sign-in screen or ask the administrator for a short-lived recovery code. JSON export/restore covers finance data, not authentication credentials; restore replaces the account's finance state after confirmation.

### Shared tasks

Tasks start private to their profile. In the task editor, select the profiles that should share it. Each selected profile sees the same task and can edit its name or status, change sharing, or delete it; there are no duplicate copies. “Share my existing tasks” shares your current profile’s tasks after confirmation. Other profiles’ existing private tasks stay private to their view. Bulk sharing also defaults new tasks to shared for the selected profiles; each task can be made private in its editor, or use “Make my new tasks private” to change your own default.

An idle, visible app refreshes changes from other tabs or devices every 10 seconds and when refocused. Open editors keep their drafts; concurrent saves use the existing conflict recovery. Profiles are views inside one login, not separate security boundaries. This feature does not link separate email/password accounts.

### Due days per profile

Edit a shared bill and use Separate due days to enter each participant’s due day (1–31). A blank value follows the bill’s default due day. Each profile uses its date for sorting, due labels and overdue filters on Overview, Recurring bills and Shared expenses. The amount, 50/50 split and paid status remain one shared record. Days beyond the end of a month use its final day. Edits apply from the selected month onward; saved paid months retain their historical dates.

### Task priorities and filters

Priorities run from **P1 Urgent** (red in the classic palette) through **P2 High** (amber), **P3 Normal** (blue) to **P4 Low** (muted). Each badge includes its number and label, and colours follow the selected status palette. New and older tasks default to P3 until you change them. Set the priority in the editor or directly on a task card; shared profiles see the same value.

Use the to-do toolbar to combine a priority filter, name/category search and Shared/Private visibility. Sort by priority (P1 first), name or original order. Column counts reflect the filtered list, and Showing X of Y reports the full total. Clear filters restores the complete list. Adding from a status column uses the selected priority filter for the new task.

### Default payer

For an unpaid bill with no payer saved for that month, Paid by defaults to the active profile. Marking it paid records that payer for everyone, including when marking multiple shown bills paid. Choosing a payer explicitly is shared across profiles and takes precedence over the default. Switching profiles never rewrites paid history or a saved payer choice.
