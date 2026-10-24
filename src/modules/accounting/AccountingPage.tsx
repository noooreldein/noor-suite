/** Professional accounting — chart of accounts, general journal,
 * trial balance, income statement, balance sheet, closing entries. */
import { useMemo, useState } from 'react';
import { useStore } from '../../store/AppStore';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Table } from '../../components/ui/Table';
import { StatCard } from '../../components/ui/StatCard';
import { Modal } from '../../components/ui/Modal';
import { num } from '../../lib/format';
import { fmtDate, today } from '../../lib/dates';
import { download, toCSV } from '../../lib/csv';
import { printHTML } from '../../lib/print';
import { useOrg } from '../../org/Org';
import { canDo, MANAGER_UP } from '../../lib/permissions';
import type { Role } from '../../lib/permissions';
import {
  Account, AccountType, Journal, JLine,
  DEFAULT_COA, TYPE_LABEL, CODES,
  trialBalance, incomeStatement, balanceSheet, closingEntry, isBalanced, expenseLines,
} from '../../lib/accounting';

type Tab = 'journal' | 'accounts' | 'trial' | 'income' | 'balance';

const TABS: { key: Tab; label: string }[] = [
  { key: 'journal', label: 'اليومية العامة' },
  { key: 'accounts', label: 'دليل الحسابات' },
  { key: 'trial', label: 'ميزان المراجعة' },
  { key: 'income', label: 'قائمة الدخل' },
  { key: 'balance', label: 'الميزانية العمومية' },
];

const SOURCE_LABEL: Record<string, string> = {
  sale: 'مبيعات', purchase: 'مشتريات', return: 'مرتجع', pos: 'نقطة بيع',
  adjust: 'تسوية مخزون', expense: 'مصروف', manual: 'يدوي', closing: 'إغلاق',
  opening: 'افتتاحي', legacy: 'مُرحّل',
};

