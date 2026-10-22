import { useState } from 'react';
import { useStore } from '../../store/AppStore';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';

export function EmployeeFormModal({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data, add, update, toast } = useStore();
  const e = id ? data.employees.find(x => x.id === id) : undefined;
  const [form, setForm] = useState({
    name: e?.name ?? '', role: e?.role ?? '', department: e?.department ?? '',
    phone: e?.phone ?? '', salary: e?.salary ?? 0, hiredAt: e?.hiredAt ?? new Date().toISOString().slice(0, 10),
  });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Modal title={id ? 'تعديل موظف' : 'موظف جديد'} onClose={onClose}>
      <div className="form-grid">
        <div><label className="field">الاسم</label><input value={form.name} onChange={ev => set('name', ev.target.value)} /></div>
        <div><label className="field">الوظيفة</label><input value={form.role} onChange={ev => set('role', ev.target.value)} /></div>
        <div><label className="field">القسم</label><input value={form.department} onChange={ev => set('department', ev.target.value)} /></div>
        <div><label className="field">الهاتف</label><input value={form.phone} onChange={ev => set('phone', ev.target.value)} /></div>
        <div><label className="field">الراتب</label><input type="number" value={form.salary} onChange={ev => set('salary', Number(ev.target.value) || 0)} /></div>
        <div><label className="field">تاريخ التعيين</label><input type="date" value={form.hiredAt} onChange={ev => set('hiredAt', ev.target.value)} /></div>
      </div>
      <div className="modal-actions">
        <Button variant="outline" onClick={onClose}>إلغاء</Button>
        <Button onClick={() => {
          if (!form.name.trim()) return toast('الاسم مطلوب', 'err');
          id ? update('employees', id, form) : add('employees', form);
          toast('تم الحفظ ✓'); onClose();
        }}>حفظ</Button>
      </div>
    </Modal>
  );
}
