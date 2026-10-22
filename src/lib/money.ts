/** Money formatting & arithmetic helpers. */

export function fmt(n: number, currency = 'ج.م'): string {
  const rounded = Math.round(n * 100) / 100;
  return `${rounded.toLocaleString('en-US')} ${currency}`;
}

export function fmtCompact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}

export function sum(numbers: number[]): number {
  return numbers.reduce((a, b) => a + b, 0);
}

export function total(items: { qty: number; price: number }[]): number {
  return items.reduce((s, i) => s + i.qty * i.price, 0);
}

export function withVat(amount: number, vatRate: number): number {
  return Math.round(amount * (1 + vatRate / 100) * 100) / 100;
}
