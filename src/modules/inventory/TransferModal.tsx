/** Stock transfer between branches — one atomic product update + a logged move. */
import { useState } from 'react';
import { useStore } from '../../store/AppStore';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { bstock, branchName, totalStock } from '../../lib/branches';

export function TransferModal({ onClose }: { onClose: () => void }) {
  const { data, update, add, toast, branch, setBranch, runOperation } = useStore();
  const [from, setFrom] = useState(branch);
  const [to, setTo] = useState(data.branches.find(b => b.id !== branch)?.id ?? '');
  const [pid, setPid] = useState('');
  const [qty, setQty] = useState(1);

  const avail = data.branches.filter(b => b.id !== from);
  const product = data.products.find(p => p.id === pid);
  const max = product ? bstock(product, from) : 0;

  const apply = () => {
    if (!product) return toast('اختر صنفاً', 'err');
    if (!to || to === from) return toast('اختر الفرع المستلم', 'err');
    if (qty <= 0 || qty > max) return toast(`الكمية أكبر من المتاح بفرع (${branchName(data.branches, from)}): ${max}`, 'err');
    runOperation(() => {
      const bs: Record<string, number> = { ...(product.branchStock ?? { main: product.stock }) };
    bs[from] = Math.max(0, (Number(bs[from]) || 0) - qty);
    bs[to] = (Number(bs[to]) || 0) + qty;
    const stock = Object.values(bs).reduce((a: number, v: any) => a + (Number(v) || 0), 0);
    update('products', product.id, { branchStock: bs, stock });
    add('stockMoves', { type: 'transfer', productId: product.id, name: product.name, delta: -qty,
      ref: `${branchName(data.branches, from)} ⇄ ${branchName(data.branches, to)}`, from, to });
    });
    toast(`تم تحويل ${qty} من ${product.name} إلى ${branchName(data.branches, to)} ✓`);
    onClose();
  };

  return (
    <Modal title="تحويل مخزون بين الفروع" onClose={onClose} width={520}>
      <div style={{ display: 'grid', gap: 10 }}>
        <div className="onb-row">
          <div>
            <label className="field">من فرع</label>
            <select value={from} onChange={e => { setFrom(e.target.value); setTo(data.branches.find(b => b.id !== e.target.value)?.id ?? ''); }}>
              {data.branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="field">إلى فرع</label>
            <select value={to} onChange={e => setTo(e.target.value)}>
              {avail.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="field">الصنف</label>
          <select value={pid} onChange={e => setPid(e.target.value)}>
            <option value="">— اختر صنفاً —</option>
            {data.products.map((p: any) => <option key={p.id} value={p.id}>{p.name} (متاح: {bstock(p, from)})</option>)}
          </select>
        </div>
        <div>
          <label className="field">الكمية {product ? `(الحد الأقصى ${max})` : ''}</label>
          <input type="number" min={1} max={max || undefined} value={qty} onChange={e => setQty(Number(e.target.value) || 0)} />
        </div>
        {product && <p style={{ fontSize: 12, color: 'var(--soft)' }}>إجمالي المخزون الحالي للصنف: {totalStock(product)}</p>}
        <div className="modal-actions">
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button onClick={apply}>تنفيذ التحويل</Button>
        </div>
      </div>
    </Modal>
  );
}
