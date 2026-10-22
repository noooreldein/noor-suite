/** Calendar — invoice & task deadlines in a month grid. */
import { useMemo, useState } from 'react';
import { useStore } from '../../store/AppStore';
import { Badge } from '../../components/ui/Badge';

export function CalendarPage() {
  const { data } = useStore();
  const now = new Date();
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });

  const events = useMemo(() => {
    const map = new Map<string, { label: string; kind: 'sale' | 'purchase' | 'task' }[]>();
    const push = (date: string, label: string, kind: 'sale' | 'purchase' | 'task') => {
      const list = map.get(date) ?? [];
      list.push({ label, kind });
      map.set(date, list);
    };
    data.invoices.forEach(i => push(i.date, i.kind === 'sale' ? 'فاتورة بيع' : 'فاتورة شراء', i.kind));
    data.tasks.forEach(t => push(t.due, 'مهمة: ' + t.title, 'task'));
    return map;
  }, [data.invoices, data.tasks]);

  const first = new Date(cursor.y, cursor.m, 1);
  const startDay = (first.getDay() + 1) % 7; // Saturday-first week (Arabic convention)
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const weekdays = ['سبت', 'أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة'];

  const move = (d: number) => {
    const nd = new Date(cursor.y, cursor.m + d, 1);
    setCursor({ y: nd.getFullYear(), m: nd.getMonth() });
  };

  const cells: (number | null)[] = [
    ...Array(startDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <>
      <div className="toolbar">
        <button className="btn btn-outline btn-sm" onClick={() => move(-1)}>‹ الشهر السابق</button>
        <b style={{ fontSize: 15 }}>{first.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}</b>
        <button className="btn btn-outline btn-sm" onClick={() => move(1)}>الشهر التالي ›</button>
        <div className="grow" />
        <Badge tone="green">بيع</Badge> <Badge tone="amber">شراء</Badge> <Badge tone="blue">مهمة</Badge>
      </div>
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {weekdays.map(d => <div key={d} style={{ padding: '10px 6px', textAlign: 'center', fontSize: 11.5, color: 'var(--soft)', fontWeight: 600, borderBottom: '1px solid var(--line)' }}>{d}</div>)}
          {cells.map((day, i) => {
            if (day === null) return <div key={i} style={{ minHeight: 74, background: 'var(--bg)' }} />;
            const dateStr = `${cursor.y}-${String(cursor.m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayEvents = events.get(dateStr) ?? [];
            const isToday = dateStr === new Date().toISOString().slice(0, 10);
            return (
              <div key={i} style={{ minHeight: 74, padding: 6, borderInlineStart: '1px solid var(--line)', borderTop: '1px solid var(--line)' }}>
                <div style={{ fontSize: 12, fontWeight: isToday ? 800 : 500, color: isToday ? 'var(--primary)' : 'var(--soft)' }}>{day}</div>
                {dayEvents.slice(0, 2).map((ev, j) => (
                  <div key={j} style={{ fontSize: 10.5, padding: '1px 5px', borderRadius: 5, marginTop: 3, background: ev.kind === 'sale' ? 'var(--green-soft)' : ev.kind === 'purchase' ? 'var(--amber-soft)' : 'var(--blue-soft)', color: ev.kind === 'sale' ? 'var(--green)' : ev.kind === 'purchase' ? 'var(--amber)' : 'var(--blue)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.label}</div>
                ))}
                {dayEvents.length > 2 && <div style={{ fontSize: 10, color: 'var(--soft)' }}>+{dayEvents.length - 2} أخرى</div>}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
