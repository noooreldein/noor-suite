import { describe, expect, it } from 'vitest';
import { fmt, sum, total, withVat } from '../money';

describe('money', () => {
  it('formats with currency suffix', () => {
    expect(fmt(1500)).toContain('1,500');
    expect(fmt(1500)).toContain('ج.م');
  });
  it('sums a list', () => {
    expect(sum([1, 2, 3])).toBe(6);
    expect(sum([])).toBe(0);
  });
  it('computes invoice totals', () => {
    expect(total([{ qty: 2, price: 50 }, { qty: 1, price: 25 }])).toBe(125);
  });
  it('adds VAT', () => {
    expect(withVat(100, 14)).toBeCloseTo(114);
    expect(withVat(100, 0)).toBe(100);
  });
});
