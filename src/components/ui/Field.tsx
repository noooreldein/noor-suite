import React from 'react';

/** Labeled form field wrapper. */
export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="field">{label}</label>
      {children}
      {hint && <div style={{ fontSize: 11, color: 'var(--soft)', marginTop: 3 }}>{hint}</div>}
    </div>
  );
}
