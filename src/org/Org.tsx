/** Organization context — active workspace, role, members. Cloud mode only. */
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as backend from '../lib/backend';
import { useStore } from '../store/AppStore';
import type { Role } from '../lib/permissions';

interface OrgCtx {
  ready: boolean;
  org: backend.OrgInfo | null;
  orgs: backend.OrgInfo[];
  members: any[];
  invites: any[];
  refresh: () => Promise<void>;
  switchOrg: (id: string) => void;
  setMembers: (m: any[]) => void;
  setInvites: (i: any[]) => void;
  setOrgs: (o: backend.OrgInfo[]) => void;
}

const Ctx = createContext<OrgCtx>(null as any);
const LS_KEY = 'ns_active_org';

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const { data } = useStore();
  const [orgs, setOrgs] = useState<backend.OrgInfo[]>([]);
  const [org, setOrg] = useState<backend.OrgInfo | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [ready, setReady] = useState(false);

  const loadWorkspace = useCallback(async () => {
    const user = await backend.getUser();
    if (!user) { setReady(true); return; } // guest/local — no workspace
    let all = await backend.loadOrgs();
    if (!all.length) {
      // first cloud login: bootstrap the personal organization
      await backend.ensureOrg(data.settings?.companyName || '');
      all = await backend.loadOrgs();
    }
    setOrgs(all);
    const saved = localStorage.getItem(LS_KEY);
    const active = all.find(o => o.id === saved) ?? all[0] ?? null;
    backend.setActiveOrg(active?.id ?? null);
    setOrg(active);
    if (active) {
      setMembers(await backend.loadMembers());
      setInvites(await backend.listInvites());
    }
    setReady(true);
  }, []);

  useEffect(() => { void loadWorkspace(); // eslint-disable-line
  }, []);

  const refresh = useCallback(async () => { await loadWorkspace(); }, [loadWorkspace]);

  const switchOrg = useCallback((id: string) => {
    localStorage.setItem(LS_KEY, id);
    location.reload();
  }, []);

  return (
    <Ctx.Provider value={{ ready, org, orgs, members, invites, refresh, switchOrg, setMembers, setInvites, setOrgs }}>
      {children}
    </Ctx.Provider>
  );
}

export function useOrg(): OrgCtx {
  return useContext(Ctx);
}

export function activeRole(): Role | null {
  return (useContext(Ctx) as OrgCtx)?.org?.role ?? null;
}
