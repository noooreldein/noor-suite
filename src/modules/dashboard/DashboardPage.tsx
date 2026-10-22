/** Executive dashboard — KPIs + charts + activity widgets. */
import { useMemo } from 'react';
import { useStore } from '../../store/AppStore';
import { StatCard } from '../../components/ui/StatCard';
import { BarChart } from '../../components/charts/BarChart';
import { DonutChart } from '../../components/charts/DonutChart';
import { Badge } from '../../components/ui/Badge';
import { num } from '../../lib/format';
import { lastMonths, monthKey, monthName, fmtDate } from '../../lib/dates';

export function DashboardPage() {
  const { data } = useStore();

  const sales = useMemo(() => data.invoices.filter(i => i.kind === 'sale'), [data.invoices]);
  const purchases = useMemo(() => data.invoices.filter(i => i.kind === 'purchase'), [data.invoices]);
  const revenue = sales.reduce((s, i) => s + i.total, 0);
  const spend = purchases.reduce((s, i) => s + i.total, 0);
  const profit = revenue - spend;

  const monthly = useMemo(() => lastMonths(6).map(k => ({
    label: monthName(k),
    value: sales.filter(i => monthKey(i.date) === k).reduce((s, i) => s + i.total, 0),
  })), [sales]);

  const byCategory = useMemo(() => {
    const m = new Map<string, number>();
    data.products.forEach(p => m.set(p.category, (m.get(p.category) ?? 0) + p.stock));
    return [...m.entries()].map(([label, value]) => ({ label, value }));
  }, [data.products]);

  const lowStock = data.products.filter(p => p.stock <= p.minStock);
  const openTasks = data.tasks.filter(t => t.stage !== 'done');

  return (
    <>
      <div className="kpis">
        <StatCard label="إيرادات المبيعات" value={num(revenue)} sub="جنيه" tone="green" />
        <StatCard label="المشتريات" value={num(spend)} sub="جنيه" tone="amber" />
        <StatCard label="صافي الربح" value={num(profit)} sub="جنيه" tone={profit >= 0 ? 'primary' : 'red'} />
        <StatCard label="فواتير غير مدفوعة" value={data.invoices.filter(i => i.status === 'unpaid').length} tone="blue" />
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-head"><h3>المبيعات — آخر ٦ أشهر</h3></div>
          <div className="card-body"><BarChart data={monthly} /></div>
        </div>
        <div className="card">
          <div className="card-head"><h3>توزيع المخزون بالتصنيف</h3></div>
          <div className="card-body"><DonutChart data={byCategory} /></div>
        </div>
      </div>

      <div className="grid-2 mt">
        <div className="card">
          <div className="card-head"><h3>تنبيهات المخزون</h3><Badge tone={lowStock.length ? 'amber' : 'green'}>{lowStock.length}</Badge></div>
          <div className="card-body">
            {lowStock.length ? lowStock.map(p => (
              <div key={p.id} className="row" style={{ justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--line)' }}>
                <span>{p.name}</span><Badge tone="red">{p.stock} متبقي</Badge>
              </div>
            )) : <div className="empty">المخزون سليم ✓</div>}
          </div>
        </div>
        <div className="card">
          <div className="card-head"><h3>مهام جارية</h3><Badge tone="primary">{openTasks.length}</Badge></div>
          <div className="card-body">
            {openTasks.map(t => (
              <div key={t.id} className="row" style={{ justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--line)' }}>
                <span style={{ flex: 1 }}>{t.title}</span>
                <Badge tone={t.priority === 'high' ? 'red' : t.priority === 'medium' ? 'amber' : 'gray'}>{t.priority === 'high' ? 'عالية' : t.priority === 'medium' ? 'متوسطة' : 'منخفضة'}</Badge>
                <span className="mono" style={{ color: 'var(--soft)', fontSize: 12 }}>{fmtDate(t.due)}</span>
              </div>
            ))}
            {!openTasks.length && <div className="empty">لا مهام جارية</div>}
          </div>
        </div>
      </div>
    </>
  );
}
