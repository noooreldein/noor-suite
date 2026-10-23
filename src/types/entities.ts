import { BaseEntity } from './core';

/* ===== Inventory ===== */
export interface Product extends BaseEntity {
  name: string;
  sku: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  unit: string;
}

/* ===== Partners (customers + suppliers) ===== */
export type PartnerType = 'customer' | 'supplier';
export interface Partner extends BaseEntity {
  name: string;
  type: PartnerType;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
}

/* ===== Invoices (sales + purchases) ===== */
export type InvoiceKind = 'sale' | 'purchase';
export type InvoiceStatus = 'paid' | 'unpaid' | 'partial';
export interface InvoiceItem {
  productId: string;
  name: string;
  qty: number;
  price: number;
}
export interface Invoice extends BaseEntity {
  kind: InvoiceKind;
  partnerId: string;
  date: string;
  items: InvoiceItem[];
  total: number;
  status: InvoiceStatus;
  note?: string;
}

/* ===== CRM ===== */
export type LeadStage = 'new' | 'contacted' | 'proposal' | 'won' | 'lost';
export interface Lead extends BaseEntity {
  name: string;
  company?: string;
  phone: string;
  stage: LeadStage;
  value: number;
  notes?: string;
  nextFollowUp?: string;
  lastContact?: string;
}

/* ===== HR ===== */
export interface Employee extends BaseEntity {
  name: string;
  role: string;
  department: string;
  phone: string;
  salary: number;
  hiredAt: string;
}
export type AttendanceStatus = 'present' | 'absent' | 'leave';
export interface AttendanceRecord extends BaseEntity {
  employeeId: string;
  date: string;
  status: AttendanceStatus;
}

/* ===== Projects ===== */
export type TaskStage = 'todo' | 'doing' | 'review' | 'done';
export type Priority = 'low' | 'medium' | 'high';
export interface Task extends BaseEntity {
  title: string;
  description?: string;
  assignee: string;
  stage: TaskStage;
  priority: Priority;
  due: string;
}

/* ===== Accounting ===== */
export type AccountKind = 'sales' | 'purchases' | 'salaries' | 'rent' | 'utilities' | 'other';
export interface LedgerEntry extends BaseEntity {
  date: string;
  account: AccountKind;
  debit: number;
  credit: number;
  note: string;
}

/* ===== Procurement ===== */
export type POStatus = 'draft' | 'ordered' | 'received' | 'cancelled';
export interface PurchaseOrderItem {
  productId: string;
  name: string;
  qty: number;
  cost: number;
}
export interface PurchaseOrder extends BaseEntity {
  number: string;
  supplierId: string;
  date: string;
  expectedDate: string;
  status: POStatus;
  items: PurchaseOrderItem[];
  total: number;
  notes?: string;
}
