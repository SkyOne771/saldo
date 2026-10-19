# Deployment and operations

Use Node.js 22.13+ or Docker. The application serves its own frontend and API; no hosted database, bank API or email-delivery provider is required.

## Local private account

```bash
npm ci
DEMO_MODE=false npm run dev
```

After the server has initialised `data/saldo.sqlite`, create an invitation in a second shell:

```bash
DATA_DIR=data node deploy/account-admin.mjs invite person@example.com
```

Give the printed code privately to the intended email owner. Register using that email and invitation. New accounts are empty. `npm run dev` without `DEMO_MODE=false` instead opens a local fictional demo.

## Production process

```bash
npm ci
npm run build
NODE_ENV=production HOST=127.0.0.1 APP_ORIGIN=https://finance.example.com COOKIE_SECURE=true npm start
```

Use a service manager and HTTPS reverse proxy. Do not enable secure cookies for direct local HTTP testing; otherwise the browser will not send them. Production rejects `DEMO_MODE=true`.

| Variable             | Default / use                                                      |
| -------------------- | ------------------------------------------------------------------ |
| `PORT`               | `3000`                                                             |
| `HOST`               | `0.0.0.0`; use loopback behind a local proxy                       |
| `DATA_DIR`           | `data`; private persistent database directory                      |
| `NODE_ENV`           | `production` serves built assets; other values use Vite middleware |
| `DEMO_MODE`          | Local demo defaults on in development; production forbids it       |
| `APP_ORIGIN`         | Canonical HTTPS origin without a path; pin it in production        |
| `COOKIE_SECURE`      | `false`; set `true` behind HTTPS                                   |
| `COOKIE_PATH`        | `/`; match the application mount prefix if using one               |
| `TRUST_PROXY`        | Loopback proxies only; `false` disables proxy trust                |
| `ALLOW_REGISTRATION` | `true`; `false` closes signup entirely                             |
| `REGISTRATION_MODE`  | `invite`; `open` is reserved for isolated testing                  |
| `MAX_ACCOUNTS`       | `100`, bounded by the server                                       |
| `SALDO_BASE_PATH`    | Build-time `/`; for example `/finance/` for a prefix               |
| `VITE_HMR_PORT`      | Development HMR port, default `24678`                              |
| `SALDO_DOMAIN`       | Compose/Caddy hostname, configured in `.env` for the VPS override  |

The generated [reference](REFERENCE.md) lists the environment names read by application code. The Compose-specific hostname is read by its configuration rather than JavaScript.

## Docker and HTTPS

```bash
docker compose up -d --build
```

The app binds to `127.0.0.1:3000`; SQLite persists in `saldo-data`. To enable Caddy-managed HTTPS on an otherwise available host:

```bash
cp .env.example .env
# Set SALDO_DOMAIN to your DNS hostname, without a scheme or path.
docker compose -f compose.yaml -f compose.vps.yaml up -d --build
```

Allow inbound ports 80 and 443 and point DNS at the server. If another proxy already owns those ports, use that proxy instead. The shared-prefix example is [Caddyfile.shared](../deploy/Caddyfile.shared); replace its example hostname and adapt the other application's route.

Create an invitation in the running container:

```bash
docker compose exec saldo node deploy/account-admin.mjs invite person@example.com
```

Update by pulling the reviewed source and rerunning the Compose command. `docker compose down` stops the app; adding `-v` deletes persistent volumes and must not be used for an ordinary update.

## Linux systemd alternative

The installer targets Linux x86-64 and installs a dedicated Node 22 runtime, `saldo` service user, versioned releases, a private database directory and daily consistent backups. Build the release first:

```bash
npm ci
npm run check
npm run build
# Use SALDO_BASE_PATH=/finance/ npm run build instead for a prefix.
sudo bash deploy/install.sh
```

The installer needs `curl`, `tar`, `sha256sum`, Python 3 and systemd. It does not modify an existing reverse proxy. Review the unit and proxy examples before using them on a shared server.

Site-specific settings belong in root-owned `/etc/saldo.env`, outside the repository. For example:

```dotenv
APP_ORIGIN=https://finance.example.com
COOKIE_PATH=/
```

The unit reads this file after its defaults. When upgrading an older installation, the installer preserves its origin and cookie path in this file if it does not exist. Configure Caddy separately, then restart Saldo after changing its environment.

- Source releases: `/opt/saldo/releases`, active symlink `/opt/saldo/current`.
- Runtime: `/opt/saldo-node`.
- Data: `/var/lib/saldo/saldo.sqlite`.
- Backups: `/var/backups/saldo`.
- Services: `saldo`, `saldo-backup.service`, `saldo-backup.timer`.

```bash
sudo journalctl -u saldo -n 50 --no-pager
sudo systemctl restart saldo
sudo systemctl start saldo-backup.service
sudo systemctl list-timers saldo-backup.timer
```

## Account recovery

Signup shows a recovery code. Existing users can generate or replace one in Account security after confirming their current password. Codes are stored as digests, work once and expire after one year. The sign-in page has a Forgot password route. A successful reset revokes every session; generate a new code after signing in again.

If an owner loses their code, verify their identity before issuing a short-lived replacement:

```bash
sudo -u saldo env DATA_DIR=/var/lib/saldo /opt/saldo-node/bin/node /opt/saldo/current/deploy/account-admin.mjs reset person@example.com
```

For an invitation, replace `reset` with `invite`. Reset codes expire after 30 minutes; invitations after seven days. No email-delivery service is configured. Deliver these codes privately to the verified owner and never commit them.

## Backups, upgrades and rollback

Account JSON export covers finance records, not credentials or sessions. Restore replaces that account's finance state after confirmation.

Full backups must be SQLite-consistent: use the online backup API or stop the app and copy the database together with its WAL files. The systemd backup script checks integrity and retains seven daily snapshots. Copy encrypted backups off the server; same-host backups do not protect against host loss. Runtime data and backups must not be web-accessible or committed.

Before an upgrade, make a verified backup and run the tests/build. The systemd installer retains versioned source and records the previous target. If rollback is needed, inspect schema compatibility, stop the service, restore the previous symlink and restart. Do not restore an older database over new financial records without an explicit recovery decision.

Use a dedicated finance hostname where possible. Apps sharing an origin share a browser security boundary even if their paths differ. Keep the OS, Node and reverse proxy patched, and inspect logs without logging passwords, tokens or account states.
