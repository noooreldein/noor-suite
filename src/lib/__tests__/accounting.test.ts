import { describe, it, expect } from 'vitest';
import {
  DEFAULT_COA, saleLines, purchaseLines, returnLines, adjustLines, expenseLines,
  isBalanced, trialBalance, incomeStatement, balanceSheet, closingEntry, migrateLegacyLedger,
} from '../accounting';

const accts = DEFAULT_COA;
const find = (code: string) => accts.find(a => a.code === code)!;

describe('double-entry posting', () => {
  it('creates balanced lines for every business event', () => {
    const cases = [
      saleLines(1000, 1000, 'cash', 600),
      saleLines(1000, 0, 'credit', 600),
      saleLines(500, 200, 'cash', 100),
      purchaseLines(700, 300),
      returnLines(250, false, 150),
      adjustLines(80),
      adjustLines(-80),
      expenseLines('5201', 3000),
    ];
    cases.forEach(l => expect(isBalanced(l)).toBe(true));
  });

  it('rejects unbalanced journals', () => {
    expect(isBalanced([{ code: '1101', debit: 100, credit: 0 }])).toBe(false);
    expect(isBalanced([{ code: '1101', debit: 100, credit: 0 }, { code: '4101', debit: 0, credit: 90 }])).toBe(false);
  });
});

describe('trial balance & statements', () => {
  const journals = [
    { date: '2026-01-05', note: 'بيع نقدي', source: 'pos', lines: saleLines(1000, 1000, 'cash', 400) },
    { date: '2026-01-06', note: 'بيع آجل', source: 'sale', lines: saleLines(2000, 0, 'credit', 800) },
    { date: '2026-01-07', note: 'شراء', source: 'purchase', lines: purchaseLines(1500, 500) },
    { date: '2026-01-08', note: 'مصروف', source: 'expense', lines: expenseLines('5201', 200) },
  ];

  it('trial balance totals balance', () => {
    const tb = trialBalance(accts, journals);
    expect(tb.balanced).toBe(true);
    expect(Math.abs(tb.totals.debit - tb.totals.credit)).toBeLessThan(0.01);
  });

  it('trial balance respects the period filter', () => {
    const tb = trialBalance(accts, journals, '2026-01-07', '2026-12-31');
    // accounts with no movement inside the period drop out of the trial balance
    expect(tb.rows.find(r => r.code === '4101')).toBeUndefined();
    const inv = tb.rows.find(r => r.code === '1103');
    expect(inv?.debit).toBe(1500);
  });

  it('income statement nets revenue minus expenses', () => {
    const pl = incomeStatement(accts, journals);
    expect(pl.totalRev).toBe(3000);
    expect(pl.totalExp).toBe(400 + 800 + 200);
    expect(pl.net).toBe(1600);
  });

  it('balance sheet balances: assets = liabilities + equity + net income', () => {
    const bs = balanceSheet(accts, journals);
    expect(Math.abs(bs.diff)).toBeLessThan(0.01);
    // cash 300 + AR 2000 + inventory 300 = 2600
    expect(bs.totalAssets).toBeCloseTo(2600, 2);
    expect(bs.totalL).toBeCloseTo(1000, 2);
  });

  it('closing entry zeroes the period and stays balanced', () => {
    const lines = closingEntry(accts, journals, '2026-01-01', '2026-12-31');
    expect(isBalanced(lines)).toBe(true);
    const after = trialBalance(accts, [...journals, { date: '2026-12-31', note: 'إغلاق', source: 'closing', lines }]);
    const plAfter = incomeStatement(accts, after ? [...journals, { date: '2026-12-31', note: 'إغلاق', source: 'closing', lines }] : journals);
    expect(plAfter.totalRev).toBe(0);
    expect(plAfter.totalExp).toBe(0);
    const ret = after.rows.find(r => r.code === '3102');
    expect(ret?.closing).toBeCloseTo(-1600, 2); // credit balance (debit-positive sign convention)
  });
});

describe('legacy ledger migration', () => {
  it('converts single-sided rows into balanced journals', () => {
    const legacy = [
      { id: 'l1', date: '2026-01-01', account: 'sales', debit: 0, credit: 500, note: 'بيع قديم' },
      { id: 'l2', date: '2026-01-02', account: 'rent', debit: 100, credit: 0, note: 'إيجار' },
    ];
    const js = migrateLegacyLedger(legacy);
    expect(js).toHaveLength(2);
    js.forEach(j => expect(isBalanced(j.lines)).toBe(true));
    // sale credited to sales account, rent debited to 5202
    expect(js[0].lines.find(l => l.code === '4101')?.credit).toBe(500);
    expect(js[1].lines.find(l => l.code === '5202')?.debit).toBe(100);
  });
});
