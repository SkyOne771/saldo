export function emptyState(name = 'Personal') {
  return {
    profiles: [{ id: crypto.randomUUID(), name: name.trim() || 'Personal', income: 0 }],
    bills: [],
    debts: [],
    payments: [],
    expenses: [],
    tasks: [],
  };
}
export const monthKey = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
// Fictional local-demo fixtures. Registered accounts always use emptyState().
export function seed() {
  return {
    profiles: [
      { id: 'alex', name: 'Alex', income: 8000 },
      { id: 'sam', name: 'Sam', income: 5500 },
    ],
    bills: [
      {
        id: 'b0',
        name: 'Apartment rent',
        amount: 1200,
        day: 5,
        shared: true,
        category: 'Home',
        owner: 'alex',
        paid: {},
        frequency: 'Monthly',
        payer: 'alex',
        partnerId: 'sam',
      },
      {
        id: 'b1',
        name: 'Garage',
        amount: 150,
        day: 5,
        shared: true,
        category: 'Home',
        owner: 'alex',
        paid: {},
        frequency: 'Monthly',
        payer: 'alex',
        partnerId: 'sam',
      },
      {
        id: 'b2',
        name: 'Gas',
        amount: 100,
        day: 12,
        shared: true,
        category: 'Utilities',
        owner: 'alex',
        paid: {},
        frequency: 'Monthly',
        payer: 'alex',
        partnerId: 'sam',
      },
      {
        id: 'b3',
        name: 'Electricity',
        amount: 200,
        day: 15,
        shared: true,
        category: 'Utilities',
        owner: 'alex',
        paid: {},
        frequency: 'Monthly',
        payer: 'alex',
        partnerId: 'sam',
      },
      {
        id: 'b4',
        name: 'Internet',
        amount: 80,
        day: 10,
        shared: true,
        category: 'Utilities',
        owner: 'alex',
        paid: {},
        frequency: 'Monthly',
        payer: 'alex',
        partnerId: 'sam',
      },
      {
        id: 'b5',
        name: 'Home insurance',
        amount: 60,
        day: 20,
        shared: true,
        category: 'Insurance',
        owner: 'alex',
        paid: {},
        frequency: 'Monthly',
        payer: 'alex',
        partnerId: 'sam',
      },
      {
        id: 'b6',
        name: 'Phone',
        amount: 50,
        day: 18,
        shared: false,
        category: 'Utilities',
        owner: 'alex',
        paid: {},
        frequency: 'Monthly',
        payer: 'alex',
      },
      {
        id: 'b7',
        name: 'Groceries & everyday life',
        amount: 1600,
        day: 25,
        shared: false,
        category: 'Living',
        owner: 'alex',
        paid: {},
        frequency: 'Monthly',
        payer: 'alex',
      },
      {
        id: 'b8',
        name: 'Music subscription',
        amount: 25,
        day: 22,
        shared: false,
        category: 'Subscriptions',
        owner: 'alex',
        paid: {},
        frequency: 'Monthly',
        payer: 'alex',
      },
    ],
    debts: [
      {
        id: 'd1',
        name: 'Mortgage',
        lender: 'Example lender',
        balance: 180000,
        original: 200000,
        monthly: 1800,
        rate: 5.5,
        owner: 'alex',
        color: 'blue',
      },
      {
        id: 'd2',
        name: 'Personal loan',
        lender: 'Example lender',
        balance: 8000,
        original: 12000,
        monthly: 250,
        rate: 6,
        owner: 'alex',
        color: 'purple',
      },
      {
        id: 'd3',
        name: 'Study loan',
        lender: 'Example lender',
        balance: 2000,
        original: 3000,
        monthly: 100,
        rate: 0,
        owner: 'alex',
        color: 'orange',
      },
    ],
    payments: [],
    expenses: [],
    tasks: [
      { id: 't1', name: 'Review insurance', status: 'To do', category: 'Finance', owner: 'alex' },
      {
        id: 't2',
        name: 'Plan a home project',
        status: 'In progress',
        category: 'Home',
        owner: 'alex',
      },
      { id: 't3', name: 'Service the bicycle', status: 'Done', category: 'Life', owner: 'alex' },
      { id: 't4', name: 'Organise storage', status: 'To do', category: 'Home', owner: 'alex' },
    ],
  };
}
export function totals(state, profile, month) {
  const bills = state.bills
    .map((b) => billForMonth(state, b, month))
    .filter((b) => visibleBill(state, b, profile));
  const living = roundMoney(
    bills.reduce(
      (sum, b) => sum + billShare(state, b, profile) / (b.frequency === 'Yearly' ? 12 : 1),
      0,
    ),
  );
  const debts = state.debts.filter((d) => d.owner === profile);
  const debt = roundMoney(debts.reduce((sum, d) => sum + (d.balance > 0 ? d.monthly : 0), 0));
  const income = incomeForMonth(
    state.profiles.find((p) => p.id === profile),
    month,
  );
  const expenses = roundMoney(
    state.expenses
      .filter((e) => e.owner === profile && e.month === month)
      .reduce((sum, e) => sum + e.amount, 0),
  );
  return {
    income,
    living,
    debt,
    expenses,
    remaining: roundMoney(income - living - debt - expenses),
    balance: roundMoney(debts.reduce((sum, d) => sum + d.balance, 0)),
    original: roundMoney(debts.reduce((sum, d) => sum + d.original, 0)),
  };
}
export function repay(state, id, amount, date = new Date().toISOString()) {
  const d = state.debts.find((d) => d.id === id);
  if (!d || !Number.isFinite(amount) || amount <= 0 || amount > d.balance)
    throw Error('Enter a payment between 0 and the remaining balance.');
  d.balance = Math.round((d.balance - amount) * 100) / 100;
  state.payments.push({
    id: crypto.randomUUID(),
    debtId: id,
    debtName: d.name,
    amount,
    date,
    owner: d.owner,
  });
  return state;
}

