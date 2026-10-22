import { useState } from 'react';
import { useStore } from '../../store/AppStore';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { addDays, today } from '../../lib/dates';

export function TaskModal({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data, add, update, toast } = useStore();
  const t = id ? data.tasks.find(x => x.id === id) : undefined;
  const [form, setForm] = useState({
    title: t?.title ?? '', description: t?.description ?? '', assignee: t?.assignee ?? data.employees[0]?.name ?? '',
    stage: t?.stage ?? 'todo', priority: t?.priority ?? 'medium', due: t?.due ?? addDays(today(), 7),
  });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Modal title={id ? 'تعديل مهمة' : 'مهمة جديدة'} onClose={onClose}>
      <label className="field">العنوان</label>
      <input value={form.title} onChange={e => set('title', e.target.value)} />
      <label className="field">الوصف</label>
      <textarea rows={2} value={form.description} onChange={e => set('description', e.target.value)} />
      <div className="form-grid">
        <div>
          <label className="field">المسؤول</label>
          <select value={form.assignee} onChange={e => set('assignee', e.target.value)}>
            {data.employees.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
          </select>
        </div>
        <div>
          <label className="field">الأولوية</label>
          <select value={form.priority} onChange={e => set('priority', e.target.value)}>
            <option value="low">منخفضة</option><option value="medium">متوسطة</option><option value="high">عالية</option>
          </select>
        </div>
        <div>
          <label className="field">المرحلة</label>
          <select value={form.stage} onChange={e => set('stage', e.target.value)}>
            <option value="todo">انتظار</option><option value="doing">تنفيذ</option>
            <option value="review">مراجعة</option><option value="done">منجز</option>
          </select>
        </div>
        <div>
          <label className="field">الاستحقاق</label>
          <input type="date" value={form.due} onChange={e => set('due', e.target.value)} />
        </div>
      </div>
      <div className="modal-actions">
        <Button variant="outline" onClick={onClose}>إلغاء</Button>
        <Button onClick={() => {
          if (!form.title.trim()) return toast('العنوان مطلوب', 'err');
          id ? update('tasks', id, form) : add('tasks', form);
          toast('تم الحفظ ✓'); onClose();
        }}>حفظ</Button>
      </div>
    </Modal>
  );
}
