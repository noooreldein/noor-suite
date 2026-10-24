/** Professional double-entry accounting engine.
 * Chart of accounts + balanced journal entries + statements. */

export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
export type Account = Acct;
export type Acct = { id: string; code: string; name: string; type: AccountType; parent?: string; isGroup?: boolean; opening?: number };
export type JLine = { code: string; debit: number; credit: number };
export type Journal = { id?: string; date: string; note: string; ref?: string; source: string; lines: JLine[]; createdAt?: string };

export const TYPE_LABEL: Record<AccountType, string> = {
  asset: 'أصول', liability: 'خصوم', equity: 'حقوق ملكية', revenue: 'إيرادات', expense: 'مصروفات',
};
export const TYPE_TONE: Record<AccountType, string> = {
  asset: 'primary', liability: 'amber', equity: 'green', revenue: 'green', expense: 'red',
};

/** Default Egyptian-SME chart of accounts. Groups are folders (non-postable). */
export const DEFAULT_COA: Acct[] = [
  { id: 'acc_1', code: '1', name: 'الأصول', type: 'asset', isGroup: true },
  { id: 'acc_11', code: '11', name: 'الأصول المتداولة', type: 'asset', parent: '1', isGroup: true },
  { id: 'acc_1101', code: '1101', name: 'الصندوق (نقدية)', type: 'asset', parent: '11' },
  { id: 'acc_1102', code: '1102', name: 'البنك / بطاقات', type: 'asset', parent: '11' },
  { id: 'acc_1103', code: '1103', name: 'المخزون', type: 'asset', parent: '11' },
  { id: 'acc_1104', code: '1104', name: 'العملاء (مدينون)', type: 'asset', parent: '11' },
  { id: 'acc_12', code: '12', name: 'الأصول الثابتة', type: 'asset', parent: '1', isGroup: true },
  { id: 'acc_1201', code: '1201', name: 'أثاث ومفروشات', type: 'asset', parent: '12' },
  { id: 'acc_1202', code: '1202', name: 'أجهزة ومعدات', type: 'asset', parent: '12' },
  { id: 'acc_2', code: '2', name: 'الخصوم', type: 'liability', isGroup: true },
  { id: 'acc_2101', code: '2101', name: 'الموردون (دائنون)', type: 'liability', parent: '2' },
  { id: 'acc_2102', code: '2102', name: 'ضريبة القيمة المضافة', type: 'liability', parent: '2' },
  { id: 'acc_2103', code: '2103', name: 'قروض', type: 'liability', parent: '2' },
  { id: 'acc_3', code: '3', name: 'حقوق الملكية', type: 'equity', isGroup: true },
  { id: 'acc_3101', code: '3101', name: 'رأس المال', type: 'equity', parent: '3' },
  { id: 'acc_3102', code: '3102', name: 'أرباح مرحلة', type: 'equity', parent: '3' },
  { id: 'acc_4', code: '4', name: 'الإيرادات', type: 'revenue', isGroup: true },
  { id: 'acc_4101', code: '4101', name: 'المبيعات', type: 'revenue', parent: '4' },
  { id: 'acc_4102', code: '4102', name: 'إيرادات أخرى', type: 'revenue', parent: '4' },
  { id: 'acc_5', code: '5', name: 'المصروفات', type: 'expense', isGroup: true },
  { id: 'acc_5101', code: '5101', name: 'تكلفة المبيعات', type: 'expense', parent: '5' },
  { id: 'acc_5201', code: '5201', name: 'الرواتب والأجور', type: 'expense', parent: '5' },
  { id: 'acc_5202', code: '5202', name: 'الإيجار', type: 'expense', parent: '5' },
  { id: 'acc_5203', code: '5203', name: 'المرافق (كهرباء/مياه)', type: 'expense', parent: '5' },
  { id: 'acc_5204', code: '5204', name: 'مصروفات أخرى', type: 'expense', parent: '5' },
];

export const CODES = {
  CASH: '1101', BANK: '1102', INVENTORY: '1103', RECEIVABLE: '1104',
  PAYABLE: '2101', RETAINED: '3102', SALES: '4101', OTHER_INCOME: '4102',
  COGS: '5101', OTHER_EXPENSE: '5204',
};

const inPeriod = (date: string, from?: string, to?: string) =>
  (!from || date >= from) && (!to || date <= to);

/** Sum debit/credit movements per account code for journals in period. */
export function movements(journals: Journal[], from?: string, to?: string): Map<string, { debit: number; credit: number }> {
  const m = new Map<string, { debit: number; credit: number }>();
  journals.forEach(j => {
    if (!inPeriod(j.date, from, to)) return;
    j.lines.forEach(l => {
      const r = m.get(l.code) ?? { debit: 0, credit: 0 };
      r.debit += l.debit || 0; r.credit += l.credit || 0;
      m.set(l.code, r);
    });
  });
  return m;
}