export const roundMoney = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
export function billParticipants(state, bill) {
  return bill.shared
    ? [bill.owner, bill.partnerId || state.profiles.find((p) => p.id !== bill.owner)?.id].filter(
        Boolean,
      )
    : [bill.owner];
}
export const visibleBill = (state, bill, profile) =>
  billParticipants(state, bill).includes(profile);
export function billShare(state, bill, profile) {
  if (!visibleBill(state, bill, profile)) return 0;
  if (!bill.shared) return bill.amount;
  const cents = Math.round(bill.amount * 100);
  return (bill.owner === profile ? Math.ceil(cents / 2) : Math.floor(cents / 2)) / 100;
}
export function billPayer(bill, month, state) {
  const payer = bill.payers?.[month] || bill.payer || bill.owner;
  const participants = state
    ? billParticipants(state, bill)
    : bill.shared
      ? [bill.owner, bill.partnerId || payer]
      : [bill.owner];
  return participants.includes(payer) ? payer : bill.owner;
}
export function setBillPayer(state, id, month, payer) {
  const bill = state.bills.find((b) => b.id === id);
  if (!bill || !billParticipants(state, billForMonth(state, bill, month)).includes(payer))
    throw Error('Choose one of this bill’s participants.');
  bill.payers = { ...bill.payers, [month]: payer };
  if (bill.settlements?.[month]) bill.settlements[month].payer = payer;
}
export function setBillSharing(state, ids, profile, shared, partnerId, month) {
  if (!state.profiles.some((p) => p.id === profile)) throw Error('Profile not found.');
  if (shared && (!state.profiles.some((p) => p.id === partnerId) || partnerId === profile))
    throw Error('Choose a different partner profile.');
  for (const id of new Set(ids)) {
    const bill = state.bills.find((b) => b.id === id);
    if (!bill || !visibleBill(state, month ? billForMonth(state, bill, month) : bill, profile))
      throw Error('This bill is unavailable to this profile.');
    const terms = month ? billForMonth(state, bill, month) : bill;
    if (terms.shared === shared) continue;
    freezePaidBill(state, bill);
    const next = {
      ...terms,
      shared,
      owner: profile,
      partnerId: shared ? partnerId : undefined,
      payer: profile,
    };
    if (month) editBillForMonth(state, id, next, month);
    else {
      bill.shared = shared;
      bill.owner = profile;
      if (shared) bill.partnerId = partnerId;
      else delete bill.partnerId;
      bill.payer = profile;
    }
  }
}
export function billStatus(bill, month, today = new Date()) {
  if (bill.paid?.[month]) return 'Paid';
  if (bill.frequency === 'Yearly' && bill.dueMonth && bill.dueMonth !== Number(month.slice(5)))
    return 'Scheduled';
  const due = billDueDate(bill, month),
    now = `${monthKey(today)}-${String(today.getDate()).padStart(2, '0')}`;
  return due < now ? 'Overdue' : due === now ? 'Due today' : 'Upcoming';
}
export const statusClass = (status) =>
  ({
    Paid: 'paid',
    Overdue: 'overdue',
    'Due today': 'pending',
    Upcoming: 'upcoming',
    Scheduled: 'neutral',
    'To do': 'neutral',
    'In progress': 'progress-badge',
    Done: 'paid',
  })[status] || 'neutral';
