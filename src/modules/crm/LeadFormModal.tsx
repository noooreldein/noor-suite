import { useState } from 'react';
import { useStore } from '../../store/AppStore';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';

export function LeadFormModal({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data, add, update, toast } = useStore();
  const l = id ? data.leads.find(x => x.id === id) : undefined;
  const [form, setForm] = useState({
    name: l?.name ?? '', company: l?.company ?? '', phone: l?.phone ?? '',
    stage: l?.stage ?? 'new', value: l?.value ?? 0, notes: l?.notes ?? '', nextFollowUp: l?.nextFollowUp ?? '',
  });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Modal title={id ? 'تعديل فرصة' : 'فرصة جديدة'} onClose={onClose}>
      <div className="form-grid">
        <div><label className="field">الاسم</label><input value={form.name} onChange={e => set('name', e.target.value)} /></div>
        <div><label className="field">الشركة</label><input value={form.company} onChange={e => set('company', e.target.value)} /></div>
        <div><label className="field">الهاتف</label><input value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
        <div><label className="field">القيمة (ج.م)</label><input type="number" value={form.value} onChange={e => set('value', Number(e.target.value) || 0)} /></div>
        <div>
          <label className="field">المرحلة</label>
          <select value={form.stage} onChange={e => set('stage', e.target.value)}>
            <option value="new">جديد</option><option value="contacted">تم التواصل</option>
            <option value="proposal">عرض سعر</option><option value="won">مغلقة</option><option value="lost">خسارة</option>
          </select>
        </div>
        <div><label className="field">ملاحظات</label><input value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
        <div><label className="field">متابعة تالية (تاريخ)</label><input type="date" value={form.nextFollowUp} onChange={e => set('nextFollowUp', e.target.value)} /></div>
      </div>
      <div className="modal-actions">
        <Button variant="outline" onClick={onClose}>إلغاء</Button>
        <Button onClick={() => {
          if (!form.name.trim()) return toast('الاسم مطلوب', 'err');
          const payload = { ...form, nextFollowUp: form.nextFollowUp || undefined };
          id ? update('leads', id, payload) : add('leads', payload);
          toast('تم الحفظ ✓'); onClose();
        }}>حفظ</Button>
      </div>
    </Modal>
  );
}
