import React, { useState } from 'react';
import { Settings, Check } from 'lucide-react';
import { trackerSettings, trackerDefaults } from './model.mjs';
import { themes, appearance } from './appearance.mjs';
const number = (n) => new Intl.NumberFormat('en-PL', { maximumFractionDigits: 2 }).format(n);
const palettes = {
  Garden: ['#59a675', '#8e5353', '#a78bfa'],
  Ocean: ['#22a6a1', '#526480', '#f5bd5c'],
  Sunset: ['#e29a50', '#845e88', '#ffd166'],
  Contrast: ['#008854', '#777777', '#9456e8'],
};
export default function DebtTracker({ profile, original, paidOff, state, mutate, busy }) {
  const settings = trackerSettings(profile.tracker),
    [editing, setEditing] = useState(false),
    [draft, setDraft] = useState(settings);
  const c = editing ? draft : settings,
    step = Math.max(1, c.step, Math.ceil(original / 1000)),
    count = Math.ceil(original / step);
  return (
    <section className="panel debt-tracker">
      <div className="panel-heading">
        <div>
          <h3>Your colourful path to freedom</h3>
          <p>
            Each square represents up to {number(step)} zł.{' '}
            {step !== c.step
              ? 'Milestones are enlarged to keep the grid within 1,000 squares. '
              : ''}
            ✓ Paid · outlined = next milestone.
          </p>
        </div>
        <button
          className="secondary"
          aria-expanded={editing}
          onClick={() => {
            setDraft(settings);
            setEditing(!editing);
          }}
        >
          <Settings size={15} /> Customize tracker
        </button>
      </div>
      {editing && (
        <form
          className="tracker-controls"
          onSubmit={async (e) => {
            e.preventDefault();
            if (
              await mutate((s) => {
                s.profiles.find((p) => p.id === profile.id).tracker = draft;
              }, 'Tracker settings saved')
            )
              setEditing(false);
          }}
        >
          <label>
            Colour preset
            <select
              aria-label="Tracker colour preset"
              defaultValue=""
              onChange={(e) => {
                const [paid, remaining, current] = palettes[e.target.value];
                setDraft({ ...draft, paid, remaining, current });
              }}
            >
              <option value="" disabled>
                Choose a palette
              </option>
              {Object.keys(palettes).map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
          {['paid', 'remaining', 'current'].map((k) => (
            <label key={k}>
              {k === 'paid'
                ? 'Paid colour'
                : k === 'remaining'
                  ? 'Remaining colour'
                  : 'Next milestone colour'}
              <input
                aria-label={k + ' colour'}
                type="color"
                value={draft[k]}
                onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}
              />
            </label>
          ))}
          <label>
            Amount per square (zł)
            <input
              name="step"
              type="number"
              min="1"
              max="1000000000000"
              step="1"
              required
              value={draft.step}
              onChange={(e) => setDraft({ ...draft, step: +e.target.value })}
            />
          </label>
          <label>
            Columns
            <input
              name="columns"
              type="number"
              min="5"
              max="40"
              required
              value={draft.columns}
              onChange={(e) => setDraft({ ...draft, columns: +e.target.value })}
            />
          </label>
          <label>
            Square labels
            <select
              value={draft.labels}
              onChange={(e) => setDraft({ ...draft, labels: e.target.value })}
            >
              <option value="number">Step number</option>
              <option value="amount">Amount paid</option>
              <option value="none">Symbols only</option>
            </select>
          </label>
          <div className="tracker-actions">
            <button
              type="button"
              className="secondary"
              onClick={() => setDraft({ ...trackerDefaults })}
            >
              Reset preview
            </button>
            <button className="primary" disabled={busy}>
              Save tracker
            </button>
            <button type="button" className="text-btn" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}
      <div
        className="tracker-grid"
        style={{
          '--tracker-columns': Math.max(5, Math.min(40, c.columns)),
          '--paid': c.paid,
          '--remaining': c.remaining,
          '--current': c.current,
        }}
      >
        {Array.from({ length: count }, (_, i) => {
          const amount = Math.min((i + 1) * step, original),
            done = paidOff >= amount,
            next = !done && paidOff >= i * step;
          return (
            <div
              key={i}
              className={done ? 'done' : next ? 'next' : ''}
              title={`${number(amount)} zł · ${done ? 'Paid' : next ? 'Next milestone' : 'Remaining'}`}
              aria-label={`${number(amount)} zł: ${done ? 'Paid' : next ? 'Next milestone' : 'Remaining'}`}
            >
              {done && <Check size={11} />}{' '}
              {c.labels === 'number'
                ? i + 1
                : c.labels === 'amount'
                  ? number(amount)
                  : next
                    ? '◇'
                    : ''}
            </div>
          );
        })}
      </div>
      {!count && <p className="empty">Add a debt to begin your colourful journey.</p>}
      <div className="tracker-legend">
        <span>✓ Paid</span>
        <span>◇ Next milestone</span>
        <span>{number(paidOff)} zł paid off</span>
      </div>
      <details className="tracker-app-theme">
        <summary>App theme & appearance</summary>
        <div className="tracker-controls">
          <label>
            App colour theme
            <select
              aria-label="App colour theme"
              value={appearance(state.appearance).color}
              disabled={busy}
              onChange={(e) =>
                mutate((s) => {
                  s.appearance = { ...appearance(s.appearance), color: e.target.value };
                }, 'Theme saved')
              }
            >
              {themes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Appearance
            <select
              aria-label="App appearance"
              value={appearance(state.appearance).mode}
              disabled={busy}
              onChange={(e) =>
                mutate((s) => {
                  s.appearance = { ...appearance(s.appearance), mode: e.target.value };
                }, 'Appearance saved')
              }
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">Use device setting</option>
            </select>
          </label>
        </div>
      </details>
    </section>
  );
}
