/** Demo seed data — realistic Arabic business dataset. */
import * as db from '../lib/db';
import { addDays, today } from '../lib/dates';

export function seed(): db.DBData {
  const d = db.empty();
  const mk = (o: any) => ({ ...o, createdAt: new Date().toISOString() });

  d.settings = { companyName: 'مؤسسة نور التجارية', currency: 'ج.م', vatRate: 14, lang: 'ar', theme: 'light' };

  d.products = [
    { id: 'prd_1', name: 'لابتوب Dell i7', sku: 'LP-001', category: 'إلكترونيات', price: 32000, cost: 27000, stock: 12, minStock: 3, unit: 'جهاز' },
    { id: 'prd_2', name: 'شاشة Samsung 24"', sku: 'MN-024', category: 'إلكترونيات', price: 4500, cost: 3600, stock: 20, minStock: 5, unit: 'جهاز' },
    { id: 'prd_3', name: 'كيبورد ميكانيكي', sku: 'KB-100', category: 'ملحقات', price: 850, cost: 600, stock: 35, minStock: 10, unit: 'قطعة' },
    { id: 'prd_4', name: 'ماوس لاسلكي', sku: 'MS-200', category: 'ملحقات', price: 420, cost: 260, stock: 4, minStock: 10, unit: 'قطعة' },
    { id: 'prd_5', name: 'سماعة رأس Pro', sku: 'HP-300', category: 'ملحقات', price: 1250, cost: 900, stock: 18, minStock: 6, unit: 'قطعة' },
    { id: 'prd_6', name: 'هارد SSD 1TB', sku: 'SS-1TB', category: 'قطع غيار', price: 2100, cost: 1700, stock: 25, minStock: 8, unit: 'قطعة' },
    { id: 'prd_7', name: 'كبل HDMI 2م', sku: 'CB-HDMI', category: 'قطع غيار', price: 180, cost: 90, stock: 60, minStock: 20, unit: 'قطعة' },
    { id: 'prd_8', name: 'حبر طابعة HP 12A', sku: 'TN-12A', category: 'قطع غيار', price: 950, cost: 720, stock: 2, minStock: 5, unit: 'خرطوشة' },
  ].map(mk);

  d.partners = [
    { id: 'ptn_1', name: 'شركة النيل للتوريدات', type: 'supplier', phone: '01001234567', email: 'nile@supply.com', address: 'القاهرة' },
    { id: 'ptn_2', name: 'مؤسسة الدلتا', type: 'customer', phone: '01112345678', address: 'المنصورة' },
    { id: 'ptn_3', name: 'أحمد سمير', type: 'customer', phone: '01223456789', address: 'الجيزة' },
    { id: 'ptn_4', name: 'مكتبة المستقبل', type: 'customer', phone: '01098765432', address: 'الإسكندرية' },
    { id: 'ptn_5', name: 'Tech Import Co.', type: 'supplier', phone: '01276543210', address: 'بورسعيد' },
  ].map(mk);

  d.invoices = [
    { id: 'inv_1', kind: 'sale', partnerId: 'ptn_2', date: addDays(today(), -18), items: [{ productId: 'prd_1', name: 'لابتوب Dell i7', qty: 2, price: 32000 }], total: 64000, status: 'paid' },
    { id: 'inv_2', kind: 'sale', partnerId: 'ptn_3', date: addDays(today(), -12), items: [{ productId: 'prd_3', name: 'كيبورد ميكانيكي', qty: 3, price: 850 }, { productId: 'prd_4', name: 'ماوس لاسلكي', qty: 3, price: 420 }], total: 3810, status: 'paid' },
    { id: 'inv_3', kind: 'sale', partnerId: 'ptn_4', date: addDays(today(), -7), items: [{ productId: 'prd_2', name: 'شاشة Samsung 24"', qty: 4, price: 4500 }], total: 18000, status: 'unpaid' },
    { id: 'inv_4', kind: 'purchase', partnerId: 'ptn_1', date: addDays(today(), -25), items: [{ productId: 'prd_6', name: 'هارد SSD 1TB', qty: 10, price: 1700 }], total: 17000, status: 'paid' },
    { id: 'inv_5', kind: 'purchase', partnerId: 'ptn_5', date: addDays(today(), -10), items: [{ productId: 'prd_5', name: 'سماعة رأس Pro', qty: 10, price: 900 }], total: 9000, status: 'unpaid' },
  ].map(mk);

  d.leads = [
    { id: 'ld_1', name: 'م. مصطفى كامل', company: 'شركة الأفق', phone: '01011122233', stage: 'new', value: 15000 },
    { id: 'ld_2', name: 'هدى عبد الرحمن', company: 'مدرسة النور', phone: '01122233344', stage: 'contacted', value: 8000 },
    { id: 'ld_3', name: 'كريم فؤاد', company: 'مطعم الذوق', phone: '01233344455', stage: 'proposal', value: 25000 },
    { id: 'ld_4', name: 'نادية شريف', company: 'صيدلية الشفاء', phone: '01044455566', stage: 'won', value: 12000 },
    { id: 'ld_5', name: 'طارق منير', company: 'أفرول بلاي', phone: '01155566677', stage: 'lost', value: 5000 },
  ].map(mk);

  d.employees = [
    { id: 'emp_1', name: 'سارة محمود', role: 'مديرة مبيعات', department: 'المبيعات', phone: '01012345001', salary: 12000, hiredAt: '2025-03-01' },
    { id: 'emp_2', name: 'يوسف عادل', role: 'محاسب', department: 'المالية', phone: '01012345002', salary: 9000, hiredAt: '2025-06-15' },
    { id: 'emp_3', name: 'مريم خالد', role: 'مسؤول مخازن', department: 'المخازن', phone: '01012345003', salary: 7500, hiredAt: '2024-11-01' },
    { id: 'emp_4', name: 'حسن علي', role: 'مندوب مبيعات', department: 'المبيعات', phone: '01012345004', salary: 8000, hiredAt: '2026-01-10' },
  ].map(mk);

  d.tasks = [
    { id: 'tsk_1', title: 'تصميم حملة نهاية العام', assignee: 'سارة محمود', stage: 'doing', priority: 'high', due: addDays(today(), 5) },
    { id: 'tsk_2', title: 'توريد الهاردات الجديدة', assignee: 'مريم خالد', stage: 'todo', priority: 'medium', due: addDays(today(), 10) },
    { id: 'tsk_3', title: 'إقفال دفاتر الشهر', assignee: 'يوسف عادل', stage: 'review', priority: 'high', due: addDays(today(), 3) },
    { id: 'tsk_4', title: 'متابعة عملاء المنصورة', assignee: 'حسن علي', stage: 'todo', priority: 'low', due: addDays(today(), 14) },
    { id: 'tsk_5', title: 'تحديث كتالوج المنتجات', assignee: 'سارة محمود', stage: 'done', priority: 'medium', due: addDays(today(), -2) },
  ].map(mk);

  d.ledger = [
    { id: 'ldg_1', date: addDays(today(), -20), account: 'rent', debit: 8000, credit: 0, note: 'إيجار المعرض' },
    { id: 'ldg_2', date: addDays(today(), -15), account: 'salaries', debit: 36500, credit: 0, note: 'رواتب الشهر الماضي' },
    { id: 'ldg_3', date: addDays(today(), -10), account: 'utilities', debit: 2400, credit: 0, note: 'كهرباء وإنترنت' },
  ].map(mk);

  d.notifications = [
    { id: 'ntf_1', title: 'مخزون منخفض', body: 'ماوس لاسلكي وخرطونة الطابعة تحت حد الطلب', read: false, createdAt: new Date().toISOString() },
  ].map(mk);

  d.meta.seededAt = new Date().toISOString();
  return d;
}
