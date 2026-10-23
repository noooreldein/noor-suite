/** Supabase cloud backend — auth + per-user document rows (ns_* tables, RLS-isolated). */
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

export type Coll = 'products' | 'partners' | 'invoices' | 'leads' | 'employees' | 'attendance' | 'tasks' | 'ledger' | 'notifications';

export async function getSession() { return sb.auth.getSession(); }
export async function getUser() { const { data } = await sb.auth.getUser(); return data.user; }
export async function signUp(email: string, pw: string) { return sb.auth.signUp({ email, password: pw }); }
export async function signIn(email: string, pw: string) { return sb.auth.signInWithPassword({ email, password: pw }); }
export async function signOut() { return sb.auth.signOut(); }
export function onAuthChange(cb: () => void) { return sb.auth.onAuthStateChange(() => cb()); }

export async function loadAll(): Promise<DBData | null> {
  const user = await getUser();
  if (!user) return null;
  const out: any = { products: [], partners: [], invoices: [], leads: [], employees: [], attendance: [], tasks: [], ledger: [], notifications: [], settings: null, meta: { version: 1 } };
  for (const c of ['products', 'partners', 'invoices', 'leads', 'employees', 'attendance', 'tasks', 'ledger', 'notifications'] as Coll[]) {
    const { data } = await sb.from(`ns_${c}`).select('id, data');
    out[c] = (data ?? []).map((r: any) => ({ ...r.data, id: r.id }));
  }
  const { data: st } = await sb.from('ns_settings').select('data').eq('id', 'settings').maybeSingle();
  if (st?.data) out.settings = st.data as Settings;
  return out as DBData;
}

export async function upsert(c: Coll, entity: any) {
  const user = await getUser(); if (!user) return;
  await sb.from(`ns_${c}`).upsert({ id: entity.id, user_id: user.id, data: entity });
}

export async function remove(c: Coll, id: string) {
  await sb.from(`ns_${c}`).delete().eq('id', id);
}

export async function saveSettings(s: Settings | null) {
  const user = await getUser(); if (!user || !s) return;
  await sb.from('ns_settings').upsert({ id: 'settings', user_id: user.id, data: s });
}

/** One-time migration: push existing local data to the cloud account. */
export async function migrateLocal(local: DBData) {
  for (const c of ['products', 'partners', 'invoices', 'leads', 'employees', 'attendance', 'tasks', 'ledger', 'notifications'] as Coll[])
    for (const e of (local as any)[c] ?? []) await upsert(c, e);
  if (local.settings) await saveSettings(local.settings);
}
