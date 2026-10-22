/** General display formatting. */

export function num(n: number): string {
  return Number(n || 0).toLocaleString('en-US');
}

export function pct(n: number): string {
  return `${Math.round(n)}%`;
}

export function initials(name: string): string {
  const clean = name.replace(/^(د\.|Dr\.|Mr\.|Mrs\.)\s*/i, '').trim();
  return clean ? clean.charAt(0) : '?';
}

export function truncate(s: string, len = 40): string {
  return s.length > len ? s.slice(0, len) + '…' : s;
}

export function pluralAr(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}