export function sharedBalance(state, profile, month) {
  return roundMoney(
    state.bills
      .map((b) => billForMonth(state, b, month))
      .filter((b) => b.shared && visibleBill(state, b, profile) && b.paid?.[month])
      .reduce(
        (sum, b) =>
          sum +
          (billPayer(b, month, state) === profile
            ? -(b.amount - billShare(state, b, profile))
            : billShare(state, b, profile)),
        0,
      ),
  );
}
export function validState(state) {
  try {
    const obj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v),
      str = (v) => typeof v === 'string' && v.trim().length > 0 && v.length <= 200,
      month = (v) => /^\d{4}-(0[1-9]|1[0-2])$/.test(v),
      amount = validMoney,
      list = (k) =>
        Array.isArray(state[k]) &&
        state[k].length <= 10000 &&
        state[k].every(obj) &&
        new Set(state[k].map((x) => x.id)).size === state[k].length &&
        state[k].every((x) => str(x.id));
    if (
      !obj(state) ||
      !['profiles', 'bills', 'debts', 'tasks', 'payments', 'expenses'].every(list) ||
      !state.profiles.length ||
      state.profiles.length > 100
    )
      return false;
    const ids = new Set(state.profiles.map((p) => p.id)),
      owner = (x) => ids.has(x.owner),
      months = (v, check) =>
        obj(v) &&
        Object.keys(v).length <= 1200 &&
        Object.entries(v).every(([m, x]) => month(m) && check(x));
    const terms = (b) =>
      obj(b) &&
      str(b.name) &&
      owner(b) &&
      amount(b.amount) &&
      b.amount > 0 &&
      Number.isInteger(b.day) &&
      b.day >= 1 &&
      b.day <= 31 &&
      typeof b.shared === 'boolean' &&
      (!b.shared || state.profiles.length > 1) &&
      str(b.category) &&
      ['Monthly', 'Yearly'].includes(b.frequency) &&
      (!b.partnerId || (ids.has(b.partnerId) && b.partnerId !== b.owner)) &&
      (!b.payer || ids.has(b.payer)) &&
      (b.dueMonth === undefined ||
        (Number.isInteger(b.dueMonth) && b.dueMonth >= 1 && b.dueMonth <= 12));
    if (
      !state.profiles.every(
        (p) =>
          str(p.name) &&
          amount(p.income) &&
          (p.incomeChanges === undefined || months(p.incomeChanges, amount)) &&
          (p.tracker === undefined || validTracker(p.tracker)),
      )
    )
      return false;
    if (
      !state.bills.every(
        (b) =>
          terms(b) &&
          obj(b.paid) &&
          Object.keys(b.paid).length <= 1200 &&
          Object.entries(b.paid).every(([k, v]) => month(k) && typeof v === 'boolean') &&
          (!b.payers || months(b.payers, (v) => ids.has(v))) &&
          (b.hiddenViews === undefined ||
            (obj(b.hiddenViews) &&
              Object.entries(b.hiddenViews).every(
                ([id, views]) =>
                  ids.has(id) &&
                  obj(views) &&
                  Object.entries(views).every(
                    ([key, value]) =>
                      ['recurring', 'shared'].includes(key) && typeof value === 'boolean',
                  ),
              ))) &&
          (b.versions === undefined || months(b.versions, terms)) &&
          (b.settlements === undefined || months(b.settlements, terms)),
      )
    )
      return false;
    if (
      !state.debts.every(
        (d) =>
          str(d.name) &&
          str(d.lender) &&
          owner(d) &&
          amount(d.balance) &&
          amount(d.original) &&
          d.original > 0 &&
          d.original >= d.balance &&
          amount(d.monthly) &&
          Number.isFinite(d.rate) &&
          d.rate >= 0 &&
          d.rate <= 100,
      )
    )
      return false;
    if (
      !state.tasks.every(
        (t) =>
          str(t.name) &&
          str(t.category) &&
          owner(t) &&
          ['To do', 'In progress', 'Done'].includes(t.status),
      )
    )
      return false;
    if (
      !state.expenses.every(
        (e) =>
          str(e.name) &&
          str(e.category) &&
          owner(e) &&
          amount(e.amount) &&
          e.amount > 0 &&
          month(e.month),
      )
    )
      return false;
    if (
      !state.payments.every(
        (p) =>
          owner(p) &&
          (p.debtName === undefined || str(p.debtName)) &&
          str(p.debtId) &&
          amount(p.amount) &&
          p.amount > 0 &&
          typeof p.date === 'string' &&
          Number.isFinite(Date.parse(p.date)),
      )
    )
      return false;
    return true;
  } catch {
    return false;
  }
}

