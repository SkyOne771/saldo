// Run as the dedicated Saldo user; prints a secret intended for the account owner.
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, createHash } from 'node:crypto';
const [action, emailArg] = process.argv.slice(2),
  email = emailArg?.trim().toLowerCase();
if (!['invite', 'reset'].includes(action) || !email || !/^\S+@\S+\.\S+$/.test(email)) {
  console.error('Usage: DATA_DIR=/var/lib/saldo node deploy/account-admin.mjs invite|reset email');
  process.exit(1);
}
const db = new DatabaseSync(`${process.env.DATA_DIR || 'data'}/saldo.sqlite`),
  token = randomBytes(32).toString('hex'),
  digest = createHash('sha256').update(token).digest('hex');
try {
  if (action === 'invite') {
    if (db.prepare('SELECT 1 FROM users WHERE email=?').get(email))
      throw Error('Account already exists; use reset if the owner requests recovery.');
    db.prepare('INSERT INTO invitations VALUES(?,?,?)').run(
      digest,
      email,
      Date.now() + 7 * 86400000,
    );
    console.log(
      'Invitation code (valid for 7 days; share privately with this email owner):\n' + token,
    );
  } else {
    const user = db.prepare('SELECT id FROM users WHERE email=?').get(email);
    if (!user) throw Error('Account not found.');
    db.prepare('INSERT OR REPLACE INTO recovery_codes VALUES(?,?,?)').run(
      user.id,
      digest,
      Date.now() + 30 * 60000,
    );
    console.log(
      'One-use password recovery code (valid for 30 minutes; share privately with the verified owner):\n' +
        token,
    );
  }
} finally {
  db.close();
}
