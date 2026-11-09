import test from 'node:test';
import assert from 'node:assert/strict';
import {
  seed,
  validState,
  billDueDate,
  billStatus,
  billForMonth,
  editBillForMonth,
  setBillPaid,
  deleteProfile,
  totals,
} from '../src/model.mjs';

test('shared bill due days and overdue labels follow each profile without changing money', () => {
  const s = seed(),
    bill = s.bills.find((b) => b.shared),
    before = totals(s, 'alex', '2026-11');
  bill.paid = {};
  bill.dueDays = { alex: 5, sam: 20 };
  const today = new Date(2026, 10, 10, 12);
  assert.equal(billDueDate(bill, '2026-11', 'alex'), '2026-11-05');
  assert.equal(billDueDate(bill, '2026-11', 'sam'), '2026-11-20');
  assert.equal(billStatus(bill, '2026-11', today, 'alex'), 'Overdue');
  assert.equal(billStatus(bill, '2026-11', today, 'sam'), 'Upcoming');
  assert.equal(billDueDate(bill, '2026-11'), `2026-11-${String(bill.day).padStart(2, '0')}`);
  assert.deepEqual(totals(s, 'alex', '2026-11'), before);
  setBillPaid(s, bill.id, '2026-11', true);
  assert.equal(billStatus(bill, '2026-11', today, 'sam'), 'Paid');
  assert.ok(validState(s));
});
test('profile due days clamp at month end and saved paid-month dates survive future edits', () => {
  const s = seed(),
    bill = s.bills.find((b) => b.shared);
  bill.paid = {};
  bill.dueDays = { alex: 31, sam: 30 };
  assert.equal(billDueDate(bill, '2027-02', 'alex'), '2027-02-28');
  assert.equal(billDueDate(bill, '2028-02', 'sam'), '2028-02-29');
  setBillPaid(s, bill.id, '2026-10', true);
  editBillForMonth(
    s,
    bill.id,
    { ...billForMonth(s, bill, '2026-11'), dueDays: { alex: 10, sam: 15 } },
    '2026-11',
  );
  assert.equal(billDueDate(billForMonth(s, bill, '2026-10'), '2026-10', 'alex'), '2026-10-31');
  assert.equal(billDueDate(billForMonth(s, bill, '2026-11'), '2026-11', 'alex'), '2026-11-10');
  assert.equal(billDueDate(billForMonth(s, bill, '2026-12'), '2026-12', 'sam'), '2026-12-15');
  editBillForMonth(s, bill.id, { ...billForMonth(s, bill, '2026-12'), dueDays: {} }, '2026-12');
  assert.equal(
    billDueDate(billForMonth(s, bill, '2026-12'), '2026-12', 'sam'),
    `2026-12-${String(bill.day).padStart(2, '0')}`,
  );
  assert.ok(validState(s));
});
test('profile due-day maps reject invalid recipients and values, and clean deleted profiles', () => {
  for (const dueDays of [
    { foreign: 5 },
    { alex: 0 },
    { sam: 32 },
    { alex: 4.5 },
    { alex: '5' },
    [],
  ]) {
    const s = seed();
    s.bills[0].dueDays = dueDays;
    assert.equal(validState(s), false);
  }
  const s = seed(),
    bill = s.bills[0];
  bill.dueDays = { alex: 5, sam: 20 };
  setBillPaid(s, bill.id, '2026-10', true);
  editBillForMonth(s, bill.id, { ...bill, dueDays: { alex: 10, sam: 25 } }, '2026-11');
  deleteProfile(s, 'alex', 'sam');
  assert.ok(validState(s));
  assert.equal(bill.dueDays.alex, undefined);
  assert.equal(bill.dueDays.sam, 20);
  assert.equal(bill.settlements['2026-10'].dueDays.alex, undefined);
});
