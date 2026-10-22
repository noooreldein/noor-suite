/** Notification bell + dropdown feed for the topbar. */
import { useState } from 'react';
import { useStore } from '../../store/AppStore';

export function NotificationCenter() {
  const { data, update } = useStore();
  const [open, setOpen] = useState(false);
  const unread = data.notifications.filter(n => !n.read);

  return (
    <div style={{ position: 'relative' }}>
      <button className="btn btn-outline" onClick={() => setOpen(o => !o)} style={{ padding: '7px 11px' }}>
        🔔 {unread.length > 0 && <span style={{ background: 'var(--red)', color: '#fff', borderRadius: 999, fontSize: 10, padding: '1px 6', fontWeight: 700 }}>{unread.length}</span>}
      </button>
      {open && (
        <div className="card" style={{ position: 'absolute', top: 42, insetInlineEnd: 0, width: 290, zIndex: 100 }}>
          <div className="card-head"><h3>التنبيهات</h3>
            <button className="chip" onClick={() => data.notifications.forEach(n => !n.read && update('notifications', n.id, { read: true }))}>تعليم الكل كمقروء</button>
          </div>
          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
            {data.notifications.map(n => (
              <div key={n.id} style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)', background: n.read ? 'transparent' : 'var(--primary-soft)' }}>
                <b style={{ fontSize: 12.5 }}>{n.title}</b>
                <div style={{ fontSize: 12, color: 'var(--soft)' }}>{n.body}</div>
              </div>
            ))}
            {!data.notifications.length && <div className="empty">لا تنبيهات</div>}
          </div>
        </div>
      )}
    </div>
  );
}
