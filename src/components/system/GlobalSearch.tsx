/** Global search palette — Ctrl+K searches products, partners, invoices. */
import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../../store/AppStore';
import { navigate } from '../../router/router';
import { shortId } from '../../lib/id';
import { fmtDate } from '../../lib/dates';

type Hit = { kind: string; label: string; sub: string; route: string };

export function GlobalSearch() {
  const { data } = useStore();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen(o => !o); setQ(''); }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const hits = useMemo<Hit[]>(() => {
    if (!q.trim()) return [];
    const t = q.trim();
    const r: Hit[] = [];
    data.products.filter(p => p.name.includes(t) || p.sku?.includes(t)).slice(0, 5)
      .forEach(p => r.push({ kind: 'منتج', label: p.name, sub: `مخزون ${p.stock}`, route: 'inventory' }));
    data.partners.filter(p => p.name.includes(t) || p.phone?.includes(t)).slice(0, 5)
      .forEach(p => r.push({ kind: p.type === 'customer' ? 'عميل' : 'مورد', label: p.name, sub: p.phone ?? '', route: 'partners' }));
    data.invoices.filter(i => i.id.includes(t) || i.status.includes(t)).slice(0, 5)
      .forEach(i => r.push({ kind: 'فاتورة', label: `#${shortId(i.id)} — ${i.kind === 'sale' ? 'مبيعات' : 'مشتريات'}`, sub: fmtDate(i.date), route: i.kind === 'sale' ? 'sales' : 'purchases' }));
    return r;
  }, [q, data]);

  if (!open) return null;
  return (
    <div className="gs-overlay" onClick={() => setOpen(false)}>
      <div className="gs-panel" onClick={e => e.stopPropagation()}>
        <input autoFocus value={q} onChange={e => { setQ(e.target.value); setSel(0); }}
          onKeyDown={e => {
            if (e.key === 'ArrowDown') setSel(s => Math.min(s + 1, hits.length - 1));
            if (e.key === 'ArrowUp') setSel(s => Math.max(s - 1, 0));
            if (e.key === 'Enter' && hits[sel]) { navigate(hits[sel].route as any); setOpen(false); }
          }}
          placeholder="ابحث عن منتج، عميل، رقم فاتورة…" />
        <div className="gs-list">
          {hits.map((h, i) => (
            <div key={i} className={`gs-item ${i === sel ? 'sel' : ''}`} onClick={() => { navigate(h.route as any); setOpen(false); }}
              onMouseEnter={() => setSel(i)}>
              <span className="gs-kind">{h.kind}</span>
              <span>{h.label}</span>
              <span className="gs-sub">{h.sub}</span>
            </div>
          ))}
          {q && !hits.length && <div className="gs-empty">لا نتائج لـ "{q}"</div>}
          {!q && <div className="gs-empty">اكتب للبحث — منتجات، عملاء، فواتير</div>}
        </div>
      </div>
    </div>
  );
}
