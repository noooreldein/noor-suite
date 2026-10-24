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

export type Coll = 'products' | 'partners' | 'invoices' | 'leads' | 'employees' | 'attendance' | 'tasks' | 'ledger' | 'purchaseOrders' | 'notifications' | 'stockMoves' | 'shifts' | 'accounts' | 'journals' | 'branches';
const COLLS: Coll[] = ['products', 'partners', 'invoices', 'leads', 'employees', 'attendance', 'tasks', 'ledger', 'purchaseOrders', 'notifications', 'stockMoves', 'shifts', 'accounts', 'journals', 'branches'];

export type Role = 'owner' | 'manager' | 'accountant' | 'cashier' | 'warehouse' | 'sales';
export interface OrgInfo { id: string; name: string; role: Role; }

let activeOrg: string | null = null;
export const setActiveOrg = (id: string | null) => { activeOrg = id; };
export const getActiveOrg = () => activeOrg;

/** Physical table name for a collection — camelCase collections map to
 * snake_case tables (purchaseOrders -> ns_purchase_orders, stockMoves ->
 * ns_stock_moves). The previous 1:1 join 404'd for both collections,
 * silently breaking every cloud load. */
const tbl = (c: Coll) => 'ns_' + c.replace(/([A-Z])/g, '_$1').toLowerCase();

export async function getSession() { return sb.auth.getSession(); }
export async function getUser() { const { data } = await sb.auth.getUser(); return data.user; }
export async function signUp(email: string, pw: string) { return sb.auth.signUp({ email, password: pw }); }
export async function signIn(email: string, pw: string) { return sb.auth.signInWithPassword({ email, password: pw }); }
export async function signOut() { return sb.auth.signOut(); }

export async function loadAll(): Promise<DBData | null> {
  const user = await getUser();
  if (!user) return null;
  const out: any = { products: [], partners: [], invoices: [], leads: [], employees: [], attendance: [], tasks: [], ledger: [], purchaseOrders: [], notifications: [], stockMoves: [], shifts: [], accounts: [], journals: [], settings: null, meta: { version: 2 } };
  for (const c of COLLS) {
    const { data, error } = await sb.from(tbl(c)).select('id, data, org_id, updated_at');
    if (error) throw new Error(error.message);
    out[c] = (data ?? []).map((r: any) => ({ ...r.data, id: r.id, orgId: r.org_id ?? null }));
      lastMeta[c] = Object.fromEntries((data ?? []).map((r: any) => [r.id, r.updated_at]));
  }
  const { data: st } = await sb.from('ns_settings').select('data').eq('id', `settings_${user.id}`).maybeSingle();
  if (!st?.data) {
    // legacy global row (only readable by whoever owns it)
    const { data: old } = await sb.from('ns_settings').select('data').eq('id', 'settings').maybeSingle();
    if (old?.data) {
      out.settings = old.data as Settings;
      await saveSettings(old.data as Settings); // re-key it to this user
    }
  } else out.settings = st.data as Settings;
  return out as DBData;
}

// ---- verified writes + persistent retry queue ----
type Op = { coll: Coll; kind: 'upsert' | 'delete' | 'op'; entity?: any; id?: string };

export interface Operation {
  orgId: string | null;
  upserts: { c: Coll; e: any }[];
  deltas: { p: string; b: string; d: number }[];
  deletes: { c: Coll; id: string }[];
}
const QKEY = 'ns_retry_queue';
let queue: Op[] = [];
try { queue = JSON.parse(localStorage.getItem(QKEY) ?? '[]'); } catch { queue = []; }
const persistQueue = () => localStorage.setItem(QKEY, JSON.stringify(queue));
export function pendingCount() { return queue.length; }

/** Atomic composite operation — applies stock deltas with row locks and row
 * upserts/deletes in ONE database transaction (no lost updates, no partial
 * sales). Falls back to the retry queue like any other write. */
