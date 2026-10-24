/**
 * Local database engine — localStorage-backed persistence layer.
 * Inspired by the collection pattern used by Odoo/ERPNext models:
 * every entity is a "collection" with CRUD + query helpers.
 */
import { Collection } from '../types/core';
import { DEFAULT_COA, migrateLegacyLedger } from './accounting';

export interface DBData {
  products: any[];
  partners: any[];
  invoices: any[];
  leads: any[];
  employees: any[];
  attendance: any[];
  tasks: any[];
  ledger: any[];
  purchaseOrders: any[];
  notifications: any[];
  stockMoves: any[];
  shifts: any[];
  accounts: any[];
  journals: any[];
  settings: any;
  meta: { version: number; seededAt?: string; legacyMigrated?: boolean };
}

const KEY = 'noor-suite-db-v1';

export function load(): DBData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return normalize(JSON.parse(raw));
  } catch { /* corrupted storage -> reseed */ }
  return empty();
}

export function save(data: DBData): void {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function reset(): DBData {
  localStorage.removeItem(KEY);
  return empty();
}

export function importJSON(text: string): DBData | null {
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || !('products' in parsed)) return null;
    return normalize(parsed);
  } catch {
    return null;
  }
}

export function empty(): DBData {
  return {
    products: [], partners: [], invoices: [], leads: [], employees: [],
    attendance: [], tasks: [], ledger: [], purchaseOrders: [], notifications: [], stockMoves: [], shifts: [],
    accounts: DEFAULT_COA.map(a => ({ ...a, createdAt: new Date().toISOString() })),
    journals: [],
    settings: null,
    meta: { version: 2 },
  };
}

export function normalize(data: any): DBData {
  const base = empty();
  const out: DBData = { ...base, ...data, meta: { ...base.meta, ...(data.meta || {}) } };
  (Object.keys(base).filter(k => k !== 'settings' && k !== 'meta') as Collection[]).forEach(k => {
    if (!Array.isArray((out as any)[k])) (out as any)[k] = [];
  });
  if (typeof out.settings !== 'object' || out.settings === null) out.settings = null;
  // ensure a chart of accounts always exists (structural data, not mock data)
  if (!out.accounts.length) {
    out.accounts = DEFAULT_COA.map(a => ({ ...a, id: a.id, createdAt: new Date().toISOString() }));
  }
  // one-time migration: legacy single-sided ledger -> balanced journal entries
  if (out.ledger.length && !out.meta.legacyMigrated) {
    out.journals = [...migrateLegacyLedger(out.ledger), ...out.journals];
    out.meta.legacyMigrated = true;
  }
  return out;
}
