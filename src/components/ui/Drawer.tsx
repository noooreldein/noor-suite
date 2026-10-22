import React, { useEffect } from 'react';

/** Side drawer panel for quick details/preview. */
export function Drawer({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);
  return (
    <div className="overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ position: 'fixed', insetInlineStart: 0, top: 0, bottom: 0, margin: 0, maxWidth: 420, maxHeight: '100vh', borderRadius: 0 }}>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
          <h3>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, color: 'var(--soft)' }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
