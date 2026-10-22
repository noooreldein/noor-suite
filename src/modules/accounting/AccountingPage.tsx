/** Accounting — general ledger + P&L summary. */
import { useMemo, useState } from 'react';
import { useStore } from '../../store/AppStore';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Table } from '../../components/ui/Table';
import { StatCard } from '../../components/ui/StatCard';
import { DonutChart } from '../../components/charts/DonutChart';
import { num } from '../../lib/format';
import { fmtDate } from '../../lib/dates';
import { download, toCSV } from '../../lib/csv';

const ACCOUNTS: Record<string, string> = {
  sales: 'مبيعات', purchases: 'مشتريات', salaries: 'رواتب',
  rent: 'إيجار', utilities: 'مرافق', other: 'أخرى',
};

export function AccountingPage() {
  const { data, add, remove, toast, update } = useStore();
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState<{ date: string; account: string; debit: number; credit: number; note: string } | null>(null);

  const rows = useMemo(() =>
    [...data.ledger].sort((a, b) => b.date.localeCompare(a.date))
      .filter(r => filter === 'all' || r.account === filter),
    [data.ledger, filter]);

  const totalDebit = data.ledger.reduce((s, r) => s + r.debit, 0);
  const totalCredit = data.ledger.reduce((s, r) => s + r.credit, 0);
  const balance = totalCredit - totalDebit;

  const expenses = useMemo(() => {
    const m = new Map<string, number>();
    data.ledger.forEach(r => { if (r.debit > 0) m.set(ACCOUNTS[r.account] ?? r.account, (m.get(ACCOUNTS[r.account] ?? r.account) ?? 0) + r.debit); });
    return [...m.entries()].map(([label, value]) => ({ label, value }));
  }, [data.ledger]);

  return (
    <>
      <div className="kpis">
        <StatCard label="إجمالي المدين (مصروفات)" value={num(totalDebit)} tone="red" />
        <StatCard label="إجمالي الدائن (إيرادات)" value={num(totalCredit)} tone="green" />
        <StatCard label="الرصيد" value={num(balance)} tone={balance >= 0 ? 'green' : 'red'} />
      </div>

      <div className="grid-2" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="card-head"><h3>سجل اليومية</h3>
            <div className="row">
              <select style={{ width: 130 }} value={filter} onChange={e => setFilter(e.target.value)}>
                <option value="all">كل الحسابات</option>
                {Object.entries(ACCOUNTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <Button variant="outline" size="sm" onClick={() => download('ledger.csv', toCSV(data.ledger.map((r: any) => ({ ...r, accountName: ACCOUNTS[r.account] }))))}>CSV</Button>
              <Button size="sm" onClick={() => setForm({ date: new Date().toISOString().slice(0, 10), account: 'other', debit: 0, credit: 0, note: '' })}>+ قيد</Button>
            </div>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <Table cols={['التاريخ', 'الحساب', 'البيان', 'مدين', 'دائن', '']} rows={rows}
              render={r => [
                <span key="d" className="mono">{fmtDate(r.date)}</span>,
                <Badge key="a" tone="primary">{ACCOUNTS[r.account] ?? r.account}</Badge>,
                <span key="n" style={{ color: 'var(--soft)' }}>{r.note}</span>,
                r.debit ? <b key="dr" className="mono" style={{ color: 'var(--red)' }}>{num(r.debit)}</b> : <span key="dr" />,
                r.credit ? <b key="cr" className="mono" style={{ color: 'var(--green)' }}>{num(r.credit)}</b> : <span key="cr" />,
                <Button key="x" size="sm" variant="danger" onClick={() => { remove('ledger', r.id); toast('تم حذف القيد'); }}>حذف</Button>,
              ]} />
          </div>
        </div>
        <div className="card">
          <div className="card-head"><h3>توزيع المصروفات</h3></div>
          <div className="card-body"><DonutChart data={expenses} /></div>
        </div>
      </div>

      {form && (
        <div className="overlay" onMouseDown={e => e.target === e.currentTarget && setForm(null)}>
          <div className="modal" style={{ maxWidth: 460 }}>
            <h3>قيد يومية جديد</h3>
            <div className="form-grid">
              <div><label className="field">التاريخ</label><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
              <div>
                <label className="field">الحساب</label>
                <select value={form.account} onChange={e => setForm({ ...form, account: e.target.value })}>
                  {Object.entries(ACCOUNTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div><label className="field">مدين (مصروف)</label><input type="number" value={form.debit} onChange={e => setForm({ ...form, debit: Number(e.target.value) || 0 })} /></div>
              <div><label className="field">دائن (إيراد)</label><input type="number" value={form.credit} onChange={e => setForm({ ...form, credit: Number(e.target.value) || 0 })} /></div>
            </div>
            <label className="field">البيان</label>
            <input value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
            <div className="modal-actions">
              <Button variant="outline" onClick={() => setForm(null)}>إلغاء</Button>
              <Button onClick={() => {
                if (!form.note.trim()) return toast('البيان مطلوب', 'err');
                add('ledger', form);
                setForm(null); toast('تم تسجيل القيد ✓');
              }}>حفظ القيد</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
