import React, { useState } from 'react';
import {
  ArrowLeftRight,
  ArrowRight,
  Check,
  Clock,
  Plus,
  Pencil,
  Search,
  Users,
  Repeat,
  CheckCircle2,
  EyeOff,
  RotateCcw,
  Info,
  X,
} from 'lucide-react';
import { useDialog } from './useDialog.js';
import {
  billStatus,
  statusClass,
  billShare,
  billPayer,
  billParticipants,
  setBillPayer,
  billInView,
  setBillView,
  importBillsToView,
  setBillPaid,
  billDueDate,
} from './model.mjs';
const money = (n) => new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 2 }).format(n);
export default function BillsPanel({
  sharedPage,
  state,
  profile,
  month,
  bills,
  busy,
  mutate,
  openAdd,
  paidToggle,
}) {
  const [search, setSearch] = useState(''),
    [filter, setFilter] = useState('All'),
    [sort, setSort] = useState('Due date'),
    [transfer, setTransfer] = useState(false),
    [bulkConfirm, setBulkConfirm] = useState(false),
    [scope, setScope] = useState('Active'),
    [selected, setSelected] = useState([]),
    [undo, setUndo] = useState(null);
  useDialog(bulkConfirm, () => {
    if (!busy) setBulkConfirm(false);
  });
  const view = sharedPage ? 'shared' : 'recurring',
    viewName = sharedPage ? 'Shared expenses' : 'Recurring bills',
    otherName = sharedPage ? 'Recurring bills' : 'Shared expenses';
  const available = sharedPage ? bills.filter((b) => b.shared) : bills,
    removed = available.filter((b) => !billInView(state, b, profile, view)),
    active = available.length - removed.length;
  const shown = available
    .filter((b) =>
      scope === 'Removed'
        ? !billInView(state, b, profile, view)
        : billInView(state, b, profile, view),
    )
    .filter((b) => b.name.toLowerCase().includes(search.trim().toLowerCase()))
    .filter(
      (b) =>
        filter === 'All' ||
        (filter === 'Unpaid' && !['Paid', 'Scheduled'].includes(billStatus(b, month))) ||
        filter === billStatus(b, month),
    )
    .sort((a, b) =>
      sort === 'Name'
        ? a.name.localeCompare(b.name)
        : sort === 'Amount'
          ? b.amount - a.amount
          : sort === 'Your share'
            ? billShare(state, b, profile) - billShare(state, a, profile)
            : a.day - b.day || a.name.localeCompare(b.name),
    );
  const picked = shown.filter((b) => selected.includes(b.id)),
    unpaid =
      scope === 'Active'
        ? shown.filter((b) => !['Paid', 'Scheduled'].includes(billStatus(b, month)))
        : [],
    allSelected = shown.length > 0 && picked.length === shown.length;
  const changeView = async (ids, show) => {
    if (!ids.length) return;
    const ok = await mutate(
      (s) => setBillView(s, ids, profile, view, show, month),
      show ? 'Restored to ' + viewName : 'Removed from ' + viewName + ' only',
    );
    if (ok) {
      setSelected([]);
      setUndo(
        show
          ? null
          : {
              ids,
              label:
                ids.length === 1
                  ? available.find((b) => b.id === ids[0])?.name
                  : `${ids.length} bills`,
            },
      );
    }
  };
  const switchScope = (value) => {
    setScope(value);
    setSelected([]);
  };
  return (
    <section className="panel bill-manager">
      <div className="bill-manager-heading">
        <div>
          <h3>{sharedPage ? 'Your shared bills' : 'Your recurring payments'}</h3>
          <p>Remove from this list only. Your budget, split and payment history stay intact.</p>
        </div>
        <div className="bill-toolbar">
          <button className="secondary" onClick={() => setTransfer(true)}>
            <ArrowLeftRight size={15} />
            {sharedPage ? 'Import recurring bills' : 'Import from shared'}
          </button>
          {sharedPage && state.profiles.length < 2 && (
            <button className="secondary" onClick={() => openAdd('profile')}>
              <Users size={15} />
              Add partner profile
            </button>
          )}
        </div>
      </div>
      <div className="bill-view-tabs" role="group" aria-label="Payment list visibility">
        <button aria-pressed={scope === 'Active'} onClick={() => switchScope('Active')}>
          Active <span>{active}</span>
        </button>
        <button aria-pressed={scope === 'Removed'} onClick={() => switchScope('Removed')}>
          Removed from this view <span>{removed.length}</span>
        </button>
      </div>
      {undo && (
        <div className="bill-undo" role="status">
          <EyeOff size={16} />
          <span>
            <b>{undo.label}</b> removed from {viewName} only.
          </span>
          <button
            className="text-btn"
            disabled={busy}
            onClick={async () => {
              if (
                await mutate(
                  (s) => setBillView(s, undo.ids, profile, view, true, month),
                  'Removal undone',
                )
              )
                setUndo(null);
            }}
          >
            Undo
          </button>
          <button
            className="icon-btn"
            aria-label="Dismiss removal message"
            onClick={() => setUndo(null)}
          >
            <X size={15} />
          </button>
        </div>
      )}
      {scope === 'Removed' && (
        <div className="bill-view-note">
          <RotateCcw size={16} />
          <p>
            These bills are saved. Restore them here at any time. Splits, payment history and your
            budget are unchanged.
          </p>
        </div>
      )}
      <div className="bill-filters">
        <label className="search">
          <Search size={16} />
          <input
            aria-label="Search payments"
            value={search}
            placeholder="Find a payment…"
            onChange={(e) => {
              setSearch(e.target.value);
              setSelected([]);
            }}
          />
        </label>
        <select
          aria-label="Filter payments"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setSelected([]);
          }}
        >
          {['All', 'Unpaid', 'Overdue', 'Paid', 'Upcoming', 'Due today', 'Scheduled'].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select aria-label="Sort payments" value={sort} onChange={(e) => setSort(e.target.value)}>
          {['Due date', 'Amount', 'Your share', 'Name'].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <span>
          {shown.length} {shown.length === 1 ? 'bill' : 'bills'}
        </span>
        {unpaid.length > 1 && (
          <button className="text-btn" disabled={busy} onClick={() => setBulkConfirm(true)}>
            <CheckCircle2 size={14} />
            Mark shown paid
          </button>
        )}
      </div>
      {shown.length > 0 && (
        <div className="bill-selection">
          <label>
            <input
              type="checkbox"
              aria-label="Select shown bills"
              checked={allSelected}
              onChange={(e) => setSelected(e.target.checked ? shown.map((b) => b.id) : [])}
            />
            Select shown
          </label>
          {picked.length > 0 && (
            <>
              <b>{picked.length} selected</b>
              <button
                className="secondary"
                disabled={busy}
                onClick={() =>
                  changeView(
                    picked.map((b) => b.id),
                    scope === 'Removed',
                  )
                }
              >
                {scope === 'Removed' ? <RotateCcw size={14} /> : <EyeOff size={14} />}{' '}
                {scope === 'Removed' ? 'Restore selected' : 'Remove selected from this view'}
              </button>
              <button className="text-btn" onClick={() => setSelected([])}>
                Clear
              </button>
            </>
          )}
        </div>
      )}
      {!shown.length && (
        <div className="empty payments-empty">
          {search || filter !== 'All' ? (
            <>
              <p>No payments match these filters.</p>
              <button
                className="text-btn"
                onClick={() => {
                  setSearch('');
                  setFilter('All');
                }}
              >
                Clear filters
              </button>
            </>
          ) : scope === 'Removed' ? (
            'Nothing removed. Bills you remove from this view will be kept here.'
          ) : (
            <>
              <p>
                {sharedPage
                  ? 'Import an existing recurring bill or add your first shared bill.'
                  : 'Add a bill or import one from Shared expenses.'}
              </p>
              {removed.length > 0 && (
                <button className="text-btn" onClick={() => switchScope('Removed')}>
                  Restore {removed.length} removed {removed.length === 1 ? 'bill' : 'bills'}{' '}
                  <ArrowRight size={14} />
                </button>
              )}
            </>
          )}
        </div>
      )}
      {shown.map((b) => {
        const status = billStatus(b, month),
          partner = billParticipants(state, b).find((id) => id !== profile);
        return (
          <article
            className={
              'payment-row ' +
              (scope === 'Removed'
                ? 'payment-removed'
                : 'payment-' + status.toLowerCase().replace(' ', '-'))
            }
            key={b.id}
            data-bill-id={b.id}
          >
            <input
              className="bill-select"
              type="checkbox"
              aria-label={'Select ' + b.name}
              checked={selected.includes(b.id)}
              onChange={(e) =>
                setSelected(
                  e.target.checked ? [...selected, b.id] : selected.filter((id) => id !== b.id),
                )
              }
            />
            <span className="item-icon">
              {b.shared ? <Users size={18} /> : <Repeat size={18} />}
            </span>
            <div className="payment-name">
              <b>{b.name}</b>
              <span>
                {b.frequency}
                {b.frequency === 'Yearly' && b.dueMonth
                  ? ` · ${new Date(2000, b.dueMonth - 1, 1).toLocaleDateString('en', { month: 'short' })}`
                  : ''}{' '}
                · due {+billDueDate(b, month).slice(-2)}
              </span>
              <span className="split-label">
                {b.shared
                  ? `50/50 with ${state.profiles.find((p) => p.id === partner)?.name || 'partner'}`
                  : 'Personal bill'}
                {!billInView(state, b, profile, sharedPage ? 'recurring' : 'shared') &&
                (b.shared || sharedPage)
                  ? ` · Not in ${otherName}`
                  : ''}
              </span>
            </div>
            <div className="payment-value">
              <b>{money(b.amount)} zł</b>
              {b.shared && <span>Your share {money(billShare(state, b, profile))} zł</span>}
            </div>
            {sharedPage && scope === 'Active' && (
              <label className="payer-field">
                Paid by
                <select
                  aria-label={'Payer for ' + b.name}
                  disabled={busy}
                  value={billPayer(b, month, state)}
                  onChange={(e) =>
                    mutate(
                      (s) => setBillPayer(s, b.id, month, e.target.value),
                      'Payer saved for this month',
                    )
                  }
                >
                  {billParticipants(state, b).map((id) => (
                    <option key={id} value={id}>
                      {state.profiles.find((p) => p.id === id)?.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {scope === 'Active' ? (
              <button
                className={'badge status ' + statusClass(status)}
                disabled={busy || status === 'Scheduled'}
                aria-label={`${b.paid[month] ? 'Mark unpaid' : 'Mark paid'}: ${b.name}`}
                title={b.paid[month] ? 'Click to mark unpaid' : 'Click to mark paid'}
                onClick={() => paidToggle(b)}
              >
                {status === 'Paid' ? <Check size={12} /> : <Clock size={12} />} {status}
              </button>
            ) : (
              <span className="badge neutral">Removed here</span>
            )}
            <div className="bill-row-actions">
              <button
                className="icon-btn"
                aria-label={'Edit ' + b.name}
                title="Edit bill · changes apply everywhere"
                onClick={() => openAdd('bill', b)}
              >
                <Pencil size={16} />
              </button>
              <button
                className={scope === 'Removed' ? 'secondary restore-bill' : 'icon-btn remove-bill'}
                disabled={busy}
                aria-label={
                  (scope === 'Removed' ? 'Restore ' : 'Remove ') +
                  b.name +
                  (scope === 'Removed' ? ' to ' : ' from ') +
                  viewName
                }
                title={scope === 'Removed' ? 'Restore to this view' : 'Remove from this view only'}
                onClick={() => changeView([b.id], scope === 'Removed')}
              >
                {scope === 'Removed' ? (
                  <>
                    <RotateCcw size={14} />
                    Restore
                  </>
                ) : (
                  <EyeOff size={17} />
                )}
              </button>
            </div>
          </article>
        );
      })}
      <div className="bill-manager-footer">
        <button
          className="text-btn"
          onClick={() => openAdd('bill', sharedPage ? { shared: true } : undefined)}
        >
          <Plus size={15} />
          Add {sharedPage ? 'shared' : 'recurring'} bill
        </button>
        <span>
          {scope === 'Removed' ? 'Removed list subtotal' : 'Visible list subtotal'}:{' '}
          <b>
            {money(
              shown.reduce(
                (sum, b) =>
                  sum + billShare(state, b, profile) / (b.frequency === 'Yearly' ? 12 : 1),
                0,
              ),
            )}{' '}
            zł / month
          </b>
        </span>
      </div>
      <details className="bill-help">
        <summary>
          <Info size={14} />
          How removal works
        </summary>
        <p>
          Removal only hides a bill from this list for the selected profile. It stays in {otherName}{' '}
          unless you remove it there too. Budget totals, your 50/50 split and payment history stay
          unchanged. To stop splitting, edit the bill and turn off the split. To delete the record
          everywhere, use Delete inside its edit form.
        </p>
      </details>
      {transfer && (
        <BillTransfer
          sharedPage={sharedPage}
          state={state}
          profile={profile}
          bills={bills}
          busy={busy}
          onClose={() => setTransfer(false)}
          onSave={async (ids, partner) => {
            const ok = await mutate(
              (s) => importBillsToView(s, ids, profile, view, partner, month),
              `${ids.length} ${ids.length === 1 ? 'bill added' : 'bills added'} to ${viewName}`,
            );
            if (ok) {
              setTransfer(false);
              switchScope('Active');
              setSearch('');
              setFilter('All');
            }
          }}
          onAddProfile={() => {
            setTransfer(false);
            openAdd('profile');
          }}
        />
      )}
      {bulkConfirm && (
        <div className="modal-backdrop">
          <div className="modal" role="dialog" aria-modal="true" aria-label="Confirm bulk payment">
            <h2>Mark {unpaid.length} bills paid?</h2>
            <p className="modal-sub">
              Only the {unpaid.length} visible unpaid bills due in {month} will change. Removed
              bills and annual bills scheduled for other months stay unchanged.
            </p>
            <div className="form-actions">
              <button className="secondary" onClick={() => setBulkConfirm(false)}>
                Cancel
              </button>
              <button
                className="primary"
                disabled={busy}
                onClick={async () => {
                  if (
                    await mutate((s) => {
                      for (const b of unpaid) setBillPaid(s, b.id, month, true);
                    }, 'Visible bills marked paid')
                  )
                    setBulkConfirm(false);
                }}
              >
                Confirm paid
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
function BillTransfer({ sharedPage, state, profile, bills, busy, onClose, onSave, onAddProfile }) {
  useDialog(true, () => {
    if (!busy) onClose();
  });
  const [selected, setSelected] = useState([]),
    [query, setQuery] = useState(''),
    [partner, setPartner] = useState(state.profiles.find((p) => p.id !== profile)?.id || '');
  const view = sharedPage ? 'shared' : 'recurring',
    candidates = bills
      .filter((b) =>
        sharedPage
          ? !b.shared || !billInView(state, b, profile, view)
          : b.shared && !billInView(state, b, profile, view),
      )
      .filter((b) => b.name.toLowerCase().includes(query.trim().toLowerCase())),
    needsPartner = sharedPage && bills.some((b) => selected.includes(b.id) && !b.shared);
  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <form
        className="modal transfer-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={sharedPage ? 'Import recurring bills' : 'Import from shared'}
        onSubmit={(e) => {
          e.preventDefault();
          onSave(selected, partner);
        }}
      >
        <h2>{sharedPage ? 'Import recurring bills' : 'Import from shared'}</h2>
        <p className="modal-sub">
          {sharedPage
            ? 'Add personal bills to a 50/50 split, or restore shared bills removed from this list. Existing amounts and payment history are kept.'
            : 'Bring shared bills back into your recurring list. The 50/50 split, payer and payment history stay unchanged.'}
        </p>
        <label className="search">
          <Search size={15} />
          <input
            aria-label="Search import candidates"
            placeholder="Find a bill…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        {sharedPage && (
          <label>
            Share personal bills with
            <select
              aria-label="Import partner"
              required={needsPartner}
              value={partner}
              onChange={(e) => setPartner(e.target.value)}
            >
              {!partner && <option value="">Choose a partner</option>}
              {state.profiles
                .filter((p) => p.id !== profile)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </label>
        )}
        {sharedPage && !partner && (
          <button type="button" className="secondary full" onClick={onAddProfile}>
            Add partner profile
          </button>
        )}
        <div className="import-selection-tools">
          <button
            type="button"
            className="text-btn"
            disabled={!candidates.length}
            onClick={() => setSelected([...new Set([...selected, ...candidates.map((b) => b.id)])])}
          >
            Select shown
          </button>
          <button type="button" className="text-btn" onClick={() => setSelected([])}>
            Clear selection
          </button>
        </div>
        <div className="import-candidates">
          {candidates.map((b) => (
            <label className="import-candidate" key={b.id}>
              <input
                type="checkbox"
                checked={selected.includes(b.id)}
                onChange={(e) =>
                  setSelected(
                    e.target.checked ? [...selected, b.id] : selected.filter((id) => id !== b.id),
                  )
                }
              />
              <span>
                <b>{b.name}</b>
                <small>
                  {b.shared ? 'Restore · keeps 50/50' : 'Start 50/50 split'} · {b.frequency} · due{' '}
                  {+billDueDate(b, month).slice(-2)}
                </small>
              </span>
              <b>{money(b.amount)} zł</b>
            </label>
          ))}
          {!candidates.length && (
            <p className="empty">
              {query
                ? 'No matching bills.'
                : sharedPage
                  ? 'All available bills are already in this shared list.'
                  : 'All shared bills are already in your recurring list. You can restore personal bills from Removed from this view.'}
            </p>
          )}
        </div>
        <div className="form-actions">
          <button type="button" className="secondary" disabled={busy} onClick={onClose}>
            Cancel
          </button>
          <button
            className="primary"
            disabled={busy || !selected.length || (needsPartner && !partner)}
          >
            {busy ? 'Saving…' : `Add ${selected.length} selected`}
            <ArrowRight size={15} />
          </button>
        </div>
      </form>
    </div>
  );
}
