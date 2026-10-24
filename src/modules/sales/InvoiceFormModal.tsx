import { useState } from 'react';
import { useStore } from '../../store/AppStore';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { num } from '../../lib/format';
import { today } from '../../lib/dates';
import { saleLines, purchaseLines } from '../../lib/accounting';
import { total as calcTotal } from '../../lib/money';

/** Line-item invoice builder with live stock validation. */
export function InvoiceFormModal({ kind, onClose }: { kind: 'sale' | 'purchase'; onClose: () => void }) {
  const { data, add, update, toast } = useStore();
  const partners = data.partners.filter((p: any) => p.type === (kind === 'sale' ? 'customer' : 'supplier'));
  const products = data.products;

  const [partnerId, setPartnerId] = useState(partners[0]?.id ?? '');
  const [date, setDate] = useState(today());
  const [status, setStatus] = useState<'paid' | 'unpaid'>('paid');
  const [lines, setLines] = useState<{ productId: string; qty: number }[]>([]);

  const addLine = () => setLines(l => [...l, { productId: products[0]?.id ?? '', qty: 1 }]);
  const setLine = (i: number, patch: any) => setLines(l => l.map((x, xi) => xi === i ? { ...x, ...patch } : x));

  const resolved = lines.map(l => {
    const p = data.products.find((x: any) => x.id === l.productId)!;
    const price = kind === 'sale' ? p?.price ?? 0 : p?.cost ?? 0;
    return { ...l, name: p?.name ?? '', price, stock: p?.stock ?? 0 };
  });
  const total = calcTotal(resolved);

  const submit = () => {
    if (!resolved.length) return toast('أضف صنفاً واحداً على الأقل', 'err');
    if (!partnerId) return toast('اختر الجهة', 'err');
    const invId = add('invoices', {
      kind, partnerId, date, status,
      items: resolved.map(r => ({ productId: r.productId, name: r.name, qty: r.qty, price: r.price })),
      total,
    });
    if (kind === 'sale') {
      resolved.forEach(r => {
        const p = data.products.find((x: any) => x.id === r.productId)!;
        update('products', r.productId, { stock: Math.max(0, p.stock - r.qty) });
        add('stockMoves', { type: 'sale', productId: r.productId, name: r.name, delta: -r.qty, ref: invId });
      });
    } else {
      resolved.forEach(r => {
        const p = data.products.find((x: any) => x.id === r.productId)!;
        update('products', r.productId, { stock: p.stock + r.qty });
        add('stockMoves', { type: 'purchase', productId: r.productId, name: r.name, delta: r.qty, ref: invId });
      });
    }
    const cogs = kind === 'sale'
      ? resolved.reduce((sum, r) => {
          const prod = data.products.find((x: any) => x.id === r.productId);
          return sum + r.qty * (prod?.cost ?? 0);
        }, 0)
      : 0;
    add('journals', kind === 'sale'
      ? { date, note: 'فاتورة مبيعات', ref: invId, source: 'sale', lines: saleLines(total, status === 'paid' ? total : 0, status === 'paid' ? 'cash' : 'credit', cogs) }
      : { date, note: 'فاتورة مشتريات', ref: invId, source: 'purchase', lines: purchaseLines(total, status === 'paid' ? total : 0) });
    toast('تم إصدار الفاتورة ✓');
    onClose();
  };

  return (
    <Modal title={kind === 'sale' ? 'فاتورة مبيعات جديدة' : 'فاتورة مشتريات جديدة'} onClose={onClose} width={640}>
      <div className="form-grid">
        <div>
          <label className="field">الجهة</label>
          <select value={partnerId} onChange={e => setPartnerId(e.target.value)}>
            {partners.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="field">التاريخ</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
      </div>

      <label className="field">الأصناف</label>
      {resolved.map((l, i) => (
        <div key={i} className="row" style={{ marginTop: 6 }}>
          <select style={{ flex: 2 }} value={l.productId} onChange={e => setLine(i, { productId: e.target.value })}>
            {products.map((p: any) => <option key={p.id} value={p.id}>{p.name} — {num(kind === 'sale' ? p.price : p.cost)} ج.م</option>)}
          </select>
          <input style={{ width: 80 }} type="number" min={1} max={l.stock} value={l.qty}
            onChange={e => setLine(i, { qty: Number(e.target.value) || 0 })} />
          <span className="mono" style={{ width: 90, textAlign: 'end' }}>{num(l.qty * l.price)}</span>
          <Button size="sm" variant="danger" onClick={() => setLines(ls => ls.filter((_, li) => li !== i))}>✕</Button>
        </div>
      ))}
      <Button size="sm" variant="outline" className="mt" onClick={addLine}>+ صنف</Button>

      <div className="row" style={{ justifyContent: 'space-between', marginTop: 16, fontWeight: 700, fontSize: 15 }}>
        <span>الإجمالي</span><span className="mono" style={{ color: 'var(--primary)' }}>{num(total)} ج.م</span>
      </div>
      <div className="modal-actions">
        <select style={{ width: 130 }} value={status} onChange={e => setStatus(e.target.value as any)}>
          <option value="paid">مدفوعة</option>
          <option value="unpaid">غير مدفوعة</option>
        </select>
        <Button variant="outline" onClick={onClose}>إلغاء</Button>
        <Button onClick={submit}>إصدار الفاتورة</Button>
      </div>
    </Modal>
  );
}
