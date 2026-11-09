import test from 'node:test';
import assert from 'node:assert/strict';
import {
  seed,
  validState,
  taskPriority,
  filterTasks,
  shareTasks,
  visibleTask,
} from '../src/model.mjs';

test('priorities default old tasks to P3 and reject invalid API values', () => {
  const s = seed();
  assert.equal(taskPriority(s.tasks[0]), 3);
  assert.ok(validState(s));
  for (const priority of [1, 2, 3, 4]) {
    s.tasks[0].priority = priority;
    assert.ok(validState(s));
    assert.equal(taskPriority(s.tasks[0]), priority);
  }
  for (const priority of [0, 5, -1, 2.5, '1', null, Infinity]) {
    s.tasks[0].priority = priority;
    assert.equal(validState(s), false);
  }
});
test('priority search and sharing filters combine without mutating task records', () => {
  const tasks = [
    { id: 'low', name: 'Kitchen paint', category: 'Home', priority: 4 },
    { id: 'urgent', name: 'Kitchen plumbing', category: 'Home', priority: 1, sharedWith: ['sam'] },
    { id: 'legacy', name: 'Pay bill', category: 'Finance' },
    { id: 'high', name: 'Kitchen cabinets', category: 'Home', priority: 2 },
  ];
  const before = structuredClone(tasks);
  assert.deepEqual(
    filterTasks(tasks).map((t) => t.id),
    ['urgent', 'high', 'legacy', 'low'],
  );
  assert.deepEqual(
    filterTasks(tasks, { priority: '3' }).map((t) => t.id),
    ['legacy'],
  );
  assert.deepEqual(
    filterTasks(tasks, { search: ' HOME ', priority: '1', visibility: 'Shared' }).map((t) => t.id),
    ['urgent'],
  );
  assert.equal(filterTasks(tasks, { priority: '1', visibility: 'Private' }).length, 0);
  assert.equal(filterTasks(tasks, { search: 'missing' }).length, 0);
  assert.deepEqual(filterTasks(tasks, { sort: 'Original' }), tasks);
  assert.deepEqual(tasks, before);
});
test('shared profiles edit the same priority without copying tasks', () => {
  const s = seed();
  shareTasks(s, 'alex', ['sam']);
  const task = s.tasks.find((t) => t.owner === 'alex'),
    count = s.tasks.length;
  s.tasks.find((t) => t.id === task.id && visibleTask(t, 'sam')).priority = 1;
  assert.equal(taskPriority(s.tasks.find((t) => t.id === task.id && visibleTask(t, 'alex'))), 1);
  assert.equal(s.tasks.length, count);
  assert.ok(validState(s));
});
