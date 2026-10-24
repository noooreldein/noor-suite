import { bstock } from '../../lib/branches';
/** Point of Sale — barcode-ready grid, cashier shifts, cart panel. */
import { useMemo, useRef, useState } from 'react';
import { useStore } from '../../store/AppStore';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { CartPanel } from './CartPanel';
import { num, initials } from '../../lib/format';
import { printHTML } from '../../lib/print';

export function PosPage() {
  const { data, settings, add, update, toast, branch } = useStore();
  const [q, setQ] = useState('');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [code, setCode] = useState('');
  const codeRef = useRef<HTMLInputElement>(null);
  const [shiftModal, setShiftModal] = useState<'open' | 'close' | null>(null);
  const [openingCash, setOpeningCash] = useState(0);
  const [countedCash, setCountedCash] = useState(0);

  const activeShift = data.shifts.find((s: any) => !s.closedAt);

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

  const todayKey = new Date().toLocaleDateString('sv');
  const todaySales = useMemo(() => data.invoices.filter(i => i.kind === 'sale' && i.date === todayKey), [data.invoices, todayKey]);
  const todayTotal = todaySales.reduce((s, i) => s + i.total, 0);
  const todayPaid = todaySales.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0);

  // barcode / SKU scan (works with keyboard-wedge USB scanners and manual entry)
  const scan = () => {
    const v = code.trim().toLowerCase();
    if (!v) return;
    const p = data.products.find(x => x.sku.toLowerCase() === v || (x.barcode ?? '').toString().toLowerCase() === v);
    setCode('');
    if (!p) return toast(`لا يوجد صنف بالكود "${v}"`, 'err');
    if (bstock(p, branch) === 0) return toast(`${p.name} نفد في الفرع الحالي`, 'err');
    addToCart(p.id);
    toast(`+1 ${p.name}`);
    codeRef.current?.focus();
  };

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
        ${top.map(([n, qy]) => `<tr><td>${n}</td><td>${qy}</td></tr>`).join('') || '<tr><td colspan="2">لا مبيعات اليوم</td></tr>'}</table>
      <p style="margin-top:36px;color:#777">التوقيع: ................</p>`);
  };

  const openShift = () => {
    add('shifts', { openedAt: new Date().toISOString(), openingCash, closedAt: null });
    setShiftModal(null);
    toast('تم فتح الوردية بنجاح ✓');
  };

  const shiftSales = useMemo(() => activeShift ? data.invoices.filter((i: any) => i.shiftId === activeShift.id) : [], [data.invoices, activeShift]);
  const shiftCash = shiftSales.filter((i: any) => (i.paymentMethod ?? 'cash') === 'cash').reduce((s: number, i: any) => s + (i.collected ?? 0), 0);
  const shiftTotal = shiftSales.reduce((s: number, i: any) => s + i.total, 0);

  const closeShift = () => {
    const expected = (activeShift?.openingCash ?? 0) + shiftCash;
    const diff = countedCash - expected;
    update('shifts', activeShift.id, {
      closedAt: new Date().toISOString(), salesCount: shiftSales.length, salesTotal: shiftTotal,
      expectedCash: expected, countedCash, diff,
    });
    setShiftModal(null);
    setCountedCash(0);
    toast(diff === 0 ? 'تم إغلاق الوردية — العدّ مطابق ✓' : `تم إغلاق الوردية — فرق ${num(diff)} ج.م`);
    printHTML('تقرير إغلاق الوردية', `
      <h2 style="margin:0">${settings.companyName}</h2>
      <div style="color:#555">إغلاق وردية — ${new Date().toLocaleString('ar-EG')}</div>
      <table>
        <tr><td>نقدية بداية الوردية</td><td><b>${num(activeShift?.openingCash ?? 0)} ج.م</b></td></tr>
        <tr><td>عدد فواتير الوردية</td><td><b>${shiftSales.length}</b></td></tr>
        <tr><td>إجمالي مبيعات الوردية</td><td><b>${num(shiftTotal)} ج.م</b></td></tr>
        <tr><td>نقدية متوقعة بالدرج</td><td><b>${num(expected)} ج.م</b></td></tr>
        <tr><td>النقدية المعدودة فعلياً</td><td><b>${num(countedCash)} ج.م</b></td></tr>
        <tr><td><b>الفرق</b></td><td><b>${num(diff)} ج.م</b></td></tr>
      </table>
      <p style="margin-top:36px;color:#777">توقيع الكاشير: ................ &nbsp;&nbsp; توقيع المسؤول: ................</p>`);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 18 }}>
      <div>
        {/* shift bar */}
        <div className="row" style={{ gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          {activeShift
            ? <>
                <Badge tone="green">وردية مفتوحة — نقدية البداية {num(activeShift.openingCash)} ج.م</Badge>
                <Badge tone="primary">فواتير الوردية: {shiftSales.length} ({num(shiftTotal)} ج.م)</Badge>
                <Button size="sm" variant="outline" onClick={() => setShiftModal('close')}>إغلاق الوردية</Button>
              </>
            : <>
                <Badge tone="amber">لا توجد وردية مفتوحة</Badge>
                <Button size="sm" onClick={() => setShiftModal('open')}>فتح وردية</Button>
              </>}
        </div>

        <div className="row" style={{ gap: 8 }}>
          <input ref={codeRef} style={{ width: 200 }} value={code} placeholder="امسح الباركود ثم Enter..."
            onChange={e => setCode(e.target.value)} onKeyDown={e => e.key === 'Enter' && scan()} autoFocus />
          <input style={{ flex: 1 }} value={q} placeholder="ابحث بالاسم أو الكود..." onChange={e => setQ(e.target.value)} />
          <button className="btn" onClick={zReport} title="تقرير إغلاق اليوم">🧾 إغلاق اليوم</button>
        </div>
        <div style={{ margin: '10px 0', fontSize: 13, color: 'var(--soft)' }}>
          مبيعات اليوم: <b style={{ color: 'var(--primary)' }}>{num(todayTotal)} ج.م</b> ({todaySales.length} فاتورة)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginTop: 6 }}>
          {products.map(p => (
            <button key={p.id} className="card" style={{ padding: 14, textAlign: 'start', border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink)' }}
              disabled={bstock(p, branch) === 0} onClick={() => addToCart(p.id)}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--primary-soft)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{initials(p.name)}</span>
                {(() => { const bs = bstock(p, branch); return bs === 0 ? <Badge tone="red">نفد في الفرع</Badge> : bs <= p.minStock ? <Badge tone="amber">{bs}</Badge> : <Badge tone="green">{bs}</Badge>; })()}
              </div>
              <div style={{ fontWeight: 600, fontSize: 13, marginTop: 8 }}>{p.name}</div>
              <div className="mono" style={{ fontSize: 12, color: 'var(--primary)' }}>{num(p.price)} ج.م</div>
            </button>
          ))}
          {!products.length && <div className="empty" style={{ gridColumn: '1/-1' }}>لا توجد نتائج</div>}
        </div>
      </div>
      <CartPanel cart={cart} setQty={setQty} clear={() => setCart({})}
        shiftOpen={!!activeShift} shiftId={activeShift?.id ?? null} />

      {shiftModal === 'open' && (
        <Modal title="فتح وردية كاشير" onClose={() => setShiftModal(null)} width={420}>
          <p style={{ color: 'var(--soft)', fontSize: 13 }}>افتح وردية قبل بدء البيع — تُسجَّل جميع فواتير نقطة البيع على الوردية.</p>
          <label className="field">النقدية في بداية الوردية (الدرج)</label>
          <input type="number" min={0} value={openingCash} onChange={e => setOpeningCash(Number(e.target.value) || 0)} />
          <div className="modal-actions">
            <Button variant="outline" onClick={() => setShiftModal(null)}>إلغاء</Button>
            <Button onClick={openShift}>فتح الوردية</Button>
          </div>
        </Modal>
      )}
      {shiftModal === 'close' && activeShift && (
        <Modal title="إغلاق الوردية" onClose={() => setShiftModal(null)} width={440}>
          <table style={{ width: '100%', fontSize: 13.5 }}>
            <tr><td>نقدية بداية الوردية</td><td><b>{num(activeShift.openingCash)} ج.م</b></td></tr>
            <tr><td>عدد الفواتير</td><td><b>{shiftSales.length}</b></td></tr>
            <tr><td>إجمالي المبيعات</td><td><b>{num(shiftTotal)} ج.م</b></td></tr>
            <tr><td><b>النقدية المتوقعة بالدرج</b></td><td><b style={{ color: 'var(--primary)' }}>{num((activeShift.openingCash ?? 0) + shiftCash)} ج.م</b></td></tr>
          </table>
          <label className="field">النقدية المعدودة فعلياً</label>
          <input type="number" min={0} value={countedCash} onChange={e => setCountedCash(Number(e.target.value) || 0)} />
          {countedCash > 0 && (
            <p style={{ fontSize: 13, marginTop: 8 }}>
              الفرق: <b style={{ color: countedCash - ((activeShift.openingCash ?? 0) + shiftCash) === 0 ? 'green' : 'var(--danger, #dc2626)' }}>
                {num(countedCash - ((activeShift.openingCash ?? 0) + shiftCash))} ج.م</b>
            </p>
          )}
          <div className="modal-actions">
            <Button variant="outline" onClick={() => setShiftModal(null)}>إلغاء</Button>
            <Button onClick={closeShift}>إغلاق + طباعة التقرير</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
