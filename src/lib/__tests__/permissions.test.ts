import { describe, it, expect } from 'vitest';
import { canAccess, canDo, MANAGER_UP } from '../permissions';

describe('role-based access', () => {
  it('guests (no role) can access everything', () => {
    expect(canAccess(null, 'accounting')).toBe(true);
    expect(canAccess(null, 'hr')).toBe(true);
    expect(canDo(null, MANAGER_UP)).toBe(true);
  });

  it('cashier sees POS and sales but not accounting/HR/settings', () => {
    expect(canAccess('cashier', 'pos')).toBe(true);
    expect(canAccess('cashier', 'sales')).toBe(true);
    expect(canAccess('cashier', 'accounting')).toBe(false);
    expect(canAccess('cashier', 'hr')).toBe(false);
    expect(canAccess('cashier', 'settings')).toBe(false);
  });

  it('accountant reaches accounting but not POS/HR', () => {
    expect(canAccess('accountant', 'accounting')).toBe(true);
    expect(canAccess('accountant', 'pos')).toBe(false);
    expect(canAccess('accountant', 'hr')).toBe(false);
  });

  it('warehouse owns inventory but not sales or accounting', () => {
    expect(canAccess('warehouse', 'inventory')).toBe(true);
    expect(canAccess('warehouse', 'purchaseOrders')).toBe(true);
    expect(canAccess('warehouse', 'pos')).toBe(false);
    expect(canAccess('warehouse', 'accounting')).toBe(false);
  });

  it('owner and manager can access everything', () => {
    for (const r of ['owner', 'manager'] as const) {
      expect(canAccess(r, 'accounting')).toBe(true);
      expect(canAccess(r, 'pos')).toBe(true);
      expect(canAccess(r, 'hr')).toBe(true);
      expect(canDo(r, MANAGER_UP)).toBe(true);
    }
  });

  it('sales staff see CRM but not inventory management', () => {
    expect(canAccess('sales', 'crm')).toBe(true);
    expect(canAccess('sales', 'sales')).toBe(true);
    expect(canAccess('sales', 'inventory')).toBe(false);
  });
});
