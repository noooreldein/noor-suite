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
import { InventoryPage } from './modules/inventory/InventoryPage';
import { PartnersPage } from './modules/partners/PartnersPage';
import { CrmPage } from './modules/crm/CrmPage';
import { HrPage } from './modules/hr/HrPage';
import { ProjectsPage } from './modules/projects/ProjectsPage';
import { AccountingPage } from './modules/accounting/AccountingPage';
import { ReportsPage } from './modules/reports/ReportsPage';
import { CalendarPage } from './modules/calendar/CalendarPage';
import { SettingsPage } from './modules/settings/SettingsPage';
import { seed } from './seed/seed';
import { Onboarding } from './components/system/Onboarding';
import { LockScreen } from './components/system/LockScreen';
import { AuthScreen } from './components/system/AuthScreen';
import * as backend from './lib/backend';
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
  purchases: () => <SalesPage kind="purchase" />,
  inventory: InventoryPage,
  partners: PartnersPage,
  crm: CrmPage,
  hr: HrPage,
  projects: ProjectsPage,
  accounting: AccountingPage,
  reports: ReportsPage,
  calendar: CalendarPage,
  settings: SettingsPage,
};

function Gate() {
  const { data, ingest, enterCloud, enterLocal } = useStore();
  const [unlocked, setUnlocked] = useState(() => !data.settings?.passwordHash);
  const [auth, setAuth] = useState<'checking' | 'out' | 'in'>('checking');

  useEffect(() => {
    backend.getSession().then(({ data: s }) => {
      if (s.session) {
        enterCloud();
        backend.loadAll().then(remote => {
          if (remote) {
            const cloudEmpty = !remote.settings?.companyName;
            if (cloudEmpty && data.settings?.companyName) {
              backend.migrateLocal(data).then(() => ingest(remote)).catch(() => ingest(remote));
              setAuth('in');
            } else { ingest(remote); setAuth('in'); }
          } else setAuth('in');
        });
      } else setAuth('out');
    }).catch(() => setAuth('out'));
  }, []); // eslint-disable-line

  if (auth === 'checking') return null;
  if (auth === 'out') return <AuthScreen onDone={() => location.reload()} />;
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
          <Gate />
        </I18nProvider>
      </AppStoreProvider>
    </ErrorBoundary>
  );
}
