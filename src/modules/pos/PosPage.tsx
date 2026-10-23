/** Point of Sale — Odoo-style product grid + cart panel. */
import { useMemo, useState } from 'react';
import { useStore } from '../../store/AppStore';
import { Badge } from '../../components/ui/Badge';
import { CartPanel } from './CartPanel';
import { num } from '../../lib/format';
import { printHTML } from '../../lib/print';
import { initials } from '../../lib/format';

export function PosPage() {
  const { data, settings } = useStore();
  const todayKey = new Date().toLocaleDateString('sv');
  const todaySales = useMemo(() => data.invoices.filter(i => i.kind === 'sale' && i.date === todayKey), [data.invoices, todayKey]);
  const todayTotal = todaySales.reduce((s, i) => s + i.total, 0);
  const todayPaid = todaySales.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0);

  const zReport = () => {
    const items = new Map<string, number>();
    todaySales.forEach(i => (i.items ?? []).forEach((it: any) => items.set(it.name, (items.get(it.name) ?? 0) + it.qty)));
    const top = [...items.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    printHTML('تقرير إغلاق اليوم', `
      <h2 style="margin:0">${settings.companyName}</h2>
      <div style="color:#555">تقرير إغلاق اليوم — ${new Date().toLocaleDateString('ar-EG')}</div>
      <table><tr><td>عدد الفواتير</td><td><b>${todaySales.length}</b></td></tr>
        <tr><td>إجمالي المبيعات</td><td><b>${num(todayTotal)} ج.م</b></td></tr>
        <tr><td>محصّلة (مدفوعة)</td><td><b>${num(todayPaid)} ج.م</b></td></tr>
        <tr><td>آجلة (غير مدفوعة)</td><td><b>${num(todayTotal - todayPaid)} ج.م</b></td></tr></table>
      <h3>الأصناف الأكثر بيعاً</h3>
      <table><tr><th>الصنف</th><th>الكمية</th></tr>
        ${top.map(([n, q]) => `<tr><td>${n}</td><td>${q}</td></tr>`).join('') || '<tr><td colspan="2">لا مبيعات اليوم</td></tr>'}</table>
      <p style="margin-top:36px;color:#777">التوقيع: ................</p>`);
  };
  const [q, setQ] = useState('');
  const [cart, setCart] = useState<Record<string, number>>({});

  const products = useMemo(
    () => data.products.filter(p => p.name.includes(q) || p.sku.toLowerCase().includes(q.toLowerCase()) || p.category.includes(q)),
    [data.products, q]
  );

  const addToCart = (id: string) => setCart(c => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
  const setQty = (id: string, qty: number) => setCart(c => {
    const n = { ...c };
    if (qty <= 0) delete n[id]; else n[id] = qty;
    return n;
  });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 18 }}>
      <div>
        <div className="row" style={{ gap: 8 }}>
        <input style={{ flex: 1 }} value={q} placeholder="ابحث بالاسم أو الكود..." onChange={e => setQ(e.target.value)} />
        <button className="btn" onClick={zReport} title="تقرير إغلاق اليوم">🧾 إغلاق اليوم</button>
      </div>
      <div style={{ margin: '10px 0', fontSize: 13, color: 'var(--soft)' }}>
        مبيعات اليوم: <b style={{ color: 'var(--primary)' }}>{num(todayTotal)} ج.م</b> ({todaySales.length} فاتورة)
      </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginTop: 14 }}>
          {products.map(p => (
            <button key={p.id} className="card" style={{ padding: 14, textAlign: 'start', border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink)' }}
              disabled={p.stock === 0} onClick={() => addToCart(p.id)}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--primary-soft)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{initials(p.name)}</span>
                {p.stock === 0 ? <Badge tone="red">نفد</Badge> : p.stock <= p.minStock ? <Badge tone="amber">{p.stock}</Badge> : <Badge tone="green">{p.stock}</Badge>}
              </div>
              <div style={{ fontWeight: 600, fontSize: 13, marginTop: 8 }}>{p.name}</div>
              <div className="mono" style={{ fontSize: 12, color: 'var(--primary)' }}>{num(p.price)} ج.م</div>
            </button>
          ))}
          {!products.length && <div className="empty" style={{ gridColumn: '1/-1' }}>لا توجد نتائج</div>}
        </div>
      </div>
      <CartPanel cart={cart} setQty={setQty} clear={() => setCart({})} />
    </div>
  );
}
