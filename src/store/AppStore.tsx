/**
 * Global app store — a single React context holding the local DB
 * plus UI state (toasts, confirm dialogs). Mutation via collection CRUD
 * which persists to localStorage on every change.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as db from '../lib/db';
import * as backend from '../lib/backend';
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
  enterCloud: () => void;
  enterLocal: () => void;
  exportAll: () => string;
  importAll: (json: string) => boolean;
}

const Ctx = createContext<StoreCtx>(null as any);

export function AppStoreProvider({ children, seedFn }: { children: React.ReactNode; seedFn: () => db.DBData }) {
  const [data, setData] = useState<db.DBData>(() => {
    const loaded = db.load();
    return loaded.settings ? loaded : db.empty();
  });
  const [cloud, setCloud] = useState(false);
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

  const commit = useCallback((fn: (d: db.DBData) => db.DBData) => {
    setData(prev => fn(prev));
  }, []);

  const add = useCallback((col: Collection, rec: any) => {
    const id = rec.id ?? uid(col.slice(0, 3));
    const full = { ...rec, id, createdAt: new Date().toISOString() };
    commit(d => ({ ...d, [col]: [...(d as any)[col], full] }));
    if (backend.getMode() === 'cloud')
      backend.upsert(col as any, full).then(ok => { if (!ok) toast('تعذر الحفظ السحابي — سيُعاد تلقائيًا عند الاتصال', 'err'); });
    return id;
  }, [commit]);

  const update = useCallback((col: Collection, id: string, patch: any) => {
    let merged: any;
    commit(d => {
      const next = (d as any)[col].map((r: any) => {
        if (r.id !== id) return r;
        merged = { ...r, ...patch, updatedAt: new Date().toISOString() };
        return merged;
      });
      return { ...d, [col]: next };
    });
    if (backend.getMode() === 'cloud' && merged)
      backend.upsert(col as any, merged).then(ok => { if (!ok) toast('تعذر الحفظ السحابي — سيُعاد تلقائيًا عند الاتصال', 'err'); });
  }, [commit]);

  const remove = useCallback((col: Collection, id: string) => {
    commit(d => ({ ...d, [col]: (d as any)[col].filter((r: any) => r.id !== id) }));
    if (backend.getMode() === 'cloud')
      backend.remove(col as any, id).then(ok => { if (!ok) toast('تعذر الحذف السحابي — سيُعاد تلقائيًا عند الاتصال', 'err'); });
  }, [commit]);

  const setSettings = useCallback((patch: Partial<Settings>) => {
    let merged: any;
    commit(d => { merged = { ...d.settings, ...patch }; return { ...d, settings: merged }; });
    if (backend.getMode() === 'cloud' && merged)
      backend.saveSettings(merged).then(ok => { if (!ok) toast('تعذر حفظ الإعدادات سحابيًا — سيُعاد تلقائيًا', 'err'); });
  }, [commit]);

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
    toasts, toast, reseed, exportAll, importAll, ingest, enterCloud, enterLocal,
  }), [data, setSettings, add, update, remove, toasts, toast, reseed, exportAll, importAll, ingest, enterCloud, enterLocal]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): StoreCtx {
  return useContext(Ctx);
}
