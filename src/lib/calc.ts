/** Financial calculations. */

export function margin(price: number, cost: number): number {
  if (!price) return 0;
  return ((price - cost) / price) * 100;
}

export function markup(price: number, cost: number): number {
  if (!cost) return 0;
  return ((price - cost) / cost) * 100;
}

export function stockTurnover(soldQty: number, avgStock: number): number {
  if (!avgStock) return 0;
  return soldQty / avgStock;
}

export function reorderQty(current: number, minStock: number, monthlyUsage: number): number {
  const target = Math.max(minStock * 2, monthlyUsage * 2);
  return Math.max(0, target - current);
}
