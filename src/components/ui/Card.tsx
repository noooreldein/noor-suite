import React from 'react';

export function Card({ title, actions, children }: { title?: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="card">
      {title && (
        <div className="card-head">
          <h3>{title}</h3>
          {actions}
        </div>
      )}
      <div className="card-body">{children}</div>
    </div>
  );
}
