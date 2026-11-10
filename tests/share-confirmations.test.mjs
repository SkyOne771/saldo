import test from 'node:test';
import assert from 'node:assert/strict';
import {
  seed,
  sharePaid,
  setSharePaid,
  setBillPaid,
  sharedBalance,
  validState,
  billForMonth,
  editBillForMonth,
  deleteProfile,
} from '../src/model.mjs';

test('each participant confirms their own half without completing the other or the provider', () => {
  const s = seed(),
    bill = s.bills.find((b) => b.shared);
  s.bills = [bill];
  bill.paid = {};
  assert.equal(sharePaid(bill, '2026-11', 'alex'), false);
  setSharePaid(s, bill.id, '2026-11', 'alex', true);
  assert.equal(sharePaid(bill, '2026-11', 'alex'), true);
  assert.equal(sharePaid(bill, '2026-11', 'sam'), false);
  assert.equal(bill.paid['2026-11'], undefined);
  setSharePaid(s, bill.id, '2026-11', 'sam', true);
  setSharePaid(s, bill.id, '2026-11', 'alex', false);
  assert.equal(sharePaid(bill, '2026-11', 'sam'), true);
  assert.equal(sharePaid(bill, '2026-12', 'sam'), false);
  assert.equal(sharedBalance(s, 'sam', '2026-11'), 0);
  assert.ok(validState(s));
});
test('confirming reimbursement settles exact odd-cent halves and undo restores the balance', () => {
  const s = seed(),
    bill = s.bills.find((b) => b.shared);
  s.bills = [bill];
  bill.paid = {};
  bill.amount = 100.01;
  setBillPaid(s, bill.id, '2026-11', true, 'alex');
  assert.equal(sharePaid(bill, '2026-11', 'alex'), false);
  assert.equal(sharedBalance(s, 'sam', '2026-11'), 50);
  assert.equal(sharedBalance(s, 'alex', '2026-11'), -50);
  setSharePaid(s, bill.id, '2026-11', 'alex', true);
  assert.equal(sharedBalance(s, 'sam', '2026-11'), 50);
  setSharePaid(s, bill.id, '2026-11', 'sam', true);
  assert.equal(sharedBalance(s, 'sam', '2026-11'), 0);
  assert.equal(sharedBalance(s, 'alex', '2026-11'), 0);
  editBillForMonth(s, bill.id, { ...billForMonth(s, bill, '2026-12'), amount: 200 }, '2026-12');
  assert.equal(sharedBalance(s, 'sam', '2026-11'), 0);
  setSharePaid(s, bill.id, '2026-11', 'sam', false);
  assert.equal(sharedBalance(s, 'sam', '2026-11'), 50);
  assert.equal(bill.paid['2026-11'], true);
  assert.ok(validState(s));
});
test('share confirmations reject hostile data and clean references when a profile is deleted', () => {
  for (const sharePayments of [
    { '2026-13': { alex: true } },
    { '2026-11': { foreign: true } },
    { '2026-11': { alex: 'true' } },
    { '2026-11': [] },
  ]) {
    const s = seed();
    s.bills[0].sharePayments = sharePayments;
    assert.equal(validState(s), false);
  }
  const s = seed(),
    bill = s.bills.find((b) => b.shared);
  assert.throws(() => setSharePaid(s, bill.id, '2026-11', 'foreign', true));
  assert.throws(() => setSharePaid(s, bill.id, 'bad', 'alex', true));
  assert.throws(() => setSharePaid(s, bill.id, '2026-11', 'alex', 'yes'));
  setSharePaid(s, bill.id, '2026-11', 'alex', true);
  setSharePaid(s, bill.id, '2026-11', 'sam', false);
  deleteProfile(s, 'alex', 'sam');
  assert.equal(bill.sharePayments['2026-11'].alex, undefined);
  assert.equal(bill.sharePayments['2026-11'].sam, false);
  assert.ok(validState(s));
});
