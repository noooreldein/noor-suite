import { describe, expect, it } from 'vitest';
import { shortId, uid } from '../id';

describe('id', () => {
  it('generates unique ids', () => {
    const ids = new Set(Array.from({ length: 500 }, () => uid('x')));
    expect(ids.size).toBe(500);
  });
  it('uses the given prefix', () => {
    expect(uid('prd')).toMatch(/^prd_/);
  });
  it('shortens ids for display', () => {
    expect(shortId('abc_123XYZ')).toBe('123XYZ');
  });
});
