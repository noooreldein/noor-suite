/** Business intelligence — forecasts, stock needs, margins & data assistant. */
import { useMemo, useState } from 'react';
import { useStore } from '../../store/AppStore';
import { StatCard } from '../../components/ui/StatCard';
import { Badge } from '../../components/ui/Badge';
import { BarChart } from '../../components/charts/BarChart';
import { LineChart } from '../../components/charts/LineChart';
import { num } from '../../lib/format';
import { lastMonths, monthKey, monthName } from '../../lib/dates';

const today = () => new Date().toISOString().slice(0, 10);
const daysBetween = (a: string, b: string) => Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);

export function BiPage() {
  const { data } = useStore();
  const [q, setQ] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);

  const sales = data.invoices.filter(i => i.kind === 'sale');

  /* ===== cash-flow forecast: avg revenue + outstanding vs expected purchases ===== */
  const monthlyAvg = useMemo(() => {
    const months = lastMonths(6);
    const totals = months.map(m =>
      sales.filter(i => monthKey(i.date) === m).reduce((s, i) => s + i.total, 0));
    const active = totals.filter(t => t > 0);
    return active.length ? active.reduce((s, t) => s + t, 0) / active.length : 0;
  }, [sales]);

  const outstanding = sales.filter(i => i.status === 'unpaid').reduce((s, i) => s + i.total, 0);
  const purchasesMonthly = useMemo(() => {
    const months = lastMonths(6);
    const totals = months.map(m =>
      data.invoices.filter(i => i.kind === 'purchase' && monthKey(i.date) === m)
        .reduce((s, i) => s + i.total, 0));
    const active = totals.filter(t => t > 0);
    return active.length ? active.reduce((s, t) => s + t, 0) / active.length : 0;
  }, [data.invoices]);
  const netFlow = monthlyAvg - purchasesMonthly;

  const forecastSeries = useMemo(() => {
    let cum = 0;
    return lastMonths(6).map(m => ({ label: monthName(m), value: 0 })).concat(
      lastMonths(3).map((m, i) => { cum += netFlow; return { label: `توقع شهر ${i + 1}`, value: cum }; }));
  }, [netFlow]);

  /* ===== stock needs: monthly sold per product vs stock + minStock ===== */
  const soldPerProduct = useMemo(() => {
    const map = new Map<string, { name: string; sold: number; months: number }>();
    sales.forEach(inv => (inv.items ?? []).forEach((it: any) => {
      const r = map.get(it.productId) ?? { name: it.name, sold: 0, months: 0 };
      r.sold += it.qty; r.months++;
      map.set(it.productId, r);
    }));
    return map;
  }, [sales]);

  const stockNeeds = useMemo(() => data.products.map(p => {
    const s = soldPerProduct.get(p.id);
    const monthsOfData = Math.max(1, new Set(sales.map(i => monthKey(i.date))).size);
    const monthlySold = s ? s.sold / monthsOfData : 0;
    const cover = monthlySold ? p.stock / monthlySold : Infinity;
    return { p, monthlySold, reorder: cover < 1.5 || p.stock <= p.minStock, cover };
  }).filter(r => r.reorder).sort((a, b) => a.cover - b.cover), [data.products, soldPerProduct, sales]);

  /* ===== most profitable products + margin drops ===== */
  const profitability = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; profit: number; revenue: number; firstPrice: number; lastPrice: number }>();
    sales.forEach(inv => (inv.items ?? []).forEach((it: any) => {
      const prod = data.products.find(p => p.id === it.productId);
      const margin = it.price - (prod?.cost ?? 0);
      const r = map.get(it.productId) ?? { name: it.name, qty: 0, profit: 0, revenue: 0, firstPrice: it.price, lastPrice: it.price };
      r.qty += it.qty; r.profit += margin * it.qty; r.revenue += it.price * it.qty;
      r.lastPrice = it.price;
      map.set(it.productId, r);
    }));
    return [...map.values()].sort((a, b) => b.profit - a.profit);
  }, [sales, data.products]);

  const marginDrops = profitability.filter(r => r.lastPrice < r.firstPrice);

  /* ===== late payers ===== */
  const latePayers = useMemo(() => {
    const map = new Map<string, { name: string; amount: number; oldest: number; count: number }>();
    sales.filter(i => i.status === 'unpaid').forEach(i => {
      const name = data.partners.find(p => p.id === i.partnerId)?.name ?? 'غير معروف';
      const age = daysBetween(i.date, today());
      const r = map.get(i.partnerId) ?? { name, amount: 0, oldest: age, count: 0 };
      r.amount += i.total; r.count++;
      if (age > r.oldest) r.oldest = age;
      map.set(i.partnerId, r);
    });
    return [...map.values()].sort((a, b) => b.oldest - a.oldest);
  }, [sales, data.partners]);

  /* ===== smart assistant (rule-based over real data) ===== */
  const ask = () => {
    const s = q.trim();
    if (!s) return;
    let a = 'لم أفهم السؤال — جرّب: "أكثر منتج مبيعاً؟" أو "من المتأخر في السداد؟" أو "ما توقعات الشهر القادم؟"';
    const has = (...words: string[]) => words.some(w => s.includes(w));
    if (has('مبيعاً', 'مبيعا', 'الأكثر', 'اكتر', 'أكثر', 'مبيعات', 'مبيع')) {
      const top = profitability[0];
      a = top ? `أكثر منتج مبيعاً وربحاً: ${top.name} — بيع ${top.qty} وحدة بربح ${num(top.profit)} جنيه.` : 'لا توجد مبيعات مسجلة بعد.';
    } else if (has('متأخر', 'مديون', 'مستحق', 'السداد', 'ديون', 'تحصيل')) {
      a = latePayers.length
        ? latePayers.slice(0, 3).map(r => `${r.name}: ${num(r.amount)} جنيه متأخرة بمقدار ${r.oldest} يوم`).join(' — ')
        : 'لا توجد مستحقات متأخرة — جميع الفواتير مسددة.';
    } else if (has('توقع', 'الشهر', 'قادم', 'الجاي', 'مستقبل')) {
      a = `متوسط مبيعاتك الشهري ${num(monthlyAvg)} جنيه والمشتريات ${num(purchasesMonthly)} جنيه — الصافي المتوقع ${netFlow >= 0 ? '+' : ''}${num(netFlow)} جنيه شهرياً، إضافة إلى مستحقات قيمتها ${num(outstanding)} جنيه إذا تم تحصيلها.`;
    } else if (has('هتخلص', 'مخزون', 'مخازن', 'ينتهي', 'نواقص', 'تنفد', 'نفد', 'ناقص')) {
      a = stockNeeds.length
        ? `${stockNeeds.length} منتج يحتاج إعادة طلب: ${stockNeeds.slice(0, 3).map(r => `${r.p.name} (${r.p.stock} ${r.p.unit})`).join('، ')}`
        : 'المخزون في حالة جيدة — لا نواقص متوقعة.';
    } else if (has('ربح', 'هامش')) {
      a = profitability.slice(0, 3).map(r => `${r.name}: ربح ${num(r.profit)}`).join(' — ') || 'لا توجد بيانات ربح بعد.';
    }
    setAnswer(a);
  };

  return (
    <>
      <div className="kpis">
        <StatCard label="متوسط المبيعات الشهري" value={num(monthlyAvg)} sub="جنيه" tone="primary" />
        <StatCard label="التدفق الصافي المتوقع" value={`${netFlow >= 0 ? '+' : ''}${num(netFlow)}`} sub="شهرياً" tone={netFlow >= 0 ? 'green' : 'red'} />
        <StatCard label="مستحقات لم تُحصل" value={num(outstanding)} sub="جنيه" tone="amber" />
        <StatCard label="منتجات تحتاج إعادة طلب" value={stockNeeds.length} tone={stockNeeds.length ? 'red' : 'green'} />
      </div>

      <div className="toolbar">
        <span className="badge b-gray">توقعات مبينة على آخر 6 أشهر من بياناتك</span>
      </div>

      {/* assistant */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-head"><h3>🤖 اسأل بياناتك</h3></div>
        <div className="card-body">
          <div className="row" style={{ gap: 8 }}>
            <input style={{ flex: 1 }} value={q} onChange={e => setQ(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && ask()}
              placeholder='اكتب سؤالاً مثل: أكثر منتج مبيعاً؟ — من المتأخر في السداد؟ — ما توقعات الشهر القادم؟' />
            <button className="btn" onClick={ask}>اسأل</button>
          </div>
          {answer && <div style={{ marginTop: 10, background: 'var(--bg)', borderRadius: 8, padding: 12 }}>
            <b>{answer}</b>
          </div>}
        </div>
      </div>

      <div className="grid-2">
        <div className="card"><div className="card-head"><h3>توقع التدفق النقدي التراكمي</h3></div>
          <div className="card-body"><LineChart data={forecastSeries} /></div></div>
        <div className="card"><div className="card-head"><h3>الربحية بالمنتج (أعلى 8)</h3></div>
          <div className="card-body"><BarChart data={profitability.slice(0, 8).map(r => ({ label: r.name, value: r.profit }))} /></div></div>
      </div>

      <div className="grid-2">
        <div className="card" style={{ marginTop: 14 }}>
          <div className="card-head"><h3>📦 احتياجات المخزون</h3><Badge tone={stockNeeds.length ? 'red' : 'green'}>{stockNeeds.length} صنف</Badge></div>
          <div className="card-body" style={{ display: 'grid', gap: 8 }}>
            {stockNeeds.length ? stockNeeds.map(r => (
              <div key={r.p.id} className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                <b>{r.p.name}</b>
                <span style={{ color: 'var(--soft)' }}>متاح: {r.p.stock} {r.p.unit}</span>
                <Badge tone={r.cover < 1 ? 'red' : 'amber'}>
                  {r.cover === Infinity ? 'لا مبيعات مسجلة' : `يكفي ~${r.cover.toFixed(1)} شهر`}
                </Badge>
                <span style={{ color: 'var(--soft)' }}>مبيعات: {r.monthlySold.toFixed(1)}/شهر</span>
              </div>
            )) : <span style={{ color: 'var(--soft)' }}>كل المنتجات فوق حد الأمان ✓</span>}
          </div>
        </div>

        <div className="card" style={{ marginTop: 14 }}>
          <div className="card-head"><h3>⏳ متأخرو السداد</h3><Badge tone={latePayers.length ? 'amber' : 'green'}>{latePayers.length} عميل</Badge></div>
          <div className="card-body" style={{ display: 'grid', gap: 8 }}>
            {latePayers.length ? latePayers.map(r => (
              <div key={r.name} className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                <b>{r.name}</b>
                <span>{num(r.amount)} جنيه</span>
                <Badge tone={r.oldest > 30 ? 'red' : r.oldest > 14 ? 'amber' : 'gray'}>{r.oldest} يوم ({r.count} فاتورة)</Badge>
              </div>
            )) : <span style={{ color: 'var(--soft)' }}>لا توجد متأخرات ✓</span>}
            {marginDrops.length > 0 && (
              <div style={{ marginTop: 8, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                <b style={{ color: 'var(--red)' }}>هبوط هامش ربح:</b>
                {marginDrops.map(r => <div key={r.name} style={{ fontSize: 12.5, color: 'var(--soft)' }}>{r.name}: من {num(r.firstPrice)} إلى {num(r.lastPrice)}</div>)}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
