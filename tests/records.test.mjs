import test from 'node:test';
import assert from 'node:assert/strict';
import {
  seed,
  repay,
  updateRepayment,
  deleteRepayment,
  deleteProfile,
  validState,
  trackerSettings,
  trackerDefaults,
} from '../src/model.mjs';
test('repayment corrections and deletion preserve later principal payments', () => {
  const s = seed(),
    start = s.debts[0].balance;
  repay(s, 'd1', 500, '2026-10-18');
  repay(s, 'd1', 50, '2026-10-19');
  const id = s.payments[0].id;
  updateRepayment(s, id, 300, '2026-10-17');
  assert.equal(s.debts[0].balance, start - 350);
  assert.equal(s.payments[0].date, '2026-10-17');
  deleteRepayment(s, id);
  assert.equal(s.debts[0].balance, start - 50);
  assert.equal(s.payments.length, 1);
  assert.ok(validState(s));
});
test('unsafe corrections are rejected without partial mutation', () => {
  const s = seed();
  repay(s, 'd3', 100);
  const id = s.payments[0].id,
    before = structuredClone(s);
  for (const amount of [-1, NaN, 0, 10000, 0.001]) {
    assert.throws(() => updateRepayment(s, id, amount, '2026-10-18'));
    assert.deepEqual(s, before);
  }
  assert.throws(() => updateRepayment(s, id, 1, 'invalid'));
  s.debts[2].balance = s.debts[2].original;
  assert.throws(() => deleteRepayment(s, id));
  assert.equal(s.payments.length, 1);
});
test('deleted-debt history remains independently editable and deletable', () => {
  const s = seed();
  repay(s, 'd1', 100);
  const id = s.payments[0].id;
  s.debts.shift();
  const debts = structuredClone(s.debts);
  updateRepayment(s, id, 75, '2026-10-10');
  deleteRepayment(s, id);
  assert.deepEqual(s.debts, debts);
  assert.ok(validState(s));
});
test('profile deletion transfers records and reconciles shared participants', () => {
  const s = seed();
  repay(s, 'd1', 100);
  s.bills[0].payers = { '2026-10': 'alex' };
  deleteProfile(s, 'alex', 'sam');
  assert.equal(s.profiles.length, 1);
  assert.ok(s.bills.every((b) => !b.shared && b.owner === 'sam'));
  assert.equal(s.payments[0].owner, 'sam');
  assert.equal(s.debts[0].owner, 'sam');
  assert.ok(validState(s));
  assert.throws(() => deleteProfile(s, 'sam', 'none'));
});
test('tracker settings validate untrusted colours and keep new accounts independent', () => {
  const s = seed();
  s.profiles[0].tracker = { ...trackerDefaults, step: 100, columns: 10 };
  assert.ok(validState(s));
  s.profiles[0].tracker.paid = 'url(https://bad.invalid)';
  assert.equal(validState(s), false);
  assert.deepEqual(trackerSettings(s.profiles[0].tracker), trackerDefaults);
});
