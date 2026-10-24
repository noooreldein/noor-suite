/** Role permissions — UI gating matrix. RLS enforces the real security server-side. */
export type Role = 'owner' | 'manager' | 'accountant' | 'cashier' | 'warehouse' | 'sales';

export const ROLE_LABEL: Record<Role, string> = {
  owner: 'المالك', manager: 'المدير', accountant: 'المحاسب',
  cashier: 'كاشير', warehouse: 'أمين المخزن', sales: 'موظف مبيعات',
};

export const ALL_ROLES: Role[] = ['owner', 'manager', 'accountant', 'cashier', 'warehouse', 'sales'];

/** Which roles can open each route. null = unrestricted (guest/local mode). */
export const NAV_ROLES: Record<string, Role[] | null> = {
  dashboard: null,
  pos: ['owner', 'manager', 'cashier', 'sales'],
  sales: ['owner', 'manager', 'accountant', 'cashier', 'sales'],
  crm: ['owner', 'manager', 'sales'],
  partners: ['owner', 'manager', 'accountant', 'cashier', 'sales'],
  inventory: ['owner', 'manager', 'warehouse', 'accountant'],
  purchaseOrders: ['owner', 'manager', 'warehouse', 'accountant'],
  purchases: ['owner', 'manager', 'warehouse', 'accountant'],
  hr: ['owner', 'manager'],
  projects: ['owner', 'manager'],
  accounting: ['owner', 'manager', 'accountant'],
  reports: ['owner', 'manager', 'accountant'],
  bi: ['owner', 'manager', 'accountant'],
  calendar: null,
  settings: ['owner', 'manager'],
  team: null,
};

/** Destructive actions require senior roles. */
export const MANAGER_UP: Role[] = ['owner', 'manager'];

export function canAccess(role: Role | null, route: string): boolean {
  if (!role) return true; // guest / local mode — everything open
  const allowed = NAV_ROLES[route];
  return !allowed || allowed.includes(role);
}

export function canDo(role: Role | null, allowed: Role[]): boolean {
  if (!role) return true;
  return allowed.includes(role);
}
