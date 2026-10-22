import React from 'react';

type Tone = 'primary' | 'green' | 'red' | 'amber' | 'blue' | 'gray';

export function Badge({ tone = 'gray', children }: { tone?: Tone; children: React.ReactNode }) {
  return <span className={`badge b-${tone}`}>{children}</span>;
}
