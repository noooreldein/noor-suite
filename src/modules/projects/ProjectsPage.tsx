/** Projects — Kanban task board (Trello-style, 4 stages). */
import { useState } from 'react';
import { useStore } from '../../store/AppStore';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { fmtDate } from '../../lib/dates';
import { TaskModal } from './TaskModal';
import { Task } from '../../types/entities';

export const STAGES: { key: Task['stage']; label: string; tone: 'gray' | 'blue' | 'amber' | 'green' }[] = [
  { key: 'todo', label: 'قائمة الانتظار', tone: 'gray' },
  { key: 'doing', label: 'جاري التنفيذ', tone: 'blue' },
  { key: 'review', label: 'مراجعة', tone: 'amber' },
  { key: 'done', label: 'منجز', tone: 'green' },
];

export function ProjectsPage() {
  const { data, update, remove, toast } = useStore();
  const [editing, setEditing] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const move = (id: string, dir: 1 | -1) => {
    const t = data.tasks.find(x => x.id === id)!;
    const idx = STAGES.findIndex(s => s.key === t.stage);
    const next = STAGES[Math.min(STAGES.length - 1, Math.max(0, idx + dir))];
    update('tasks', id, { stage: next.key });
  };

  return (
    <>
      <div className="toolbar">
        <span className="badge b-gray">{data.tasks.filter(t => t.stage !== 'done').length} مهمة نشطة</span>
        <div className="grow" />
        <Button onClick={() => setEditing('new')}>+ مهمة جديدة</Button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {STAGES.map(s => {
          const items = data.tasks.filter(t => t.stage === s.key);
          return (
            <div className="card" key={s.key} style={{ background: 'var(--bg)', padding: 12 }}>
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
                <b style={{ fontSize: 13 }}>{s.label}</b>
                <Badge tone={s.tone}>{items.length}</Badge>
              </div>
              {items.map(t => (
                <div key={t.id} className="card" style={{ padding: 12, marginBottom: 8 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{t.title}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--soft)', margin: '2px 0' }}>{t.assignee}</div>
                  <div className="row" style={{ justifyContent: 'space-between', margin: '6px 0' }}>
                    <Badge tone={t.priority === 'high' ? 'red' : t.priority === 'medium' ? 'amber' : 'gray'}>
                      {t.priority === 'high' ? 'عالية' : t.priority === 'medium' ? 'متوسطة' : 'منخفضة'}
                    </Badge>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--soft)' }}>{fmtDate(t.due)}</span>
                  </div>
                  <div className="row" style={{ gap: 4 }}>
                    <Button size="sm" variant="outline" onClick={() => move(t.id, -1)}>‹</Button>
                    <Button size="sm" variant="outline" onClick={() => move(t.id, 1)}>›</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditing(t.id)}>✎</Button>
                    <Button size="sm" variant="danger" onClick={() => setConfirmId(t.id)}>✕</Button>
                  </div>
                </div>
              ))}
              {!items.length && <div className="empty" style={{ padding: 14 }}>—</div>}
            </div>
          );
        })}
      </div>
      {editing && <TaskModal id={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      {confirmId && (
        <div className="overlay" onMouseDown={e => e.target === e.currentTarget && setConfirmId(null)}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <h3>حذف المهمة</h3>
            <p style={{ color: 'var(--soft)' }}>هل أنت متأكد؟</p>
            <div className="modal-actions">
              <Button variant="outline" onClick={() => setConfirmId(null)}>إلغاء</Button>
              <Button variant="danger" onClick={() => { remove('tasks', confirmId); setConfirmId(null); toast('تم الحذف'); }}>حذف</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
