import { useState } from 'react';
import { useStore } from '../../store/AppStore';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';

export function ProductFormModal({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data, add, update, toast } = useStore();
  const p = id ? data.products.find(x => x.id === id) : undefined;
  const [form, setForm] = useState({
    name: p?.name ?? '', sku: p?.sku ?? '', category: p?.category ?? '',
    price: p?.price ?? 0, cost: p?.cost ?? 0, stock: p?.stock ?? 0, minStock: p?.minStock ?? 5, unit: p?.unit ?? 'قطعة',
  });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const submit = () => {
    if (!form.name.trim()) return toast('اسم المنتج مطلوب', 'err');
    id ? update('products', id, form) : add('products', form);
    toast('تم حفظ المنتج ✓');
    onClose();
  };

  return (
    <Modal title={id ? 'تعديل منتج' : 'منتج جديد'} onClose={onClose}>
      <div className="form-grid">
        <div>
          <label className="field">الاسم</label>
          <input value={form.name} onChange={e => set('name', e.target.value)} />
        </div>
        <div>
          <label className="field">الكود SKU</label>
          <input value={form.sku} onChange={e => set('sku', e.target.value)} />
        </div>
        <div>
          <label className="field">التصنيف</label>
          <input value={form.category} onChange={e => set('category', e.target.value)} />
        </div>
        <div>
          <label className="field">الوحدة</label>
          <input value={form.unit} onChange={e => set('unit', e.target.value)} />
        </div>
        <div>
          <label className="field">سعر البيع</label>
          <input type="number" value={form.price} onChange={e => set('price', Number(e.target.value) || 0)} />
        </div>
        <div>
          <label className="field">سعر التكلفة</label>
          <input type="number" value={form.cost} onChange={e => set('cost', Number(e.target.value) || 0)} />
        </div>
        <div>
          <label className="field">المخزون</label>
          <input type="number" value={form.stock} onChange={e => set('stock', Number(e.target.value) || 0)} />
        </div>
        <div>
          <label className="field">حد إعادة الطلب</label>
          <input type="number" value={form.minStock} onChange={e => set('minStock', Number(e.target.value) || 0)} />
        </div>
      </div>
      <div className="modal-actions">
        <Button variant="outline" onClick={onClose}>إلغاء</Button>
        <Button onClick={submit}>حفظ</Button>
      </div>
    </Modal>
  );
}
