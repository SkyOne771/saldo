import React, { useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { moveTask } from './model.mjs';

export default function ShoppingList({ tasks, person, busy, mutate, openAdd }) {
  const [name, setName] = useState('');
  const items = tasks.filter((task) => task.category === 'Shopping');
  const pending = items.filter((task) => task.status !== 'Done');
  const purchased = items.filter((task) => task.status === 'Done');

  async function addItem(event) {
    event.preventDefault();
    if (!name.trim() || busy) return;
    const item = {
      id: crypto.randomUUID(),
      name: name.trim(),
      category: 'Shopping',
      status: 'To do',
      priority: 3,
      owner: person.id,
      sharedWith: person.taskSharedWith || [],
    };
    if (await mutate((state) => state.tasks.push(item), 'Shopping item added.')) setName('');
  }

  function renderItem(item) {
    const checked = item.status === 'Done';
    return (
      <li key={item.id} className={checked ? 'shopping-item purchased' : 'shopping-item'}>
        <label>
          <input
            type="checkbox"
            checked={checked}
            disabled={busy}
            onChange={() =>
              mutate(
                (state) => moveTask(state, item.id, checked ? 'To do' : 'Done', person.id),
                checked ? 'Moved back to the shopping list.' : 'Marked as purchased.',
              )
            }
          />
          <span>{item.name}</span>
        </label>
        <button
          type="button"
          className="icon-btn"
          aria-label={`Edit ${item.name}`}
          disabled={busy}
          onClick={() => openAdd('task', item)}
        >
          <Pencil size={16} />
        </button>
      </li>
    );
  }

  return (
    <section className="panel shopping-list">
      <form className="shopping-add" onSubmit={addItem}>
        <input
          type="text"
          aria-label="Shopping item"
          placeholder="Add an item, e.g. 2 cartons of milk"
          value={name}
          maxLength={200}
          required
          disabled={busy}
          onChange={(event) => setName(event.target.value)}
        />
        <button className="primary" disabled={busy || !name.trim()}>
          <Plus size={17} /> Add item
        </button>
      </form>
      <h3>To buy ({pending.length})</h3>
      {pending.length ? (
        <ul>{pending.map(renderItem)}</ul>
      ) : (
        <p className="empty">Nothing to buy yet.</p>
      )}
      {purchased.length > 0 && (
        <details>
          <summary>Purchased ({purchased.length})</summary>
          <ul>{purchased.map(renderItem)}</ul>
        </details>
      )}
    </section>
  );
}
