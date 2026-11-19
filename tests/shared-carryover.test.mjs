import test from 'node:test';
import assert from 'node:assert/strict';
import {
  seed,
  sharedBalance,
  sharedBalanceSummary,
  setBillPaid,
  setSharePaid,
  editBillForMonth,
  billForMonth,
  totals,
  validState,
} from '../src/model.mjs';
const fixture = () => {
  const s = seed(),
    bill = s.bills.find((b) => b.shared);
  s.bills = [bill];
  bill.amount = 1000;
  bill.paid = {};
  return { s, bill };
};

test('unreimbursed shared balances carry through later months once in both directions', () => {
  const { s, bill } = fixture();
  setBillPaid(s, bill.id, '2026-10', true, 'alex');
  for (const month of ['2026-11', '2026-12', '2027-01']) {
    const sam = sharedBalanceSummary(s, 'sam', month),
      alex = sharedBalanceSummary(s, 'alex', month);
    assert.equal(sam.current, 0);
    assert.equal(sam.carried, 500);
    assert.equal(sam.total, 500);
    assert.equal(alex.total, -500);
    assert.equal(sam.entries.length, 1);
    assert.equal(sam.entries[0].month, '2026-10');
  }
  assert.equal(sharedBalanceSummary(s, 'sam', '2026-09').total, 0);
  assert.equal(sharedBalance(s, 'sam', '2026-11'), 0);
});
test('current and carried amounts reconcile without re-adding previous cumulative totals', () => {
  const { s, bill } = fixture();
  setBillPaid(s, bill.id, '2026-10', true);
  editBillForMonth(s, bill.id, { ...billForMonth(s, bill, '2026-11'), amount: 2000 }, '2026-11');
  setBillPaid(s, bill.id, '2026-11', true);
  const nov = sharedBalanceSummary(s, 'sam', '2026-11');
  assert.deepEqual([nov.current, nov.carried, nov.total], [1000, 500, 1500]);
  assert.deepEqual(
    sharedBalanceSummary(s, 'sam', '2026-12').entries.map((e) => e.amount),
    [500, 1000],
  );
  setBillPaid(s, bill.id, '2027-01', true);
  assert.equal(sharedBalanceSummary(s, 'sam', '2026-12').total, 1500);
  assert.equal(sharedBalanceSummary(s, 'sam', '2027-01').total, 2500);
});
test('confirming an old reimbursement clears it from every later balance and undo restores it', () => {
  const { s, bill } = fixture();
  setBillPaid(s, bill.id, '2026-10', true);
  setBillPaid(s, bill.id, '2026-11', true);
  const budget = totals(s, 'sam', '2026-12');
  setSharePaid(s, bill.id, '2026-10', 'sam', true);
  assert.equal(sharedBalanceSummary(s, 'sam', '2026-12').total, 500);
  assert.equal(sharedBalanceSummary(s, 'alex', '2026-12').total, -500);
  assert.equal(bill.paid['2026-10'], true);
  assert.equal(bill.paid['2026-11'], true);
  assert.deepEqual(totals(s, 'sam', '2026-12'), budget);
  setSharePaid(s, bill.id, '2026-10', 'sam', false);
  assert.equal(sharedBalanceSummary(s, 'sam', '2026-12').total, 1000);
  assert.ok(validState(s));
});
test('carryover uses historical annual amounts and includes bills removed from a view without mutating records', () => {
  const { s, bill } = fixture();
  bill.frequency = 'Yearly';
  bill.dueMonth = 12;
  bill.amount = 1200.01;
  setBillPaid(s, bill.id, '2025-12', true);
  editBillForMonth(s, bill.id, { ...billForMonth(s, bill, '2026-01'), amount: 2400 }, '2026-01');
  bill.hiddenViews = { sam: { shared: true, recurring: true } };
  const before = JSON.stringify(s),
    summary = sharedBalanceSummary(s, 'sam', '2026-11');
  assert.equal(summary.total, 600);
  assert.equal(summary.entries[0].name, bill.name);
  assert.equal(summary.entries[0].month, '2025-12');
  assert.equal(JSON.stringify(s), before);
  assert.ok(validState(s));
});
test('historical participants retain their own balances after a shared partner changes', () => {
  const { s, bill } = fixture();
  s.profiles.push({ id: 'third', name: 'Third', income: 0 });
  setBillPaid(s, bill.id, '2026-10', true);
  editBillForMonth(
    s,
    bill.id,
    { ...billForMonth(s, bill, '2026-11'), partnerId: 'third' },
    '2026-11',
  );
  setBillPaid(s, bill.id, '2026-11', true);
  assert.equal(sharedBalanceSummary(s, 'sam', '2026-12').total, 500);
  assert.equal(sharedBalanceSummary(s, 'third', '2026-12').total, 500);
  assert.equal(sharedBalanceSummary(s, 'alex', '2026-12').total, -1000);
  assert.equal(sharedBalanceSummary(s, 'foreign', '2026-12').total, 0);
  assert.ok(validState(s));
});
