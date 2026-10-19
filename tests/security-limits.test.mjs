import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { testServer } from './helpers/http.mjs';
test('account quota and authentication throttles persist across service restarts', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'saldo-limits-'));
  let s;
  try {
    s = await testServer(3195, { DATA_DIR: dir, MAX_ACCOUNTS: '1' });
    assert.equal(
      (
        await s.request('auth/register', 'POST', {
          email: 'one@example.com',
          password: 'first-limit-password',
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await s.request('auth/register', 'POST', {
          email: 'two@example.com',
          password: 'second-limit-password',
        })
      ).status,
      503,
    );
    for (let i = 0; i < 10; i++)
      assert.equal(
        (
          await s.request('auth/login', 'POST', {
            email: 'bad@example.com',
            password: 'wrong-limit-password',
          })
        ).status,
        401,
      );
    assert.equal(
      (
        await s.request('auth/login', 'POST', {
          email: 'bad@example.com',
          password: 'wrong-limit-password',
        })
      ).status,
      429,
    );
    await s.stop();
    s = null;
    s = await testServer(3195, { DATA_DIR: dir });
    assert.equal(
      (
        await s.request('auth/login', 'POST', {
          email: 'bad@example.com',
          password: 'wrong-limit-password',
        })
      ).status,
      429,
    );
  } finally {
    if (s) await s.stop();
    await rm(dir, { recursive: true, force: true });
  }
});
test('registration can be disabled and general API throttling ignores spoofed forwarding headers', async () => {
  const s = await testServer(3194, { ALLOW_REGISTRATION: 'false' });
  try {
    assert.equal((await s.request('session')).body.registrationOpen, false);
    assert.equal(
      (
        await s.request('auth/register', 'POST', {
          email: 'closed@example.com',
          password: 'closed-test-password',
        })
      ).status,
      403,
    );
    let response;
    for (let i = 0; i < 242; i++)
      response = await s.request('session', 'GET', null, null, {
        'X-Forwarded-For': `203.0.113.${i % 255}`,
      });
    assert.equal(response.status, 429);
    assert.ok(+response.headers.get('retry-after') > 0);
  } finally {
    await s.stop();
  }
});