/** Signed closing balance (debit-positive) for an account. */
export function balanceOf(acct: Acct, mv: Map<string, { debit: number; credit: number }>): number {
  const m = mv.get(acct.code) ?? { debit: 0, credit: 0 };
  return (acct.opening ?? 0) + m.debit - m.credit;
}

export interface TrialRow { code: string; name: string; type: AccountType; opening: number; debit: number; credit: number; closing: number }

export function trialBalance(accounts: Acct[], journals: Journal[], from?: string, to?: string) {
  const mv = movements(journals, from, to);
  const rows: TrialRow[] = accounts.filter(a => !a.isGroup).map(a => {
    const m = mv.get(a.code) ?? { debit: 0, credit: 0 };
    return { code: a.code, name: a.name, type: a.type, opening: a.opening ?? 0, debit: m.debit, credit: m.credit, closing: balanceOf(a, mv) };
  }).filter(r => r.opening || r.debit || r.credit || r.closing);
  const totals = rows.reduce((t, r) => ({ debit: t.debit + r.debit, credit: t.credit + r.credit, closing: t.closing + r.closing }), { debit: 0, credit: 0, closing: 0 });
  return { rows, totals, balanced: Math.abs(totals.debit - totals.credit) < 0.01 };
}

export interface PLRow { code: string; name: string; amount: number }

export function incomeStatement(accounts: Acct[], journals: Journal[], from?: string, to?: string) {
  const mv = movements(journals, from, to);
  const revenues: PLRow[] = [], expenses: PLRow[] = [];
  accounts.filter(a => !a.isGroup).forEach(a => {
    const m = mv.get(a.code) ?? { debit: 0, credit: 0 };
    const net = (a.opening ?? 0) + m.credit - m.debit;
    const netExp = (a.opening ?? 0) + m.debit - m.credit;
    if (a.type === 'revenue' && Math.abs(net) > 0.001) revenues.push({ code: a.code, name: a.name, amount: net });
    if (a.type === 'expense' && Math.abs(netExp) > 0.001) expenses.push({ code: a.code, name: a.name, amount: netExp });
  });
  const totalRev = revenues.reduce((s, r) => s + r.amount, 0);
  const totalExp = expenses.reduce((s, r) => s + r.amount, 0);
  return { revenues, expenses, totalRev, totalExp, net: totalRev - totalExp };
}

export function balanceSheet(accounts: Acct[], journals: Journal[], to?: string) {
  const mv = movements(journals, undefined, to);
  const pl = incomeStatement(accounts, journals, undefined, to);
  const assets = accounts.filter(a => !a.isGroup && a.type === 'asset')
    .map(a => ({ code: a.code, name: a.name, amount: balanceOf(a, mv) })).filter(r => Math.abs(r.amount) > 0.001);
  const liabilities = accounts.filter(a => !a.isGroup && a.type === 'liability')
    .map(a => ({ code: a.code, name: a.name, amount: -balanceOf(a, mv) })).filter(r => Math.abs(r.amount) > 0.001);
  const equity = accounts.filter(a => !a.isGroup && a.type === 'equity')
    .map(a => ({ code: a.code, name: a.name, amount: -balanceOf(a, mv) })).filter(r => Math.abs(r.amount) > 0.001);
  if (Math.abs(pl.net) > 0.001) equity.push({ code: '-', name: 'صافي ربح الفترة (غير مُقفل)', amount: pl.net });
  const totalAssets = assets.reduce((s, r) => s + r.amount, 0);
  const totalL = liabilities.reduce((s, r) => s + r.amount, 0);
  const totalE = equity.reduce((s, r) => s + r.amount, 0);
  return { assets, liabilities, equity, totalAssets, totalL, totalE, diff: totalAssets - totalL - totalE };
}

/** Auto closing entry: move revenue/expense period balances into retained earnings. */
export function closingEntry(accounts: Acct[], journals: Journal[], from: string, to: string): JLine[] {
  const pl = incomeStatement(accounts, journals, from, to);
  const lines: JLine[] = [];
  pl.revenues.forEach(r => { if (r.amount > 0.001) lines.push({ code: r.code, debit: r.amount, credit: 0 }); });
  pl.expenses.forEach(r => { if (r.amount > 0.001) lines.push({ code: r.code, debit: 0, credit: r.amount }); });
  const net = pl.net;
  if (Math.abs(net) > 0.001) lines.push(net > 0
    ? { code: CODES.RETAINED, debit: 0, credit: net }
    : { code: CODES.RETAINED, debit: -net, credit: 0 });
  return lines;
}

