import { stockAfter } from '../../lib/branches';
/** Procurement — purchase orders + supplier price comparison. */
import { useMemo, useState } from 'react';
import { useStore } from '../../store/AppStore';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Tabs } from '../../components/ui/Tabs';
import { SearchBox } from '../../components/ui/SearchBox';
import { Table } from '../../components/ui/Table';
import { num } from '../../lib/format';
import { PurchaseOrder } from '../../types/entities';

const today = () => new Date().toISOString().slice(0, 10);
import { purchaseLines } from '../../lib/accounting';

const STATUS: Record<string, { label: string; tone: 'gray' | 'blue' | 'green' | 'red' }> = {
  draft: { label: 'مسودة', tone: 'gray' },
  ordered: { label: 'تم الطلب', tone: 'blue' },
  received: { label: 'مُستلَم ✓', tone: 'green' },
  cancelled: { label: 'ملغي', tone: 'red' },
};

export function PurchaseOrdersPage() {
  const { data, add, update, remove, toast, branch } = useStore();
  const [tab, setTab] = useState('orders');
  const [editing, setEditing] = useState<string | null>(null);
  const [cmpProduct, setCmpProduct] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const suppliers = data.partners.filter(p => p.type === 'supplier');
  const orders = [...data.purchaseOrders].sort((a, b) => (a.date < b.date ? 1 : -1));

  const receive = (po: any) => {
    const rcvId = add('invoices', {
      kind: 'purchase', partnerId: po.supplierId, date: today(),
      items: po.items.map((i: any) => ({ productId: i.productId, name: i.name, qty: i.qty, price: i.cost })),
      total: po.total, status: 'unpaid', note: `أمر شراء #${po.number}`,
    });
    po.items.forEach((it: any) => {
      const prod = data.products.find(p => p.id === it.productId);
      if (prod) update('products', it.productId, stockAfter(prod, branch, it.qty));
      add('stockMoves', { type: 'purchase', productId: it.productId, name: it.name, delta: it.qty, ref: rcvId });
    });
    add('journals', { date: today(), note: `استلام أمر شراء #${po.number}`, ref: rcvId, source: 'purchase', lines: purchaseLines(po.total, 0) });
    update('purchaseOrders', po.id, { status: 'received' });
    toast(`تم استلام أمر الشراء #${po.number} — المخزون اتحدث ✓`);
  };

  // supplier price comparison for a product (from past purchase invoices)
  const comparison = useMemo(() => {
    if (!cmpProduct) return [];
    const rows = new Map<string, { supplier: string; prices: number[]; lastDate: string; times: number }>();
    data.invoices.filter(i => i.kind === 'purchase').forEach(inv => {
      const line = inv.items?.find((it: any) => it.productId === cmpProduct);
      if (!line) return;
      const sup = data.partners.find(p => p.id === inv.partnerId);
      const name = sup?.name ?? 'مورد غير معروف';
      const r = rows.get(inv.partnerId) ?? { supplier: name, prices: [] as number[], lastDate: inv.date, times: 0 };
      r.prices.push(line.price);
      r.times++;
      if (inv.date > r.lastDate) r.lastDate = inv.date;
      rows.set(inv.partnerId, r);
    });
    const list = [...rows.values()].map(r => ({
      ...r,
      last: r.prices[r.prices.length - 1],
      avg: r.prices.reduce((s, x) => s + x, 0) / r.prices.length,
    })).sort((a, b) => a.avg - b.avg);
    return list;
  }, [cmpProduct, data.invoices, data.partners]);

  const cmpProd = data.products.find(p => p.id === cmpProduct);

  return (
    <>
      <div className="toolbar">
        <Tabs active={tab} onChange={setTab} tabs={[
          { key: 'orders', label: `طلبات الشراء (${data.purchaseOrders.length})` },
          { key: 'compare', label: 'مقارنة الموردين' },
        ]} />
        <div className="grow" />
        {tab === 'orders' && <Button onClick={() => setEditing('new')}>+ أمر شراء جديد</Button>}
      </div>

      {tab === 'orders' && (
        <div className="card">
          <Table cols={['رقم', 'المورد', 'التاريخ', 'الاستلام المتوقع', 'الإجمالي', 'الحالة', '']}
            rows={orders} empty="لا أوامر شراء بعد"
            render={po => {
              const late = po.status === 'ordered' && po.expectedDate < today();
              return [
                <b key="n" className="mono">#{po.number}</b>,
                data.partners.find(p => p.id === po.supplierId)?.name ?? '—',
                <span key="d" className="mono">{po.date}</span>,
                <span key="e" className="mono" style={late ? { color: 'var(--red)', fontWeight: 700 } : undefined}>
                  {po.expectedDate}{late ? ' ⚠' : ''}
                </span>,
                <b key="t">{num(po.total)}</b>,
                <Badge key="s" tone={STATUS[po.status].tone}>{STATUS[po.status].label}</Badge>,
                <div key="x" className="row">
                  {po.status === 'ordered' && <Button size="sm" onClick={() => receive(po)}>استلام</Button>}
                  {po.status === 'draft' && <Button size="sm" variant="outline" onClick={() => { update('purchaseOrders', po.id, { status: 'ordered' }); toast('تم إرسال الأمر للمورد'); }}>إرسال</Button>}
                  <Button size="sm" variant="outline" onClick={() => setEditing(po.id)}>تعديل</Button>
                  <Button size="sm" variant="danger" onClick={() => setConfirmId(po.id)}>حذف</Button>
                </div>,
              ];
            }} />
        </div>
      )}

      {tab === 'compare' && (
        <div className="card">
          <div className="card-head"><h3>مقارنة أسعار الموردين</h3></div>
          <div className="card-body">
            <div className="form-grid" style={{ marginBottom: 12 }}>
              <div>
                <label className="field">اختر منتج للمقارنة</label>
                <select value={cmpProduct} onChange={e => setCmpProduct(e.target.value)}>
                  <option value="">—</option>
                  {data.products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              {cmpProd && <div><label className="field">سعر التكلفة الحالي</label><b>{num(cmpProd.cost ?? cmpProd.price)}</b></div>}
            </div>
            {cmpProduct && (
              comparison.length ? (
                <Table cols={['المورد', 'آخر سعر', 'متوسط السعر', 'مرات التوريد', 'آخر توريد', '']}
                  rows={comparison}
                  render={(r, i) => [
                    <b key="s">{r.supplier}</b>,
                    <b key="l">{num(r.last)}</b>,
                    <span key="a">{num(r.avg)}</span>,
                    <span key="t">{r.times}</span>,
                    <span key="d" className="mono">{r.lastDate}</span>,
                    i === 0 ? <Badge key="b" tone="green">الأوفر ✓</Badge> : <span key="b" />,
                  ]} />
              ) : <p style={{ color: 'var(--soft)' }}>لا مشتريات سابقة لهذا المنتج بعد.</p>
            )}
          </div>
        </div>
      )}

      {editing && <POFormModal id={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}

      {confirmId && (
        <div className="overlay" onMouseDown={e => e.target === e.currentTarget && setConfirmId(null)}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <h3>تأكيد الحذف</h3>
            <p style={{ color: 'var(--soft)' }}>سيتم حذف أمر الشراء نهائياً.</p>
            <div className="modal-actions">
              <Button variant="outline" onClick={() => setConfirmId(null)}>إلغاء</Button>
              <Button variant="danger" onClick={() => { remove('purchaseOrders', confirmId); setConfirmId(null); toast('تم الحذف'); }}>حذف</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function POFormModal({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data, add, update, toast } = useStore();
  const po = id ? data.purchaseOrders.find(x => x.id === id) : undefined;
  const suppliers = data.partners.filter(p => p.type === 'supplier');
  const [supplierId, setSupplierId] = useState(po?.supplierId ?? suppliers[0]?.id ?? '');
  const [expectedDate, setExpectedDate] = useState(po?.expectedDate ?? today());
  const [notes, setNotes] = useState(po?.notes ?? '');
  const [lines, setLines] = useState<{ productId: string; qty: number; cost: number }[]>(
    (po?.items ?? []).map((i: any) => ({ productId: i.productId, qty: i.qty, cost: i.cost })) ?? []
  );
  const total = lines.reduce((s, l) => s + l.qty * l.cost, 0);

  const addLine = () => setLines(ls => [...ls, { productId: data.products[0]?.id ?? '', qty: 1, cost: data.products[0]?.cost ?? data.products[0]?.price ?? 0 }]);
  const setLine = (i: number, patch: any) => setLines(ls => ls.map((l, x) => x === i ? { ...l, ...patch } : l));

  return (
    <Modal title={id ? `تعديل أمر الشراء #${po!.number}` : 'أمر شراء جديد'} onClose={onClose} width={680}>
      <div className="form-grid" style={{ marginBottom: 10 }}>
        <div>
          <label className="field">المورد</label>
          <select value={supplierId} onChange={e => setSupplierId(e.target.value)}>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div><label className="field">الاستلام المتوقع</label><input type="date" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} /></div>
      </div>

      <div className="card-body" style={{ padding: 0, maxHeight: 240, overflow: 'auto' }}>
        <table className="tbl">
          <thead><tr><th>المنتج</th><th>الكمية</th><th>سعر التكلفة</th><th>الإجمالي</th><th></th></tr></thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i}>
                <td>
                  <select value={l.productId} onChange={e => {
                    const p = data.products.find(x => x.id === e.target.value);
                    setLine(i, { productId: e.target.value, cost: p?.cost ?? p?.price ?? 0 });
                  }}>
                    {data.products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </td>
                <td><input type="number" min={1} value={l.qty} style={{ width: 70 }} onChange={e => setLine(i, { qty: Number(e.target.value) || 0 })} /></td>
                <td><input type="number" value={l.cost} style={{ width: 90 }} onChange={e => setLine(i, { cost: Number(e.target.value) || 0 })} /></td>
                <td><b>{num(l.qty * l.cost)}</b></td>
                <td><Button size="sm" variant="danger" onClick={() => setLines(ls => ls.filter((_, x) => x !== i))}>✕</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="row" style={{ justifyContent: 'space-between', margin: '10px 0' }}>
        <Button size="sm" variant="outline" onClick={addLine}>+ صنف</Button>
        <b>الإجمالي: {num(total)}</b>
      </div>
      <div style={{ marginBottom: 10 }}><label className="field">ملاحظات</label><input value={notes} onChange={e => setNotes(e.target.value)} /></div>

      <div className="modal-actions">
        <Button variant="outline" onClick={onClose}>إلغاء</Button>
        <Button onClick={() => {
          if (!supplierId) return toast('اختر المورد أولاً', 'err');
          if (!lines.length) return toast('أضف صنفاً واحداً على الأقل', 'err');
          const items = lines.map(l => ({
            productId: l.productId,
            name: data.products.find(p => p.id === l.productId)?.name ?? '',
            qty: l.qty, cost: l.cost,
          }));
          const payload = {
            number: po?.number ?? `PO-${Date.now().toString(36).slice(-4).toUpperCase()}`,
            supplierId, date: po?.date ?? today(), expectedDate, status: po?.status ?? 'ordered',
            items, total, notes,
          };
          id ? update('purchaseOrders', id, payload) : add('purchaseOrders', payload);
          toast('تم حفظ أمر الشراء ✓'); onClose();
        }}>حفظ</Button>
      </div>
    </Modal>
  );
}
