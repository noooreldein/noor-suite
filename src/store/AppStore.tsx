/**
 * Global app store — a single React context holding the local DB
 * plus UI state (toasts, confirm dialogs). Mutation via collection CRUD
 * which persists to localStorage on every change.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as db from '../lib/db';
import * as backend from '../lib/backend';
import { branchDeltas } from '../lib/branches';
import { uid } from '../lib/id';
import { Collection, Settings } from '../types/core';

export interface Toast { id: string; msg: string; kind: 'ok' | 'err' }

interface StoreCtx {
  data: db.DBData;
  settings: Settings;
  setSettings: (patch: Partial<Settings>) => void;
  add: (col: Collection, rec: any) => string;
  update: (col: Collection, id: string, patch: any) => void;
  remove: (col: Collection, id: string) => void;
  toasts: Toast[];
  toast: (msg: string, kind?: 'ok' | 'err') => void;
  reseed: () => void;
  ingest: (remote: db.DBData) => void;
  runOperation: (fn: () => void) => void;
  enterCloud: () => void;
  enterLocal: () => void;
  exportAll: () => string;
  importAll: (json: string) => boolean;
  /** active working branch (stock location) — per user, per device */
  branch: string;
  setBranch: (id: string) => void;
}

const Ctx = createContext<StoreCtx>(null as any);

export function AppStoreProvider({ children, seedFn }: { children: React.ReactNode; seedFn: () => db.DBData }) {
  const [data, setData] = useState<db.DBData>(() => {
    const loaded = db.load();
    return loaded.settings ? loaded : db.empty();
  });
  const [cloud, setCloud] = useState(false);
  const [branch, setBranchState] = useState<string>(() => localStorage.getItem('ns_branch') || 'main');
  const setBranch = useCallback((id: string) => { setBranchState(id); localStorage.setItem('ns_branch', id); }, []);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => { if (!cloud) db.save(data); }, [data, cloud]);

  // apply theme & direction
  useEffect(() => {
    const s = data.settings;
    if (!s) return;
    document.documentElement.lang = s.lang;
    document.documentElement.dir = s.lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dataset.theme = s.theme;
  }, [data.settings]);

  /* Active atomic operation batch — while set, cloud writes are diverted
   * into it and applied as ONE server-side RPC (ns_apply_op). */
  const opBatch = useRef<backend.Operation | null>(null);

  const commit = useCallback((fn: (d: db.DBData) => db.DBData) => {
    setData(prev => fn(prev));
  }, []);

  const add = useCallback((col: Collection, rec: any) => {
    const id = rec.id ?? uid(col.slice(0, 3));
    const full = { ...rec, id, createdAt: new Date().toISOString() };
    commit(d => ({ ...d, [col]: [...(d as any)[col], full] }));
    if (opBatch.current) { opBatch.current.upserts.push({ c: col as any, e: full }); return id; }
    if (backend.getMode() === 'cloud')
      backend.upsert(col as any, full).then(ok => { if (!ok) toast('تعذر الحفظ السحابي — سيُعاد تلقائيًا عند الاتصال', 'err'); });
    return id;
  }, [commit]);

  const update = useCallback((col: Collection, id: string, patch: any) => {
    // Compute prev/merged SYNCHRONOUSLY from the current snapshot: React defers
    // the setData updater inside a batch, so reading `merged` after commit()
    // used to race (undefined) — this also silently skipped cloud sync before.
    const prev = (data as any)[col]?.find((r: any) => r.id === id);
    const merged = prev ? { ...prev, ...patch, updatedAt: new Date().toISOString() } : undefined;
    if (merged) commit(d => ({ ...d, [col]: (d as any)[col].map((r: any) => r.id === id ? merged : r) }));
    if (opBatch.current) {
      // product stock changes ride the atomic op as per-branch deltas, never as blind upserts
      if (col === 'products' && prev && merged) opBatch.current.deltas.push(...branchDeltas(prev, merged));
      else if (merged) opBatch.current.upserts.push({ c: col as any, e: merged });
      return;
    }
    if (backend.getMode() === 'cloud' && merged)
      backend.upsert(col as any, merged).then(ok => { if (!ok) toast('تعذر الحفظ السحابي — سيُعاد تلقائيًا عند الاتصال', 'err'); });
  }, [commit, data]);

  const remove = useCallback((col: Collection, id: string) => {
    commit(d => ({ ...d, [col]: (d as any)[col].filter((r: any) => r.id !== id) }));
    if (opBatch.current) { opBatch.current.deletes.push({ c: col as any, id }); return; }
    if (backend.getMode() === 'cloud')
      backend.remove(col as any, id).then(ok => { if (!ok) toast('تعذر الحذف السحابي — سيُعاد تلقائيًا عند الاتصال', 'err'); });
  }, [commit]);

  /** Run a composite operation (sale, receive, transfer...) so that every
   * write inside fn reaches the cloud as ONE atomic server-side RPC. */
  const runOperation = useCallback((fn: () => void) => {
    const batch: backend.Operation = { orgId: backend.getActiveOrg(), upserts: [], deltas: [], deletes: [] };
    opBatch.current = batch;
    try { fn(); } finally { opBatch.current = null; }
    if (backend.getMode() === 'cloud')
      backend.applyOperation(batch).then(async r => {
        if (r.status === 'rejected') {
          // business rejection (stock/permission): undo the optimistic local
          // changes by re-adopting the server state
          toast(r.msg, 'err');
          const remote = await backend.loadAll();
          if (remote) ingest(remote);
        } else if (r.status === 'unreachable') {
          toast('تعذر تنفيذ العملية سحابيًا — سيُعاد تلقائيًا عند الاتصال', 'err');
        }
      });
  }, []);

  const setSettings = useCallback((patch: Partial<Settings>) => {
    const merged: any = { ...data.settings, ...patch };
    commit(d => ({ ...d, settings: merged }));
    if (backend.getMode() === 'cloud')
      backend.saveSettings(merged).then(ok => { if (!ok) toast('تعذر حفظ الإعدادات سحابيًا — سيُعاد تلقائيًا', 'err'); });
  }, [commit, data]);

  const ingest = useCallback((remote: db.DBData) => { setData(remote); }, []);

  const enterCloud = useCallback(() => { backend.setMode('cloud'); setCloud(true); }, []);

  const enterLocal = useCallback(() => { backend.setMode('local'); setCloud(false); }, []);

  const toast = useCallback((msg: string, kind: 'ok' | 'err' = 'ok') => {
    const id = uid('t');
    setToasts(t => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2800);
  }, []);

  const reseed = useCallback(() => { setData(db.reset()); const fresh = seedFn(); setData(db.normalize(fresh)); }, [seedFn]);

  const exportAll = useCallback(() => JSON.stringify(data, null, 2), [data]);

  const importAll = useCallback((json: string) => {
    const parsed = db.importJSON(json);
    if (!parsed) return false;
    setData(parsed);
    return true;
  }, []);

  const value = useMemo(() => ({
    data, settings: data.settings, setSettings, add, update, remove,
    toasts, toast, reseed, exportAll, importAll, ingest, enterCloud, enterLocal, branch, setBranch, runOperation,
  }), [data, setSettings, add, update, remove, toasts, toast, reseed, exportAll, importAll, ingest, enterCloud, enterLocal, branch, setBranch, runOperation]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): StoreCtx {
  return useContext(Ctx);
}
