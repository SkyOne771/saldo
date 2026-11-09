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
  debtTrackerProgress,
  visibleTask,
  shareTasks,
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

test('automatic debt bricks exactly match current balance through repayment changes', () => {
  const settings = { ...trackerDefaults, step: 500 };
  const s = seed(),
    debt = s.debts[0];
  const progress = () => debtTrackerProgress(debt.original, debt.balance, settings);
  const check = () => {
    const p = progress();
    assert.equal(
      Math.round(p.bricks.reduce((sum, b) => sum + b.remaining, 0) * 100),
      Math.round(debt.balance * 100),
    );
    assert.equal(
      Math.round(p.bricks.reduce((sum, b) => sum + b.paid, 0) * 100),
      Math.round((debt.original - debt.balance) * 100),
    );
    assert.equal(p.manual, false);
  };
  check();
  repay(s, debt.id, 625.37, '2026-11-09');
  check();
  updateRepayment(s, s.payments.at(-1).id, 125.11, '2026-11-09');
  check();
  deleteRepayment(s, s.payments.at(-1).id);
  check();
  debt.balance = 1234.56;
  check();
});
test('partial final brick has exact size, and manual balance remains fixed until cleared', () => {
  const settings = { ...trackerDefaults, step: 500 };
  const p = debtTrackerProgress(1250, 625, settings);
  assert.equal(p.bricks.length, 3);
  assert.equal(p.bricks[1].fill, 25);
  assert.equal(p.bricks[2].width, 50);
  assert.equal(p.bricks[2].remaining, 250);
  const override = { ...settings, remainingOverride: 300.25 };
  assert.equal(debtTrackerProgress(1250, 625, override).remaining, 300.25);
  assert.equal(debtTrackerProgress(1250, 100, override).remaining, 300.25);
  assert.equal(
    debtTrackerProgress(1250, 100, { ...override, remainingOverride: null }).remaining,
    100,
  );
  assert.equal(debtTrackerProgress(1250, 100, { ...override, remainingOverride: 0 }).remaining, 0);
  assert.equal(debtTrackerProgress(0, 0, { ...override, remainingOverride: 300.25 }).total, 300.25);
  assert.equal(debtTrackerProgress(0, 0, settings).bricks.length, 0);
  assert.ok(debtTrackerProgress(1e12, 1e12, { ...settings, step: 1 }).bricks.length <= 1000);
});
test('tracker remaining overrides reject hostile, negative and fractional-cent values', () => {
  for (const remainingOverride of [-1, 0.001, '500', Infinity, 1e12 + 1]) {
    const s = seed();
    s.profiles[0].tracker = { ...trackerDefaults, remainingOverride };
    assert.equal(validState(s), false);
  }
  for (const remainingOverride of [undefined, null, 0, 123.45]) {
    const s = seed();
    s.profiles[0].tracker = { ...trackerDefaults, remainingOverride };
    assert.ok(validState(s));
  }
});

test('shared tasks use one record across profiles and preserve private tasks', () => {
  const s = seed(),
    owner = s.profiles[0].id,
    partner = s.profiles[1].id;
  s.profiles.push({ id: 'third', name: 'Third', income: 0 });
  const task = s.tasks.find((t) => t.owner === owner),
    length = s.tasks.length;
  assert.equal(visibleTask(task, partner), false);
  shareTasks(s, owner, [partner]);
  assert.deepEqual(s.profiles.find((p) => p.id === owner).taskSharedWith, [partner]);
  assert.deepEqual(s.profiles.find((p) => p.id === partner).taskSharedWith, [owner]);
  assert.equal(s.profiles.find((p) => p.id === 'third').taskSharedWith, undefined);
  assert.equal(s.tasks.length, length);
  assert.equal(visibleTask(task, owner), true);
  assert.equal(visibleTask(task, partner), true);
  assert.equal(visibleTask(task, 'third'), false);
  s.tasks.find((t) => visibleTask(t, partner) && t.id === task.id).status = 'Done';
  assert.equal(s.tasks.find((t) => visibleTask(t, owner) && t.id === task.id).status, 'Done');
  assert.ok(validState(s));
  s.tasks = s.tasks.filter((t) => t.id !== task.id);
  assert.equal(
    s.tasks.filter((t) => visibleTask(t, partner)).some((t) => t.id === task.id),
    false,
  );
  assert.throws(() => shareTasks(s, owner, ['foreign-account-profile']));
  assert.throws(() => shareTasks(s, owner, [owner]));
});
test('task sharing validates recipients and survives profile deletion', () => {
  for (const sharedWith of ['other', ['foreign'], ['alex'], ['sam', 'sam']]) {
    const s = seed();
    s.tasks[0].sharedWith = sharedWith;
    assert.equal(validState(s), false);
  }
  const s = seed();
  shareTasks(s, 'alex', ['sam']);
  deleteProfile(s, 'alex', 'sam');
  assert.ok(validState(s));
  assert.ok(s.tasks.every((t) => t.owner === 'sam' && !t.sharedWith?.length));
});
