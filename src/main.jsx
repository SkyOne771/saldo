import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Repeat,
  Users,
  Landmark,
  CheckCheck,
  Settings,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ArrowRight,
  Leaf,
  House,
  Wifi,
  Zap,
  Flame,
  ShieldCheck,
  Car,
  Wallet,
  Check,
  X,
  Download,
  LogOut,
  Search,
  MoreHorizontal,
  TrendingDown,
  Target,
  CalendarDays,
  Menu,
  CheckCircle2,
  Circle,
  Clock,
  Heart,
  ArrowUp,
  Receipt,
  Pencil,
  Trash2,
} from 'lucide-react';
import DebtTracker from './DebtTracker.jsx';
import ConflictRecovery from './ConflictRecovery.jsx';
import RecoveryForm from './RecoveryForm.jsx';
import { mergeFinance } from './merge.mjs';
import BillsPanel from './BillsPanel.jsx';
import SecuritySettings from './SecuritySettings.jsx';
import { useDialog } from './useDialog.js';
import { themes, appearance } from './appearance.mjs';
import {
  totals,
  monthKey,
  repay,
  updateRepayment,
  deleteRepayment,
  deleteProfile,
  visibleBill,
  billShare,
  billParticipants,
  billStatus,
  statusClass,
  sharedBalance,
  billForMonth,
  billDueDate,
  setBillPaid,
  editBillForMonth,
  incomeForMonth,
  setMonthlyIncome,
} from './model.mjs';
import './style.css';
const money = (n, dec) =>
  new Intl.NumberFormat('en-PL', {
    maximumFractionDigits: dec ?? 2,
    minimumFractionDigits: dec ?? 0,
  }).format(n);
