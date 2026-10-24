import { describe, it, expect } from 'vitest';
import { detectConflicts } from '../sync';

describe('sync conflict detection', () => {
  it('flags rows whose server copy changed after our local edit', () => {
    const local: any = { products: [{ id: 'p1', updatedAt: '2026-01-01T10:00:00Z' }, { id: 'p2', updatedAt: '2026-01-01T10:00:00Z' }] };
    const remote: any = { products: [{ id: 'p1' }, { id: 'p2' }] };
    const meta = { products: { p1: '2026-01-02T10:00:00Z', p2: '2026-01-01T10:00:02Z' } };
    const conflicts = detectConflicts(local, remote, meta);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].id).toBe('p1');
  });

  it('ignores rows without local edits or deleted on the server', () => {
    const local: any = { products: [{ id: 'p1', updatedAt: '2026-01-01T10:00:00Z' }, { id: 'gone', updatedAt: '2026-01-01T10:00:00Z' }] };
    const remote: any = { products: [{ id: 'p1' }] };
    const meta = { products: { p1: '2026-01-01T10:00:03Z', gone: '2026-01-01T12:00:00Z' } };
    expect(detectConflicts(local, remote, meta)).toHaveLength(0); // p1 within tolerance, gone deleted remotely
  });

  it('never flags pristine local rows (no updatedAt)', () => {
    const local: any = { invoices: [{ id: 'i1' }] };
    const remote: any = { invoices: [{ id: 'i1' }] };
    const meta = { invoices: { i1: '2026-01-01T10:00:00Z' } };
    expect(detectConflicts(local, remote, meta)).toHaveLength(0);
  });
});
