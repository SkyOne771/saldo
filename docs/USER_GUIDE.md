# User guide

## Install on a phone

Open your HTTPS Saldo address on your phone. In Chrome on Android, use the browser menu and select **Install app** or **Add to Home screen**. On iPhone, open the site in Safari, then choose **Share → Add to Home Screen** and enable **Open as Web App** if shown.

Open Saldo from the new icon and sign in with your existing account. It connects to the same server and requires an internet connection.

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

### Default payer and each person’s half

Bill paid by uses the configured bill payer (the bill owner when none is set) in both profiles. Switching profiles does not change it. A saved month-specific payer overrides that default. Existing payment history stays unchanged.

The Bill: Paid button records payment to the provider. Each person also has an independent half-payment confirmation under the bill name. From your profile, click your named button to confirm or undo your own half; switch profiles to confirm the other person’s half. One person’s confirmation never completes the other’s. Existing bills start with no personal confirmations; the app does not infer them from the provider’s paid status. Confirmations are saved per month and sync across both views.

For a bill already paid to the provider, the non-payer’s confirmation records reimbursement and removes that bill from the amount owed. Undoing it restores the reimbursement due. Personal confirmations do not change the original bill-paid status, amounts or budget. Use All halves / My half pending / My half paid to find your unfinished payments. The bulk bill-paid action only marks payments to providers, not either person’s half.

### Minimum needed

Overview shows Minimum needed for the selected month: your share of essential recurring bills plus active monthly debt instalments. Shared bills count at your 50% share, personal bills count fully, and annual bills are spread over 12 months. One-off spending is excluded. New accounts start at zero.

Existing bills are included by default as a conservative starting point. Use **Choose essential bills** on Overview to open Recurring bills, then check or uncheck **Essential** directly on each bill. The checkbox is also available in Shared expenses. Optional bills still count in Bills & living and the normal budget. The flag belongs to the shared bill, so changing it applies to both profiles from the selected month until the next saved bill version. Other paid months retain their saved terms. This is a planning total based on your records, not an estimate of food or other costs you have not entered.

### Dragging task cards

Drag a task card into To do, In progress or Done to change its status. The destination column highlights and accepts drops even when empty. A successful move saves through the normal revision-protected update and appears in other shared profiles. Dropping into the same column or pressing Escape leaves the task unchanged. Cards retain their priority, sharing and other details; ordering still follows the selected sort.

On touch screens, drag the card’s Drag handle onto one of the three status targets that appears at the top of the screen. Release elsewhere to cancel. Normal scrolling remains available outside the handle. The status dropdown remains available for keyboard use and as an alternative to dragging. Moving is disabled while a save is in progress; save failures and concurrent edits use the existing error and draft-recovery flow.

### Task due dates

Use Set due date on an undated card, or edit any task and set the optional date. Clear the date field to remove it. Existing tasks remain undated until you choose dates; shared profiles edit the same date, and dragging between statuses preserves it.

Cards distinguish Overdue, Due today and Upcoming with the status palette. A dated task in Done shows Completed instead of Overdue. Date filters combine with priority, search and sharing filters. Next 7 days includes today and the following six days, excluding completed tasks. Sort by Due date to show the earliest dates first and undated tasks last. Clear filters restores all tasks.

Task due status uses the device’s current local calendar date, independently of the selected finance month. It refreshes when the app is refocused and within a minute of a date change. Due dates do not schedule notifications.

### Tasks on phones and tablets

On narrow screens and touch devices, task controls use larger tap targets and form text. Status and priority controls sit side by side with a full-width Edit task button. Tap Set due date or Edit task to open the scrollable editor; the date is optional and can be cleared. On short screens, scroll within the dialog to reach Save. The drag handle and the three fixed status targets support touch-pointer moves, with safe-area spacing at the top of the screen. Scroll the page outside the handle, and use the status dropdown whenever dragging is inconvenient.

### Shared balances carried forward

The Shared expenses balance includes unpaid reimbursements from the selected bill month and every earlier bill month. It shows amounts you owe and amounts owed to you; future bill months are excluded. A monthly breakdown separates the selected month from carryover. The calculation reads the original records, so it never creates a duplicate bill or adds an earlier cumulative total again, and your monthly budget is unchanged.

Expand Review earlier unpaid bill shares to see their original months, bill names and partners. Confirm reimbursed only after you have actually repaid that share: this records your confirmation against the original month and removes it from later totals. Review month opens that period so a confirmation can also be undone. People owed money can review the original record but cannot confirm another profile’s half from their own view.

Saved historical amounts, partners and payers are used even if the bill changes later. Hidden bills still count. Only bills recorded paid to the provider create a reimbursement balance, and a partner’s already-confirmed half is excluded. Earlier provider-paid bills without a reimbursement confirmation remain outstanding; the app does not guess whether an unrecorded repayment happened. Opposing amounts are netted in the total, with individual unpaid entries left intact.
