import { describe, it, expect } from 'vitest';
import { bstock, totalStock, stockAfter, MAIN_BRANCH } from '../branches';
import { normalize } from '../db';

describe('branch stock helpers', () => {
  it('falls back to flat stock on the main branch (pre-migration products)', () => {
    expect(bstock({ stock: 7 }, MAIN_BRANCH)).toBe(7);
    expect(bstock({ stock: 7 }, 'b2')).toBe(0);
  });

  it('reads per-branch quantities', () => {
    const p = { stock: 12, branchStock: { main: 8, b2: 4 } };
    expect(bstock(p, 'main')).toBe(8);
    expect(bstock(p, 'b2')).toBe(4);
    expect(totalStock(p)).toBe(12);
  });

  it('stockAfter applies a delta and resyncs the total', () => {
    const p = { stock: 12, branchStock: { main: 8, b2: 4 } };
    const patch = stockAfter(p, 'main', -3);
    expect(patch.branchStock).toEqual({ main: 5, b2: 4 });
    expect(patch.stock).toBe(9);
  });

  it('stockAfter never goes below zero', () => {
    expect(stockAfter({ stock: 1, branchStock: { main: 1 } }, 'main', -5).branchStock.main).toBe(0);
  });
});

describe('branch migration', () => {
  it('normalize seeds the main branch and migrates products', () => {
    const out = normalize({ settings: null, products: [{ id: 'p1', name: 'x', stock: 9 }], branches: [] } as any);
    expect(out.branches[0].id).toBe('main');
    expect((out.products[0] as any).branchStock).toEqual({ main: 9 });
  });
});
