/** Sales return flow — restock items, log moves, negative invoice. */
import { useMemo, useState } from 'react';
import { useStore } from '../../store/AppStore';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { num } from '../../lib/format';
import { today } from '../../lib/dates';
import { returnLines } from '../../lib/accounting';

export function ReturnModal({ invoiceId, onClose }: { invoiceId: string; onClose: () => void }) {
  const { data, add, update, toast } = useStore();
  const inv = data.invoices.find((i: any) => i.id === invoiceId);
  const [qtys, setQtys] = useState<Record<string, number>>({});
  const [reason, setReason] = useState('');

  const priorReturns = useMemo(
    () => data.invoices.filter((i: any) => i.kind === 'return' && i.originalId === invoiceId),
    [data.invoices, invoiceId]
  );
  if (!inv) return null;

  const returnedQty = (pid: string) => priorReturns.reduce(
    (s: number, r: any) => s + (r.items?.find((it: any) => it.productId === pid)?.qty ?? 0), 0);
  const lines = (inv.items ?? []).map((it: any) => ({ ...it, max: Math.max(0, it.qty - returnedQty(it.productId)), q: qtys[it.productId] ?? 0 }));
  const total = lines.reduce((s: number, l: any) => s + l.q * l.price, 0);

  const submit = () => {
    const picked = lines.filter((l: any) => l.q > 0);
    if (!picked.length) return toast('حدد الكميات المرتجعة', 'err');
    const retId = add('invoices', {
      kind: 'return', originalId: invoiceId, partnerId: inv.partnerId, date: today(),
      items: picked.map((l: any) => ({ productId: l.productId, name: l.name, qty: l.q, price: l.price })),
      total: -total, status: 'returned', note: reason || 'مرتجع مبيعات',
    });
    picked.forEach((l: any) => {
      const p = data.products.find((x: any) => x.id === l.productId);
      if (p) update('products', l.productId, { stock: p.stock + l.q });
      add('stockMoves', { type: 'return', productId: l.productId, name: l.name, delta: l.q, ref: retId });
    });
    const cogs = picked.reduce((sum: number, l: any) => {
      const prod = data.products.find((x: any) => x.id === l.productId);
      return sum + l.q * (prod?.cost ?? 0);
    }, 0);
    add('journals', { date: today(), note: 'مرتجع مبيعات', ref: retId, source: 'return', lines: returnLines(total, false, cogs) });
    toast(`تم تسجيل المرتجع (${num(total)} ج.م) والكميات رجعت للمخزون ✓`);
    onClose();
  };

  return (
    <Modal title="مرتجع مبيعات" onClose={onClose} width={520}>
      <table style={{ width: '100%', fontSize: 13.5 }}>
        <thead><tr><th style={{ textAlign: 'start' }}>الصنف</th><th>سعر</th><th>متاح للإرجاع</th><th>كمية المرتجع</th></tr></thead>
        <tbody>
          {lines.map((l: any) => (
            <tr key={l.productId}>
              <td>{l.name}</td>
              <td className="mono">{num(l.price)}</td>
              <td style={{ textAlign: 'center' }}>{l.max}</td>
              <td style={{ textAlign: 'center' }}>
                <input type="number" style={{ width: 70 }} min={0} max={l.max} value={l.q}
                  disabled={l.max === 0}
                  onChange={e => setQtys(q => ({ ...q, [l.productId]: Math.min(Number(e.target.value) || 0, l.max) }))} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <label className="field">السبب (اختياري)</label>
      <input value={reason} placeholder="مثال: صنف تالف / العميل غيّر رأيه" onChange={e => setReason(e.target.value)} />
      <div className="row" style={{ justifyContent: 'space-between', marginTop: 14, fontWeight: 700 }}>
        <span>قيمة المرتجع</span><span className="mono">{num(total)} ج.م</span>
      </div>
      <div className="modal-actions">
        <Button variant="outline" onClick={onClose}>إلغاء</Button>
        <Button onClick={submit}>تسجيل المرتجع</Button>
      </div>
    </Modal>
  );
}