export async function rawApplyOp(op: Operation): Promise<boolean> {
  const user = await getUser(); if (!user) return false;
  const { error } = await sb.rpc('ns_apply_op', { p_op: {
    orgId: op.orgId ?? activeOrg,
    upserts: op.upserts.map(u => ({ t: tbl(u.c), e: u.e })),
    deltas: op.deltas,
    deletes: op.deletes.map(d => ({ t: tbl(d.c), id: d.id })),
  } });
  return !error;
}

export async function applyOperation(op: Operation): Promise<boolean> {
  const ok = await rawApplyOp(op);
  if (!ok) { queue.push({ coll: 'invoices', kind: 'op', entity: op }); persistQueue(); }
  return ok;
}

async function rawUpsert(c: Coll, e: any): Promise<boolean> {
  const user = await getUser(); if (!user) return false;
  const { error } = await sb.from(tbl(c)).upsert({ id: e.id, user_id: user.id, org_id: activeOrg, data: e });
  return !error;
}
async function rawDelete(c: Coll, id: string): Promise<boolean> {
  const { error } = await sb.from(tbl(c)).delete().eq('id', id);
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

/** Settings rows are keyed per user (settings_<uid>) — the old global
 * 'settings' id made every second user's upsert collide with the first
 * owner's row and fail RLS. loadSettings falls back to the legacy row. */
export async function saveSettings(s: Settings | null): Promise<boolean> {
  const user = await getUser(); if (!user || !s) return false;
  const { error } = await sb.from('ns_settings').upsert({ id: `settings_${user.id}`, user_id: user.id, data: s });
  return !error;
}

// ===== cloud backups (ns_backups) =====
const BK_MAX = 7;

/** Create a cloud snapshot for the active org/user; keeps the last BK_MAX. */
export async function createBackup(payload: string): Promise<boolean> {
  const user = await getUser(); if (!user) return false;
  const { error } = await sb.from('ns_backups').insert({
    id: 'bk_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    org_id: activeOrg, user_id: user.id,
    data: JSON.parse(payload), size: payload.length,
  });
  if (error) return false;
  // trim old snapshots beyond BK_MAX
  const { data: all } = await sb.from('ns_backups').select('id').order('created_at', { ascending: false }).limit(BK_MAX + 5);
  if (all && all.length > BK_MAX) {
    const extra = all.slice(BK_MAX).map((r: any) => r.id);
    await sb.from('ns_backups').delete().in('id', extra);
  }
  return true;
}

export interface BackupMeta { id: string; created_at: string; size: number }

export async function listBackups(): Promise<BackupMeta[]> {
  const { data } = await sb.from('ns_backups').select('id, size, created_at').order('created_at', { ascending: false }).limit(20);
  return (data ?? []) as BackupMeta[];
}

export async function fetchBackup(id: string): Promise<any | null> {
  const { data } = await sb.from('ns_backups').select('data').eq('id', id).maybeSingle();
  return data;
}

export async function deleteBackup(id: string): Promise<boolean> {
  const { error } = await sb.from('ns_backups').delete().eq('id', id);
  return !error;
}

export async function latestBackupAt(): Promise<{ created_at: string; size: number } | null> {
  const { data } = await sb.from('ns_backups').select('created_at, size').order('created_at', { ascending: false }).limit(1).maybeSingle();
  return data ?? null;
}

// ===== per-row remote updated_at, captured on each loadAll (conflict detection) =====
let lastMeta: Record<string, Record<string, string>> = {};
export const getLoadMeta = () => lastMeta;

/** Retry all queued ops. Returns the number still failing. */
export async function flushQueue(): Promise<number> {
  const still: Op[] = [];
  for (const op of queue) {
    const ok = op.kind === 'upsert' ? await rawUpsert(op.coll, op.entity)
      : op.kind === 'op' ? await rawApplyOp(op.entity as Operation)
      : await rawDelete(op.coll, op.id!);
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


// ---- organizations & roles ----

export async function loadOrgs(): Promise<OrgInfo[]> {
  const user = await getUser(); if (!user) return [];
  // RLS lets us see ALL members of our orgs — keep only OUR OWN memberships,
  // otherwise the first member's role (the owner) leaks as yours.
  const { data: all, error } = await sb.from('ns_members').select('id, org_id, role, user_id');
  const memberships = (all ?? []).filter((m: any) => m.user_id === user.id);
  if (error || !memberships.length) return [];
  const ids = memberships.map((m: any) => m.org_id);
  const { data: orgs } = await sb.from('ns_orgs').select('id, name').in('id', ids);
  return (orgs ?? []).map((o: any) => ({
    id: o.id,
    name: o.name,
    role: (memberships.find((m: any) => m.org_id === o.id)?.role ?? 'sales') as Role,
  }));
}

/** Personal org bootstrap — every cloud user gets one automatically. */
export async function ensureOrg(preferredName: string): Promise<OrgInfo | null> {
  const user = await getUser(); if (!user) return null;
  const orgs = await loadOrgs();
  if (orgs.length) return orgs[0];
  const id = 'org_' + Math.random().toString(36).slice(2, 10);
  const name = preferredName || (user.email ?? 'مؤسستي').split('@')[0];
  const { error: e1 } = await sb.from('ns_orgs').insert({ id, name, owner_id: user.id });
  if (e1) return null;
  const { error: e2 } = await sb.from('ns_members').insert({
    id: 'mem_' + Math.random().toString(36).slice(2, 10),
    org_id: id, user_id: user.id, role: 'owner',
  });
  if (e2) return null;
  return { id, name, role: 'owner' };
}

export async function loadMembers(): Promise<any[]> {
  if (!activeOrg) return [];
  const { data } = await sb.from('ns_members').select('id, user_id, role, created_at').eq('org_id', activeOrg);
  return data ?? [];
}

export async function setMemberRole(memberId: string, role: Role): Promise<boolean> {
  const { error } = await sb.from('ns_members').update({ role }).eq('id', memberId);
  return !error;
}

export async function removeMember(memberId: string): Promise<boolean> {
  const { error } = await sb.from('ns_members').delete().eq('id', memberId);
  return !error;
}

export async function renameOrg(name: string): Promise<boolean> {
  if (!activeOrg) return false;
  const { error } = await sb.from('ns_orgs').update({ name }).eq('id', activeOrg);
  return !error;
}

export async function createInvite(role: Role): Promise<string | null> {
  if (!activeOrg) return null;
  const code = Array.from({ length: 8 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');
  const { error } = await sb.from('ns_invites').insert({
    id: 'inv_' + Math.random().toString(36).slice(2, 10),
    org_id: activeOrg, code, role,
  });
  return error ? null : code;
}

export async function listInvites(): Promise<any[]> {
  if (!activeOrg) return [];
  const { data } = await sb.from('ns_invites').select('id, code, role, used, expires_at, created_at')
    .eq('org_id', activeOrg).order('created_at', { ascending: false });
  return data ?? [];
}

export async function deleteInvite(id: string): Promise<boolean> {
  const { error } = await sb.from('ns_invites').delete().eq('id', id);
  return !error;
}

/** Join an organization using an invite code (RPC validates + inserts membership). */
export async function joinOrg(code: string): Promise<string | null> {
  const { data, error } = await sb.rpc('ns_join_org', { p_code: code.trim().toUpperCase() });
  if (error || !data) return null;
  return data as string;
}

/** One-time migration: attach org_id to legacy rows so the team can see them. */
export async function migrateOrgIds(data: DBData): Promise<number> {
  let n = 0;
  for (const c of COLLS)
    for (const e of (data as any)[c] ?? [])
      if (!(e as any).orgId && activeOrg) { if (await rawUpsert(c, e)) n++; }
  return n;
}
