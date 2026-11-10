import test from 'node:test';
import assert from 'node:assert/strict';
import {
  seed,
  emptyState,
  totals,
  validState,
  editBillForMonth,
  setBillPaid,
} from '../src/model.mjs';

test('minimum includes half of shared essentials, full personal essentials and active debt payments', () => {
  const s = seed(),
    t = totals(s, 'alex', '2026-11');
  assert.equal(t.essentialBills, t.living);
  assert.equal(t.minimum, t.living + t.debt);
  s.expenses.push({
    id: 'one-off',
    name: 'Extra purchase',
    owner: 'alex',
    month: '2026-11',
    amount: 999,
    category: 'Life',
  });
  assert.equal(totals(s, 'alex', '2026-11').minimum, t.minimum);
  s.debts[0].balance = 0;
  assert.equal(totals(s, 'alex', '2026-11').minimum, t.minimum - s.debts[0].monthly);
  const partner = totals(s, 'sam', '2026-11');
  assert.equal(partner.minimum, partner.living);
});
test('optional bills remain in the budget but leave minimum, with annual costs provisioned monthly', () => {
  const s = seed(),
    bill = s.bills.find((b) => b.shared);
  s.bills = [bill];
  s.debts = [];
  bill.amount = 1200;
  bill.frequency = 'Yearly';
  bill.dueMonth = 1;
  assert.equal(totals(s, 'alex', '2026-11').minimum, 50);
  bill.essential = false;
  assert.equal(totals(s, 'alex', '2026-11').minimum, 0);
  assert.equal(totals(s, 'alex', '2026-11').living, 50);
  assert.ok(validState(s));
});
test('essential flags respect effective months and paid history; new accounts start at zero', () => {
  const s = seed(),
    bill = s.bills.find((b) => b.shared);
  s.bills = [bill];
  s.debts = [];
  bill.amount = 100;
  bill.paid = {};
  setBillPaid(s, bill.id, '2026-10', true);
  editBillForMonth(s, bill.id, { ...bill, essential: false }, '2026-11');
  assert.equal(totals(s, 'alex', '2026-10').minimum, 50);
  assert.equal(totals(s, 'alex', '2026-11').minimum, 0);
  assert.equal(totals(s, 'alex', '2026-12').minimum, 0);
  assert.ok(validState(s));
  bill.essential = 'false';
  assert.equal(validState(s), false);
  const empty = emptyState('New');
  assert.equal(totals(empty, empty.profiles[0].id, '2026-11').minimum, 0);
});
