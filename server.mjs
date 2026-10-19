import express from 'express';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, chmodSync } from 'node:fs';
import { randomBytes, scrypt, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { seed, emptyState, validState, preservePaidHistory } from './src/model.mjs';

process.umask(0o077);
const app = express(),
  production = process.env.NODE_ENV === 'production';
const cookiePath = process.env.COOKIE_PATH || '/',
  secure = process.env.COOKIE_SECURE === 'true';
const appOrigin = process.env.APP_ORIGIN ? new URL(process.env.APP_ORIGIN).origin : null;
const registrationOpen = process.env.ALLOW_REGISTRATION !== 'false';
const registrationMode = process.env.REGISTRATION_MODE === 'open' ? 'open' : 'invite';
const maxAccounts = Math.max(1, Math.min(10000, Number(process.env.MAX_ACCOUNTS) || 100));
const absoluteTimeout = 7 * 86400000,
  idleTimeout = 60 * 60000;
app.disable('x-powered-by');
app.set('trust proxy', process.env.TRUST_PROXY === 'false' ? false : 'loopback');
const dir = process.env.DATA_DIR || 'data';
mkdirSync(dir, { recursive: true, mode: 0o700 });
const db = new DatabaseSync(`${dir}/saldo.sqlite`);
chmodSync(`${dir}/saldo.sqlite`, 0o600);
db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE,password TEXT,state TEXT,revision INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT,expires INTEGER);
CREATE TABLE IF NOT EXISTS rate_limits(key TEXT PRIMARY KEY,count INTEGER NOT NULL,expires INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS rate_expiry ON rate_limits(expires);
CREATE TABLE IF NOT EXISTS invitations(token TEXT PRIMARY KEY,email TEXT NOT NULL,expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS recovery_codes(user_id TEXT PRIMARY KEY,token TEXT NOT NULL,expires INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS session_user ON sessions(user_id);`);
const columns = new Set(
  db
    .prepare('PRAGMA table_info(sessions)')
    .all()
    .map((c) => c.name),
);
for (const [name, type] of [
  ['created', 'INTEGER NOT NULL DEFAULT 0'],
  ['last_seen', 'INTEGER NOT NULL DEFAULT 0'],
  ['csrf', "TEXT NOT NULL DEFAULT ''"],
])
  if (!columns.has(name)) db.exec(`ALTER TABLE sessions ADD COLUMN ${name} ${type}`);
const now = Date.now();
db.prepare('UPDATE sessions SET created=?,last_seen=?,expires=MIN(expires,?) WHERE created=0').run(
  now,
  now,
  now + absoluteTimeout,
);
const demo = process.env.DEMO_MODE === 'true' || (!production && process.env.DEMO_MODE !== 'false');
if (production && demo) throw Error('Demo mode is not allowed in production.');
if (demo)
  db.prepare('INSERT OR IGNORE INTO users VALUES(?,?,?,?,0)').run(
    'local',
    'local',
    '',
    JSON.stringify(seed()),
  );
const demoCsrf = randomBytes(32).toString('hex'),
  hash = (t) => createHash('sha256').update(t).digest('hex');
const isWrite = (req) => !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
const constantEqual = (a, b) =>
  typeof a === 'string' &&
  typeof b === 'string' &&
  /^[a-f0-9]{64}$/.test(a) &&
  /^[a-f0-9]{64}$/.test(b) &&
  timingSafeEqual(Buffer.from(a), Buffer.from(b));
let lastCleanup = 0;
function limited(key, limit, windowMs) {
  const time = Date.now();
  if (time - lastCleanup > 60000) {
    db.prepare('DELETE FROM rate_limits WHERE expires<=?').run(time);
    db.prepare('DELETE FROM sessions WHERE expires<=? OR last_seen<=?').run(
      time,
      time - idleTimeout,
    );
    lastCleanup = time;
  }
  const id = hash(key),
    row = db.prepare('SELECT count,expires FROM rate_limits WHERE key=?').get(id);
  if (row && row.expires > time) {
    if (row.count >= limit) return Math.ceil((row.expires - time) / 1000);
    db.prepare('UPDATE rate_limits SET count=count+1 WHERE key=?').run(id);
  } else {
    if (!row && db.prepare('SELECT COUNT(*) AS n FROM rate_limits').get().n >= 10000) return 60;
    db.prepare('INSERT OR REPLACE INTO rate_limits VALUES(?,?,?)').run(id, 1, time + windowMs);
  }
  return 0;
}
function throttle(res, seconds) {
  return res
    .set('Retry-After', String(seconds))
    .status(429)
    .json({ error: 'Too many requests. Please try again later.' });
}
let activeRequests = 0;
app.use((req, res, next) => {
  if (activeRequests >= 32) return throttle(res, 2);
  activeRequests++;
  let released = false;
  const release = () => {
    if (!released) {
      released = true;
      activeRequests--;
    }
  };
  res.on('finish', release);
  res.on('close', release);
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
  });
  if (production) {
    res.set(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'" +
        (secure ? '; upgrade-insecure-requests' : ''),
    );
    if (secure) res.set('Strict-Transport-Security', 'max-age=31536000');
  }
  if (!req.path.startsWith('/assets/')) res.set('Cache-Control', 'no-store');
  next();
});
app.use('/api', (req, res, next) => {
  const retry = limited(`api:${req.ip}`, 240, 60000);
  if (retry) return throttle(res, retry);
  if (req.get('Sec-Fetch-Site') === 'cross-site')
    return res.status(403).json({ error: 'Cross-site requests are not allowed.' });
  if (isWrite(req)) {
    const expected = appOrigin || `${req.protocol}://${req.get('host')}`;
    if (req.get('origin')) {
      let origin;
      try {
        origin = new URL(req.get('origin')).origin;
      } catch {}
      if (origin !== expected) return res.status(403).json({ error: 'Invalid origin' });
    }
    if (req.get('X-Saldo-Request') !== '1')
      return res.status(403).json({ error: 'Missing request protection header. Refresh the app.' });
    if (!req.is('application/json'))
      return res.status(415).json({ error: 'Use application/json.' });
  }
  next();
});
const smallJson = express.json({ limit: '16kb', strict: true }),
  largeJson = express.json({ limit: '2mb', strict: true });
