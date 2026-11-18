import test from 'node:test';
import assert from 'node:assert/strict';
import { seed, moveTask, shareTasks, filterTasks, validState } from '../src/model.mjs';

test('moving a task changes only status and preserves sharing, priority and financial records', () => {
  const s = seed();
  shareTasks(s, 'alex', ['sam']);
  const task = s.tasks.find((t) => t.owner === 'alex');
  task.priority = 1;
  const before = structuredClone(s);
  assert.equal(moveTask(s, task.id, 'In progress', 'sam'), true);
  const expected = structuredClone(before);
  expected.tasks.find((t) => t.id === task.id).status = 'In progress';
  assert.deepEqual(s, expected);
  assert.equal(moveTask(s, task.id, 'Done', 'alex'), true);
  assert.equal(
    filterTasks(s.tasks, { priority: '1', visibility: 'Shared' }).find((t) => t.id === task.id)
      .status,
    'Done',
  );
  assert.ok(validState(s));
});
test('same-column moves are no-ops and invalid or invisible moves never mutate state', () => {
  const s = seed(),
    task = s.tasks[0],
    before = structuredClone(s);
  assert.equal(moveTask(s, task.id, task.status, task.owner), false);
  assert.deepEqual(s, before);
  assert.throws(() => moveTask(s, task.id, 'Not a status', task.owner));
  assert.throws(() => moveTask(s, 'missing', 'Done', task.owner));
  assert.throws(() => moveTask(s, task.id, 'Done', 'foreign-profile'));
  assert.throws(() => moveTask(s, task.id, 'Done', 'sam'));
  assert.deepEqual(s, before);
});
