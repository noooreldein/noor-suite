import { useState } from 'react';
import { useStore } from '../../store/AppStore';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';

export function StockAdjustModal({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, update, toast, add } = useStore();
  const p = data.products.find(x => x.id === id)!;
  const [qty, setQty] = useState(10);

  const apply = () => {
    update('products', id, { stock: p.stock + qty });
    if (p.stock + qty <= p.minStock) {
      add('notifications', { title: 'مخزون منخفض', body: `${p.name} وصل لحد إعادة الطلب`, read: false });
    }
    toast(`تمت إضافة ${qty} للمخزون ✓`);
    onClose();
  };

  return (
    <Modal title={`إضافة مخزون — ${p.name}`} onClose={onClose} width={420}>
      <p style={{ color: 'var(--soft)', fontSize: 13 }}>المتوفر حالياً: <b>{p.stock}</b> — الحد: <b>{p.minStock}</b></p>
      <label className="field">الكمية المضافة</label>
      <input type="number" min={1} value={qty} onChange={e => setQty(Number(e.target.value) || 0)} />
      <div className="modal-actions">
        <Button variant="outline" onClick={onClose}>إلغاء</Button>
        <Button onClick={apply}>إضافة</Button>
      </div>
    </Modal>
  );
}
