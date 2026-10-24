/** Branch management — add, rename, delete (never the main branch, never one holding stock). */
import { useState } from 'react';
import { useStore } from '../../store/AppStore';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { bstock, branchName } from '../../lib/branches';

export function BranchesModal({ onClose }: { onClose: () => void }) {
  const { data, add, update, remove, toast, branch, setBranch } = useStore();
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [ren, setRen] = useState('');

  const branchTotal = (bid: string) => data.products.reduce((s, p) => s + bstock(p, bid), 0);

  const create = () => {
    const n = name.trim();
    if (!n) return toast('اكتب اسم الفرع', 'err');
    if (data.branches.some(b => b.name === n)) return toast('الاسم مستخدم بالفعل', 'err');
    add('branches', { name: n, createdAt: new Date().toISOString() });
    setName('');
    toast('تم إضافة الفرع ✓');
  };

  const saveRename = () => {
    if (!editing || !ren.trim()) return setEditing(null);
    update('branches', editing, { name: ren.trim() });
    setEditing(null);
    toast('تم تحديث الاسم ✓');
  };

  const del = (id: string) => {
    if (id === 'main') return toast('الفرع الرئيسي لا يُحذف', 'err');
    if (branchTotal(id) > 0) return toast('لا يمكن حذف فرع به مخزون — حوّل الكميات أولاً', 'err');
    remove('branches', id);
    if (branch === id) setBranch('main');
    toast('تم حذف الفرع');
  };

  return (
    <Modal title="إدارة الفروع" onClose={onClose} width={560}>
      <div className="row" style={{ gap: 8 }}>
        <input placeholder="اسم الفرع الجديد (مثال: فرع الإسكندرية)" value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && create()} />
        <Button onClick={create}>+ إضافة</Button>
      </div>
      <div style={{ marginTop: 14, maxHeight: 320, overflow: 'auto' }}>
        {data.branches.map((b: any) => (
          <div key={b.id} className="row" style={{ justifyContent: 'space-between', padding: '10px 4px', borderBottom: '1px solid var(--line)', flexWrap: 'nowrap' }}>
            {editing === b.id ? (
              <>
                <input value={ren} onChange={e => setRen(e.target.value)} style={{ flex: 1 }} />
                <Button size="sm" onClick={saveRename}>حفظ</Button>
                <Button size="sm" variant="outline" onClick={() => setEditing(null)}>إلغاء</Button>
              </>
            ) : (
              <>
                <div className="row" style={{ gap: 8 }}>
                  <b>{b.name}</b>
                  {b.id === 'main' && <Badge tone="primary">رئيسي</Badge>}
                  {b.id === branch && <Badge tone="green">الحالي</Badge>}
                  <span style={{ fontSize: 11.5, color: 'var(--soft)' }}>{branchTotal(b.id)} وحدة</span>
                </div>
                <div className="row" style={{ gap: 6 }}>
                  {b.id !== branch && <Button size="sm" variant="outline" onClick={() => setBranch(b.id)}>تعيين كحالي</Button>}
                  <Button size="sm" variant="outline" onClick={() => { setEditing(b.id); setRen(b.name); }}>تعديل</Button>
                  {b.id !== 'main' && <Button size="sm" variant="danger" onClick={() => del(b.id)}>حذف</Button>}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      <p style={{ marginTop: 12, fontSize: 12, color: 'var(--soft)' }}>
        الفرع الحالي هو مكان العمل الافتراضي للبيع والاستلام والتسويات — بدّله من الشريط العلوي أو من هنا.
      </p>
    </Modal>
  );
}
