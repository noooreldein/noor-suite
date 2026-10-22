/** Business selectors — derived metrics from the DB (Odoo-style "computed fields"). */
import { DBData } from '../lib/db';
import { today, daysAgo } from '../lib/dates';

export const salesOf = (d: DBData) => d.invoices.filter(i => i.kind === 'sale');
export const purchasesOf = (d: DBData) => d.invoices.filter(i => i.kind === 'purchase');

export function revenue(d: DBData): number {
  return salesOf(d).reduce((s, i) => s + i.total, 0);
}

export function cogs(d: DBData): number {
  // cost of goods sold: sold qty × product cost
  const costs = new Map(d.products.map(p => [p.id, p.cost]));
  return salesOf(d).reduce((s, inv) =>
    s + inv.items.reduce((x: number, it: any) => x + it.qty * (costs.get(it.productId) ?? it.price * 0.8), 0), 0);
}

export function grossProfit(d: DBData): number {
  return revenue(d) - cogs(d);
}

export function inventoryValue(d: DBData): number {
  return d.products.reduce((s, p) => s + p.stock * p.cost, 0);
}

export function lowStock(d: DBData) {
  return d.products.filter(p => p.stock <= p.minStock);
}

export function overdueInvoices(d: DBData) {
  return d.invoices.filter(i => i.status === 'unpaid' && daysAgo(i.date) > 30);
}

export function activeLeads(d: DBData) {
  return d.leads.filter(l => !['won', 'lost'].includes(l.stage));
}

export function payroll(d: DBData): number {
  return d.employees.reduce((s, e) => s + e.salary, 0);
}

export function todaySalesCount(d: DBData): number {
  return salesOf(d).filter(i => i.date === today()).length;
}
