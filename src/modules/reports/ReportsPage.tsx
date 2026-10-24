/** Reports hub — analytics across all modules. */
import { useMemo, useState } from 'react';
import { useStore } from '../../store/AppStore';
import { Tabs } from '../../components/ui/Tabs';
import { BarChart } from '../../components/charts/BarChart';
import { LineChart } from '../../components/charts/LineChart';
import { DonutChart } from '../../components/charts/DonutChart';
import { StatCard } from '../../components/ui/StatCard';
import { Badge } from '../../components/ui/Badge';
import { num } from '../../lib/format';
import { lastMonths, monthKey, monthName, fmtDate } from '../../lib/dates';
import { printHTML } from '../../lib/print';
import { Button } from '../../components/ui/Button';

export function ReportsPage() {
  const { data } = useStore();
  const [tab, setTab] = useState('sales');

  const sales = data.invoices.filter(i => i.kind === 'sale');
  const purchases = data.invoices.filter(i => i.kind === 'purchase');

  const monthlySales = useMemo(() => lastMonths(6).map(k => ({
    label: monthName(k),
    value: sales.filter(i => monthKey(i.date) === k).reduce((s, i) => s + i.total, 0),
  })), [sales]);

  const monthlyPurchases = useMemo(() => lastMonths(6).map(k => ({
    label: monthName(k),
    value: purchases.filter(i => monthKey(i.date) === k).reduce((s, i) => s + i.total, 0),
  })), [purchases]);

  const topProducts = useMemo(() => {
    const m = new Map<string, number>();
    sales.forEach(i => i.items.forEach((it: any) => m.set(it.name, (m.get(it.name) ?? 0) + it.qty)));
    return [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 7);
  }, [sales]);

  const profitSeries = useMemo(() => monthlySales.map((s, i) => ({
    label: s.label, value: s.value - monthlyPurchases[i].value,
  })), [monthlySales, monthlyPurchases]);

  const printSales = () => printHTML('تقرير المبيعات', `
    <h1>تقرير المبيعات — ${data.settings.companyName}</h1>
    <table><thead><tr><th>الشهر</th><th>المبيعات</th><th>المشتريات</th><th>الصافي</th></tr></thead><tbody>
    ${monthlySales.map((s, i) => `<tr><td>${s.label}</td><td>${num(s.value)}</td><td>${num(monthlyPurchases[i].value)}</td><td>${num(s.value - monthlyPurchases[i].value)}</td></tr>`).join('')}
    </tbody></table>`);

  return (
    <>
      <div className="toolbar">
        <Tabs active={tab} onChange={setTab} tabs={[
          { key: 'sales', label: 'المبيعات والأرباح' },
          { key: 'inventory', label: 'المخزون' },
          { key: 'hr', label: 'الموظفون' },
        ]} />
        <div className="grow" />
        <Button variant="outline" onClick={printSales}>🖨 طباعة التقرير</Button>
      </div>

      {tab === 'sales' && (
        <>
          <div className="kpis">
            <StatCard label="إجمالي المبيعات" value={num(sales.reduce((s, i) => s + i.total, 0))} tone="green" />
            <StatCard label="إجمالي المشتريات" value={num(purchases.reduce((s, i) => s + i.total, 0))} tone="amber" />
            <StatCard label="متوسط الفاتورة" value={num(sales.length ? sales.reduce((s, i) => s + i.total, 0) / sales.length : 0)} tone="primary" />
          </div>
          <div className="grid-2">
            <div className="card"><div className="card-head"><h3>المبيعات الشهرية</h3></div><div className="card-body"><BarChart data={monthlySales} /></div></div>
            <div className="card"><div className="card-head"><h3>صافي الربح الشهري</h3></div><div className="card-body"><LineChart data={profitSeries} /></div></div>
          </div>
        </>
      )}

      {tab === 'inventory' && (
        <>
          <div className="card"><div className="card-head"><h3>المنتجات الأكثر مبيعاً</h3></div><div className="card-body"><BarChart data={topProducts} /></div></div>
          <div className="grid-2 mt">
            <div className="card"><div className="card-head"><h3>قيمة المخزون حسب التصنيف</h3></div><div className="card-body">
              <DonutChart data={(() => {
                const m = new Map<string, number>();
                data.products.forEach(p => m.set(p.category, (m.get(p.category) ?? 0) + p.stock * p.cost));
                return [...m.entries()].map(([label, value]) => ({ label, value }));
              })()} />
            </div></div>
            <div className="card"><div className="card-head"><h3>حالة المخزون</h3></div><div className="card-body">
              <div className="row" style={{ justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--line)' }}><span>إجمالي المنتجات</span><b>{data.products.length}</b></div>
              <div className="row" style={{ justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--line)' }}><span>تحت حد الطلب</span><Badge tone="amber">{data.products.filter(p => p.stock <= p.minStock).length}</Badge></div>
              <div className="row" style={{ justifyContent: 'space-between', padding: '9px 0' }}><span>نفدت</span><Badge tone="red">{data.products.filter(p => p.stock === 0).length}</Badge></div>
            </div></div>
          </div>
        </>
      )}

      {tab === 'hr' && (
        <div className="card"><div className="card-head"><h3>الرواتب حسب الموظف</h3></div><div className="card-body">
          <BarChart data={data.employees.map(e => ({ label: e.name.split(' ')[0], value: e.salary }))} color="var(--amber)" />
          <div style={{ marginTop: 12 }}>
            {data.employees.map(e => (
              <div key={e.id} className="row" style={{ justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--line)', fontSize: 13 }}>
                <span>{e.name} — {e.role}</span>
                <span className="mono">{num(e.salary)} ج.م — تعيين {fmtDate(e.hiredAt)}</span>
              </div>
            ))}
          </div>
        </div></div>
      )}
    </>
  );
}
