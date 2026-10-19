import test from 'node:test';
import assert from 'node:assert/strict';
import { testServer } from './helpers/http.mjs';
test('private accounts, persistence, conflict protection, invalid data and logout', async () => {
  const server = await testServer(3197);
  const { request, base, tokens } = server;
  try {
    assert.equal((await request('state')).status, 401);
    const reg = await request('auth/register', 'POST', {
      email: 'test@example.com',
      password: 'very-long-password',
      name: 'Alex',
    });
    assert.equal(reg.status, 200);
    assert.match(reg.cookie, /saldo=/);
    const a = await request('state', 'GET', null, reg.cookie);
    assert.equal(a.body.state.profiles.length, 1);
    assert.equal(a.body.state.profiles[0].name, 'Alex');
    assert.equal(a.body.state.profiles[0].income, 0);
    for (const key of ['bills', 'debts', 'tasks', 'payments', 'expenses'])
      assert.deepEqual(a.body.state[key], []);
    a.body.state.profiles[0].income = 12000;
    a.body.state.appearance = { color: 'violet', mode: 'dark' };
    assert.equal((await request('state', 'PUT', a.body, reg.cookie)).body.revision, 1);
    assert.equal((await request('state', 'PUT', a.body, reg.cookie)).status, 409);
    const persisted = await request('state', 'GET', null, reg.cookie);
    assert.equal(persisted.body.state.profiles[0].income, 12000);
    assert.deepEqual(persisted.body.state.appearance, { color: 'violet', mode: 'dark' });
    const invalid = structuredClone(persisted.body);
    invalid.state.profiles[0].income = -10;
    assert.equal((await request('state', 'PUT', invalid, reg.cookie)).status, 400);
    for (const state of [
      null,
      { profiles: [null] },
      [],
      { ...persisted.body.state, bills: [{ id: 'bad', name: 'Bad bill', amount: 1 }] },
    ])
      assert.equal((await request('state', 'PUT', { state, revision: 1 }, reg.cookie)).status, 400);
    assert.equal((await request('missing-endpoint', 'GET', null, reg.cookie)).status, 404);
    assert.equal(
      (
        await request('state', 'PUT', persisted.body, reg.cookie, {
          Origin: 'https://unrelated.invalid',
        })
      ).status,
      403,
    );
    const malformed = await fetch(base + '/api/state', {
      method: 'PUT',
      headers: {
        Cookie: reg.cookie,
        'X-CSRF-Token': tokens.get(reg.cookie),
        'X-Saldo-Request': '1',
        'Content-Type': 'application/json',
      },
      body: '{broken',
    });
    assert.equal(malformed.status, 400);
    assert.equal(
      (
        await request('auth/register', 'POST', {
          email: 'invalid@example.com',
          password: 'long-enough-password',
          name: ' ',
        })
      ).status,
      400,
    );
    const other = await request('auth/register', 'POST', {
      email: 'other@example.com',
      password: 'another-long-password',
    });
    const otherState = (await request('state', 'GET', null, other.cookie)).body.state;
    assert.equal(otherState.profiles[0].income, 0);
    assert.equal(otherState.appearance, undefined);
    assert.equal(
      (
        await request('auth/login', 'POST', {
          email: 'test@example.com',
          password: 'wrong-password',
        })
      ).status,
      401,
    );
    const login = await request('auth/login', 'POST', {
      email: 'test@example.com',
      password: 'very-long-password',
    });
    assert.equal(login.status, 200);
    await request('logout', 'POST', {}, login.cookie);
    assert.equal((await request('state', 'GET', null, login.cookie)).status, 401);
  } finally {
    await server.stop();
  }
});
