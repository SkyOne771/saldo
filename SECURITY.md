# Security policy

Saldo targets small self-hosted deployments. Its controls reduce risk; they are not a security certification or an independent penetration test.

## Report a vulnerability privately

Use [GitHub private vulnerability reporting](https://github.com/SkyOne771/saldo/security/advisories/new). Do not open a public issue containing exploit details, real finance data, databases, passwords, tokens or recovery codes. Include affected versions, reproduction steps using fictional data, and the expected impact. Test only systems you own or have permission to assess.

The current `main` branch is maintained; there is no separate long-term-support release policy yet. Fixes are reviewed and validated before publication.

## Protections

- Finance data is selected by the authenticated account, not a client-supplied account ID. Profiles inside an account are views, not separate permission boundaries.
- Passwords use asynchronous salted scrypt with bounded concurrency. New passwords require 12–1024 characters; legacy hashes upgrade after a valid login.
- Random session tokens are stored as SHA-256 digests. Cookies are HttpOnly and SameSite=Strict, with Secure enabled for HTTPS. Sessions expire after one hour of inactivity or seven days, with at most five active sessions per account.
- Authenticated mutations require session-bound CSRF tokens, a custom header, JSON and same-origin checks. The API does not enable cross-origin access.
- Production registration uses private email-bound invitations. Unauthorised signup requests return the same response for existing and unknown emails. Explicit open registration exists only for isolated development/testing and does not provide this privacy property.
- Recovery codes are hashed, single-use and expiring. Authenticated code rotation requires the current password. Password reset consumes the code and revokes all sessions. The administrator can issue a short-lived code after verifying the owner.
- Authentication, signup, writes and general API traffic have persistent rate limits. Request sizes, in-flight requests, hashing concurrency, accounts, state sizes and collections are bounded.
- State validation checks references, statuses, amounts, cent precision and optimistic revisions. SQL statements bind parameters. A stale revision cannot silently overwrite another save.
- Production uses CSP, anti-framing, MIME-sniffing protection, restricted browser capabilities, and no-store API responses. Dynamic styles and Google Fonts are explicitly allowed for the UI.
- Deployment examples use a dedicated service user or restricted container, private database/backup directories, HTTPS and consistent backups.

## Configuration and responsibilities

Read [Deployment](docs/DEPLOYMENT.md) before exposing a host publicly. Pin `APP_ORIGIN`, enable secure cookies under HTTPS, trust only the intended reverse proxy, and use `ALLOW_REGISTRATION=false` if invitations are not needed. Never enable demo mode publicly; production rejects it.

The public source contains fictional examples only. `.local/`, databases, `.env` files, backups and credentials are excluded from publication and CI checks flag common accidental disclosures. Pattern checks cannot guarantee that an arbitrary file is safe; review the public diff.

## Limits

- No two-factor authentication, email verification/delivery, bank integration or automatic settlement transfer recording.
- The app does not encrypt SQLite at rest. Host administrators can access records and backups; protect the host and encrypt off-site backups.
- Apps at different paths on the same origin are not isolated from each other. Prefer a dedicated finance hostname.
- Application limits cannot prevent network saturation; provider protection, patching and off-host backup retention remain operational work.
- Paid snapshots preserve history from the point it is available. Already-overwritten historical values cannot be inferred automatically.
- A clean dependency audit and passing tests do not prove absence of vulnerabilities. Browser checks are separate from automated Node tests.

See [Testing](docs/TESTING.md) for coverage and validation boundaries.
