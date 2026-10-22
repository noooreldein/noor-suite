import { describe, expect, it } from 'vitest';
import { toCSV } from '../csv';

describe('csv', () => {
  it('renders headers and rows', () => {
    const out = toCSV([{ name: 'ali', age: 30 }]);
    expect(out).toContain('name,age');
    expect(out).toContain('ali,30');
  });
  it('escapes quotes and commas', () => {
    const out = toCSV([{ v: 'a,b' }, { v: 'say "hi"' }]);
    expect(out).toContain('"a,b"');
    expect(out).toContain('"say ""hi"""');
  });
  it('prepends BOM for Excel Arabic support', () => {
    expect(toCSV([{ a: 1 }]).charCodeAt(0)).toBe(0xfeff);
  });
  it('returns empty for no rows', () => {
    expect(toCSV([])).toBe('');
  });
});
