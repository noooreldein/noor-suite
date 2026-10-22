/** Inventory module — products list with stock intelligence. */
import { useMemo, useState } from 'react';
import { useStore } from '../../store/AppStore';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { SearchBox } from '../../components/ui/SearchBox';
import { Table } from '../../components/ui/Table';
import { StatCard } from '../../components/ui/StatCard';
import { num } from '../../lib/format';
import { download, toCSV } from '../../lib/csv';
import { ProductFormModal } from './ProductFormModal';
import { StockAdjustModal } from './StockAdjustModal';
import { today } from '../../lib/dates';

export function InventoryPage() {
  const { data, remove, toast, update } = useStore();
  const [q, setQ] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [adjusting, setAdjusting] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const rows = useMemo(() => data.products.filter(p =>
    (p.name.includes(q) || p.sku.toLowerCase().includes(q.toLowerCase()) || p.category.includes(q)) &&
    (!lowOnly || p.stock <= p.minStock)
  ), [data.products, q, lowOnly]);

  const stockValue = data.products.reduce((s, p) => s + p.stock * p.cost, 0);
  const low = data.products.filter(p => p.stock <= p.minStock);

  return (
    <>
      <div className="kpis">
        <StatCard label="المنتجات" value={data.products.length} />
        <StatCard label="قيمة المخزون" value={num(stockValue)} sub="بسعر التكلفة" tone="primary" />
        <StatCard label="تحت حد الطلب" value={low.length} tone={low.length ? 'amber' : 'green'} />
      </div>

      <div className="toolbar">
        <SearchBox value={q} onChange={setQ} placeholder="بحث بالاسم / الكود / التصنيف..." />
        <button className={`chip ${lowOnly ? 'on' : ''}`} onClick={() => setLowOnly(v => !v)}>⚠ يحتاج تعويض</button>
        <Button variant="outline" onClick={() => download(`inventory-${today()}.csv`, toCSV(data.products))}>تصدير CSV</Button>
        <Button onClick={() => setEditing('new')}>+ منتج جديد</Button>
      </div>

      <div className="card">
        <Table cols={['المنتج', 'الكود', 'التصنيف', 'السعر', 'التكلفة', 'المخزون', 'حد الطلب', '']} rows={rows}
          render={p => [
            <b key="n">{p.name}</b>,
            <span key="s" className="mono">{p.sku}</span>,
            <Badge key="c" tone="primary">{p.category}</Badge>,
            <span key="p" className="mono">{num(p.price)}</span>,
            <span key="ct" className="mono" style={{ color: 'var(--soft)' }}>{num(p.cost)}</span>,
            p.stock === 0 ? <Badge key="st" tone="red">نفد</Badge>
              : p.stock <= p.minStock ? <Badge key="st" tone="amber">{p.stock}</Badge>
              : <Badge key="st" tone="green">{p.stock} {p.unit}</Badge>,
            <span key="m">{p.minStock}</span>,
            <div key="a" className="row">
              <Button size="sm" variant="outline" onClick={() => setAdjusting(p.id)}>مخزون +</Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(p.id)}>تعديل</Button>
              <Button size="sm" variant="danger" onClick={() => setConfirmId(p.id)}>حذف</Button>
            </div>,
          ]} />
      </div>

      {editing && <ProductFormModal id={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      {adjusting && <StockAdjustModal id={adjusting} onClose={() => setAdjusting(null)} />}
      {confirmId && (
        <div className="overlay" onMouseDown={e => e.target === e.currentTarget && setConfirmId(null)}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <h3>تأكيد الحذف</h3>
            <p style={{ color: 'var(--soft)' }}>سيتم حذف المنتج نهائياً.</p>
            <div className="modal-actions">
              <Button variant="outline" onClick={() => setConfirmId(null)}>إلغاء</Button>
              <Button variant="danger" onClick={() => { remove('products', confirmId); setConfirmId(null); toast('تم حذف المنتج'); }}>حذف</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
