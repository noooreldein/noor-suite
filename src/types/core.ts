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
  | 'shifts';

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
