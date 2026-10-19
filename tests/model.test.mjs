import test from 'node:test';
import assert from 'node:assert/strict';
import { seed, totals, repay, emptyState } from '../src/model.mjs';
test('budget counts half of shared bills and all personal bills and debt instalments', () => {
  const s = seed(),
    t = totals(s, 'alex', '2026-10');
  assert.equal(t.income, 8000);
  assert.equal(t.living, 2570);
  assert.equal(t.debt, 2150);
  assert.equal(t.remaining, 3280);
  assert.equal(t.balance, 190000);
  assert.equal(
    s.bills.filter((b) => b.shared).reduce((n, b) => n + b.amount, 0),
    1790,
  );
});
test('yearly bills are provisioned monthly and extra expenses are scoped to month and profile', () => {
  const s = seed();
  s.bills.push({ owner: 'alex', amount: 1200, frequency: 'Yearly' });
  s.expenses.push(
    { owner: 'alex', month: '2026-10', amount: 200 },
    { owner: 'sam', month: '2026-10', amount: 1000 },
    { owner: 'alex', month: '2026-09', amount: 900 },
  );
  assert.equal(totals(s, 'alex', '2026-10').remaining, 2980);
  assert.equal(totals(s, 'alex', '2026-09').remaining, 2280);
});
test('repayment reduces principal and creates an auditable record without treating interest as principal', () => {
  const s = seed();
  repay(s, 'd3', 380, '2026-10-18');
  assert.equal(s.debts[2].balance, 1620);
  assert.equal(s.payments[0].amount, 380);
  assert.equal(s.payments[0].owner, 'alex');
  assert.equal(totals(s, 'alex', '2026-10').balance, 189620);
});
test('invalid repayments do not change balances', () => {
  for (const n of [-1, 0, Infinity, NaN, 2001]) {
    const s = seed();
    assert.throws(() => repay(s, 'd3', n));
    assert.equal(s.debts[2].balance, 2000);
    assert.equal(s.payments.length, 0);
  }
});
test('paid status is independent for every month and each profile sees only its own debts', () => {
  const s = seed();
  s.bills[0].paid['2026-10'] = true;
  assert.equal(s.bills[0].paid['2026-11'], undefined);
  assert.equal(totals(s, 'sam', '2026-10').debt, 0);
  assert.equal(totals(s, 'sam', '2026-10').living, 895);
});

test('new accounts have isolated profiles, zero totals and no sample records', () => {
  const s = emptyState('Alex'),
    other = emptyState();
  assert.equal(s.profiles[0].name, 'Alex');
  assert.equal(other.profiles[0].name, 'Personal');
  assert.notEqual(s.profiles[0].id, other.profiles[0].id);
  for (const key of ['bills', 'debts', 'payments', 'expenses', 'tasks'])
    assert.deepEqual(s[key], []);
  assert.ok(Object.values(totals(s, s.profiles[0].id, '2026-10')).every((n) => n === 0));
});
