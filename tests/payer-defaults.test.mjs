import test from 'node:test';
import assert from 'node:assert/strict';
import {
  seed,
  billForMonth,
  billPayer,
  setBillPayer,
  setBillPaid,
  sharedBalance,
  validState,
} from '../src/model.mjs';

test('unpaid bills default to the active participant until a payer is saved', () => {
  const s = seed(),
    bill = s.bills.find((b) => b.shared);
  bill.paid = {};
  delete bill.payers;
  const before = JSON.stringify(s);
  assert.equal(billPayer(bill, '2026-11', s, 'alex'), 'alex');
  assert.equal(billPayer(bill, '2026-11', s, 'sam'), 'sam');
  assert.equal(billPayer(bill, '2026-11', s, 'foreign'), bill.owner);
  assert.equal(JSON.stringify(s), before);
  setBillPayer(s, bill.id, '2026-11', 'alex');
  assert.equal(billPayer(bill, '2026-11', s, 'sam'), 'alex');
  assert.equal(billPayer(bill, '2026-12', s, 'sam'), 'sam');
});
test('marking a bill paid persists the active payer for both profiles and settlements', () => {
  const s = seed(),
    bill = s.bills.find((b) => b.shared);
  bill.paid = {};
  delete bill.payers;
  setBillPaid(s, bill.id, '2026-11', true, 'sam');
  const saved = billForMonth(s, bill, '2026-11');
  assert.equal(billPayer(saved, '2026-11', s, 'alex'), 'sam');
  assert.equal(saved.payer, 'sam');
  assert.equal(bill.payers['2026-11'], 'sam');
  assert.equal(sharedBalance(s, 'alex', '2026-11'), -sharedBalance(s, 'sam', '2026-11'));
  setBillPaid(s, bill.id, '2026-12', true, 'alex');
  assert.equal(billForMonth(s, bill, '2026-11').payer, 'sam');
  assert.equal(billForMonth(s, bill, '2026-12').payer, 'alex');
  setBillPaid(s, bill.id, '2026-11', false, 'alex');
  setBillPaid(s, bill.id, '2026-11', true, 'alex');
  assert.equal(billForMonth(s, bill, '2026-11').payer, 'sam');
  assert.ok(validState(s));
});
test('paid history and explicit payer choices override the viewer default', () => {
  const s = seed(),
    bill = s.bills.find((b) => b.shared);
  bill.paid = {};
  delete bill.payers;
  setBillPayer(s, bill.id, '2026-11', 'alex');
  setBillPaid(s, bill.id, '2026-11', true, 'sam');
  assert.equal(billForMonth(s, bill, '2026-11').payer, 'alex');
  setBillPaid(s, bill.id, '2026-11', true, 'sam');
  assert.equal(billForMonth(s, bill, '2026-11').payer, 'alex');
});