// Corrections apply only the principal difference, so later repayments remain intact.
export function updateRepayment(state, id, amount, date) {
  const p = state.payments.find((p) => p.id === id);
  if (
    !p ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    amount > 1e12 ||
    roundMoney(amount) !== amount ||
    !Number.isFinite(Date.parse(date))
  )
    throw Error('Enter a valid principal amount and date.');
  const d = state.debts.find((d) => d.id === p.debtId && d.owner === p.owner);
  if (d) {
    const balance = roundMoney(d.balance + p.amount - amount);
    if (balance < 0 || balance > d.original)
      throw Error(
        'This correction would put the debt outside its starting balance. Review the debt balance first.',
      );
    d.balance = balance;
  }
  p.amount = amount;
  p.date = date;
}
export function deleteRepayment(state, id) {
  const p = state.payments.find((p) => p.id === id);
  if (!p) throw Error('Repayment not found.');
  const d = state.debts.find((d) => d.id === p.debtId && d.owner === p.owner);
  if (d) {
    const balance = roundMoney(d.balance + p.amount);
    if (balance > d.original)
      throw Error(
        'Restoring this principal would exceed the starting debt. Review the debt balance first.',
      );
    d.balance = balance;
  }
  state.payments = state.payments.filter((p) => p.id !== id);
}
export function deleteProfile(state, id, target) {
  if (state.profiles.length < 2)
    throw Error('Keep at least one profile. You can rename it and set its income to zero.');
  if (
    id === target ||
    !state.profiles.some((p) => p.id === id) ||
    !state.profiles.some((p) => p.id === target)
  )
    throw Error('Choose a remaining profile for these records.');
  for (const root of state.bills) {
    freezePaidBill(state, root);
    for (const b of [
      root,
      ...Object.values(root.versions || {}),
      ...Object.values(root.settlements || {}),
    ]) {
      const participants = billParticipants(state, b),
        partner = participants[1];
      if (b.owner === id) b.owner = target;
      if (b.shared) {
        const nextPartner = partner === id ? target : partner;
        if (nextPartner === b.owner) {
          b.shared = false;
          delete b.partnerId;
        } else b.partnerId = nextPartner;
      } else delete b.partnerId;
      if (b.hiddenViews) delete b.hiddenViews[id];
      if (b.payer === id) b.payer = target;
      if (b.payers)
        for (const m of Object.keys(b.payers)) if (b.payers[m] === id) b.payers[m] = target;
    }
  }
  for (const key of ['debts', 'payments', 'expenses', 'tasks'])
    for (const r of state[key]) if (r.owner === id) r.owner = target;
  state.profiles = state.profiles.filter((p) => p.id !== id);
}
export const trackerDefaults = {
  step: 5000,
  columns: 20,
  labels: 'number',
  paid: '#59a675',
  remaining: '#8e5353',
  current: '#a78bfa',
};
export function validTracker(v) {
  return (
    !!v &&
    typeof v === 'object' &&
    Number.isInteger(v.step) &&
    v.step >= 1 &&
    v.step <= 1e12 &&
    Number.isInteger(v.columns) &&
    v.columns >= 5 &&
    v.columns <= 40 &&
    ['number', 'amount', 'none'].includes(v.labels) &&
    ['paid', 'remaining', 'current'].every((k) => /^#[0-9a-f]{6}$/i.test(v[k]))
  );
}
export function trackerSettings(value) {
  return validTracker(value) ? value : { ...trackerDefaults };
}

// List membership is independent of financial ownership and the 50/50 split.
export function billInView(state, bill, profile, view) {
  return (
    visibleBill(state, bill, profile) &&
    (view === 'recurring' || (view === 'shared' && bill.shared)) &&
    !bill.hiddenViews?.[profile]?.[view]
  );
}
export function setBillView(state, ids, profile, view, shown, month) {
  if (!['recurring', 'shared'].includes(view) || typeof shown !== 'boolean')
    throw Error('Choose a valid bill view.');
  const bills = [...new Set(ids)].map((id) => state.bills.find((b) => b.id === id));
  if (
    bills.some(
      (b) =>
        !b ||
        !visibleBill(state, month ? billForMonth(state, b, month) : b, profile) ||
        (view === 'shared' && !(month ? billForMonth(state, b, month) : b).shared),
    )
  )
    throw Error('This bill is unavailable to this profile and view.');
  for (const b of bills) {
    b.hiddenViews = {
      ...b.hiddenViews,
      [profile]: { ...b.hiddenViews?.[profile], [view]: !shown },
    };
  }
}
export function importBillsToView(state, ids, profile, view, partner, month) {
  if (!['recurring', 'shared'].includes(view)) throw Error('Choose a valid bill view.');
  const bills = [...new Set(ids)].map((id) => state.bills.find((b) => b.id === id));
  if (
    bills.some((b) => !b || !visibleBill(state, month ? billForMonth(state, b, month) : b, profile))
  )
    throw Error('This bill is unavailable to this profile.');
  if (view === 'shared') {
    const personal = bills
      .filter((b) => !(month ? billForMonth(state, b, month) : b).shared)
      .map((b) => b.id);
    if (personal.length) setBillSharing(state, personal, profile, true, partner, month);
  }
  setBillView(state, ids, profile, view, true, month);
}

export const validMoney = (n) =>
  Number.isFinite(n) && n >= 0 && n <= 1e12 && Math.abs(n * 100 - Math.round(n * 100)) < 0.00001;
export function incomeForMonth(profile, month) {
  if (!profile) return 0;
  const key = Object.keys(profile.incomeChanges || {})
    .filter((m) => m <= month)
    .sort()
    .at(-1);
  return key ? profile.incomeChanges[key] : profile.income;
}
export function setMonthlyIncome(profile, month, value) {
  if (!validMoney(value) || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month))
    throw Error('Enter income with no more than two decimal places.');
  profile.incomeChanges = { ...profile.incomeChanges, [month]: value };
}
const termKeys = [
  'name',
  'amount',
  'day',
  'shared',
  'category',
  'frequency',
  'owner',
  'partnerId',
  'dueMonth',
  'payer',
];
function billTerms(state, b, month) {
  return Object.fromEntries(
    termKeys
      .filter((k) => b[k] !== undefined || (k === 'partnerId' && b.shared))
      .map((k) => [k, k === 'partnerId' && b.shared ? billParticipants(state, b)[1] : b[k]]),
  );
}
export function billForMonth(state, b, month) {
  const key = Object.keys(b.versions || {})
      .filter((m) => m <= month)
      .sort()
      .at(-1),
    terms = key ? b.versions[key] : b;
  const snapshot = b.paid?.[month] && b.settlements?.[month];
  return {
    ...b,
    ...Object.fromEntries(termKeys.map((k) => [k, undefined])),
    ...billTerms(state, snapshot || terms, month),
  };
}
export function freezePaidBill(state, b) {
  for (const m of Object.keys(b.paid || {})) {
    if (!b.paid[m] || b.settlements?.[m]) continue;
    const current = billForMonth(state, b, m);
    b.settlements = {
      ...b.settlements,
      [m]: { ...billTerms(state, current, m), payer: billPayer(current, m, state) },
    };
  }
}
export function preservePaidHistory(previous, next) {
  for (const old of previous.bills) {
    const b = next.bills.find((b) => b.id === old.id);
    if (!b) continue;
    const snapshot = structuredClone(old);
    freezePaidBill(previous, snapshot);
    for (const [m, terms] of Object.entries(snapshot.settlements || {}))
      if (!b.settlements?.[m]) b.settlements = { ...b.settlements, [m]: terms };
  }
  for (const b of next.bills) freezePaidBill(next, b);
  return next;
}
export function editBillForMonth(state, id, data, month) {
  const b = state.bills.find((b) => b.id === id);
  if (!b) throw Error('Bill not found.');
  freezePaidBill(state, b);
  const terms = billTerms(state, { ...data, owner: data.owner || b.owner }, month);
  b.versions = { ...b.versions, [month]: terms };
  if (b.paid[month])
    b.settlements = {
      ...b.settlements,
      [month]: { ...terms, payer: billPayer({ ...b, ...terms }, month, state) },
    };
}
export function setBillPaid(state, id, month, paid) {
  const b = state.bills.find((b) => b.id === id);
  if (!b) throw Error('Bill not found.');
  if (!paid && b.settlements?.[month]) {
    b.versions = { ...b.versions, [month]: b.settlements[month] };
    delete b.settlements[month];
  }
  b.paid[month] = paid;
  if (paid) freezePaidBill(state, b);
}
export function billDueDate(bill, month) {
  const [y, m] = month.split('-').map(Number),
    last = new Date(y, m, 0).getDate();
  return `${month}-${String(Math.min(bill.day, last)).padStart(2, '0')}`;
}
