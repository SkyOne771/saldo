import test from 'node:test';
import assert from 'node:assert/strict';
import {
  seed,
  billInView,
  setBillView,
  importBillsToView,
  totals,
  sharedBalance,
  validState,
  deleteProfile,
} from '../src/model.mjs';
test('view removal works in both directions, preserves financial data and is profile-specific', () => {
  const s = seed(),
    b = s.bills[0];
  b.paid['2026-10'] = true;
  const totalsBefore = totals(s, 'alex', '2026-10'),
    balance = sharedBalance(s, 'alex', '2026-10'),
    original = structuredClone(b);
  setBillView(s, [b.id], 'alex', 'shared', false);
  assert.equal(billInView(s, b, 'alex', 'shared'), false);
  assert.equal(billInView(s, b, 'alex', 'recurring'), true);
  assert.equal(billInView(s, b, 'sam', 'shared'), true);
  assert.deepEqual(totals(s, 'alex', '2026-10'), totalsBefore);
  assert.equal(sharedBalance(s, 'alex', '2026-10'), balance);
  setBillView(s, [b.id], 'alex', 'recurring', false);
  assert.equal(billInView(s, b, 'alex', 'recurring'), false);
  importBillsToView(s, [b.id], 'alex', 'recurring');
  assert.equal(billInView(s, b, 'alex', 'recurring'), true);
  assert.equal(billInView(s, b, 'alex', 'shared'), false);
  assert.equal(b.shared, true);
  assert.deepEqual(b.paid, original.paid);
  assert.equal(b.owner, original.owner);
  assert.ok(validState(s));
});
test('importing to shared restores existing splits and starts new splits without duplicates', () => {
  const s = seed(),
    b = s.bills[0],
    personal = s.bills.find((b) => !b.shared);
  setBillView(s, [b.id], 'alex', 'shared', false);
  const length = s.bills.length;
  importBillsToView(s, [b.id, personal.id], 'alex', 'shared', 'sam');
  assert.equal(s.bills.length, length);
  assert.ok(billInView(s, b, 'alex', 'shared'));
  assert.ok(billInView(s, personal, 'sam', 'shared'));
  assert.equal(personal.shared, true);
  assert.ok(validState(s));
});
test('bulk view changes reject invalid participants and views atomically', () => {
  const s = seed();
  s.profiles.push({ id: 'unrelated', name: 'Third', income: 0 });
  const before = structuredClone(s);
  for (const fn of [
    () => setBillView(s, ['b0'], 'unrelated', 'shared', false),
    () => setBillView(s, ['b0'], 'alex', 'bad', false),
    () => setBillView(s, ['b0', 'missing'], 'alex', 'recurring', false),
    () => setBillView(s, ['b6'], 'alex', 'shared', false),
    () => importBillsToView(s, ['b0', 'missing'], 'alex', 'shared', 'sam'),
  ]) {
    assert.throws(fn);
    assert.deepEqual(s, before);
  }
});
test('view preferences reject hostile restore data and profile deletion clears stale references', () => {
  const s = seed();
  setBillView(s, ['b0'], 'alex', 'shared', false);
  assert.ok(validState(s));
  for (const value of [
    { missing: { shared: true } },
    { alex: { shared: 'yes' } },
    { alex: { fake: true } },
    [],
  ]) {
    const clone = structuredClone(s);
    clone.bills[0].hiddenViews = value;
    assert.equal(validState(clone), false);
  }
  deleteProfile(s, 'alex', 'sam');
  assert.ok(validState(s));
  assert.equal(s.bills[0].hiddenViews.alex, undefined);
});