app.use('/api', (req, res, next) =>
  (req.path.startsWith('/auth/') ||
    req.path.startsWith('/security/') ||
    req.path.startsWith('/recovery/')
    ? smallJson
    : largeJson)(req, res, next),
);
function cookieToken(req) {
  const raw = req.headers.cookie?.match(/(?:^|; )saldo=([^;]+)/)?.[1];
  return raw && /^[a-f0-9]{64}$/.test(raw) ? raw : null;
}
function account(req) {
  if (req.resolved) return req.account;
  req.resolved = true;
  const raw = cookieToken(req),
    token = raw && hash(raw),
    session = token && db.prepare('SELECT * FROM sessions WHERE token=?').get(token),
    time = Date.now();
  if (session && session.expires > time && session.last_seen > time - idleTimeout) {
    const user = db.prepare('SELECT * FROM users WHERE id=?').get(session.user_id);
    if (user) {
      if (!session.csrf) {
        session.csrf = randomBytes(32).toString('hex');
        db.prepare('UPDATE sessions SET csrf=? WHERE token=?').run(session.csrf, token);
      }
      if (time - session.last_seen > 60000)
        db.prepare('UPDATE sessions SET last_seen=? WHERE token=?').run(time, token);
      req.session = session;
      req.account = user;
      return user;
    }
  }
  if (session) db.prepare('DELETE FROM sessions WHERE token=?').run(token);
  req.account = demo ? db.prepare('SELECT * FROM users WHERE id=?').get('local') : null;
  return req.account;
}
function csrf(req, res, next) {
  const user = account(req);
  if (!user)
    return res
      .status(401)
      .json({ error: 'Your session expired. Sign in again.', code: 'AUTH_REQUIRED' });
  if (isWrite(req) && !constantEqual(req.get('X-CSRF-Token'), req.session?.csrf || demoCsrf))
    return res.status(403).json({ error: 'Session protection expired. Refresh the app.' });
  next();
}
function setCookie(res, token) {
  res.set(
    'Set-Cookie',
    `saldo=${token}; HttpOnly; SameSite=Strict; Path=${cookiePath}; Max-Age=${absoluteTimeout / 1000}${secure ? '; Secure' : ''}`,
  );
}
function issueSession(req, res, id) {
  const raw = cookieToken(req);
  if (raw) db.prepare('DELETE FROM sessions WHERE token=?').run(hash(raw));
  const token = randomBytes(32).toString('hex'),
    csrfToken = randomBytes(32).toString('hex'),
    time = Date.now();
  db.prepare(
    'INSERT INTO sessions(token,user_id,expires,created,last_seen,csrf) VALUES(?,?,?,?,?,?)',
  ).run(hash(token), id, time + absoluteTimeout, time, time, csrfToken);
  db.prepare(
    'DELETE FROM sessions WHERE user_id=? AND token NOT IN (SELECT token FROM sessions WHERE user_id=? ORDER BY created DESC,rowid DESC LIMIT 5)',
  ).run(id, id);
  setCookie(res, token);
  return csrfToken;
}
app.get('/api/session', (req, res) => {
  const user = account(req);
  res.json({
    authenticated: !!user,
    email: user?.email,
    demo: user?.id === 'local',
    registrationOpen,
    registrationMode,
    csrfToken: user ? req.session?.csrf || demoCsrf : undefined,
  });
});
const derive = promisify(scrypt);
let activeHashes = 0;
async function passwordKey(password, salt, modern = true) {
  if (activeHashes >= 4) {
    const error = Error('Authentication busy');
    error.status = 429;
    throw error;
  }
  activeHashes++;
  try {
    return await derive(password, salt, 64, {
      N: modern ? 32768 : 16384,
      r: 8,
      p: 1,
      maxmem: 64 * 1024 * 1024,
    });
  } finally {
    activeHashes--;
  }
}
const fakeSalt = 'a1'.repeat(16),
  fakeKey = (await passwordKey('not-an-account-password', fakeSalt)).toString('hex');
