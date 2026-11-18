import React, { useEffect, useRef, useState } from 'react';
import { GripVertical, Pencil, Plus } from 'lucide-react';
import { moveTask, statusClass, taskPriorities, taskPriority } from './model.mjs';
const statuses = ['To do', 'In progress', 'Done'];
const dragType = 'application/x-saldo-task';
export default function TaskBoard({
  tasks,
  allTasks,
  profile,
  busy,
  mutate,
  openAdd,
  newPriority,
}) {
  const [dragging, setDragging] = useState(null),
    [over, setOver] = useState(null),
    active = useRef(null),
    touch = useRef(null);
  const clear = () => {
    active.current = null;
    touch.current = null;
    setDragging(null);
    setOver(null);
  };
  useEffect(() => {
    const cancel = (e) => {
      if (e.key === 'Escape') clear();
    };
    const blur = () => clear();
    window.addEventListener('keydown', cancel);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', cancel);
      window.removeEventListener('blur', blur);
    };
  }, []);
  useEffect(() => {
    if (busy || (active.current && !tasks.some((t) => t.id === active.current.id))) clear();
  }, [busy, tasks]);
  const begin = (id, mode) => {
    active.current = { id, mode };
    setDragging({ id, mode });
  };
  const commit = async (id, status) => {
    clear();
    const task = tasks.find((t) => t.id === id);
    if (busy || !task || task.status === status || !statuses.includes(status)) return;
    await mutate((s) => moveTask(s, id, status, profile), `Task moved to ${status}`);
  };
  const touchTarget = (e) =>
    document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-task-drop-status]')?.dataset
      .taskDropStatus;
  const pointerDown = (e, id) => {
    if (busy || e.pointerType === 'mouse' || e.button !== 0) return;
    touch.current = { id, pointerId: e.pointerId, x: e.clientX, y: e.clientY, started: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const pointerMove = (e) => {
    const p = touch.current;
    if (!p || p.pointerId !== e.pointerId) return;
    if (!p.started && Math.hypot(e.clientX - p.x, e.clientY - p.y) < 8) return;
    if (!p.started) {
      p.started = true;
      begin(p.id, 'touch');
    }
    e.preventDefault();
    setOver(touchTarget(e) || null);
  };
  const pointerUp = (e) => {
    const p = touch.current;
    if (!p || p.pointerId !== e.pointerId) return;
    const status = p.started ? touchTarget(e) : null;
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
    if (status) void commit(p.id, status);
    else clear();
  };
  return (
    <>
      <p id="task-drag-help" className="task-drag-help">
        Drag a card to change its status. On touch screens, drag its handle to a status at the top.
        You can also use the status dropdown.
      </p>
      {dragging?.mode === 'touch' && (
        <div className="task-touch-targets" aria-hidden="true">
          {statuses.map((status) => (
            <span
              key={status}
              data-task-drop-status={status}
              className={over === status ? 'active' : ''}
            >
              {status}
            </span>
          ))}
        </div>
      )}
      <div className="kanban">
        {statuses.map((status) => (
          <section
            key={status}
            className={`panel task-column${over === status ? ' task-drop-target' : ''}`}
            data-task-drop-status={status}
            aria-label={`${status} tasks`}
            onDragOver={(e) => {
              if (!busy && active.current?.mode === 'native') {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                setOver(status);
              }
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget))
                setOver((previous) => (previous === status ? null : previous));
            }}
            onDrop={(e) => {
              if (!active.current || busy) return;
              e.preventDefault();
              const id = e.dataTransfer.getData(dragType);
              if (active.current.mode === 'native' && id === active.current.id)
                void commit(id, status);
              else clear();
            }}
          >
            <div className="panel-heading">
              <h3>{status}</h3>
              <span className="badge neutral">
                {tasks.filter((t) => t.status === status).length}
              </span>
            </div>
            {tasks
              .filter((t) => t.status === status)
              .map((task) => (
                <div
                  key={task.id}
                  data-task-id={task.id}
                  className={`task-card task-${task.status.toLowerCase().replace(' ', '-')}${dragging?.id === task.id ? ' task-dragging' : ''}`}
                  draggable={!busy}
                  aria-describedby="task-drag-help"
                  onDragStart={(e) => {
                    if (busy || touch.current) {
                      e.preventDefault();
                      return;
                    }
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData(dragType, task.id);
                    begin(task.id, 'native');
                  }}
                  onDragEnd={clear}
                >
                  <span
                    className="task-drag-handle"
                    title="Drag to another status column"
                    onPointerDown={(e) => pointerDown(e, task.id)}
                    onPointerMove={pointerMove}
                    onPointerUp={pointerUp}
                    onPointerCancel={clear}
                    onLostPointerCapture={() => {
                      if (touch.current) clear();
                    }}
                  >
                    <GripVertical size={15} aria-hidden="true" /> Drag
                  </span>
                  <span className={'badge ' + statusClass(task.status)}>
                    {task.category} · {task.status}
                    {task.sharedWith?.length ? ' · Shared' : ''}
                  </span>
                  <span className={`badge task-priority priority-${taskPriority(task)}`}>
                    P{taskPriority(task)} · {taskPriorities[taskPriority(task) - 1].label}
                  </span>
                  <h3>{task.name}</h3>
                  <div
                    draggable={false}
                    onDragStart={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    <select
                      aria-label={'Status for ' + task.name}
                      value={task.status}
                      disabled={busy}
                      onChange={(e) =>
                        mutate(
                          (s) => moveTask(s, task.id, e.target.value, profile),
                          `Task moved to ${e.target.value}`,
                        )
                      }
                    >
                      {statuses.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                    <select
                      aria-label={'Priority for ' + task.name}
                      className={`task-priority-select priority-${taskPriority(task)}`}
                      value={taskPriority(task)}
                      disabled={busy}
                      onChange={(e) =>
                        mutate((s) => {
                          s.tasks.find((t) => t.id === task.id).priority = +e.target.value;
                        })
                      }
                    >
                      {taskPriorities.map((p) => (
                        <option key={p.value} value={p.value}>
                          P{p.value} · {p.label}
                        </option>
                      ))}
                    </select>
                    <button
                      className="icon-btn"
                      title="Edit task"
                      disabled={busy}
                      onClick={() => openAdd('task', task)}
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                </div>
              ))}
            {!tasks.some((t) => t.status === status) && (
              <p className="empty task-empty-drop">
                {allTasks.some((t) => t.status === status)
                  ? 'No tasks match these filters.'
                  : 'No tasks in this status yet.'}{' '}
                Drop a task here.
              </p>
            )}
            <button
              className="list-footer"
              disabled={busy}
              onClick={() => openAdd('task', { status, priority: newPriority })}
            >
              <Plus size={15} /> Add a task
            </button>
          </section>
        ))}
      </div>
    </>
  );
}