export function AccountingPage() {
  const { data, add, update, remove, toast, settings } = useStore();
  const { org } = useOrg();
  const canDelete = canDo((org?.role ?? null) as Role | null, MANAGER_UP);
  const [tab, setTab] = useState<Tab>('journal');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [form, setForm] = useState<{ date: string; note: string; lines: JLine[] } | null>(null);
  const [acctForm, setAcctForm] = useState<Partial<Account> | null>(null);
  const [closeForm, setCloseForm] = useState(false);
  const [expenseForm, setExpenseForm] = useState(false);
  const [expAcct, setExpAcct] = useState(CODES.OTHER_EXPENSE);
  const [expAmount, setExpAmount] = useState('');
  const [expNote, setExpNote] = useState('');

  const accounts = data.accounts as Account[];
  const journals = useMemo(
    () => [...(data.journals as Journal[])].sort((a, b) => (a.date < b.date ? 1 : a.date === b.date ? (a.createdAt ?? '') < (b.createdAt ?? '') ? 1 : -1 : 1)).slice(0, 400),
    [data.journals]);

  const tb = useMemo(() => trialBalance(accounts, data.journals, from, to), [accounts, data.journals, from, to]);
  const pl = useMemo(() => incomeStatement(accounts, data.journals, from, to), [accounts, data.journals, from, to]);
  const bs = useMemo(() => balanceSheet(accounts, data.journals, to || undefined), [accounts, data.journals, to]);

  const acctName = (code: string) => accounts.find(a => a.code === code)?.name ?? code;
  const cur = settings.currency ?? 'ج.م';

  // ---------- manual journal ----------
  const openJournal = () => setForm({
    date: today(), note: '',
    lines: [
      { code: '1101', debit: 0, credit: 0 },
      { code: '5204', debit: 0, credit: 0 },
    ],
  });

  const submitJournal = () => {
    if (!form) return;
    const lines = form.lines.filter(l => l.code && (l.debit > 0 || l.credit > 0));
    if (lines.length < 2) return toast('أدخل طرفين على الأقل بمبالغ', 'err');
    if (!isBalanced(lines)) return toast('القيد غير متوازن — يجب أن يساوي إجمالي المدين إجمالي الدائن', 'err');
    add('journals', { date: form.date, note: form.note || 'قيد يدوي', source: 'manual', lines });
    toast('تم تسجيل القيد ✓');
    setForm(null);
  };

  const submitAccount = () => {
    if (!acctForm?.code || !acctForm.name) return toast('أكمل الكود والاسم', 'err');
    if (accounts.some(a => a.code === acctForm.code && a.id !== acctForm.id)) return toast('الكود مستخدم بالفعل', 'err');
    if (acctForm.id) update('accounts', acctForm.id, acctForm as Account);
    else add('accounts', { ...(acctForm as Account), opening: acctForm.opening ?? 0 });
    toast('تم حفظ الحساب ✓');
    setAcctForm(null);
  };

  const submitExpense = () => {
    const amount = Number(expAmount);
    if (!amount || amount <= 0) return toast('أدخل مبلغ صحيح', 'err');
    add('journals', { date: today(), note: expNote || `مصروف — ${acctName(expAcct)}`, source: 'expense', lines: expenseLines(expAcct, amount) });
    toast('تم تسجيل المصروف (مدين مصروف / دائن صندوق) ✓');
    setExpenseForm(false); setExpAmount(''); setExpNote('');
  };

  const doClosing = () => {
    const lines = closingEntry(accounts, data.journals, from || '0000-01-01', to || today());
    if (!lines.length) return toast('لا توجد أرصدة إيرادات/مصروفات لإغلاقها في الفترة', 'err');
    if (!isBalanced(lines)) return toast('تعذر موازنة قيد الإغلاق', 'err');
    add('journals', { date: to || today(), note: `قيد إغلاق الفترة ${from || 'البداية'} ← ${to || today()}`, source: 'closing', lines });
    toast(`تم إغلاق الفترة — صافي الربح ${num(pl.net)} ${cur} رُحّل لأرباح مرحلة ✓`);
    setCloseForm(false);
  };

  // ---------- render ----------
  return (
    <>
      <div className="kpis">
        <StatCard label="الإيرادات (الفترة)" value={num(pl.totalRev)} sub={from || to ? `${from || '…'} ← ${to || '…'}` : 'كل الفترات'} tone="green" />
        <StatCard label="المصروفات (الفترة)" value={num(pl.totalExp)} tone="red" />
        <StatCard label="صافي الربح" value={num(pl.net)} tone={pl.net >= 0 ? 'green' : 'red'} />
        <StatCard label="إجمالي الأصول" value={num(bs.totalAssets)} tone="primary" />
      </div>

      <div className="toolbar">
        <div className="row">
          {TABS.map(t => (
            <button key={t.key} className={`chip ${tab === t.key ? 'on' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>
          ))}
        </div>
        <div className="row">
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} title="من تاريخ" />
          <input type="date" value={to} onChange={e => setTo(e.target.value)} title="إلى تاريخ" />
          {tab === 'journal' && <>
            <Button variant="outline" size="sm" onClick={() => { setExpenseForm(true); }}>+ مصروف سريع</Button>
            <Button variant="outline" size="sm" onClick={openJournal}>+ قيد يومية</Button>
          </>}
          {tab === 'accounts' && <Button variant="outline" size="sm" onClick={() => setAcctForm({ code: '', name: '', type: 'expense' })}>+ حساب جديد</Button>}
          {(tab === 'trial' || tab === 'income' || tab === 'balance') && <>
            <Button variant="outline" size="sm" onClick={() => setCloseForm(true)}>قيد إغلاق الفترة</Button>
            <Button variant="outline" size="sm" onClick={() => {
              if (tab === 'trial') printStatement(`ميزان المراجعة (${from || 'البداية'} — ${to || 'الآن'})`,
                `<table><tbody>${tb.rows.map(r => `<tr><td>${r.code}</td><td>${r.name}</td><td>${num(r.debit)}</td><td>${num(r.credit)}</td><td>${num(r.closing)}</td></tr>`).join('')}
                <tr class="tot"><td colspan="2">الإجمالي</td><td>${num(tb.totals.debit)}</td><td>${num(tb.totals.credit)}</td><td></td></tr></tbody></table>`);
              if (tab === 'income') printStatement(`قائمة الدخل (${from || 'البداية'} — ${to || 'الآن'})`,
                `<h3>الإيرادات</h3><table><tbody>${pl.revenues.map(r => `<tr><td>${r.name}</td><td>${num(r.amount)}</td></tr>`).join('')}</tbody></table>
                 <h3>المصروفات</h3><table><tbody>${pl.expenses.map(r => `<tr><td>${r.name}</td><td>${num(r.amount)}</td></tr>`).join('')}</tbody></table>
                 <div class="tot"><span>صافي الربح</span><span>${num(pl.net)} ${cur}</span></div>`);
              if (tab === 'balance') printStatement(`الميزانية العمومية (${to || 'الآن'})`,
                `<h3>الأصول</h3><table><tbody>${bs.assets.map(r => `<tr><td>${r.name}</td><td>${num(r.amount)}</td></tr>`).join('')}<tr class="tot"><td>إجمالي الأصول</td><td>${num(bs.totalAssets)}</td></tr></tbody></table>
                 <h3>الخصوم</h3><table><tbody>${bs.liabilities.map(r => `<tr><td>${r.name}</td><td>${num(r.amount)}</td></tr>`).join('')}</tbody></table>
                 <h3>حقوق الملكية</h3><table><tbody>${bs.equity.map(r => `<tr><td>${r.name}</td><td>${num(r.amount)}</td></tr>`).join('')}<tr class="tot"><td>إجمالي الخصوم وحقوق الملكية</td><td>${num(bs.totalL + bs.totalE)}</td></tr></tbody></table>`);
            }}>طباعة / PDF</Button>
          </>}
        </div>
      </div>

      {tab === 'journal' && (
        <div className="card">
          <div className="card-head"><h3>اليومية العامة <span className="muted">({data.journals.length} قيد)</span></h3>
            <Button variant="outline" size="sm" onClick={() => download('journals.csv', toCSV(data.journals.map((j: any) => ({
              date: j.date, note: j.note, source: SOURCE_LABEL[j.source] ?? j.source,
              debit: j.lines.reduce((s: number, l: JLine) => s + l.debit, 0),
            }))))}>CSV</Button>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <Table widths={['90px', '90px', '', '110px', '']} cols={['التاريخ', 'المصدر', 'البيان', 'القيمة', 'أطراف القيد']} rows={journals}
              render={j => {
                const total = j.lines.reduce((s, l) => s + l.debit, 0);
                return [
                  <span key="d" className="mono">{fmtDate(j.date)}</span>,
                  <Badge key="s" tone={j.source === 'manual' ? 'primary' : j.source === 'closing' ? 'amber' : 'gray'}>{SOURCE_LABEL[j.source] ?? j.source}</Badge>,
                  <span key="n">{j.note}{j.ref ? <span className="muted" style={{ fontSize: 11 }}> #{String(j.ref).slice(-6)}</span> : null}</span>,
                  <b key="t" className="mono">{num(total)}</b>,
                  <span key="l" style={{ fontSize: 11.5, color: 'var(--soft)' }}>
                    {j.lines.map((l, i) => `${l.debit ? '' : '← '}${acctName(l.code)}${l.debit ? ` (${num(l.debit)})` : ` (${num(l.credit)})`}`).join(' · ')}
                  </span>,
                ];
              }}
              empty="لا توجد قيود بعد — تُسجَّل القيود تلقائياً مع كل عملية بيع أو شراء أو مرتجع" />
          </div>
        </div>
      )}

      {tab === 'accounts' && (
        <div className="card">
          <div className="card-head"><h3>دليل الحسابات</h3></div>
          <div className="card-body" style={{ padding: 0 }}>
            <Table widths={['100px', '', '120px', '110px', '130px', '180px']} cols={['الكود', 'اسم الحساب', 'النوع', 'رصيد افتتاحي', 'الرصيد الحالي', '']} rows={[...accounts].sort((a, b) => a.code.localeCompare(b.code))}
              render={a => {
                const row = tb.rows.find(r => r.code === a.code);
                return [
                  <span key="c" className="mono"><b>{a.code}</b></span>,
                  a.isGroup ? <b key="n" style={{ color: 'var(--primary)' }}>{a.name}</b> : <span key="n">{a.name}</span>,
                  <Badge key="t" tone="primary">{TYPE_LABEL[a.type as AccountType] ?? a.type}</Badge>,
                  <span key="o" className="mono">{a.opening ? num(a.opening) : '—'}</span>,
                  <b key="b" className="mono">{a.isGroup ? '—' : num(row?.closing ?? 0)}</b>,
                  a.isGroup ? <span key="x" /> : <span key="x" className="row" style={{ gap: 6 }}>
                    <Button size="sm" variant="outline" onClick={() => setAcctForm(a)}>تعديل</Button>
                    {canDelete && <Button size="sm" variant="danger" onClick={() => { remove('accounts', a.id); toast('تم حذف الحساب'); }}>حذف</Button>}
                  </span>,
                ];
              }}
              empty="لا يوجد دليل حسابات" />
          </div>
        </div>
      )}

      {tab === 'trial' && (
        <div className="card">
          <div className="card-head">
            <h3>ميزان المراجعة</h3>
            <Badge tone={tb.balanced ? 'green' : 'red'}>{tb.balanced ? 'متوازن ✓' : 'غير متوازن!'}</Badge>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <Table widths={['90px', '', '110px', '110px', '110px', '120px']} cols={['الكود', 'الحساب', 'افتتاحي', 'مدين', 'دائن', 'الرصيد']} rows={tb.rows}
              render={r => [
                <span key="c" className="mono">{r.code}</span>,
                <span key="n">{r.name}</span>,
                <span key="o" className="mono">{r.opening ? num(r.opening) : '—'}</span>,
                <span key="d" className="mono" style={{ color: 'var(--red)' }}>{r.debit ? num(r.debit) : '—'}</span>,
                <span key="cr" className="mono" style={{ color: 'var(--green)' }}>{r.credit ? num(r.credit) : '—'}</span>,
                <b key="b" className="mono">{num(r.closing)}</b>,
              ]} />
            <div className="row" style={{ justifyContent: 'space-between', padding: '14px 16px', fontWeight: 700 }}>
              <span>الإجمالي</span>
              <span className="mono" style={{ color: 'var(--red)' }}>مدين {num(tb.totals.debit)}</span>
              <span className="mono" style={{ color: 'var(--green)' }}>دائن {num(tb.totals.credit)}</span>
              <span className="mono">صافي {num(tb.totals.closing)}</span>
            </div>
          </div>
        </div>
      )}

      {tab === 'income' && (
        <div className="grid-2">
          <div className="card">
            <div className="card-head"><h3>الإيرادات</h3></div>
            <div className="card-body" style={{ padding: 0 }}>
              <Table widths={['', '120px']} cols={['الحساب', 'المبلغ']} rows={pl.revenues}
                render={r => [<span key="n">{r.name}</span>, <b key="a" className="mono" style={{ color: 'var(--green)' }}>{num(r.amount)}</b>]}
                empty="لا إيرادات في الفترة" />
            </div>
          </div>
          <div className="card">
            <div className="card-head"><h3>المصروفات</h3></div>
            <div className="card-body" style={{ padding: 0 }}>
              <Table widths={['', '120px']} cols={['الحساب', 'المبلغ']} rows={pl.expenses}
                render={r => [<span key="n">{r.name}</span>, <b key="a" className="mono" style={{ color: 'var(--red)' }}>{num(r.amount)}</b>]}
                empty="لا مصروفات في الفترة" />
            </div>
          </div>
          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <div className="row" style={{ justifyContent: 'space-between', padding: '16px 20px', fontSize: 16, fontWeight: 800 }}>
              <span>صافي الربح للفترة {from || to ? `(${from || '…'} — ${to || '…'})` : ''}</span>
              <span className="mono" style={{ color: pl.net >= 0 ? 'var(--green)' : 'var(--red)' }}>{num(pl.net)} {cur}</span>
            </div>
          </div>
        </div>
      )}

      {tab === 'balance' && (
        <div className="grid-2">
          <div className="card">
            <div className="card-head"><h3>الأصول</h3></div>
            <div className="card-body" style={{ padding: 0 }}>
              <Table widths={['', '120px']} cols={['الحساب', 'الرصيد']} rows={bs.assets}
                render={r => [<span key="n">{r.name}</span>, <b key="a" className="mono">{num(r.amount)}</b>]} empty="لا أصول مسجلة" />
            </div>
            <div className="row" style={{ justifyContent: 'space-between', padding: 14, fontWeight: 700, borderTop: '1px solid var(--line)' }}>
              <span>إجمالي الأصول</span><span className="mono">{num(bs.totalAssets)}</span>
            </div>
          </div>
          <div className="card">
            <div className="card-head"><h3>الخصوم وحقوق الملكية</h3></div>
            <div className="card-body" style={{ padding: 0 }}>
              {bs.liabilities.length > 0 && <>
                <div style={{ padding: '10px 14px 0', fontWeight: 700, color: 'var(--soft)', fontSize: 12 }}>الخصوم</div>
                <Table widths={['', '120px']} cols={['الحساب', 'الرصيد']} rows={bs.liabilities} render={r => [<span key="n">{r.name}</span>, <b key="a" className="mono">{num(r.amount)}</b>]} />
              </>}
              <div style={{ padding: '10px 14px 0', fontWeight: 700, color: 'var(--soft)', fontSize: 12 }}>حقوق الملكية</div>
              <Table widths={['', '120px']} cols={['الحساب', 'الرصيد']} rows={bs.equity} render={r => [<span key="n">{r.name}</span>, <b key="a" className="mono">{num(r.amount)}</b>]} empty="—" />
            </div>
            <div className="row" style={{ justifyContent: 'space-between', padding: 14, fontWeight: 700, borderTop: '1px solid var(--line)' }}>
              <span>إجمالي الخصوم وحقوق الملكية</span><span className="mono">{num(bs.totalL + bs.totalE)}</span>
            </div>
            {Math.abs(bs.diff) > 0.01 && (
              <div style={{ padding: '0 14px 12px', fontSize: 12, color: 'var(--amber, #e67e22)' }}>
                فرق غير مطبوع بمقدار {num(bs.diff)} — راجع القيود غير المتوازنة أو الأرصدة الافتتاحية
              </div>
            )}
          </div>
        </div>
      )}

      {/* manual journal entry modal */}
      {form && (
        <Modal title="قيد يومية" onClose={() => setForm(null)} width={640}>
          <div className="form-grid">
            <div>
              <label className="field">التاريخ</label>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <label className="field">البيان</label>
              <input value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="مثال: سداد إيجار شهر أكتوبر" />
            </div>
          </div>
          <table style={{ width: '100%', fontSize: 13 }}>
            <thead><tr><th>الحساب</th><th style={{ width: 120 }}>مدين</th><th style={{ width: 120 }}>دائن</th></tr></thead>
            <tbody>
              {form.lines.map((l, i) => {
                const set = (patch: Partial<JLine>) => setForm({ ...form, lines: form.lines.map((x, xi) => xi === i ? { ...x, ...patch } : x) });
                return (
                  <tr key={i}>
                    <td>
                      <select value={l.code} onChange={e => set({ code: e.target.value })}>
                        {accounts.filter(a => !a.isGroup).map(a => <option key={a.code} value={a.code}>{a.code} — {a.name}</option>)}
                      </select>
                    </td>
                    <td><input type="number" value={l.debit || ''} onChange={e => set({ debit: Number(e.target.value) || 0, credit: 0 })} /></td>
                    <td><input type="number" value={l.credit || ''} onChange={e => set({ credit: Number(e.target.value) || 0, debit: 0 })} /></td>
                    <td>{form.lines.length > 2 && <Button size="sm" variant="danger" onClick={() => setForm({ ...form, lines: form.lines.filter((_, xi) => xi !== i) })}>✕</Button>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="row" style={{ justifyContent: 'space-between', marginTop: 10 }}>
            <Button size="sm" variant="outline" onClick={() => setForm({ ...form, lines: [...form.lines, { code: '1101', debit: 0, credit: 0 }] })}>+ سطر</Button>
            <div className="mono" style={{ fontWeight: 700 }}>
              مدين {num(form.lines.reduce((s, l) => s + l.debit, 0))} / دائن {num(form.lines.reduce((s, l) => s + l.credit, 0))}
              {isBalanced(form.lines.filter(l => l.debit > 0 || l.credit > 0)) && <span style={{ color: 'var(--green)' }}> ✓ متوازن</span>}
            </div>
          </div>
          <div className="row" style={{ justifyContent: 'flex-end', marginTop: 14 }}>
            <Button variant="outline" onClick={() => setForm(null)}>إلغاء</Button>
            <Button onClick={submitJournal}>حفظ القيد</Button>
          </div>
        </Modal>
      )}

      {/* quick expense modal */}
      {expenseForm && (
        <Modal title="مصروف سريع" onClose={() => setExpenseForm(false)} width={420}>
          <div className="form-grid">
            <div>
              <label className="field">الحساب</label>
              <select value={expAcct} onChange={e => setExpAcct(e.target.value)}>
                {accounts.filter(a => !a.isGroup && a.type === 'expense').map(a => <option key={a.code} value={a.code}>{a.code} — {a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="field">المبلغ</label>
              <input type="number" value={expAmount} onChange={e => setExpAmount(e.target.value)} />
            </div>
          </div>
          <label className="field">البيان</label>
          <input value={expNote} onChange={e => setExpNote(e.target.value)} placeholder="وصف المصروف" />
          <div className="row" style={{ justifyContent: 'flex-end', marginTop: 14 }}>
            <Button variant="outline" onClick={() => setExpenseForm(false)}>إلغاء</Button>
            <Button onClick={submitExpense}>تسجيل</Button>
          </div>
        </Modal>
      )}

      {/* account form modal */}
      {acctForm && (
        <Modal title={acctForm.id ? 'تعديل حساب' : 'حساب جديد'} onClose={() => setAcctForm(null)} width={420}>
          <div className="form-grid">
            <div>
              <label className="field">الكود</label>
              <input value={acctForm.code ?? ''} onChange={e => setAcctForm({ ...acctForm, code: e.target.value })} placeholder="مثال 5205" />
            </div>
            <div>
              <label className="field">النوع</label>
              <select value={acctForm.type} onChange={e => setAcctForm({ ...acctForm, type: e.target.value as AccountType })}>
                {(Object.keys(TYPE_LABEL) as AccountType[]).map(t => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
              </select>
            </div>
          </div>
          <label className="field">الاسم</label>
          <input value={acctForm.name ?? ''} onChange={e => setAcctForm({ ...acctForm, name: e.target.value })} />
          <label className="field">رصيد افتتاحي (مدين موجب / دائن سالب)</label>
          <input type="number" value={acctForm.opening ?? 0} onChange={e => setAcctForm({ ...acctForm, opening: Number(e.target.value) || 0 })} />
          <div className="row" style={{ justifyContent: 'flex-end', marginTop: 14 }}>
            <Button variant="outline" onClick={() => setAcctForm(null)}>إلغاء</Button>
            <Button onClick={submitAccount}>حفظ</Button>
          </div>
        </Modal>
      )}

      {/* closing entry confirm modal */}
      {closeForm && (
        <Modal title="قيد إغلاق الفترة" onClose={() => setCloseForm(false)} width={480}>
          <p style={{ fontSize: 13.5, color: 'var(--soft)' }}>
            هيتولّد قيد تلقائي بيرحّل أرصدة الإيرادات والمصروفات للفترة {from || 'من البداية'} — {to || 'حتى الآن'} إلى حساب «أرباح مرحلة».
          </p>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span>صافي الربح المرحّل</span>
            <b className="mono" style={{ color: pl.net >= 0 ? 'var(--green)' : 'var(--red)' }}>{num(pl.net)} {cur}</b>
          </div>
          <div className="row" style={{ justifyContent: 'flex-end', marginTop: 14 }}>
            <Button variant="outline" onClick={() => setCloseForm(false)}>إلغاء</Button>
            <Button onClick={doClosing}>تنفيذ الإغلاق</Button>
          </div>
        </Modal>
      )}
    </>
  );
}

function printStatement(title: string, body: string) {
  printHTML(title, `<h2>${title}</h2>${body}`);
}