const currency = (n) => (
  <>
    {money(n)} <small>zł</small>
  </>
);
const icons = {
  Home: House,
  Utilities: Zap,
  Insurance: ShieldCheck,
  Living: Wallet,
  Subscriptions: Repeat,
};
const nav = [
  ['Overview', LayoutDashboard],
  ['Recurring bills', Repeat],
  ['Shared expenses', Users],
  ['Debts & goals', Landmark],
  ['To-do list', CheckCheck],
];
let csrfToken = '';
async function api(path, options) {
  const r = await fetch(import.meta.env.BASE_URL + 'api/' + path, {
    signal: AbortSignal.timeout(15000),
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Saldo-Request': '1',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    },
  });
  const j = await r
    .json()
    .catch(() => ({ error: 'The server returned an unexpected response. Try again.' }));
  if (!r.ok) {
    if (j.code === 'AUTH_REQUIRED') window.dispatchEvent(new Event('saldo-auth-expired'));
    const error = Error(j.error || 'Something went wrong');
    error.code = j.code;
    throw error;
  }
  if (j.csrfToken) csrfToken = j.csrfToken;
  return j;
}
function App() {
  const [session, setSession] = useState(null),
    [state, setState] = useState(null),
    [revision, setRevision] = useState(0),
    [profile, setProfile] = useState(''),
    [page, setPage] = useState('Overview'),
    [month, setMonth] = useState(monthKey()),
    [modal, setModal] = useState(null),
    [toast, setToast] = useState(''),
    [busy, setBusy] = useState(false),
    [mobile, setMobile] = useState(false),
    [authMode, setAuthMode] = useState('login'),
    [error, setError] = useState(''),
    [query, setQuery] = useState(''),
    [cashflowJump, setCashflowJump] = useState(null),
    [conflict, setConflict] = useState(null),
    [recoveryCode, setRecoveryCode] = useState(''),
    [narrow, setNarrow] = useState(() => window.matchMedia('(max-width:650px)').matches);
  const saving = useRef(false);
  useEffect(() => {
    const expired = () => {
      csrfToken = '';
      setState(null);
      setSession((previous) => ({
        ...previous,
        authenticated: false,
        registrationOpen: previous?.registrationOpen ?? true,
        registrationMode: previous?.registrationMode || 'invite',
      }));
      setModal(null);
      setError('Your session expired. Sign in again.');
    };
    window.addEventListener('saldo-auth-expired', expired);
    return () => window.removeEventListener('saldo-auth-expired', expired);
  }, []);
  useEffect(() => {
    if (page !== 'Overview' || !cashflowJump) return;
    const target = document.getElementById(cashflowJump);
    if (target) {
      target.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'instant'
          : 'smooth',
        block: 'start',
      });
      target.focus({ preventScroll: true });
    }
    setCashflowJump(null);
  }, [page, cashflowJump]);
  useEffect(() => {
    const media = window.matchMedia('(max-width:650px)'),
      update = () => setNarrow(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (!narrow || !mobile) return;
    const close = (e) => {
      if (e.key === 'Escape') {
        setMobile(false);
        document.querySelector('.mobile-menu')?.focus();
      }
    };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [narrow, mobile]);
  useEffect(() => {
    if (narrow && !mobile && document.activeElement?.closest('.sidebar'))
      document.querySelector('.mobile-menu')?.focus();
  }, [narrow, mobile]);
  useDialog(!!conflict, () => {});
  useDialog(!!modal && !conflict, () => {
    if (!saving.current) {
      setModal(null);
      setError('');
    }
  });
  useEffect(() => {
    api('session')
      .then(async (s) => {
        setSession(s);
        if (s.authenticated) {
          const d = await api('state');
          setState(d.state);
          setRevision(d.revision);
        }
      })
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    const preferences = appearance(state?.appearance),
      media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      document.documentElement.dataset.color = preferences.color;
      document.documentElement.dataset.statusPalette = ['classic', 'cool', 'contrast'].includes(
        state?.statusPalette,
      )
        ? state.statusPalette
        : 'classic';
      document.documentElement.dataset.mode =
        preferences.mode === 'system' ? (media.matches ? 'dark' : 'light') : preferences.mode;
    };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [state?.appearance?.color, state?.appearance?.mode, state?.statusPalette]);
  const notify = (t) => {
    setToast(t);
    setTimeout(() => setToast(''), 3500);
  };
  async function save(next, message, baseRevision = revision, baseState = state) {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setError('');
    try {
      const r = await api('state', {
        method: 'PUT',
        body: JSON.stringify({ state: next, revision: baseRevision }),
      });
      setState(r.state || next);
      setRevision(r.revision);
      if (message) notify(message);
      return true;
    } catch (e) {
      setError(e.message);
      if (e.code === 'STATE_CONFLICT') {
        try {
          const latest = await api('state');
          setConflict({
            base: baseState,
            draft: next,
            latest: latest.state,
            revision: latest.revision,
          });
        } catch (loadError) {
          setError(loadError.message);
        }
      }
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  const mutate = async (fn, msg) => {
    if (saving.current) return;
    try {
      const n = structuredClone(state);
      fn(n);
      return await save(n, msg);
    } catch (e) {
      setError(e.message);
      return false;
    }
  };
  async function auth(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const data = Object.fromEntries(new FormData(e.target));
    try {
      const result = await api('auth/' + authMode, { method: 'POST', body: JSON.stringify(data) });
      if (result.message && !result.csrfToken) {
        setError(result.message);
        return;
      }
      if (result.recoveryCode) setRecoveryCode(result.recoveryCode);
      const s = await api('session'),
        d = await api('state');
      setSession(s);
      setState(d.state);
      setRevision(d.revision);
      setModal(result.recoveryCode ? { type: 'recovery-code' } : null);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (!session)
    return (
      <div className="loading">
        <Leaf /> Loading your space…{error}
        {error && (
          <button className="secondary" onClick={() => location.reload()}>
            Retry
          </button>
        )}
      </div>
    );
  const authForm =
    authMode === 'recover' ? (
      <RecoveryForm
        api={api}
        onBack={() => {
          setAuthMode('login');
          setError('');
        }}
      />
    ) : (
      <form onSubmit={auth} className="auth-form">
        <div className="brand">
          <span>
            <Leaf size={24} />
          </span>
          saldo<span className="brand-dot">.</span>
        </div>
        <h2>{authMode === 'register' ? 'Your finances, a fresh start.' : 'Welcome back.'}</h2>
        <p>
          {authMode === 'register'
            ? 'Create a private account and add your own finances.'
            : 'Sign in to your personal finance space.'}
        </p>
        {authMode === 'register' && (
          <label>
            Your name
            <input
              name="name"
              required
              maxLength="100"
              autoComplete="given-name"
              placeholder="What should we call you?"
            />
          </label>
        )}
        {authMode === 'register' && session.registrationMode === 'invite' && (
          <label>
            Invitation code
            <input name="inviteCode" required maxLength={200} autoComplete="off" />
            <span className="field-help">
              Ask the server administrator for an invitation linked to your email.
            </span>
          </label>
        )}
        <label>
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
          />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            minLength={authMode === 'register' ? 12 : 1}
            maxLength={1024}
            required
            autoComplete={authMode === 'register' ? 'new-password' : 'current-password'}
            placeholder={authMode === 'register' ? 'At least 12 characters' : 'Your password'}
          />
        </label>
        <button className="primary" disabled={busy}>
          {authMode === 'register' ? 'Create account' : 'Sign in'}
          <ArrowRight size={16} />
        </button>
        <button
          type="button"
          className="link"
          onClick={() => {
            setAuthMode(authMode === 'login' ? 'register' : 'login');
            setError('');
          }}
        >
          {authMode === 'login'
            ? 'Have an invitation? Create an account'
            : 'Already have an account? Sign in'}
        </button>
        {authMode === 'login' && (
          <button
            type="button"
            className="link"
            onClick={() => {
              setAuthMode('recover');
              setError('');
            }}
          >
            Forgot password?
          </button>
        )}
      </form>
    );
  if (!session.authenticated)
    return (
      <div className="login">
        {authForm}
        {error && <p className="error">{error}</p>}
      </div>
    );
  if (!state)
    return (
      <div className="loading">
        {error || 'Opening your dashboard…'}
        {error && (
          <button className="secondary" onClick={() => location.reload()}>
            Retry
          </button>
        )}
      </div>
    );
  const person = state.profiles.find((p) => p.id === profile) || state.profiles[0],
    pid = person.id,
    t = totals(state, pid, month),
    debts = state.debts.filter((d) => d.owner === pid),
    bills = state.bills
      .map((b) => billForMonth(state, b, month))
      .filter((b) => visibleBill(state, b, pid)),
    tasks = state.tasks.filter((t) => t.owner === pid),
    paid = bills.filter((b) => b.paid[month]),
    shared = bills.filter((b) => b.shared),
    sharedTotal = shared.reduce(
      (s, b) => s + b.amount * (b.frequency === 'Yearly' ? 1 / 12 : 1),
      0,
    ),
    paidOff = t.original - t.balance,
    percent = t.original ? (paidOff / t.original) * 100 : 0,
    milestone = Math.max(5000, Math.ceil(t.original / 1000 / 5000) * 5000),
    partners = state.profiles.filter(
      (p) => p.id !== pid && shared.some((b) => billParticipants(state, b).includes(p.id)),
    ),
    partner = partners.length === 1 ? partners[0] : undefined,
    hasData = !!(
      t.income ||
      bills.length ||
      debts.length ||
      tasks.length ||
      state.expenses.some((e) => e.owner === pid)
    );
  const date = new Date(month + '-01T12:00:00'),
    monthName = date.toLocaleDateString('en', { month: 'long', year: 'numeric' });
  function changeMonth(delta) {
    const d = new Date(date);
    d.setMonth(d.getMonth() + delta);
    setMonth(monthKey(d));
  }
  const openAdd = (type, record) => {
    if (
      type === 'bill' &&
      !record?.id &&
      (record?.shared || page === 'Shared expenses') &&
      state.profiles.length < 2
    ) {
      notify('Add your partner profile, then add a shared bill.');
      setModal({ type: 'profile' });
      setError('');
      return;
    }
    setModal({
      type,
      record:
        record || (type === 'bill' && page === 'Shared expenses' ? { shared: true } : undefined),
    });
    setError('');
  };
  const paidToggle = (b) =>
    mutate(
      (s) => {
        const x = s.bills.find((x) => x.id === b.id);
        setBillPaid(s, x.id, month, !x.paid[month]);
      },
      b.paid[month] ? 'Marked as unpaid' : 'Payment marked as paid',
    );
  const billList = (limit) =>
    bills
      .filter((b) => b.name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, limit)
      .map((b, i) => {
        const I = icons[b.category] || Receipt;
        return (
          <div className="bill-row" key={b.id}>
            <span className={'item-icon tone-' + (i % 4)}>
              <I size={19} />
            </span>
            <div className="item-name">
              <b>{b.name}</b>
              <span>
                {b.shared ? 'Shared · 50/50' : b.category} <i>·</i> {b.frequency}
              </span>
            </div>
            <span className="due">
              {date.toLocaleDateString('en', { month: 'short' })} {+billDueDate(b, month).slice(-2)}
            </span>
            <b className="bill-amount">{currency(b.amount)}</b>
            <button
              disabled={busy || billStatus(b, month) === 'Scheduled'}
              onClick={() => paidToggle(b)}
              className={'badge status ' + statusClass(billStatus(b, month))}
            >
              {b.paid[month] ? <Check size={12} /> : <Clock size={12} />} {billStatus(b, month)}
            </button>
            <button
              className="icon-btn edit"
              title={'Edit ' + b.name}
              onClick={() => openAdd('bill', b)}
            >
              <Pencil size={14} />
            </button>
          </div>
        );
      });
  const debtCards = (
    <div className="debt-list">
      {debts.map((d, i) => (
        <div className="debt-row" key={d.id}>
          <span className={'item-icon tone-' + i}>
            {i === 0 ? <House size={19} /> : <Landmark size={19} />}
          </span>
          <div className="debt-detail">
            <div>
              <b>{d.name}</b>
              <b>{currency(d.balance)}</b>
            </div>
            <div className={'progress ' + d.color}>
              <span style={{ width: `${Math.max(0, (1 - d.balance / d.original) * 100)}%` }} />
            </div>
            <div className="muted">
              <span>{money(d.monthly)} zł / month</span>
              <span>{Math.round((1 - d.balance / d.original) * 100)}% paid off</span>
            </div>
          </div>
          <button
            className="icon-btn"
            title={'Manage ' + d.name}
            onClick={() => openAdd('debt', d)}
          >
            <ArrowUpRight size={17} />
          </button>
        </div>
      ))}
    </div>
  );
  const taskList = (limit) =>
    tasks.slice(0, limit).map((task) => (
      <div className="task-row" key={task.id}>
        <button
          className={'task-check ' + (task.status === 'Done' ? 'checked' : '')}
          disabled={busy}
          title={'Change status: ' + task.name}
          onClick={() =>
            mutate((s) => {
              const x = s.tasks.find((x) => x.id === task.id);
              x.status = ['To do', 'In progress', 'Done'][
                (['To do', 'In progress', 'Done'].indexOf(x.status) + 1) % 3
              ];
            })
          }
        >
          {task.status === 'Done' ? (
            <Check size={12} />
          ) : task.status === 'In progress' ? (
            <span />
          ) : null}
        </button>
        <div>
          <b className={task.status === 'Done' ? 'strike' : ''}>{task.name}</b>
          <span>{task.category}</span>
        </div>
        <span
          className={
            'badge ' +
            (task.status === 'Done'
              ? 'paid'
              : task.status === 'In progress'
                ? 'progress-badge'
                : 'neutral')
          }
        >
          {task.status}
        </span>
        <button
          className="icon-btn edit"
          title={'Edit ' + task.name}
          onClick={() => openAdd('task', task)}
        >
          <Pencil size={14} />
        </button>
      </div>
    ));
  const goToSpending = () => {
    setPage('Overview');
    setCashflowJump('extra-spending');
  };
  const reviewBudget = () => {
    setPage('Overview');
    setCashflowJump('cashflow-breakdown');
  };
  const cashflow = (
    <>
      <div className="cash-heading">
        <span>YOUR MONTHLY INCOME</span>
        <button
          className="cash-income-edit"
          aria-label="Edit income from cash flow"
          onClick={() => openAdd('income')}
        >
          {currency(t.income)}
          <Pencil size={14} />
        </button>
      </div>
      <div className="allocation" aria-label="Monthly budget allocation">
        {[
          { n: t.debt, c: 'blue' },
          { n: t.living, c: 'teal' },
          { n: t.expenses, c: 'orange' },
          { n: Math.max(0, t.remaining), c: 'pale' },
        ].map((a, i) => (
          <span key={i} className={a.c} style={{ flex: Math.max(0, a.n) }} />
        ))}
      </div>
      <div className="cash-legend cash-links">
        {[
          ['Debt payments', t.debt, 'blue', () => setPage('Debts & goals'), 'Manage debts'],
          [
            'Bills & living',
            t.living,
            'teal',
            () => setPage('Recurring bills'),
            'Manage recurring bills',
          ],
          ['Extra spending', t.expenses, 'orange', goToSpending, 'Manage extra spending'],
        ].map(([label, n, c, action, hint]) => (
          <button
            type="button"
            className="cash-category"
            key={label}
            aria-label={hint + ' from cash flow'}
            onClick={action}
          >
            <span className={'dot ' + c} />
            <span>{label}</span>
            <ArrowUpRight size={13} />
            <b>{currency(n)}</b>
            <small>{t.income ? money((n / t.income) * 100, 1) : 0}% of income</small>
            <span className="cash-category-hint">{hint}</span>
          </button>
        ))}
        <div className="cash-remainder">
          <span className="dot pale" />
          <span>Left to live & save</span>
          <b>{currency(t.remaining)}</b>
          <small>{t.income ? money((t.remaining / t.income) * 100, 1) : 0}% of income</small>
          <span className="cash-category-hint">Calculated after bills, debts & spending</span>
        </div>
      </div>
      <p className="cashflow-help">
        Select a category to update its records. Changes automatically update your cash flow for{' '}
        {monthName}.
      </p>
    </>
  );

  return (
    <div className="app">
      {narrow && mobile && (
        <button
          className="mobile-nav-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <aside
        id="workspace-navigation"
        aria-hidden={narrow && !mobile ? true : undefined}
        inert={narrow && !mobile ? true : undefined}
        className={mobile ? 'sidebar open' : 'sidebar'}
      >
        <a className="brand" href="#" onClick={() => setPage('Overview')}>
          <span>
            <Leaf size={24} />
          </span>
          saldo<span className="brand-dot">.</span>
        </a>
        <div className="workspace">
          <span className="avatar small">{person.name[0]}</span>
          <div>
            <b>Personal space</b>
            <span>Your money, in balance</span>
          </div>
          <ChevronDown size={14} />
        </div>
        <div className="nav-caption">WORKSPACE</div>
        <nav>
          {nav.map(([label, I]) => (
            <button
              className={page === label ? 'active' : ''}
              key={label}
              onClick={() => {
                setPage(label);
                setMobile(false);
                setQuery('');
              }}
            >
              <I size={19} />
              {label}
              {label === 'To-do list' && <em>{tasks.filter((t) => t.status !== 'Done').length}</em>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="little-card">
            <span className="little-icon">
              <Leaf size={20} />
            </span>
            <b>Small steps. Big freedom.</b>
            <p>
              Every payment brings you
              <br />
              closer to a debt-free life.
            </p>
            <div>
              <span style={{ width: percent + '%' }} />
            </div>
            <small>{money(percent, 1)}% of your journey complete</small>
          </div>
          <button
            className={'settings-nav ' + (page === 'Settings' ? 'active' : '')}
            onClick={() => {
              setPage('Settings');
              setMobile(false);
            }}
          >
            <Settings size={18} />
            Settings & profiles
          </button>
          <div className="profile">
            <span className="avatar">{person.name[0]}</span>
            <div>
              <b>{person.name}</b>
              <span>Personal account</span>
            </div>
            <select
              aria-label="Switch profile"
              value={pid}
              onChange={(e) => setProfile(e.target.value)}
            >
              {state.profiles.map((p) => (
                <option value={p.id} key={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <ChevronDown size={15} />
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header>
          <div className="breadcrumb">
            <button
              className="icon-btn mobile-menu"
              aria-label="Open navigation"
              aria-controls="workspace-navigation"
              aria-expanded={mobile}
              onClick={() => setMobile(!mobile)}
            >
              <Menu size={20} />
            </button>
            My workspace <ChevronRight size={13} /> <b>{page}</b>
          </div>
          <div className="header-right">
            <span className="saved">
              <span /> {busy ? 'Saving…' : 'All changes saved'}
            </span>
            <span className="header-divider" />
            <span className="avatar small">{person.name[0]}</span>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">YOUR MONEY. YOUR PEACE OF MIND.</div>
              <h1>{page === 'Overview' ? `A little more clarity, ${person.name}.` : page}</h1>
              <p>
                {page === 'Overview'
                  ? 'Here’s where you stand. And where you’re heading.'
                  : {
                      'Recurring bills': 'A home for every bill. No spreadsheet required.',
                      'Shared expenses': 'Shared life. Fair shares. Everything in one place.',
                      'Debts & goals': 'Every little payment is a step towards freedom.',
                      'To-do list': 'Less on your mind. More getting done.',
                      Settings: 'Make this space your own.',
                    }[page]}
              </p>
            </div>
            <div className="heading-actions">
              <div className="month-picker">
                <button onClick={() => changeMonth(-1)} aria-label="Previous month">
                  <ChevronLeft size={15} />
                </button>
                <CalendarDays size={15} />
                <span>{monthName}</span>
                <button onClick={() => changeMonth(1)} aria-label="Next month">
                  <ChevronRight size={15} />
                </button>
              </div>
              <button
                className="primary"
                onClick={() =>
                  openAdd(
                    page === 'To-do list'
                      ? 'task'
                      : page === 'Recurring bills' || page === 'Shared expenses'
                        ? 'bill'
                        : page === 'Debts & goals'
                          ? 'debt'
                          : 'expense',
                  )
                }
              >
                <Plus size={17} />
                {page === 'To-do list'
                  ? 'Add task'
                  : page === 'Recurring bills' || page === 'Shared expenses'
                    ? 'Add bill'
                    : page === 'Debts & goals'
                      ? 'Add debt'
                      : 'Add expense'}
              </button>
            </div>
          </div>
          {page === 'Overview' && !hasData && (
            <section className="panel welcome-panel">
              <div>
                <h3>Welcome to your own space.</h3>
                <p>
                  Start with your income, then add your bills and debts. All figures come from what
                  you enter.
                </p>
              </div>
              <button className="primary" onClick={() => openAdd('income')}>
                Set monthly income <ArrowRight size={15} />
              </button>
            </section>
          )}
          {page === 'Overview' && (
            <>
              <div className="stats-grid">
                <Stat
                  title="Monthly income"
                  value={t.income}
                  icon={Wallet}
                  color="green"
                  note="Your take-home income"
                  actionLabel="Edit income"
                  onClick={() => openAdd('income')}
                />
                <Stat
                  title="Bills & living"
                  value={t.living + t.expenses}
                  icon={Receipt}
                  color="orange"
                  note="Recurring bills + extra spending"
                  onClick={() => setPage('Recurring bills')}
                  actionLabel="Manage bills"
                  secondaryAction={goToSpending}
                  secondaryLabel="Spending"
                />
                <Stat
                  title="Debt payments"
                  value={t.debt}
                  icon={Landmark}
                  color="blue"
                  note={`${t.income ? money((t.debt / t.income) * 100, 1) : 0}% of your monthly income`}
                  onClick={() => setPage('Debts & goals')}
                  actionLabel="Manage debts"
                />
                <Stat
                  title="Left to live & save"
                  value={t.remaining}
                  icon={ArrowUpRight}
                  color="green"
                  note="Income minus bills, debts & spending"
                  highlight
                  onClick={reviewBudget}
                  actionLabel="Review budget"
                />
              </div>
              <div className="overview-grid">
                <section className="panel cash-panel" id="cashflow-breakdown" tabIndex={-1}>
                  <PanelTitle
                    title="Your monthly cash flow"
                    sub="A place for every złoty."
                    right={
                      <span className="badge neutral">
                        {date.toLocaleDateString('en', { month: 'long' })}
                      </span>
                    }
                  />
                  {cashflow}
                  <div className="insight">
                    <span>
                      <Leaf size={17} />
                    </span>
                    <p>
                      {!t.income ? (
                        <>Add your take-home income to see how your budget balances.</>
                      ) : t.remaining >= 0 ? (
                        <>
                          <b>
                            {money(t.income ? (t.remaining / t.income) * 100 : 0, 0)}% of your
                            income is still yours.
                          </b>{' '}
                          You’re making room for your future.
                        </>
                      ) : (
                        <>
                          <b>Your plan is over budget.</b> Review your bills or adjust your income.
                        </>
                      )}
                    </p>
                  </div>
                </section>
                <section className="panel shared-panel">
                  <PanelTitle
                    title="Better, together"
                    sub="Your shared home, split fairly."
                    right={
                      <span className="couple">
                        <span>{person.name[0]}</span>
                        {partner && <span>{partner.name[0]}</span>}
                      </span>
                    }
                  />
                  <div className="shared-total">
                    <span>SHARED MONTHLY BILLS</span>
                    <b>{currency(sharedTotal)}</b>
                  </div>
                  <div className="split-box">
                    <div>
                      <span className="dot teal" /> Your share
                      <b>
                        {currency(
                          shared.reduce(
                            (sum, b) =>
                              sum + billShare(state, b, pid) / (b.frequency === 'Yearly' ? 12 : 1),
                            0,
                          ),
                        )}
                      </b>
                    </div>
                    <div>
                      <span className="dot pale" />{' '}
                      {partner ? partner.name + '’s share' : 'Others’ share'}
                      <b>
                        {currency(
                          sharedTotal -
                            shared.reduce(
                              (sum, b) =>
                                sum +
                                billShare(state, b, pid) / (b.frequency === 'Yearly' ? 12 : 1),
                              0,
                            ),
                        )}
                      </b>
                    </div>
                  </div>
                  <button className="text-btn" onClick={() => setPage('Shared expenses')}>
                    View shared expenses <ArrowRight size={15} />
                  </button>
                </section>
              </div>
            </>
          )}
          {page === 'Overview' && (
            <section className="panel spending-panel" id="extra-spending" tabIndex={-1}>
              <PanelTitle
                title="Extra spending this month"
                sub="One-off expenses sit alongside your recurring budget."
                right={
                  <button className="text-btn" onClick={() => openAdd('expense')}>
                    Add expense <Plus size={14} />
                  </button>
                }
              />
              {state.expenses
                .filter((e) => e.owner === pid && e.month === month)
                .map((e) => (
                  <div className="summary-line record-line" key={e.id}>
                    <span>
                      {e.name} <small>· {e.category}</small>
                    </span>
                    <b>{currency(e.amount)}</b>
                    <RecordActions
                      label={e.name}
                      edit={() => openAdd('expense', e)}
                      remove={() => setModal({ type: 'expense', record: e, confirmDelete: true })}
                    />
                  </div>
                ))}
              {!state.expenses.some((e) => e.owner === pid && e.month === month) && (
                <p className="empty">A clean slate. Add your one-off purchases as you go.</p>
              )}
              <div className="insight">
                <p>
                  Budget view: recurring bills include your 50% share of shared costs. Annual bills
                  are divided by 12. Debt instalments are planned outgoings; recorded principal
                  repayments track debt progress separately.
                </p>
              </div>
            </section>
          )}
          {page === 'Overview' && (
            <>
              <div className="overview-grid lower-grid">
                <section className="panel bills-panel">
                  <PanelTitle
                    title="This month’s bills"
                    sub={
                      <>
                        {paid.length} of {bills.length} paid{' '}
                        <span className="mini-progress">
                          <span
                            style={{
                              width: (bills.length ? (paid.length / bills.length) * 100 : 0) + '%',
                            }}
                          />
                        </span>
                      </>
                    }
                    right={
                      <button className="text-btn" onClick={() => setPage('Recurring bills')}>
                        View all <ArrowUpRight size={15} />
                      </button>
                    }
                  />
                  <div className="table-head">
                    <span>PAYMENT</span>
                    <span>DUE DATE</span>
                    <span>AMOUNT</span>
                    <span>STATUS</span>
                  </div>
                  {bills.length ? (
                    billList(5)
                  ) : (
                    <p className="empty">No bills yet. Add your first recurring payment below.</p>
                  )}
                  <button className="list-footer" onClick={() => openAdd('bill')}>
                    <Plus size={15} /> Add a recurring bill
                  </button>
                </section>
                <section className="panel">
                  <PanelTitle
                    title="Your debt-free journey"
                    sub="Look how far you’ve come."
                    right={<TrendingDown size={20} className="muted" />}
                  />
                  {debts.length ? (
                    debtCards
                  ) : (
                    <p className="empty">No debts added. Add a debt to track your progress.</p>
                  )}
                  <button className="text-btn debt-link" onClick={() => setPage('Debts & goals')}>
                    Explore debts & goals <ArrowRight size={15} />
                  </button>
                </section>
              </div>
              <DebtTracker
                key={pid}
                profile={person}
                original={t.original}
                paidOff={paidOff}
                state={state}
                mutate={mutate}
                busy={busy}
              />
              <div className="bottom-tasks">
                <div>
                  <h3>A little less on your mind</h3>
                  <p>A few things to move forward this month.</p>
                </div>
                <button className="text-btn" onClick={() => setPage('To-do list')}>
                  All tasks <ArrowRight size={15} />
                </button>
              </div>
              <section className="panel tasks-preview">
                {tasks.length ? (
                  taskList(3)
                ) : (
                  <p className="empty">No tasks yet. Add one from your to-do list.</p>
                )}
              </section>
            </>
          )}
          {page === 'Recurring bills' && (
            <BillsPanel
              key={pid + '-recurring'}
              sharedPage={false}
              state={state}
              profile={pid}
              month={month}
              bills={bills}
              busy={busy}
              mutate={mutate}
              openAdd={openAdd}
              paidToggle={paidToggle}
            />
          )}
          {page === 'Shared expenses' && (
            <>
              <div className="stats-grid three">
                <Stat
                  title="Shared household bills"
                  value={sharedTotal}
                  icon={House}
                  color="blue"
                  note="Full monthly household amount"
                />
                <Stat
                  title="Your share"
                  value={shared.reduce(
                    (sum, b) =>
                      sum + billShare(state, b, pid) / (b.frequency === 'Yearly' ? 12 : 1),
                    0,
                  )}
                  icon={Users}
                  color="green"
                  note="An equal split, rounded to the cent"
                />
                <Stat
                  title={
                    sharedBalance(state, pid, month) < 0
                      ? 'You are owed'
                      : sharedBalance(state, pid, month) > 0
                        ? 'You owe'
                        : 'All settled'
                  }
                  value={Math.abs(sharedBalance(state, pid, month))}
                  icon={ArrowLeftRight}
                  color="orange"
                  note="Based on bills marked paid this month"
                />
              </div>
              <BillsPanel
                sharedPage
                state={state}
                profile={pid}
                month={month}
                bills={bills}
                busy={busy}
                mutate={mutate}
                openAdd={openAdd}
                paidToggle={paidToggle}
              />
            </>
          )}
          {page === 'Debts & goals' && (
            <>
              <div className="stats-grid three">
                <Stat
                  title="Remaining debt"
                  value={t.balance}
                  icon={Landmark}
                  color="blue"
                  note="One payment at a time"
                />
                <Stat
                  title="Paid off so far"
                  value={paidOff}
                  icon={TrendingDown}
                  color="green"
                  note={`${money(percent, 1)}% of your starting debt`}
                  highlight
                />
                <Stat
                  title="Monthly commitment"
                  value={t.debt}
                  icon={CalendarDays}
                  color="orange"
                  note="Planned monthly instalments"
                />
              </div>
              <div className="debt-page-grid">
                {!debts.length && (
                  <section className="panel">
                    <h3>Your debt tracker is ready.</h3>
                    <p className="empty">Add your own debts and balances to begin.</p>
                    <button className="primary" onClick={() => openAdd('debt')}>
                      <Plus size={16} />
                      Add your first debt
                    </button>
                  </section>
                )}
                {debts.map((d) => (
                  <section className="panel" key={d.id}>
                    <PanelTitle
                      title={d.name}
                      sub={`${d.lender} · ${d.rate}% annual interest`}
                      right={
                        <button
                          className="icon-btn"
                          title="Edit debt"
                          onClick={() => openAdd('debt', d)}
                        >
                          <Pencil size={16} />
                        </button>
                      }
                    />
                    <div className="big-balance">
                      {currency(d.balance)}
                      <span>remaining of {money(d.original)} zł</span>
                    </div>
                    <div className={'progress ' + d.color}>
                      <span style={{ width: (1 - d.balance / d.original) * 100 + '%' }} />
                    </div>
                    <div className="summary-line">
                      <span>{money(d.monthly)} zł / month</span>
                      <b>{money((1 - d.balance / d.original) * 100, 1)}% paid</b>
                    </div>
                    <button
                      className="primary full"
                      disabled={!d.balance}
                      onClick={() => openAdd('payment', d)}
                    >
                      <Plus size={16} />
                      Record principal repayment
                    </button>
                  </section>
                ))}
              </div>
              <DebtTracker
                key={pid}
                profile={person}
                original={t.original}
                paidOff={paidOff}
                state={state}
                mutate={mutate}
                busy={busy}
              />
              <section className="panel">
                <PanelTitle
                  title="Repayment history"
                  sub="Principal repayments reduce your remaining balance."
                />
                {state.payments.filter((p) => p.owner === pid).length ? (
                  state.payments
                    .filter((p) => p.owner === pid)
                    .slice()
                    .reverse()
                    .map((p) => (
                      <div className="summary-line record-line" key={p.id}>
                        <span>
                          {state.debts.find((d) => d.id === p.debtId)?.name ||
                            p.debtName ||
                            'Deleted debt'}{' '}
                          · {new Date(p.date).toLocaleDateString()}
                        </span>
                        <b className="green-text">−{money(p.amount)} zł</b>
                        <RecordActions
                          label="repayment"
                          edit={() => openAdd('repayment', p)}
                          remove={() =>
                            setModal({ type: 'repayment', record: p, confirmDelete: true })
                          }
                        />
                      </div>
                    ))
                ) : (
                  <p className="empty">
                    Your next step starts here. Record a repayment to watch your progress grow.
                  </p>
                )}
              </section>
            </>
          )}

          {page === 'To-do list' && (
            <div className="kanban">
              {['To do', 'In progress', 'Done'].map((status) => (
                <section className="panel" key={status}>
                  <PanelTitle
                    title={status}
                    right={
                      <span className="badge neutral">
                        {tasks.filter((t) => t.status === status).length}
                      </span>
                    }
                  />
                  {tasks
                    .filter((t) => t.status === status)
                    .map((task) => (
                      <div
                        className={'task-card task-' + task.status.toLowerCase().replace(' ', '-')}
                        key={task.id}
                      >
                        <span className={'badge ' + statusClass(task.status)}>
                          {task.category} · {task.status}
                        </span>
                        <h3>{task.name}</h3>
                        <div>
                          <select
                            aria-label={'Status for ' + task.name}
                            value={task.status}
                            onChange={(e) =>
                              mutate((s) => {
                                s.tasks.find((t) => t.id === task.id).status = e.target.value;
                              })
                            }
                          >
                            {['To do', 'In progress', 'Done'].map((s) => (
                              <option key={s}>{s}</option>
                            ))}
                          </select>
                          <button
                            className="icon-btn"
                            title="Edit task"
                            onClick={() => openAdd('task', task)}
                          >
                            <Pencil size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  <button className="list-footer" onClick={() => openAdd('task', { status })}>
                    <Plus size={15} /> Add a task
                  </button>
                </section>
              ))}
            </div>
          )}
          {page === 'Settings' && (
            <div className="settings-grid">
              <section className="panel appearance-panel">
                <PanelTitle
                  title="Make it feel like you"
                  sub="Choose a colour and appearance. Your preferences are saved with your account."
                />
                <fieldset className="appearance-field">
                  <legend>Colour theme</legend>
                  <div className="theme-options">
                    {themes.map((theme) => (
                      <button
                        type="button"
                        key={theme.id}
                        className={
                          'theme-option ' +
                          (appearance(state.appearance).color === theme.id ? 'selected' : '')
                        }
                        style={{ '--swatch': theme.color }}
                        aria-pressed={appearance(state.appearance).color === theme.id}
                        disabled={busy}
                        onClick={() =>
                          mutate((s) => {
                            s.appearance = { ...appearance(s.appearance), color: theme.id };
                          }, theme.name + ' theme saved')
                        }
                      >
                        <span className="theme-swatch">
                          {appearance(state.appearance).color === theme.id && <Check size={15} />}
                        </span>
                        <b>{theme.name}</b>
                      </button>
                    ))}
                  </div>
                </fieldset>
                <fieldset className="appearance-field">
                  <legend>Appearance</legend>
                  <div className="mode-options">
                    {[
                      ['light', 'Light'],
                      ['dark', 'Dark'],
                      ['system', 'Use device setting'],
                    ].map(([mode, label]) => (
                      <button
                        type="button"
                        key={mode}
                        aria-pressed={appearance(state.appearance).mode === mode}
                        disabled={busy}
                        className={appearance(state.appearance).mode === mode ? 'selected' : ''}
                        onClick={() =>
                          mutate((s) => {
                            s.appearance = { ...appearance(s.appearance), mode };
                          }, 'Appearance saved')
                        }
                      >
                        {mode === appearance(state.appearance).mode && <Check size={14} />} {label}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <fieldset className="appearance-field">
                  <legend>Status colours</legend>
                  <select
                    aria-label="Status colours"
                    value={state.statusPalette || 'classic'}
                    disabled={busy}
                    onChange={(e) =>
                      mutate((s) => {
                        s.statusPalette = e.target.value;
                      }, 'Status colours saved')
                    }
                  >
                    <option value="classic">Classic · green, amber & red</option>
                    <option value="cool">Cool · teal, blue & rose</option>
                    <option value="contrast">High contrast · labels & bold colours</option>
                  </select>
                  <div className="status-preview">
                    <span className="badge paid">✓ Paid / Done</span>
                    <span className="badge pending">◷ Due / In progress</span>
                    <span className="badge overdue">! Overdue</span>
                  </div>
                </fieldset>
              </section>
              <section className="panel">
                <PanelTitle
                  title="Your profiles"
                  sub="Switch between personal budgets within your account."
                />
                {state.profiles.map((p) => (
                  <div className="summary-line" key={p.id}>
                    <span className="avatar small">{p.name[0]}</span>
                    <b>{p.name}</b>
                    <span>{money(incomeForMonth(p, month))} zł / month</span>
                    <button
                      className="text-btn"
                      onClick={() => {
                        setProfile(p.id);
                        openAdd('profile', p);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="icon-btn"
                      aria-label={'Delete profile ' + p.name}
                      disabled={state.profiles.length === 1}
                      title={
                        state.profiles.length === 1 ? 'Keep at least one profile' : 'Delete profile'
                      }
                      onClick={() => setModal({ type: 'profile', record: p, confirmDelete: true })}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
                <button className="list-footer" onClick={() => openAdd('profile')}>
                  <Plus size={15} /> Add a profile
                </button>
              </section>
              <section className="panel">
                <PanelTitle
                  title="Your account & data"
                  sub={
                    session.demo
                      ? 'You’re in the local demo. Create an account for a private budget.'
                      : session.email
                  }
                />
                <button
                  className="secondary full"
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(state, null, 2)], {
                      type: 'application/json',
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `saldo-${month}.json`;
                    a.click();
                    setTimeout(() => URL.revokeObjectURL(url), 60000);
                    notify('Backup downloaded');
                  }}
                >
                  <Download size={16} /> Download JSON backup
                </button>
                <label className="secondary full import">
                  Restore JSON backup
                  <input
                    type="file"
                    accept="application/json"
                    onChange={async (e) => {
                      try {
                        const file = e.target.files[0];
                        if (!file) return;
                        const parsed = JSON.parse(await file.text());
                        setModal({ type: 'restore', data: parsed });
                      } catch {
                        setError('Could not read this backup.');
                      }
                      e.target.value = '';
                    }}
                  />
                </label>
                {session.demo ? (
                  <button
                    className="primary full"
                    onClick={() => {
                      setAuthMode('register');
                      setModal({ type: 'auth' });
                    }}
                  >
                    Create a private account <ArrowRight size={16} />
                  </button>
                ) : (
                  <button
                    className="secondary full"
                    onClick={async () => {
                      await api('logout', { method: 'POST' });
                      location.reload();
                    }}
                  >
                    <LogOut size={16} /> Sign out
                  </button>
                )}
                <p className="settings-note">
                  Profiles share an account and are not separate logins. Each registered account has
                  its own private data.
                </p>
              </section>
              {!session.demo && <SecuritySettings api={api} notify={notify} />}
              <section className="panel">
                <PanelTitle title="Made to be yours" sub="Run Saldo locally or on your own VPS." />
                <p className="settings-note">
                  Your data is stored in a SQLite database on the server. The project includes
                  Docker Compose, HTTPS configuration, and setup instructions for OVH in README.md.
                </p>
              </section>
            </div>
          )}
          <footer>
            <span>
              <Leaf size={13} /> A little more balance, every day.
            </span>
            <span>
              Made for your real life. <span className="footer-dot">·</span> PLN zł
            </span>
          </footer>
        </main>
      </div>
      {toast && (
        <div className="toast">
          <CheckCircle2 size={17} />
          {toast}
        </div>
      )}
      {error && !modal && (
        <div className="error-toast">
          {error}
          {error.includes('another tab') && (
            <button
              className="secondary"
              onClick={async () => {
                const d = await api('state');
                setState(d.state);
                setRevision(d.revision);
                setError('');
              }}
            >
              Reload latest
            </button>
          )}
          <button onClick={() => setError('')}>
            <X size={16} />
          </button>
        </div>
      )}
      {modal && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setModal(null);
              setError('');
            }
          }}
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label={modal.type === 'auth' ? 'Account' : `Manage ${modal.type}`}
          >
            <button
              className="close icon-btn"
              aria-label="Close dialog"
              onClick={() => {
                setModal(null);
                setError('');
              }}
            >
              <X size={20} />
            </button>
            {modal.type === 'auth' ? (
              authForm
            ) : modal.type === 'recovery-code' ? (
              <>
                <h2>Save your recovery code</h2>
                <p className="field-help">
                  Keep this code somewhere private. It can reset your password once and expires
                  after one year. You can generate a replacement in Account security.
                </p>
                <code className="recovery-secret">{recoveryCode}</code>
                <button
                  className="secondary full"
                  onClick={() => downloadDraft(recoveryCode, 'saldo-recovery-code.txt')}
                >
                  Download recovery code
                </button>
                <button
                  className="primary full"
                  onClick={() => {
                    setRecoveryCode('');
                    setModal(null);
                  }}
                >
                  I saved my code
                </button>
              </>
            ) : modal.type === 'restore' ? (
              <>
                <h2>Restore this backup?</h2>
                <p>This replaces all finance data in your current account.</p>
                <button
                  className="primary"
                  onClick={async () => {
                    if (await save(modal.data, 'Backup restored')) {
                      setProfile(modal.data.profiles[0].id);
                      setModal(null);
                    }
                  }}
                >
                  Replace current data
                </button>
              </>
            ) : (
              <Editor
                key={modal.type + (modal.record?.id || '')}
                profiles={state.profiles}
                debts={state.debts}
                modal={modal}
                person={person}
                month={month}
                busy={busy}
                onSave={async (data) => {
                  const ok = await mutate((s) => {
                    const type = modal.type,
                      r = modal.record,
                      id = r?.id || crypto.randomUUID();
                    if (type === 'income') {
                      setMonthlyIncome(
                        s.profiles.find((p) => p.id === pid),
                        month,
                        +data.income,
                      );
                      return;
                    }
                    if (type === 'payment') {
                      repay(s, r.id, +data.amount, data.date);
                      return;
                    }
                    if (type === 'repayment') {
                      updateRepayment(s, r.id, +data.amount, data.date);
                      return;
                    }
                    const collections = {
                        bill: 'bills',
                        debt: 'debts',
                        task: 'tasks',
                        expense: 'expenses',
                        profile: 'profiles',
                      },
                      collection = collections[type];
                    const record = { ...r, ...data, id };
                    if (record.name) record.name = record.name.trim();
                    if (type === 'bill')
                      Object.assign(record, {
                        amount: +data.amount,
                        day: +data.day,
                        shared: data.shared === 'on',
                        paid: r?.paid || {},
                        owner: r?.owner || pid,
                        payer: r?.payer || pid,
                        partnerId: data.shared === 'on' ? data.partnerId : undefined,
                        dueMonth: data.frequency === 'Yearly' ? +data.dueMonth : undefined,
                      });
                    if (type === 'debt')
                      Object.assign(record, {
                        balance: +data.balance,
                        original: +data.original,
                        monthly: +data.monthly,
                        rate: +data.rate,
                        owner: pid,
                        color: r?.color || 'blue',
                      });
                    if (type === 'expense')
                      Object.assign(record, {
                        amount: +data.amount,
                        month: data.month || month,
                        owner: r?.owner || pid,
                      });
                    if (type === 'task') record.owner = pid;
                    if (type === 'profile') {
                      record.income = r?.income ?? +data.income;
                      if (r?.id) setMonthlyIncome(record, month, +data.income);
                    }
                    if (type === 'bill' && r?.id) {
                      editBillForMonth(s, id, record, month);
                      return;
                    }
                    const index = s[collection].findIndex((x) => x.id === id);
                    if (index >= 0) s[collection][index] = record;
                    else s[collection].push(record);
                  }, 'Saved. A little more organised.');
                  if (ok) setModal(null);
                }}
                onDelete={async (target) => {
                  const r = modal.record;
                  const collections = {
                    bill: 'bills',
                    debt: 'debts',
                    task: 'tasks',
                    expense: 'expenses',
                  };
                  if (
                    await mutate((s) => {
                      if (modal.type === 'repayment') {
                        deleteRepayment(s, r.id);
                        return;
                      }
                      if (modal.type === 'profile') {
                        deleteProfile(s, r.id, target);
                        return;
                      }
                      s[collections[modal.type]] = s[collections[modal.type]].filter(
                        (x) => x.id !== r.id,
                      );
                    }, 'Removed')
                  )
                    setModal(null);
                }}
              />
            )}
            {error && <p className="error">{error}</p>}
          </div>
        </div>
      )}
      {conflict && (
        <ConflictRecovery
          conflict={conflict}
          busy={busy}
          error={error}
          onCancel={() => setConflict(null)}
          onDownload={() => downloadDraft(conflict.draft, 'saldo-unsaved-draft.json')}
          onResolve={async (choice) => {
            const merged = mergeFinance(conflict.base, conflict.draft, conflict.latest, choice);
            if (
              await save(
                merged.state,
                'Changes recovered and saved',
                conflict.revision,
                conflict.latest,
              )
            ) {
              setConflict(null);
              setModal(null);
            }
          }}
        />
      )}
    </div>
  );
}
function downloadDraft(value, name) {
  const blob = new Blob([typeof value === 'string' ? value : JSON.stringify(value, null, 2)], {
      type: 'text/plain',
    }),
    url = URL.createObjectURL(blob),
    link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
function RecordActions({ label, edit, remove }) {
  return (
    <span className="record-actions">
      <button className="icon-btn" aria-label={'Edit ' + label} onClick={edit}>
        <Pencil size={15} />
      </button>
      <button className="icon-btn" aria-label={'Delete ' + label} onClick={remove}>
        <Trash2 size={15} />
      </button>
    </span>
  );
}
function Stat({
  title,
  value,
  icon: I,
  color,
  note,
  highlight,
  onClick,
  actionLabel = 'Edit income',
  secondaryAction,
  secondaryLabel,
}) {
  return (
    <section className={'stat ' + (highlight ? 'highlight' : '')}>
      <div className="stat-top">
        <span>{title}</span>
        <span className={'stat-icon ' + color}>
          <I size={18} />
        </span>
      </div>
      <div className="stat-value">{currency(value)}</div>
      <p>
        {highlight && <span className="tiny-dot" />}
        {note}
      </p>
      {onClick && (
        <div className="stat-actions">
          <button className="text-btn" onClick={onClick}>
            {actionLabel}
            {actionLabel === 'Edit income' ? <Pencil size={12} /> : <ArrowUpRight size={13} />}
          </button>
          {secondaryAction && (
            <button className="text-btn" onClick={secondaryAction}>
              {secondaryLabel}
              <ArrowUpRight size={13} />
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function PanelTitle({ title, sub, right }) {
  return (
    <div className="panel-heading">
      <div>
        <h3>{title}</h3>
        {sub && <p>{sub}</p>}
      </div>
      {right}
    </div>
  );
}
function Editor({ modal, person, profiles, debts, month, busy, onSave, onDelete }) {
  const { type, record: r = {} } = modal;
  const [localError, setLocalError] = useState(''),
    [isShared, setIsShared] = useState(!!r.shared),
    [frequency, setFrequency] = useState(r.frequency || 'Monthly'),
    [confirmDelete, setConfirmDelete] = useState(!!modal.confirmDelete),
    [transfer, setTransfer] = useState(profiles.find((p) => p.id !== r.id)?.id || '');
  const orphan =
    type === 'repayment' && !debts.some((d) => d.id === r.debtId && d.owner === r.owner);
  const labels = {
    bill: 'recurring bill',
    debt: 'debt',
    task: 'task',
    expense: 'expense',
    income: 'monthly income',
    profile: 'profile',
    payment: 'principal repayment',
    repayment: 'repayment',
  };
  const field = (name, label, inputType = 'text', value = '', extra = {}) => (
    <label>
      {label}
      <input
        name={name}
        type={inputType}
        defaultValue={
          name === 'income' && type === 'profile'
            ? incomeForMonth(r.id ? r : { income: 0 }, month)
            : (r[name] ?? value)
        }
        required
        {...extra}
      />
    </label>
  );
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target));
        if (data.name && !data.name.trim()) {
          setLocalError('Enter a name.');
          return;
        }
        if (type === 'debt' && +data.original < +data.balance) {
          setLocalError('Starting debt must be at least the remaining balance.');
          return;
        }
        try {
          await onSave(data);
        } catch (e) {
          setLocalError(e.message);
        }
      }}
    >
      <span className="modal-eyebrow">A LITTLE MORE ORGANISED</span>
      <h2>
        {type === 'income' ? 'Update' : r.id && type !== 'payment' ? 'Edit' : 'Add'} {labels[type]}
      </h2>
      <p className="modal-sub">
        {type === 'payment'
          ? 'Enter the principal amount that reduces your debt, excluding interest.'
          : `For ${person.name} · ${month}`}
      </p>
      {['bill', 'debt', 'task', 'expense', 'profile'].includes(type) &&
        field('name', type === 'profile' ? 'Profile name' : 'Name', 'text', '', { maxLength: 100 })}
      {['expense', 'payment', 'repayment', 'bill'].includes(type) &&
        field(
          'amount',
          type === 'payment' ? 'Principal repaid (zł)' : 'Amount (zł)',
          'number',
          type === 'payment' ? Math.min(r.monthly, r.balance) : '',
          { min: 0.01, step: 0.01, ...(type === 'payment' ? { max: r.balance } : {}) },
        )}
      {['payment', 'repayment'].includes(type) && (
        <>
          <label>
            Repayment date
            <input
              type="date"
              name="date"
              required
              defaultValue={r.date?.slice(0, 10) || new Date().toLocaleDateString('en-CA')}
            />
          </label>
          <p className="field-help">
            {orphan
              ? 'The debt was deleted. Changes affect history only.'
              : 'Changing or deleting a repayment adjusts the remaining principal automatically.'}
          </p>
        </>
      )}
      {type === 'expense' && field('month', 'Expense month', 'month', month)}
      {type === 'bill' && (
        <>
          <p className="field-help">
            Bill edits apply from {month} onward; earlier paid months are preserved. Dates beyond a
            month’s last day fall on that last day.
          </p>
          <div className="form-grid">
            {field('day', 'Due day (1–31)', 'number', 5, { min: 1, max: 31 })}
            <label>
              Frequency
              <select
                name="frequency"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
              >
                <option>Monthly</option>
                <option>Yearly</option>
              </select>
            </label>
          </div>
          <label>
            Category
            <select name="category" defaultValue={r.category || 'Home'}>
              {['Home', 'Utilities', 'Insurance', 'Living', 'Subscriptions'].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              name="shared"
              checked={isShared}
              disabled={profiles.length < 2}
              onChange={(e) => setIsShared(e.target.checked)}
            />{' '}
            Split equally with my partner (50/50)
          </label>
          {profiles.length < 2 && (
            <p className="field-help">
              Add a partner profile in Settings to enable a shared split.
            </p>
          )}
          {isShared && (
            <label>
              Share with
              <select
                name="partnerId"
                required
                defaultValue={
                  r.partnerId || profiles.find((p) => p.id !== (r.owner || person.id))?.id || ''
                }
              >
                {profiles
                  .filter((p) => p.id !== (r.owner || person.id))
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </label>
          )}
          {frequency === 'Yearly' && (
            <label>
              Due month
              <select name="dueMonth" defaultValue={r.dueMonth || +month.slice(5)}>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i} value={i + 1}>
                    {new Date(2000, i, 1).toLocaleDateString('en', { month: 'long' })}
                  </option>
                ))}
              </select>
            </label>
          )}
        </>
      )}
      {type === 'debt' && (
        <>
          {field('lender', 'Lender', 'text', 'Personal loan')}
          <div className="form-grid">
            {field('original', 'Starting debt (zł)', 'number', '', { min: 0.01, step: 0.01 })}
            {field('balance', 'Remaining balance (zł)', 'number', '', { min: 0, step: 0.01 })}
            {field('monthly', 'Monthly instalment (zł)', 'number', '', { min: 0, step: 0.01 })}
            {field('rate', 'Interest rate (%)', 'number', 0, { min: 0, max: 100, step: 0.01 })}
          </div>
        </>
      )}
      {(type === 'income' || type === 'profile') && (
        <p className="field-help">
          Income changes apply from {month} onward. Earlier months keep their previous income.
        </p>
      )}
      {(type === 'income' || type === 'profile') &&
        field(
          'income',
          'Monthly take-home income (zł)',
          'number',
          type === 'income' ? incomeForMonth(person, month) : 0,
          { min: 0, step: 0.01 },
        )}
      {(type === 'task' || type === 'expense') && (
        <label>
          Category
          <select name="category" defaultValue={r.category || 'Life'}>
            {['Life', 'Home', 'Finance', 'Shopping', 'Health', 'Transport'].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      )}
      {type === 'task' && (
        <label>
          Status
          <select name="status" defaultValue={r.status || 'To do'}>
            <option>To do</option>
            <option>In progress</option>
            <option>Done</option>
          </select>
        </label>
      )}
      {localError && <p className="error">{localError}</p>}
      {confirmDelete && (
        <div className="delete-confirm">
          <p>
            Delete this {labels[type]}?{' '}
            {type === 'bill'
              ? 'This permanently deletes the bill, including its saved payment history, from all views and both profiles.'
              : type === 'repayment'
                ? orphan
                  ? 'Only this history entry will be removed.'
                  : 'Its principal will be restored to the remaining debt.'
                : type === 'debt'
                  ? 'Repayment history is retained and can be edited or deleted separately.'
                  : type === 'profile'
                    ? 'Records will move to the profile below. This profile’s income and tracker preferences will be discarded.'
                    : ''}
          </p>
          {type === 'profile' && profiles.length > 1 && (
            <label>
              Move records to
              <select value={transfer} onChange={(e) => setTransfer(e.target.value)}>
                {profiles
                  .filter((p) => p.id !== r.id)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </label>
          )}
          <button type="button" className="secondary" onClick={() => setConfirmDelete(false)}>
            Keep it
          </button>
          <button
            type="button"
            className="danger-button"
            disabled={busy || (type === 'profile' && profiles.length === 1)}
            onClick={() => onDelete(transfer)}
          >
            Confirm delete
          </button>
        </div>
      )}
      <div className="form-actions">
        {r.id && ['bill', 'debt', 'task', 'expense', 'repayment', 'profile'].includes(type) && (
          <button
            type="button"
            className="delete-btn"
            disabled={busy || (type === 'profile' && profiles.length === 1)}
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 size={15} /> Delete
          </button>
        )}
        <button className="primary" disabled={busy}>
          {busy ? 'Saving…' : type === 'payment' ? 'Record repayment' : 'Save ' + labels[type]}
          <Check size={16} />
        </button>
      </div>
    </form>
  );
}
createRoot(document.getElementById('root')).render(<App />);
