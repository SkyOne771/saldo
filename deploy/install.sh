#!/usr/bin/env bash
# Install an uploaded, locally built release on a Linux host.
set -euo pipefail
if [[ $EUID -ne 0 ]]; then echo 'Run with sudo.' >&2; exit 1; fi
release_source="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
test -f "$release_source/dist/index.html"
test -f "$release_source/server.mjs"
if [[ ! -x /opt/saldo-node/bin/node ]]; then
  node_temp="$(mktemp -d)"
  trap 'rm -rf "$node_temp"' EXIT
  curl -fsS https://nodejs.org/dist/latest-v22.x/SHASUMS256.txt -o "$node_temp/SHASUMS256.txt"
  node_archive="$(awk '$2 ~ /^node-v22\.[0-9]+\.[0-9]+-linux-x64.tar.xz$/ { print $2; exit }' "$node_temp/SHASUMS256.txt")"
  test -n "$node_archive"
  curl -fsS "https://nodejs.org/dist/latest-v22.x/$node_archive" -o "$node_temp/$node_archive"
  (cd "$node_temp" && awk -v archive="$node_archive" '$2 == archive' SHASUMS256.txt | sha256sum -c -)
  install -d /opt/saldo-node
  tar -xJf "$node_temp/$node_archive" --strip-components=1 -C /opt/saldo-node
fi
if ! id saldo >/dev/null 2>&1; then
  useradd --system --user-group --home-dir /var/lib/saldo --no-create-home --shell /usr/sbin/nologin saldo
fi
install -d -m 755 /opt/saldo/releases
install -d -o saldo -g saldo -m 700 /var/lib/saldo /var/backups/saldo
release_target="/opt/saldo/releases/$(date -u +%Y%m%dT%H%M%SZ)"
install -d -m 755 "$release_target" "$release_target/src" "$release_target/deploy"
cp -r "$release_source/dist" "$release_target/"
cp "$release_source/package.json" "$release_source/package-lock.json" "$release_source/server.mjs" "$release_target/"
cp "$release_source/src/model.mjs" "$release_target/src/"
cp "$release_source/deploy/backup.py" "$release_source/deploy/account-admin.mjs" "$release_target/deploy/"
(cd "$release_target" && PATH="/opt/saldo-node/bin:$PATH" npm ci --omit=dev --ignore-scripts --no-audit --no-fund)
chmod -R a+rX "$release_target"
# Preserve existing site-specific settings outside the public source tree.
if [[ ! -f /etc/saldo.env ]]; then
  install -m 600 /dev/null /etc/saldo.env
  if [[ -f /etc/systemd/system/saldo.service ]]; then
    sed -n 's/^Environment=\(APP_ORIGIN\|COOKIE_PATH\)=/\1=/p' /etc/systemd/system/saldo.service >> /etc/saldo.env
  fi
fi
for unit in saldo.service saldo-backup.service saldo-backup.timer; do
  install -m 644 "$release_source/deploy/$unit" "/etc/systemd/system/$unit"
done
if [[ -L /opt/saldo/current ]]; then
  readlink /opt/saldo/current > /opt/saldo/previous-release
fi
ln -s "$release_target" /opt/saldo/current.next
mv -Tf /opt/saldo/current.next /opt/saldo/current
systemctl daemon-reload
systemctl enable saldo.service saldo-backup.timer
systemctl restart saldo.service
for attempt in {1..20}; do
  if curl -fsS http://127.0.0.1:3000/api/session; then break; fi
  sleep 1
done
curl -fsS http://127.0.0.1:3000/api/session
systemctl start saldo-backup.timer
systemctl start saldo-backup.service
systemctl is-active saldo.service saldo-backup.timer
printf '\nInstalled release: %s\n' "$release_target"
