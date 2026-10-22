/** i18n provider — driven by the store settings language. */
import React, { createContext, useContext } from 'react';
import { ar, Dict } from './ar';
import { en } from './en';
import { useStore } from '../store/AppStore';

const dicts: Record<string, Dict> = { ar, en };
const Ctx = createContext<{ t: (k: keyof Dict) => string }>({ t: k => String(k) });

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useStore();
  const t = (k: keyof Dict) => dicts[settings?.lang ?? 'ar'][k] ?? String(k);
  return <Ctx.Provider value={{ t }}>{children}</Ctx.Provider>;
}

export function useT() {
  return useContext(Ctx).t;
}
