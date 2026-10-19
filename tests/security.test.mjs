import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { createHash, scryptSync } from 'node:crypto';
import { join } from 'node:path';
import { testServer } from './helpers/http.mjs';
test('CSRF, security headers, account isolation, session controls, rate limits and legacy login', async () => {
  const s = await testServer(3196, {
    APP_ORIGIN: 'https://finance.example.test',
    COOKIE_SECURE: 'true',
    COOKIE_PATH: '/finance/',
  });
  const { request, base } = s;
  let db;
  try {
    const document = await fetch(base + '/');
    assert.equal(document.status, 200);
    assert.match(document.headers.get('content-security-policy'), /script-src 'self'/);
    const first = await request('auth/register', 'POST', {
      name: 'Security user',
      email: 'security@example.com',
      password: 'security-test-password',
    });
    assert.equal(first.status, 200);
    assert.match(first.headers.get('set-cookie'), /HttpOnly/);
    assert.match(first.headers.get('set-cookie'), /SameSite=Strict/);
    assert.match(first.headers.get('set-cookie'), /Secure/);
    assert.match(first.headers.get('set-cookie'), /Path=\/finance\//);
    assert.equal(first.headers.get('x-powered-by'), null);
    assert.match(first.headers.get('content-security-policy'), /script-src 'self'/);
    assert.match(first.headers.get('content-security-policy'), /frame-ancestors 'none'/);
    assert.equal(first.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(first.headers.get('x-frame-options'), 'DENY');
    assert.equal(first.headers.get('referrer-policy'), 'no-referrer');
    assert.match(first.headers.get('strict-transport-security'), /31536000/);
    assert.equal(first.headers.get('access-control-allow-origin'), null);
    const state = (await request('state', 'GET', null, first.cookie)).body;
    assert.equal(
      (await request('state', 'PUT', state, first.cookie, { 'X-CSRF-Token': '' })).status,
      403,
    );
    assert.equal(
      (await request('state', 'PUT', state, first.cookie, { 'X-CSRF-Token': 'a'.repeat(64) }))
        .status,
      403,
    );
    assert.equal(
      (await request('state', 'PUT', state, first.cookie, { 'X-Saldo-Request': '' })).status,
      403,
    );
    assert.equal(
      (
        await request('state', 'PUT', state, first.cookie, {
          Origin: 'http://finance.example.test',
        })
      ).status,
      403,
    );
    assert.equal(
      (await request('state', 'PUT', state, first.cookie, { Origin: 'https://evil.test' })).status,
      403,
    );
    assert.equal(
      (await request('state', 'PUT', state, first.cookie, { 'Sec-Fetch-Site': 'cross-site' }))
        .status,
      403,
    );
    assert.equal(
      (await request('state', 'PUT', state, first.cookie, { 'Content-Type': 'text/plain' })).status,
      415,
    );
    assert.equal(
      (
        await request('state', 'PUT', state, first.cookie, {
          Origin: 'https://finance.example.test',
        })
      ).status,
      200,
    );
    const second = await request('auth/register', 'POST', {
      name: 'Another',
      email: 'another@example.com',
      password: 'another-security-password',
    });
    assert.equal(second.status, 200);
    assert.equal(
      (
        await request('state', 'PUT', { ...state, revision: 0 }, second.cookie, {
          'X-CSRF-Token': s.tokens.get(first.cookie),
        })
      ).status,
      403,
    );
    assert.equal(
      (await request('state?userId=someone-else', 'GET', null, second.cookie)).body.state
        .profiles[0].name,
      'Another',
    );
    const forged = await request('state', 'GET', null, 'saldo=' + 'a'.repeat(64));
    assert.equal(forged.status, 401);
    const oldLogin = await request('auth/login', 'POST', {
      email: 'security@example.com',
      password: 'security-test-password',
    });
    assert.equal(oldLogin.status, 200);
    assert.equal((await request('security', 'GET', null, first.cookie)).body.activeSessions, 2);
    assert.equal((await request('security/revoke-others', 'POST', {}, first.cookie)).status, 200);
    assert.equal((await request('state', 'GET', null, oldLogin.cookie)).status, 401);
    assert.equal(
      (
        await request(
          'security/password',
          'POST',
          { currentPassword: 'incorrect-password', newPassword: 'new-unique-password' },
          first.cookie,
        )
      ).status,
      401,
    );
    const change = await request(
      'security/password',
      'POST',
      { currentPassword: 'security-test-password', newPassword: 'new-unique-password' },
      first.cookie,
    );
    assert.equal(change.status, 200);
    assert.notEqual(change.cookie, first.cookie);
    assert.equal((await request('state', 'GET', null, first.cookie)).status, 401);
    assert.equal((await request('state', 'GET', null, change.cookie)).status, 200);
    assert.equal(
      (
        await request('auth/login', 'POST', {
          email: 'security@example.com',
          password: 'security-test-password',
        })
      ).status,
      401,
    );
    assert.equal(
      (
        await request('auth/login', 'POST', {
          email: 'security@example.com',
          password: 'new-unique-password',
        })
      ).status,
      200,
    );
    // Idle/absolute expiry are enforced on the server, not just by the cookie.
    db = new DatabaseSync(join(s.dir, 'saldo.sqlite'));
    const raw = change.cookie.split('=')[1],
      token = createHash('sha256').update(raw).digest('hex');
    db.prepare('UPDATE sessions SET last_seen=? WHERE token=?').run(Date.now() - 61 * 60000, token);
    assert.equal((await request('state', 'GET', null, change.cookie)).status, 401);
    const salt = 'ab'.repeat(16),
      legacy = salt + ':' + scryptSync('legacy-test-password', salt, 64).toString('hex');
    db.prepare('INSERT INTO users VALUES(?,?,?,?,0)').run(
      'legacy',
      'legacy@example.com',
      legacy,
      JSON.stringify(state.state),
    );
    const old = await request('auth/login', 'POST', {
      email: 'legacy@example.com',
      password: 'legacy-test-password',
    });
    assert.equal(old.status, 200);
    assert.match(
      db.prepare('SELECT password FROM users WHERE id=?').get('legacy').password,
      /^s2:/,
    );
    const rawOld = old.cookie.split('=')[1];
    db.prepare('UPDATE sessions SET expires=? WHERE token=?').run(
      Date.now() - 1,
      createHash('sha256').update(rawOld).digest('hex'),
    );
    assert.equal((await request('state', 'GET', null, old.cookie)).status, 401);
    const multi = await request('auth/register', 'POST', {
      email: 'sessions@example.com',
      password: 'session-cap-password',
    });
    const sessions = [multi];
    for (let i = 0; i < 6; i++)
      sessions.push(
        await request('auth/login', 'POST', {
          email: 'sessions@example.com',
          password: 'session-cap-password',
        }),
      );
    assert.ok(sessions.every((x) => x.status === 200));
    assert.equal((await request('state', 'GET', null, sessions[0].cookie)).status, 401);
    assert.equal(
      (await request('security', 'GET', null, sessions.at(-1).cookie)).body.activeSessions,
      5,
    );
    let rate;
    for (let i = 0; i < 11; i++)
      rate = await request(
        'auth/login',
        'POST',
        { email: 'guess@example.com', password: 'wrong-test-password' },
        null,
        { 'X-Forwarded-For': '203.0.113.' + i },
      );
    assert.equal(rate.status, 429);
    assert.ok(+rate.headers.get('retry-after') > 0);
    for (const path of ['/.env', '/data/saldo.sqlite', '/server.mjs', '/.git/config']) {
      const r = await fetch(base + path);
      assert.equal(r.status, 404);
      assert.ok(!(await r.text()).includes('SQLite format'));
    }
    const oversized = await request('auth/login', 'POST', {
      email: 'large@example.com',
      password: 'x'.repeat(20000),
    });
    assert.equal(oversized.status, 413);
  } finally {
    db?.close();
    await s.stop();
  }
});
