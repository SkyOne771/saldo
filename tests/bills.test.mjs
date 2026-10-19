import test from 'node:test';
import assert from 'node:assert/strict';
import {
  seed,
  emptyState,
  totals,
  visibleBill,
  billShare,
  setBillSharing,
  billPayer,
  setBillPayer,
  sharedBalance,
  billStatus,
  validState,
} from '../src/model.mjs';
const fixture = () => {
  const s = seed();
  s.profiles.push({ id: 'third', name: 'Unrelated', income: 0 });
  return s;
};
test('bill imports reuse one record, preserve details and history and avoid double counting', () => {
  const s = fixture(),
    bill = s.bills.find((b) => !b.shared);
  bill.paid['2026-10'] = true;
  const before = structuredClone(bill),
    length = s.bills.length;
  setBillSharing(s, [bill.id, bill.id], 'alex', true, 'sam');
  assert.equal(s.bills.length, length);
  assert.equal(bill.amount, before.amount);
  assert.deepEqual(bill.paid, before.paid);
  assert.equal(bill.partnerId, 'sam');
  assert.equal(billShare(s, bill, 'alex') + billShare(s, bill, 'sam'), bill.amount);
  setBillSharing(s, [bill.id], 'alex', false);
  assert.equal(s.bills.length, length);
  assert.equal(bill.shared, false);
  assert.equal(billShare(s, bill, 'alex'), bill.amount);
  assert.equal(billShare(s, bill, 'sam'), 0);
  assert.deepEqual(bill.paid, before.paid);
});
test('only the owner and selected partner can see shared bills', () => {
  const s = fixture();
  assert.equal(visibleBill(s, s.bills[0], 'third'), false);
  assert.equal(totals(s, 'third', '2026-10').living, 0);
  setBillSharing(s, ['b6'], 'alex', true, 'third');
  assert.equal(visibleBill(s, s.bills[6], 'third'), true);
  assert.equal(visibleBill(s, s.bills[6], 'sam'), false);
  assert.throws(() => setBillSharing(s, ['b6'], 'sam', false));
});
test('odd-cent split reconciles exactly and settlement is equal and opposite', () => {
  const s = fixture(),
    b = s.bills[0];
  b.amount = 121.01;
  b.paid['2026-10'] = true;
  assert.equal(billShare(s, b, 'alex'), 60.51);
  assert.equal(billShare(s, b, 'sam'), 60.5);
  assert.equal(sharedBalance(s, 'alex', '2026-10'), -60.5);
  assert.equal(sharedBalance(s, 'sam', '2026-10'), 60.5);
});
test('payer changes are month-specific and do not rewrite earlier settlements', () => {
  const s = fixture(),
    b = s.bills[0];
  b.paid['2026-09'] = true;
  b.paid['2026-10'] = true;
  setBillPayer(s, b.id, '2026-10', 'sam');
  assert.equal(billPayer(b, '2026-09'), 'alex');
  assert.equal(billPayer(b, '2026-10'), 'sam');
  assert.equal(sharedBalance(s, 'alex', '2026-09'), -600);
  assert.equal(sharedBalance(s, 'alex', '2026-10'), 600);
  assert.throws(() => setBillPayer(s, b.id, '2026-10', 'third'));
});
test('payment statuses distinguish paid, overdue, due today, upcoming and annual scheduling', () => {
  const b = seed().bills[0],
    today = new Date(2026, 9, 18);
  assert.equal(billStatus(b, '2026-10', today), 'Overdue');
  b.day = 18;
  assert.equal(billStatus(b, '2026-10', today), 'Due today');
  b.day = 20;
  assert.equal(billStatus(b, '2026-10', today), 'Upcoming');
  b.frequency = 'Yearly';
  b.dueMonth = 11;
  assert.equal(billStatus(b, '2026-10', today), 'Scheduled');
  b.paid['2026-10'] = true;
  assert.equal(billStatus(b, '2026-10', today), 'Paid');
});
test('invalid restore data is rejected without throwing and valid legacy records still load', () => {
  assert.equal(validState(seed()), true);
  assert.equal(validState(emptyState()), true);
  for (const data of [null, {}, [], { profiles: [null] }, 'bad'])
    assert.equal(validState(data), false);
  for (const change of [
    (s) => (s.bills[0].paid = null),
    (s) => (s.bills[0].owner = 'missing'),
    (s) => (s.debts[0].original = 0),
    (s) => (s.tasks[0].status = 'bad'),
    (s) => (s.profiles[0].name = ' '),
    (s) => s.bills.push({ ...s.bills[0] }),
    (s) => (s.bills[0].partnerId = 'missing'),
  ]) {
    const s = seed();
    change(s);
    assert.equal(validState(s), false);
  }
});
test('changing a shared pair preserves raw history and keeps settlements consistent', () => {
  const s = fixture(),
    b = s.bills[0];
  b.paid['2026-10'] = true;
  setBillPayer(s, b.id, '2026-10', 'sam');
  setBillSharing(s, [b.id], 'alex', false);
  setBillSharing(s, [b.id], 'alex', true, 'third');
  assert.equal(b.payers['2026-10'], 'sam');
  assert.equal(billPayer(b, '2026-10', s), 'alex');
  assert.equal(sharedBalance(s, 'alex', '2026-10') + sharedBalance(s, 'sam', '2026-10'), 0);
  assert.equal(sharedBalance(s, 'third', '2026-10'), 0);
});
