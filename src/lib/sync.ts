/** Device-sync conflict detection + a per-device sync log.
 * Cloud is the source of truth: when a row was edited locally and the server
 * copy changed AFTER our last local edit, another device touched it — we adopt
 * the server copy and record the conflict instead of failing silently. */
import type { DBData } from './db';

export interface SyncConflict { at: string; coll: string; id: string; localAt: string; remoteAt: string }
export interface SyncLogEntry { at: string; kind: 'conflict' | 'backup' | 'restore' | 'info'; msg: string }

const LOG_KEY = 'ns_synclog';
const TOLERANCE_MS = 5000; // ignore sub-5s clock skew between server and device

export function detectConflicts(local: Partial<DBData>, remote: Partial<DBData>, meta: Record<string, Record<string, string>>): SyncConflict[] {
  const out: SyncConflict[] = [];
  const now = new Date().toISOString();
  for (const coll of Object.keys(meta)) {
    const localRows: any[] = (local as any)[coll] ?? [];
    const remoteIds = new Set(((remote as any)[coll] ?? []).map((r: any) => r.id));
    for (const row of localRows) {
      if (!row?.id || !row.updatedAt) continue;
      const remoteAt = meta[coll][row.id];
      if (!remoteAt || !remoteIds.has(row.id)) continue;
      const dt = new Date(remoteAt).getTime() - new Date(row.updatedAt).getTime();
      if (dt > TOLERANCE_MS) out.push({ at: now, coll, id: row.id, localAt: row.updatedAt, remoteAt });
    }
  }
  return out.slice(0, 50);
}

export function logSync(entry: SyncLogEntry): void {
  try {
    const arr: SyncLogEntry[] = JSON.parse(localStorage.getItem(LOG_KEY) ?? '[]');
    arr.unshift(entry);
    localStorage.setItem(LOG_KEY, JSON.stringify(arr.slice(0, 60)));
  } catch { /* ignore */ }
}

export function readSyncLog(): SyncLogEntry[] {
  try { return JSON.parse(localStorage.getItem(LOG_KEY) ?? '[]'); } catch { return []; }
}

export function clearSyncLog(): void { localStorage.removeItem(LOG_KEY); }
