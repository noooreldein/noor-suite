import { useStore } from '../../store/AppStore';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { today } from '../../lib/dates';

export function AttendancePanel({ onMark }: { onMark: (empId: string, s: 'present' | 'absent' | 'leave') => void }) {
  const { data } = useStore();
  const attToday = data.attendance.filter(a => a.date === today());

  return (
    <div className="card">
      {data.employees.map(e => {
        const rec = attToday.find(a => a.employeeId === e.id);
        return (
          <div key={e.id} className="row" style={{ justifyContent: 'space-between', padding: '12px 18px', borderBottom: '1px solid var(--line)' }}>
            <div>
              <b style={{ fontSize: 13 }}>{e.name}</b>
              <div style={{ fontSize: 11.5, color: 'var(--soft)' }}>{e.role}</div>
            </div>
            <div className="row">
              {rec && (rec.status === 'present' ? <Badge tone="green">حاضر</Badge>
                : rec.status === 'absent' ? <Badge tone="red">غائب</Badge> : <Badge tone="amber">إجازة</Badge>)}
              <Button size="sm" variant="outline" onClick={() => onMark(e.id, 'present')}>حاضر ✓</Button>
              <Button size="sm" variant="outline" onClick={() => onMark(e.id, 'absent')}>غائب</Button>
              <Button size="sm" variant="outline" onClick={() => onMark(e.id, 'leave')}>إجازة</Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
