import { useState } from 'react';
import { useStore } from '../../store/AppStore';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';

export function PartnerFormModal({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data, add, update, toast } = useStore();
  const p = id ? data.partners.find(x => x.id === id) : undefined;
  const [form, setForm] = useState({
    name: p?.name ?? '', type: p?.type ?? 'customer', phone: p?.phone ?? '',
    email: p?.email ?? '', address: p?.address ?? '', notes: p?.notes ?? '',
  });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const submit = () => {
    if (!form.name.trim()) return toast('الاسم مطلوب', 'err');
    id ? update('partners', id, form) : add('partners', form);
    toast('تم الحفظ ✓');
    onClose();
  };

  return (
    <Modal title={id ? 'تعديل جهة' : 'جهة جديدة'} onClose={onClose}>
      <div className="form-grid">
        <div><label className="field">الاسم</label><input value={form.name} onChange={e => set('name', e.target.value)} /></div>
        <div>
          <label className="field">النوع</label>
          <select value={form.type} onChange={e => set('type', e.target.value)}>
            <option value="customer">عميل</option>
            <option value="supplier">مورد</option>
          </select>
        </div>
        <div><label className="field">الهاتف</label><input value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
        <div><label className="field">البريد الإلكتروني</label><input value={form.email} onChange={e => set('email', e.target.value)} /></div>
        <div><label className="field">العنوان</label><input value={form.address} onChange={e => set('address', e.target.value)} /></div>
        <div><label className="field">ملاحظات</label><input value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
      </div>
      <div className="modal-actions">
        <Button variant="outline" onClick={onClose}>إلغاء</Button>
        <Button onClick={submit}>حفظ</Button>
      </div>
    </Modal>
  );
}
