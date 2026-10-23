/** Partners — customers & suppliers registry. */
import { useMemo, useState } from 'react';
import { useStore } from '../../store/AppStore';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Tabs } from '../../components/ui/Tabs';
import { SearchBox } from '../../components/ui/SearchBox';
import { Table } from '../../components/ui/Table';
import { PartnerFormModal } from './PartnerFormModal';
import { Client360Modal } from './Client360Modal';

export function PartnersPage() {
  const { data, remove, toast } = useStore();
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);

  const rows = useMemo(() => data.partners.filter(p =>
    (tab === 'all' || p.type === tab) && (p.name.includes(q) || p.phone.includes(q))
  ), [data.partners, tab, q]);

  return (
    <>
      <div className="toolbar">
        <Tabs active={tab} onChange={setTab} tabs={[
          { key: 'all', label: `الكل (${data.partners.length})` },
          { key: 'customer', label: `عملاء (${data.partners.filter(p => p.type === 'customer').length})` },
          { key: 'supplier', label: `موردون (${data.partners.filter(p => p.type === 'supplier').length})` },
        ]} />
        <SearchBox value={q} onChange={setQ} placeholder="بحث بالاسم أو الهاتف..." />
        <Button onClick={() => setEditing('new')}>+ جهة جديدة</Button>
      </div>
      <div className="card">
        <Table cols={['الاسم', 'النوع', 'الهاتف', 'البريد', 'العنوان', '']} rows={rows}
          render={p => [
            <b key="n">{p.name}</b>,
            <Badge key="t" tone={p.type === 'customer' ? 'blue' : 'primary'}>{p.type === 'customer' ? 'عميل' : 'مورد'}</Badge>,
            <span key="ph" className="mono">{p.phone}</span>,
            <span key="e" style={{ color: 'var(--soft)' }}>{p.email ?? '—'}</span>,
            <span key="a" style={{ color: 'var(--soft)' }}>{p.address ?? '—'}</span>,
            <div key="x" className="row">
              <Button size="sm" variant="outline" onClick={() => setProfileId(p.id)}>ملف 360</Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(p.id)}>تعديل</Button>
              <Button size="sm" variant="danger" onClick={() => setConfirmId(p.id)}>حذف</Button>
            </div>,
          ]} />
      </div>
      {editing && <PartnerFormModal id={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      {profileId && <Client360Modal id={profileId} onClose={() => setProfileId(null)} />}
      {confirmId && (
        <div className="overlay" onMouseDown={e => e.target === e.currentTarget && setConfirmId(null)}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <h3>تأكيد الحذف</h3>
            <p style={{ color: 'var(--soft)' }}>سيتم حذف الجهة نهائياً.</p>
            <div className="modal-actions">
              <Button variant="outline" onClick={() => setConfirmId(null)}>إلغاء</Button>
              <Button variant="danger" onClick={() => { remove('partners', confirmId); setConfirmId(null); toast('تم الحذف'); }}>حذف</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
