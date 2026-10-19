# Testing

```bash
npm ci
npm run docs:generate
npm run check
```

`npm test` runs Node's built-in test runner. Tests create isolated temporary databases and servers; they must not point at a production database. Fixtures use fictional identities and amounts.

## Automated coverage

- Planned budgets, annual provisioning, per-profile/per-month spending and new-account isolation.
- Equal splits, odd-cent reconciliation, payer history, list visibility and imports without duplicate records.
- Effective-month income and bill terms, legacy paid snapshots, intentional historical corrections and month-end/leap-year dates.
- Principal repayment creation, correction, deletion and invalid-balance rejection.
- Three-way merge behavior for independent edits, conflicting values and deleted records.
- Invalid state/backup input, cent precision and optimistic revision conflicts.
- Sessions, CSRF/origin checks, account isolation, expiry, revocation, password hashing/migration and recovery codes.
- Rate limits across restarts, signup quotas, invitation privacy, request limits and private-file access.

CI additionally checks generated code documentation, local Markdown links, the public file set and a production build. Its documentation-impact check requires docs to change alongside application changes. These checks do not prove prose completeness or that every possible behavior is bug-free.

## Browser verification

Browser checks are performed separately from `npm test`; CI does not currently launch a browser. Before merging UI changes, use a disposable local account and verify:

1. Sign in or register using an invitation; confirm a new account is empty.
2. Add profiles, income, bills, a shared split and a debt; verify scoped totals.
3. Import, remove and restore bills in both directions, then edit a later month and verify the earlier paid settlement.
4. Create, edit and delete extra spending and principal repayments.
5. Trigger a stale revision in a second tab; recover the draft without losing unrelated changes.
6. Exercise password recovery and session revocation using only disposable accounts.
7. Switch themes and test keyboard navigation and a narrow mobile viewport.
8. For screenshots, use fictional local demo data and crop out browser/account information.

Historical functional, security and accessibility browser reviews informed the regression suite. Their private operational logs are not bundled in the public repository. Rerun affected flows when behavior changes rather than treating old screenshots as proof for new code.
