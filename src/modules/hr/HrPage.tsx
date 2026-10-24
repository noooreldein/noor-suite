/** HR — employees + attendance tracking. */
import { useMemo, useState } from 'react';
import { useStore } from '../../store/AppStore';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Tabs } from '../../components/ui/Tabs';
import { SearchBox } from '../../components/ui/SearchBox';
import { Table } from '../../components/ui/Table';
import { StatCard } from '../../components/ui/StatCard';
import { num } from '../../lib/format';
import { today } from '../../lib/dates';
import { EmployeeFormModal } from './EmployeeFormModal';
import { AttendancePanel } from './AttendancePanel';

export function HrPage() {
  const { data, remove, toast, update, add } = useStore();
  const [tab, setTab] = useState('roster');
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const rows = useMemo(() => data.employees.filter(e => e.name.includes(q) || e.role.includes(q) || e.department.includes(q)), [data.employees, q]);
  const payroll = data.employees.reduce((s, e) => s + e.salary, 0);
  const attToday = useMemo(() => data.attendance.filter(a => a.date === today()), [data.attendance]);

  const mark = (empId: string, status: 'present' | 'absent' | 'leave') => {
    const existing = attToday.find(a => a.employeeId === empId);
    if (existing) update('attendance', existing.id, { status });
    else add('attendance', { employeeId: empId, date: today(), status });
    toast('تم تسجيل الحضور ✓');
  };

  return (
    <>
      <div className="kpis">
        <StatCard label="الموظفين" value={data.employees.length} />
        <StatCard label="إجمالي الرواتب" value={num(payroll)} sub="شهرياً" tone="primary" />
        <StatCard label="حضور اليوم" value={attToday.filter(a => a.status === 'present').length} tone="green" />
      </div>

      <div className="toolbar">
        <Tabs active={tab} onChange={setTab} tabs={[
          { key: 'roster', label: 'الموظفون' },
          { key: 'attendance', label: `الحضور (${attToday.length})` },
        ]} />
        <div className="grow" />
        {tab === 'roster' && <Button onClick={() => setEditing('new')}>+ موظف جديد</Button>}
      </div>

      {tab === 'roster' && (
        <>
          <SearchBox value={q} onChange={setQ} />
          <div className="card mt">
            <Table cols={['الاسم', 'الوظيفة', 'القسم', 'الهاتف', 'الراتب', 'تعيين', '']} rows={rows}
              render={e => [
                <b key="n">{e.name}</b>,
                <span key="r">{e.role}</span>,
                <Badge key="d" tone="primary">{e.department}</Badge>,
                <span key="p" className="mono">{e.phone}</span>,
                <span key="s" className="mono">{num(e.salary)}</span>,
                <span key="h" className="mono" style={{ color: 'var(--soft)' }}>{e.hiredAt}</span>,
                <div key="a" className="row">
                  <Button size="sm" variant="outline" onClick={() => setEditing(e.id)}>تعديل</Button>
                  <Button size="sm" variant="danger" onClick={() => setConfirmId(e.id)}>حذف</Button>
                </div>,
              ]} />
          </div>
        </>
      )}

      {tab === 'attendance' && <AttendancePanel onMark={mark} />}

      {editing && <EmployeeFormModal id={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      {confirmId && (
        <div className="overlay" onMouseDown={e => e.target === e.currentTarget && setConfirmId(null)}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <h3>حذف موظف</h3>
            <p style={{ color: 'var(--soft)' }}>هل أنت متأكد؟</p>
            <div className="modal-actions">
              <Button variant="outline" onClick={() => setConfirmId(null)}>إلغاء</Button>
              <Button variant="danger" onClick={() => { remove('employees', confirmId); setConfirmId(null); toast('تم الحذف'); }}>حذف</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
