/** Supabase cloud backend — auth + per-user document rows (ns_* tables, RLS-isolated).
 * Every write is verified; failures go to a persistent retry queue flushed on reconnect. */
import { createClient } from '@supabase/supabase-js';
import type { Settings } from '../types/core';
import type { DBData } from './db';

const URL = 'https://zcsowvdfdteuiyaybnqm.supabase.co';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpjc293dmRmZHRldWl5YXlibnFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0NzQxNTQsImV4cCI6MjEwNzA1MDE1NH0.2E63rAkbY8zs8kf_5uSftUGhFzDUnlAFBwMWbnDW13Q';

export const sb = createClient(URL, ANON);

export type Mode = 'local' | 'cloud';
let mode: Mode = 'local';
export const getMode = () => mode;
export const setMode = (m: Mode) => { mode = m; };

export type Coll = 'products' | 'partners' | 'invoices' | 'leads' | 'employees' | 'attendance' | 'tasks' | 'ledger' | 'purchaseOrders' | 'notifications' | 'stockMoves' | 'shifts';
const COLLS: Coll[] = ['products', 'partners', 'invoices', 'leads', 'employees', 'attendance', 'tasks', 'ledger', 'purchaseOrders', 'notifications', 'stockMoves', 'shifts'];

export async function getSession() { return sb.auth.getSession(); }
export async function getUser() { const { data } = await sb.auth.getUser(); return data.user; }
export async function signUp(email: string, pw: string) { return sb.auth.signUp({ email, password: pw }); }
export async function signIn(email: string, pw: string) { return sb.auth.signInWithPassword({ email, password: pw }); }
export async function signOut() { return sb.auth.signOut(); }

export async function loadAll(): Promise<DBData | null> {
  const user = await getUser();
  if (!user) return null;
  const out: any = { products: [], partners: [], invoices: [], leads: [], employees: [], attendance: [], tasks: [], ledger: [], purchaseOrders: [], notifications: [], stockMoves: [], shifts: [], settings: null, meta: { version: 1 } };
  for (const c of COLLS) {
    const { data, error } = await sb.from(`ns_${c}`).select('id, data');
    if (error) throw new Error(error.message);
    out[c] = (data ?? []).map((r: any) => ({ ...r.data, id: r.id }));
  }
  const { data: st } = await sb.from('ns_settings').select('data').eq('id', 'settings').maybeSingle();
  if (st?.data) out.settings = st.data as Settings;
  return out as DBData;
}

// ---- verified writes + persistent retry queue ----
type Op = { coll: Coll; kind: 'upsert' | 'delete'; entity?: any; id?: string };
const QKEY = 'ns_retry_queue';
let queue: Op[] = [];
try { queue = JSON.parse(localStorage.getItem(QKEY) ?? '[]'); } catch { queue = []; }
const persistQueue = () => localStorage.setItem(QKEY, JSON.stringify(queue));
export function pendingCount() { return queue.length; }

async function rawUpsert(c: Coll, e: any): Promise<boolean> {
  const user = await getUser(); if (!user) return false;
  const { error } = await sb.from(`ns_${c}`).upsert({ id: e.id, user_id: user.id, data: e });
  return !error;
}
async function rawDelete(c: Coll, id: string): Promise<boolean> {
  const { error } = await sb.from(`ns_${c}`).delete().eq('id', id);
  return !error;
}

/** Upsert a row. Returns true on confirmed save; on failure the op is queued for retry. */
export async function upsert(c: Coll, e: any): Promise<boolean> {
  const ok = await rawUpsert(c, e);
  if (!ok) { queue.push({ coll: c, kind: 'upsert', entity: e }); persistQueue(); }
  return ok;
}

/** Delete a row. Returns true on confirmed delete; queued for retry on failure. */
export async function remove(c: Coll, id: string): Promise<boolean> {
  const ok = await rawDelete(c, id);
  if (!ok) { queue.push({ coll: c, kind: 'delete', id }); persistQueue(); }
  return ok;
}

export async function saveSettings(s: Settings | null): Promise<boolean> {
  const user = await getUser(); if (!user || !s) return false;
  const { error } = await sb.from('ns_settings').upsert({ id: 'settings', user_id: user.id, data: s });

  return !error;
}

/** Retry all queued ops. Returns the number still failing. */
export async function flushQueue(): Promise<number> {
  const still: Op[] = [];
  for (const op of queue) {
    const ok = op.kind === 'upsert' ? await rawUpsert(op.coll, op.entity) : await rawDelete(op.coll, op.id!);
    if (!ok) still.push(op);
  }
  queue = still;
  persistQueue();
  return still.length;
}
window.addEventListener('online', () => { flushQueue(); });
setInterval(() => { if (queue.length) flushQueue(); }, 60000);

/** Verified, sequential migration of local data. Returns per-item report. */
export async function migrateLocal(local: DBData): Promise<{ ok: number; failed: number }> {
  let ok = 0, failed = 0;
  for (const c of COLLS)
    for (const e of (local as any)[c] ?? []) (await rawUpsert(c, e)) ? ok++ : failed++;
  if (local.settings) (await saveSettings(local.settings)) ? ok++ : failed++;
  return { ok, failed };
}

/** Merge remote data with local-only entities (used after a partially failed migration). */
export function mergeLocal(local: DBData, remote: DBData): DBData {
  const out: any = { ...remote };
  for (const c of COLLS) {
    const ids = new Set(remote[c as keyof DBData] ? (remote as any)[c].map((r: any) => r.id) : []);
    const extra = ((local as any)[c] ?? []).filter((r: any) => !ids.has(r.id));
    (out as any)[c] = [...(remote as any)[c], ...extra];
  }
  out.settings = remote.settings?.companyName ? remote.settings : local.settings;
  return out as DBData;
}
