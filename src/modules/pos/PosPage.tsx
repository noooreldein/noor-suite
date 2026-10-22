/** Point of Sale — Odoo-style product grid + cart panel. */
import { useMemo, useState } from 'react';
import { useStore } from '../../store/AppStore';
import { Badge } from '../../components/ui/Badge';
import { CartPanel } from './CartPanel';
import { num } from '../../lib/format';
import { initials } from '../../lib/format';

export function PosPage() {
  const { data } = useStore();
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
        <input value={q} placeholder="ابحث بالاسم أو الكود..." onChange={e => setQ(e.target.value)} />
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
