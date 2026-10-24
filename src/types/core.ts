/** Core shared types for Noor Suite */

export type ID = string;

export interface BaseEntity {
  id: ID;
  createdAt: string;
  updatedAt?: string;
}

export type Collection =
  | 'products'
  | 'partners'
  | 'invoices'
  | 'leads'
  | 'employees'
  | 'attendance'
  | 'tasks'
  | 'ledger'
  | 'purchaseOrders'
  | 'notifications'
  | 'stockMoves'
  | 'shifts'
  | 'accounts'
  | 'journals' | 'branches';

export interface Settings {
  companyName: string;
  currency: string;
  vatRate: number;
  lang: 'ar' | 'en';
  theme: 'light' | 'dark';
  passwordHash?: string;
}

export interface Notification extends BaseEntity {
  title: string;
  body: string;
  read: boolean;
}

export type Direction = 'rtl' | 'ltr';

export interface Account {
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  parent?: string;
  isGroup?: boolean;
  opening?: number;
}

export interface JournalLine { code: string; debit: number; credit: number; }

export interface JournalEntry {
  date: string;
  note: string;
  ref?: string;
  source: 'sale' | 'purchase' | 'return' | 'pos' | 'adjust' | 'expense' | 'manual' | 'closing' | 'opening' | 'legacy';
  lines: JournalLine[];
}
