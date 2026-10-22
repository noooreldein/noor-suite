/** CRM — sales pipeline board (inspired by Odoo CRM). */
import { useMemo, useState } from 'react';
import { useStore } from '../../store/AppStore';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { StatCard } from '../../components/ui/StatCard';
import { num } from '../../lib/format';
import { LeadFormModal } from './LeadFormModal';
import { Lead } from '../../types/entities';

const STAGES: { key: Lead['stage']; label: string; tone: 'gray' | 'blue' | 'amber' | 'green' | 'red' }[] = [
  { key: 'new', label: 'جديد', tone: 'gray' },
  { key: 'contacted', label: 'تم التواصل', tone: 'blue' },
  { key: 'proposal', label: 'عرض سعر', tone: 'amber' },
  { key: 'won', label: 'مغلومة ✓', tone: 'green' },
  { key: 'lost', label: 'خسارة', tone: 'red' },
];

export function CrmPage() {
  const { data, update, remove, toast } = useStore();
  const [editing, setEditing] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const pipelineValue = data.leads.filter(l => !['won', 'lost'].includes(l.stage)).reduce((s, l) => s + l.value, 0);
  const won = data.leads.filter(l => l.stage === 'won');

  const move = (id: string, dir: 1 | -1) => {
    const lead = data.leads.find(l => l.id === id)!;
    const idx = STAGES.findIndex(s => s.key === lead.stage);
    const next = STAGES[Math.min(STAGES.length - 1, Math.max(0, idx + dir))];
    update('leads', id, { stage: next.key });
  };

  return (
    <>
      <div className="kpis">
        <StatCard label="قيمة الفرص المفتوحة" value={num(pipelineValue)} tone="primary" />
        <StatCard label="فرص مغلومة" value={won.length} tone="green" />
        <StatCard label="نسبة الإغلاق" value={`${data.leads.length ? Math.round(won.length / data.leads.length * 100) : 0}%`} />
      </div>

      <div className="toolbar">
        <span className="badge b-gray">اسحب الفرصة بمراحل الخط من الأزرار</span>
        <div className="grow" />
        <Button onClick={() => setEditing('new')}>+ فرصة جديدة</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
        {STAGES.map(s => {
          const items = useMemo(() => data.leads.filter(l => l.stage === s.key), [data.leads, s.key]);
          return (
            <div className="card" key={s.key} style={{ background: 'var(--bg)', padding: 12 }}>
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
                <b style={{ fontSize: 13 }}>{s.label}</b>
                <Badge tone={s.tone}>{items.length}</Badge>
              </div>
              {items.map(l => (
                <div key={l.id} className="card" style={{ padding: 12, marginBottom: 8 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{l.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--soft)' }}>{l.company ?? '—'}</div>
                  <div className="mono" style={{ fontSize: 12, color: 'var(--primary)', margin: '4px 0' }}>{num(l.value)} ج.م</div>
                  <div className="row" style={{ gap: 4 }}>
                    <Button size="sm" variant="outline" onClick={() => move(l.id, -1)}>‹</Button>
                    <Button size="sm" variant="outline" onClick={() => move(l.id, 1)}>›</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditing(l.id)}>✎</Button>
                    <Button size="sm" variant="danger" onClick={() => setConfirmId(l.id)}>✕</Button>
                  </div>
                </div>
              ))}
              {!items.length && <div className="empty" style={{ padding: 14 }}>—</div>}
            </div>
          );
        })}
      </div>
      {editing && <LeadFormModal id={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      {confirmId && (
        <div className="overlay" onMouseDown={e => e.target === e.currentTarget && setConfirmId(null)}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <h3>حذف الفرصة</h3>
            <p style={{ color: 'var(--soft)' }}>هل أنت متأكد؟</p>
            <div className="modal-actions">
              <Button variant="outline" onClick={() => setConfirmId(null)}>إلغاء</Button>
              <Button variant="danger" onClick={() => { remove('leads', confirmId); setConfirmId(null); toast('تم الحذف'); }}>حذف</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
