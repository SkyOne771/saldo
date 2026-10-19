import test from 'node:test';
import assert from 'node:assert/strict';
import {
  seed,
  sharedBalance,
  billForMonth,
  editBillForMonth,
  setBillPaid,
  setMonthlyIncome,
  incomeForMonth,
  billDueDate,
  billStatus,
  preservePaidHistory,
  validState,
  setBillSharing,
  deleteProfile,
} from '../src/model.mjs';
import { mergeFinance } from '../src/merge.mjs';
import { testServer } from './helpers/http.mjs';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
test('F01 later bill changes preserve paid settlements including legacy paid records', () => {
  const s = seed(),
    b = s.bills[0];
  b.amount = 1000;
  b.paid['2026-10'] = true;
  const before = sharedBalance(s, 'sam', '2026-10');
  editBillForMonth(s, b.id, { ...b, amount: 2000, shared: false }, '2026-11');
  assert.equal(before, 500);
  assert.equal(sharedBalance(s, 'sam', '2026-10'), 500);
  assert.equal(billForMonth(s, b, '2026-11').amount, 2000);
  assert.equal(billForMonth(s, b, '2026-10').amount, 1000);
  assert.equal(billForMonth(s, b, '2026-12').shared, false);
  assert.ok(validState(s));
  const next = structuredClone(seed()),
    old = structuredClone(next);
  old.bills[0].paid['2026-10'] = true;
  next.bills[0].paid['2026-10'] = true;
  next.bills[0].amount = 9000;
  preservePaidHistory(old, next);
  assert.equal(sharedBalance(next, 'sam', '2026-10'), 600);
});
test('F01 intentional edits to a selected paid month do not change another paid month', () => {
  const s = seed(),
    b = s.bills[0];
  setBillPaid(s, b.id, '2026-09', true);
  setBillPaid(s, b.id, '2026-10', true);
  editBillForMonth(s, b.id, { ...billForMonth(s, b, '2026-10'), amount: 1000 }, '2026-10');
  assert.equal(sharedBalance(s, 'sam', '2026-09'), 600);
  assert.equal(sharedBalance(s, 'sam', '2026-10'), 500);
  setBillPaid(s, b.id, '2026-10', false);
  assert.equal(billForMonth(s, b, '2026-10').amount, 1000);
  assert.ok(validState(s));
  deleteProfile(s, 'alex', 'sam');
  assert.ok(validState(s));
});
test('F02 monthly income changes preserve earlier months and take effect forward', () => {
  const p = seed().profiles[0];
  setMonthlyIncome(p, '2026-11', 12000);
  setMonthlyIncome(p, '2027-01', 13000);
  assert.equal(incomeForMonth(p, '2026-10'), 8000);
  assert.equal(incomeForMonth(p, '2026-11'), 12000);
  assert.equal(incomeForMonth(p, '2026-12'), 12000);
  assert.equal(incomeForMonth(p, '2027-01'), 13000);
  setMonthlyIncome(p, '2026-11', 11500);
  assert.equal(incomeForMonth(p, '2027-01'), 13000);
});
test('F03 due dates support 29 to 31, clamp short months and handle leap years', () => {
  const b = seed().bills[0];
  b.day = 31;
  assert.equal(billDueDate(b, '2026-02'), '2026-02-28');
  assert.equal(billDueDate(b, '2028-02'), '2028-02-29');
  assert.equal(billDueDate(b, '2026-04'), '2026-04-30');
  assert.equal(billDueDate(b, '2026-05'), '2026-05-31');
  assert.equal(billStatus(b, '2026-02', new Date(2026, 1, 28)), 'Due today');
  const s = seed();
  s.bills[0].day = 31;
  assert.ok(validState(s));
  s.bills[0].day = 32;
  assert.equal(validState(s), false);
});
test('F05 three-way recovery combines independent edits and exposes same-field/deletion conflicts', () => {
  const base = seed(),
    mine = structuredClone(base),
    remote = structuredClone(base);
  mine.bills[0].amount = 1000;
  remote.tasks[0].status = 'Done';
  let r = mergeFinance(base, mine, remote);
  assert.equal(r.conflicts.length, 0);
  assert.equal(r.state.bills[0].amount, 1000);
  assert.equal(r.state.tasks[0].status, 'Done');
  remote.bills[0].amount = 2000;
  r = mergeFinance(base, mine, remote, 'mine');
  assert.equal(r.conflicts.length, 1);
  assert.equal(r.state.bills[0].amount, 1000);
  assert.equal(mergeFinance(base, mine, remote, 'latest').state.bills[0].amount, 2000);
  remote.bills.shift();
  assert.equal(
    mergeFinance(base, mine, remote, 'latest').state.bills.length,
    base.bills.length - 1,
  );
  assert.equal(mergeFinance(base, mine, remote, 'mine').state.bills.length, base.bills.length);
});
test('F08 fractional cents rejected in baseline income and month overrides', () => {
  const s = seed();
  s.profiles[0].income = 123.456;
  assert.equal(validState(s), false);
  s.profiles[0].income = 123.45;
  assert.ok(validState(s));
  s.profiles[0].incomeChanges = { '2026-10': 1.001 };
  assert.equal(validState(s), false);
  assert.throws(() => setMonthlyIncome(s.profiles[0], '2026-10', 1.001));
});
test('F01 and F08 server protects legacy paid history and rejects fractional-cent API writes', async () => {
  const server = await testServer(3204);
  try {
    const r = await server.request('auth/register', 'POST', {
        email: 'history@example.test',
        password: 'Review-testing-pass!123',
      }),
      data = (await server.request('state', 'GET', null, r.cookie)).body;
    data.state = seed();
    data.state.bills[0].amount = 1000;
    data.state.bills[0].paid['2026-10'] = true;
    let saved = await server.request('state', 'PUT', data, r.cookie);
    assert.equal(saved.status, 200);
    const next = { state: saved.body.state, revision: saved.body.revision };
    next.state.bills[0].amount = 2000;
    delete next.state.bills[0].settlements;
    saved = await server.request('state', 'PUT', next, r.cookie);
    assert.equal(saved.status, 200);
    assert.equal(sharedBalance(saved.body.state, 'sam', '2026-10'), 500);
    saved.body.state.profiles[0].income = 1.001;
    assert.equal((await server.request('state', 'PUT', saved.body, r.cookie)).status, 400);
  } finally {
    await server.stop();
  }
});
test('F07 and F09 invite-only signup is opaque; recovery codes are one-use and revoke sessions', async () => {
  const server = await testServer(3205, { REGISTRATION_MODE: 'invite' });
  try {
    const generic = await server.request('auth/register', 'POST', {
      email: 'unknown@example.test',
      password: 'Review-testing-pass!123',
    });
    assert.equal(generic.status, 200);
    assert.equal(generic.cookie, undefined);
    const db = new DatabaseSync(server.dir + '/saldo.sqlite'),
      invite = 'invite-secret-123',
      digest = createHash('sha256').update(invite).digest('hex');
    db.prepare('INSERT INTO invitations VALUES(?,?,?)').run(
      digest,
      'owner@example.test',
      Date.now() + 60000,
    );
    const r = await server.request('auth/register', 'POST', {
      email: 'owner@example.test',
      inviteCode: invite,
      password: 'Review-testing-pass!123',
    });
    assert.equal(r.status, 200);
    assert.ok(r.cookie);
    assert.match(r.body.recoveryCode, /^[a-f0-9]{64}$/);
    const duplicate = await server.request('auth/register', 'POST', {
      email: 'owner@example.test',
      password: 'Another-testing-pass!123',
    });
    assert.equal(duplicate.status, generic.status);
    assert.deepEqual(duplicate.body, generic.body);
    assert.equal(duplicate.cookie, undefined);
    const rotated = await server.request(
      'security/recovery-code',
      'POST',
      { currentPassword: 'Review-testing-pass!123' },
      r.cookie,
    );
    assert.equal(rotated.status, 200);
    assert.equal(
      (
        await server.request('recovery/reset', 'POST', {
          email: 'owner@example.test',
          code: r.body.recoveryCode,
          newPassword: 'Replacement-pass!123',
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await server.request('recovery/reset', 'POST', {
          email: 'owner@example.test',
          code: rotated.body.recoveryCode,
          newPassword: 'Replacement-pass!123',
        })
      ).status,
      200,
    );
    assert.equal((await server.request('state', 'GET', null, r.cookie)).status, 401);
    assert.equal(
      (
        await server.request('recovery/reset', 'POST', {
          email: 'owner@example.test',
          code: rotated.body.recoveryCode,
          newPassword: 'Replacement-other!123',
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await server.request('auth/login', 'POST', {
          email: 'owner@example.test',
          password: 'Replacement-pass!123',
        })
      ).status,
      200,
    );
    db.close();
  } finally {
    await server.stop();
  }
});
