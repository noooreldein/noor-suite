import { beforeEach, describe, expect, it } from 'vitest';
import { empty, importJSON, load, normalize, save } from '../db';

describe('db', () => {
  beforeEach(() => localStorage.clear());

  it('round-trips through localStorage', () => {
    const d = empty();
    d.products.push({ id: 'p1', createdAt: 'now' });
    save(d);
    expect(load().products).toHaveLength(1);
  });
  it('normalizes missing collections', () => {
    const n = normalize({ products: [{ id: 1 }] });
    expect(n.invoices).toEqual([]);
    expect(n.settings).toBeNull();
  });
  it('imports valid JSON', () => {
    const d = empty();
    d.settings = { companyName: 'x' };
    const ok = importJSON(JSON.stringify(d));
    expect(ok?.settings?.companyName).toBe('x');
  });
  it('rejects invalid JSON', () => {
    expect(importJSON('not json')).toBeNull();
    expect(importJSON('{"nope":1}')).toBeNull();
  });
});
