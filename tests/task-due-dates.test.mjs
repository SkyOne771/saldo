import test from 'node:test';
import assert from 'node:assert/strict';
import {
  seed,
  validState,
  validTaskDate,
  taskDateKey,
  taskDueStatus,
  filterTasks,
  moveTask,
  shareTasks,
} from '../src/model.mjs';

test('optional task dates validate real calendar days including leap years', () => {
  for (const dueDate of ['2026-11-18', '2028-02-29', '0001-01-01', '9999-12-31']) {
    const s = seed();
    s.tasks[0].dueDate = dueDate;
    assert.equal(validTaskDate(dueDate), true);
    assert.ok(validState(s));
  }
  for (const dueDate of [
    '2026-02-29',
    '2026-04-31',
    '2026-13-01',
    '0000-01-01',
    '2026-11-18T00:00:00Z',
    '<script>',
    null,
    123,
  ]) {
    const s = seed();
    s.tasks[0].dueDate = dueDate;
    assert.equal(validTaskDate(dueDate), false);
    assert.equal(validState(s), false);
  }
  const s = seed();
  assert.ok(validState(s));
  s.tasks[0].dueDate = '';
  assert.ok(validState(s));
  assert.equal(taskDateKey(new Date(2026, 10, 18, 23, 59)), '2026-11-18');
});
test('due-date states distinguish overdue today future and completed without false overdue labels', () => {
  assert.equal(taskDueStatus({ status: 'To do' }, '2026-11-18'), 'No due date');
  assert.equal(taskDueStatus({ status: 'To do', dueDate: '2026-11-17' }, '2026-11-18'), 'Overdue');
  assert.equal(
    taskDueStatus({ status: 'In progress', dueDate: '2026-11-18' }, '2026-11-18'),
    'Due today',
  );
  assert.equal(taskDueStatus({ status: 'To do', dueDate: '2026-11-19' }, '2026-11-18'), 'Upcoming');
  assert.equal(taskDueStatus({ status: 'Done', dueDate: '2026-11-17' }, '2026-11-18'), 'Completed');
});
test('date filters combine with priorities and sharing and sort undated tasks last', () => {
  const tasks = [
      { id: 'none', name: 'No date', category: 'Home', status: 'To do' },
      { id: 'past', name: 'Past', category: 'Home', status: 'To do', dueDate: '2026-11-17' },
      {
        id: 'today',
        name: 'Today',
        category: 'Home',
        status: 'To do',
        dueDate: '2026-11-18',
        priority: 1,
        sharedWith: ['sam'],
      },
      { id: 'soon', name: 'Soon', category: 'Home', status: 'To do', dueDate: '2026-11-24' },
      { id: 'later', name: 'Later', category: 'Home', status: 'To do', dueDate: '2026-11-25' },
      { id: 'done', name: 'Done', category: 'Home', status: 'Done', dueDate: '2026-11-18' },
    ],
    before = structuredClone(tasks),
    today = '2026-11-18';
  assert.deepEqual(
    filterTasks(tasks, { due: 'Next 7 days', today }).map((t) => t.id),
    ['today', 'soon'],
  );
  assert.deepEqual(
    filterTasks(tasks, { due: 'Overdue', today }).map((t) => t.id),
    ['past'],
  );
  assert.deepEqual(
    filterTasks(tasks, { due: 'Due today', priority: '1', visibility: 'Shared', today }).map(
      (t) => t.id,
    ),
    ['today'],
  );
  assert.deepEqual(
    filterTasks(tasks, { due: 'No due date', today }).map((t) => t.id),
    ['none'],
  );
  assert.deepEqual(
    filterTasks(tasks, { due: 'Completed', today }).map((t) => t.id),
    ['done'],
  );
  assert.equal(filterTasks(tasks, { sort: 'Due date', today }).at(-1).id, 'none');
  assert.deepEqual(tasks, before);
});
test('shared drag moves preserve the due date and marking done suppresses overdue state', () => {
  const s = seed();
  shareTasks(s, 'alex', ['sam']);
  const task = s.tasks[0];
  task.dueDate = '2026-11-01';
  moveTask(s, task.id, 'Done', 'sam');
  assert.equal(task.dueDate, '2026-11-01');
  assert.equal(taskDueStatus(task, '2026-11-18'), 'Completed');
  delete task.dueDate;
  assert.equal(taskDueStatus(task, '2026-11-18'), 'No due date');
  assert.ok(validState(s));
});