async function encodedPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return `s2:${salt}:${(await passwordKey(password, salt)).toString('hex')}`;
}
async function verifyPassword(password, encoded) {
  const parts = encoded?.split(':') || [],
    modern = parts[0] === 's2',
    salt = modern ? parts[1] : parts[0],
    key = modern ? parts[2] : parts[1],
    valid = /^[a-f0-9]{32}$/.test(salt || '') && /^[a-f0-9]{128}$/.test(key || '');
  const derived = await passwordKey(password, valid ? salt : fakeSalt, valid ? modern : true);
  return valid && timingSafeEqual(derived, Buffer.from(key, 'hex'));
}
function authLimits(req, res, email, register = false) {
  let retry =
    limited(`auth-ip:${req.ip}`, 30, 15 * 60000) || limited(`auth-email:${email}`, 10, 15 * 60000);
  if (!retry && register)
    retry = limited(`register-ip:${req.ip}`, 5, 3600000) || limited('register-global', 30, 3600000);
  if (retry) {
    throttle(res, retry);
    return true;
  }
  return false;
}
app.post('/api/auth/:action', async (req, res) => {
  const { email, password, name, inviteCode } = req.body || {},
    action = req.params.action;
  if (!['register', 'login'].includes(action))
    return res.status(404).json({ error: 'API endpoint not found.' });
  if (action === 'register' && !registrationOpen)
    return res.status(403).json({ error: 'New account registration is disabled.' });
  if (
    typeof email !== 'string' ||
    email.length > 254 ||
    !/^\S+@\S+\.\S+$/.test(email.trim()) ||
    typeof password !== 'string' ||
    password.length < 10 ||
    password.length > 1024 ||
    (action === 'register' && password.length < 12)
  )
    return res.status(400).json({
      error: 'Use a valid email and a password of at least 12 characters for new accounts.',
    });
  if (name !== undefined && (typeof name !== 'string' || !name.trim() || name.length > 100))
    return res.status(400).json({ error: 'Enter a profile name of up to 100 characters.' });
  const normalized = email.toLowerCase().trim();
  if (authLimits(req, res, normalized, action === 'register')) return;
  let user = db.prepare('SELECT * FROM users WHERE email=?').get(normalized);
  let recoveryCode;
  if (action === 'register') {
    const passwordHash = await encodedPassword(password);
    const invite =
      typeof inviteCode === 'string' && inviteCode.length <= 200
        ? db
            .prepare('SELECT * FROM invitations WHERE token=? AND email=? AND expires>?')
            .get(hash(inviteCode), normalized, Date.now())
        : null;
    if ((registrationMode === 'invite' && (!invite || user)) || user)
      return res.json({
        ok: true,
        message:
          'An invitation is required to create an account. If you already have an account, sign in or use password recovery.',
      });
    if (db.prepare("SELECT COUNT(*) AS n FROM users WHERE id<>'local'").get().n >= maxAccounts)
      return res.status(503).json({ error: 'New accounts are temporarily unavailable.' });
    const id = randomBytes(16).toString('hex');
    const inserted = db
      .prepare('INSERT OR IGNORE INTO users VALUES(?,?,?,?,0)')
      .run(id, normalized, passwordHash, JSON.stringify(emptyState(name)));
    if (!inserted.changes)
      return res.json({
        ok: true,
        message:
          'An invitation is required to create an account. If you already have an account, sign in or use password recovery.',
      });
    user = { id };
    if (invite) db.prepare('DELETE FROM invitations WHERE token=?').run(invite.token);
    recoveryCode = randomBytes(32).toString('hex');
    db.prepare('INSERT OR REPLACE INTO recovery_codes VALUES(?,?,?)').run(
      id,
      hash(recoveryCode),
      Date.now() + 365 * 86400000,
    );
  } else {
    const verified = await verifyPassword(password, user?.password || `s2:${fakeSalt}:${fakeKey}`);
    if (
      !user ||
      !verified ||
      db.prepare('SELECT password FROM users WHERE id=?').get(user.id)?.password !== user.password
    )
      return res.status(401).json({ error: 'Email or password is incorrect.' });
    if (!user.password.startsWith('s2:')) {
      const upgraded = await encodedPassword(password);
      const changed = db
        .prepare('UPDATE users SET password=? WHERE id=? AND password=?')
        .run(upgraded, user.id, user.password);
      if (!changed.changes)
        return res.status(401).json({ error: 'Email or password is incorrect.' });
    }
  }
  res.json({
    ok: true,
    csrfToken: issueSession(req, res, user.id),
    ...(recoveryCode ? { recoveryCode } : {}),
  });
});
app.post('/api/recovery/reset', async (req, res) => {
  const { email, code, newPassword } = req.body || {};
  if (
    typeof email !== 'string' ||
    email.length > 254 ||
    typeof code !== 'string' ||
    code.length > 200 ||
    typeof newPassword !== 'string' ||
    newPassword.length < 12 ||
    newPassword.length > 1024
  )
    return res.status(400).json({
      error: 'Enter your email, recovery code and a new password of at least 12 characters.',
    });
  const normalized = email.trim().toLowerCase();
  if (authLimits(req, res, normalized)) return;
  const user = db.prepare('SELECT id FROM users WHERE email=?').get(normalized),
    token = hash(code.trim()),
    record =
      user &&
      db
        .prepare('SELECT * FROM recovery_codes WHERE user_id=? AND token=? AND expires>?')
        .get(user.id, token, Date.now());
  if (!record)
    return res.status(400).json({
      error:
        'The recovery details are invalid or expired. Contact the server administrator if you need a reset code.',
    });
  const password = await encodedPassword(newPassword);
  db.exec('BEGIN IMMEDIATE');
  try {
    const consumed = db
      .prepare('DELETE FROM recovery_codes WHERE user_id=? AND token=?')
      .run(user.id, token);
    if (!consumed.changes) {
      db.exec('ROLLBACK');
      return res.status(400).json({
        error:
          'The recovery details are invalid or expired. Contact the server administrator if you need a reset code.',
      });
    }
    db.prepare('UPDATE users SET password=? WHERE id=?').run(password, user.id);
    db.prepare('DELETE FROM sessions WHERE user_id=?').run(user.id);
    db.exec('COMMIT');
    res.json({ ok: true });
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
});
app.use('/api', csrf);
app.post('/api/logout', (req, res) => {
  if (req.session) db.prepare('DELETE FROM sessions WHERE token=?').run(req.session.token);
  res.set(
    'Set-Cookie',
    `saldo=; HttpOnly; SameSite=Strict; Path=${cookiePath}; Max-Age=0${secure ? '; Secure' : ''}`,
  );
  res.json({ ok: true });
});
app.get('/api/security', (req, res) =>
  res.json({
    activeSessions: req.session
      ? db
          .prepare(
            'SELECT COUNT(*) AS n FROM sessions WHERE user_id=? AND expires>? AND last_seen>?',
          )
          .get(req.account.id, Date.now(), Date.now() - idleTimeout).n
      : 0,
    idleMinutes: idleTimeout / 60000,
    maximumDays: absoluteTimeout / 86400000,
    recoveryEnabled: !!db
      .prepare('SELECT 1 FROM recovery_codes WHERE user_id=? AND expires>?')
      .get(req.account.id, Date.now()),
  }),
);
app.post('/api/security/revoke-others', (req, res) => {
  if (req.session)
    db.prepare('DELETE FROM sessions WHERE user_id=? AND token<>?').run(
      req.account.id,
      req.session.token,
    );
  res.json({ ok: true });
});
app.post('/api/security/password', async (req, res) => {
  if (req.account.id === 'local')
    return res.status(400).json({ error: 'Create a private account first.' });
  const { currentPassword, newPassword } = req.body || {};
  if (
    typeof currentPassword !== 'string' ||
    currentPassword.length > 1024 ||
    typeof newPassword !== 'string' ||
    newPassword.length < 12 ||
    newPassword.length > 1024 ||
    newPassword === currentPassword
  )
    return res.status(400).json({ error: 'Choose a different password of 12–1024 characters.' });
  if (authLimits(req, res, req.account.email)) return;
  if (!(await verifyPassword(currentPassword, req.account.password)))
    return res.status(401).json({ error: 'Current password is incorrect.' });
  const password = await encodedPassword(newPassword);
  db.exec('BEGIN IMMEDIATE');
  try {
    const changed = db
      .prepare('UPDATE users SET password=? WHERE id=? AND password=?')
      .run(password, req.account.id, req.account.password);
    if (!changed.changes) {
      db.exec('ROLLBACK');
      return res
        .status(409)
        .json({ error: 'Credentials changed in another session. Sign in again.' });
    }
    db.prepare('DELETE FROM sessions WHERE user_id=?').run(req.account.id);
    const csrfToken = issueSession(req, res, req.account.id);
    db.exec('COMMIT');
    res.json({ ok: true, csrfToken });
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
});
app.post('/api/security/recovery-code', async (req, res) => {
  const { currentPassword } = req.body || {};
  if (typeof currentPassword !== 'string' || currentPassword.length > 1024)
    return res.status(400).json({ error: 'Enter your current password.' });
  if (authLimits(req, res, req.account.email)) return;
  if (!(await verifyPassword(currentPassword, req.account.password)))
    return res.status(401).json({ error: 'Current password is incorrect.' });
  const recoveryCode = randomBytes(32).toString('hex');
  db.prepare('INSERT OR REPLACE INTO recovery_codes VALUES(?,?,?)').run(
    req.account.id,
    hash(recoveryCode),
    Date.now() + 365 * 86400000,
  );
  res.json({ recoveryCode });
});
app.get('/api/state', (req, res) =>
  res.json({ state: JSON.parse(req.account.state), revision: req.account.revision }),
);
app.put('/api/state', (req, res) => {
  const retry = limited(`write:${req.account.id}`, 60, 60000);
  if (retry) return throttle(res, retry);
  const { state, revision } = req.body || {};
  if (!Number.isSafeInteger(revision) || revision < 0 || !validState(state))
    return res.status(400).json({ error: 'Invalid finance data.' });
  const next = preservePaidHistory(JSON.parse(req.account.state), structuredClone(state));
  if (!validState(next)) return res.status(400).json({ error: 'Invalid finance data.' });
  const encoded = JSON.stringify(next);
  if (Buffer.byteLength(encoded) > 2 * 1024 * 1024)
    return res.status(413).json({
      error:
        'Finance history exceeds the account size limit. Export a backup before reducing old records.',
    });
  const result = db
    .prepare('UPDATE users SET state=?,revision=revision+1 WHERE id=? AND revision=?')
    .run(encoded, req.account.id, revision);
  if (!result.changes)
    return res.status(409).json({
      error:
        'Data changed in another tab. Your draft is preserved. Review and combine the changes.',
      code: 'STATE_CONFLICT',
    });
  res.json({ revision: revision + 1, state: next });
});
app.use('/api', (req, res) => res.status(404).json({ error: 'API endpoint not found.' }));
app.use((error, req, res, next) => {
  if (req.path.startsWith('/api/')) {
    if (error.status === 429) return throttle(res, 2);
    return res.status([400, 413, 415].includes(error.status) ? error.status : 500).json({
      error:
        error.status === 413
          ? 'This backup is too large.'
          : error.status === 400
            ? 'Invalid JSON request.'
            : 'Could not process this request.',
    });
  }
  next(error);
});
if (production) {
  app.use(express.static('dist', { dotfiles: 'deny', index: false }));
  app.get('/{*path}', (req, res) => {
    if (/(?:^|\/)\.[^/]|\.(?:sqlite|env|mjs|ya?ml|map)$/.test(req.path)) return res.sendStatus(404);
    res.sendFile('index.html', { root: `${process.cwd()}/dist` });
  });
} else {
  const { createServer } = await import('vite');
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
  app.use(vite.middlewares);
}
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  res
    .status(error.status === 404 ? 404 : 500)
    .type('text')
    .send('Resource unavailable.');
});
const server = app.listen(process.env.PORT || 3000, process.env.HOST || '0.0.0.0', () =>
  console.log(
    `Saldo running at http://localhost:${process.env.PORT || 3000} (${demo ? 'local demo enabled' : 'account sign-in required'})`,
  ),
);
server.requestTimeout = 15000;
server.headersTimeout = 10000;
server.keepAliveTimeout = 5000;
server.maxRequestsPerSocket = 1000;
