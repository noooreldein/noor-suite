/** POS cart + checkout flow. */
import { useMemo, useState } from 'react';
import { useStore } from '../../store/AppStore';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { total as calcTotal } from '../../lib/money';
import { num } from '../../lib/format';
import { today } from '../../lib/dates';
import { printHTML } from '../../lib/print';

export function CartPanel({ cart, setQty, clear }: {
  cart: Record<string, number>;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
}) {
  const { data, add, update, toast } = useStore();
  const [checkout, setCheckout] = useState(false);
  const [partnerId, setPartnerId] = useState('');
  const [discount, setDiscount] = useState(0);

  const lines = useMemo(() => Object.entries(cart).map(([pid, qty]) => {
    const p = data.products.find(x => x.id === pid)!;
    return { pid, name: p.name, qty, price: p.price, stock: p.stock };
  }), [cart, data.products]);

  const gross = calcTotal(lines);
  const net = Math.max(0, gross - discount);

  const finish = () => {
    if (!lines.length) return;
    const items = lines.map(l => ({ productId: l.pid, name: l.name, qty: l.qty, price: l.price }));
    const inv = {
      kind: 'sale' as const,
      partnerId: partnerId || data.partners.find(p => p.type === 'customer')?.id || '',
      date: today(),
      items,
      total: net,
      status: 'paid' as const,
    };
    add('invoices', inv);
    lines.forEach(l => {
      const p = data.products.find(x => x.id === l.pid)!;
      update('products', l.pid, { stock: Math.max(0, p.stock - l.qty) });
    });
    setCheckout(false);
    clear();
    toast('تم إتمام البيع ✓');
    printHTML('إيصال بيع', `
      <h1>${data.settings.companyName}</h1><div class="muted">إيصال نقطة بيع</div>
      <table><tbody>${items.map(i => `<tr><td>${i.name} ×${i.qty}</td><td>${num(i.qty * i.price)}</td></tr>`).join('')}</tbody></table>
      <div class="tot"><span>الإجمالي</span><span>${num(net)} ج.م</span></div>
      <p class="muted">شكراً لزيارتكم 🙏</p>`);
  };

  return (
    <div className="card" style={{ alignSelf: 'start', position: 'sticky', top: 80 }}>
      <div className="card-head"><h3>سلة البيع</h3><span className="badge b-primary">{lines.length} صنف</span></div>
      <div className="card-body">
        {!lines.length && <div className="empty">السلة فاضغة — اضغط على منتج لإضافته</div>}
        {lines.map(l => (
          <div key={l.pid} className="row" style={{ marginBottom: 10 }}>
            <span style={{ flex: 1, fontSize: 13 }}>{l.name}</span>
            <input type="number" style={{ width: 62 }} value={l.qty} min={1} max={l.stock}
              onChange={e => setQty(l.pid, Math.min(Number(e.target.value) || 0, l.stock))} />
            <span className="mono" style={{ width: 70, textAlign: 'end', fontSize: 12.5 }}>{num(l.qty * l.price)}</span>
            <button className="btn btn-sm btn-danger" onClick={() => setQty(l.pid, 0)}>✕</button>
          </div>
        ))}
        {lines.length > 0 && <>
          <div className="row" style={{ justifyContent: 'space-between', fontWeight: 700, borderTop: '1px solid var(--line)', paddingTop: 12, marginTop: 6 }}>
            <span>الإجمالي</span><span className="mono">{num(net)} ج.م</span>
          </div>
          <Button className="mt" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setCheckout(true)}>إتمام البيع ✓</Button>
        </>}
      </div>
      {checkout && (
        <Modal title="إتمام البيع" onClose={() => setCheckout(false)} width={440}>
          <label className="field">العميل</label>
          <select value={partnerId} onChange={e => setPartnerId(e.target.value)}>
            <option value="">عميل نقدي</option>
            {data.partners.filter(p => p.type === 'customer').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <label className="field">خصم (ج.م)</label>
          <input type="number" min={0} value={discount} onChange={e => setDiscount(Number(e.target.value) || 0)} />
          <div className="row" style={{ justifyContent: 'space-between', marginTop: 14, fontWeight: 700 }}>
            <span>المطلوب</span><span className="mono">{num(net)} ج.م</span>
          </div>
          <div className="modal-actions">
            <Button variant="outline" onClick={() => setCheckout(false)}>إلغاء</Button>
            <Button onClick={finish}>تأكيد + طباعة</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
