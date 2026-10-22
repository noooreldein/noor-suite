/**
 * Global app store — a single React context holding the local DB
 * plus UI state (toasts, confirm dialogs). Mutation via collection CRUD
 * which persists to localStorage on every change.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as db from '../lib/db';
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
  exportAll: () => string;
  importAll: (json: string) => boolean;
}

const Ctx = createContext<StoreCtx>(null as any);

export function AppStoreProvider({ children, seedFn }: { children: React.ReactNode; seedFn: () => db.DBData }) {
  const [data, setData] = useState<db.DBData>(() => {
    const loaded = db.load();
    return loaded.settings ? loaded : seedFn();
  });
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => { db.save(data); }, [data]);

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
    commit(d => ({ ...d, [col]: [...(d as any)[col], { ...rec, id, createdAt: new Date().toISOString() }] }));
    return id;
  }, [commit]);

  const update = useCallback((col: Collection, id: string, patch: any) => {
    commit(d => ({ ...d, [col]: (d as any)[col].map((r: any) => r.id === id ? { ...r, ...patch, updatedAt: new Date().toISOString() } : r) }));
  }, [commit]);

  const remove = useCallback((col: Collection, id: string) => {
    commit(d => ({ ...d, [col]: (d as any)[col].filter((r: any) => r.id !== id) }));
  }, [commit]);

  const setSettings = useCallback((patch: Partial<Settings>) => {
    commit(d => ({ ...d, settings: { ...d.settings, ...patch } }));
  }, [commit]);

  const toast = useCallback((msg: string, kind: 'ok' | 'err' = 'ok') => {
    const id = uid('t');
    setToasts(t => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2800);
  }, []);

  const reseed = useCallback(() => { setData(db.reset()); const fresh = seedFn(); setData(fresh); }, [seedFn]);

  const exportAll = useCallback(() => JSON.stringify(data, null, 2), [data]);

  const importAll = useCallback((json: string) => {
    const parsed = db.importJSON(json);
    if (!parsed) return false;
    setData(parsed);
    return true;
  }, []);

  const value = useMemo(() => ({
    data, settings: data.settings, setSettings, add, update, remove,
    toasts, toast, reseed, exportAll, importAll,
  }), [data, setSettings, add, update, remove, toasts, toast, reseed, exportAll, importAll]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): StoreCtx {
  return useContext(Ctx);
}
