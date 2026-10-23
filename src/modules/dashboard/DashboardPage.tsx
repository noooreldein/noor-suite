/** Executive dashboard — KPIs + charts + activity widgets. */
import { useMemo } from 'react';
import { useRoute } from '../../router/router';
import { useStore } from '../../store/AppStore';
import { StatCard } from '../../components/ui/StatCard';
import { BarChart } from '../../components/charts/BarChart';
import { DonutChart } from '../../components/charts/DonutChart';
import { Badge } from '../../components/ui/Badge';
import { num } from '../../lib/format';
import { shortId } from '../../lib/id';
import { partnerName } from '../sales/SalesPage';
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
  const overdue = sales.filter(i => i.status === 'unpaid' && (Date.now() - new Date(i.date).getTime()) > 14 * 864e5);
  const [, navigate] = useRoute();
  const isEmpty = !data.products.length && !data.invoices.length && !data.partners.length;

  if (isEmpty) return (
    <div className="card empty-state">
      <div className="es-icon">🗂️</div>
      <h3>نظامك جاهز — ابدأ أول خطوة</h3>
      <p>أضف منتجاتك وعملاءك، واصدر أول فاتورة — كل التقارير هتتولد تلقائياً من بياناتك الفعلية.</p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={() => navigate('inventory')}>إضافة منتجات</button>
        <button className="btn" style={{ border: '1px solid var(--line)' }} onClick={() => navigate('partners')}>إضافة عملاء وموردين</button>
        <button className="btn" style={{ border: '1px solid var(--line)' }} onClick={() => navigate('pos')}>تجربة نقطة البيع</button>
      </div>
    </div>
  );

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

      {overdue.length > 0 && (
        <div className="card" style={{ marginTop: 16, border: '1px solid #fca5a5', background: '#fef2f2' }}>
          <div className="card-head"><h3 style={{ color: '#b91c1c' }}>فواتير متأخرة عن السداد (أكثر من ١٤ يوم)</h3><Badge tone="red">{overdue.length}</Badge></div>
          <div className="card-body">
            {overdue.map(i => (
              <div key={i.id} className="row" style={{ justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #fecaca' }}>
                <span>#{shortId(i.id)} — {partnerName(data, i.partnerId)}</span>
                <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <b>{num(i.total)}</b>
                  <Badge tone="red">{Math.floor((Date.now() - new Date(i.date).getTime()) / 864e5)} يوم</Badge>
                </span>
              </div>
            ))}
            <button className="btn" style={{ marginTop: 12, border: '1px solid #fca5a5' }} onClick={() => navigate('sales')}>مراجعة فواتير المبيعات</button>
          </div>
        </div>
      )}

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
