import { useEffect, useMemo, useState } from 'react';
import { AppStoreProvider, useStore } from './store/AppStore';
import { I18nProvider } from './i18n/I18n';
import { useRoute, routeTitle } from './router/router';
import { Sidebar } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';
import { NotificationCenter } from './modules/notifications/NotificationCenter';
import { DashboardPage } from './modules/dashboard/DashboardPage';
import { PosPage } from './modules/pos/PosPage';
import { SalesPage } from './modules/sales/SalesPage';
import { PurchaseOrdersPage } from './modules/purchases/PurchaseOrdersPage';
import { InventoryPage } from './modules/inventory/InventoryPage';
import { PartnersPage } from './modules/partners/PartnersPage';
import { CrmPage } from './modules/crm/CrmPage';
import { HrPage } from './modules/hr/HrPage';
import { ProjectsPage } from './modules/projects/ProjectsPage';
import { AccountingPage } from './modules/accounting/AccountingPage';
import { BiPage } from './modules/bi/BiPage';
import { ReportsPage } from './modules/reports/ReportsPage';
import { CalendarPage } from './modules/calendar/CalendarPage';
import { SettingsPage } from './modules/settings/SettingsPage';
import { TeamPage } from './modules/team/TeamPage';
import { OrgProvider, useOrg } from './org/Org';
import { seed } from './seed/seed';
import { Onboarding } from './components/system/Onboarding';
import { LockScreen } from './components/system/LockScreen';
import { AuthScreen } from './components/system/AuthScreen';
import * as backend from './lib/backend';
import { detectConflicts, logSync } from './lib/sync';
import { ErrorBoundary } from './components/system/ErrorBoundary';

function Toasts() {
  const { toasts } = useStore();
  if (!toasts.length) return null;
  return (
    <div className="toasts">
      {toasts.map(t => <div key={t.id} className={`toast ${t.kind}`}>{t.msg}</div>)}
    </div>
  );
}

const pages: Record<string, () => JSX.Element> = {
  dashboard: DashboardPage,
  pos: PosPage,
  sales: () => <SalesPage kind="sale" />,
  purchaseOrders: PurchaseOrdersPage,
  purchases: () => <SalesPage kind="purchase" />,
  inventory: InventoryPage,
  partners: PartnersPage,
  crm: CrmPage,
  hr: HrPage,
  projects: ProjectsPage,
  accounting: AccountingPage,
  reports: ReportsPage,
  bi: BiPage,
  calendar: CalendarPage,
  settings: SettingsPage,
  team: TeamPage,
};

function Gate() {
  const { data, ingest, enterCloud, enterLocal, toast } = useStore();
  const { refresh: refreshOrg } = useOrg();
  const [unlocked, setUnlocked] = useState(() => !data.settings?.passwordHash);
  const [auth, setAuth] = useState<'checking' | 'out' | 'in'>('checking');

  useEffect(() => {
    (async () => {
    const { data: s } = await backend.getSession();
      if (s.session) {
        localStorage.removeItem('ns_guest');
        enterCloud();
        try {
          // multi-tenant: make sure the workspace context is loaded
          // (creates the personal org on first login), then attach org_id
          // to any legacy rows so teammates can see them
          const remote = await backend.loadAll();
          if (remote) {
            await refreshOrg();
            await backend.migrateOrgIds(remote);
            // device-sync conflict detection: rows whose server copy changed after our last local edit
            const AR_COLL: Record<string, string> = { products: 'المنتجات', partners: 'الجهات', invoices: 'الفواتير', leads: 'الفرص', employees: 'الموظفين', attendance: 'الحضور', tasks: 'المهام', ledger: 'دفتر الحسابات', purchaseOrders: 'أوامر الشراء', notifications: 'التنبيهات', stockMoves: 'حركات المخزون', shifts: 'الورديات', accounts: 'الحسابات', journals: 'القيود', branches: 'الفروع' };
            const conflicts = detectConflicts(data, remote, backend.getLoadMeta());
            if (conflicts.length) {
              conflicts.forEach(c => logSync({ at: c.at, kind: 'conflict', msg: `تم تحديث سجل في «${AR_COLL[c.coll] ?? c.coll}» من جهاز آخر — تم اعتماد نسخة السحابة` }));
              toast(`${conflicts.length} سجل تم تحديثه من جهاز آخر — راجع سجل المزامنة في الإعدادات`);
            }
            // automatic daily cloud backup (any device counts)
            try {
              const last = await backend.latestBackupAt();
              const hasData = Object.keys(backend.getLoadMeta()).some(c => Object.keys(backend.getLoadMeta()[c] ?? {}).length);
              // skip the very first (empty) load; also refresh if the newest snapshot is empty
              const stale = !last || last.size < 500 || Date.now() - new Date(last.created_at).getTime() > 24 * 3600 * 1000;
              if (hasData && stale) {
                const payload = JSON.stringify(remote);
                if (await backend.createBackup(payload)) logSync({ at: new Date().toISOString(), kind: 'backup', msg: 'نسخة احتياطية سحابية تلقائية اتعملت' });
              }
            } catch { /* non-fatal */ }
            const cloudEmpty = !remote.settings?.companyName;
            if (cloudEmpty && data.settings?.companyName) {
              const rep = await backend.migrateLocal(data);
              const fresh = await backend.loadAll();
              ingest(backend.mergeLocal(data, fresh ?? remote));
              if (rep.failed > 0) toast(`ترحيل البيانات: نجح ${rep.ok} — فشل ${rep.failed} (سيُعاد تلقائيًا)`, 'err');
              else toast(`تم ترحيل ${rep.ok} سجل إلى حسابك السحابي ✓`);
            } else ingest(remote);
          }
        } catch { toast('تعذر تحميل البيانات السحابية — حاول التحديث', 'err'); }
        setAuth('in');
      } else if (localStorage.getItem('ns_guest') === '1') { enterLocal(); setAuth('in'); }
      else setAuth('out');
    })().catch(() => setAuth('out'));
  }, []); // eslint-disable-line

  if (auth === 'checking') return null;
  if (auth === 'out') return <AuthScreen onDone={() => location.reload()} onGuest={() => { localStorage.setItem('ns_guest', '1'); enterLocal(); setAuth('in'); }} />;
  if (!data.settings?.companyName) return <Onboarding />;
  if (data.settings?.passwordHash && !unlocked) return <LockScreen onUnlock={() => setUnlocked(true)} />;
  return <Shell />;
}

function Shell() {
  const [route, navigate] = useRoute();
  const title = useMemo(() => routeTitle(route), [route]);
  const Page = pages[route] ?? DashboardPage;
  return (
    <div className="shell">
      <Sidebar route={route} onNavigate={navigate} />
      <main className="main-area">
        <Topbar title={title} />
        <div style={{ position: 'fixed', top: 14, insetInlineEnd: 256, zIndex: 60 }}><NotificationCenter /></div>
        <Page />
        <Toasts />
      </main>
    </div>
  );
}

export default function App() {
  const seedFn = useMemo(() => seed, []);
  return (
    <ErrorBoundary>
      <AppStoreProvider seedFn={seedFn}>
        <I18nProvider>
          <OrgProvider>
            <Gate />
          </OrgProvider>
        </I18nProvider>
      </AppStoreProvider>
    </ErrorBoundary>
  );
}
