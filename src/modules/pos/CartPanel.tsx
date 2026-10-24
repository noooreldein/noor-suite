import { bstock, stockAfter } from '../../lib/branches';
/** POS cart + checkout flow — multi-payment, shift-bound, stock-move logged. */
import { useMemo, useState } from 'react';
import { useStore } from '../../store/AppStore';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { total as calcTotal } from '../../lib/money';
import { num } from '../../lib/format';
import { today } from '../../lib/dates';
import { saleLines } from '../../lib/accounting';
import { printHTML } from '../../lib/print';

const METHODS = [
  { key: 'cash', label: 'نقدي' },
  { key: 'card', label: 'بطاقة' },
  { key: 'credit', label: 'آجل' },
] as const;

export function CartPanel({ cart, setQty, clear, shiftOpen, shiftId }: {
  cart: Record<string, number>;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  shiftOpen: boolean;
  shiftId: string | null;
}) {
  const { data, add, update, toast, branch } = useStore();
  const [checkout, setCheckout] = useState(false);
  const [partnerId, setPartnerId] = useState('');
  const [discount, setDiscount] = useState(0);
  const [method, setMethod] = useState<'cash' | 'card' | 'credit'>('cash');
  const [collected, setCollected] = useState<number | ''>('');

  const lines = useMemo(() => Object.entries(cart).map(([pid, qty]) => {
    const p = data.products.find(x => x.id === pid)!;
    return { pid, name: p.name, qty, price: p.price, stock: bstock(p, branch) };
  }), [cart, data.products]);

  const gross = calcTotal(lines);
  const net = Math.max(0, gross - discount);
  const paidNow = collected === '' ? (method === 'credit' ? 0 : net) : Number(collected);
  const change = Math.max(0, paidNow - net);

  const finish = () => {
    if (!lines.length) return;
    const items = lines.map(l => ({ productId: l.pid, name: l.name, qty: l.qty, price: l.price }));
    const status = method === 'credit'
      ? (paidNow > 0 ? 'partial' : 'unpaid')
      : (paidNow >= net ? 'paid' : paidNow > 0 ? 'partial' : 'unpaid');
    const invId = add('invoices', {
      kind: 'sale' as const,
      partnerId: partnerId || data.partners.find(p => p.type === 'customer')?.id || '',
      date: today(),
      items,
      total: net,
      status,
      paymentMethod: method,
      collected: method === 'credit' ? paidNow : Math.min(paidNow, net),
      shiftId: shiftId,
      branchId: branch,
    });
    const cogs = lines.reduce((sum, l) => {
      const p = data.products.find(x => x.id === l.pid);
      return sum + l.qty * (p?.cost ?? 0);
    }, 0);
    lines.forEach(l => {
      const p = data.products.find(x => x.id === l.pid)!;
      update('products', l.pid, stockAfter(p, branch, -l.qty));
      add('stockMoves', { type: 'sale', productId: l.pid, name: l.name, delta: -l.qty, ref: invId, branch: branch });
    });
    add('journals', { date: today(), note: `فاتورة نقطة بيع (${METHODS.find(m => m.key === method)?.label})`, ref: invId, source: 'pos', lines: saleLines(net, Math.min(paidNow, net), method, cogs) });
    setCheckout(false);
    clear();
    toast(status === 'paid' ? 'تم إتمام البيع ✓' : status === 'partial' ? 'تم البيع — دفعة جزئية مسجلة ✓' : 'تم البيع آجل — مسجل على العميل ✓');
    printHTML('إيصال بيع', `
      <h1>${data.settings.companyName}</h1><div class="muted">إيصال نقطة بيع</div>
      <table><tbody>${items.map(i => `<tr><td>${i.name} ×${i.qty}</td><td>${num(i.qty * i.price)}</td></tr>`).join('')}</tbody></table>
      <div class="tot"><span>الإجمالي</span><span>${num(net)} ج.م</span></div>
      <div class="tot"><span>طريقة الدفع</span><span>${METHODS.find(m => m.key === method)?.label}</span></div>
      ${method !== 'credit' ? `<div class="tot"><span>المحصل</span><span>${num(Math.min(paidNow, net))} ج.م</span></div>
      ${change > 0 ? `<div class="tot"><span>الباقي للعميل</span><span>${num(change)} ج.م</span></div>` : ''}` : ''}
      <p class="muted">شكراً لزيارتكم 🙏</p>`);
  };

  return (
    <div className="card" style={{ alignSelf: 'start', position: 'sticky', top: 80 }}>
      <div className="card-head"><h3>سلة البيع</h3><span className="badge b-primary">{lines.length} صنف</span></div>
      <div className="card-body">
        {!shiftOpen && <div className="empty" style={{ color: 'var(--amber, #d97706)' }}>افتح وردية أولاً لتتمكن من البيع</div>}
        {!lines.length && <div className="empty">السلة فاضغة — امسح باركود أو اضغط على منتج</div>}
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
          <Button className="mt" style={{ width: '100%', justifyContent: 'center' }} disabled={!shiftOpen} onClick={() => setCheckout(true)}>إتمام البيع ✓</Button>
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
          <label className="field">طريقة الدفع</label>
          <div className="row" style={{ gap: 6 }}>
            {METHODS.map(m => (
              <button key={m.key} className={`chip ${method === m.key ? 'on' : ''}`} onClick={() => { setMethod(m.key); setCollected(''); }}>{m.label}</button>
            ))}
          </div>
          {method !== 'credit' && <>
            <label className="field">المبلغ المحصل (ج.م)</label>
            <input type="number" min={0} value={collected === '' ? net : collected} onChange={e => setCollected(e.target.value === '' ? '' : Number(e.target.value))} />
            {change > 0 && <p style={{ fontSize: 13, marginTop: 6 }}>الباقي للعميل: <b>{num(change)} ج.م</b></p>}
          </>}
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
