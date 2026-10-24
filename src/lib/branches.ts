/** Branch (stock location) helpers — single source of truth is product.branchStock.
 * product.stock stays synced as the TOTAL across branches for reports/BI. */
export const MAIN_BRANCH = 'main';

export function bstock(p: any, branchId: string): number {
  if (!p?.branchStock || typeof p.branchStock !== 'object') {
    return branchId === MAIN_BRANCH ? (Number(p?.stock) || 0) : 0;
  }
  return Number(p.branchStock[branchId]) || 0;
}

export function totalStock(p: any): number {
  if (!p?.branchStock || typeof p.branchStock !== 'object') return Number(p?.stock) || 0;
  return Object.values(p.branchStock).reduce((a: number, v: any) => a + (Number(v) || 0), 0);
}

/** Full patch for update(): per-branch delta + resynced total. */
export function stockAfter(p: any, branchId: string, delta: number) {
  const bs: Record<string, number> = { ...(p?.branchStock ?? ((Number(p?.stock) || 0) ? { [MAIN_BRANCH]: Number(p.stock) || 0 } : {})) };
  bs[branchId] = Math.max(0, (Number(bs[branchId]) || 0) + delta);
  const stock = Object.values(bs).reduce((a: number, v: any) => a + (Number(v) || 0), 0);
  return { branchStock: bs, stock };
}

export function branchName(branches: any[], id: string): string {
  return branches.find(b => b.id === id)?.name ?? 'الفرع الرئيسي';
}

/** Per-branch difference between two product states — the atomic-op payload.
 * Returns [{ b: branchId, d: delta }] excluding zero deltas. */
export function branchDeltas(prev: any, next: any): { p: string; b: string; d: number }[] {
  const a = prev?.branchStock ?? (prev?.stock != null ? { [MAIN_BRANCH]: Number(prev.stock) || 0 } : {});
  const b = next?.branchStock ?? {};
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].map(k => ({ p: prev?.id ?? next?.id, b: k, d: (Number(b[k]) || 0) - (Number(a[k]) || 0) })).filter(x => x.d !== 0);
}
