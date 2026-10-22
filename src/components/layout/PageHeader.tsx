import React from 'react';

export function PageHeader({ title, sub, actions }: { title: string; sub?: string; actions?: React.ReactNode }) {
  return (
    <div className="toolbar">
      <div>
        <h1 style={{ fontSize: 17 }}>{title}</h1>
        {sub && <div style={{ color: 'var(--soft)', fontSize: 12.5 }}>{sub}</div>}
      </div>
      <div className="grow" />
      {actions}
    </div>
  );
}
