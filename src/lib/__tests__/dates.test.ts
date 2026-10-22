import { describe, expect, it } from 'vitest';
import { addDays, daysAgo, lastMonths, monthKey, today } from '../dates';

describe('dates', () => {
  it('adds days across month boundary', () => {
    expect(addDays('2026-01-30', 3)).toBe('2026-02-02');
  });
  it('computes days ago', () => {
    expect(daysAgo(today())).toBe(0);
    expect(daysAgo(addDays(today(), -5))).toBe(5);
  });
  it('extracts month key', () => {
    expect(monthKey('2026-10-22')).toBe('2026-10');
  });
  it('returns N sequential months', () => {
    const m = lastMonths(6);
    expect(m).toHaveLength(6);
    expect(m[5]).toBe(monthKey(today()));
  });
});
