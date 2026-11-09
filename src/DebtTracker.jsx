import React, { useState } from 'react';
import { Settings, Check } from 'lucide-react';
import { trackerSettings, trackerDefaults, debtTrackerProgress } from './model.mjs';
import { themes, appearance } from './appearance.mjs';
const number = (n) => new Intl.NumberFormat('en-PL', { maximumFractionDigits: 2 }).format(n);
const palettes = {
  Garden: ['#59a675', '#8e5353', '#a78bfa'],
  Ocean: ['#22a6a1', '#526480', '#f5bd5c'],
  Sunset: ['#e29a50', '#845e88', '#ffd166'],
  Contrast: ['#008854', '#777777', '#9456e8'],
};
export default function DebtTracker({ profile, original, balance, state, mutate, busy }) {
  const settings = trackerSettings(profile.tracker),
    [editing, setEditing] = useState(false),
    [draft, setDraft] = useState(settings);
  const c = editing ? draft : settings,
    progress = debtTrackerProgress(original, balance, c),
    { step, bricks, manual } = progress,
    count = bricks.length;
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
            Brick colours match the remaining balance below. Partial bricks represent their exact
            amount. ✓ Paid · outlined = next milestone.
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
      <div className="tracker-balance-summary" aria-live="polite">
        <div>
          <span>
            {manual ? 'Tracker remaining · manual override' : 'Remaining debt · automatic'}
          </span>
          <strong>{number(progress.remaining)} zł</strong>
          <small>
            {number(Math.floor(progress.remaining / step))} × {number(step)} zł
            {progress.remaining % step > 0
              ? ` + ${number(progress.remaining % step)} zł partial brick`
              : ''}
            {editing ? ' · Preview' : ''}
          </small>
        </div>
        {manual ? (
          <div>
            <p>
              Debt balance: {number(balance)} zł. Automatic updates are paused for this tracker.
            </p>
            <button
              className="secondary"
              disabled={busy}
              onClick={async () => {
                if (editing) {
                  setDraft({ ...draft, remainingOverride: null });
                  return;
                }
                await mutate((s) => {
                  const p = s.profiles.find((p) => p.id === profile.id);
                  p.tracker = { ...trackerSettings(p.tracker), remainingOverride: null };
                }, 'Tracker follows debt balance');
              }}
            >
              Return to automatic
            </button>
          </div>
        ) : (
          <p>
            Linked to your debts. Repayments and balance edits update these bricks automatically.
          </p>
        )}
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
            Balance source
            <select
              aria-label="Tracker balance source"
              value={draft.remainingOverride == null ? 'automatic' : 'manual'}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  remainingOverride: e.target.value === 'manual' ? balance : null,
                })
              }
            >
              <option value="automatic">Automatic · linked to debts</option>
              <option value="manual">Manual override</option>
            </select>
          </label>
          {draft.remainingOverride != null && (
            <label>
              Tracker remaining debt (zł)
              <input
                aria-label="Tracker remaining debt"
                type="number"
                min="0"
                max="1000000000000"
                step="0.01"
                required
                value={draft.remainingOverride}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    remainingOverride: e.target.value === '' ? '' : +e.target.value,
                  })
                }
              />
              <small>Changes only this tracker; your debt records stay unchanged.</small>
            </label>
          )}
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
        {bricks.map(({ amount, size, paid, remaining, done, next, fill, width }, i) => {
          const description = `${number(amount)} zł milestone · ${number(size)} zł brick: ${number(paid)} zł paid, ${number(remaining)} zł remaining`;
          return (
            <div
              key={i}
              className={done ? 'done' : next ? 'next' : ''}
              style={{
                width: `${width}%`,
                background: `linear-gradient(to right, ${c.paid} ${fill}%, ${c.remaining} ${fill}%)`,
              }}
              title={description}
              aria-label={description}
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
        <span>{number(progress.paid)} zł paid off</span>
        <span>{number(progress.remaining)} zł remaining</span>
        <span>
          {count} squares calculated from {number(progress.total)} zł tracker total
        </span>
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
