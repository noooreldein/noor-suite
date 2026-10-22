import { describe, expect, it } from 'vitest';
import { isPositive, isValidPhone, required } from '../validators';

describe('validators', () => {
  it('required rejects empty strings', () => {
    expect(required('hello')).toBe(true);
    expect(required('   ')).toBe(false);
    expect(required('')).toBe(false);
  });
  it('isPositive accepts only > 0', () => {
    expect(isPositive(5)).toBe(true);
    expect(isPositive(0)).toBe(false);
    expect(isPositive(-3)).toBe(false);
  });
  it('validates Egyptian-style phone numbers', () => {
    expect(isValidPhone('01012345678')).toBe(true);
    expect(isValidPhone('0101234567')).toBe(false);
    expect(isValidPhone('01a')).toBe(false);
  });
});
