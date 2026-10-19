import React from 'react';
import { mergeFinance } from './merge.mjs';
const describe = (v) =>
  v === undefined ? 'Deleted' : typeof v === 'object' ? JSON.stringify(v).slice(0, 180) : String(v);
export default function ConflictRecovery({
  conflict,
  busy,
  onResolve,
  onCancel,
  onDownload,
  error,
}) {
  const result = mergeFinance(conflict.base, conflict.draft, conflict.latest);
  return (
    <div className="modal-backdrop conflict-backdrop">
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Recover concurrent changes"
      >
        <h2>Your edits are still here</h2>
        <p className="modal-sub">
          Another tab saved first. Unrelated changes are combined automatically. Review any
          overlapping values before saving.
        </p>
        {result.conflicts.length > 0 ? (
          <div className="conflict-list">
            {result.conflicts.map((c, i) => (
              <div key={i}>
                <b>{c.path}</b>
                <p>Your value: {describe(c.mine)}</p>
                <p>Latest value: {describe(c.latest)}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="field-help">No overlapping changes. Both edits can be kept.</p>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button className="secondary" disabled={busy} onClick={onCancel}>
            Keep editing
          </button>
          <button className="secondary" onClick={onDownload}>
            Download my draft
          </button>
          <button className="primary" disabled={busy} onClick={() => onResolve('mine')}>
            {result.conflicts.length ? 'Save using my conflicting values' : 'Save combined changes'}
          </button>
          {result.conflicts.length > 0 && (
            <button className="secondary" disabled={busy} onClick={() => onResolve('latest')}>
              Save using latest conflicting values
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
