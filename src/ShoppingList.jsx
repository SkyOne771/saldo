import React, { useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { visibleTask } from './model.mjs';

export default function ShoppingList({ items, person, busy, mutate, openAdd }) {
  const [name, setName] = useState('');
  const pending = items.filter((task) => !task.purchased);
  const purchased = items.filter((task) => task.purchased);

  async function addItem(event) {
    event.preventDefault();
    if (!name.trim() || busy) return;
    const item = {
      id: crypto.randomUUID(),
      name: name.trim(),
      purchased: false,
      owner: person.id,
      sharedWith: person.taskSharedWith || [],
    };
    if (await mutate((state) => (state.shoppingItems ??= []).push(item), 'Shopping item added.'))
      setName('');
  }

  function renderItem(item) {
    const checked = item.purchased;
    return (
      <li key={item.id} className={checked ? 'shopping-item purchased' : 'shopping-item'}>
        <label>
          <input
            type="checkbox"
            checked={checked}
            disabled={busy}
            onChange={() =>
              mutate(
                (state) => {
                  const record = state.shoppingItems?.find((entry) => entry.id === item.id);
                  if (!record || !visibleTask(record, person.id))
                    throw Error('Shopping item unavailable.');
                  record.purchased = !checked;
                },
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
          onClick={() => openAdd('shopping', item)}
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
