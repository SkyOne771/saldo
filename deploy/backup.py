#!/usr/bin/env python3
"""Online consistent SQLite backup; retain seven daily snapshots."""
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path
import os
import sqlite3

os.umask(0o077)
root = Path('/var/backups/saldo')
root.mkdir(parents=True, exist_ok=True)
target = root / ('saldo-' + datetime.now(timezone.utc).strftime('%Y-%m-%d') + '.sqlite')
temporary = target.with_suffix('.tmp')
with closing(sqlite3.connect('file:/var/lib/saldo/saldo.sqlite?mode=ro', uri=True)) as source:
    with closing(sqlite3.connect(temporary)) as dest:
        source.backup(dest)
        dest.execute('PRAGMA journal_mode=DELETE')
        result = dest.execute('PRAGMA integrity_check').fetchone()[0]
        if result != 'ok':
            raise RuntimeError('Backup integrity check failed')
os.replace(temporary, target)
for old in sorted(root.glob('saldo-*.sqlite'), reverse=True)[7:]:
    old.unlink()
print('Backup completed:', target)
