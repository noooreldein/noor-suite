import React from 'react';
import { EmptyState } from './EmptyState';

interface Props<T> {
  cols: string[];
  rows: T[];
  render: (row: T, i: number) => React.ReactNode[];
  empty?: string;
  /** Optional column widths (CSS) — enables a fixed grid so headers and cells always align.
   * Use '' for a column that should absorb the remaining width. */
  widths?: string[];
}

export function Table<T>({ cols, rows, render, empty, widths }: Props<T>) {
  if (!rows.length) return <EmptyState msg={empty} />;
  return (
    <table className={widths ? 'fixed' : undefined}>
      {widths && (
        <colgroup>
          {widths.map((w, i) => <col key={i} style={w ? { width: w } : undefined} />)}
        </colgroup>
      )}
      <thead><tr>{cols.map(c => <th key={c}>{c}</th>)}</tr></thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={(r as any).id ?? i}>
            {render(r, i).map((cell, ci) => (
              <td key={ci}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
