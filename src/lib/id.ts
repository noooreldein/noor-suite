/** Tiny collision-safe ID generator (timestamp + random suffix). */
let counter = 0;

export function uid(prefix = 'id'): string {
  counter = (counter + 1) % 10000;
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 7);
  return `${prefix}_${t}${counter.toString(36)}${r}`;
}

export function shortId(id: string): string {
  return id.slice(-6).toUpperCase();
}