/** A journal is valid only when debits == credits. */
export function isBalanced(lines: JLine[]): boolean {
  const d = lines.reduce((s, l) => s + (l.debit || 0), 0);
  const c = lines.reduce((s, l) => s + (l.credit || 0), 0);
  return lines.length > 0 && Math.abs(d - c) < 0.01;
}

// ---- posting builders (return JLine[]; caller wraps in a journal) ----

export function saleLines(total: number, collected: number, method: 'cash' | 'card' | 'credit' | string, cogs: number): JLine[] {
  const lines: JLine[] = [{ code: CODES.SALES, debit: 0, credit: total }];
  const paid = Math.min(collected, total);
  if (method === 'card') lines.push({ code: CODES.BANK, debit: paid, credit: 0 });
  else lines.push({ code: CODES.CASH, debit: paid, credit: 0 });
  const due = Math.max(0, total - paid);
  if (due > 0.001) lines.push({ code: CODES.RECEIVABLE, debit: due, credit: 0 });
  if (cogs > 0.001) {
    lines.push({ code: CODES.COGS, debit: cogs, credit: 0 });
    lines.push({ code: CODES.INVENTORY, debit: 0, credit: cogs });
  }
  return lines;
}

export function purchaseLines(total: number, paid: number): JLine[] {
  const lines: JLine[] = [{ code: CODES.INVENTORY, debit: total, credit: 0 }];
  const p = Math.min(paid, total);
  if (p > 0.001) lines.push({ code: CODES.CASH, debit: 0, credit: p });
  const due = Math.max(0, total - p);
  if (due > 0.001) lines.push({ code: CODES.PAYABLE, debit: 0, credit: due });
  return lines;
}

export function returnLines(total: number, cashRefunded: boolean, cogs: number): JLine[] {
  const lines: JLine[] = [{ code: CODES.SALES, debit: total, credit: 0 }];
  lines.push({ code: cashRefunded ? CODES.CASH : CODES.RECEIVABLE, debit: 0, credit: total });
  if (cogs > 0.001) {
    lines.push({ code: CODES.INVENTORY, debit: cogs, credit: 0 });
    lines.push({ code: CODES.COGS, debit: 0, credit: cogs });
  }
  return lines;
}

export function adjustLines(value: number): JLine[] {
  if (Math.abs(value) < 0.001) return [];
  return value > 0
    ? [{ code: CODES.INVENTORY, debit: value, credit: 0 }, { code: CODES.OTHER_EXPENSE, debit: 0, credit: value }]
    : [{ code: CODES.OTHER_EXPENSE, debit: -value, credit: 0 }, { code: CODES.INVENTORY, debit: 0, credit: -value }];
}

export function expenseLines(code: string, amount: number, paidFrom = CODES.CASH): JLine[] {
  return [{ code, debit: amount, credit: 0 }, { code: paidFrom, debit: 0, credit: amount }];
}

export function openingLines(items: { code: string; amount: number }[]): JLine[] {
  const lines: JLine[] = items.map(i => ({ code: i.code, debit: i.amount, credit: 0 }));
  const total = items.reduce((s, i) => s + i.amount, 0);
  lines.push({ code: CODES.RETAINED, debit: 0, credit: total });
  return lines;
}

// ---- one-time migration of the legacy single-sided ledger ----

const LEGACY_MAP: Record<string, string> = {
  sales: CODES.SALES, purchases: CODES.INVENTORY, salaries: '5201',
  rent: '5202', utilities: '5203', other: CODES.OTHER_EXPENSE,
};

export function migrateLegacyLedger(ledger: any[]): Journal[] {
  return (ledger ?? []).map((r, i) => {
    const acctCode = LEGACY_MAP[r.account] ?? CODES.OTHER_EXPENSE;
    const lines: JLine[] = r.credit > 0
      ? [{ code: CODES.RECEIVABLE, debit: r.credit, credit: 0 }, { code: r.account === 'purchases' ? CODES.PAYABLE : acctCode, debit: 0, credit: r.credit }]
      : [{ code: acctCode, debit: r.debit, credit: 0 }, { code: CODES.CASH, debit: 0, credit: r.debit }];
    return {
      id: `jrn_leg_${i}_${(r.id ?? '').slice(-6)}`,
      date: r.date, note: r.note ?? 'قيد مُرحّل من السجل القديم', source: 'legacy', lines,
    } as Journal;
  });
}
