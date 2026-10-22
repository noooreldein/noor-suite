import React from 'react';
import { EmptyState } from './EmptyState';

interface Props<T> {
  cols: string[];
  rows: T[];
  render: (row: T, i: number) => React.ReactNode[];
  empty?: string;
}

export function Table<T>({ cols, rows, render, empty }: Props<T>) {
  if (!rows.length) return <EmptyState msg={empty} />;
  return (
    <table>
      <thead><tr>{cols.map(c => <th key={c}>{c}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => <tr key={(r as any).id ?? i}>{render(r, i)}</tr>)}</tbody>
    </table>
  );
}
