import React from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { setSharePaid } from './model.mjs';
const money = (n) => new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 2 }).format(n);
const monthName = (month) =>
  new Date(month + '-01T12:00:00').toLocaleDateString('en', { month: 'long', year: 'numeric' });
const balance = (amount) =>
  `${money(Math.abs(amount))} zł ${amount > 0 ? 'you owe' : amount < 0 ? 'owed to you' : 'net balance'}`;
export default function SharedCarryover({
  summary,
  state,
  profile,
  month,
  busy,
  mutate,
  onReview,
}) {
  const earlier = summary.entries.filter((entry) => entry.month < month);
  return (
    <section className="panel shared-carryover" aria-label="Shared balance breakdown">
      <div className="carryover-totals">
        <div>
          <span>{monthName(month)}</span>
          <b>{balance(summary.current)}</b>
        </div>
        <div>
          <span>Carried from earlier months</span>
          <b>{balance(summary.carried)}</b>
        </div>
        <div>
          <span>Total through {monthName(month)}</span>
          <b>{balance(summary.total)}</b>
        </div>
      </div>
      <p>
        Unpaid reimbursements stay linked to their original bill month and carry forward until
        confirmed. They are counted once, including bills hidden from a list.
      </p>
      {earlier.length ? (
        <details>
          <summary>
            Review {earlier.length} earlier unpaid bill {earlier.length === 1 ? 'share' : 'shares'}
          </summary>
          <p>
            Confirm reimbursement only after you have paid your partner back. If people owe each
            other, the total is netted; individual unpaid shares are listed below.
          </p>
          <div className="carryover-entries">
            {earlier.map((entry) => {
              const other =
                state.profiles.find((p) => p.id === entry.counterpart)?.name || 'Partner';
              return (
                <div className="carryover-entry" key={`${entry.billId}-${entry.month}`}>
                  <div className="carryover-description">
                    <b>{entry.name}</b>
                    <span>{monthName(entry.month)}</span>
                    <span>{entry.amount > 0 ? `You owe ${other}` : `${other} owes you`}</span>
                  </div>
                  <b>{money(Math.abs(entry.amount))} zł</b>
                  <div className="carryover-actions">
                    {entry.amount > 0 && (
                      <button
                        className="secondary"
                        disabled={busy}
                        aria-label={`Confirm reimbursement for ${entry.name}, ${monthName(entry.month)}`}
                        onClick={() =>
                          mutate(
                            (s) => setSharePaid(s, entry.billId, entry.month, profile, true),
                            'Reimbursement confirmed in its original month',
                          )
                        }
                      >
                        <Check size={14} /> Confirm reimbursed
                      </button>
                    )}
                    <button className="text-btn" onClick={() => onReview(entry.month)}>
                      Review month <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </details>
      ) : (
        <p>No unpaid reimbursements from earlier months.</p>
      )}
    </section>
  );
}
